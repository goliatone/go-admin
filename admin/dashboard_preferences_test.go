package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http/httptest"
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

func TestDashboardPreferenceStorePersistsOverrides(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryPreferencesStore()
	prefs := NewPreferencesService(store)
	widgetStore := newStubWidgetStore(map[string]dashcmp.WidgetInstance{
		"w1": {ID: "w1", DefinitionID: "admin.widget.stats", Configuration: map[string]any{"color": "blue"}},
		"w2": {ID: "w2", DefinitionID: "admin.widget.activity", Configuration: map[string]any{"limit": 5}},
	})
	preferenceStore := newDashboardPreferenceStore(prefs, widgetStore)

	overrides := dashcmp.LayoutOverrides{
		Locale:    "en",
		AreaOrder: map[string][]string{"admin.dashboard.main": {"w1", "w2"}},
		AreaRows: map[string][]dashcmp.LayoutRow{
			"admin.dashboard.main": {
				{Widgets: []dashcmp.WidgetSlot{{ID: "w1", Width: 8}, {ID: "w2", Width: 4}}},
			},
		},
		HiddenWidgets: map[string]bool{"w2": true},
	}
	viewer := dashcmp.ViewerContext{UserID: "user-1", Locale: "en"}
	if err := preferenceStore.SaveLayoutOverrides(ctx, viewer, overrides); err != nil {
		t.Fatalf("save layout overrides: %v", err)
	}

	reloadedPrefs := NewPreferencesService(store)
	reloadedStore := newDashboardPreferenceStore(reloadedPrefs, widgetStore)
	reloaded, err := reloadedStore.LayoutOverrides(ctx, viewer)
	if err != nil {
		t.Fatalf("load layout overrides: %v", err)
	}
	rows, ok := reloaded.AreaRows["admin.dashboard.main"]
	if !ok || len(rows) != 1 {
		t.Fatalf("expected one row for main area, got %+v", reloaded.AreaRows)
	}
	if len(rows[0].Widgets) != 2 || rows[0].Widgets[0].ID != "w1" || rows[0].Widgets[1].ID != "w2" {
		t.Fatalf("expected widget order w1,w2, got %+v", rows[0].Widgets)
	}
	if !reloaded.HiddenWidgets["w2"] {
		t.Fatalf("expected w2 to be hidden, got %+v", reloaded.HiddenWidgets)
	}

	layout := reloadedPrefs.DashboardLayout(ctx, viewer.UserID)
	if len(layout) != 2 {
		t.Fatalf("expected 2 widgets in persisted layout, got %d", len(layout))
	}
	if layout[0].DefinitionCode != "admin.widget.stats" || layout[1].DefinitionCode != "admin.widget.activity" {
		t.Fatalf("expected definitions to round-trip, got %+v", layout)
	}
	if layout[1].Span != 4 || layout[1].Hidden != true {
		t.Fatalf("expected width 4 and hidden true for w2, got %+v", layout[1])
	}
}

func TestDashboardPreferencesEndpointPersistsLayout(t *testing.T) {
	ctx := context.Background()
	store := NewInMemoryPreferencesStore()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	adm.PreferencesService().WithStore(store)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"area_order":{"admin.dashboard.main":["w1"]},"layout_rows":{"admin.dashboard.main":[{"widgets":[{"id":"w1","width":12}]}]},"hidden_widget_ids":[]}`
	req := httptest.NewRequest("POST", "/admin/api/dashboard/preferences", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 from preferences endpoint, got %d body=%s", rr.Code, rr.Body.String())
	}

	stored := adm.PreferencesService().DashboardOverrides(ctx, "user-1")
	rows, ok := stored.AreaRows["admin.dashboard.main"]
	if !ok || len(rows) == 0 {
		t.Fatalf("expected stored rows for main area, got %+v", stored.AreaRows)
	}
	if len(rows[0].Widgets) != 1 || rows[0].Widgets[0].ID != "w1" {
		t.Fatalf("expected w1 layout slot, got %+v", rows[0].Widgets)
	}

	reloaded := NewPreferencesService(store).DashboardOverrides(ctx, "user-1")
	if len(reloaded.AreaRows["admin.dashboard.main"]) == 0 {
		t.Fatalf("expected preferences to persist across sessions, got %+v", reloaded.AreaRows)
	}
}

func TestDashboardPreferencesEndpointPreservesLegacyLayoutPayload(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"layout":[{"id":"w1","definition":"admin.widget.user_stats","area":"admin.dashboard.main","config":{"metric":"total"},"position":1,"span":8,"hidden":true,"locale":"es"}]}`
	req := httptest.NewRequest("POST", "/admin/api/dashboard/preferences", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 from legacy preferences payload, got %d body=%s", rr.Code, rr.Body.String())
	}

	layout := adm.PreferencesService().DashboardLayout(context.Background(), "user-1")
	if len(layout) != 1 {
		t.Fatalf("expected one persisted layout widget, got %+v", layout)
	}
	if layout[0].ID != "w1" || layout[0].DefinitionCode != "admin.widget.user_stats" {
		t.Fatalf("expected legacy layout widget to round-trip, got %+v", layout[0])
	}
	if layout[0].Span != 8 || !layout[0].Hidden || layout[0].Locale != "es" {
		t.Fatalf("expected legacy layout metadata to persist, got %+v", layout[0])
	}
}

func TestDashboardHTMLRouteUsesTypedAdminDashboardPage(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	renderer := &captureDashboardRenderer{}
	adm.Dashboard().WithRenderer(renderer)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/dashboard?locale=es", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 from dashboard html route, got %d body=%s", rr.Code, rr.Body.String())
	}

	page := renderer.lastPage
	if page.Chrome.BasePath != "/admin" {
		t.Fatalf("expected base_path propagated through typed host wrapper, got %#v", page.Chrome.BasePath)
	}
	if page.Title() != cfg.Title && page.Title() != "Dashboard" {
		t.Fatalf("expected typed page title to be composed, got %q", page.Title())
	}
	if got := page.LayoutJSON(); got == "" || got == "{}" {
		t.Fatalf("expected layout_json derived from typed page, got %q", got)
	}
	if len(page.Dashboard.Areas) == 0 {
		t.Fatalf("expected dashboard areas in typed page, got %+v", page.Dashboard.Areas)
	}
	if len(page.Chrome.Theme) == 0 {
		t.Fatalf("expected admin theme payload in typed host wrapper, got %+v", page.Chrome.Theme)
	}
	if len(page.Chrome.SessionUser) == 0 {
		t.Fatalf("expected session user in typed host wrapper, got %+v", page.Chrome.SessionUser)
	}
}

func TestDashboardAPIRouteUsesTypedPageSource(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	renderer := &captureDashboardRenderer{}
	adm.Dashboard().WithRenderer(renderer)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	htmlReq := httptest.NewRequest("GET", "/admin/dashboard?locale=es", nil)
	htmlReq.Header.Set("X-User-ID", "user-1")
	htmlRR := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(htmlRR, htmlReq)
	if htmlRR.Code != 200 {
		t.Fatalf("expected 200 from dashboard html route, got %d body=%s", htmlRR.Code, htmlRR.Body.String())
	}

	apiReq := httptest.NewRequest("GET", "/admin/api/dashboard?locale=es", nil)
	apiReq.Header.Set("X-User-ID", "user-1")
	apiRR := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(apiRR, apiReq)
	if apiRR.Code != 200 {
		t.Fatalf("expected 200 from dashboard api route, got %d body=%s", apiRR.Code, apiRR.Body.String())
	}

	payload := decodeDashboardJSONMap(t, apiRR.Body.Bytes())
	chrome := nestedMap(t, payload, "chrome")
	if chrome["base_path"] != "/admin" {
		t.Fatalf("expected api chrome base_path /admin, got %#v", chrome["base_path"])
	}
	dashboard := nestedMap(t, payload, "dashboard")
	if dashboard["locale"] != "es" {
		t.Fatalf("expected api dashboard locale es, got %#v", dashboard["locale"])
	}
	areas, ok := dashboard["areas"].([]any)
	if !ok {
		t.Fatalf("expected api dashboard areas array, got %T", dashboard["areas"])
	}
	if len(areas) != len(renderer.lastPage.Dashboard.Areas) {
		t.Fatalf("expected api/html routes to share area count %d, got %d", len(renderer.lastPage.Dashboard.Areas), len(areas))
	}
	widgets, ok := payload["widgets"].([]any)
	if !ok || len(widgets) == 0 {
		t.Fatalf("expected api widgets array, got %#v", payload["widgets"])
	}
	theme := nestedMap(t, payload, "theme")
	if len(theme) == 0 {
		t.Fatalf("expected api theme payload, got %+v", theme)
	}
}

func TestAdminChromeStateFromViewContextPreservesNavigationSlices(t *testing.T) {
	state := adminChromeStateFromViewContext(router.ViewContext{
		"nav_items": []map[string]any{
			{"label": "Dashboard", "href": "/admin/dashboard"},
		},
		"nav_utility_items": []map[string]any{
			{"label": "Profile", "href": "/admin/profile"},
		},
	})

	if len(state.NavItems) != 1 {
		t.Fatalf("expected one nav item, got %+v", state.NavItems)
	}
	if len(state.NavUtilityItems) != 1 {
		t.Fatalf("expected one utility nav item, got %+v", state.NavUtilityItems)
	}
	item, ok := state.NavItems[0].(map[string]any)
	if !ok {
		t.Fatalf("expected nav item map, got %T", state.NavItems[0])
	}
	if item["label"] != "Dashboard" {
		t.Fatalf("expected nav item label to round-trip, got %+v", item)
	}
}

func TestDashboardPreferenceRoutesExposeTypedTransport(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"area_order":{"admin.dashboard.main":["w1"]},"layout_rows":{"admin.dashboard.main":[{"widgets":[{"id":"w1","width":12}]}]},"hidden_widget_ids":["w1"]}`
	postReq := httptest.NewRequest("POST", "/admin/api/dashboard/preferences", bytes.NewBufferString(body))
	postReq.Header.Set("Content-Type", "application/json")
	postReq.Header.Set("X-User-ID", "user-1")
	postRR := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(postRR, postReq)
	if postRR.Code != 200 {
		t.Fatalf("expected 200 from preferences post route, got %d body=%s", postRR.Code, postRR.Body.String())
	}

	for _, path := range []string{"/admin/api/dashboard/preferences", "/admin/api/dashboard/config"} {
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("X-User-ID", "user-1")
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			t.Fatalf("expected 200 from %s, got %d body=%s", path, rr.Code, rr.Body.String())
		}

		payload := decodeDashboardJSONMap(t, rr.Body.Bytes())
		if _, exists := payload["layout"]; exists {
			t.Fatalf("expected typed preference transport from %s, got legacy layout payload %+v", path, payload["layout"])
		}
		areaOrder := nestedMap(t, payload, "area_order")
		mainOrder, ok := areaOrder["admin.dashboard.main"].([]any)
		if !ok || len(mainOrder) != 1 || mainOrder[0] != "w1" {
			t.Fatalf("expected typed area order from %s, got %+v payload=%+v", path, areaOrder, payload)
		}
		layoutRows := nestedMap(t, payload, "layout_rows")
		rows, ok := layoutRows["admin.dashboard.main"].([]any)
		if !ok || len(rows) != 1 {
			t.Fatalf("expected typed layout rows from %s, got %+v", path, layoutRows)
		}
		hidden, ok := payload["hidden_widget_ids"].([]any)
		if !ok || len(hidden) != 1 || hidden[0] != "w1" {
			t.Fatalf("expected hidden_widget_ids from %s, got %+v", path, payload["hidden_widget_ids"])
		}
		catalog := nestedMap(t, payload, "catalog")
		if _, ok := catalog["areas"].([]any); !ok {
			t.Fatalf("expected typed catalog areas from %s, got %#v", path, catalog["areas"])
		}
	}
}

func TestDashboardConfigRoutePersistsTypedPreferences(t *testing.T) {
	ctx := context.Background()
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := `{"area_order":{"admin.dashboard.main":["w1"]},"layout_rows":{"admin.dashboard.main":[{"widgets":[{"id":"w1","width":6}]}]},"hidden_widget_ids":["w1"]}`
	req := httptest.NewRequest("POST", "/admin/api/dashboard/config", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 from config alias post route, got %d body=%s", rr.Code, rr.Body.String())
	}

	stored := adm.PreferencesService().DashboardOverrides(ctx, "user-1")
	rows := stored.AreaRows["admin.dashboard.main"]
	if len(rows) != 1 || len(rows[0].Widgets) != 1 || rows[0].Widgets[0].ID != "w1" || rows[0].Widgets[0].Width != 6 {
		t.Fatalf("expected config alias to persist typed overrides, got %+v", stored.AreaRows)
	}
	if !stored.HiddenWidgets["w1"] {
		t.Fatalf("expected config alias hidden widget flag to persist, got %+v", stored.HiddenWidgets)
	}
}

func TestDashboardDebugRouteUsesTypedDiagnostics(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/dashboard/debug?locale=es", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("expected 200 from debug route, got %d body=%s", rr.Code, rr.Body.String())
	}

	payload := decodeDashboardJSONMap(t, rr.Body.Bytes())
	viewer := nestedMap(t, payload, "viewer")
	if viewer["locale"] != "es" {
		t.Fatalf("expected debug viewer locale es, got %#v", viewer["locale"])
	}
	preferences := nestedMap(t, payload, "preferences")
	if _, ok := preferences["layout_rows"].(map[string]any); !ok {
		t.Fatalf("expected typed debug preferences payload, got %#v", preferences["layout_rows"])
	}
	if _, ok := payload["layout"].(map[string]any); !ok {
		t.Fatalf("expected typed debug layout payload, got %T", payload["layout"])
	}
	catalog := nestedMap(t, payload, "catalog")
	if _, ok := catalog["providers"].([]any); !ok {
		t.Fatalf("expected typed catalog providers, got %#v", catalog["providers"])
	}
	if _, ok := payload["providers"].([]any); !ok {
		t.Fatalf("expected typed top-level providers payload, got %#v", payload["providers"])
	}
	if _, ok := payload["definitions"].([]any); !ok {
		t.Fatalf("expected typed top-level definitions payload, got %#v", payload["definitions"])
	}
	if _, ok := payload["provider_count"]; !ok {
		t.Fatalf("expected provider_count, got %#v", payload)
	}
	if _, ok := payload["definition_count"]; !ok {
		t.Fatalf("expected definition_count, got %#v", payload)
	}
	if _, ok := payload["instance_count"]; !ok {
		t.Fatalf("expected instance_count, got %#v", payload)
	}
	if _, exists := payload["resolved_by_area"]; exists {
		t.Fatalf("expected resolved_by_area alias to be removed, got %#v", payload["resolved_by_area"])
	}
	page := nestedMap(t, payload, "page")
	pageChrome := nestedMap(t, page, "chrome")
	if pageChrome["base_path"] != "/admin" {
		t.Fatalf("expected debug page chrome base_path /admin, got %#v", pageChrome["base_path"])
	}
}

func TestDashboardPreferenceStoreSaveLayoutOverridesReturnsLayoutPersistenceError(t *testing.T) {
	ctx := context.Background()
	expectedErr := errors.New("layout persistence failed")
	store := &failingPreferencesStore{
		base:       NewInMemoryPreferencesStore(),
		failLayout: true,
		err:        expectedErr,
	}
	prefs := NewPreferencesService(store)
	widgetStore := newStubWidgetStore(map[string]dashcmp.WidgetInstance{
		"w1": {ID: "w1", DefinitionID: "admin.widget.stats", Configuration: map[string]any{"color": "blue"}},
	})
	preferenceStore := newDashboardPreferenceStore(prefs, widgetStore)

	overrides := dashcmp.LayoutOverrides{
		Locale:    "en",
		AreaOrder: map[string][]string{"admin.dashboard.main": {"w1"}},
		AreaRows: map[string][]dashcmp.LayoutRow{
			"admin.dashboard.main": {
				{Widgets: []dashcmp.WidgetSlot{{ID: "w1", Width: 12}}},
			},
		},
	}
	viewer := dashcmp.ViewerContext{UserID: "user-1", Locale: "en"}
	if err := preferenceStore.SaveLayoutOverrides(ctx, viewer, overrides); !errors.Is(err, expectedErr) {
		t.Fatalf("expected layout persistence error %v, got %v", expectedErr, err)
	}

	stored := prefs.DashboardOverrides(ctx, viewer.UserID)
	if len(stored.AreaRows["admin.dashboard.main"]) != 1 {
		t.Fatalf("expected overrides to persist before layout save failed, got %+v", stored.AreaRows)
	}
	if layout := prefs.DashboardLayout(ctx, viewer.UserID); len(layout) != 0 {
		t.Fatalf("expected derived layout persistence to fail, got %+v", layout)
	}
}

func TestDashboardPreferenceStoreSaveLayoutOverridesRequiresViewerUserID(t *testing.T) {
	ctx := context.Background()
	prefs := NewPreferencesService(NewInMemoryPreferencesStore())
	preferenceStore := newDashboardPreferenceStore(prefs, newStubWidgetStore(nil))

	err := preferenceStore.SaveLayoutOverrides(ctx, dashcmp.ViewerContext{Locale: "en"}, dashcmp.LayoutOverrides{
		AreaOrder: map[string][]string{"admin.dashboard.main": {"w1"}},
	})
	if err == nil {
		t.Fatalf("expected missing viewer user id error")
	}

	var domErr *goerrors.Error
	if !errors.As(err, &domErr) {
		t.Fatalf("expected domain error, got %T", err)
	}
	if domErr.TextCode != TextCodeValidationError {
		t.Fatalf("expected %s, got %s", TextCodeValidationError, domErr.TextCode)
	}
	if got := domErr.Metadata["scope"]; got != "dashboard_preferences" {
		t.Fatalf("expected dashboard_preferences scope, got %#v", got)
	}
	if got := domErr.Metadata["field"]; got != "viewer user id" {
		t.Fatalf("expected field metadata, got %#v", got)
	}
}

type stubWidgetStore struct {
	instances map[string]dashcmp.WidgetInstance
}

type captureDashboardRenderer struct {
	lastTemplate string
	lastPage     AdminDashboardPage
}

func (r *captureDashboardRenderer) RenderPage(name string, page AdminDashboardPage, out ...io.Writer) (string, error) {
	r.lastTemplate = name
	r.lastPage = page
	if len(out) > 0 && out[0] != nil {
		_, _ = out[0].Write([]byte("<html></html>"))
	}
	return "<html></html>", nil
}

func newStubWidgetStore(instances map[string]dashcmp.WidgetInstance) *stubWidgetStore {
	if instances == nil {
		instances = map[string]dashcmp.WidgetInstance{}
	}
	return &stubWidgetStore{instances: instances}
}

func (s *stubWidgetStore) EnsureArea(context.Context, dashcmp.WidgetAreaDefinition) (bool, error) {
	return false, nil
}

func (s *stubWidgetStore) EnsureDefinition(context.Context, dashcmp.WidgetDefinition) (bool, error) {
	return false, nil
}

func (s *stubWidgetStore) CreateInstance(_ context.Context, input dashcmp.CreateWidgetInstanceInput) (dashcmp.WidgetInstance, error) {
	inst := dashcmp.WidgetInstance{
		ID:            input.DefinitionID,
		DefinitionID:  input.DefinitionID,
		Configuration: input.Configuration,
	}
	s.instances[inst.ID] = inst
	return inst, nil
}

func (s *stubWidgetStore) GetInstance(_ context.Context, id string) (dashcmp.WidgetInstance, error) {
	if inst, ok := s.instances[id]; ok {
		return inst, nil
	}
	return dashcmp.WidgetInstance{}, fmt.Errorf("not found")
}

func (s *stubWidgetStore) DeleteInstance(context.Context, string) error {
	return nil
}

func (s *stubWidgetStore) AssignInstance(context.Context, dashcmp.AssignWidgetInput) error {
	return nil
}

func (s *stubWidgetStore) UpdateInstance(_ context.Context, input dashcmp.UpdateWidgetInstanceInput) (dashcmp.WidgetInstance, error) {
	inst := dashcmp.WidgetInstance{
		ID:            input.InstanceID,
		DefinitionID:  input.InstanceID,
		Configuration: input.Configuration,
	}
	s.instances[input.InstanceID] = inst
	return inst, nil
}

func (s *stubWidgetStore) ReorderArea(context.Context, dashcmp.ReorderAreaInput) error {
	return nil
}

func (s *stubWidgetStore) ResolveArea(context.Context, dashcmp.ResolveAreaInput) (dashcmp.ResolvedArea, error) {
	return dashcmp.ResolvedArea{}, nil
}

func decodeDashboardJSONMap(t *testing.T, raw []byte) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		t.Fatalf("decode json: %v body=%s", err, string(raw))
	}
	return payload
}

func nestedMap(t *testing.T, payload map[string]any, key string) map[string]any {
	t.Helper()
	value, ok := payload[key].(map[string]any)
	if !ok {
		t.Fatalf("expected %s map, got %T", key, payload[key])
	}
	return value
}
