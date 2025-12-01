package admin

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
)

// SettingsScope represents the provenance of a setting value.
type SettingsScope string

const (
	SettingsScopeSystem  SettingsScope = "system"
	SettingsScopeSite    SettingsScope = "site"
	SettingsScopeUser    SettingsScope = "user"
	SettingsScopeDefault SettingsScope = "default"
)

// SettingDefinition describes a single setting and its defaults.
type SettingDefinition struct {
	Key           string          `json:"key"`
	Title         string          `json:"title,omitempty"`
	Description   string          `json:"description,omitempty"`
	Default       any             `json:"default,omitempty"`
	Type          string          `json:"type,omitempty"`
	Group         string          `json:"group,omitempty"`
	AllowedScopes []SettingsScope `json:"allowed_scopes,omitempty"`
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
}

// NewSettingsService constructs an empty settings service.
func NewSettingsService() *SettingsService {
	return &SettingsService{
		definitions:  make(map[string]SettingDefinition),
		systemValues: make(map[string]any),
		siteValues:   make(map[string]any),
		userValues:   make(map[string]map[string]any),
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
	defer s.mu.Unlock()
	s.definitions[def.Key] = def
}

// Definitions returns all registered definitions sorted by key.
func (s *SettingsService) Definitions() []SettingDefinition {
	s.mu.RLock()
	defer s.mu.RUnlock()
	keys := make([]string, 0, len(s.definitions))
	for k := range s.definitions {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := make([]SettingDefinition, 0, len(keys))
	for _, k := range keys {
		out = append(out, s.definitions[k])
	}
	return out
}

// Apply validates and persists a bundle of settings.
func (s *SettingsService) Apply(ctx context.Context, bundle SettingsBundle) error {
	_ = ctx
	s.mu.Lock()
	defer s.mu.Unlock()

	scope := bundle.Scope
	if scope == "" {
		scope = SettingsScopeSite
	}

	errs := SettingsValidationErrors{Fields: map[string]string{}}
	sanitized := map[string]any{}

	for key, val := range bundle.Values {
		def, ok := s.definitions[key]
		if !ok {
			errs.Fields[key] = "unknown setting"
			continue
		}
		if !s.scopeAllowed(def, scope) {
			errs.Fields[key] = "scope not allowed"
			continue
		}
		if err := s.validate(def, val); err != nil {
			errs.Fields[key] = err.Error()
			continue
		}
		sanitized[key] = val
	}

	if errs.hasErrors() {
		return errs
	}

	if scope == SettingsScopeUser && bundle.UserID == "" {
		return errors.New("user id required for user scope settings")
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
	return nil
}

// Resolve returns a setting value with provenance.
func (s *SettingsService) Resolve(key, userID string) ResolvedSetting {
	s.mu.RLock()
	defer s.mu.RUnlock()
	def := s.definitions[key]

	if userID != "" {
		if userVals, ok := s.userValues[userID]; ok {
			if v, ok := userVals[key]; ok {
				return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeUser, Provenance: string(SettingsScopeUser), Definition: def}
			}
		}
	}
	if v, ok := s.siteValues[key]; ok {
		return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeSite, Provenance: string(SettingsScopeSite), Definition: def}
	}
	if v, ok := s.systemValues[key]; ok {
		return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeSystem, Provenance: string(SettingsScopeSystem), Definition: def}
	}
	return ResolvedSetting{
		Key:        key,
		Value:      def.Default,
		Scope:      SettingsScopeDefault,
		Provenance: string(SettingsScopeDefault),
		Definition: def,
	}
}

// ResolveAll returns all settings with provenance.
func (s *SettingsService) ResolveAll(userID string) map[string]ResolvedSetting {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := map[string]ResolvedSetting{}
	for key := range s.definitions {
		out[key] = s.resolveLocked(key, userID)
	}
	return out
}

func (s *SettingsService) resolveLocked(key, userID string) ResolvedSetting {
	def := s.definitions[key]
	if userID != "" {
		if userVals, ok := s.userValues[userID]; ok {
			if v, ok := userVals[key]; ok {
				return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeUser, Provenance: string(SettingsScopeUser), Definition: def}
			}
		}
	}
	if v, ok := s.siteValues[key]; ok {
		return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeSite, Provenance: string(SettingsScopeSite), Definition: def}
	}
	if v, ok := s.systemValues[key]; ok {
		return ResolvedSetting{Key: key, Value: v, Scope: SettingsScopeSystem, Provenance: string(SettingsScopeSystem), Definition: def}
	}
	return ResolvedSetting{
		Key:        key,
		Value:      def.Default,
		Scope:      SettingsScopeDefault,
		Provenance: string(SettingsScopeDefault),
		Definition: def,
	}
}

func (s *SettingsService) validate(def SettingDefinition, val any) error {
	switch def.Type {
	case "", "string":
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

func (s *SettingsService) scopeAllowed(def SettingDefinition, scope SettingsScope) bool {
	for _, allowed := range def.AllowedScopes {
		if allowed == scope {
			return true
		}
	}
	return false
}
