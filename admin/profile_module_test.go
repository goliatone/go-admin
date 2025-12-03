package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestProfileModuleRegistersPanelAndNavigation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Profile: true,
		},
	}
	adm := New(cfg)
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if _, ok := adm.registry.Panel(profileModuleID); !ok {
		t.Fatalf("expected profile panel to be registered")
	}

	items := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	found := false
	for _, item := range items {
		if targetMatches(item.Target, profileModuleID, joinPath(cfg.BasePath, profileModuleID)) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected profile navigation entry, got %v", items)
	}
}

func TestProfilePanelRequiresPermissions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Profile: true,
		},
	}
	adm := New(cfg)
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/profile", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 when permission denied, got %d", rr.Code)
	}
}

func TestProfileAPIRejectsMismatchedUser(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Profile: true,
		},
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"display_name": "Other User",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", "/admin/api/profile/other-user", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 for mismatched user update, got %d", rr.Code)
	}
}

func TestProfileUpdateRoundTripViaAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Profile: true,
		},
	}
	adm := New(cfg)
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"display_name": "Jane Doe",
		"email":        "jane@example.com",
		"avatar_url":   "https://example.com/avatar.png",
		"locale":       "en",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", "/admin/api/profile/user-1", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on update, got %d body=%s", rr.Code, rr.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if toString(resp["display_name"]) != "Jane Doe" {
		t.Fatalf("expected display_name to update, got %v", resp["display_name"])
	}
	if toString(resp["email"]) != "jane@example.com" {
		t.Fatalf("expected email to update, got %v", resp["email"])
	}

	entries, _ := adm.ActivityFeed().List(context.Background(), 5)
	found := false
	for _, entry := range entries {
		if entry.Action == "profile.update" && entry.Object == "profile:user-1" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected profile.update activity entry after update")
	}
}

func TestProfileSchemaIncludesMediaHintsWhenEnabled(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Profile: true,
			Media:   true,
			CMS:     true,
		},
	}
	adm := New(cfg)
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/profile", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 listing profile, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	schema, _ := resp["schema"].(map[string]any)
	mediaCfg, _ := schema["media"].(map[string]any)
	if toString(mediaCfg["library_path"]) == "" {
		t.Fatalf("expected media library path in schema, got %v", mediaCfg)
	}
	formSchema, ok := schema["form_schema"].(map[string]any)
	if !ok {
		t.Fatalf("expected form_schema in response, got %v", schema["form_schema"])
	}
	props, ok := formSchema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected properties in form schema, got %v", formSchema["properties"])
	}
	avatar, ok := props["avatar"].(map[string]any)
	if !ok {
		t.Fatalf("expected avatar field schema, got %v", props["avatar"])
	}
	adminMeta, _ := avatar["x-admin"].(map[string]any)
	if toString(adminMeta["media_library_path"]) == "" {
		t.Fatalf("expected avatar field to include media library metadata, got %v", adminMeta)
	}
}
