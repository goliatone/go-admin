package debug

import (
	"context"
	"errors"
	"maps"
	"sort"
	"strings"
	"sync"
)

// PanelSnapshotFunc returns snapshot payloads for a panel.
type PanelSnapshotFunc func(ctx context.Context) any

// PanelClearFunc clears panel state when requested by the client.
type PanelClearFunc func(ctx context.Context) error

// PanelActionHandler executes a debug panel action. Dispatch still requires the
// action to be present in the request-scoped panel definition.
type PanelActionHandler func(ctx context.Context, req PanelActionRequest) (PanelActionResult, error)

// PanelActionHandlerResolver resolves handlers whose action set is backed by
// request-scoped or mutable provider state. The collector still requires the
// action to be present in the current request-scoped panel definition before
// invoking a resolved handler.
type PanelActionHandlerResolver func(ctx context.Context, actionID string) PanelActionHandler

// PanelDefinitionFilter adapts panel discovery metadata for a request context.
type PanelDefinitionFilter func(ctx context.Context, definition PanelDefinition) PanelDefinition

const (
	// PanelUISchemaVersion is the current declarative panel UI schema version.
	PanelUISchemaVersion = "1"

	PanelRendererMetrics    = "metrics"
	PanelRendererKeyValue   = "key_value"
	PanelRendererIdentity   = "identity"
	PanelRendererTable      = "table"
	PanelRendererStatusList = "status_list"
	PanelRendererTimeline   = "timeline"
	PanelRendererJSON       = "json"
	PanelRendererStack      = "stack"

	// PanelStackLayoutGrid flows a stack view's sections into responsive
	// columns instead of stacking each section at full width.
	PanelStackLayoutGrid = "grid"

	PanelCountArrayLength = "array_length"
	PanelCountObjectKeys  = "object_keys"
	PanelCountTruthy      = "truthy"
	PanelCountNumber      = "number"

	PanelFilterSearch   = "search"
	PanelFilterSelect   = "select"
	PanelFilterCheckbox = "checkbox"

	PanelEventReplace = "replace"
	PanelEventAppend  = "append"
	PanelEventMerge   = "merge"
	PanelEventUpsert  = "upsert"

	PanelActionLayoutList   = "list"
	PanelActionLayoutSelect = "select"
)

// PanelUI is a JSON-safe declarative UI schema for Go-registered panels.
type PanelUI struct {
	SchemaVersion string               `json:"schema_version"`
	Views         PanelUIViews         `json:"views"`
	Count         *PanelUICount        `json:"count,omitempty"`
	Filters       []PanelUIFilter      `json:"filters,omitempty"`
	Events        *PanelUIEventPolicy  `json:"events,omitempty"`
	ActionLayout  *PanelUIActionLayout `json:"action_layout,omitempty"`
	Actions       []PanelUIAction      `json:"actions,omitempty"`
	Metadata      map[string]any       `json:"metadata,omitempty"`
}

// PanelUIViews declares console and toolbar renderers.
type PanelUIViews struct {
	Console *PanelUIView `json:"console,omitempty"`
	Toolbar *PanelUIView `json:"toolbar,omitempty"`
}

// PanelUIView declares one renderer instance. Stack views may use Sections.
type PanelUIView struct {
	Renderer string         `json:"renderer"`
	Title    string         `json:"title,omitempty"`
	Bind     string         `json:"bind,omitempty"`
	Options  map[string]any `json:"options,omitempty"`
	Sections []PanelUIView  `json:"sections,omitempty"`
}

// PanelUICount declares badge/count behavior.
type PanelUICount struct {
	Bind  string `json:"bind,omitempty"`
	Mode  string `json:"mode,omitempty"`
	Label string `json:"label,omitempty"`
}

// PanelUIFilter declares a client-side console filter.
type PanelUIFilter struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Bind    string   `json:"bind,omitempty"`
	Options []string `json:"options,omitempty"`
}

// PanelUIEventPolicy declares how live events update panel data.
type PanelUIEventPolicy struct {
	Mode       string `json:"mode"`
	Bind       string `json:"bind,omitempty"`
	Key        string `json:"key,omitempty"`
	MaxEntries int    `json:"max_entries,omitempty"`
}

// PanelUIActionLayout declares how panel actions are presented.
type PanelUIActionLayout struct {
	Mode        string `json:"mode,omitempty"`
	PickerLabel string `json:"picker_label,omitempty"`
	EmptyText   string `json:"empty_text,omitempty"`
}

// PanelUIAction declares a UI action backed by a Go handler.
type PanelUIAction struct {
	ID              string               `json:"id"`
	Label           string               `json:"label"`
	SubmitLabel     string               `json:"submit_label,omitempty"`
	Kind            string               `json:"kind,omitempty"`
	ConfirmText     string               `json:"confirm_text,omitempty"`
	RequiresConfirm bool                 `json:"requires_confirm,omitempty"`
	Hidden          bool                 `json:"hidden,omitempty"`
	Refresh         bool                 `json:"refresh,omitempty"`
	UpdatePolicy    string               `json:"update_policy,omitempty"`
	Payload         map[string]any       `json:"payload,omitempty"`
	Fields          []PanelUIActionField `json:"fields,omitempty"`
	Form            *PanelUIActionForm   `json:"form,omitempty"`
}

// PanelUIActionForm carries trusted server-generated form markup. HTML must be
// produced by the named renderer; callers must never place operator-authored or
// command-authored raw markup in this contract.
type PanelUIActionForm struct {
	Renderer     string `json:"renderer"`
	OperationID  string `json:"operation_id"`
	HTML         string `json:"html"`
	ModelVersion string `json:"model_version,omitempty"`
	Sensitive    bool   `json:"sensitive,omitempty"`
}

// PanelUIActionField declares a typed input that is merged into an action payload.
type PanelUIActionField struct {
	Name         string                     `json:"name"`
	Label        string                     `json:"label,omitempty"`
	Kind         string                     `json:"kind,omitempty"`
	PayloadPath  string                     `json:"payload_path,omitempty"`
	Placeholder  string                     `json:"placeholder,omitempty"`
	Description  string                     `json:"description,omitempty"`
	Help         string                     `json:"help,omitempty"`
	Required     bool                       `json:"required,omitempty"`
	Sensitive    bool                       `json:"sensitive,omitempty"`
	Options      []string                   `json:"options,omitempty"`
	OptionItems  []PanelUIActionOption      `json:"option_items,omitempty"`
	OptionSource *PanelUIActionOptionSource `json:"option_source,omitempty"`
	Default      any                        `json:"default,omitempty"`
	DisplayHints map[string]any             `json:"display_hints,omitempty"`
}

// PanelUIActionOption preserves a stable submitted value separately from its
// operator-facing label and guidance. Options remains available on the field as
// a legacy value-only projection for older debug clients.
type PanelUIActionOption struct {
	Value       string         `json:"value"`
	Label       string         `json:"label,omitempty"`
	Description string         `json:"description,omitempty"`
	Disabled    bool           `json:"disabled,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// PanelUIActionOptionSource describes a request-scoped option source that the
// client may refresh. Params is declarative and JSON-safe; source execution is
// still authorized and matched to the registered command descriptor server-side.
type PanelUIActionOptionSource struct {
	ID         string         `json:"id"`
	Label      string         `json:"label,omitempty"`
	Dynamic    bool           `json:"dynamic,omitempty"`
	CacheScope string         `json:"cache_scope,omitempty"`
	Params     map[string]any `json:"params,omitempty"`
}

// PanelUIColumn declares a table column option.
type PanelUIColumn struct {
	Label    string `json:"label"`
	Bind     string `json:"bind"`
	Format   string `json:"format,omitempty"`
	Width    string `json:"width,omitempty"`
	Severity string `json:"severity,omitempty"`
}

// PanelUIField declares a key/value field option.
type PanelUIField struct {
	Label  string `json:"label"`
	Bind   string `json:"bind"`
	Format string `json:"format,omitempty"`
	Empty  string `json:"empty,omitempty"`
}

// PanelUIMetric declares a metric tile option.
type PanelUIMetric struct {
	Label    string `json:"label"`
	Bind     string `json:"bind"`
	Format   string `json:"format,omitempty"`
	Severity string `json:"severity,omitempty"`
}

// NewPanelUI creates a panel UI schema with optional console and toolbar views.
func NewPanelUI(console, toolbar *PanelUIView) *PanelUI {
	return &PanelUI{
		SchemaVersion: PanelUISchemaVersion,
		Views: PanelUIViews{
			Console: console,
			Toolbar: toolbar,
		},
	}
}

// PanelView creates a renderer view bound to a payload path.
func PanelView(renderer, bind string) *PanelUIView {
	return &PanelUIView{Renderer: renderer, Bind: bind}
}

// MetricsView creates a metrics renderer view.
func MetricsView(bind string) *PanelUIView {
	return PanelView(PanelRendererMetrics, bind)
}

// KeyValueView creates a key/value renderer view.
func KeyValueView(bind string) *PanelUIView {
	return PanelView(PanelRendererKeyValue, bind)
}

// IdentityView creates a summary identity renderer view. It presents one
// primary title with an optional accent color, eyebrow, subtitle, and
// supporting chips so a panel can lead with the value operators scan first.
func IdentityView(bind string) *PanelUIView {
	return PanelView(PanelRendererIdentity, bind)
}

// GridStackView creates a stack view whose sections flow into responsive
// columns instead of stacking at full width.
func GridStackView(sections ...PanelUIView) *PanelUIView {
	view := StackView(sections...)
	view.Options = map[string]any{"layout": PanelStackLayoutGrid}
	return view
}

// TableView creates a table renderer view.
func TableView(bind string) *PanelUIView {
	return PanelView(PanelRendererTable, bind)
}

// StatusListView creates a status list renderer view.
func StatusListView(bind string) *PanelUIView {
	return PanelView(PanelRendererStatusList, bind)
}

// TimelineView creates a timeline renderer view.
func TimelineView(bind string) *PanelUIView {
	return PanelView(PanelRendererTimeline, bind)
}

// JSONView creates a JSON fallback renderer view.
func JSONView(bind string) *PanelUIView {
	return PanelView(PanelRendererJSON, bind)
}

// StackView creates a stack renderer view with child sections.
func StackView(sections ...PanelUIView) *PanelUIView {
	return &PanelUIView{Renderer: PanelRendererStack, Sections: append([]PanelUIView{}, sections...)}
}

// PanelActionRequest is sent to a registered action handler.
type PanelActionRequest struct {
	PanelID  string         `json:"panel_id"`
	ActionID string         `json:"action_id"`
	Payload  map[string]any `json:"payload,omitempty"`
}

// PanelActionResult is returned by panel action handlers.
type PanelActionResult struct {
	OK      bool              `json:"ok"`
	Message string            `json:"message,omitempty"`
	Data    any               `json:"data,omitempty"`
	Refresh bool              `json:"refresh,omitempty"`
	Event   *PanelActionEvent `json:"event,omitempty"`
	Errors  map[string]any    `json:"errors,omitempty"`
}

// PanelActionEvent allows action results to be applied like a live event.
type PanelActionEvent struct {
	Type    string `json:"type"`
	Payload any    `json:"payload,omitempty"`
}

// PanelConfig configures a server-side debug panel registration.
type PanelConfig struct {
	Label           string                        `json:"label"`
	Icon            string                        `json:"icon"`
	Span            int                           `json:"span"`
	SnapshotKey     string                        `json:"snapshot_key"`
	EventType       string                        `json:"event_type"`
	EventTypes      []string                      `json:"event_types"`
	Snapshot        PanelSnapshotFunc             `json:"snapshot"`
	Clear           PanelClearFunc                `json:"clear"`
	SupportsToolbar *bool                         `json:"supports_toolbar"`
	Category        string                        `json:"category"`
	Order           int                           `json:"order"`
	Version         string                        `json:"version"`
	Metadata        map[string]any                `json:"metadata"`
	UI              *PanelUI                      `json:"ui,omitempty"`
	Definition      PanelDefinitionFilter         `json:"-"`
	Actions         map[string]PanelActionHandler `json:"-"`
	ActionResolver  PanelActionHandlerResolver    `json:"-"`
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
	UI              *PanelUI       `json:"ui,omitempty"`
}

// PanelRegistration stores definition metadata and server hooks.
type PanelRegistration struct {
	Definition     PanelDefinition               `json:"definition"`
	Filter         PanelDefinitionFilter         `json:"-"`
	Snapshot       PanelSnapshotFunc             `json:"snapshot"`
	Clear          PanelClearFunc                `json:"clear"`
	Actions        map[string]PanelActionHandler `json:"-"`
	ActionResolver PanelActionHandlerResolver    `json:"-"`
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

// PanelDefinitionForContext retrieves panel metadata adapted for a request context.
func PanelDefinitionForContext(ctx context.Context, id string) (PanelDefinition, bool) {
	return defaultRegistry.DefinitionForContext(ctx, id)
}

// PanelDefinitions returns definitions for all registered panels.
func PanelDefinitions() []PanelDefinition {
	return defaultRegistry.Definitions()
}

// PanelDefinitionsWithContext returns definitions adapted for a request context.
func PanelDefinitionsWithContext(ctx context.Context) []PanelDefinition {
	return defaultRegistry.DefinitionsWithContext(ctx)
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

// DefinitionForContext returns a panel definition adapted for a request context.
func (r *PanelRegistry) DefinitionForContext(ctx context.Context, id string) (PanelDefinition, bool) {
	reg, ok := r.Registration(id)
	if !ok {
		return PanelDefinition{}, false
	}
	return reg.definitionForContext(ctx), true
}

// Definitions returns a sorted list of registered panel definitions.
func (r *PanelRegistry) Definitions() []PanelDefinition {
	return r.DefinitionsWithContext(context.Background())
}

// DefinitionsWithContext returns a sorted list of context-adapted panel definitions.
func (r *PanelRegistry) DefinitionsWithContext(ctx context.Context) []PanelDefinition {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	registrations := make([]PanelRegistration, 0, len(r.panels))
	for _, reg := range r.panels {
		registrations = append(registrations, reg)
	}
	r.mu.RUnlock()
	defs := make([]PanelDefinition, 0, len(registrations))
	for _, reg := range registrations {
		defs = append(defs, reg.definitionForContext(ctx))
	}
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
	if config.UI != nil {
		def.UI = normalizePanelUI(config.UI, config.Actions, config.ActionResolver != nil)
	}
	return PanelRegistration{
		Definition:     def,
		Filter:         config.Definition,
		Snapshot:       config.Snapshot,
		Clear:          config.Clear,
		Actions:        normalizeActionHandlers(config.Actions),
		ActionResolver: config.ActionResolver,
	}
}

// DefinitionForContext returns this registration's definition adapted for a request context.
func (r PanelRegistration) DefinitionForContext(ctx context.Context) PanelDefinition {
	return r.definitionForContext(ctx)
}

func (r PanelRegistration) definitionForContext(ctx context.Context) PanelDefinition {
	def := r.Definition
	if r.Filter != nil {
		filtered := r.Filter(ctx, def)
		if filtered.ID != "" {
			return filtered
		}
	}
	return def
}

// ActionHandlerForContext returns a handler only when the action is exposed by
// the current request-scoped definition. Fixed handlers are preferred; the
// resolver is consulted only when no fixed handler matches.
func (r PanelRegistration) ActionHandlerForContext(ctx context.Context, actionID string) PanelActionHandler {
	actionID = normalizeID(actionID)
	if actionID == "" || (len(r.Actions) == 0 && r.ActionResolver == nil) {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if !PanelDefinitionHasAction(r.definitionForContext(ctx), actionID) {
		return nil
	}
	if handler := panelActionHandlerFor(r.Actions, actionID); handler != nil {
		return handler
	}
	if r.ActionResolver == nil {
		return nil
	}
	return r.ActionResolver(ctx, actionID)
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
	maps.Copy(out, input)
	return out
}

//nolint:gocyclo // panel UI normalization handles a fixed legacy schema matrix in one place.
func normalizePanelUI(input *PanelUI, handlers map[string]PanelActionHandler, hasResolver bool) *PanelUI {
	if input == nil {
		return nil
	}
	ui := &PanelUI{
		SchemaVersion: strings.TrimSpace(input.SchemaVersion),
		Views: PanelUIViews{
			Console: normalizePanelUIView(input.Views.Console),
			Toolbar: normalizePanelUIView(input.Views.Toolbar),
		},
	}
	if ui.SchemaVersion == "" {
		ui.SchemaVersion = PanelUISchemaVersion
	}
	if ui.SchemaVersion != PanelUISchemaVersion {
		marker := &PanelUI{SchemaVersion: ui.SchemaVersion}
		if len(input.Metadata) > 0 {
			marker.Metadata = cloneJSONSafeMap(input.Metadata)
		}
		return marker
	}
	if input.Count != nil {
		if count := normalizePanelUICount(input.Count); count != nil {
			ui.Count = count
		}
	}
	for _, filter := range input.Filters {
		if normalized, ok := normalizePanelUIFilter(filter); ok {
			ui.Filters = append(ui.Filters, normalized)
		}
	}
	if input.Events != nil {
		if events := normalizePanelUIEventPolicy(input.Events); events != nil {
			ui.Events = events
		}
	}
	if input.ActionLayout != nil {
		if layout := normalizePanelUIActionLayout(input.ActionLayout); layout != nil {
			ui.ActionLayout = layout
		}
	}
	ui.Actions = normalizePanelUIActions(input.Actions, handlers, hasResolver)
	if len(input.Metadata) > 0 {
		ui.Metadata = cloneJSONSafeMap(input.Metadata)
	}
	if ui.Views.Console == nil && ui.Views.Toolbar == nil && ui.Count == nil && len(ui.Filters) == 0 && ui.Events == nil && len(ui.Actions) == 0 {
		return nil
	}
	return ui
}

func normalizePanelUIView(input *PanelUIView) *PanelUIView {
	if input == nil {
		return nil
	}
	renderer := normalizeRenderer(input.Renderer)
	if renderer == "" {
		return nil
	}
	view := &PanelUIView{
		Renderer: renderer,
		Title:    trimSafeText(input.Title),
		Bind:     normalizeBind(input.Bind),
	}
	if len(input.Options) > 0 {
		view.Options = cloneJSONSafeMap(input.Options)
	}
	for _, section := range input.Sections {
		if normalized := normalizePanelUIView(&section); normalized != nil {
			view.Sections = append(view.Sections, *normalized)
		}
	}
	return view
}

func normalizePanelUICount(input *PanelUICount) *PanelUICount {
	mode := normalizeCountMode(input.Mode)
	if mode == "" {
		mode = PanelCountArrayLength
	}
	return &PanelUICount{
		Bind:  normalizeBind(input.Bind),
		Mode:  mode,
		Label: trimSafeText(input.Label),
	}
}

func normalizePanelUIFilter(input PanelUIFilter) (PanelUIFilter, bool) {
	id := normalizeID(input.ID)
	kind := normalizeFilterKind(input.Kind)
	if id == "" || kind == "" {
		return PanelUIFilter{}, false
	}
	label := trimSafeText(input.Label)
	if label == "" {
		label = formatPanelLabel(id)
	}
	out := PanelUIFilter{
		ID:    id,
		Label: label,
		Kind:  kind,
		Bind:  normalizeBind(input.Bind),
	}
	for _, option := range input.Options {
		option = trimSafeText(option)
		if option != "" {
			out.Options = append(out.Options, option)
		}
	}
	if out.Kind == PanelFilterSelect && len(out.Options) == 0 {
		return PanelUIFilter{}, false
	}
	return out, true
}

func normalizePanelUIEventPolicy(input *PanelUIEventPolicy) *PanelUIEventPolicy {
	mode := normalizeEventPolicyMode(input.Mode)
	if mode == "" {
		mode = PanelEventReplace
	}
	out := &PanelUIEventPolicy{
		Mode:       mode,
		Bind:       normalizeBind(input.Bind),
		Key:        normalizeBind(input.Key),
		MaxEntries: input.MaxEntries,
	}
	if out.MaxEntries < 0 {
		out.MaxEntries = 0
	}
	if out.Mode == PanelEventUpsert && out.Key == "" {
		return nil
	}
	return out
}

func normalizePanelUIActionLayout(input *PanelUIActionLayout) *PanelUIActionLayout {
	mode := normalizeID(input.Mode)
	switch mode {
	case "", PanelActionLayoutList:
		mode = PanelActionLayoutList
	case PanelActionLayoutSelect:
	default:
		return nil
	}
	return &PanelUIActionLayout{
		Mode:        mode,
		PickerLabel: trimSafeText(input.PickerLabel),
		EmptyText:   trimSafeText(input.EmptyText),
	}
}

func normalizePanelUIActions(actions []PanelUIAction, handlers map[string]PanelActionHandler, hasResolver bool) []PanelUIAction {
	if len(actions) == 0 || (len(handlers) == 0 && !hasResolver) {
		return nil
	}
	seen := map[string]bool{}
	out := make([]PanelUIAction, 0, len(actions))
	for _, action := range actions {
		id := normalizeID(action.ID)
		if id == "" || seen[id] {
			continue
		}
		if panelActionHandlerFor(handlers, id) == nil && !hasResolver {
			continue
		}
		label := trimSafeText(action.Label)
		if label == "" {
			label = formatPanelLabel(id)
		}
		seen[id] = true
		out = append(out, PanelUIAction{
			ID:              id,
			Label:           label,
			SubmitLabel:     trimSafeText(action.SubmitLabel),
			Kind:            normalizeID(action.Kind),
			ConfirmText:     trimSafeText(action.ConfirmText),
			RequiresConfirm: action.RequiresConfirm,
			Hidden:          action.Hidden,
			Refresh:         action.Refresh,
			UpdatePolicy:    normalizeEventPolicyMode(action.UpdatePolicy),
			Payload:         cloneJSONSafeMap(action.Payload),
			Fields:          normalizePanelUIActionFields(action.Fields),
			Form:            normalizePanelUIActionForm(action.Form),
		})
	}
	return out
}

func normalizePanelUIActionForm(input *PanelUIActionForm) *PanelUIActionForm {
	if input == nil {
		return nil
	}
	renderer := normalizeID(input.Renderer)
	operationID := strings.TrimSpace(input.OperationID)
	if renderer == "" || operationID == "" {
		return nil
	}
	return &PanelUIActionForm{
		Renderer:     renderer,
		OperationID:  operationID,
		HTML:         input.HTML,
		ModelVersion: trimSafeText(input.ModelVersion),
		Sensitive:    input.Sensitive,
	}
}

func normalizePanelUIActionFields(fields []PanelUIActionField) []PanelUIActionField {
	if len(fields) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]PanelUIActionField, 0, len(fields))
	for _, field := range fields {
		name := normalizeID(field.Name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		label := trimSafeText(field.Label)
		if label == "" {
			label = formatPanelLabel(name)
		}
		options := make([]string, 0, len(field.Options))
		for _, option := range field.Options {
			option = trimSafeText(option)
			if option != "" {
				options = append(options, option)
			}
		}
		normalized := PanelUIActionField{
			Name:         name,
			Label:        label,
			Kind:         normalizeID(field.Kind),
			PayloadPath:  trimSafeText(field.PayloadPath),
			Placeholder:  trimSafeText(field.Placeholder),
			Description:  trimSafeText(field.Description),
			Help:         trimSafeText(field.Help),
			Required:     field.Required,
			Sensitive:    field.Sensitive,
			Options:      options,
			OptionItems:  normalizePanelUIActionOptions(field.OptionItems),
			OptionSource: normalizePanelUIActionOptionSource(field.OptionSource),
			DisplayHints: cloneJSONSafeMap(field.DisplayHints),
		}
		if defaultValue, ok := cloneJSONSafeValue(field.Default); ok && !field.Sensitive {
			if text, isText := defaultValue.(string); isText && text == "" {
				out = append(out, normalized)
				continue
			}
			normalized.Default = defaultValue
		}
		out = append(out, normalized)
	}
	return out
}

func normalizePanelUIActionOptions(options []PanelUIActionOption) []PanelUIActionOption {
	if len(options) == 0 {
		return nil
	}
	out := make([]PanelUIActionOption, 0, len(options))
	seen := map[string]bool{}
	for _, option := range options {
		value := trimSafeText(option.Value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		label := trimSafeText(option.Label)
		if label == "" {
			label = value
		}
		out = append(out, PanelUIActionOption{
			Value:       value,
			Label:       label,
			Description: trimSafeText(option.Description),
			Disabled:    option.Disabled,
			Metadata:    cloneJSONSafeMap(option.Metadata),
		})
	}
	return out
}

func normalizePanelUIActionOptionSource(source *PanelUIActionOptionSource) *PanelUIActionOptionSource {
	if source == nil {
		return nil
	}
	id := normalizeID(source.ID)
	if id == "" {
		return nil
	}
	return &PanelUIActionOptionSource{
		ID:         id,
		Label:      trimSafeText(source.Label),
		Dynamic:    source.Dynamic,
		CacheScope: normalizeID(source.CacheScope),
		Params:     cloneJSONSafeMap(source.Params),
	}
}

// PanelDefinitionHasAction reports whether a request-scoped panel definition exposes an action.
func PanelDefinitionHasAction(def PanelDefinition, actionID string) bool {
	actionID = normalizeID(actionID)
	if actionID == "" || def.UI == nil || len(def.UI.Actions) == 0 {
		return false
	}
	for _, action := range def.UI.Actions {
		if normalizeID(action.ID) == actionID {
			return true
		}
	}
	return false
}

func normalizeActionHandlers(handlers map[string]PanelActionHandler) map[string]PanelActionHandler {
	if len(handlers) == 0 {
		return nil
	}
	out := map[string]PanelActionHandler{}
	for id, handler := range handlers {
		id = normalizeID(id)
		if id == "" || handler == nil {
			continue
		}
		out[id] = handler
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func panelActionHandlerFor(handlers map[string]PanelActionHandler, actionID string) PanelActionHandler {
	if len(handlers) == 0 {
		return nil
	}
	actionID = normalizeID(actionID)
	if actionID == "" {
		return nil
	}
	if handler := handlers[actionID]; handler != nil {
		return handler
	}
	for id, handler := range handlers {
		if normalizeID(id) == actionID {
			return handler
		}
	}
	return nil
}

func normalizeRenderer(value string) string {
	switch normalizeID(value) {
	case PanelRendererMetrics:
		return PanelRendererMetrics
	case PanelRendererKeyValue:
		return PanelRendererKeyValue
	case PanelRendererIdentity:
		return PanelRendererIdentity
	case PanelRendererTable:
		return PanelRendererTable
	case PanelRendererStatusList:
		return PanelRendererStatusList
	case PanelRendererTimeline:
		return PanelRendererTimeline
	case PanelRendererJSON:
		return PanelRendererJSON
	case PanelRendererStack:
		return PanelRendererStack
	default:
		return ""
	}
}

func normalizeCountMode(value string) string {
	switch normalizeID(value) {
	case PanelCountArrayLength:
		return PanelCountArrayLength
	case PanelCountObjectKeys:
		return PanelCountObjectKeys
	case PanelCountTruthy:
		return PanelCountTruthy
	case PanelCountNumber:
		return PanelCountNumber
	default:
		return ""
	}
}

func normalizeFilterKind(value string) string {
	switch normalizeID(value) {
	case PanelFilterSearch:
		return PanelFilterSearch
	case PanelFilterSelect:
		return PanelFilterSelect
	case PanelFilterCheckbox:
		return PanelFilterCheckbox
	default:
		return ""
	}
}

func normalizeEventPolicyMode(value string) string {
	switch normalizeID(value) {
	case PanelEventReplace:
		return PanelEventReplace
	case PanelEventAppend:
		return PanelEventAppend
	case PanelEventMerge:
		return PanelEventMerge
	case PanelEventUpsert:
		return PanelEventUpsert
	default:
		return ""
	}
}

func normalizeBind(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.ContainsAny(value, "<>") {
		return ""
	}
	return strings.TrimPrefix(value, "$.")
}

func trimSafeText(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, "<>") {
		return ""
	}
	return value
}

func cloneJSONSafeMap(input map[string]any) map[string]any {
	if len(input) == 0 {
		return nil
	}
	out := map[string]any{}
	for key, value := range input {
		key = trimSafeText(key)
		if key == "" {
			continue
		}
		if cloned, ok := cloneJSONSafeValue(value); ok {
			out[key] = cloned
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneJSONSafeValue(value any) (any, bool) {
	switch typed := value.(type) {
	case nil, bool, float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, string:
		if text, ok := typed.(string); ok {
			return trimSafeText(text), true
		}
		return typed, true
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			if cloned, ok := cloneJSONSafeValue(item); ok {
				out = append(out, cloned)
			}
		}
		return out, true
	case []string:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			if cloned, ok := cloneJSONSafeValue(item); ok {
				out = append(out, cloned)
			}
		}
		return out, true
	case []map[string]any:
		// Declarative option lists (table columns, key/value fields, metric
		// tiles, identity chips) are naturally written as []map[string]any in
		// Go. Without this case they fall through to the default and the whole
		// option is dropped, silently degrading a panel to derived labels.
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			cloned := cloneJSONSafeMap(item)
			if cloned != nil {
				out = append(out, cloned)
			}
		}
		return out, true
	case map[string]any:
		return cloneJSONSafeMap(typed), true
	default:
		return nil, false
	}
}
