package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
	"sync"

	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

// goCMSWidgetService captures the public go-cms widget operations this adapter needs.
type goCMSWidgetService interface {
	RegisterDefinition(ctx context.Context, input cmswidgets.RegisterDefinitionInput) (*cmswidgets.Definition, error)
	GetDefinition(ctx context.Context, id uuid.UUID) (*cmswidgets.Definition, error)
	ListDefinitions(ctx context.Context) ([]*cmswidgets.Definition, error)
	DeleteDefinition(ctx context.Context, req cmswidgets.DeleteDefinitionRequest) error

	CreateInstance(ctx context.Context, input cmswidgets.CreateInstanceInput) (*cmswidgets.Instance, error)
	UpdateInstance(ctx context.Context, input cmswidgets.UpdateInstanceInput) (*cmswidgets.Instance, error)
	ListInstancesByDefinition(ctx context.Context, definitionID uuid.UUID) ([]*cmswidgets.Instance, error)
	ListInstancesByArea(ctx context.Context, areaCode string) ([]*cmswidgets.Instance, error)
	ListAllInstances(ctx context.Context) ([]*cmswidgets.Instance, error)
	DeleteInstance(ctx context.Context, req cmswidgets.DeleteInstanceRequest) error

	RegisterAreaDefinition(ctx context.Context, input cmswidgets.RegisterAreaDefinitionInput) (*cmswidgets.AreaDefinition, error)
	ListAreaDefinitions(ctx context.Context) ([]*cmswidgets.AreaDefinition, error)
	AssignWidgetToArea(ctx context.Context, input cmswidgets.AssignWidgetToAreaInput) ([]*cmswidgets.AreaPlacement, error)
	ResolveArea(ctx context.Context, input cmswidgets.ResolveAreaInput) ([]*cmswidgets.ResolvedWidget, error)
}

// GoCMSWidgetAdapter maps go-cms widgets.Service into CMSWidgetService.
type GoCMSWidgetAdapter struct {
	service     goCMSWidgetService
	definitions map[string]uuid.UUID
	idToCode    map[uuid.UUID]string
	locales     *goCMSLocaleIDCache
	mu          sync.RWMutex
}

// NewGoCMSWidgetAdapter wraps a go-cms widgets.Service (or compatible typed service).
func NewGoCMSWidgetAdapter(service any) *GoCMSWidgetAdapter {
	return newGoCMSWidgetAdapter(service, nil)
}

func newGoCMSWidgetAdapter(service any, localeResolver goCMSLocaleResolver) *GoCMSWidgetAdapter {
	if service == nil {
		return nil
	}
	svc, ok := service.(goCMSWidgetService)
	if !ok || svc == nil {
		return nil
	}
	return &GoCMSWidgetAdapter{
		service:     svc,
		definitions: map[string]uuid.UUID{},
		idToCode:    map[uuid.UUID]string{},
		locales:     newGoCMSLocaleIDCache(localeResolver),
	}
}

func minimalWidgetSchema() map[string]any {
	return map[string]any{"fields": []any{}}
}

func widgetCallContext(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}
	return ctx
}

func (a *GoCMSWidgetAdapter) resolveLocaleID(ctx context.Context, localeCode string) (uuid.UUID, bool) {
	if a == nil || a.locales == nil {
		return uuid.Nil, false
	}
	return a.locales.Resolve(widgetCallContext(ctx), localeCode)
}

func normalizeWidgetDefinition(def WidgetDefinition) (code string, displayName string, schema map[string]any) {
	code = strings.TrimSpace(def.Code)
	if code == "" {
		code = strings.TrimSpace(def.Name)
	}
	displayName = strings.TrimSpace(def.Name)
	if displayName == "" {
		displayName = code
	}
	schema = def.Schema
	if len(schema) == 0 {
		schema = minimalWidgetSchema()
	}
	return code, displayName, schema
}

func (a *GoCMSWidgetAdapter) setDefinitionCache(code string, id uuid.UUID) {
	if a == nil {
		return
	}
	code = strings.TrimSpace(code)
	if code == "" || id == uuid.Nil {
		return
	}
	a.mu.Lock()
	a.definitions[code] = id
	a.idToCode[id] = code
	a.mu.Unlock()
}

func (a *GoCMSWidgetAdapter) definitionID(code string) (uuid.UUID, bool) {
	if a == nil {
		return uuid.Nil, false
	}
	a.mu.RLock()
	id, ok := a.definitions[code]
	a.mu.RUnlock()
	return id, ok
}

func (a *GoCMSWidgetAdapter) definitionCode(id uuid.UUID) (string, bool) {
	if a == nil {
		return "", false
	}
	a.mu.RLock()
	code, ok := a.idToCode[id]
	a.mu.RUnlock()
	return code, ok
}

func (a *GoCMSWidgetAdapter) definitionCacheSize() int {
	if a == nil {
		return 0
	}
	a.mu.RLock()
	size := len(a.definitions)
	a.mu.RUnlock()
	return size
}

func (a *GoCMSWidgetAdapter) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	scope := cmswidgets.AreaScope(strings.TrimSpace(def.Scope))
	if scope == "" {
		scope = cmswidgets.AreaScopeGlobal
	}
	_, err := a.service.RegisterAreaDefinition(ctx, cmswidgets.RegisterAreaDefinitionInput{
		Code:  strings.TrimSpace(def.Code),
		Name:  primitives.FirstNonEmptyRaw(strings.TrimSpace(def.Name), strings.TrimSpace(def.Code)),
		Scope: scope,
	})
	return err
}

func (a *GoCMSWidgetAdapter) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	code, displayName, schema := normalizeWidgetDefinition(def)
	if code == "" {
		return requiredFieldDomainError("widget definition code", map[string]any{
			"component": "widget_adapter",
		})
	}
	name := displayName
	created, err := a.service.RegisterDefinition(ctx, cmswidgets.RegisterDefinitionInput{
		Name:        code,
		Description: &name,
		Schema:      primitives.CloneAnyMap(schema),
	})
	if err != nil {
		return err
	}
	if created != nil {
		a.setDefinitionCache(code, created.ID)
	}
	return nil
}

func (a *GoCMSWidgetAdapter) DeleteDefinition(ctx context.Context, code string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	code = strings.TrimSpace(code)
	a.refreshDefinitions(ctx)
	id, ok := a.definitionID(code)
	if !ok {
		return ErrNotFound
	}
	return a.service.DeleteDefinition(ctx, cmswidgets.DeleteDefinitionRequest{ID: id, HardDelete: true})
}

func (a *GoCMSWidgetAdapter) Areas() []WidgetAreaDefinition {
	if a == nil || a.service == nil {
		return nil
	}
	areas, err := a.service.ListAreaDefinitions(context.Background())
	if err != nil {
		return nil
	}
	out := make([]WidgetAreaDefinition, 0, len(areas))
	for _, area := range areas {
		if area == nil {
			continue
		}
		out = append(out, WidgetAreaDefinition{
			Code:  strings.TrimSpace(area.Code),
			Name:  strings.TrimSpace(area.Name),
			Scope: strings.TrimSpace(string(area.Scope)),
		})
	}
	return out
}

func (a *GoCMSWidgetAdapter) Definitions() []WidgetDefinition {
	if a == nil || a.service == nil {
		return nil
	}
	defs, err := a.service.ListDefinitions(context.Background())
	if err != nil {
		return nil
	}
	out := make([]WidgetDefinition, 0, len(defs))
	for _, def := range defs {
		if def == nil {
			continue
		}
		code := strings.TrimSpace(def.Name)
		if code != "" {
			a.setDefinitionCache(code, def.ID)
		}
		out = append(out, WidgetDefinition{
			Code:   code,
			Name:   code,
			Schema: primitives.CloneAnyMap(def.Schema),
		})
	}
	return out
}

func (a *GoCMSWidgetAdapter) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	if a == nil || a.service == nil {
		return nil, serviceNotConfiguredDomainError("cms widget adapter service", map[string]any{
			"component": "widget_adapter",
		})
	}
	ctx = widgetCallContext(ctx)
	defCode := strings.TrimSpace(instance.DefinitionCode)
	a.refreshDefinitions(ctx)
	defID, ok := a.definitionID(defCode)
	if !ok {
		return nil, notFoundDomainError("widget definition not found", map[string]any{
			"component":       "widget_adapter",
			"definition_code": defCode,
			"cache_size":      a.definitionCacheSize(),
		})
	}
	if strings.TrimSpace(instance.Area) != "" {
		_ = a.RegisterAreaDefinition(ctx, WidgetAreaDefinition{Code: instance.Area, Name: instance.Area, Scope: "global"})
	}
	var updated *WidgetInstance
	var err error
	if strings.TrimSpace(instance.ID) == "" {
		updated, err = a.createInstance(ctx, defID, instance)
	} else {
		updated, err = a.updateInstance(ctx, instance)
	}
	if err != nil {
		return nil, err
	}
	if updated != nil {
		updated.Area = primitives.FirstNonEmptyRaw(instance.Area, updated.Area)
		updated.PageID = primitives.FirstNonEmptyRaw(instance.PageID, updated.PageID)
		updated.Locale = primitives.FirstNonEmptyRaw(instance.Locale, updated.Locale)
		if err := a.assignWidgetPlacement(ctx, updated, instance); err != nil {
			return nil, err
		}
	}
	return updated, nil
}

func (a *GoCMSWidgetAdapter) createInstance(ctx context.Context, defID uuid.UUID, instance WidgetInstance) (*WidgetInstance, error) {
	if defID == uuid.Nil {
		return nil, requiredFieldDomainError("definition id", map[string]any{
			"component":       "widget_adapter",
			"operation":       "create_instance",
			"definition_code": strings.TrimSpace(instance.DefinitionCode),
		})
	}
	ctx = widgetCallContext(ctx)
	input := cmswidgets.CreateInstanceInput{
		DefinitionID:  defID,
		Configuration: primitives.CloneAnyMap(instance.Config),
		Placement:     widgetPlacementMetadata(instance),
		CreatedBy:     actorUUID(ctx),
		UpdatedBy:     actorUUID(ctx),
	}
	if area := strings.TrimSpace(instance.Area); area != "" {
		input.AreaCode = &area
	}
	if instance.Position > 0 {
		input.Position = instance.Position
	}
	created, err := a.service.CreateInstance(ctx, input)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, serviceUnavailableDomainError("widget instance not returned", map[string]any{
			"component": "widget_adapter",
			"operation": "create_instance",
		})
	}
	converted := convertGoCMSWidgetInstance(created)
	converted.DefinitionCode = strings.TrimSpace(instance.DefinitionCode)
	return &converted, nil
}

func (a *GoCMSWidgetAdapter) updateInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	ctx = widgetCallContext(ctx)
	uid, err := uuid.Parse(strings.TrimSpace(instance.ID))
	if err != nil {
		return nil, err
	}
	input := cmswidgets.UpdateInstanceInput{
		InstanceID:    uid,
		Configuration: primitives.CloneAnyMap(instance.Config),
		Placement:     widgetPlacementMetadata(instance),
		UpdatedBy:     actorUUID(ctx),
	}
	if instance.Position > 0 {
		input.Position = &instance.Position
	}
	if area := strings.TrimSpace(instance.Area); area != "" {
		input.AreaCode = &area
	}
	updated, err := a.service.UpdateInstance(ctx, input)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, serviceUnavailableDomainError("widget instance not returned", map[string]any{
			"component": "widget_adapter",
			"operation": "update_instance",
		})
	}
	converted := convertGoCMSWidgetInstance(updated)
	converted.DefinitionCode = strings.TrimSpace(instance.DefinitionCode)
	return &converted, nil
}

func (a *GoCMSWidgetAdapter) DeleteInstance(ctx context.Context, id string) error {
	if a == nil || a.service == nil {
		return ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	uid, err := uuid.Parse(strings.TrimSpace(id))
	if err != nil {
		return err
	}
	return a.service.DeleteInstance(ctx, cmswidgets.DeleteInstanceRequest{
		InstanceID: uid,
		DeletedBy:  actorUUID(ctx),
		HardDelete: true,
	})
}

func (a *GoCMSWidgetAdapter) ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	if a == nil || a.service == nil {
		return nil, ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	a.refreshDefinitions(ctx)
	if resolved, err := a.resolveAreaInstances(ctx, filter); err == nil && resolved != nil {
		return filterWidgetInstances(resolved, filter), nil
	} else if err != nil && err != ErrNotFound {
		return nil, err
	}

	var (
		instances []*cmswidgets.Instance
		err       error
	)
	if strings.TrimSpace(filter.Area) != "" {
		instances, err = a.service.ListInstancesByArea(ctx, filter.Area)
	} else {
		instances, err = a.service.ListAllInstances(ctx)
	}
	if err != nil {
		return nil, err
	}

	out := make([]WidgetInstance, 0, len(instances))
	for _, item := range instances {
		inst := convertGoCMSWidgetInstance(item)
		if item != nil {
			if code, ok := a.definitionCode(item.DefinitionID); ok {
				inst.DefinitionCode = code
			} else if code, err := a.resolveDefinitionCodeByID(ctx, item.DefinitionID); err == nil && strings.TrimSpace(code) != "" {
				inst.DefinitionCode = code
			}
		}
		out = append(out, inst)
	}
	return filterWidgetInstances(out, filter), nil
}

// HasInstanceForDefinition reports whether at least one instance exists for the given definition code.
func (a *GoCMSWidgetAdapter) HasInstanceForDefinition(ctx context.Context, definitionCode string, filter WidgetInstanceFilter) (bool, error) {
	if a == nil || a.service == nil {
		return false, ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	code := strings.TrimSpace(definitionCode)
	if code == "" {
		return false, nil
	}
	a.refreshDefinitions(ctx)
	if defID, ok := a.definitionID(code); ok && defID != uuid.Nil {
		if exists, err := a.hasInstanceByDefinitionID(ctx, defID, filter); err == nil {
			return exists, nil
		} else if err != ErrNotFound {
			return false, err
		}
	}
	instances, err := a.ListInstances(ctx, filter)
	if err != nil {
		return false, err
	}
	for _, inst := range instances {
		if strings.EqualFold(strings.TrimSpace(inst.DefinitionCode), code) {
			return true, nil
		}
	}
	return false, nil
}

func (a *GoCMSWidgetAdapter) refreshDefinitions(ctx context.Context) {
	if a == nil || a.service == nil {
		return
	}
	ctx = widgetCallContext(ctx)
	defs, err := a.service.ListDefinitions(ctx)
	if err != nil {
		return
	}
	for _, def := range defs {
		if def == nil {
			continue
		}
		code := strings.TrimSpace(def.Name)
		if code == "" || def.ID == uuid.Nil {
			continue
		}
		a.setDefinitionCache(code, def.ID)
	}
}

func (a *GoCMSWidgetAdapter) resolveAreaInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	if a == nil || a.service == nil || strings.TrimSpace(filter.Area) == "" {
		return nil, ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	input := cmswidgets.ResolveAreaInput{AreaCode: strings.TrimSpace(filter.Area)}
	if localeID, ok := a.resolveLocaleID(ctx, filter.Locale); ok {
		input.LocaleID = &localeID
	} else if strings.TrimSpace(filter.Locale) != "" {
		return []WidgetInstance{}, nil
	}
	resolved, err := a.service.ResolveArea(ctx, input)
	if err != nil {
		if errors.Is(err, cmswidgets.ErrFeatureDisabled) || errors.Is(err, cmswidgets.ErrAreaFeatureDisabled) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	out := make([]WidgetInstance, 0, len(resolved))
	for _, entry := range resolved {
		inst := convertGoCMSResolvedWidget(entry)
		if entry != nil && entry.Instance != nil {
			if code, ok := a.definitionCode(entry.Instance.DefinitionID); ok {
				inst.DefinitionCode = code
			} else if code, err := a.resolveDefinitionCodeByID(ctx, entry.Instance.DefinitionID); err == nil && strings.TrimSpace(code) != "" {
				inst.DefinitionCode = code
			}
		}
		out = append(out, inst)
	}
	return out, nil
}

func (a *GoCMSWidgetAdapter) hasInstanceByDefinitionID(ctx context.Context, definitionID uuid.UUID, filter WidgetInstanceFilter) (bool, error) {
	if a == nil || a.service == nil || definitionID == uuid.Nil {
		return false, ErrNotFound
	}
	ctx = widgetCallContext(ctx)
	instances, err := a.service.ListInstancesByDefinition(ctx, definitionID)
	if err != nil {
		return false, err
	}
	for _, item := range instances {
		inst := convertGoCMSWidgetInstance(item)
		if filter.Area != "" && inst.Area != filter.Area {
			continue
		}
		if filter.PageID != "" && inst.PageID != filter.PageID {
			continue
		}
		if filter.Locale != "" && inst.Locale != "" && !strings.EqualFold(inst.Locale, filter.Locale) {
			continue
		}
		return true, nil
	}
	return false, nil
}

func (a *GoCMSWidgetAdapter) resolveDefinitionCodeByID(ctx context.Context, definitionID uuid.UUID) (string, error) {
	if a == nil || a.service == nil || definitionID == uuid.Nil {
		return "", ErrNotFound
	}
	if code, ok := a.definitionCode(definitionID); ok {
		return code, nil
	}
	ctx = widgetCallContext(ctx)
	def, err := a.service.GetDefinition(ctx, definitionID)
	if err != nil {
		return "", err
	}
	if def == nil {
		return "", ErrNotFound
	}
	code := strings.TrimSpace(def.Name)
	if code == "" {
		return "", ErrNotFound
	}
	a.setDefinitionCache(code, definitionID)
	return code, nil
}

func filterWidgetInstances(instances []WidgetInstance, filter WidgetInstanceFilter) []WidgetInstance {
	if len(instances) == 0 {
		return instances
	}
	pageID := strings.TrimSpace(filter.PageID)
	locale := strings.TrimSpace(filter.Locale)
	if pageID == "" && locale == "" {
		return instances
	}
	out := make([]WidgetInstance, 0, len(instances))
	for _, inst := range instances {
		if pageID != "" && inst.PageID != pageID {
			continue
		}
		if locale != "" && inst.Locale != "" && !strings.EqualFold(inst.Locale, locale) {
			continue
		}
		out = append(out, inst)
	}
	return out
}

func (a *GoCMSWidgetAdapter) assignWidgetPlacement(ctx context.Context, updated *WidgetInstance, source WidgetInstance) error {
	if a == nil || a.service == nil || updated == nil {
		return nil
	}
	area := strings.TrimSpace(source.Area)
	if area == "" {
		return nil
	}
	uid, err := uuid.Parse(strings.TrimSpace(updated.ID))
	if err != nil {
		return err
	}
	input := cmswidgets.AssignWidgetToAreaInput{
		AreaCode:   area,
		InstanceID: uid,
	}
	if source.Position > 0 {
		input.Position = &source.Position
	}
	if localeID, ok := a.resolveLocaleID(ctx, source.Locale); ok {
		input.LocaleID = &localeID
	}
	if meta := widgetPlacementMetadata(source); len(meta) > 0 {
		input.Metadata = meta
	}
	placements, err := a.service.AssignWidgetToArea(widgetCallContext(ctx), input)
	if err != nil {
		if errors.Is(err, cmswidgets.ErrAreaPlacementExists) {
			return nil
		}
		return err
	}
	if pos := goCMSPlacementPositionForInstance(placements, uid); pos >= 0 {
		updated.Position = pos
	}
	return nil
}

func widgetPlacementMetadata(instance WidgetInstance) map[string]any {
	meta := map[string]any{}
	if pageID := strings.TrimSpace(instance.PageID); pageID != "" {
		meta["page_id"] = pageID
	}
	if locale := strings.TrimSpace(instance.Locale); locale != "" {
		meta["locale"] = locale
	}
	if len(meta) == 0 {
		return nil
	}
	return meta
}

func convertGoCMSWidgetInstance(val *cmswidgets.Instance) WidgetInstance {
	if val == nil {
		return WidgetInstance{}
	}
	inst := WidgetInstance{
		ID:             val.ID.String(),
		DefinitionCode: val.DefinitionID.String(),
		Config:         primitives.CloneAnyMap(val.Configuration),
		Position:       val.Position,
	}
	if val.AreaCode != nil {
		inst.Area = strings.TrimSpace(*val.AreaCode)
	}
	if val.Placement != nil {
		if pageID, ok := val.Placement["page_id"].(string); ok {
			inst.PageID = pageID
		}
		if locale, ok := val.Placement["locale"].(string); ok {
			inst.Locale = locale
		}
	}
	return inst
}

func convertGoCMSResolvedWidget(entry *cmswidgets.ResolvedWidget) WidgetInstance {
	if entry == nil {
		return WidgetInstance{}
	}
	inst := convertGoCMSWidgetInstance(entry.Instance)
	if entry.Placement != nil {
		inst.Area = primitives.FirstNonEmptyRaw(entry.Placement.AreaCode, inst.Area)
		inst.Position = entry.Placement.Position
		if entry.Placement.Metadata != nil {
			if inst.PageID == "" {
				if pageID, ok := entry.Placement.Metadata["page_id"].(string); ok {
					inst.PageID = pageID
				}
			}
			if inst.Locale == "" {
				if locale, ok := entry.Placement.Metadata["locale"].(string); ok {
					inst.Locale = locale
				}
			}
		}
	}
	return inst
}

func goCMSPlacementPositionForInstance(placements []*cmswidgets.AreaPlacement, instanceID uuid.UUID) int {
	for _, placement := range placements {
		if placement == nil {
			continue
		}
		if placement.InstanceID == instanceID {
			return placement.Position
		}
	}
	return -1
}

func actorUUID(ctx context.Context) uuid.UUID {
	if parsed, err := uuid.Parse(strings.TrimSpace(actorFromContext(ctx))); err == nil {
		return parsed
	}
	return uuid.New()
}
