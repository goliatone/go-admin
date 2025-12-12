package dashboard

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strconv"

	godash "github.com/goliatone/go-dashboard/components/dashboard"
)

var errWidgetServiceUnavailable = errors.New("widget service not configured")

// ActivityRecorder captures widget lifecycle events for auditing/telemetry.
type ActivityRecorder interface {
	RecordWidgetEvent(ctx context.Context, action string, inst godash.WidgetInstance)
}

// CMSWidgetStore adapts the admin CMSWidgetService to go-dashboard's WidgetStore interface.
// It uses the underlying service for persistence and maps fields between the two models.
type CMSWidgetStore struct {
	svc      WidgetService
	activity ActivityRecorder
}

// NewCMSWidgetStore builds a widget store backed by the provided CMS widget service.
func NewCMSWidgetStore(svc WidgetService) *CMSWidgetStore {
	return NewCMSWidgetStoreWithActivity(svc, nil)
}

// NewCMSWidgetStoreWithActivity wires an optional activity recorder for widget events.
func NewCMSWidgetStoreWithActivity(svc WidgetService, recorder ActivityRecorder) *CMSWidgetStore {
	if svc == nil {
		return nil
	}
	return &CMSWidgetStore{svc: svc, activity: recorder}
}

// EnsureArea registers an area definition when missing.
func (s *CMSWidgetStore) EnsureArea(ctx context.Context, def godash.WidgetAreaDefinition) (bool, error) {
	if s == nil || s.svc == nil {
		return false, errWidgetServiceUnavailable
	}
	for _, area := range s.svc.Areas() {
		if area.Code == def.Code {
			return false, nil
		}
	}
	err := s.svc.RegisterAreaDefinition(ctx, WidgetAreaDefinition{
		Code:  def.Code,
		Name:  def.Name,
		Scope: "global",
	})
	return err == nil, err
}

// EnsureDefinition registers a widget definition when missing.
func (s *CMSWidgetStore) EnsureDefinition(ctx context.Context, def godash.WidgetDefinition) (bool, error) {
	if s == nil || s.svc == nil {
		return false, errWidgetServiceUnavailable
	}
	for _, existing := range s.svc.Definitions() {
		if existing.Code == def.Code {
			return false, nil
		}
	}
	err := s.svc.RegisterDefinition(ctx, WidgetDefinition{
		Code:   def.Code,
		Name:   def.Name,
		Schema: def.Schema,
	})
	return err == nil, err
}

// CreateInstance stores a widget instance.
func (s *CMSWidgetStore) CreateInstance(ctx context.Context, input godash.CreateWidgetInstanceInput) (godash.WidgetInstance, error) {
	if s == nil || s.svc == nil {
		return godash.WidgetInstance{}, errWidgetServiceUnavailable
	}
	instance := WidgetInstance{
		DefinitionCode: input.DefinitionID,
		Config:         cloneAnyMap(input.Configuration),
		Span:           spanFromMetadata(input.Metadata),
		Hidden:         hiddenFromMetadata(input.Metadata),
		Locale:         localeFromMetadata(input.Metadata),
	}
	created, err := s.svc.SaveInstance(ctx, instance)
	if err != nil || created == nil {
		return godash.WidgetInstance{}, err
	}
	out := toDashboardInstance(*created)
	s.record(ctx, "create", out)
	return out, nil
}

// GetInstance fetches a widget instance by ID.
func (s *CMSWidgetStore) GetInstance(ctx context.Context, instanceID string) (godash.WidgetInstance, error) {
	inst, err := s.loadInstance(ctx, instanceID)
	if err != nil {
		return godash.WidgetInstance{}, err
	}
	return toDashboardInstance(inst), nil
}

// UpdateInstance updates an existing widget instance.
func (s *CMSWidgetStore) UpdateInstance(ctx context.Context, input godash.UpdateWidgetInstanceInput) (godash.WidgetInstance, error) {
	if s == nil || s.svc == nil {
		return godash.WidgetInstance{}, errWidgetServiceUnavailable
	}
	current, err := s.loadInstance(ctx, input.InstanceID)
	if err != nil {
		return godash.WidgetInstance{}, err
	}
	if input.Configuration != nil {
		current.Config = cloneAnyMap(input.Configuration)
	}
	if input.Metadata != nil {
		current.Span = spanFromMetadata(input.Metadata)
		current.Hidden = hiddenFromMetadata(input.Metadata)
		if loc := localeFromMetadata(input.Metadata); loc != "" {
			current.Locale = loc
		}
	}
	updated, err := s.svc.SaveInstance(ctx, current)
	if err != nil || updated == nil {
		return godash.WidgetInstance{}, err
	}
	out := toDashboardInstance(*updated)
	s.record(ctx, "update", out)
	return out, nil
}

// DeleteInstance removes a widget instance.
func (s *CMSWidgetStore) DeleteInstance(ctx context.Context, instanceID string) error {
	if s == nil || s.svc == nil {
		return errWidgetServiceUnavailable
	}
	inst, _ := s.loadInstance(ctx, instanceID)
	if err := s.svc.DeleteInstance(ctx, instanceID); err != nil {
		return err
	}
	if inst.ID != "" {
		s.record(ctx, "delete", toDashboardInstance(inst))
	}
	return nil
}

// AssignInstance associates a widget with an area and optional position.
func (s *CMSWidgetStore) AssignInstance(ctx context.Context, input godash.AssignWidgetInput) error {
	if s == nil || s.svc == nil {
		return errWidgetServiceUnavailable
	}
	current, err := s.loadInstance(ctx, input.InstanceID)
	if err != nil {
		return err
	}
	current.Area = input.AreaCode
	if input.Position != nil {
		current.Position = *input.Position
	}
	updated, err := s.svc.SaveInstance(ctx, current)
	if err == nil && updated != nil {
		s.record(ctx, "assign", toDashboardInstance(*updated))
	}
	return err
}

// ReorderArea reassigns positions within an area.
func (s *CMSWidgetStore) ReorderArea(ctx context.Context, input godash.ReorderAreaInput) error {
	if s == nil || s.svc == nil {
		return errWidgetServiceUnavailable
	}
	instances, err := s.svc.ListInstances(ctx, WidgetInstanceFilter{Area: input.AreaCode})
	if err != nil {
		return err
	}
	byID := map[string]WidgetInstance{}
	for _, inst := range instances {
		byID[inst.ID] = inst
	}
	position := 0
	for _, id := range input.WidgetIDs {
		inst, ok := byID[id]
		if !ok {
			continue
		}
		inst.Position = position
		position++
		if _, err := s.svc.SaveInstance(ctx, inst); err != nil {
			return err
		}
	}
	s.record(ctx, "reorder", godash.WidgetInstance{AreaCode: input.AreaCode})
	return nil
}

// ResolveArea returns the widgets for an area.
func (s *CMSWidgetStore) ResolveArea(ctx context.Context, input godash.ResolveAreaInput) (godash.ResolvedArea, error) {
	if s == nil || s.svc == nil {
		return godash.ResolvedArea{}, errWidgetServiceUnavailable
	}
	instances, err := s.svc.ListInstances(ctx, WidgetInstanceFilter{
		Area:   input.AreaCode,
		Locale: input.Locale,
	})
	if err != nil {
		return godash.ResolvedArea{}, err
	}
	sort.Slice(instances, func(i, j int) bool {
		if instances[i].Position == instances[j].Position {
			return instances[i].ID < instances[j].ID
		}
		return instances[i].Position < instances[j].Position
	})
	out := godash.ResolvedArea{
		AreaCode: input.AreaCode,
		Widgets:  make([]godash.WidgetInstance, 0, len(instances)),
	}
	for _, inst := range instances {
		out.Widgets = append(out.Widgets, toDashboardInstance(inst))
	}
	return out, nil
}

func (s *CMSWidgetStore) loadInstance(ctx context.Context, id string) (WidgetInstance, error) {
	if s == nil || s.svc == nil {
		return WidgetInstance{}, errWidgetServiceUnavailable
	}
	instances, err := s.svc.ListInstances(ctx, WidgetInstanceFilter{})
	if err != nil {
		return WidgetInstance{}, err
	}
	for _, inst := range instances {
		if inst.ID == id {
			return inst, nil
		}
	}
	return WidgetInstance{}, errors.New("widget instance not found")
}

func toDashboardInstance(inst WidgetInstance) godash.WidgetInstance {
	return godash.WidgetInstance{
		ID:            inst.ID,
		DefinitionID:  inst.DefinitionCode,
		AreaCode:      inst.Area,
		Configuration: cloneAnyMap(inst.Config),
		Metadata: map[string]any{
			"layout": map[string]any{
				"width": inst.Span,
			},
			"hidden": inst.Hidden,
			"locale": inst.Locale,
			"order":  inst.Position,
		},
	}
}

func (s *CMSWidgetStore) record(ctx context.Context, action string, inst godash.WidgetInstance) {
	if s == nil || s.activity == nil {
		return
	}
	s.activity.RecordWidgetEvent(ctx, action, inst)
}

func spanFromMetadata(meta map[string]any) int {
	if meta == nil {
		return 0
	}
	if layout, ok := meta["layout"].(map[string]any); ok {
		if width, ok := layout["width"].(int); ok {
			return width
		}
		if widthStr := toString(layout["width"]); widthStr != "" {
			if parsed, err := strconv.Atoi(widthStr); err == nil {
				return parsed
			}
		}
	}
	if widthStr := toString(meta["width"]); widthStr != "" {
		if parsed, err := strconv.Atoi(widthStr); err == nil {
			return parsed
		}
	}
	return 0
}

func hiddenFromMetadata(meta map[string]any) bool {
	if meta == nil {
		return false
	}
	if hidden, ok := meta["hidden"].(bool); ok {
		return hidden
	}
	return false
}

func localeFromMetadata(meta map[string]any) string {
	if meta == nil {
		return ""
	}
	if locale, ok := meta["locale"].(string); ok {
		return locale
	}
	return ""
}

func toString(val any) string {
	switch v := val.(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		if v == 0 {
			return ""
		}
		return strconv.Itoa(int(v))
	default:
		return fmt.Sprintf("%v", v)
	}
}
