package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	users "github.com/goliatone/go-users/pkg/types"
	"github.com/google/uuid"
)

func adminAPIPath(adm *Admin, cfg Config, route string, params map[string]string, query map[string]string) string {
	return resolveURLWith(adm.URLs(), adminAPIGroupName(cfg), route, params, query)
}

func adminPanelAPIPath(adm *Admin, cfg Config, panel string) string {
	return adminAPIPath(adm, cfg, "panel", map[string]string{"panel": panel}, nil)
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func TestUserModuleRegistersPanelsAndNavigation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers, FeatureSearch)})
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
		if navinternal.TargetMatches(item.Target, usersModuleID, resolveURLWith(adm.URLs(), "admin", usersModuleID, nil, nil)) {
			foundUsers = true
		}
		if navinternal.TargetMatches(item.Target, rolesPanelID, resolveURLWith(adm.URLs(), "admin", rolesPanelID, nil, nil)) {
			foundRoles = true
		}
	}
	if !foundUsers || !foundRoles {
		t.Fatalf("expected navigation entries for users and roles, got %+v", items)
	}
}

func TestUserModuleManifestIncludesFeatureUsers(t *testing.T) {
	manifest := NewUserManagementModule().Manifest()
	if !containsString(manifest.FeatureFlags, string(FeatureUsers)) {
		t.Fatalf("expected FeatureUsers in manifest, got %+v", manifest.FeatureFlags)
	}
}

func TestUserModuleFeatureGateBlocksRegistration(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys()})
	if err := adm.RegisterModule(NewUserManagementModule()); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server := router.NewHTTPServer()
	err := adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected error for disabled users feature")
	}
	var disabled FeatureDisabledError
	if !errors.As(err, &disabled) || disabled.Feature != string(FeatureUsers) {
		t.Fatalf("expected FeatureDisabledError users, got %v", err)
	}
}

func TestUserModuleFeatureGateBlocksRegistrationWithOptions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys()})
	module := NewUserManagementModule(
		WithUserProfilesPanel(),
		WithUserPanelTabs(PanelTab{Label: "Activity", Target: PanelTabTarget{Type: "panel", Panel: "activity"}}),
	)
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server := router.NewHTTPServer()
	err := adm.Initialize(server.Router())
	if err == nil {
		t.Fatalf("expected error for disabled users feature")
	}
	var disabled FeatureDisabledError
	if !errors.As(err, &disabled) || disabled.Feature != string(FeatureUsers) {
		t.Fatalf("expected FeatureDisabledError users, got %v", err)
	}
}

func TestUserProfilesPanelOptIn(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if _, ok := adm.Registry().Panel(userProfilesPanelID); ok {
		t.Fatalf("expected user profiles panel to be opt-in")
	}

	adm = mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(allowAll{})
	if err := adm.RegisterModule(NewUserManagementModule(WithUserProfilesPanel())); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server = router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if _, ok := adm.Registry().Panel(userProfilesPanelID); !ok {
		t.Fatalf("expected user profiles panel when enabled")
	}
}

func TestUserPanelTabsOptIn(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if tabs := adm.Registry().PanelTabs(usersModuleID); len(tabs) != 0 {
		t.Fatalf("expected no default user tabs, got %+v", tabs)
	}

	adm = mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(allowAll{})
	if err := adm.RegisterModule(NewUserManagementModule(
		WithUserPanelTabs(PanelTab{ID: "activity", Label: "Activity", Target: PanelTabTarget{Type: "panel", Panel: "activity"}}),
	)); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server = router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	tabs := adm.Registry().PanelTabs(usersModuleID)
	if len(tabs) != 1 || tabs[0].ID != "activity" {
		t.Fatalf("expected activity tab registered, got %+v", tabs)
	}
}

func TestUserModuleRespectsURLOverrides(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		URLs: URLConfig{
			Admin: URLNamespaceConfig{
				BasePath:  "/control",
				APIPrefix: "rest",
			},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if got := resolveURLWith(adm.URLs(), "admin", usersModuleID, nil, nil); got != "/control/users" {
		t.Fatalf("expected users UI path /control/users, got %q", got)
	}
	apiPath := adminPanelAPIPath(adm, cfg, usersModuleID)
	if apiPath != "/control/rest/users" {
		t.Fatalf("expected users API path /control/rest/users, got %q", apiPath)
	}
	req := httptest.NewRequest("GET", apiPath, nil)
	req.Header.Set("X-User-ID", "actor-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 for users list, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestUserModuleEnforcesPermissions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", adminPanelAPIPath(adm, cfg, usersModuleID), nil)
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers, FeatureSearch)})
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
	roleReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, rolesPanelID), bytes.NewReader(roleBody))
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
	userReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, usersModuleID), bytes.NewReader(userBody))
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

	searchReq := httptest.NewRequest("GET", adminAPIPath(adm, cfg, "search", nil, map[string]string{"query": "tester"}), nil)
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

func TestUserModuleCreateWithSystemAndCustomRoles(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithRoleAssignmentLookup(UUIDRoleAssignmentLookup{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	rolePayload := map[string]any{
		"name":        "custom",
		"description": "Custom role",
		"permissions": []string{"admin.users.view"},
	}
	roleBody, _ := json.Marshal(rolePayload)
	roleReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, rolesPanelID), bytes.NewReader(roleBody))
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
		"email":    "system@example.com",
		"username": "system",
		"status":   "active",
		"role":     "member",
		"roles":    []string{roleID},
	}
	userBody, _ := json.Marshal(userPayload)
	userReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, usersModuleID), bytes.NewReader(userBody))
	userReq.Header.Set("Content-Type", "application/json")
	userReq.Header.Set("X-User-ID", "actor-123")
	userRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(userRes, userReq)
	if userRes.Code != 200 {
		t.Fatalf("expected user create 200, got %d body=%s", userRes.Code, userRes.Body.String())
	}
	var user map[string]any
	_ = json.Unmarshal(userRes.Body.Bytes(), &user)
	if toString(user["role"]) != "member" {
		t.Fatalf("expected role member in response, got %v", user["role"])
	}
	roles := toStringSlice(user["roles"])
	if len(roles) != 1 || roles[0] != roleID {
		t.Fatalf("expected roles %v, got %v", []string{roleID}, roles)
	}
}

func TestUserPanelListIncludesRoleDisplayFields(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
	adm.WithRoleAssignmentLookup(UUIDRoleAssignmentLookup{})
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	roleBody, _ := json.Marshal(map[string]any{
		"name":        "Operators",
		"description": "Ops role",
		"permissions": []string{"admin.users.view"},
	})
	roleReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, rolesPanelID), bytes.NewReader(roleBody))
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

	userBody, _ := json.Marshal(map[string]any{
		"email":    "operator@example.com",
		"username": "operator",
		"status":   "active",
		"roles":    []string{roleID},
	})
	userReq := httptest.NewRequest("POST", adminPanelAPIPath(adm, cfg, usersModuleID), bytes.NewReader(userBody))
	userReq.Header.Set("Content-Type", "application/json")
	userReq.Header.Set("X-User-ID", "actor-1")
	userRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(userRes, userReq)
	if userRes.Code != 200 {
		t.Fatalf("expected user create 200, got %d body=%s", userRes.Code, userRes.Body.String())
	}
	var user map[string]any
	_ = json.Unmarshal(userRes.Body.Bytes(), &user)
	userID := toString(user["id"])
	if userID == "" {
		t.Fatalf("expected user id in create response")
	}

	listReq := httptest.NewRequest("GET", adminPanelAPIPath(adm, cfg, usersModuleID), nil)
	listReq.Header.Set("X-User-ID", "actor-1")
	listRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(listRes, listReq)
	if listRes.Code != 200 {
		t.Fatalf("expected users list 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}

	var payload map[string]any
	_ = json.Unmarshal(listRes.Body.Bytes(), &payload)
	records, _ := payload["records"].([]any)
	if len(records) == 0 {
		t.Fatalf("expected records in users list response")
	}

	var record map[string]any
	for _, item := range records {
		entry, _ := item.(map[string]any)
		if toString(entry["id"]) == userID {
			record = entry
			break
		}
	}
	if len(record) == 0 {
		t.Fatalf("expected created user %s in records: %+v", userID, records)
	}

	if toString(record["role_display"]) != "Operators" {
		t.Fatalf("expected role_display Operators, got %v", record["role_display"])
	}
	assignments := toStringSlice(record["role_assignments"])
	if len(assignments) != 1 || assignments[0] != "Operators" {
		t.Fatalf("expected role_assignments [Operators], got %v", assignments)
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

	cmd := newUserActivateCommand(svc)
	ctx := context.Background()
	if err := cmd.Execute(ctx, UserActivateMsg{IDs: []string{record.ID}}); err != nil {
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureUsers)})
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
