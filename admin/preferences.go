package admin

import (
	"context"
	"errors"
	"sort"
	"sync"
)

const (
	preferencesKeyTheme           = "theme"
	preferencesKeyThemeVariant    = "theme_variant"
	preferencesKeyDashboardLayout = "dashboard_layout"
	preferencesKeyDashboardPrefs  = "dashboard_overrides"
)

// PreferencesStore defines a minimal contract compatible with go-users preferences.
// Implementations can be backed by go-users models, databases, or in-memory maps.
type PreferencesStore interface {
	Get(ctx context.Context, userID string) (map[string]any, error)
	Save(ctx context.Context, userID string, prefs map[string]any) error
}

// InMemoryPreferencesStore keeps preferences per-user in memory.
type InMemoryPreferencesStore struct {
	mu     sync.RWMutex
	values map[string]map[string]any
}

// NewInMemoryPreferencesStore builds an empty in-memory preference store.
func NewInMemoryPreferencesStore() *InMemoryPreferencesStore {
	return &InMemoryPreferencesStore{
		values: map[string]map[string]any{},
	}
}

// Get returns a shallow copy of stored preferences for a user.
func (s *InMemoryPreferencesStore) Get(ctx context.Context, userID string) (map[string]any, error) {
	_ = ctx
	if s == nil || userID == "" {
		return map[string]any{}, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if prefs, ok := s.values[userID]; ok {
		return cloneAnyMap(prefs), nil
	}
	return map[string]any{}, nil
}

// Save stores preferences for a user.
func (s *InMemoryPreferencesStore) Save(ctx context.Context, userID string, prefs map[string]any) error {
	_ = ctx
	if s == nil {
		return errors.New("preferences store not configured")
	}
	if userID == "" {
		return errors.New("user id required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.values[userID] = cloneAnyMap(prefs)
	return nil
}

// UserPreferences captures persisted preferences along with derived defaults.
type UserPreferences struct {
	UserID          string                    `json:"user_id,omitempty"`
	Theme           string                    `json:"theme,omitempty"`
	ThemeVariant    string                    `json:"theme_variant,omitempty"`
	DashboardLayout []DashboardWidgetInstance `json:"dashboard_layout,omitempty"`
	DashboardPrefs  DashboardLayoutOverrides  `json:"dashboard_overrides,omitempty"`
	Raw             map[string]any            `json:"raw,omitempty"`
}

// DashboardLayoutOverrides persists go-dashboard layout adjustments.
type DashboardLayoutOverrides struct {
	Locale        string                          `json:"locale,omitempty"`
	AreaOrder     map[string][]string             `json:"area_order,omitempty"`
	AreaRows      map[string][]DashboardLayoutRow `json:"area_rows,omitempty"`
	HiddenWidgets map[string]bool                 `json:"hidden_widgets,omitempty"`
}

// DashboardLayoutRow captures widget slots on a single row.
type DashboardLayoutRow struct {
	Widgets []DashboardLayoutSlot `json:"widgets,omitempty"`
}

// DashboardLayoutSlot describes a widget placement and width.
type DashboardLayoutSlot struct {
	ID    string `json:"id,omitempty"`
	Width int    `json:"width,omitempty"`
}

// PreferencesService orchestrates access to the PreferencesStore and applies defaults.
type PreferencesService struct {
	store          PreferencesStore
	defaultTheme   string
	defaultVariant string
	activity       ActivitySink
}

// NewPreferencesService constructs a service with the provided store (or in-memory fallback).
func NewPreferencesService(store PreferencesStore) *PreferencesService {
	if store == nil {
		store = NewInMemoryPreferencesStore()
	}
	return &PreferencesService{
		store: store,
	}
}

// WithDefaults sets the default theme selection used when user preferences are empty.
func (s *PreferencesService) WithDefaults(theme, variant string) *PreferencesService {
	if s == nil {
		return s
	}
	s.defaultTheme = theme
	s.defaultVariant = variant
	return s
}

// WithActivitySink wires activity emission on preference updates.
func (s *PreferencesService) WithActivitySink(sink ActivitySink) {
	if s != nil && sink != nil {
		s.activity = sink
	}
}

// WithStore swaps the underlying preferences store.
func (s *PreferencesService) WithStore(store PreferencesStore) *PreferencesService {
	if s != nil && store != nil {
		s.store = store
	}
	return s
}

// Store returns the underlying preferences store (useful for adapters).
func (s *PreferencesService) Store() PreferencesStore {
	if s == nil {
		return nil
	}
	return s.store
}

// Get returns preferences for a user with defaults applied.
func (s *PreferencesService) Get(ctx context.Context, userID string) (UserPreferences, error) {
	if s == nil {
		return UserPreferences{}, errors.New("preferences service not configured")
	}
	if userID == "" {
		return s.applyDefaults(UserPreferences{Raw: map[string]any{}}), nil
	}
	raw, err := s.store.Get(ctx, userID)
	if err != nil {
		return UserPreferences{}, err
	}
	return s.applyDefaults(preferencesFromMap(userID, raw)), nil
}

// Save updates preferences for a user, merging with existing values.
func (s *PreferencesService) Save(ctx context.Context, userID string, prefs UserPreferences) (UserPreferences, error) {
	if s == nil {
		return UserPreferences{}, errors.New("preferences service not configured")
	}
	if userID == "" {
		return UserPreferences{}, ErrForbidden
	}
	update := preferencesToMap(prefs)
	if len(update) == 0 {
		return s.Get(ctx, userID)
	}
	current, err := s.store.Get(ctx, userID)
	if err != nil {
		return UserPreferences{}, err
	}
	merged := mergePreferenceMaps(current, update)
	if err := s.store.Save(ctx, userID, merged); err != nil {
		return UserPreferences{}, err
	}
	s.recordActivity(ctx, userID, update)
	return s.applyDefaults(preferencesFromMap(userID, merged)), nil
}

// SaveDashboardLayout stores dashboard layout preferences for a user.
func (s *PreferencesService) SaveDashboardLayout(ctx context.Context, userID string, layout []DashboardWidgetInstance) (UserPreferences, error) {
	if userID == "" {
		return UserPreferences{}, ErrForbidden
	}
	if len(layout) == 0 {
		return s.Get(ctx, userID)
	}
	return s.Save(ctx, userID, UserPreferences{
		UserID:          userID,
		DashboardLayout: cloneDashboardInstances(layout),
		Raw: map[string]any{
			preferencesKeyDashboardLayout: layout,
		},
	})
}

// SaveDashboardOverrides stores go-dashboard layout overrides for a user.
func (s *PreferencesService) SaveDashboardOverrides(ctx context.Context, userID string, overrides DashboardLayoutOverrides) (UserPreferences, error) {
	if userID == "" {
		return UserPreferences{}, ErrForbidden
	}
	normalized := normalizeDashboardOverrides(overrides)
	return s.Save(ctx, userID, UserPreferences{
		UserID:         userID,
		DashboardPrefs: normalized,
		Raw: map[string]any{
			preferencesKeyDashboardPrefs: flattenDashboardOverrides(normalized),
		},
	})
}

// DashboardLayout returns the stored dashboard layout, if any.
func (s *PreferencesService) DashboardLayout(ctx context.Context, userID string) []DashboardWidgetInstance {
	prefs, err := s.Get(ctx, userID)
	if err != nil {
		return nil
	}
	return cloneDashboardInstances(prefs.DashboardLayout)
}

// DashboardOverrides returns persisted go-dashboard layout overrides, if any.
func (s *PreferencesService) DashboardOverrides(ctx context.Context, userID string) DashboardLayoutOverrides {
	prefs, err := s.Get(ctx, userID)
	if err != nil {
		return normalizeDashboardOverrides(DashboardLayoutOverrides{})
	}
	return normalizeDashboardOverrides(prefs.DashboardPrefs)
}

// ThemeSelectorForUser builds a ThemeSelector using stored preferences when present.
func (s *PreferencesService) ThemeSelectorForUser(ctx context.Context, userID string) ThemeSelector {
	prefs, err := s.Get(ctx, userID)
	if err != nil {
		return ThemeSelector{}
	}
	return ThemeSelector{
		Name:    prefs.Theme,
		Variant: prefs.ThemeVariant,
	}
}

func (s *PreferencesService) applyDefaults(prefs UserPreferences) UserPreferences {
	if prefs.Raw == nil {
		prefs.Raw = map[string]any{}
	}
	if prefs.Theme == "" && s.defaultTheme != "" {
		prefs.Theme = s.defaultTheme
	}
	if prefs.ThemeVariant == "" && s.defaultVariant != "" {
		prefs.ThemeVariant = s.defaultVariant
	}
	return prefs
}

func (s *PreferencesService) recordActivity(ctx context.Context, userID string, updates map[string]any) {
	if s == nil || s.activity == nil || len(updates) == 0 {
		return
	}
	keys := make([]string, 0, len(updates))
	for key := range updates {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	actor := userIDFromContext(ctx)
	if actor == "" {
		actor = userID
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:  actor,
		Action: "preferences.update",
		Object: "preferences:" + userID,
		Metadata: map[string]any{
			"user_id": userID,
			"keys":    keys,
		},
	})
}

func preferencesFromMap(userID string, raw map[string]any) UserPreferences {
	prefs := UserPreferences{
		UserID: userID,
		Raw:    cloneAnyMap(raw),
	}
	if theme, ok := raw[preferencesKeyTheme]; ok {
		prefs.Theme = toString(theme)
	}
	if variant, ok := raw[preferencesKeyThemeVariant]; ok {
		prefs.ThemeVariant = toString(variant)
	}
	if layout, ok := raw[preferencesKeyDashboardLayout]; ok {
		prefs.DashboardLayout = expandDashboardLayout(layout)
	}
	if overrides, ok := raw[preferencesKeyDashboardPrefs]; ok {
		prefs.DashboardPrefs = expandDashboardOverrides(overrides)
	}
	return prefs
}

func preferencesToMap(prefs UserPreferences) map[string]any {
	update := map[string]any{}
	for k, v := range prefs.Raw {
		update[k] = v
	}
	if val, ok := prefs.Raw[preferencesKeyTheme]; ok || prefs.Theme != "" {
		if ok {
			update[preferencesKeyTheme] = toString(val)
		} else {
			update[preferencesKeyTheme] = prefs.Theme
		}
	}
	if val, ok := prefs.Raw[preferencesKeyThemeVariant]; ok || prefs.ThemeVariant != "" {
		if ok {
			update[preferencesKeyThemeVariant] = toString(val)
		} else {
			update[preferencesKeyThemeVariant] = prefs.ThemeVariant
		}
	}
	if layout, ok := prefs.Raw[preferencesKeyDashboardLayout]; ok {
		update[preferencesKeyDashboardLayout] = flattenDashboardLayout(expandDashboardLayout(layout))
	} else if len(prefs.DashboardLayout) > 0 {
		update[preferencesKeyDashboardLayout] = flattenDashboardLayout(prefs.DashboardLayout)
	}
	if val, ok := prefs.Raw[preferencesKeyDashboardPrefs]; ok || !dashboardOverridesEmpty(prefs.DashboardPrefs) {
		if ok {
			update[preferencesKeyDashboardPrefs] = val
		} else {
			update[preferencesKeyDashboardPrefs] = flattenDashboardOverrides(prefs.DashboardPrefs)
		}
	}
	return update
}

func mergePreferenceMaps(base map[string]any, override map[string]any) map[string]any {
	if len(base) == 0 && len(override) == 0 {
		return map[string]any{}
	}
	merged := map[string]any{}
	for k, v := range base {
		merged[k] = v
	}
	for k, v := range override {
		merged[k] = v
	}
	return merged
}

func flattenDashboardLayout(layout []DashboardWidgetInstance) []map[string]any {
	out := []map[string]any{}
	for _, inst := range layout {
		out = append(out, map[string]any{
			"id":         inst.ID,
			"definition": inst.DefinitionCode,
			"area":       inst.AreaCode,
			"config":     cloneAnyMap(inst.Config),
			"position":   inst.Position,
			"span":       inst.Span,
			"hidden":     inst.Hidden,
			"locale":     inst.Locale,
		})
	}
	return out
}

func expandDashboardLayout(input any) []DashboardWidgetInstance {
	out := []DashboardWidgetInstance{}
	switch typed := input.(type) {
	case []DashboardWidgetInstance:
		return cloneDashboardInstances(typed)
	case []map[string]any:
		for _, obj := range typed {
			out = append(out, DashboardWidgetInstance{
				ID:             toString(obj["id"]),
				DefinitionCode: toString(obj["definition"]),
				AreaCode:       toString(obj["area"]),
				Config:         cloneAnyMap(extractMap(obj["config"])),
				Position:       atoiDefault(toString(obj["position"]), 0),
				Span:           atoiDefault(toString(obj["span"]), 0),
				Hidden:         toBool(obj["hidden"]),
				Locale:         toString(obj["locale"]),
			})
		}
	case []any:
		for _, raw := range typed {
			obj, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			out = append(out, DashboardWidgetInstance{
				ID:             toString(obj["id"]),
				DefinitionCode: toString(obj["definition"]),
				AreaCode:       toString(obj["area"]),
				Config:         cloneAnyMap(extractMap(obj["config"])),
				Position:       atoiDefault(toString(obj["position"]), 0),
				Span:           atoiDefault(toString(obj["span"]), 0),
				Hidden:         toBool(obj["hidden"]),
				Locale:         toString(obj["locale"]),
			})
		}
	default:
		return nil
	}
	return out
}

func dashboardOverridesEmpty(overrides DashboardLayoutOverrides) bool {
	return overrides.Locale == "" && len(overrides.AreaOrder) == 0 && len(overrides.AreaRows) == 0 && len(overrides.HiddenWidgets) == 0
}

func normalizeDashboardOverrides(overrides DashboardLayoutOverrides) DashboardLayoutOverrides {
	if overrides.AreaOrder == nil {
		overrides.AreaOrder = map[string][]string{}
	}
	if overrides.AreaRows == nil {
		overrides.AreaRows = map[string][]DashboardLayoutRow{}
	}
	if overrides.HiddenWidgets == nil {
		overrides.HiddenWidgets = map[string]bool{}
	}
	return overrides
}

func flattenDashboardOverrides(overrides DashboardLayoutOverrides) map[string]any {
	overrides = normalizeDashboardOverrides(overrides)
	out := map[string]any{}
	if overrides.Locale != "" {
		out["locale"] = overrides.Locale
	}
	if len(overrides.AreaOrder) > 0 {
		out["area_order"] = overrides.AreaOrder
	}
	if len(overrides.AreaRows) > 0 {
		rows := map[string]any{}
		for area, areaRows := range overrides.AreaRows {
			serialized := []map[string]any{}
			for _, row := range areaRows {
				if len(row.Widgets) == 0 {
					continue
				}
				widgets := []map[string]any{}
				for _, slot := range row.Widgets {
					if slot.ID == "" {
						continue
					}
					widget := map[string]any{"id": slot.ID}
					if slot.Width > 0 {
						widget["width"] = slot.Width
					}
					widgets = append(widgets, widget)
				}
				if len(widgets) > 0 {
					serialized = append(serialized, map[string]any{"widgets": widgets})
				}
			}
			if len(serialized) > 0 {
				rows[area] = serialized
			}
		}
		if len(rows) > 0 {
			out["area_rows"] = rows
		}
	}
	hidden := []string{}
	for id, isHidden := range overrides.HiddenWidgets {
		if isHidden {
			hidden = append(hidden, id)
		}
	}
	sort.Strings(hidden)
	if len(hidden) > 0 {
		out["hidden_widget_ids"] = hidden
	}
	return out
}

func expandDashboardOverrides(input any) DashboardLayoutOverrides {
	overrides := normalizeDashboardOverrides(DashboardLayoutOverrides{})
	raw, ok := input.(map[string]any)
	if !ok {
		return overrides
	}
	if locale, ok := raw["locale"]; ok {
		overrides.Locale = toString(locale)
	}
	if order, ok := raw["area_order"].(map[string]any); ok {
		for area, seq := range order {
			overrides.AreaOrder[area] = toStringSlice(seq)
		}
	}
	rowsValue, ok := raw["area_rows"]
	if !ok {
		rowsValue = raw["layout_rows"]
	}
	if rows, ok := rowsValue.(map[string]any); ok {
		for area, val := range rows {
			expanded := expandDashboardLayoutRows(val)
			if len(expanded) > 0 {
				overrides.AreaRows[area] = expanded
			}
		}
	}
	if hidden, ok := raw["hidden_widget_ids"]; ok {
		for _, id := range toStringSlice(hidden) {
			if id != "" {
				overrides.HiddenWidgets[id] = true
			}
		}
	}
	if hiddenMap, ok := raw["hidden_widgets"].(map[string]any); ok {
		for id, val := range hiddenMap {
			if toBool(val) {
				overrides.HiddenWidgets[id] = true
			}
		}
	}
	return overrides
}

func expandDashboardLayoutRows(val any) []DashboardLayoutRow {
	rows := []DashboardLayoutRow{}
	switch typed := val.(type) {
	case []any:
		for _, rowVal := range typed {
			rowMap, ok := rowVal.(map[string]any)
			if !ok {
				continue
			}
			row := expandDashboardLayoutRow(rowMap)
			if len(row.Widgets) > 0 {
				rows = append(rows, row)
			}
		}
	case []map[string]any:
		for _, rowMap := range typed {
			row := expandDashboardLayoutRow(rowMap)
			if len(row.Widgets) > 0 {
				rows = append(rows, row)
			}
		}
	}
	return rows
}

func expandDashboardLayoutRow(rowMap map[string]any) DashboardLayoutRow {
	row := DashboardLayoutRow{}
	rawWidgets, ok := rowMap["widgets"]
	if !ok {
		return row
	}
	switch widgets := rawWidgets.(type) {
	case []any:
		for _, w := range widgets {
			if wMap, ok := w.(map[string]any); ok {
				row.Widgets = append(row.Widgets, DashboardLayoutSlot{
					ID:    toString(wMap["id"]),
					Width: atoiDefault(toString(wMap["width"]), 0),
				})
			}
		}
	case []map[string]any:
		for _, wMap := range widgets {
			row.Widgets = append(row.Widgets, DashboardLayoutSlot{
				ID:    toString(wMap["id"]),
				Width: atoiDefault(toString(wMap["width"]), 0),
			})
		}
	}
	filtered := []DashboardLayoutSlot{}
	for _, slot := range row.Widgets {
		if slot.ID == "" {
			continue
		}
		filtered = append(filtered, slot)
	}
	row.Widgets = filtered
	return row
}

// NewDashboardPreferencesAdapter bridges PreferencesService into the DashboardPreferences contract.
// When the service is nil, it falls back to in-memory preferences.
func NewDashboardPreferencesAdapter(service *PreferencesService) DashboardPreferences {
	if service == nil {
		return NewInMemoryDashboardPreferences()
	}
	return &dashboardPreferenceAdapter{service: service}
}

type dashboardPreferenceAdapter struct {
	service *PreferencesService
}

func (p *dashboardPreferenceAdapter) ForUser(userID string) []DashboardWidgetInstance {
	return p.ForUserWithContext(context.Background(), userID)
}

func (p *dashboardPreferenceAdapter) ForUserWithContext(ctx context.Context, userID string) []DashboardWidgetInstance {
	if p == nil || p.service == nil || userID == "" {
		return nil
	}
	return p.service.DashboardLayout(ctx, userID)
}

func (p *dashboardPreferenceAdapter) Save(userID string, layout []DashboardWidgetInstance) error {
	return p.SaveWithContext(context.Background(), userID, layout)
}

func (p *dashboardPreferenceAdapter) SaveWithContext(ctx context.Context, userID string, layout []DashboardWidgetInstance) error {
	if p == nil || p.service == nil {
		return nil
	}
	_, err := p.service.SaveDashboardLayout(ctx, userID, layout)
	return err
}
