package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
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
