package admin

import (
	"context"
	"errors"
	"strings"

	crud "github.com/goliatone/go-crud"
	router "github.com/goliatone/go-router"
)

// PanelBuilder configures a panel before registration.
type PanelBuilder struct {
	name                           string
	repo                           Repository
	listFields                     []Field
	formFields                     []Field
	formSchema                     map[string]any
	detailFields                   []Field
	filters                        []Filter
	actions                        []Action
	bulkActions                    []Action
	subresources                   []PanelSubresource
	tabs                           []PanelTab
	hooks                          PanelHooks
	permissions                    PanelPermissions
	useBlocks                      bool
	useSEO                         bool
	treeView                       bool
	authorizer                     Authorizer
	commandBus                     *CommandBus
	activity                       ActivitySink
	workflow                       WorkflowEngine
	workflowSet                    bool
	workflowAuth                   WorkflowAuthorizer
	translationPolicy              TranslationPolicy
	translationPolicySet           bool
	translationQueueAutoCreateHook TranslationQueueAutoCreateHook
	uiRouteMode                    PanelUIRouteMode
	entryMode                      PanelEntryMode
}

// Panel represents a registered panel.
type Panel struct {
	name                           string
	repo                           Repository
	listFields                     []Field
	formFields                     []Field
	formSchema                     map[string]any
	detailFields                   []Field
	filters                        []Filter
	actions                        []Action
	bulkActions                    []Action
	subresources                   []PanelSubresource
	tabs                           []PanelTab
	hooks                          PanelHooks
	permissions                    PanelPermissions
	useBlocks                      bool
	useSEO                         bool
	treeView                       bool
	authorizer                     Authorizer
	commandBus                     *CommandBus
	activity                       ActivitySink
	workflow                       WorkflowEngine
	workflowAuth                   WorkflowAuthorizer
	translationPolicy              TranslationPolicy
	translationQueueAutoCreateHook TranslationQueueAutoCreateHook
	uiRouteMode                    PanelUIRouteMode
	entryMode                      PanelEntryMode
}

// PanelUIRouteMode declares who owns the panel's HTML UI route surface.
type PanelUIRouteMode string

const (
	// PanelUIRouteModeCanonical means generic canonical UI routes may be auto-wired.
	PanelUIRouteModeCanonical PanelUIRouteMode = "canonical"
	// PanelUIRouteModeCustom means module-specific handlers own the panel UI routes.
	PanelUIRouteModeCustom PanelUIRouteMode = "custom"
)

// PanelEntryMode declares which surface a panel should use as its canonical
// entry point when the base panel route (for example /admin/<panel>) is opened.
type PanelEntryMode string

const (
	// PanelEntryModeList renders the panel list/datagrid view.
	PanelEntryModeList PanelEntryMode = "list"
	// PanelEntryModeDetailCurrentUser renders the detail view for the current
	// authenticated user ID from request context.
	PanelEntryModeDetailCurrentUser PanelEntryMode = "detail_current_user"
)

// Repository provides CRUD operations for panel data.
type Repository interface {
	List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
	Get(ctx context.Context, id string) (map[string]any, error)
	Create(ctx context.Context, record map[string]any) (map[string]any, error)
	Update(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	Delete(ctx context.Context, id string) error
}

// Standard errors to allow HTTP helpers to map to status codes.
var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound  = errors.New("not found")
)

// ListOptions holds pagination and filtering input.
type ListOptions struct {
	Page       int
	PerPage    int
	SortBy     string
	SortDesc   bool
	Filters    map[string]any
	Predicates []ListPredicate
	Search     string
}

// ListPredicate defines an operator-aware list filter predicate.
type ListPredicate struct {
	Field    string   `json:"field"`
	Operator string   `json:"operator"`
	Values   []string `json:"values,omitempty"`
}

// Field describes a panel field.
type Field struct {
	Name       string   `json:"name"`
	Label      string   `json:"label"`
	LabelKey   string   `json:"label_key,omitempty"`
	Type       string   `json:"type"`
	Required   bool     `json:"required"`
	ReadOnly   bool     `json:"read_only"`
	Hidden     bool     `json:"hidden"`
	Options    []Option `json:"options,omitempty"`
	Validation string   `json:"validation,omitempty"`
}

// Option is a select/choice option.
type Option struct {
	Value    any    `json:"value"`
	Label    string `json:"label"`
	LabelKey string `json:"label_key,omitempty"`
}

// PanelSubresource defines a panel-owned HTTP subresource endpoint
// addressable as /:panel/:id/:name/:value.
type PanelSubresource struct {
	Name       string `json:"name"`
	Label      string `json:"label,omitempty"`
	Method     string `json:"method,omitempty"`
	Permission string `json:"permission,omitempty"`
}

// PanelSubresourceRepository resolves panel subresource payloads.
// Responses are JSON encoded by the default panel route handler.
type PanelSubresourceRepository interface {
	ResolvePanelSubresource(ctx context.Context, id, subresource, value string) (any, error)
}

// PanelSubresourceResponder writes panel subresource responses directly.
// This is useful for non-JSON responses such as binary file downloads.
type PanelSubresourceResponder interface {
	ServePanelSubresource(ctx AdminContext, c router.Context, id, subresource, value string) error
}

// Filter defines a filter input.
type Filter struct {
	Name            string   `json:"name"`
	Label           string   `json:"label,omitempty"`
	LabelKey        string   `json:"label_key,omitempty"`
	Type            string   `json:"type"`
	Operators       []string `json:"operators,omitempty"`
	DefaultOperator string   `json:"default_operator,omitempty"`
	Options         []Option `json:"options,omitempty"`
}

type ActionScope string

const (
	ActionScopeAny    ActionScope = "all"
	ActionScopeRow    ActionScope = "row"
	ActionScopeDetail ActionScope = "detail"
	ActionScopeBulk   ActionScope = "bulk"
)

// Action describes an action or bulk action linked to a command handler.
type Action struct {
	Name             string         `json:"name"`
	Label            string         `json:"label,omitempty"`
	LabelKey         string         `json:"label_key,omitempty"`
	CommandName      string         `json:"command_name"`
	Permission       string         `json:"permission,omitempty"`
	Type             string         `json:"type,omitempty"`
	Href             string         `json:"href,omitempty"`
	Order            int            `json:"order,omitempty"`
	Scope            ActionScope    `json:"scope,omitempty"`
	ContextRequired  []string       `json:"context_required,omitempty"`
	Icon             string         `json:"icon,omitempty"`
	Confirm          string         `json:"confirm,omitempty"`
	Variant          string         `json:"variant,omitempty"`
	Overflow         bool           `json:"overflow,omitempty"`
	Idempotent       bool           `json:"idempotent,omitempty"`
	IdempotencyField string         `json:"idempotency_field,omitempty"`
	PayloadRequired  []string       `json:"payload_required,omitempty"`
	PayloadSchema    map[string]any `json:"payload_schema,omitempty"`
}

// PanelPermissions declares resource actions.
type PanelPermissions struct {
	View   string
	Create string
	Edit   string
	Delete string
}

// PanelHooks contains lifecycle callbacks.
type PanelHooks struct {
	BeforeCreate       func(ctx AdminContext, record map[string]any) error
	AfterCreate        func(ctx AdminContext, record map[string]any) error
	BeforeUpdate       func(ctx AdminContext, record map[string]any) error
	BeforeUpdateWithID func(ctx AdminContext, id string, record map[string]any) error
	AfterUpdate        func(ctx AdminContext, record map[string]any) error
	BeforeDelete       func(ctx AdminContext, id string) error
	AfterDelete        func(ctx AdminContext, id string) error
}

// WorkflowAuthorizer optionally guards workflow transitions.
type WorkflowAuthorizer interface {
	CanTransition(ctx context.Context, input TransitionInput) bool
}

// Schema renders list/form/detail schema descriptions.
type Schema struct {
	ListFields   []Field                      `json:"list_fields"`
	FormFields   []Field                      `json:"form_fields"`
	DetailFields []Field                      `json:"detail_fields"`
	Filters      []Filter                     `json:"filters,omitempty"`
	Actions      []Action                     `json:"actions,omitempty"`
	BulkActions  []Action                     `json:"bulk_actions,omitempty"`
	Subresources []PanelSubresource           `json:"subresources,omitempty"`
	Tabs         []PanelTab                   `json:"tabs,omitempty"`
	FormSchema   map[string]any               `json:"form_schema,omitempty"`
	UseBlocks    bool                         `json:"use_blocks,omitempty"`
	UseSEO       bool                         `json:"use_seo,omitempty"`
	TreeView     bool                         `json:"tree_view,omitempty"`
	Permissions  PanelPermissions             `json:"permissions,omitempty"`
	Theme        map[string]map[string]string `json:"theme,omitempty"`
	Export       *ExportConfig                `json:"export,omitempty"`
	Bulk         *BulkConfig                  `json:"bulk,omitempty"`
	Media        *MediaConfig                 `json:"media,omitempty"`
}

// ExportConfig captures export metadata for UI consumers.
type ExportConfig struct {
	Definition string `json:"definition"`
	Variant    string `json:"variant,omitempty"`
	Endpoint   string `json:"endpoint"`
}

// BulkConfig captures bulk endpoint metadata and capabilities.
type BulkConfig struct {
	Endpoint         string `json:"endpoint"`
	SupportsRollback bool   `json:"supports_rollback,omitempty"`
}

// MediaConfig surfaces media library configuration for form widgets.
type MediaConfig struct {
	LibraryPath string `json:"library_path"`
}

// WithRepository sets the panel repository.
func (b *PanelBuilder) WithRepository(repo Repository) *PanelBuilder {
	b.repo = repo
	return b
}

// WithCRUDService configures the panel to use a go-crud service (Bun-backed).
func (b *PanelBuilder) WithCRUDService(service crud.Service[map[string]any]) *PanelBuilder {
	if service != nil {
		b.repo = NewCRUDRepositoryAdapter(service)
	}
	return b
}

// ListFields configures list fields.
func (b *PanelBuilder) ListFields(fields ...Field) *PanelBuilder {
	b.listFields = append([]Field{}, fields...)
	return b
}

// FormFields configures form fields.
func (b *PanelBuilder) FormFields(fields ...Field) *PanelBuilder {
	b.formFields = append([]Field{}, fields...)
	return b
}

// FormSchema overrides the generated form schema for the panel.
func (b *PanelBuilder) FormSchema(schema map[string]any) *PanelBuilder {
	b.formSchema = cloneAnyMap(schema)
	return b
}

// DetailFields configures detail fields.
func (b *PanelBuilder) DetailFields(fields ...Field) *PanelBuilder {
	b.detailFields = append([]Field{}, fields...)
	return b
}

// Filters sets filters.
func (b *PanelBuilder) Filters(filters ...Filter) *PanelBuilder {
	b.filters = append([]Filter{}, filters...)
	return b
}

// Actions sets row-level actions.
func (b *PanelBuilder) Actions(actions ...Action) *PanelBuilder {
	b.actions = append([]Action{}, actions...)
	return b
}

// BulkActions sets bulk actions.
func (b *PanelBuilder) BulkActions(actions ...Action) *PanelBuilder {
	b.bulkActions = append([]Action{}, actions...)
	return b
}

// Subresources sets panel subresource route declarations.
func (b *PanelBuilder) Subresources(subresources ...PanelSubresource) *PanelBuilder {
	b.subresources = clonePanelSubresources(normalizePanelSubresources(subresources))
	return b
}

// Tabs sets owner tabs for the panel.
func (b *PanelBuilder) Tabs(tabs ...PanelTab) *PanelBuilder {
	b.tabs = append([]PanelTab{}, tabs...)
	return b
}

// Hooks sets lifecycle hooks.
func (b *PanelBuilder) Hooks(h PanelHooks) *PanelBuilder {
	b.hooks = h
	return b
}

// Permissions sets panel permissions.
func (b *PanelBuilder) Permissions(p PanelPermissions) *PanelBuilder {
	b.permissions = p
	return b
}

// UseBlocks enables block editing for CMS-backed panels.
func (b *PanelBuilder) UseBlocks(enabled bool) *PanelBuilder {
	b.useBlocks = enabled
	return b
}

// UseSEO enables SEO metadata for CMS-backed panels.
func (b *PanelBuilder) UseSEO(enabled bool) *PanelBuilder {
	b.useSEO = enabled
	return b
}

// TreeView toggles hierarchical view.
func (b *PanelBuilder) TreeView(enabled bool) *PanelBuilder {
	b.treeView = enabled
	return b
}

// WithAuthorizer sets an authorizer for permission checks.
func (b *PanelBuilder) WithAuthorizer(a Authorizer) *PanelBuilder {
	b.authorizer = a
	return b
}

// WithCommandBus attaches the command bus.
func (b *PanelBuilder) WithCommandBus(bus *CommandBus) *PanelBuilder {
	b.commandBus = bus
	return b
}

// WithActivitySink wires the activity sink used to record panel events.
func (b *PanelBuilder) WithActivitySink(sink ActivitySink) *PanelBuilder {
	b.activity = sink
	return b
}

// WithWorkflow attaches a workflow engine to the panel.
func (b *PanelBuilder) WithWorkflow(w WorkflowEngine) *PanelBuilder {
	b.workflow = w
	b.workflowSet = true
	return b
}

// WithWorkflowAuthorizer attaches a workflow authorizer to the panel.
func (b *PanelBuilder) WithWorkflowAuthorizer(auth WorkflowAuthorizer) *PanelBuilder {
	b.workflowAuth = auth
	return b
}

// WithTranslationPolicy attaches a translation policy to the panel.
func (b *PanelBuilder) WithTranslationPolicy(policy TranslationPolicy) *PanelBuilder {
	b.translationPolicy = policy
	b.translationPolicySet = true
	return b
}

// WithTranslationQueueAutoCreateHook attaches a queue auto-create hook to the panel.
// When set, workflow transitions blocked by missing translations will automatically
// create/reuse queue assignments for the missing locales.
func (b *PanelBuilder) WithTranslationQueueAutoCreateHook(hook TranslationQueueAutoCreateHook) *PanelBuilder {
	b.translationQueueAutoCreateHook = hook
	return b
}

// WithUIRouteMode configures whether canonical panel UI routes should be auto-wired.
func (b *PanelBuilder) WithUIRouteMode(mode PanelUIRouteMode) *PanelBuilder {
	b.uiRouteMode = normalizePanelUIRouteMode(mode)
	return b
}

// WithEntryMode configures how the panel resolves its canonical entry route.
func (b *PanelBuilder) WithEntryMode(mode PanelEntryMode) *PanelBuilder {
	b.entryMode = normalizePanelEntryMode(mode)
	return b
}

// Build finalizes the panel.
func (b *PanelBuilder) Build() (*Panel, error) {
	if b.repo == nil {
		return nil, serviceUnavailableDomainError("repository required", map[string]any{
			"component": "panel_builder",
		})
	}
	if err := validatePanelCreateUIContract(b); err != nil {
		return nil, err
	}
	if b.workflow != nil {
		workflowHook := buildWorkflowUpdateHook(b.repo, b.workflow, b.workflowAuth, b.translationPolicy, b.name)
		b.hooks.BeforeUpdateWithID = chainBeforeUpdateWithID(b.hooks.BeforeUpdateWithID, workflowHook)
	}
	return &Panel{
		name:                           b.name,
		repo:                           b.repo,
		listFields:                     b.listFields,
		formFields:                     b.formFields,
		formSchema:                     cloneAnyMap(b.formSchema),
		detailFields:                   b.detailFields,
		filters:                        b.filters,
		actions:                        b.actions,
		bulkActions:                    b.bulkActions,
		subresources:                   clonePanelSubresources(normalizePanelSubresources(b.subresources)),
		tabs:                           b.tabs,
		hooks:                          b.hooks,
		permissions:                    b.permissions,
		useBlocks:                      b.useBlocks,
		useSEO:                         b.useSEO,
		treeView:                       b.treeView,
		authorizer:                     b.authorizer,
		commandBus:                     b.commandBus,
		activity:                       b.activity,
		workflow:                       b.workflow,
		workflowAuth:                   b.workflowAuth,
		translationPolicy:              b.translationPolicy,
		translationQueueAutoCreateHook: b.translationQueueAutoCreateHook,
		uiRouteMode:                    normalizePanelUIRouteMode(b.uiRouteMode),
		entryMode:                      normalizePanelEntryMode(b.entryMode),
	}, nil
}

func validatePanelCreateUIContract(b *PanelBuilder) error {
	if b == nil {
		return nil
	}
	if strings.TrimSpace(b.permissions.Create) == "" {
		return nil
	}
	if normalizePanelUIRouteMode(b.uiRouteMode) == PanelUIRouteModeCustom {
		return nil
	}
	if panelBuilderHasRenderableCreateSchema(b) {
		return nil
	}
	return validationDomainError(
		"panel create permission requires form fields or form schema for canonical ui routes",
		map[string]any{
			"component":   "panel_builder",
			"panel":       strings.TrimSpace(b.name),
			"permission":  strings.TrimSpace(b.permissions.Create),
			"field":       "permissions.create",
			"ui_route":    string(normalizePanelUIRouteMode(b.uiRouteMode)),
			"hint":        "set FormFields/FormSchema or mark panel UIRouteMode custom",
			"error_group": "panel.create_contract",
		},
	)
}

func panelBuilderHasRenderableCreateSchema(b *PanelBuilder) bool {
	if b == nil {
		return false
	}
	for _, field := range b.formFields {
		if strings.TrimSpace(field.Name) != "" {
			return true
		}
	}
	return panelSchemaHasRenderableProperties(b.formSchema)
}

func panelSchemaHasRenderableProperties(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	properties, ok := schema["properties"].(map[string]any)
	if !ok || len(properties) == 0 {
		return false
	}
	for key := range properties {
		if strings.TrimSpace(key) != "" {
			return true
		}
	}
	return false
}

// UIRouteMode returns the panel UI route ownership mode.
func (p *Panel) UIRouteMode() PanelUIRouteMode {
	if p == nil {
		return PanelUIRouteModeCanonical
	}
	return normalizePanelUIRouteMode(p.uiRouteMode)
}

// EntryMode returns the canonical panel entry behavior.
func (p *Panel) EntryMode() PanelEntryMode {
	if p == nil {
		return PanelEntryModeList
	}
	return normalizePanelEntryMode(p.entryMode)
}

func normalizePanelUIRouteMode(mode PanelUIRouteMode) PanelUIRouteMode {
	switch mode {
	case PanelUIRouteModeCustom:
		return PanelUIRouteModeCustom
	default:
		return PanelUIRouteModeCanonical
	}
}

func normalizePanelEntryMode(mode PanelEntryMode) PanelEntryMode {
	switch mode {
	case PanelEntryModeDetailCurrentUser:
		return PanelEntryModeDetailCurrentUser
	default:
		return PanelEntryModeList
	}
}

// Schema returns a basic schema description.
func (p *Panel) Schema() Schema {
	formSchema := buildFormSchema(p.formFields)
	if len(p.formSchema) > 0 {
		formSchema = cloneAnyMap(p.formSchema)
	}
	actions := normalizePanelActionsForSchema(p.actions, p.permissions)
	bulkActions := normalizeBulkActionsForSchema(p.bulkActions)
	return Schema{
		ListFields:   p.listFields,
		FormFields:   p.formFields,
		DetailFields: p.detailFields,
		Filters:      p.filters,
		Actions:      actions,
		BulkActions:  bulkActions,
		Subresources: p.Subresources(),
		Tabs:         append([]PanelTab{}, p.tabs...),
		FormSchema:   formSchema,
		UseBlocks:    p.useBlocks,
		UseSEO:       p.useSEO,
		TreeView:     p.treeView,
		Permissions:  p.permissions,
	}
}

// SchemaWithTheme attaches the resolved theme payload for UI renderers.
func (p *Panel) SchemaWithTheme(theme map[string]map[string]string) Schema {
	schema := p.Schema()
	if len(theme) > 0 {
		schema.Theme = theme
	}
	return schema
}

func normalizePanelActionsForSchema(actions []Action, perms PanelPermissions) []Action {
	out := make([]Action, 0, len(actions)+2)
	if !hasActionNamed(actions, "view") {
		out = append(out, normalizeActionContract(Action{
			Name:       "view",
			Label:      "View",
			Type:       "navigation",
			Scope:      ActionScopeRow,
			Permission: strings.TrimSpace(perms.View),
			Variant:    "secondary",
			Icon:       "eye",
		}, ActionScopeRow))
	}
	if !hasActionNamed(actions, "edit") {
		out = append(out, normalizeActionContract(Action{
			Name:       "edit",
			Label:      "Edit",
			Type:       "navigation",
			Scope:      ActionScopeRow,
			Permission: strings.TrimSpace(perms.Edit),
			Variant:    "primary",
			Icon:       "edit",
		}, ActionScopeRow))
	}
	for _, action := range actions {
		out = append(out, normalizeActionContract(action, ActionScopeRow))
	}
	return ensureActionOrderContract(out, 900)
}

func normalizeBulkActionsForSchema(actions []Action) []Action {
	out := make([]Action, 0, len(actions))
	for _, action := range actions {
		out = append(out, normalizeActionContract(action, ActionScopeBulk))
	}
	return ensureActionOrderContract(out, 1900)
}

func ensureActionOrderContract(actions []Action, fallbackStart int) []Action {
	if len(actions) == 0 {
		return nil
	}
	used := map[int]struct{}{}
	next := fallbackStart
	if next <= 0 {
		next = 1
	}
	for _, action := range actions {
		if action.Order <= 0 {
			continue
		}
		used[action.Order] = struct{}{}
	}
	for index := range actions {
		if actions[index].Order > 0 {
			continue
		}
		for {
			if _, exists := used[next]; exists {
				next++
				continue
			}
			actions[index].Order = next
			used[next] = struct{}{}
			next++
			break
		}
	}
	return actions
}

func normalizePanelSubresources(subresources []PanelSubresource) []PanelSubresource {
	if len(subresources) == 0 {
		return nil
	}
	out := make([]PanelSubresource, 0, len(subresources))
	seen := map[string]struct{}{}
	for _, subresource := range subresources {
		name := strings.TrimSpace(subresource.Name)
		if name == "" {
			continue
		}
		key := strings.ToLower(name)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, PanelSubresource{
			Name:       name,
			Label:      strings.TrimSpace(subresource.Label),
			Method:     normalizePanelSubresourceMethod(subresource.Method),
			Permission: strings.TrimSpace(subresource.Permission),
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func clonePanelSubresources(subresources []PanelSubresource) []PanelSubresource {
	if len(subresources) == 0 {
		return nil
	}
	out := make([]PanelSubresource, len(subresources))
	copy(out, subresources)
	return out
}

func normalizePanelSubresourceMethod(method string) string {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case "POST":
		return "POST"
	case "PUT":
		return "PUT"
	case "DELETE":
		return "DELETE"
	default:
		return "GET"
	}
}

func normalizeActionContract(action Action, defaultScope ActionScope) Action {
	action.Name = strings.TrimSpace(action.Name)
	action.Label = strings.TrimSpace(action.Label)
	action.LabelKey = strings.TrimSpace(action.LabelKey)
	action.CommandName = strings.TrimSpace(action.CommandName)
	action.Permission = strings.TrimSpace(action.Permission)
	action.Type = strings.TrimSpace(action.Type)
	action.Href = strings.TrimSpace(action.Href)
	action.Icon = strings.TrimSpace(action.Icon)
	action.Confirm = strings.TrimSpace(action.Confirm)
	action.Variant = strings.TrimSpace(action.Variant)
	action.IdempotencyField = strings.TrimSpace(action.IdempotencyField)
	action.Scope = normalizeActionScope(action.Scope, defaultScope)
	if action.Order <= 0 {
		action.Order = defaultActionOrder(action.Name)
	}
	action.ContextRequired = normalizeActionFieldList(action.ContextRequired)
	action.PayloadRequired = normalizeActionFieldList(action.PayloadRequired)
	if strings.EqualFold(action.Name, CreateTranslationKey) && !containsActionField(action.PayloadRequired, "locale") {
		action.PayloadRequired = append(action.PayloadRequired, "locale")
	}

	if action.Idempotent {
		field := actionIdempotencyField(action)
		if field != "" && !containsActionField(action.PayloadRequired, field) {
			action.PayloadRequired = append(action.PayloadRequired, field)
		}
	}
	if len(action.PayloadRequired) > 0 || len(action.PayloadSchema) > 0 {
		action.PayloadSchema = ensureActionPayloadSchemaContract(action.PayloadSchema, action.PayloadRequired)
	}
	if strings.EqualFold(action.Name, CreateTranslationKey) {
		action.PayloadSchema = ensureCreateTranslationPayloadSchemaContract(action.PayloadSchema)
	}
	return action
}

func normalizeActionScope(scope ActionScope, fallback ActionScope) ActionScope {
	normalized := strings.ToLower(strings.TrimSpace(string(scope)))
	switch ActionScope(normalized) {
	case ActionScopeAny, ActionScopeRow, ActionScopeDetail, ActionScopeBulk:
		return ActionScope(normalized)
	}
	if strings.TrimSpace(string(fallback)) == "" {
		return ActionScopeAny
	}
	return fallback
}

func normalizeActionFieldList(fields []string) []string {
	if len(fields) == 0 {
		return nil
	}
	out := make([]string, 0, len(fields))
	seen := map[string]struct{}{}
	for _, field := range fields {
		normalized := strings.TrimSpace(field)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func ensureActionPayloadSchemaContract(schema map[string]any, required []string) map[string]any {
	out := cloneAnyMap(schema)
	if out == nil {
		out = map[string]any{}
	}

	required = normalizeActionFieldList(required)
	if existingType, ok := out["type"].(string); !ok || strings.TrimSpace(existingType) == "" {
		out["type"] = "object"
	}

	props, ok := out["properties"].(map[string]any)
	if !ok || props == nil {
		props = map[string]any{}
	}
	out["properties"] = props

	requiredSet := map[string]struct{}{}
	requiredOut := []string{}
	appendRequired := func(field string) {
		normalized := strings.TrimSpace(field)
		if normalized == "" {
			return
		}
		if _, ok := requiredSet[normalized]; ok {
			return
		}
		requiredSet[normalized] = struct{}{}
		requiredOut = append(requiredOut, normalized)
	}
	switch existing := out["required"].(type) {
	case []string:
		for _, field := range existing {
			appendRequired(field)
		}
	case []any:
		for _, field := range existing {
			appendRequired(strings.TrimSpace(toString(field)))
		}
	}
	for _, field := range required {
		appendRequired(field)
	}

	for _, field := range requiredOut {
		prop, ok := props[field].(map[string]any)
		if !ok || prop == nil {
			prop = map[string]any{}
		}
		if _, ok := prop["type"].(string); !ok {
			prop["type"] = "string"
		}
		if _, ok := prop["title"].(string); !ok {
			prop["title"] = actionFieldTitle(field)
		}
		props[field] = prop
	}

	if len(requiredOut) > 0 {
		out["required"] = requiredOut
	}
	return out
}

func actionFieldTitle(name string) string {
	parts := strings.Fields(strings.ReplaceAll(strings.TrimSpace(name), "_", " "))
	if len(parts) == 0 {
		return ""
	}
	for i, part := range parts {
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		parts[i] = strings.ToUpper(lower[:1]) + lower[1:]
	}
	return strings.Join(parts, " ")
}

func hasActionNamed(actions []Action, name string) bool {
	target := strings.ToLower(strings.TrimSpace(name))
	if target == "" {
		return false
	}
	for _, action := range actions {
		if strings.ToLower(strings.TrimSpace(action.Name)) == target {
			return true
		}
	}
	return false
}

func containsActionField(fields []string, field string) bool {
	target := strings.TrimSpace(field)
	if target == "" {
		return false
	}
	for _, candidate := range fields {
		if strings.TrimSpace(candidate) == target {
			return true
		}
	}
	return false
}

func actionIdempotencyField(action Action) string {
	if field := strings.TrimSpace(action.IdempotencyField); field != "" {
		return field
	}
	return "idempotency_key"
}

func defaultActionOrder(name string) int {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "edit":
		return 10
	case "view":
		return 11
	case CreateTranslationKey:
		return 20
	case "request_approval", "submit_for_approval", "submit_review":
		return 30
	case "approve":
		return 35
	case "reject":
		return 36
	case "publish":
		return 40
	case "unpublish":
		return 50
	case "archive":
		return 60
	case "restore":
		return 61
	case "duplicate":
		return 70
	case "schedule":
		return 80
	case "delete":
		return 1000
	default:
		return 0
	}
}

func ensureCreateTranslationPayloadSchemaContract(schema map[string]any) map[string]any {
	out := cloneAnyMap(schema)
	if out == nil {
		out = map[string]any{}
	}
	out["type"] = "object"
	out["additionalProperties"] = false
	required := ensureActionPayloadRequiredFields(out["required"], "locale")
	if len(required) > 0 {
		out["required"] = required
	}
	props, _ := out["properties"].(map[string]any)
	if props == nil {
		props = map[string]any{}
	}
	localeProp, _ := props["locale"].(map[string]any)
	if localeProp == nil {
		localeProp = map[string]any{}
	}
	if _, ok := localeProp["type"].(string); !ok {
		localeProp["type"] = "string"
	}
	if _, ok := localeProp["title"].(string); !ok {
		localeProp["title"] = "Locale"
	}
	props["locale"] = localeProp
	delete(props, "available_locales")

	requiredForPublishDefault := actionSchemaLocaleEnum(localeProp["enum"])
	props["missing_locales"] = createTranslationLocaleArraySchema("Missing Locales", nil)
	props["existing_locales"] = createTranslationLocaleArraySchema("Existing Locales", nil)
	props["recommended_locale"] = map[string]any{
		"type":  "string",
		"title": "Recommended Locale",
	}
	props["required_for_publish"] = createTranslationLocaleArraySchema("Required for Publish", requiredForPublishDefault)
	out["properties"] = props

	out["x-translation-context"] = map[string]any{
		"missing_locales":      "translation_readiness.missing_required_locales",
		"existing_locales":     "translation_readiness.available_locales",
		"recommended_locale":   "translation_readiness.recommended_locale",
		"required_for_publish": "translation_readiness.required_locales",
	}
	return out
}

func createTranslationLocaleArraySchema(title string, defaultLocales []string) map[string]any {
	schema := map[string]any{
		"type":  "array",
		"title": strings.TrimSpace(title),
		"items": map[string]any{
			"type": "string",
		},
	}
	if len(defaultLocales) > 0 {
		schema["default"] = append([]string{}, defaultLocales...)
	}
	return schema
}

func ensureActionPayloadRequiredFields(raw any, fields ...string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	appendField := func(field string) {
		normalized := strings.TrimSpace(field)
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	switch typed := raw.(type) {
	case []string:
		for _, field := range typed {
			appendField(field)
		}
	case []any:
		for _, field := range typed {
			appendField(toString(field))
		}
	}
	for _, field := range fields {
		appendField(field)
	}
	return out
}

func actionSchemaLocaleEnum(raw any) []string {
	values := []string{}
	seen := map[string]struct{}{}
	appendLocale := func(locale string) {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		values = append(values, normalized)
	}
	switch typed := raw.(type) {
	case []string:
		for _, locale := range typed {
			appendLocale(locale)
		}
	case []any:
		for _, locale := range typed {
			appendLocale(toString(locale))
		}
	}
	if len(values) == 0 {
		return nil
	}
	return values
}

func filterActionsForScope(actions []Action, scope ActionScope) []Action {
	if len(actions) == 0 {
		return nil
	}
	target := normalizeActionScope(scope, ActionScopeAny)
	out := make([]Action, 0, len(actions))
	for _, action := range actions {
		actionScope := normalizeActionScope(action.Scope, ActionScopeAny)
		if actionScope == ActionScopeAny || actionScope == target {
			out = append(out, action)
		}
	}
	return out
}

func buildFormSchema(fields []Field) map[string]any {
	schema := map[string]any{
		"type":       "object",
		"properties": map[string]any{},
	}
	required := []string{}
	props := schema["properties"].(map[string]any)
	for _, f := range fields {
		prop := map[string]any{
			"type":         mapFieldType(f.Type),
			"title":        f.Label,
			"readOnly":     f.ReadOnly,
			"read_only":    f.ReadOnly,
			"x-hidden":     f.Hidden,
			"x-options":    f.Options,
			"x-validation": f.Validation,
		}
		if widget := mapWidget(f.Type); widget != "" {
			prop["x-formgen:widget"] = widget
		}
		if f.Validation != "" {
			prop["x-validation-source"] = "panel"
		}
		props[f.Name] = prop
		if f.Required {
			required = append(required, f.Name)
		}
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func mapFieldType(t string) string {
	switch t {
	case "number", "integer":
		return "number"
	case "boolean":
		return "boolean"
	case "array", "blocks", "block", "repeater", "block-library-picker", "block-library":
		return "array"
	case "object", "json":
		return "object"
	default:
		return "string"
	}
}

func mapWidget(t string) string {
	switch t {
	case "textarea":
		return "textarea"
	case "jsonschema", "json_schema", "schema":
		return "schema-editor"
	case "media", "media_picker":
		return "media-picker"
	case "block", "blocks":
		return "block"
	case "block-library-picker", "block-library":
		return "block-library-picker"
	default:
		return ""
	}
}

func applyMediaHints(schema *Schema, libraryPath string) {
	if schema == nil || schema.FormSchema == nil || libraryPath == "" {
		return
	}
	props, ok := schema.FormSchema["properties"].(map[string]any)
	if !ok {
		return
	}
	for _, field := range schema.FormFields {
		if field.Type != "media" && field.Type != "media_picker" {
			continue
		}
		prop, ok := props[field.Name].(map[string]any)
		if !ok {
			continue
		}
		if _, ok := prop["x-formgen:widget"]; !ok {
			prop["x-formgen:widget"] = "media-picker"
		}
		adminMeta, _ := prop["x-admin"].(map[string]any)
		if adminMeta == nil {
			adminMeta = map[string]any{}
		}
		adminMeta["media_library_path"] = libraryPath
		prop["x-admin"] = adminMeta
	}
}

// Get returns a single record if permitted.
func (p *Panel) Get(ctx AdminContext, id string) (map[string]any, error) {
	if p.permissions.View != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.View, p.name) {
			return nil, permissionDenied(p.permissions.View, p.name)
		}
	}
	return p.repo.Get(ctx.Context, id)
}

// List retrieves records with permissions enforced.
func (p *Panel) List(ctx AdminContext, opts ListOptions) ([]map[string]any, int, error) {
	if p.permissions.View != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.View, p.name) {
			return nil, 0, permissionDenied(p.permissions.View, p.name)
		}
	}
	return p.repo.List(ctx.Context, opts)
}

// Create inserts a record with hooks and permissions.
func (p *Panel) Create(ctx AdminContext, record map[string]any) (map[string]any, error) {
	if p.permissions.Create != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Create, p.name) {
			return nil, permissionDenied(p.permissions.Create, p.name)
		}
	}
	if p.hooks.BeforeCreate != nil {
		if err := p.hooks.BeforeCreate(ctx, record); err != nil {
			return nil, err
		}
	}
	res, err := p.repo.Create(ctx.Context, record)
	if err != nil {
		return nil, err
	}
	if p.hooks.AfterCreate != nil {
		if err := p.hooks.AfterCreate(ctx, res); err != nil {
			return nil, err
		}
	}
	p.recordActivity(ctx, "panel.create", map[string]any{
		"id":    extractRecordID(res),
		"panel": p.name,
	})
	return res, nil
}

// Update modifies a record with hooks and permissions.
func (p *Panel) Update(ctx AdminContext, id string, record map[string]any) (map[string]any, error) {
	if p.permissions.Edit != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Edit, p.name) {
			return nil, permissionDenied(p.permissions.Edit, p.name)
		}
	}
	if p.hooks.BeforeUpdateWithID != nil {
		if err := p.hooks.BeforeUpdateWithID(ctx, id, record); err != nil {
			p.recordBlockedTranslation(ctx, id, record, err)
			return nil, err
		}
	}
	if p.hooks.BeforeUpdate != nil {
		if err := p.hooks.BeforeUpdate(ctx, record); err != nil {
			p.recordBlockedTranslation(ctx, id, record, err)
			return nil, err
		}
	}
	res, err := p.repo.Update(ctx.Context, id, record)
	if err != nil {
		return nil, err
	}
	if p.hooks.AfterUpdate != nil {
		if err := p.hooks.AfterUpdate(ctx, res); err != nil {
			return nil, err
		}
	}
	p.recordActivity(ctx, "panel.update", map[string]any{
		"id":    extractRecordID(res, id),
		"panel": p.name,
	})
	return res, nil
}

// Delete removes a record with hooks and permissions.
func (p *Panel) Delete(ctx AdminContext, id string) error {
	if p.permissions.Delete != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Delete, p.name) {
			return permissionDenied(p.permissions.Delete, p.name)
		}
	}
	if p.hooks.BeforeDelete != nil {
		if err := p.hooks.BeforeDelete(ctx, id); err != nil {
			return err
		}
	}
	if err := p.repo.Delete(ctx.Context, id); err != nil {
		return err
	}
	if p.hooks.AfterDelete != nil {
		if err := p.hooks.AfterDelete(ctx, id); err != nil {
			return err
		}
	}
	p.recordActivity(ctx, "panel.delete", map[string]any{
		"id":    id,
		"panel": p.name,
	})
	return nil
}

// Subresources returns normalized panel subresource declarations.
func (p *Panel) Subresources() []PanelSubresource {
	if p == nil {
		return nil
	}
	return clonePanelSubresources(normalizePanelSubresources(p.subresources))
}

// ServeSubresource resolves a panel subresource request.
func (p *Panel) ServeSubresource(ctx AdminContext, c router.Context, id, subresource, value string) error {
	if p == nil {
		return ErrNotFound
	}
	if c == nil {
		return validationDomainError("subresource context required", map[string]any{
			"panel": p.name,
		})
	}
	spec, ok := p.findSubresource(subresource)
	if !ok {
		return ErrNotFound
	}
	if spec.Permission != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, spec.Permission, p.name) {
			return permissionDenied(spec.Permission, p.name)
		}
	}
	id = strings.TrimSpace(id)
	value = strings.TrimSpace(value)
	if responder, ok := p.repo.(PanelSubresourceResponder); ok && responder != nil {
		return responder.ServePanelSubresource(ctx, c, id, spec.Name, value)
	}
	if repo, ok := p.repo.(PanelSubresourceRepository); ok && repo != nil {
		payload, err := repo.ResolvePanelSubresource(ctx.Context, id, spec.Name, value)
		if err != nil {
			return err
		}
		return c.JSON(200, payload)
	}
	return ErrNotFound
}

// RunAction dispatches a command-backed action.
func (p *Panel) RunAction(ctx AdminContext, name string, payload map[string]any, ids []string) error {
	for _, action := range p.actions {
		if action.Name == name && action.CommandName != "" && p.commandBus != nil {
			if action.Permission != "" && p.authorizer != nil && !p.authorizer.Can(ctx.Context, action.Permission, p.name) {
				return permissionDenied(action.Permission, p.name)
			}
			err := p.commandBus.DispatchByName(ctx.Context, action.CommandName, payload, ids)
			if err == nil {
				p.recordActivity(ctx, "panel.action", map[string]any{
					"panel":  p.name,
					"action": name,
				})
			}
			return err
		}
	}
	return notFoundDomainError("action not found", map[string]any{
		"panel":  p.name,
		"action": name,
	})
}

// RunBulkAction dispatches a command-backed bulk action.
func (p *Panel) RunBulkAction(ctx AdminContext, name string, payload map[string]any, ids []string) error {
	for _, action := range p.bulkActions {
		if action.Name == name && action.CommandName != "" && p.commandBus != nil {
			if action.Permission != "" && p.authorizer != nil && !p.authorizer.Can(ctx.Context, action.Permission, p.name) {
				return permissionDenied(action.Permission, p.name)
			}
			err := p.commandBus.DispatchByName(ctx.Context, action.CommandName, payload, ids)
			if err == nil {
				p.recordActivity(ctx, "panel.bulk_action", map[string]any{
					"panel":  p.name,
					"action": name,
				})
			}
			return err
		}
	}
	return notFoundDomainError("bulk action not found", map[string]any{
		"panel":  p.name,
		"action": name,
	})
}

func (p *Panel) findAction(name string) (Action, bool) {
	for _, action := range p.actions {
		if action.Name == name {
			return action, true
		}
	}
	return Action{}, false
}

func (p *Panel) findBulkAction(name string) (Action, bool) {
	for _, action := range p.bulkActions {
		if action.Name == name {
			return action, true
		}
	}
	return Action{}, false
}

func (p *Panel) findSubresource(name string) (PanelSubresource, bool) {
	target := strings.ToLower(strings.TrimSpace(name))
	if target == "" {
		return PanelSubresource{}, false
	}
	for _, subresource := range p.Subresources() {
		if strings.ToLower(strings.TrimSpace(subresource.Name)) == target {
			return subresource, true
		}
	}
	return PanelSubresource{}, false
}

func (p *Panel) recordActivity(ctx AdminContext, action string, metadata map[string]any) {
	if p == nil || p.activity == nil {
		return
	}
	actor := ctx.UserID
	if actor == "" {
		actor = actorFromContext(ctx.Context)
	}
	entry := ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   "panel:" + p.name,
		Metadata: metadata,
	}
	_ = p.activity.Record(ctx.Context, entry)
}

func (p *Panel) recordBlockedTranslation(ctx AdminContext, id string, record map[string]any, err error) {
	if p == nil || err == nil {
		return
	}
	var missing MissingTranslationsError
	if !errors.As(err, &missing) {
		return
	}
	metadata := map[string]any{
		"panel":            p.name,
		"entity_id":        strings.TrimSpace(id),
		"transition":       strings.TrimSpace(toString(record["transition"])),
		"locale":           strings.TrimSpace(requestedLocaleFromPayload(record, localeFromContext(ctx.Context))),
		"environment":      strings.TrimSpace(resolvePolicyEnvironment(record, environmentFromContext(ctx.Context))),
		"policy_entity":    strings.TrimSpace(resolvePolicyEntity(record, p.name)),
		"translation_code": TextCodeTranslationMissing,
		"missing_locales":  normalizeLocaleList(missing.MissingLocales),
	}
	p.recordActivity(ctx, "panel.transition.blocked", metadata)
}

func extractRecordID(values ...any) string {
	for _, val := range values {
		switch v := val.(type) {
		case map[string]any:
			if id, ok := v["id"].(string); ok && id != "" {
				return id
			}
			if id, ok := v["ID"].(string); ok && id != "" {
				return id
			}
		case string:
			if v != "" {
				return v
			}
		}
	}
	return ""
}

func chainBeforeUpdateWithID(existing func(AdminContext, string, map[string]any) error, next func(AdminContext, string, map[string]any) error) func(AdminContext, string, map[string]any) error {
	if existing == nil {
		return next
	}
	if next == nil {
		return existing
	}
	return func(ctx AdminContext, id string, record map[string]any) error {
		if err := existing(ctx, id, record); err != nil {
			return err
		}
		return next(ctx, id, record)
	}
}

func buildWorkflowUpdateHook(repo Repository, workflow WorkflowEngine, auth WorkflowAuthorizer, policy TranslationPolicy, panelName string) func(AdminContext, string, map[string]any) error {
	if repo == nil || workflow == nil {
		return nil
	}
	return func(ctx AdminContext, id string, record map[string]any) error {
		if record == nil {
			return nil
		}
		if shouldSkipWorkflow(record) {
			return nil
		}
		targetState := strings.TrimSpace(toString(record["status"]))
		if targetState == "" {
			return nil
		}
		existing, err := repo.Get(ctx.Context, id)
		if err != nil {
			return err
		}
		currentState := strings.TrimSpace(toString(existing["status"]))
		if currentState == "" || currentState == targetState {
			return nil
		}
		input := TransitionInput{
			EntityID:     id,
			EntityType:   panelName,
			CurrentState: currentState,
			TargetState:  targetState,
		}
		if transition := strings.TrimSpace(toString(record["transition"])); transition != "" {
			input.Transition = transition
		}
		if input.Transition == "" {
			if transitions, err := workflow.AvailableTransitions(ctx.Context, panelName, currentState); err == nil {
				for _, t := range transitions {
					if strings.EqualFold(strings.TrimSpace(t.To), targetState) {
						input.Transition = t.Name
						break
					}
				}
			}
		}
		if auth != nil && !auth.CanTransition(ctx.Context, input) {
			return permissionDenied("workflow.transition", panelName)
		}
		if err := applyTranslationPolicy(ctx.Context, policy, buildTranslationPolicyInput(ctx.Context, panelName, id, currentState, input.Transition, record)); err != nil {
			return err
		}
		result, err := workflow.Transition(ctx.Context, input)
		if err != nil {
			return err
		}
		if result != nil && strings.TrimSpace(result.ToState) != "" {
			record["status"] = result.ToState
		}
		return nil
	}
}

func shouldSkipWorkflow(record map[string]any) bool {
	if record == nil {
		return false
	}
	if raw, ok := record["workflow_skip"]; ok && toBool(raw) {
		return true
	}
	if raw, ok := record["_workflow_skip"]; ok && toBool(raw) {
		return true
	}
	return false
}
