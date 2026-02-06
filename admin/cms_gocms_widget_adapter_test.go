package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

type stubGoCMSWidgetDefinition struct {
	ID          uuid.UUID
	Name        string
	Description *string
	Schema      map[string]any
}

type stubRegisterWidgetDefinitionInput struct {
	Name        string
	Description *string
	Schema      map[string]any
}

type stubGoCMSWidgetInstance struct {
	ID            uuid.UUID
	DefinitionID  uuid.UUID
	AreaCode      *string
	Configuration map[string]any
	Position      int
	Span          int
	Hidden        bool
}

type stubCreateWidgetInstanceInput struct {
	DefinitionID  uuid.UUID
	AreaCode      *string
	Position      int
	Span          int
	Hidden        bool
	Configuration map[string]any
	CreatedBy     uuid.UUID
	UpdatedBy     uuid.UUID
}

type stubGoCMSWidgetAreaDefinition struct {
	Code  string
	Name  string
	Scope string
}

type stubRegisterWidgetAreaDefinitionInput struct {
	Code  string
	Name  string
	Scope string
}

type stubDeleteWidgetInstanceRequest struct {
	InstanceID uuid.UUID
	DeletedBy  uuid.UUID
	HardDelete bool
}

type stubDeleteWidgetDefinitionRequest struct {
	ID         uuid.UUID
	HardDelete bool
}

type stubGoCMSWidgetService struct {
	defs                  map[string]*stubGoCMSWidgetDefinition
	instances             map[uuid.UUID]*stubGoCMSWidgetInstance
	areas                 map[string]*stubGoCMSWidgetAreaDefinition
	forceEmptyDefinitions bool
	forceEmptyListAll     bool
}

func newStubGoCMSWidgetService() *stubGoCMSWidgetService {
	return &stubGoCMSWidgetService{
		defs:      map[string]*stubGoCMSWidgetDefinition{},
		instances: map[uuid.UUID]*stubGoCMSWidgetInstance{},
		areas:     map[string]*stubGoCMSWidgetAreaDefinition{},
	}
}

func (s *stubGoCMSWidgetService) RegisterDefinition(_ context.Context, input stubRegisterWidgetDefinitionInput) (*stubGoCMSWidgetDefinition, error) {
	if input.Name == "" {
		return nil, errors.New("name required")
	}
	if len(input.Schema) == 0 {
		return nil, errors.New("schema required")
	}
	if _, ok := s.defs[input.Name]; ok {
		return nil, errors.New("definition exists")
	}
	def := &stubGoCMSWidgetDefinition{
		ID:          uuid.New(),
		Name:        input.Name,
		Description: input.Description,
		Schema:      input.Schema,
	}
	s.defs[input.Name] = def
	return def, nil
}

func (s *stubGoCMSWidgetService) ListDefinitions(_ context.Context) ([]*stubGoCMSWidgetDefinition, error) {
	if s.forceEmptyDefinitions {
		return []*stubGoCMSWidgetDefinition{}, nil
	}
	out := make([]*stubGoCMSWidgetDefinition, 0, len(s.defs))
	for _, d := range s.defs {
		out = append(out, d)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) GetDefinition(_ context.Context, id uuid.UUID) (*stubGoCMSWidgetDefinition, error) {
	for _, def := range s.defs {
		if def.ID == id {
			return def, nil
		}
	}
	return nil, errors.New("not found")
}

func (s *stubGoCMSWidgetService) DeleteDefinition(_ context.Context, req stubDeleteWidgetDefinitionRequest) error {
	for key, def := range s.defs {
		if def.ID == req.ID {
			delete(s.defs, key)
			return nil
		}
	}
	return errors.New("not found")
}

func (s *stubGoCMSWidgetService) RegisterAreaDefinition(_ context.Context, input stubRegisterWidgetAreaDefinitionInput) (*stubGoCMSWidgetAreaDefinition, error) {
	if input.Code == "" {
		return nil, errors.New("code required")
	}
	area := &stubGoCMSWidgetAreaDefinition{
		Code:  input.Code,
		Name:  input.Name,
		Scope: input.Scope,
	}
	s.areas[input.Code] = area
	return area, nil
}

func (s *stubGoCMSWidgetService) ListAreaDefinitions(_ context.Context) ([]*stubGoCMSWidgetAreaDefinition, error) {
	out := make([]*stubGoCMSWidgetAreaDefinition, 0, len(s.areas))
	for _, a := range s.areas {
		out = append(out, a)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) CreateInstance(_ context.Context, input stubCreateWidgetInstanceInput) (*stubGoCMSWidgetInstance, error) {
	if input.DefinitionID == uuid.Nil {
		return nil, errors.New("definition required")
	}
	inst := &stubGoCMSWidgetInstance{
		ID:            uuid.New(),
		DefinitionID:  input.DefinitionID,
		AreaCode:      input.AreaCode,
		Configuration: input.Configuration,
		Position:      input.Position,
		Span:          input.Span,
		Hidden:        input.Hidden,
	}
	s.instances[inst.ID] = inst
	return inst, nil
}

func (s *stubGoCMSWidgetService) UpdateInstance(_ context.Context, _ any) (*stubGoCMSWidgetInstance, error) {
	return nil, errors.New("not implemented")
}

func (s *stubGoCMSWidgetService) DeleteInstance(_ context.Context, req stubDeleteWidgetInstanceRequest) error {
	delete(s.instances, req.InstanceID)
	return nil
}

func (s *stubGoCMSWidgetService) ListAllInstances(_ context.Context) ([]*stubGoCMSWidgetInstance, error) {
	if s.forceEmptyListAll {
		return []*stubGoCMSWidgetInstance{}, nil
	}
	out := make([]*stubGoCMSWidgetInstance, 0, len(s.instances))
	for _, inst := range s.instances {
		out = append(out, inst)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) ListInstancesByDefinition(_ context.Context, definitionID uuid.UUID) ([]*stubGoCMSWidgetInstance, error) {
	out := make([]*stubGoCMSWidgetInstance, 0, len(s.instances))
	for _, inst := range s.instances {
		if inst.DefinitionID == definitionID {
			out = append(out, inst)
		}
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) ListInstancesByArea(_ context.Context, area string) ([]*stubGoCMSWidgetInstance, error) {
	out := []*stubGoCMSWidgetInstance{}
	for _, inst := range s.instances {
		if inst.AreaCode != nil && *inst.AreaCode == area {
			out = append(out, inst)
		}
	}
	return out, nil
}

func TestGoCMSWidgetAdapterRegistersDefinitionUsingCode(t *testing.T) {
	ctx := context.Background()
	svc := newStubGoCMSWidgetService()
	adapter := NewGoCMSWidgetAdapter(svc)

	code := "admin.widget.test"
	displayName := "Test Widget"

	if err := adapter.RegisterDefinition(ctx, WidgetDefinition{Code: code, Name: displayName}); err != nil {
		t.Fatalf("register definition: %v", err)
	}
	def, ok := svc.defs[code]
	if !ok {
		t.Fatalf("expected definition persisted under Name=%q", code)
	}
	if def.Description == nil || *def.Description != displayName {
		t.Fatalf("expected description=%q, got %#v", displayName, def.Description)
	}
	if len(def.Schema) == 0 {
		t.Fatalf("expected schema defaulted, got empty")
	}

	defs := adapter.Definitions()
	found := false
	for _, d := range defs {
		if d.Code == code {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected definition code %q in adapter.Definitions(), got %+v", code, defs)
	}

	inst, err := adapter.SaveInstance(ctx, WidgetInstance{DefinitionCode: code, Area: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("save instance: %v", err)
	}
	if inst == nil || inst.DefinitionCode != code {
		t.Fatalf("expected instance definition code %q, got %+v", code, inst)
	}

	instances, err := adapter.ListInstances(ctx, WidgetInstanceFilter{Area: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(instances) != 1 || instances[0].DefinitionCode != code {
		t.Fatalf("expected 1 instance with definition code %q, got %+v", code, instances)
	}
}

func TestGoCMSWidgetAdapterSaveInstanceRefreshesDefinitions(t *testing.T) {
	ctx := context.Background()
	svc := newStubGoCMSWidgetService()
	adapter := NewGoCMSWidgetAdapter(svc)

	code := "admin.widget.existing"
	svc.defs[code] = &stubGoCMSWidgetDefinition{
		ID:     uuid.New(),
		Name:   code,
		Schema: map[string]any{"fields": []any{}},
	}

	inst, err := adapter.SaveInstance(ctx, WidgetInstance{DefinitionCode: code, Area: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("save instance: %v", err)
	}
	if inst == nil || inst.DefinitionCode != code {
		t.Fatalf("expected instance definition code %q, got %+v", code, inst)
	}
}

func TestDashboardRegisterProviderSeedsDefaultInstanceWithGoCMSWidgetAdapter(t *testing.T) {
	ctx := context.Background()
	svc := newStubGoCMSWidgetService()
	widgetSvc := NewGoCMSWidgetAdapter(svc)

	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)

	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "admin.widget.seed_test",
		Name:        "Seed Test",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			return map[string]any{"ok": true}, nil
		},
	})

	if len(svc.defs) != 1 {
		t.Fatalf("expected 1 definition, got %d", len(svc.defs))
	}
	if _, ok := svc.defs["admin.widget.seed_test"]; !ok {
		t.Fatalf("expected definition stored under provider code")
	}
	if len(svc.instances) != 1 {
		t.Fatalf("expected 1 widget instance, got %d", len(svc.instances))
	}

	// Sanity: ensure adapter can read the instance back with correct code mapping.
	listed, err := widgetSvc.ListInstances(ctx, WidgetInstanceFilter{Area: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(listed) != 1 || listed[0].DefinitionCode != "admin.widget.seed_test" {
		t.Fatalf("expected seeded instance with definition code, got %+v", listed)
	}
}

func TestDashboardRegisterProviderSkipsSeedingWhenDefinitionHasExistingInstance(t *testing.T) {
	ctx := context.Background()
	svc := newStubGoCMSWidgetService()
	defID := uuid.New()
	svc.defs["admin.widget.seed_test"] = &stubGoCMSWidgetDefinition{
		ID:     defID,
		Name:   "admin.widget.seed_test",
		Schema: map[string]any{"fields": []any{}},
	}
	// Existing widget has no area assignment. Default-area filtering would miss this.
	svc.instances[uuid.New()] = &stubGoCMSWidgetInstance{
		ID:            uuid.New(),
		DefinitionID:  defID,
		AreaCode:      nil,
		Configuration: map[string]any{},
	}
	widgetSvc := NewGoCMSWidgetAdapter(svc)

	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)

	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "admin.widget.seed_test",
		Name:        "Seed Test",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			return map[string]any{"ok": true}, nil
		},
	})

	listed, err := widgetSvc.ListInstances(ctx, WidgetInstanceFilter{})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(listed) != 1 {
		t.Fatalf("expected no duplicate default instance, got %d instances: %+v", len(listed), listed)
	}
}

func TestGoCMSWidgetAdapterListInstancesResolvesDefinitionCodeByID(t *testing.T) {
	ctx := context.Background()
	svc := newStubGoCMSWidgetService()
	defID := uuid.New()
	svc.defs["admin.widget.lazy_resolve"] = &stubGoCMSWidgetDefinition{
		ID:     defID,
		Name:   "admin.widget.lazy_resolve",
		Schema: map[string]any{"fields": []any{}},
	}
	area := "admin.dashboard.main"
	instID := uuid.New()
	svc.instances[instID] = &stubGoCMSWidgetInstance{
		ID:            instID,
		DefinitionID:  defID,
		AreaCode:      &area,
		Configuration: map[string]any{},
	}
	// Simulate truncated ListDefinitions so ID->code lookup must use GetDefinition.
	svc.forceEmptyDefinitions = true
	adapter := NewGoCMSWidgetAdapter(svc)

	instances, err := adapter.ListInstances(ctx, WidgetInstanceFilter{Area: area})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(instances) != 1 {
		t.Fatalf("expected one instance, got %d", len(instances))
	}
	if instances[0].DefinitionCode != "admin.widget.lazy_resolve" {
		t.Fatalf("expected resolved definition code, got %q", instances[0].DefinitionCode)
	}
}
