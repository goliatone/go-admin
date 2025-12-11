package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	users "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func TestUserModuleRegistersPanelsAndNavigation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Users:  true,
			Search: true,
		},
	}
	adm := New(cfg)
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if _, ok := adm.registry.Panel(usersModuleID); !ok {
		t.Fatalf("expected users panel to be registered")
	}
	if _, ok := adm.registry.Panel(rolesPanelID); !ok {
		t.Fatalf("expected roles panel to be registered")
	}

	items := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	foundUsers := false
	foundRoles := false
	for _, item := range items {
		if targetMatches(item.Target, usersModuleID, joinPath(cfg.BasePath, usersModuleID)) {
			foundUsers = true
		}
		if targetMatches(item.Target, rolesPanelID, joinPath(cfg.BasePath, rolesPanelID)) {
			foundRoles = true
		}
	}
	if !foundUsers || !foundRoles {
		t.Fatalf("expected navigation entries for users and roles, got %+v", items)
	}
}

func TestUserModuleEnforcesPermissions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Users: true,
		},
	}
	adm := New(cfg)
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/users", nil)
	req.Header.Set("X-User-ID", "actor-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for forbidden list, got %d", rr.Code)
	}
}

func TestUserModuleCRUDSearchAndActivity(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Users:  true,
			Search: true,
		},
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	rolePayload := map[string]any{
		"name":        "admin",
		"description": "Administrators",
		"permissions": []string{"admin.users.edit", "admin.users.create"},
	}
	roleBody, _ := json.Marshal(rolePayload)
	roleReq := httptest.NewRequest("POST", "/admin/api/roles", bytes.NewReader(roleBody))
	roleReq.Header.Set("Content-Type", "application/json")
	roleReq.Header.Set("X-User-ID", "seed-actor")
	roleRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(roleRes, roleReq)
	if roleRes.Code != 200 {
		t.Fatalf("expected role create 200, got %d body=%s", roleRes.Code, roleRes.Body.String())
	}
	var role map[string]any
	_ = json.Unmarshal(roleRes.Body.Bytes(), &role)
	roleID := toString(role["id"])
	if roleID == "" {
		t.Fatalf("expected role id in response, got %v", role)
	}

	userPayload := map[string]any{
		"email":    "tester@example.com",
		"username": "tester",
		"status":   "active",
		"roles":    []string{roleID},
	}
	userBody, _ := json.Marshal(userPayload)
	userReq := httptest.NewRequest("POST", "/admin/api/users", bytes.NewReader(userBody))
	userReq.Header.Set("Content-Type", "application/json")
	userReq.Header.Set("X-User-ID", "actor-123")
	userRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(userRes, userReq)
	if userRes.Code != 200 {
		t.Fatalf("expected user create 200, got %d body=%s", userRes.Code, userRes.Body.String())
	}

	var user map[string]any
	_ = json.Unmarshal(userRes.Body.Bytes(), &user)
	userID := toString(user["id"])
	if userID == "" || toString(user["email"]) != "tester@example.com" {
		t.Fatalf("unexpected user response %+v", user)
	}

	searchReq := httptest.NewRequest("GET", "/admin/api/search?query=tester", nil)
	searchReq.Header.Set("X-User-ID", "actor-123")
	searchRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(searchRes, searchReq)
	if searchRes.Code != 200 {
		t.Fatalf("expected search 200, got %d body=%s", searchRes.Code, searchRes.Body.String())
	}
	var searchPayload map[string]any
	_ = json.Unmarshal(searchRes.Body.Bytes(), &searchPayload)
	results, _ := searchPayload["results"].([]any)
	if len(results) == 0 {
		t.Fatalf("expected search results, got %v", searchPayload["results"])
	}

	entries, _ := adm.ActivityFeed().List(context.Background(), 10)
	foundUserCreate := false
	foundRoleCreate := false
	for _, entry := range entries {
		if entry.Action == "user.create" && entry.Object == "user:"+userID {
			foundUserCreate = true
		}
		if entry.Action == "role.create" && entry.Object == "role:"+roleID {
			foundRoleCreate = true
		}
	}
	if !foundUserCreate {
		t.Fatalf("expected user.create activity entry, got %+v", entries)
	}
	if !foundRoleCreate {
		t.Fatalf("expected role.create activity entry, got %+v", entries)
	}
}

func TestUserLifecycleCommandTransitionsStatus(t *testing.T) {
	svc := NewUserManagementService(nil, nil)
	feed := NewActivityFeed()
	svc.WithActivitySink(feed)

	record, err := svc.SaveUser(context.Background(), UserRecord{
		Email:    "lifecycle@example.com",
		Username: "lifecycle",
		Status:   "pending",
	})
	if err != nil {
		t.Fatalf("seed user: %v", err)
	}

	cmd := newUserLifecycleCommand(svc, "users.activate", "active")
	ctx := WithCommandIDs(context.Background(), []string{record.ID})
	if err := cmd.Execute(ctx); err != nil {
		t.Fatalf("execute lifecycle command: %v", err)
	}

	updated, err := svc.GetUser(ctx, record.ID)
	if err != nil {
		t.Fatalf("get after lifecycle: %v", err)
	}
	if updated.Status != "active" {
		t.Fatalf("expected status active, got %s", updated.Status)
	}
	entries, _ := feed.List(context.Background(), 10)
	found := false
	for _, entry := range entries {
		if entry.Action == "user.status.active" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected user.status.active activity, got %+v", entries)
	}
}

func TestGoUsersUserRepositoryAppliesFilters(t *testing.T) {
	inventory := &recordingInventoryRepo{}
	repo := NewGoUsersUserRepository(&stubGoUsersAuthRepo{}, inventory, nil)
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: uuid.NewString()})

	opts := ListOptions{
		Filters: map[string]any{
			"status": []string{"suspended"},
			"role":   "editor",
		},
		Search:  "needle",
		Page:    2,
		PerPage: 5,
	}
	if _, _, err := repo.List(ctx, opts); err != nil {
		t.Fatalf("list with filters: %v", err)
	}
	filter := inventory.lastFilter
	if len(filter.Statuses) != 1 || filter.Statuses[0] != users.LifecycleStateSuspended {
		t.Fatalf("expected suspended status filter, got %+v", filter.Statuses)
	}
	if filter.Role != "editor" {
		t.Fatalf("expected role filter editor, got %s", filter.Role)
	}
	if filter.Keyword != "needle" {
		t.Fatalf("expected keyword needle, got %s", filter.Keyword)
	}
	if filter.Pagination.Limit != 5 || filter.Pagination.Offset != 5 {
		t.Fatalf("expected pagination limit=5 offset=5, got %+v", filter.Pagination)
	}
}

func TestRoleOptionsUsesSyntheticActorContext(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Users: true,
		},
	}
	adm := New(cfg)
	guarded := &guardedRoleRepo{}
	adm.users.roles = guarded

	module := NewUserManagementModule()
	options := module.roleOptions(adm)
	if len(options) == 0 {
		t.Fatalf("expected role options, got none")
	}
	if !guarded.called {
		t.Fatalf("expected guarded repo to be invoked for role options")
	}
	if userIDFromContext(guarded.ctx) == "" {
		t.Fatalf("expected synthetic actor in context for role options")
	}
}

type stubGoUsersAuthRepo struct{}

func (stubGoUsersAuthRepo) GetByID(context.Context, uuid.UUID) (*users.AuthUser, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) GetByIdentifier(context.Context, string) (*users.AuthUser, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) Create(context.Context, *users.AuthUser) (*users.AuthUser, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) Update(context.Context, *users.AuthUser) (*users.AuthUser, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) UpdateStatus(context.Context, users.ActorRef, uuid.UUID, users.LifecycleState, ...users.TransitionOption) (*users.AuthUser, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) AllowedTransitions(context.Context, uuid.UUID) ([]users.LifecycleTransition, error) {
	return nil, errors.New("not implemented")
}
func (stubGoUsersAuthRepo) ResetPassword(context.Context, uuid.UUID, string) error {
	return errors.New("not implemented")
}

type recordingInventoryRepo struct {
	lastFilter users.UserInventoryFilter
}

func (r *recordingInventoryRepo) ListUsers(_ context.Context, filter users.UserInventoryFilter) (users.UserInventoryPage, error) {
	r.lastFilter = filter
	return users.UserInventoryPage{
		Users:      []users.AuthUser{},
		Total:      0,
		NextOffset: 0,
		HasMore:    false,
	}, nil
}

type guardedRoleRepo struct {
	called bool
	ctx    context.Context
}

func (r *guardedRoleRepo) List(ctx context.Context, _ ListOptions) ([]RoleRecord, int, error) {
	r.called = true
	r.ctx = ctx
	if userIDFromContext(ctx) == "" {
		return nil, 0, ErrForbidden
	}
	return []RoleRecord{{ID: "role-1", Name: "Admin"}}, 1, nil
}

func (r *guardedRoleRepo) Get(context.Context, string) (RoleRecord, error) {
	return RoleRecord{}, ErrNotFound
}
func (r *guardedRoleRepo) Create(context.Context, RoleRecord) (RoleRecord, error) {
	return RoleRecord{}, nil
}
func (r *guardedRoleRepo) Update(context.Context, RoleRecord) (RoleRecord, error) {
	return RoleRecord{}, nil
}
func (r *guardedRoleRepo) Delete(context.Context, string) error           { return nil }
func (r *guardedRoleRepo) Assign(context.Context, string, string) error   { return nil }
func (r *guardedRoleRepo) Unassign(context.Context, string, string) error { return nil }
func (r *guardedRoleRepo) RolesForUser(context.Context, string) ([]RoleRecord, error) {
	return nil, nil
}
