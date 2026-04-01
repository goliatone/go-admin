package dashboard

import (
	"context"
	"errors"
	"fmt"
	"testing"

	godash "github.com/goliatone/go-dashboard/components/dashboard"
)

type preferenceBackendStub struct {
	overrides   map[string]StoredLayoutOverrides
	layouts     map[string][]DashboardWidgetInstance
	layoutErr   error
	overrideErr error
}

func newPreferenceBackendStub() *preferenceBackendStub {
	return &preferenceBackendStub{
		overrides: map[string]StoredLayoutOverrides{},
		layouts:   map[string][]DashboardWidgetInstance{},
	}
}

func (b *preferenceBackendStub) LoadDashboardLayoutOverrides(_ context.Context, userID string) StoredLayoutOverrides {
	return normalizeStoredLayoutOverrides(b.overrides[userID])
}

func (b *preferenceBackendStub) SaveDashboardLayoutOverrides(_ context.Context, userID string, overrides StoredLayoutOverrides) error {
	if b.overrideErr != nil {
		return b.overrideErr
	}
	b.overrides[userID] = normalizeStoredLayoutOverrides(overrides)
	return nil
}

func (b *preferenceBackendStub) SaveDashboardLayout(_ context.Context, userID string, layout []DashboardWidgetInstance) error {
	if b.layoutErr != nil {
		return b.layoutErr
	}
	b.layouts[userID] = CloneDashboardInstances(layout)
	return nil
}

type preferenceWidgetStoreStub struct {
	instances map[string]godash.WidgetInstance
}

func newPreferenceWidgetStoreStub(instances map[string]godash.WidgetInstance) *preferenceWidgetStoreStub {
	if instances == nil {
		instances = map[string]godash.WidgetInstance{}
	}
	return &preferenceWidgetStoreStub{instances: instances}
}

func (s *preferenceWidgetStoreStub) EnsureArea(context.Context, godash.WidgetAreaDefinition) (bool, error) {
	return false, nil
}

func (s *preferenceWidgetStoreStub) EnsureDefinition(context.Context, godash.WidgetDefinition) (bool, error) {
	return false, nil
}

func (s *preferenceWidgetStoreStub) CreateInstance(_ context.Context, input godash.CreateWidgetInstanceInput) (godash.WidgetInstance, error) {
	inst := godash.WidgetInstance{ID: input.DefinitionID, DefinitionID: input.DefinitionID, Configuration: input.Configuration}
	s.instances[inst.ID] = inst
	return inst, nil
}

func (s *preferenceWidgetStoreStub) GetInstance(_ context.Context, id string) (godash.WidgetInstance, error) {
	if inst, ok := s.instances[id]; ok {
		return inst, nil
	}
	return godash.WidgetInstance{}, fmt.Errorf("not found")
}

func (s *preferenceWidgetStoreStub) DeleteInstance(context.Context, string) error { return nil }

func (s *preferenceWidgetStoreStub) AssignInstance(context.Context, godash.AssignWidgetInput) error {
	return nil
}

func (s *preferenceWidgetStoreStub) UpdateInstance(_ context.Context, input godash.UpdateWidgetInstanceInput) (godash.WidgetInstance, error) {
	inst := godash.WidgetInstance{ID: input.InstanceID, DefinitionID: input.InstanceID, Configuration: input.Configuration}
	s.instances[input.InstanceID] = inst
	return inst, nil
}

func (s *preferenceWidgetStoreStub) ReorderArea(context.Context, godash.ReorderAreaInput) error {
	return nil
}

func (s *preferenceWidgetStoreStub) ResolveArea(context.Context, godash.ResolveAreaInput) (godash.ResolvedArea, error) {
	return godash.ResolvedArea{}, nil
}

func TestGoDashPreferenceStoreRoundTripsOverridesAndDerivedLayout(t *testing.T) {
	ctx := context.Background()
	backend := newPreferenceBackendStub()
	store := newPreferenceWidgetStoreStub(map[string]godash.WidgetInstance{
		"w1": {ID: "w1", DefinitionID: "admin.widget.stats", Configuration: map[string]any{"color": "blue"}},
		"w2": {ID: "w2", DefinitionID: "admin.widget.activity", Configuration: map[string]any{"limit": 5}},
	})
	preferenceStore := NewGoDashPreferenceStore(backend, store)

	overrides := godash.LayoutOverrides{
		Locale:    "en",
		AreaOrder: map[string][]string{"admin.dashboard.main": {"w1", "w2"}},
		AreaRows: map[string][]godash.LayoutRow{
			"admin.dashboard.main": {
				{Widgets: []godash.WidgetSlot{{ID: "w1", Width: 8}, {ID: "w2", Width: 4}}},
			},
		},
		HiddenWidgets: map[string]bool{"w2": true},
	}
	viewer := godash.ViewerContext{UserID: "user-1", Locale: "en"}
	if err := preferenceStore.SaveLayoutOverrides(ctx, viewer, overrides); err != nil {
		t.Fatalf("save layout overrides: %v", err)
	}

	reloaded, err := preferenceStore.LayoutOverrides(ctx, viewer)
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

	layout := backend.layouts[viewer.UserID]
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

func TestGoDashPreferenceStoreReturnsDerivedLayoutPersistenceError(t *testing.T) {
	ctx := context.Background()
	expectedErr := errors.New("layout persistence failed")
	backend := newPreferenceBackendStub()
	backend.layoutErr = expectedErr
	store := newPreferenceWidgetStoreStub(map[string]godash.WidgetInstance{
		"w1": {ID: "w1", DefinitionID: "admin.widget.stats", Configuration: map[string]any{"color": "blue"}},
	})
	preferenceStore := NewGoDashPreferenceStore(backend, store)

	overrides := godash.LayoutOverrides{
		Locale:    "en",
		AreaOrder: map[string][]string{"admin.dashboard.main": {"w1"}},
		AreaRows: map[string][]godash.LayoutRow{
			"admin.dashboard.main": {
				{Widgets: []godash.WidgetSlot{{ID: "w1", Width: 12}}},
			},
		},
	}
	viewer := godash.ViewerContext{UserID: "user-1", Locale: "en"}
	if err := preferenceStore.SaveLayoutOverrides(ctx, viewer, overrides); !errors.Is(err, expectedErr) {
		t.Fatalf("expected layout persistence error %v, got %v", expectedErr, err)
	}

	stored := backend.overrides[viewer.UserID]
	if len(stored.AreaRows["admin.dashboard.main"]) != 1 {
		t.Fatalf("expected overrides to persist before layout save failed, got %+v", stored.AreaRows)
	}
	if layout := backend.layouts[viewer.UserID]; len(layout) != 0 {
		t.Fatalf("expected derived layout persistence to fail, got %+v", layout)
	}
}
