package debug

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
)

// PanelSnapshotFunc returns snapshot payloads for a panel.
type PanelSnapshotFunc func(ctx context.Context) any

// PanelClearFunc clears panel state when requested by the client.
type PanelClearFunc func(ctx context.Context) error

// PanelConfig configures a server-side debug panel registration.
type PanelConfig struct {
	Label           string
	Icon            string
	Span            int
	SnapshotKey     string
	EventType       string
	EventTypes      []string
	Snapshot        PanelSnapshotFunc
	Clear           PanelClearFunc
	SupportsToolbar *bool
	Category        string
	Order           int
	Version         string
	Metadata        map[string]any
}

// PanelDefinition describes a registered panel for client discovery.
type PanelDefinition struct {
	ID              string         `json:"id"`
	Label           string         `json:"label"`
	Icon            string         `json:"icon,omitempty"`
	Span            int            `json:"span,omitempty"`
	SnapshotKey     string         `json:"snapshot_key"`
	EventTypes      []string       `json:"event_types,omitempty"`
	SupportsToolbar bool           `json:"supports_toolbar"`
	Category        string         `json:"category,omitempty"`
	Order           int            `json:"order,omitempty"`
	Version         string         `json:"version,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

// PanelRegistration stores definition metadata and server hooks.
type PanelRegistration struct {
	Definition PanelDefinition
	Snapshot   PanelSnapshotFunc
	Clear      PanelClearFunc
}

// PanelRegistry stores registered panels and metadata.
type PanelRegistry struct {
	mu         sync.RWMutex
	panels     map[string]PanelRegistration
	eventIndex map[string]map[string]bool
	version    string
}

var defaultRegistry = NewPanelRegistry()

// NewPanelRegistry creates an empty panel registry.
func NewPanelRegistry() *PanelRegistry {
	return &PanelRegistry{
		panels:     map[string]PanelRegistration{},
		eventIndex: map[string]map[string]bool{},
	}
}

// RegisterPanel registers a panel in the default registry.
func RegisterPanel(id string, config PanelConfig) error {
	return defaultRegistry.Register(id, config)
}

// UnregisterPanel removes a panel from the default registry.
func UnregisterPanel(id string) {
	defaultRegistry.Unregister(id)
}

// Panel retrieves a registered panel from the default registry.
func Panel(id string) (PanelRegistration, bool) {
	return defaultRegistry.Registration(id)
}

// PanelDefinitionFor retrieves panel metadata from the default registry.
func PanelDefinitionFor(id string) (PanelDefinition, bool) {
	reg, ok := defaultRegistry.Registration(id)
	if !ok {
		return PanelDefinition{}, false
	}
	return reg.Definition, true
}

// PanelDefinitions returns definitions for all registered panels.
func PanelDefinitions() []PanelDefinition {
	return defaultRegistry.Definitions()
}

// PanelRegistrations returns all registered panels with hooks.
func PanelRegistrations() []PanelRegistration {
	return defaultRegistry.Registrations()
}

// PanelsForEventType returns panel IDs that subscribe to an event type.
func PanelsForEventType(eventType string) []string {
	return defaultRegistry.PanelsForEventType(eventType)
}

// SetRegistryVersion sets a version identifier for the default registry.
func SetRegistryVersion(version string) {
	defaultRegistry.SetVersion(version)
}

// RegistryVersion returns the default registry version identifier.
func RegistryVersion() string {
	return defaultRegistry.Version()
}

// Register registers a panel in the registry.
func (r *PanelRegistry) Register(id string, config PanelConfig) error {
	if r == nil {
		return errors.New("panel registry is nil")
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return errors.New("panel id cannot be empty")
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.panels[normalized]; exists {
		return errors.New("panel already registered")
	}

	reg := buildRegistration(normalized, config)
	r.panels[normalized] = reg
	for _, eventType := range reg.Definition.EventTypes {
		set := r.eventIndex[eventType]
		if set == nil {
			set = map[string]bool{}
			r.eventIndex[eventType] = set
		}
		set[normalized] = true
	}
	return nil
}

// Unregister removes a panel from the registry.
func (r *PanelRegistry) Unregister(id string) {
	if r == nil {
		return
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return
	}
	r.mu.Lock()
	reg, ok := r.panels[normalized]
	if ok {
		delete(r.panels, normalized)
	}
	for _, eventType := range reg.Definition.EventTypes {
		set := r.eventIndex[eventType]
		if set == nil {
			continue
		}
		delete(set, normalized)
		if len(set) == 0 {
			delete(r.eventIndex, eventType)
		}
	}
	r.mu.Unlock()
}

// Registration returns a panel registration by ID.
func (r *PanelRegistry) Registration(id string) (PanelRegistration, bool) {
	if r == nil {
		return PanelRegistration{}, false
	}
	normalized := normalizeID(id)
	if normalized == "" {
		return PanelRegistration{}, false
	}
	r.mu.RLock()
	reg, ok := r.panels[normalized]
	r.mu.RUnlock()
	return reg, ok
}

// Definitions returns a sorted list of registered panel definitions.
func (r *PanelRegistry) Definitions() []PanelDefinition {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	defs := make([]PanelDefinition, 0, len(r.panels))
	for _, reg := range r.panels {
		defs = append(defs, reg.Definition)
	}
	r.mu.RUnlock()
	sort.Slice(defs, func(i, j int) bool {
		return defs[i].ID < defs[j].ID
	})
	return defs
}

// Registrations returns a sorted list of panel registrations.
func (r *PanelRegistry) Registrations() []PanelRegistration {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	out := make([]PanelRegistration, 0, len(r.panels))
	for _, reg := range r.panels {
		out = append(out, reg)
	}
	r.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool {
		return out[i].Definition.ID < out[j].Definition.ID
	})
	return out
}

// PanelsForEventType returns panel IDs that subscribe to an event type.
func (r *PanelRegistry) PanelsForEventType(eventType string) []string {
	if r == nil {
		return nil
	}
	eventType = normalizeID(eventType)
	if eventType == "" {
		return nil
	}
	r.mu.RLock()
	set := r.eventIndex[eventType]
	ids := make([]string, 0, len(set))
	for id := range set {
		ids = append(ids, id)
	}
	r.mu.RUnlock()
	sort.Strings(ids)
	return ids
}

// SetVersion updates the registry version identifier.
func (r *PanelRegistry) SetVersion(version string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.version = strings.TrimSpace(version)
	r.mu.Unlock()
}

// Version returns the registry version identifier.
func (r *PanelRegistry) Version() string {
	if r == nil {
		return ""
	}
	r.mu.RLock()
	version := r.version
	r.mu.RUnlock()
	return version
}

func buildRegistration(id string, config PanelConfig) PanelRegistration {
	def := PanelDefinition{
		ID:          id,
		Label:       strings.TrimSpace(config.Label),
		Icon:        strings.TrimSpace(config.Icon),
		Span:        config.Span,
		SnapshotKey: normalizeID(config.SnapshotKey),
		Category:    strings.TrimSpace(config.Category),
		Order:       config.Order,
		Version:     strings.TrimSpace(config.Version),
	}
	if def.SnapshotKey == "" {
		def.SnapshotKey = id
	}
	def.EventTypes = normalizeEventTypes(config, def.SnapshotKey)
	def.SupportsToolbar = supportsToolbar(config.SupportsToolbar)
	if def.Label == "" {
		def.Label = formatPanelLabel(id)
	}
	if len(config.Metadata) > 0 {
		def.Metadata = cloneMetadata(config.Metadata)
	}
	return PanelRegistration{
		Definition: def,
		Snapshot:   config.Snapshot,
		Clear:      config.Clear,
	}
}

func supportsToolbar(value *bool) bool {
	if value == nil {
		return true
	}
	return *value
}

func normalizeEventTypes(config PanelConfig, snapshotKey string) []string {
	types := make([]string, 0, 1+len(config.EventTypes))
	if strings.TrimSpace(config.EventType) != "" {
		types = append(types, config.EventType)
	}
	if len(config.EventTypes) > 0 {
		types = append(types, config.EventTypes...)
	}
	if len(types) == 0 && snapshotKey != "" {
		types = append(types, snapshotKey)
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(types))
	for _, eventType := range types {
		normalized := normalizeID(eventType)
		if normalized == "" || seen[normalized] {
			continue
		}
		seen[normalized] = true
		out = append(out, normalized)
	}
	return out
}

func normalizeID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func formatPanelLabel(id string) string {
	trimmed := strings.TrimSpace(id)
	if trimmed == "" {
		return ""
	}
	replacer := strings.NewReplacer("-", " ", "_", " ", ".", " ", "/", " ")
	parts := strings.Fields(replacer.Replace(trimmed))
	for i, part := range parts {
		lower := strings.ToLower(part)
		switch lower {
		case "sql":
			parts[i] = "SQL"
		case "id":
			parts[i] = "ID"
		default:
			parts[i] = titleCase(lower)
		}
	}
	if len(parts) == 0 {
		return titleCase(trimmed)
	}
	return strings.Join(parts, " ")
}

func titleCase(val string) string {
	if val == "" {
		return ""
	}
	return strings.ToUpper(val[:1]) + strings.ToLower(val[1:])
}

func cloneMetadata(input map[string]any) map[string]any {
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = value
	}
	return out
}
