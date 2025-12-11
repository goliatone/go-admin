package admin

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sort"
	"strings"
	"sync"

	opts "github.com/goliatone/go-options"
	openapi "github.com/goliatone/go-options/schema/openapi"
)

// SettingsScope represents the provenance of a setting value.
type SettingsScope string

const (
	SettingsScopeSystem  SettingsScope = "system"
	SettingsScopeSite    SettingsScope = "site"
	SettingsScopeUser    SettingsScope = "user"
	SettingsScopeDefault SettingsScope = "default"
)

const (
	scopePriorityUser    = 30
	scopePrioritySite    = 20
	scopePrioritySystem  = 10
	scopePriorityDefault = 0
)

// SettingDefinition describes a single setting and its defaults.
type SettingDefinition struct {
	Key             string                 `json:"key"`
	Title           string                 `json:"title,omitempty"`
	Description     string                 `json:"description,omitempty"`
	Default         any                    `json:"default,omitempty"`
	Type            string                 `json:"type,omitempty"`
	Group           string                 `json:"group,omitempty"`
	AllowedScopes   []SettingsScope        `json:"allowed_scopes,omitempty"`
	Enum            []any                  `json:"enum,omitempty"`
	Widget          string                 `json:"widget,omitempty"`
	VisibilityRule  string                 `json:"visibility_rule,omitempty"`
	Options         []SettingOption        `json:"options,omitempty"`
	OptionsProvider SettingOptionsProvider `json:"-"`
	Enrichers       []SettingFieldEnricher `json:"-"`
	Validator       SettingValidator       `json:"-"`
}

// SettingOption represents an allowed value for select-like controls.
type SettingOption struct {
	Label       string `json:"label,omitempty"`
	Value       any    `json:"value"`
	Description string `json:"description,omitempty"`
}

// SettingOptionsProvider dynamically resolves options for a definition.
type SettingOptionsProvider func(ctx context.Context) ([]SettingOption, error)

// SettingFieldEnricher can mutate the schema payload for a definition.
type SettingFieldEnricher func(ctx context.Context, field map[string]any)

// SettingValidator applies custom validation logic for a definition.
type SettingValidator func(ctx context.Context, value any) error

// SettingsAdapter allows the settings service to delegate persistence and resolution.
type SettingsAdapter interface {
	RegisterDefinition(def SettingDefinition)
	Definitions() []SettingDefinition
	Apply(ctx context.Context, bundle SettingsBundle) error
	Resolve(key, userID string) ResolvedSetting
	ResolveAll(userID string) map[string]ResolvedSetting
	Schema(ctx context.Context, userID string) (opts.SchemaDocument, error)
	WithSchemaOptions(opts ...opts.Option)
}

// ResolvedSetting contains a resolved value and provenance.
type ResolvedSetting struct {
	Key        string            `json:"key"`
	Value      any               `json:"value"`
	Scope      SettingsScope     `json:"scope"`
	Provenance string            `json:"provenance"`
	Definition SettingDefinition `json:"definition,omitempty"`
}

// SettingsBundle captures a bulk mutation request.
type SettingsBundle struct {
	Scope  SettingsScope
	UserID string
	Values map[string]any
}

// SettingsValidationErrors aggregates field-level validation issues.
type SettingsValidationErrors struct {
	Fields map[string]string `json:"fields"`
	Scope  SettingsScope     `json:"scope,omitempty"`
}

func (e SettingsValidationErrors) Error() string {
	return "settings validation failed"
}

func (e SettingsValidationErrors) hasErrors() bool {
	return len(e.Fields) > 0
}

// SettingsService stores definitions and layered values (system/site/user).
type SettingsService struct {
	mu           sync.RWMutex
	definitions  map[string]SettingDefinition
	systemValues map[string]any
	siteValues   map[string]any
	userValues   map[string]map[string]any
	registry     *Registry
	activity     ActivitySink
	schemaOpts   []opts.Option
	enabled      bool
	adapter      SettingsAdapter
}

// NewSettingsService constructs an empty settings service.
func NewSettingsService() *SettingsService {
	return &SettingsService{
		definitions:  make(map[string]SettingDefinition),
		systemValues: make(map[string]any),
		siteValues:   make(map[string]any),
		userValues:   make(map[string]map[string]any),
		schemaOpts:   []opts.Option{opts.WithScopeSchema(true), openapi.Option()},
		enabled:      true,
	}
}

// WithRegistry wires the shared registry so definitions are discoverable.
func (s *SettingsService) WithRegistry(reg *Registry) {
	if reg != nil {
		s.registry = reg
	}
}

// WithSchemaOptions appends options used when generating schemas from go-options.
func (s *SettingsService) WithSchemaOptions(opts ...opts.Option) {
	if len(opts) == 0 {
		return
	}
	s.mu.Lock()
	s.schemaOpts = append(s.schemaOpts, opts...)
	adapter := s.adapter
	s.mu.Unlock()
	if adapter != nil {
		adapter.WithSchemaOptions(opts...)
	}
}

// WithActivitySink wires a shared activity sink for settings mutations.
func (s *SettingsService) WithActivitySink(sink ActivitySink) {
	if sink != nil {
		s.activity = sink
	}
}

// Enable toggles whether settings are available.
func (s *SettingsService) Enable(enabled bool) {
	if s == nil {
		return
	}
	s.enabled = enabled
}

// UseAdapter delegates settings persistence and resolution to an external adapter.
func (s *SettingsService) UseAdapter(adapter SettingsAdapter) {
	if s == nil || adapter == nil {
		return
	}
	s.mu.Lock()
	s.adapter = adapter
	schemaOpts := append([]opts.Option(nil), s.schemaOpts...)
	s.mu.Unlock()
	if len(schemaOpts) > 0 {
		adapter.WithSchemaOptions(schemaOpts...)
	}
}

// RegisterDefinition adds or updates a definition.
func (s *SettingsService) RegisterDefinition(def SettingDefinition) {
	if def.Key == "" {
		return
	}
	if len(def.AllowedScopes) == 0 {
		def.AllowedScopes = []SettingsScope{SettingsScopeSystem, SettingsScopeSite, SettingsScopeUser}
	}
	s.mu.Lock()
	reg := s.registry
	adapter := s.adapter
	s.definitions[def.Key] = def
	s.mu.Unlock()
	if reg != nil {
		reg.RegisterSetting(def)
	}
	if adapter != nil {
		adapter.RegisterDefinition(def)
	}
}

// Definitions returns all registered definitions sorted by key.
func (s *SettingsService) Definitions() []SettingDefinition {
	s.mu.RLock()
	adapter := s.adapter
	s.mu.RUnlock()
	if adapter != nil {
		return adapter.Definitions()
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return sortedSettingDefinitions(s.definitions)
}

// Apply validates and persists a bundle of settings.
func (s *SettingsService) Apply(ctx context.Context, bundle SettingsBundle) error {
	if s == nil || !s.enabled {
		return FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	scope := bundle.Scope
	if scope == "" {
		scope = SettingsScopeSite
	}
	bundle.Scope = scope
	if scope == SettingsScopeUser && bundle.UserID == "" {
		return errors.New("user id required for user scope settings")
	}

	s.mu.RLock()
	adapter := s.adapter
	s.mu.RUnlock()
	if adapter != nil {
		if err := adapter.Apply(ctx, bundle); err != nil {
			return err
		}
		s.recordActivity(ctx, scope, bundle, bundle.Values)
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	errs := SettingsValidationErrors{Fields: map[string]string{}, Scope: scope}
	sanitized := map[string]any{}

	for key, val := range bundle.Values {
		def, ok := s.definitions[key]
		if !ok {
			errs.Fields[key] = "unknown setting"
			continue
		}
		if !scopeAllowed(def, scope) {
			errs.Fields[key] = "scope not allowed"
			continue
		}
		if err := validateSetting(ctx, def, val); err != nil {
			errs.Fields[key] = err.Error()
			continue
		}
		sanitized[key] = val
	}

	if errs.hasErrors() {
		return errs
	}

	for key, val := range sanitized {
		switch scope {
		case SettingsScopeSystem:
			s.systemValues[key] = val
		case SettingsScopeSite:
			s.siteValues[key] = val
		case SettingsScopeUser:
			if _, ok := s.userValues[bundle.UserID]; !ok {
				s.userValues[bundle.UserID] = make(map[string]any)
			}
			s.userValues[bundle.UserID][key] = val
		default:
			return fmt.Errorf("unsupported scope: %s", scope)
		}
	}
	s.recordActivity(ctx, scope, bundle, sanitized)
	return nil
}

// Resolve returns a setting value with provenance.
func (s *SettingsService) Resolve(key, userID string) ResolvedSetting {
	if s == nil || !s.enabled {
		return ResolvedSetting{
			Key:        key,
			Scope:      SettingsScopeDefault,
			Provenance: string(SettingsScopeDefault),
		}
	}
	s.mu.RLock()
	adapter := s.adapter
	s.mu.RUnlock()
	if adapter != nil {
		return adapter.Resolve(key, userID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.resolveWithOptionsLocked(key, userID)
}

// ResolveAll returns all settings with provenance.
func (s *SettingsService) ResolveAll(userID string) map[string]ResolvedSetting {
	if s == nil || !s.enabled {
		return map[string]ResolvedSetting{}
	}
	s.mu.RLock()
	adapter := s.adapter
	s.mu.RUnlock()
	if adapter != nil {
		return adapter.ResolveAll(userID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()

	options, err := s.buildOptionsLocked(userID)
	out := map[string]ResolvedSetting{}
	for key, def := range s.definitions {
		if options == nil || err != nil {
			out[key] = ResolvedSetting{
				Key:        key,
				Value:      def.Default,
				Scope:      SettingsScopeDefault,
				Provenance: string(SettingsScopeDefault),
				Definition: def,
			}
			continue
		}
		val, trace, traceErr := options.ResolveWithTrace(key)
		out[key] = resolvedFromTrace(def, key, val, trace, traceErr)
	}
	return out
}

// Schema returns the go-options schema document for the current settings stack.
func (s *SettingsService) Schema(ctx context.Context, userID string) (opts.SchemaDocument, error) {
	if s == nil || !s.enabled {
		return opts.SchemaDocument{}, FeatureDisabledError{Feature: string(FeatureSettings)}
	}
	s.mu.RLock()
	adapter := s.adapter
	s.mu.RUnlock()
	if adapter != nil {
		return adapter.Schema(ctx, userID)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	options, err := s.buildOptionsLocked(userID)
	if err != nil {
		return opts.SchemaDocument{}, err
	}
	if options == nil {
		return opts.SchemaDocument{}, nil
	}
	return options.Schema()
}

func (s *SettingsService) validate(ctx context.Context, def SettingDefinition, val any) error {
	return validateSetting(ctx, def, val)
}

func validateType(t string, val any) error {
	switch t {
	case "", "string":
		if _, ok := val.(string); !ok {
			return errors.New("expected string")
		}
	case "textarea", "text":
		if _, ok := val.(string); !ok {
			return errors.New("expected string")
		}
	case "boolean", "bool":
		if _, ok := val.(bool); !ok {
			return errors.New("expected boolean")
		}
	case "number":
		switch val.(type) {
		case int, int64, float32, float64:
			return nil
		default:
			return errors.New("expected number")
		}
	}
	return nil
}

func resolveDefinitionOptions(ctx context.Context, def SettingDefinition) ([]SettingOption, error) {
	options := []SettingOption{}
	if len(def.Enum) > 0 {
		for _, value := range def.Enum {
			options = append(options, SettingOption{Value: value})
		}
	}
	if len(def.Options) > 0 {
		options = append(options, def.Options...)
	}
	if def.OptionsProvider != nil {
		provided, err := def.OptionsProvider(ctx)
		if err != nil {
			return options, err
		}
		options = append(options, provided...)
	}
	return options, nil
}

func valueAllowedByOptions(val any, options []SettingOption) bool {
	for _, opt := range options {
		if reflect.DeepEqual(opt.Value, val) {
			return true
		}
	}
	return len(options) == 0
}

func scopeAllowed(def SettingDefinition, scope SettingsScope) bool {
	for _, allowed := range def.AllowedScopes {
		if allowed == scope {
			return true
		}
	}
	return false
}

func (s *SettingsService) resolveWithOptionsLocked(key, userID string) ResolvedSetting {
	def := s.definitions[key]
	options, err := s.buildOptionsLocked(userID)
	if err != nil || options == nil {
		return ResolvedSetting{
			Key:        key,
			Value:      def.Default,
			Scope:      SettingsScopeDefault,
			Provenance: string(SettingsScopeDefault),
			Definition: def,
		}
	}
	val, trace, traceErr := options.ResolveWithTrace(key)
	return resolvedFromTrace(def, key, val, trace, traceErr)
}

func (s *SettingsService) buildOptionsLocked(userID string) (*opts.Options[map[string]any], error) {
	return buildOptionsStack(s.definitions, s.systemValues, s.siteValues, s.userValues, s.schemaOpts, userID)
}

func resolvedFromTrace(def SettingDefinition, key string, value any, trace opts.Trace, err error) ResolvedSetting {
	scope := SettingsScopeDefault
	provenance := string(SettingsScopeDefault)
	resolvedValue := def.Default
	if err == nil {
		resolvedValue = value
		for _, layer := range trace.Layers {
			if layer.Scope.Name != "" {
				scope = SettingsScope(layer.Scope.Name)
				provenance = layer.Scope.Name
				if layer.Scope.Label != "" {
					provenance = layer.Scope.Label
				}
			}
			if layer.Found {
				break
			}
		}
		if resolvedValue == nil {
			resolvedValue = def.Default
		}
	}
	return ResolvedSetting{
		Key:        key,
		Value:      resolvedValue,
		Scope:      scope,
		Provenance: provenance,
		Definition: def,
	}
}

func buildDefaultSnapshot(definitions map[string]SettingDefinition) map[string]any {
	if len(definitions) == 0 {
		return map[string]any{}
	}
	values := map[string]any{}
	for key, def := range definitions {
		values[key] = def.Default
	}
	return nestValues(values)
}

func nestValues(values map[string]any) map[string]any {
	if len(values) == 0 {
		return map[string]any{}
	}
	root := map[string]any{}
	for rawKey, val := range values {
		if strings.TrimSpace(rawKey) == "" {
			continue
		}
		segments := strings.Split(rawKey, ".")
		current := root
		for idx, segment := range segments {
			if idx == len(segments)-1 {
				current[segment] = val
				continue
			}
			next, ok := current[segment]
			if !ok {
				child := map[string]any{}
				current[segment] = child
				current = child
				continue
			}
			child, ok := next.(map[string]any)
			if !ok {
				child = map[string]any{}
			}
			current[segment] = child
			current = child
		}
	}
	return root
}

func newScopeWithLabel(scope SettingsScope, priority int, metadata map[string]any) opts.Scope {
	if metadata == nil {
		return opts.NewScope(string(scope), priority, opts.WithScopeLabel(string(scope)))
	}
	return opts.NewScope(string(scope), priority, opts.WithScopeLabel(string(scope)), opts.WithScopeMetadata(metadata))
}

func validateSetting(ctx context.Context, def SettingDefinition, val any) error {
	if err := validateType(def.Type, val); err != nil {
		return err
	}

	options, err := resolveDefinitionOptions(ctx, def)
	if err != nil {
		return err
	}
	if len(options) > 0 && !valueAllowedByOptions(val, options) {
		return fmt.Errorf("value not allowed")
	}
	if def.Validator != nil {
		return def.Validator(ctx, val)
	}
	return nil
}

func sortedSettingDefinitions(definitions map[string]SettingDefinition) []SettingDefinition {
	keys := make([]string, 0, len(definitions))
	for k := range definitions {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]SettingDefinition, 0, len(keys))
	for _, k := range keys {
		out = append(out, definitions[k])
	}
	return out
}

func buildOptionsStack(definitions map[string]SettingDefinition, systemValues, siteValues map[string]any, userValues map[string]map[string]any, schemaOpts []opts.Option, userID string) (*opts.Options[map[string]any], error) {
	defaults := buildDefaultSnapshot(definitions)
	userMeta := map[string]any{}
	if userID != "" {
		userMeta["user_id"] = userID
	}
	if len(userMeta) == 0 {
		userMeta = nil
	}
	layers := []opts.Layer[map[string]any]{
		opts.NewLayer(newScopeWithLabel(SettingsScopeUser, scopePriorityUser, userMeta), nestValues(userValues[userID])),
		opts.NewLayer(newScopeWithLabel(SettingsScopeSite, scopePrioritySite, nil), nestValues(siteValues)),
		opts.NewLayer(newScopeWithLabel(SettingsScopeSystem, scopePrioritySystem, nil), nestValues(systemValues)),
		opts.NewLayer(newScopeWithLabel(SettingsScopeDefault, scopePriorityDefault, nil), defaults),
	}
	stack, err := opts.NewStack(layers...)
	if err != nil {
		return nil, err
	}
	mergeOpts := schemaOpts
	if len(mergeOpts) == 0 {
		mergeOpts = nil
	}
	return stack.Merge(mergeOpts...)
}

func (s *SettingsService) recordActivity(ctx context.Context, scope SettingsScope, bundle SettingsBundle, values map[string]any) {
	if s == nil || s.activity == nil || len(values) == 0 {
		return
	}
	actor := userIDFromContext(ctx)
	if actor == "" {
		actor = bundle.UserID
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	meta := map[string]any{
		"scope": scope,
		"keys":  keys,
	}
	if bundle.UserID != "" {
		meta["user_id"] = bundle.UserID
	}
	_ = s.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   "settings.update",
		Object:   "settings",
		Metadata: meta,
	})
}
