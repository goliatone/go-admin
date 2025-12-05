package admin

import (
	"context"
	"errors"
	"fmt"
	"sync"

	opts "github.com/goliatone/go-options"
	openapi "github.com/goliatone/go-options/schema/openapi"
)

// GoOptionsSettingsAdapter persists settings using go-options layering semantics.
// It mirrors the in-memory SettingsService storage but annotates scopes with
// snapshot metadata so provenance is visible in schemas and traces.
type GoOptionsSettingsAdapter struct {
	mu           sync.RWMutex
	definitions  map[string]SettingDefinition
	systemValues map[string]any
	siteValues   map[string]any
	userValues   map[string]map[string]any
	schemaOpts   []opts.Option
}

// NewGoOptionsSettingsAdapter constructs an adapter with default schema options.
func NewGoOptionsSettingsAdapter() *GoOptionsSettingsAdapter {
	return &GoOptionsSettingsAdapter{
		definitions:  map[string]SettingDefinition{},
		systemValues: map[string]any{},
		siteValues:   map[string]any{},
		userValues:   map[string]map[string]any{},
		schemaOpts:   []opts.Option{opts.WithScopeSchema(true), openapi.Option()},
	}
}

// WithSchemaOptions appends schema generation options.
func (a *GoOptionsSettingsAdapter) WithSchemaOptions(options ...opts.Option) {
	if len(options) == 0 {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.schemaOpts = append(a.schemaOpts, options...)
}

// RegisterDefinition stores a setting definition on the adapter.
func (a *GoOptionsSettingsAdapter) RegisterDefinition(def SettingDefinition) {
	if def.Key == "" {
		return
	}
	if len(def.AllowedScopes) == 0 {
		def.AllowedScopes = []SettingsScope{SettingsScopeSystem, SettingsScopeSite, SettingsScopeUser}
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.definitions[def.Key] = def
}

// Definitions returns the sorted definitions known to the adapter.
func (a *GoOptionsSettingsAdapter) Definitions() []SettingDefinition {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return sortedSettingDefinitions(a.definitions)
}

// Apply validates and stores values for the requested scope.
func (a *GoOptionsSettingsAdapter) Apply(ctx context.Context, bundle SettingsBundle) error {
	scope := bundle.Scope
	if scope == "" {
		scope = SettingsScopeSite
	}
	if scope == SettingsScopeUser && bundle.UserID == "" {
		return errors.New("user id required for user scope settings")
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	errs := SettingsValidationErrors{Fields: map[string]string{}, Scope: scope}
	sanitized := map[string]any{}

	for key, val := range bundle.Values {
		def, ok := a.definitions[key]
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
			a.systemValues[key] = val
		case SettingsScopeSite:
			a.siteValues[key] = val
		case SettingsScopeUser:
			if _, ok := a.userValues[bundle.UserID]; !ok {
				a.userValues[bundle.UserID] = make(map[string]any)
			}
			a.userValues[bundle.UserID][key] = val
		default:
			return fmt.Errorf("unsupported scope: %s", scope)
		}
	}
	return nil
}

// Resolve returns a single resolved setting with provenance.
func (a *GoOptionsSettingsAdapter) Resolve(key, userID string) ResolvedSetting {
	a.mu.RLock()
	defer a.mu.RUnlock()

	def := a.definitions[key]
	options, err := a.buildOptionsLocked(userID)
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

// ResolveAll returns resolved values for every definition.
func (a *GoOptionsSettingsAdapter) ResolveAll(userID string) map[string]ResolvedSetting {
	a.mu.RLock()
	defer a.mu.RUnlock()

	options, err := a.buildOptionsLocked(userID)
	out := map[string]ResolvedSetting{}
	for key, def := range a.definitions {
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

// Schema emits the go-options schema document including scope descriptors.
func (a *GoOptionsSettingsAdapter) Schema(ctx context.Context, userID string) (opts.SchemaDocument, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	options, err := a.buildOptionsLocked(userID)
	if err != nil {
		return opts.SchemaDocument{}, err
	}
	if options == nil {
		return opts.SchemaDocument{}, nil
	}
	return options.Schema()
}

func (a *GoOptionsSettingsAdapter) buildOptionsLocked(userID string) (*opts.Options[map[string]any], error) {
	defaults := buildDefaultSnapshot(a.definitions)
	userMeta := map[string]any{"source": "go-options"}
	if userID != "" {
		userMeta["user_id"] = userID
	}
	userLayer := opts.NewLayer(newScopeWithLabel(SettingsScopeUser, scopePriorityUser, userMeta), nestValues(a.userValues[userID]), opts.WithSnapshotID[map[string]any]("go-options:user"))
	siteLayer := opts.NewLayer(newScopeWithLabel(SettingsScopeSite, scopePrioritySite, map[string]any{"source": "go-options"}), nestValues(a.siteValues), opts.WithSnapshotID[map[string]any]("go-options:site"))
	systemLayer := opts.NewLayer(newScopeWithLabel(SettingsScopeSystem, scopePrioritySystem, map[string]any{"source": "go-options"}), nestValues(a.systemValues), opts.WithSnapshotID[map[string]any]("go-options:system"))
	defaultLayer := opts.NewLayer(newScopeWithLabel(SettingsScopeDefault, scopePriorityDefault, map[string]any{"source": "go-options"}), defaults, opts.WithSnapshotID[map[string]any]("go-options:default"))

	stack, err := opts.NewStack(userLayer, siteLayer, systemLayer, defaultLayer)
	if err != nil {
		return nil, err
	}
	mergeOpts := a.schemaOpts
	if len(mergeOpts) == 0 {
		mergeOpts = nil
	}
	return stack.Merge(mergeOpts...)
}
