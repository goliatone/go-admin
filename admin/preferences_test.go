package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestPreferencesServiceSavesThemeAndLayout(t *testing.T) {
	sink := NewActivityFeed()
	svc := NewPreferencesService(NewInMemoryPreferencesStore()).
		WithDefaults("default", "light")
	svc.WithActivitySink(sink)

	ctx := context.Background()
	prefs, err := svc.Save(ctx, "user-1", UserPreferences{
		Theme:        "custom",
		ThemeVariant: "dark",
	})
	if err != nil {
		t.Fatalf("save preferences: %v", err)
	}
	if prefs.Theme != "custom" || prefs.ThemeVariant != "dark" {
		t.Fatalf("expected custom theme, got %+v", prefs)
	}

	layout := []DashboardWidgetInstance{
		{DefinitionCode: "admin.widget.quick_actions", AreaCode: "admin.dashboard.main", Position: 1},
	}
	if _, err := svc.SaveDashboardLayout(ctx, "user-1", layout); err != nil {
		t.Fatalf("save dashboard layout: %v", err)
	}
	stored, err := svc.Get(ctx, "user-1")
	if err != nil {
		t.Fatalf("get preferences: %v", err)
	}
	if len(stored.DashboardLayout) != 1 || stored.DashboardLayout[0].DefinitionCode != "admin.widget.quick_actions" {
		t.Fatalf("expected dashboard layout to persist, got %+v", stored.DashboardLayout)
	}
	entries, _ := sink.List(ctx, 10)
	if len(entries) == 0 {
		t.Fatalf("expected activity entries after preference updates")
	}
}

func TestPreferencesModuleRegistersPanelAndNavigation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Preferences: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if _, ok := adm.registry.Panel("preferences"); !ok {
		t.Fatalf("expected preferences panel to be registered")
	}

	items := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	found := false
	for _, item := range items {
		if targetMatches(item.Target, preferencesModuleID, joinPath(cfg.BasePath, "preferences")) {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected preferences navigation entry, got %v", items)
	}
}

func TestPreferencesPanelRequiresPermissions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Preferences: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/preferences", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 when permission denied, got %d", rr.Code)
	}
}

func TestPreferencesInfluenceThemeResolution(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "base",
		ThemeVariant:  "light",
		Features: Features{
			Preferences: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	if _, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
		Theme:        "custom",
		ThemeVariant: "night",
	}); err != nil {
		t.Fatalf("seed preferences: %v", err)
	}

	mockCtx := router.NewMockContext()
	mockCtx.HeadersM["X-User-ID"] = "user-1"
	mockCtx.On("Context").Return(context.Background())

	adminCtx := adm.adminContextFromRequest(mockCtx, "en")
	selection := adm.Theme(adminCtx.Context)
	if selection.Name != "custom" || selection.Variant != "night" {
		t.Fatalf("expected theme from preferences, got %+v", selection)
	}
	mockCtx.AssertExpectations(t)
}

func TestPreferencesUpdateRoundTripViaAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Preferences: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"theme":         "teal",
		"theme_variant": "dark",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", "/admin/api/preferences/user-1", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on update, got %d body=%s", rr.Code, rr.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if toString(resp["theme"]) != "teal" {
		t.Fatalf("expected theme to update, got %v", resp["theme"])
	}
}

func TestPreferencesUpdateRoundTripViaAPIStoresRawUIKeysAndStripsReserved(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features: Features{
			Preferences: true,
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	type testCase struct {
		name   string
		method string
		path   string
	}
	tests := []testCase{
		{name: "POST", method: "POST", path: "/admin/api/preferences"},
		{name: "PUT", method: "PUT", path: "/admin/api/preferences/user-1"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			payload := map[string]any{
				"id": "should-not-persist",
				"raw": map[string]any{
					"ui.datagrid.users.columns": map[string]any{
						"version":    2,
						"visibility": map[string]any{"email": true},
						"order":      []any{"email", "username"},
					},
					"not.allowed": "nope",
					"id":          "also-not-allowed",
				},
			}
			body, _ := json.Marshal(payload)
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("X-User-ID", "user-1")
			rr := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(rr, req)
			if rr.Code != 200 {
				t.Fatalf("expected 200 on update, got %d body=%s", rr.Code, rr.Body.String())
			}

			var resp map[string]any
			_ = json.Unmarshal(rr.Body.Bytes(), &resp)

			raw := extractMap(resp["raw"])
			if _, ok := raw["ui.datagrid.users.columns"]; !ok {
				t.Fatalf("expected raw ui key in response, got %v", raw)
			}
			if _, ok := raw["not.allowed"]; ok {
				t.Fatalf("expected disallowed raw key to be stripped, got %v", raw)
			}
			if _, ok := raw["id"]; ok {
				t.Fatalf("expected reserved raw key to be stripped, got %v", raw)
			}

			stored, err := adm.preferences.Store().Get(context.Background(), "user-1")
			if err != nil {
				t.Fatalf("get stored preferences: %v", err)
			}
			if _, ok := stored["ui.datagrid.users.columns"]; !ok {
				t.Fatalf("expected ui key to be persisted, got %v", stored)
			}
			if _, ok := stored["not.allowed"]; ok {
				t.Fatalf("expected disallowed key not to persist, got %v", stored)
			}
			if _, ok := stored["id"]; ok {
				t.Fatalf("expected reserved key not to persist, got %v", stored)
			}

			getReq := httptest.NewRequest("GET", "/admin/api/preferences", nil)
			getReq.Header.Set("X-User-ID", "user-1")
			getRR := httptest.NewRecorder()
			server.WrappedRouter().ServeHTTP(getRR, getReq)
			if getRR.Code != 200 {
				t.Fatalf("expected 200 on get, got %d body=%s", getRR.Code, getRR.Body.String())
			}

			var listResp map[string]any
			_ = json.Unmarshal(getRR.Body.Bytes(), &listResp)
			records, ok := listResp["records"].([]any)
			if !ok || len(records) != 1 {
				t.Fatalf("expected records array, got %v", listResp["records"])
			}
			rec := extractMap(records[0])
			raw = extractMap(rec["raw"])
			if _, ok := raw["ui.datagrid.users.columns"]; !ok {
				t.Fatalf("expected raw ui key in list response, got %v", raw)
			}
		})
	}
}
