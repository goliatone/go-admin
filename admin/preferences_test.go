package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
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
		{DefinitionCode: WidgetQuickActions, AreaCode: "admin.dashboard.main", Position: 1},
	}
	if _, err := svc.SaveDashboardLayout(ctx, "user-1", layout); err != nil {
		t.Fatalf("save dashboard layout: %v", err)
	}
	stored, err := svc.Get(ctx, "user-1")
	if err != nil {
		t.Fatalf("get preferences: %v", err)
	}
	if len(stored.DashboardLayout) != 1 || stored.DashboardLayout[0].DefinitionCode != WidgetQuickActions {
		t.Fatalf("expected dashboard layout to persist, got %+v", stored.DashboardLayout)
	}
	entries, _ := sink.List(ctx, 10)
	if len(entries) == 0 {
		t.Fatalf("expected activity entries after preference updates")
	}
}

func TestPreferencesServiceResolveIncludesDefaultsAndTraces(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryPreferencesStore()
	if _, err := store.Upsert(ctx, PreferencesUpsertInput{
		Level:  PreferenceLevelSystem,
		Values: map[string]any{"theme": "system"},
	}); err != nil {
		t.Fatalf("seed system preferences: %v", err)
	}
	if _, err := store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Level:  PreferenceLevelUser,
		Values: map[string]any{"theme": "user"},
	}); err != nil {
		t.Fatalf("seed user preferences: %v", err)
	}

	svc := NewPreferencesService(store).WithDefaults("default", "light")
	snapshot, err := svc.Resolve(ctx, PreferencesResolveInput{
		Scope:          PreferenceScope{UserID: "user-1"},
		IncludeTraces:  true,
		IncludeVersion: true,
	})
	if err != nil {
		t.Fatalf("resolve preferences: %v", err)
	}
	if toString(snapshot.Effective["theme"]) != "user" {
		t.Fatalf("expected user theme override, got %v", snapshot.Effective["theme"])
	}
	if toString(snapshot.Effective["theme_variant"]) != "light" {
		t.Fatalf("expected default theme variant, got %v", snapshot.Effective["theme_variant"])
	}
	if snapshot.Versions["theme"] <= 0 {
		t.Fatalf("expected version for theme, got %v", snapshot.Versions)
	}
	trace := findPreferenceTrace(snapshot.Traces, "theme")
	if trace == nil || len(trace.Layers) == 0 {
		t.Fatalf("expected trace layers for theme, got %v", snapshot.Traces)
	}
	last := trace.Layers[len(trace.Layers)-1]
	if !last.Found || last.Level != PreferenceLevelUser {
		t.Fatalf("expected user layer to be found, got %+v", last)
	}
}

func TestInMemoryPreferencesStoreResolvesScopes(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryPreferencesStore()
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Level:  PreferenceLevelSystem,
		Values: map[string]any{"theme": "system", "shared": "system"},
	})
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{TenantID: "tenant-1"},
		Level:  PreferenceLevelTenant,
		Values: map[string]any{"theme": "tenant", "tenant_only": "tenant"},
	})
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{OrgID: "org-1"},
		Level:  PreferenceLevelOrg,
		Values: map[string]any{"theme": "org", "org_only": "org"},
	})
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Level:  PreferenceLevelUser,
		Values: map[string]any{"theme": "user", "user_only": "user"},
	})

	snapshot, err := store.Resolve(ctx, PreferencesResolveInput{
		Scope: PreferenceScope{
			UserID:   "user-1",
			TenantID: "tenant-1",
			OrgID:    "org-1",
		},
	})
	if err != nil {
		t.Fatalf("resolve preferences: %v", err)
	}
	if toString(snapshot.Effective["theme"]) != "user" {
		t.Fatalf("expected user theme override, got %v", snapshot.Effective["theme"])
	}
	if toString(snapshot.Effective["shared"]) != "system" {
		t.Fatalf("expected system fallback, got %v", snapshot.Effective["shared"])
	}
	if toString(snapshot.Effective["tenant_only"]) != "tenant" {
		t.Fatalf("expected tenant value, got %v", snapshot.Effective["tenant_only"])
	}
	if toString(snapshot.Effective["org_only"]) != "org" {
		t.Fatalf("expected org value, got %v", snapshot.Effective["org_only"])
	}
	if toString(snapshot.Effective["user_only"]) != "user" {
		t.Fatalf("expected user value, got %v", snapshot.Effective["user_only"])
	}
}

func TestInMemoryPreferencesStoreDeleteFallsBack(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryPreferencesStore()
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{TenantID: "tenant-1"},
		Level:  PreferenceLevelTenant,
		Values: map[string]any{"theme": "tenant"},
	})
	_, _ = store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Level:  PreferenceLevelUser,
		Values: map[string]any{"theme": "user"},
	})

	if err := store.Delete(ctx, PreferencesDeleteInput{
		Scope: PreferenceScope{UserID: "user-1"},
		Level: PreferenceLevelUser,
		Keys:  []string{"theme"},
	}); err != nil {
		t.Fatalf("delete user preferences: %v", err)
	}

	snapshot, err := store.Resolve(ctx, PreferencesResolveInput{
		Scope: PreferenceScope{UserID: "user-1", TenantID: "tenant-1"},
	})
	if err != nil {
		t.Fatalf("resolve preferences: %v", err)
	}
	if toString(snapshot.Effective["theme"]) != "tenant" {
		t.Fatalf("expected tenant fallback, got %v", snapshot.Effective["theme"])
	}
}

func TestPreferencesModuleRegistersPanelAndNavigation(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if _, ok := adm.registry.Panel("preferences"); !ok {
		t.Fatalf("expected preferences panel to be registered")
	}
	if panel, ok := adm.registry.Panel("preferences"); !ok || panel.UIRouteMode() != PanelUIRouteModeCustom {
		t.Fatalf("expected preferences panel to own custom UI routes")
	}

	items := adm.Navigation().Resolve(context.Background(), cfg.DefaultLocale)
	found := false
	for _, item := range items {
		if navinternal.TargetMatches(item.Target, preferencesModuleID, joinBasePath(cfg.BasePath, "preferences")) {
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(stubAuthorizer{allow: false})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", preferencesAPIPath(t, adm, ""), nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 when permission denied, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", body)
	}
	meta, _ := errPayload["metadata"].(map[string]any)
	if meta["permission"] != "admin.preferences.view" {
		t.Fatalf("expected permission metadata, got %v", meta["permission"])
	}
	if meta["resource"] != "preferences" {
		t.Fatalf("expected resource metadata, got %v", meta["resource"])
	}
}

func TestPreferencesInfluenceThemeResolution(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "base",
		ThemeVariant:  "light",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
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
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"theme":         "teal",
		"theme_variant": "dark",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPath(t, adm, "user-1"), bytes.NewReader(body))
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
	if _, ok := resp["effective"]; ok {
		t.Fatalf("expected no effective payload by default, got %v", resp["effective"])
	}
	if _, ok := resp["traces"]; ok {
		t.Fatalf("expected no traces payload by default, got %v", resp["traces"])
	}
	if _, ok := resp["versions"]; ok {
		t.Fatalf("expected no versions payload by default, got %v", resp["versions"])
	}
}

func TestPreferencesUpdateRoundTripViaAPIStoresRawUIKeysAndStripsReserved(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
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
		{name: "POST", method: "POST", path: preferencesAPIPath(t, adm, "")},
		{name: "PUT", method: "PUT", path: preferencesAPIPath(t, adm, "user-1")},
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

			snapshot, err := adm.preferences.Store().Resolve(context.Background(), PreferencesResolveInput{
				Scope:  PreferenceScope{UserID: "user-1"},
				Levels: []PreferenceLevel{PreferenceLevelUser},
			})
			if err != nil {
				t.Fatalf("get stored preferences: %v", err)
			}
			if _, ok := snapshot.Effective["ui.datagrid.users.columns"]; !ok {
				t.Fatalf("expected ui key to be persisted, got %v", snapshot.Effective)
			}
			if _, ok := snapshot.Effective["not.allowed"]; ok {
				t.Fatalf("expected disallowed key not to persist, got %v", snapshot.Effective)
			}
			if _, ok := snapshot.Effective["id"]; ok {
				t.Fatalf("expected reserved key not to persist, got %v", snapshot.Effective)
			}

			getReq := httptest.NewRequest("GET", preferencesAPIPath(t, adm, ""), nil)
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

func TestPreferencesClearKeysViaAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "base",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	_, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
		Theme: "teal",
		Raw: map[string]any{
			"ui.datagrid.users.columns": map[string]any{"order": []any{"email"}},
		},
	})
	if err != nil {
		t.Fatalf("seed preferences: %v", err)
	}

	payload := map[string]any{
		"theme":          "",
		"clear_raw_keys": []any{"ui.datagrid.users.columns"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPath(t, adm, "user-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on clear, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if toString(resp["theme"]) != "base" {
		t.Fatalf("expected theme to reset to default, got %v", resp["theme"])
	}
	raw := extractMap(resp["raw"])
	if _, ok := raw["ui.datagrid.users.columns"]; ok {
		t.Fatalf("expected raw key cleared, got %v", raw)
	}

	snapshot, err := adm.preferences.Store().Resolve(context.Background(), PreferencesResolveInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Levels: []PreferenceLevel{PreferenceLevelUser},
	})
	if err != nil {
		t.Fatalf("get stored preferences: %v", err)
	}
	if _, ok := snapshot.Effective["theme"]; ok {
		t.Fatalf("expected theme key to be removed, got %v", snapshot.Effective["theme"])
	}
	if _, ok := snapshot.Effective["ui.datagrid.users.columns"]; ok {
		t.Fatalf("expected ui key removed from store, got %v", snapshot.Effective)
	}
}

func TestPreferencesClearAllRawViaAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	_, err := adm.preferences.Save(context.Background(), "user-1", UserPreferences{
		Theme: "teal",
		Raw: map[string]any{
			"ui.one":      true,
			"system.keep": "ok",
		},
	})
	if err != nil {
		t.Fatalf("seed preferences: %v", err)
	}

	payload := map[string]any{"clear": true}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPath(t, adm, "user-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on clear, got %d body=%s", rr.Code, rr.Body.String())
	}

	snapshot, err := adm.preferences.Store().Resolve(context.Background(), PreferencesResolveInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Levels: []PreferenceLevel{PreferenceLevelUser},
	})
	if err != nil {
		t.Fatalf("get stored preferences: %v", err)
	}
	if _, ok := snapshot.Effective["ui.one"]; ok {
		t.Fatalf("expected ui key removed from store, got %v", snapshot.Effective)
	}
	if _, ok := snapshot.Effective["system.keep"]; !ok {
		t.Fatalf("expected non-ui key preserved, got %v", snapshot.Effective)
	}
	if toString(snapshot.Effective["theme"]) != "teal" {
		t.Fatalf("expected theme preserved, got %v", snapshot.Effective["theme"])
	}
}

func TestPreferencesRejectsRawUIInAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"raw_ui": map[string]any{"ui.bad": true},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPath(t, adm, "user-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 on raw_ui, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	errPayload, ok := resp["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", resp)
	}
	if text := toString(errPayload["text_code"]); text != "RAW_UI_NOT_SUPPORTED" {
		t.Fatalf("expected RAW_UI_NOT_SUPPORTED, got %v", errPayload["text_code"])
	}
}

func TestPreferencesRejectsClearKeysInAPI(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"clear_keys": []any{"ui.one"},
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPath(t, adm, "user-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 on clear_keys, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	errPayload, ok := resp["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error payload, got %v", resp)
	}
	if text := toString(errPayload["text_code"]); text != "CLEAR_KEYS_NOT_SUPPORTED" {
		t.Fatalf("expected CLEAR_KEYS_NOT_SUPPORTED, got %v", errPayload["text_code"])
	}
}

func TestPreferencesQueryParamsIncludeTracesAndVersions(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	ctx := context.Background()
	store := adm.preferences.Store()
	if _, err := store.Upsert(ctx, PreferencesUpsertInput{
		Level:  PreferenceLevelSystem,
		Values: map[string]any{"theme": "system"},
	}); err != nil {
		t.Fatalf("seed system preferences: %v", err)
	}
	if _, err := store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{TenantID: "tenant-1"},
		Level:  PreferenceLevelTenant,
		Values: map[string]any{"theme": "tenant"},
	}); err != nil {
		t.Fatalf("seed tenant preferences: %v", err)
	}
	if _, err := store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Level:  PreferenceLevelUser,
		Values: map[string]any{"theme": "user"},
	}); err != nil {
		t.Fatalf("seed user preferences: %v", err)
	}

	req := httptest.NewRequest("GET", preferencesAPIPathWithQuery(t, adm, "", "?tenant_id=tenant-1&levels=system,tenant&keys=theme&include_traces=1&include_versions=1"), nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on query params, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	records, ok := resp["records"].([]any)
	if !ok || len(records) != 1 {
		t.Fatalf("expected records array, got %v", resp["records"])
	}
	record := extractMap(records[0])
	if toString(record["theme"]) != "tenant" {
		t.Fatalf("expected tenant theme with levels override, got %v", record["theme"])
	}
	effective := extractMap(record["effective"])
	if toString(effective["theme"]) != "tenant" {
		t.Fatalf("expected effective theme to be tenant, got %v", effective["theme"])
	}
	versions := extractMap(record["versions"])
	if versions["theme"] == nil {
		t.Fatalf("expected versions to include theme, got %v", versions)
	}
	traces, ok := record["traces"].([]any)
	if !ok || len(traces) == 0 {
		t.Fatalf("expected traces payload, got %v", record["traces"])
	}
	trace := extractMap(traces[0])
	if toString(trace["key"]) != "theme" {
		t.Fatalf("expected theme trace, got %v", trace["key"])
	}
}

func TestPreferencesQueryParamsRejectInvalidLevels(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", preferencesAPIPathWithQuery(t, adm, "", "?levels=unknown"), nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 400 {
		t.Fatalf("expected 400 on invalid levels, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	errPayload := extractMap(resp["error"])
	meta := extractMap(errPayload["metadata"])
	if meta["level"] != "unknown" {
		t.Fatalf("expected level metadata, got %v", meta["level"])
	}
}

func TestPreferencesQueryBaseOverridesDefaults(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Theme:         "default",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	encodedBase := url.QueryEscape(`{"theme":"base"}`)
	req := httptest.NewRequest("GET", preferencesAPIPathWithQuery(t, adm, "", "?base="+encodedBase), nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on base query param, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	records, ok := resp["records"].([]any)
	if !ok || len(records) != 1 {
		t.Fatalf("expected records array, got %v", resp["records"])
	}
	record := extractMap(records[0])
	if toString(record["theme"]) != "base" {
		t.Fatalf("expected base theme override, got %v", record["theme"])
	}
}

func TestPreferencesEmptyThemeClearsToInheritedValue(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	ctx := context.Background()
	if _, err := adm.preferences.Store().Upsert(ctx, PreferencesUpsertInput{
		Scope:  PreferenceScope{TenantID: "tenant-1"},
		Level:  PreferenceLevelTenant,
		Values: map[string]any{"theme": "tenant"},
	}); err != nil {
		t.Fatalf("seed tenant preferences: %v", err)
	}
	if _, err := adm.preferences.Save(ctx, "user-1", UserPreferences{
		Theme: "teal",
	}); err != nil {
		t.Fatalf("seed user preferences: %v", err)
	}

	payload := map[string]any{"theme": ""}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPathWithQuery(t, adm, "user-1", "?tenant_id=tenant-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on clear, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if toString(resp["theme"]) != "tenant" {
		t.Fatalf("expected theme to fall back to tenant, got %v", resp["theme"])
	}

	snapshot, err := adm.preferences.Store().Resolve(ctx, PreferencesResolveInput{
		Scope:  PreferenceScope{UserID: "user-1"},
		Levels: []PreferenceLevel{PreferenceLevelUser},
		Keys:   []string{"theme"},
	})
	if err != nil {
		t.Fatalf("get stored preferences: %v", err)
	}
	if _, ok := snapshot.Effective["theme"]; ok {
		t.Fatalf("expected theme key to be removed, got %v", snapshot.Effective["theme"])
	}
}

func TestPreferencesTenantWriteRequiresPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(permissionAuthorizer{allowed: map[string]bool{
		adm.config.PreferencesUpdatePermission: true,
	}})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"level": "tenant",
		"theme": "teal",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPathWithQuery(t, adm, "user-1", "?tenant_id=tenant-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 403 {
		t.Fatalf("expected 403 when permission denied, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	errPayload := extractMap(resp["error"])
	meta := extractMap(errPayload["metadata"])
	if meta["permission"] != adm.config.PreferencesManageTenantPermission {
		t.Fatalf("expected manage tenant permission metadata, got %v", meta["permission"])
	}
}

func TestPreferencesTenantWriteHonorsPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeaturePreferences)})
	adm.WithAuthorizer(permissionAuthorizer{allowed: map[string]bool{
		adm.config.PreferencesUpdatePermission:       true,
		adm.config.PreferencesManageTenantPermission: true,
	}})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	payload := map[string]any{
		"level": "tenant",
		"theme": "teal",
	}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PUT", preferencesAPIPathWithQuery(t, adm, "user-1", "?tenant_id=tenant-1"), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 on tenant write, got %d body=%s", rr.Code, rr.Body.String())
	}

	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if toString(resp["theme"]) != "teal" {
		t.Fatalf("expected tenant theme in response, got %v", resp["theme"])
	}

	snapshot, err := adm.preferences.Store().Resolve(context.Background(), PreferencesResolveInput{
		Scope:  PreferenceScope{TenantID: "tenant-1"},
		Levels: []PreferenceLevel{PreferenceLevelTenant},
		Keys:   []string{"theme"},
	})
	if err != nil {
		t.Fatalf("resolve tenant preferences: %v", err)
	}
	if toString(snapshot.Effective["theme"]) != "teal" {
		t.Fatalf("expected tenant theme to persist, got %v", snapshot.Effective["theme"])
	}
}

func TestPreferencesAPIRoutesFeatureGated(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys()})
	server := router.NewHTTPServer()

	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", preferencesAPIPath(t, adm, ""), nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 when preferences feature disabled, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func preferencesAPIPath(t *testing.T, adm *Admin, id string) string {
	t.Helper()
	params := map[string]string{"panel": "preferences"}
	route := "panel"
	if id != "" {
		params["id"] = id
		route = "panel.id"
	}
	return mustResolveURL(t, adm.URLs(), adminAPIGroupName(adm.config), route, params, nil)
}

func preferencesAPIPathWithQuery(t *testing.T, adm *Admin, id, query string) string {
	t.Helper()
	path := preferencesAPIPath(t, adm, id)
	if strings.TrimSpace(query) == "" {
		return path
	}
	return path + query
}

func findPreferenceTrace(traces []PreferenceTrace, key string) *PreferenceTrace {
	for i := range traces {
		if traces[i].Key == key {
			return &traces[i]
		}
	}
	return nil
}

type permissionAuthorizer struct {
	allowed map[string]bool
}

func (p permissionAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = resource
	if len(p.allowed) == 0 {
		return false
	}
	return p.allowed[action]
}
