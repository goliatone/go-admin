package dashboard

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strconv"
	"testing"

	godash "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestCMSWidgetStoreCRUD(t *testing.T) {
	ctx := context.Background()
	svc := newInMemoryWidgetService()
	recorder := &stubActivityRecorder{}
	store := NewCMSWidgetStoreWithActivity(svc, recorder)

	created, err := store.CreateInstance(ctx, godash.CreateWidgetInstanceInput{
		DefinitionID: "stat",
		Configuration: map[string]any{
			"title": "Test",
		},
		Metadata: map[string]any{
			"layout": map[string]any{"width": 6},
		},
	})
	if err != nil {
		t.Fatalf("create instance: %v", err)
	}
	if created.ID == "" {
		t.Fatalf("expected instance id")
	}

	if err := store.AssignInstance(ctx, godash.AssignWidgetInput{AreaCode: "admin.dashboard.main", InstanceID: created.ID, Position: primitives.Int(1)}); err != nil {
		t.Fatalf("assign instance: %v", err)
	}
	if len(recorder.events) == 0 {
		t.Fatalf("expected activity recorded on assign")
	}

	got, err := store.GetInstance(ctx, created.ID)
	if err != nil {
		t.Fatalf("get instance: %v", err)
	}
	if got.AreaCode != "admin.dashboard.main" {
		t.Fatalf("expected area set, got %s", got.AreaCode)
	}

	resolved, err := store.ResolveArea(ctx, godash.ResolveAreaInput{AreaCode: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("resolve area: %v", err)
	}
	if len(resolved.Widgets) != 1 {
		t.Fatalf("expected 1 widget, got %d", len(resolved.Widgets))
	}
	if resolved.Widgets[0].Metadata["layout"].(map[string]any)["width"] != 6 {
		t.Fatalf("expected width metadata propagated")
	}

	updated, err := store.UpdateInstance(ctx, godash.UpdateWidgetInstanceInput{
		InstanceID: created.ID,
		Configuration: map[string]any{
			"title": "Updated",
		},
		Metadata: map[string]any{"layout": map[string]any{"width": 12}},
	})
	if err != nil {
		t.Fatalf("update instance: %v", err)
	}
	if updated.Configuration["title"] != "Updated" {
		t.Fatalf("expected updated config")
	}

	if err := store.DeleteInstance(ctx, created.ID); err != nil {
		t.Fatalf("delete instance: %v", err)
	}
	if recorder.events[len(recorder.events)-1].action != "delete" {
		t.Fatalf("expected delete activity")
	}
}

func TestCMSWidgetStoreEnsure(t *testing.T) {
	ctx := context.Background()
	svc := newInMemoryWidgetService()
	store := NewCMSWidgetStore(svc)

	created, err := store.EnsureArea(ctx, godash.WidgetAreaDefinition{Code: "admin.dashboard.sidebar", Name: "Sidebar"})
	if err != nil {
		t.Fatalf("ensure area: %v", err)
	}
	if !created {
		t.Fatalf("expected area creation")
	}

	defCreated, err := store.EnsureDefinition(ctx, godash.WidgetDefinition{Code: "admin.widget.test", Name: "Test"})
	if err != nil {
		t.Fatalf("ensure definition: %v", err)
	}
	if !defCreated {
		t.Fatalf("expected definition creation")
	}
}

func TestCMSWidgetStoreMissingService(t *testing.T) {
	store := NewCMSWidgetStore(nil)
	if store != nil {
		t.Fatalf("expected nil store when service missing")
	}
	var zero CMSWidgetStore
	if _, err := zero.CreateInstance(context.Background(), godash.CreateWidgetInstanceInput{}); err == nil {
		t.Fatalf("expected error when widget service missing")
	}
}

type inMemoryWidgetService struct {
	defs     map[string]WidgetDefinition
	areas    map[string]WidgetAreaDefinition
	instList []WidgetInstance
	nextID   int
}

func newInMemoryWidgetService() *inMemoryWidgetService {
	return &inMemoryWidgetService{
		defs:   map[string]WidgetDefinition{},
		areas:  map[string]WidgetAreaDefinition{},
		nextID: 1,
	}
}

func (s *inMemoryWidgetService) RegisterAreaDefinition(_ context.Context, def WidgetAreaDefinition) error {
	s.areas[def.Code] = def
	return nil
}

func (s *inMemoryWidgetService) RegisterDefinition(_ context.Context, def WidgetDefinition) error {
	s.defs[def.Code] = def
	return nil
}

func (s *inMemoryWidgetService) DeleteDefinition(_ context.Context, code string) error {
	delete(s.defs, code)
	return nil
}

func (s *inMemoryWidgetService) Areas() []WidgetAreaDefinition {
	out := []WidgetAreaDefinition{}
	for _, def := range s.areas {
		out = append(out, def)
	}
	return out
}

func (s *inMemoryWidgetService) Definitions() []WidgetDefinition {
	out := []WidgetDefinition{}
	for _, def := range s.defs {
		out = append(out, def)
	}
	return out
}

func (s *inMemoryWidgetService) SaveInstance(_ context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	if instance.ID == "" {
		instance.ID = strconv.Itoa(s.nextID)
		s.nextID++
		s.instList = append(s.instList, instance)
		return &instance, nil
	}
	for i, inst := range s.instList {
		if inst.ID == instance.ID {
			s.instList[i] = instance
			return &instance, nil
		}
	}
	s.instList = append(s.instList, instance)
	return &instance, nil
}

func (s *inMemoryWidgetService) DeleteInstance(_ context.Context, id string) error {
	filtered := []WidgetInstance{}
	for _, inst := range s.instList {
		if inst.ID != id {
			filtered = append(filtered, inst)
		}
	}
	s.instList = filtered
	return nil
}

func (s *inMemoryWidgetService) ListInstances(_ context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	out := []WidgetInstance{}
	for _, inst := range s.instList {
		if filter.Area != "" && inst.Area != filter.Area {
			continue
		}
		out = append(out, inst)
	}
	return out, nil
}

type stubActivityRecorder struct {
	events []recordedEvent
}

type recordedEvent struct {
	action string
	inst   godash.WidgetInstance
}

func (r *stubActivityRecorder) RecordWidgetEvent(_ context.Context, action string, inst godash.WidgetInstance) {
	r.events = append(r.events, recordedEvent{action: action, inst: inst})
}
