package admin

import (
	"bytes"
	"context"
	"fmt"
	"net/http/httptest"
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
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
	preferenceStore := &dashboardPreferenceStore{prefs: prefs, store: widgetStore}

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
	reloadedStore := &dashboardPreferenceStore{prefs: reloadedPrefs, store: widgetStore}
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

type stubWidgetStore struct {
	instances map[string]dashcmp.WidgetInstance
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
