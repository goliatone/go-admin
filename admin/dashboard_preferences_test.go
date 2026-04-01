package admin

import (
	"bytes"
	"context"
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

func TestDashboardHTMLRouteUsesUpstreamControllerPayload(t *testing.T) {
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

	payload, ok := renderer.lastData.(map[string]any)
	if !ok {
		t.Fatalf("expected upstream controller render payload map, got %T", renderer.lastData)
	}
	if payload["base_path"] != "/admin" {
		t.Fatalf("expected base_path propagated through decorator, got %#v", payload["base_path"])
	}
	if _, ok := payload["layout_json"].(string); !ok {
		t.Fatalf("expected layout_json on render payload, got %#v", payload["layout_json"])
	}
	areas := orderedDashboardAreasPayload(payload["areas"])
	if len(areas) == 0 {
		t.Fatalf("expected ordered dashboard areas in render payload, got %+v", payload["areas"])
	}
	if _, ok := payload["theme"].(map[string]map[string]string); !ok {
		t.Fatalf("expected admin theme payload in render payload, got %T", payload["theme"])
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
	lastData     any
}

func (r *captureDashboardRenderer) Render(name string, data any, out ...io.Writer) (string, error) {
	r.lastTemplate = name
	r.lastData = data
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
