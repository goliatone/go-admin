package admin

import (
	"context"
	"errors"
	"testing"

	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

type stubGoCMSWidgetService struct {
	defs                  map[string]*cmswidgets.Definition
	instances             map[uuid.UUID]*cmswidgets.Instance
	areas                 map[string]*cmswidgets.AreaDefinition
	placementsByArea      map[string]map[uuid.UUID]*cmswidgets.AreaPlacement
	forceEmptyDefinitions bool
	forceEmptyListAll     bool
}

func newStubGoCMSWidgetService() *stubGoCMSWidgetService {
	return &stubGoCMSWidgetService{
		defs:             map[string]*cmswidgets.Definition{},
		instances:        map[uuid.UUID]*cmswidgets.Instance{},
		areas:            map[string]*cmswidgets.AreaDefinition{},
		placementsByArea: map[string]map[uuid.UUID]*cmswidgets.AreaPlacement{},
	}
}

func (s *stubGoCMSWidgetService) RegisterDefinition(_ context.Context, input cmswidgets.RegisterDefinitionInput) (*cmswidgets.Definition, error) {
	if input.Name == "" {
		return nil, errors.New("name required")
	}
	if len(input.Schema) == 0 {
		return nil, errors.New("schema required")
	}
	if _, ok := s.defs[input.Name]; ok {
		return nil, errors.New("definition exists")
	}
	def := &cmswidgets.Definition{
		ID:          uuid.New(),
		Name:        input.Name,
		Description: input.Description,
		Schema:      cloneAnyMap(input.Schema),
	}
	s.defs[input.Name] = def
	return def, nil
}

func (s *stubGoCMSWidgetService) GetDefinition(_ context.Context, id uuid.UUID) (*cmswidgets.Definition, error) {
	for _, def := range s.defs {
		if def.ID == id {
			return def, nil
		}
	}
	return nil, errors.New("not found")
}

func (s *stubGoCMSWidgetService) ListDefinitions(_ context.Context) ([]*cmswidgets.Definition, error) {
	if s.forceEmptyDefinitions {
		return []*cmswidgets.Definition{}, nil
	}
	out := make([]*cmswidgets.Definition, 0, len(s.defs))
	for _, d := range s.defs {
		out = append(out, d)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) DeleteDefinition(_ context.Context, req cmswidgets.DeleteDefinitionRequest) error {
	for key, def := range s.defs {
		if def.ID == req.ID {
			delete(s.defs, key)
			return nil
		}
	}
	return errors.New("not found")
}

func (s *stubGoCMSWidgetService) CreateInstance(_ context.Context, input cmswidgets.CreateInstanceInput) (*cmswidgets.Instance, error) {
	if input.DefinitionID == uuid.Nil {
		return nil, errors.New("definition required")
	}
	inst := &cmswidgets.Instance{
		ID:            uuid.New(),
		DefinitionID:  input.DefinitionID,
		AreaCode:      input.AreaCode,
		Placement:     cloneAnyMap(input.Placement),
		Configuration: cloneAnyMap(input.Configuration),
		Position:      input.Position,
	}
	s.instances[inst.ID] = inst
	return inst, nil
}

func (s *stubGoCMSWidgetService) UpdateInstance(_ context.Context, _ cmswidgets.UpdateInstanceInput) (*cmswidgets.Instance, error) {
	return nil, errors.New("not implemented")
}

func (s *stubGoCMSWidgetService) ListInstancesByDefinition(_ context.Context, definitionID uuid.UUID) ([]*cmswidgets.Instance, error) {
	out := make([]*cmswidgets.Instance, 0, len(s.instances))
	for _, inst := range s.instances {
		if inst.DefinitionID == definitionID {
			out = append(out, inst)
		}
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) ListInstancesByArea(_ context.Context, areaCode string) ([]*cmswidgets.Instance, error) {
	out := make([]*cmswidgets.Instance, 0, len(s.instances))
	for _, inst := range s.instances {
		if inst.AreaCode != nil && *inst.AreaCode == areaCode {
			out = append(out, inst)
		}
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) ListAllInstances(_ context.Context) ([]*cmswidgets.Instance, error) {
	if s.forceEmptyListAll {
		return []*cmswidgets.Instance{}, nil
	}
	out := make([]*cmswidgets.Instance, 0, len(s.instances))
	for _, inst := range s.instances {
		out = append(out, inst)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) DeleteInstance(_ context.Context, req cmswidgets.DeleteInstanceRequest) error {
	delete(s.instances, req.InstanceID)
	for area, placements := range s.placementsByArea {
		delete(placements, req.InstanceID)
		if len(placements) == 0 {
			delete(s.placementsByArea, area)
		}
	}
	return nil
}

func (s *stubGoCMSWidgetService) RegisterAreaDefinition(_ context.Context, input cmswidgets.RegisterAreaDefinitionInput) (*cmswidgets.AreaDefinition, error) {
	if input.Code == "" {
		return nil, errors.New("code required")
	}
	area := &cmswidgets.AreaDefinition{
		ID:    uuid.New(),
		Code:  input.Code,
		Name:  input.Name,
		Scope: input.Scope,
	}
	s.areas[input.Code] = area
	return area, nil
}

func (s *stubGoCMSWidgetService) ListAreaDefinitions(_ context.Context) ([]*cmswidgets.AreaDefinition, error) {
	out := make([]*cmswidgets.AreaDefinition, 0, len(s.areas))
	for _, area := range s.areas {
		out = append(out, area)
	}
	return out, nil
}

func (s *stubGoCMSWidgetService) AssignWidgetToArea(_ context.Context, input cmswidgets.AssignWidgetToAreaInput) ([]*cmswidgets.AreaPlacement, error) {
	inst, ok := s.instances[input.InstanceID]
	if !ok {
		return nil, errors.New("instance not found")
	}
	if _, ok := s.placementsByArea[input.AreaCode]; !ok {
		s.placementsByArea[input.AreaCode] = map[uuid.UUID]*cmswidgets.AreaPlacement{}
	}
	if _, exists := s.placementsByArea[input.AreaCode][input.InstanceID]; exists {
		return nil, cmswidgets.ErrAreaPlacementExists
	}
	position := len(s.placementsByArea[input.AreaCode])
	if input.Position != nil {
		position = *input.Position
	}
	placement := &cmswidgets.AreaPlacement{
		ID:         uuid.New(),
		AreaCode:   input.AreaCode,
		LocaleID:   input.LocaleID,
		InstanceID: input.InstanceID,
		Position:   position,
		Metadata:   cloneAnyMap(input.Metadata),
	}
	s.placementsByArea[input.AreaCode][input.InstanceID] = placement
	areaCode := input.AreaCode
	inst.AreaCode = &areaCode
	inst.Position = position
	return []*cmswidgets.AreaPlacement{placement}, nil
}

func (s *stubGoCMSWidgetService) ResolveArea(_ context.Context, input cmswidgets.ResolveAreaInput) ([]*cmswidgets.ResolvedWidget, error) {
	placements := s.placementsByArea[input.AreaCode]
	if len(placements) == 0 {
		return []*cmswidgets.ResolvedWidget{}, nil
	}
	out := make([]*cmswidgets.ResolvedWidget, 0, len(placements))
	for instanceID, placement := range placements {
		inst, ok := s.instances[instanceID]
		if !ok {
			continue
		}
		out = append(out, &cmswidgets.ResolvedWidget{Instance: inst, Placement: placement})
	}
	return out, nil
}

func TestNewGoCMSWidgetAdapterRejectsIncompatibleService(t *testing.T) {
	if adapter := NewGoCMSWidgetAdapter(struct{}{}); adapter != nil {
		t.Fatalf("expected nil adapter for incompatible service")
	}
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
	svc.defs[code] = &cmswidgets.Definition{
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
	svc.defs["admin.widget.seed_test"] = &cmswidgets.Definition{
		ID:     defID,
		Name:   "admin.widget.seed_test",
		Schema: map[string]any{"fields": []any{}},
	}
	svc.instances[uuid.New()] = &cmswidgets.Instance{
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
	svc.defs["admin.widget.lazy_resolve"] = &cmswidgets.Definition{
		ID:     defID,
		Name:   "admin.widget.lazy_resolve",
		Schema: map[string]any{"fields": []any{}},
	}
	area := "admin.dashboard.main"
	instID := uuid.New()
	svc.instances[instID] = &cmswidgets.Instance{
		ID:            instID,
		DefinitionID:  defID,
		AreaCode:      &area,
		Configuration: map[string]any{},
	}
	svc.placementsByArea[area] = map[uuid.UUID]*cmswidgets.AreaPlacement{
		instID: {
			ID:         uuid.New(),
			AreaCode:   area,
			InstanceID: instID,
			Position:   0,
		},
	}
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

func TestGoCMSWidgetAdapterSaveInstanceWithNilContext(t *testing.T) {
	svc := newStubGoCMSWidgetService()
	adapter := NewGoCMSWidgetAdapter(svc)

	code := "admin.widget.nil_ctx"
	if err := adapter.RegisterDefinition(nil, WidgetDefinition{Code: code, Name: "Nil Context"}); err != nil {
		t.Fatalf("register definition: %v", err)
	}

	inst, err := adapter.SaveInstance(nil, WidgetInstance{DefinitionCode: code, Area: "admin.dashboard.main"})
	if err != nil {
		t.Fatalf("save instance with nil context: %v", err)
	}
	if inst == nil || inst.DefinitionCode != code {
		t.Fatalf("expected instance definition code %q, got %+v", code, inst)
	}
}
