package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
)

const (
	preferencesKeyTheme           = "theme"
	preferencesKeyThemeVariant    = "theme_variant"
	preferencesKeyDashboardLayout = "dashboard_layout"
	preferencesKeyDashboardPrefs  = "dashboard_overrides"
)

// PreferenceLevel represents the scope level for resolved preferences.
type PreferenceLevel string

const (
	PreferenceLevelSystem PreferenceLevel = "system"
	PreferenceLevelTenant PreferenceLevel = "tenant"
	PreferenceLevelOrg    PreferenceLevel = "org"
	PreferenceLevelUser   PreferenceLevel = "user"
)

// PreferenceScope captures scope identifiers used during resolution.
type PreferenceScope struct {
	UserID   string `json:"user_id,omitempty"`
	TenantID string `json:"tenant_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
}

// PreferencesResolveInput configures preference resolution.
type PreferencesResolveInput struct {
	Scope          PreferenceScope
	Keys           []string
	Levels         []PreferenceLevel
	Base           map[string]any
	IncludeTraces  bool
	IncludeVersion bool
}

// PreferenceTraceLayer records a resolved value at a specific level.
type PreferenceTraceLayer struct {
	Level   PreferenceLevel `json:"level"`
	Scope   PreferenceScope `json:"scope"`
	Found   bool            `json:"found"`
	Value   any             `json:"value,omitempty"`
	Version int             `json:"version,omitempty"`
}

// PreferenceTrace records provenance for a single key.
type PreferenceTrace struct {
	Key    string                `json:"key"`
	Layers []PreferenceTraceLayer `json:"layers"`
}

// PreferenceSnapshot returns effective values plus optional metadata.
type PreferenceSnapshot struct {
	Effective map[string]any
	Traces    []PreferenceTrace
	Versions  map[string]int
}

// PreferencesUpsertInput represents a scoped preference update.
type PreferencesUpsertInput struct {
	Scope  PreferenceScope
	Level  PreferenceLevel
	Values map[string]any
}

// PreferencesDeleteInput represents a scoped preference delete.
type PreferencesDeleteInput struct {
	Scope PreferenceScope
	Level PreferenceLevel
	Keys  []string
}

// PreferencesStore defines the resolver-based preference contract.
type PreferencesStore interface {
	Resolve(ctx context.Context, input PreferencesResolveInput) (PreferenceSnapshot, error)
	Upsert(ctx context.Context, input PreferencesUpsertInput) (PreferenceSnapshot, error)
	Delete(ctx context.Context, input PreferencesDeleteInput) error
}

// InMemoryPreferencesStore keeps preferences per-scope in memory.
type InMemoryPreferencesStore struct {
	mu      sync.RWMutex
	system  map[string]preferenceRecord
	tenants map[string]map[string]preferenceRecord
	orgs    map[string]map[string]preferenceRecord
	users   map[string]map[string]preferenceRecord
}

type preferenceRecord struct {
	Value   any
	Version int
}

// NewInMemoryPreferencesStore builds an empty in-memory preference store.
func NewInMemoryPreferencesStore() *InMemoryPreferencesStore {
	return &InMemoryPreferencesStore{
		system:  map[string]preferenceRecord{},
		tenants: map[string]map[string]preferenceRecord{},
		orgs:    map[string]map[string]preferenceRecord{},
		users:   map[string]map[string]preferenceRecord{},
	}
}

// Resolve returns stored preferences across scopes.
func (s *InMemoryPreferencesStore) Resolve(ctx context.Context, input PreferencesResolveInput) (PreferenceSnapshot, error) {
	_ = ctx
	if s == nil {
		return PreferenceSnapshot{}, errors.New("preferences store not configured")
	}
	levelOrder := resolvePreferenceLevels(input.Levels)
	base := cloneAnyMap(input.Base)
	if base == nil {
		base = map[string]any{}
	}
	requestedKeys := normalizePreferenceKeys(input.Keys)
	sort.Strings(requestedKeys)
	scope := input.Scope

	s.mu.RLock()
	system := clonePreferenceRecords(s.system)
	tenant := clonePreferenceRecords(s.tenants[scope.TenantID])
	org := clonePreferenceRecords(s.orgs[scope.OrgID])
	user := clonePreferenceRecords(s.users[scope.UserID])
	s.mu.RUnlock()

	levelRecords := map[PreferenceLevel]map[string]preferenceRecord{
		PreferenceLevelSystem: system,
		PreferenceLevelTenant: tenant,
		PreferenceLevelOrg:    org,
		PreferenceLevelUser:   user,
	}

	effective := cloneAnyMap(base)
	versionLookup := map[string]int{}
	for _, level := range levelOrder {
		records := levelRecords[level]
		if len(records) == 0 {
			continue
		}
		for key, record := range records {
			if strings.TrimSpace(key) == "" {
				continue
			}
			effective[key] = clonePreferenceValue(record.Value)
			if input.IncludeVersion {
				versionLookup[key] = record.Version
			}
		}
	}
	if len(requestedKeys) > 0 {
		effective = filterPreferenceKeys(effective, requestedKeys)
	}
	if effective == nil {
		effective = map[string]any{}
	}

	var versions map[string]int
	if input.IncludeVersion {
		versions = map[string]int{}
		for key := range effective {
			if version, ok := versionLookup[key]; ok {
				versions[key] = version
			} else {
				versions[key] = 0
			}
		}
	}

	var traces []PreferenceTrace
	if input.IncludeTraces {
		traceKeys := requestedKeys
		if len(traceKeys) == 0 {
			traceKeys = collectPreferenceKeys(base, system, tenant, org, user)
		}
		traces = buildPreferenceTraces(traceKeys, levelOrder, levelRecords, scope)
	}

	return PreferenceSnapshot{
		Effective: effective,
		Traces:    traces,
		Versions:  versions,
	}, nil
}

// Upsert stores preferences for a scoped level.
func (s *InMemoryPreferencesStore) Upsert(ctx context.Context, input PreferencesUpsertInput) (PreferenceSnapshot, error) {
	_ = ctx
	if s == nil {
		return PreferenceSnapshot{}, errors.New("preferences store not configured")
	}
	level := normalizePreferenceLevel(input.Level)
	scope := input.Scope
	if err := validatePreferenceScope(level, scope); err != nil {
		return PreferenceSnapshot{}, err
	}
	values := input.Values
	if len(values) == 0 {
		return PreferenceSnapshot{Effective: map[string]any{}}, nil
	}

	s.mu.Lock()
	target := s.recordsForWrite(level, scope)
	for key, val := range values {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		record := target[key]
		if record.Version <= 0 {
			record.Version = 1
		} else {
			record.Version++
		}
		record.Value = clonePreferenceValue(val)
		target[key] = record
	}
	snapshot := PreferenceSnapshot{Effective: flattenPreferenceRecords(target)}
	s.mu.Unlock()

	return snapshot, nil
}

// Delete removes stored preferences for a scoped level.
func (s *InMemoryPreferencesStore) Delete(ctx context.Context, input PreferencesDeleteInput) error {
	_ = ctx
	if s == nil {
		return errors.New("preferences store not configured")
	}
	level := normalizePreferenceLevel(input.Level)
	scope := input.Scope
	if err := validatePreferenceScope(level, scope); err != nil {
		return err
	}
	keys := normalizePreferenceKeys(input.Keys)
	if len(keys) == 0 {
		return nil
	}
	s.mu.Lock()
	target := s.recordsForWrite(level, scope)
	for _, key := range keys {
		delete(target, key)
	}
	s.mu.Unlock()
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

// Resolve returns an effective snapshot for the provided scope and options.
func (s *PreferencesService) Resolve(ctx context.Context, input PreferencesResolveInput) (PreferenceSnapshot, error) {
	if s == nil {
		return PreferenceSnapshot{}, errors.New("preferences service not configured")
	}
	if s.store == nil {
		return PreferenceSnapshot{}, errors.New("preferences store not configured")
	}
	input.Scope = mergePreferenceScope(ctx, input.Scope)
	input.Base = s.applyDefaultsToBase(input.Base)
	snapshot, err := s.store.Resolve(ctx, input)
	if err != nil {
		return PreferenceSnapshot{}, err
	}
	if snapshot.Effective == nil {
		snapshot.Effective = map[string]any{}
	}
	return snapshot, nil
}

// Get returns preferences for a user with defaults applied.
func (s *PreferencesService) Get(ctx context.Context, userID string) (UserPreferences, error) {
	if s == nil {
		return UserPreferences{}, errors.New("preferences service not configured")
	}
	scope := preferenceScopeFromContext(ctx)
	if userID != "" {
		scope.UserID = userID
	}
	snapshot, err := s.Resolve(ctx, PreferencesResolveInput{Scope: scope})
	if err != nil {
		return UserPreferences{}, err
	}
	return preferencesFromMap(scope.UserID, snapshot.Effective), nil
}

// Save updates preferences for a user, merging with existing values.
func (s *PreferencesService) Save(ctx context.Context, userID string, prefs UserPreferences) (UserPreferences, error) {
	if s == nil {
		return UserPreferences{}, errors.New("preferences service not configured")
	}
	scope := preferenceScopeFromContext(ctx)
	if userID != "" {
		scope.UserID = userID
	}
	if scope.UserID == "" {
		return UserPreferences{}, ErrForbidden
	}
	update := preferencesToMap(prefs)
	if len(update) == 0 {
		return s.Get(ctx, scope.UserID)
	}
	if _, err := s.store.Upsert(ctx, PreferencesUpsertInput{
		Scope:  scope,
		Level:  PreferenceLevelUser,
		Values: update,
	}); err != nil {
		return UserPreferences{}, err
	}
	s.recordActivity(ctx, scope.UserID, update)
	snapshot, err := s.Resolve(ctx, PreferencesResolveInput{Scope: scope})
	if err != nil {
		return UserPreferences{}, err
	}
	return preferencesFromMap(scope.UserID, snapshot.Effective), nil
}

// Clear removes stored preference keys for a user.
func (s *PreferencesService) Clear(ctx context.Context, userID string, keys []string) (UserPreferences, error) {
	if s == nil {
		return UserPreferences{}, errors.New("preferences service not configured")
	}
	scope := preferenceScopeFromContext(ctx)
	if userID != "" {
		scope.UserID = userID
	}
	if scope.UserID == "" {
		return UserPreferences{}, ErrForbidden
	}
	keys = normalizePreferenceKeys(keys)
	if len(keys) == 0 {
		return s.Get(ctx, scope.UserID)
	}
	if err := s.store.Delete(ctx, PreferencesDeleteInput{
		Scope: scope,
		Level: PreferenceLevelUser,
		Keys:  keys,
	}); err != nil {
		return UserPreferences{}, err
	}
	s.recordActivity(ctx, scope.UserID, keysToUpdateMap(keys))
	snapshot, err := s.Resolve(ctx, PreferencesResolveInput{Scope: scope})
	if err != nil {
		return UserPreferences{}, err
	}
	return preferencesFromMap(scope.UserID, snapshot.Effective), nil
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

func (s *PreferencesService) applyDefaultsToBase(base map[string]any) map[string]any {
	if s == nil {
		return base
	}
	if base == nil {
		base = map[string]any{}
	} else {
		base = cloneAnyMap(base)
	}
	if s.defaultTheme != "" {
		if _, ok := base[preferencesKeyTheme]; !ok {
			base[preferencesKeyTheme] = s.defaultTheme
		}
	}
	if s.defaultVariant != "" {
		if _, ok := base[preferencesKeyThemeVariant]; !ok {
			base[preferencesKeyThemeVariant] = s.defaultVariant
		}
	}
	return base
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

func mergePreferenceScope(ctx context.Context, scope PreferenceScope) PreferenceScope {
	if scope.UserID == "" {
		scope.UserID = userIDFromContext(ctx)
	}
	if scope.TenantID == "" {
		scope.TenantID = tenantIDFromContext(ctx)
	}
	if scope.OrgID == "" {
		scope.OrgID = orgIDFromContext(ctx)
	}
	return scope
}

func normalizePreferenceKeys(keys []string) []string {
	if len(keys) == 0 {
		return nil
	}
	out := make([]string, 0, len(keys))
	seen := map[string]bool{}
	for _, key := range keys {
		key = toString(key)
		if key == "" || seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, key)
	}
	return out
}

func keysToUpdateMap(keys []string) map[string]any {
	out := map[string]any{}
	for _, key := range keys {
		if key == "" {
			continue
		}
		out[key] = nil
	}
	return out
}

var preferenceResolutionOrder = []PreferenceLevel{
	PreferenceLevelSystem,
	PreferenceLevelTenant,
	PreferenceLevelOrg,
	PreferenceLevelUser,
}

func resolvePreferenceLevels(levels []PreferenceLevel) []PreferenceLevel {
	if len(levels) == 0 {
		return append([]PreferenceLevel(nil), preferenceResolutionOrder...)
	}
	allowed := map[PreferenceLevel]bool{}
	for _, level := range levels {
		allowed[level] = true
	}
	out := make([]PreferenceLevel, 0, len(preferenceResolutionOrder))
	for _, level := range preferenceResolutionOrder {
		if allowed[level] {
			out = append(out, level)
		}
	}
	return out
}

func normalizePreferenceLevel(level PreferenceLevel) PreferenceLevel {
	if level == "" {
		return PreferenceLevelUser
	}
	return level
}

func validatePreferenceScope(level PreferenceLevel, scope PreferenceScope) error {
	switch level {
	case PreferenceLevelSystem:
		return nil
	case PreferenceLevelTenant:
		if strings.TrimSpace(scope.TenantID) == "" {
			return errors.New("tenant id required")
		}
	case PreferenceLevelOrg:
		if strings.TrimSpace(scope.OrgID) == "" {
			return errors.New("org id required")
		}
	case PreferenceLevelUser:
		if strings.TrimSpace(scope.UserID) == "" {
			return errors.New("user id required")
		}
	default:
		return errors.New("unsupported preference level")
	}
	return nil
}

func (s *InMemoryPreferencesStore) recordsForWrite(level PreferenceLevel, scope PreferenceScope) map[string]preferenceRecord {
	switch level {
	case PreferenceLevelSystem:
		return s.system
	case PreferenceLevelTenant:
		tenantID := strings.TrimSpace(scope.TenantID)
		if s.tenants[tenantID] == nil {
			s.tenants[tenantID] = map[string]preferenceRecord{}
		}
		return s.tenants[tenantID]
	case PreferenceLevelOrg:
		orgID := strings.TrimSpace(scope.OrgID)
		if s.orgs[orgID] == nil {
			s.orgs[orgID] = map[string]preferenceRecord{}
		}
		return s.orgs[orgID]
	case PreferenceLevelUser:
		userID := strings.TrimSpace(scope.UserID)
		if s.users[userID] == nil {
			s.users[userID] = map[string]preferenceRecord{}
		}
		return s.users[userID]
	default:
		return map[string]preferenceRecord{}
	}
}

func clonePreferenceRecords(in map[string]preferenceRecord) map[string]preferenceRecord {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]preferenceRecord, len(in))
	for key, record := range in {
		out[key] = record
	}
	return out
}

func flattenPreferenceRecords(records map[string]preferenceRecord) map[string]any {
	if len(records) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	for key, record := range records {
		out[key] = clonePreferenceValue(record.Value)
	}
	return out
}

func clonePreferenceValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneAnyMap(typed)
	default:
		return value
	}
}

func collectPreferenceKeys(base map[string]any, layers ...map[string]preferenceRecord) []string {
	seen := map[string]bool{}
	for key := range base {
		key = strings.TrimSpace(key)
		if key != "" {
			seen[key] = true
		}
	}
	for _, layer := range layers {
		for key := range layer {
			key = strings.TrimSpace(key)
			if key != "" {
				seen[key] = true
			}
		}
	}
	if len(seen) == 0 {
		return nil
	}
	out := make([]string, 0, len(seen))
	for key := range seen {
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}

func buildPreferenceTraces(keys []string, levels []PreferenceLevel, layerValues map[PreferenceLevel]map[string]preferenceRecord, scope PreferenceScope) []PreferenceTrace {
	if len(keys) == 0 {
		return nil
	}
	out := make([]PreferenceTrace, 0, len(keys))
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		trace := PreferenceTrace{Key: key}
		for _, level := range levels {
			layer := PreferenceTraceLayer{
				Level: level,
				Scope: scopeForPreferenceLevel(level, scope),
			}
			if records := layerValues[level]; len(records) > 0 {
				if record, ok := records[key]; ok {
					layer.Found = true
					layer.Value = clonePreferenceValue(record.Value)
					layer.Version = record.Version
				}
			}
			trace.Layers = append(trace.Layers, layer)
		}
		out = append(out, trace)
	}
	return out
}

func scopeForPreferenceLevel(level PreferenceLevel, scope PreferenceScope) PreferenceScope {
	switch level {
	case PreferenceLevelTenant:
		return PreferenceScope{TenantID: scope.TenantID}
	case PreferenceLevelOrg:
		return PreferenceScope{OrgID: scope.OrgID}
	case PreferenceLevelUser:
		return PreferenceScope{UserID: scope.UserID}
	default:
		return PreferenceScope{}
	}
}

func filterPreferenceKeys(values map[string]any, keys []string) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}
	if len(keys) == 0 {
		return values
	}
	out := map[string]any{}
	for _, key := range keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if val, ok := values[key]; ok {
			out[key] = val
		}
	}
	return out
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
