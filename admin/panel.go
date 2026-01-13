package admin

import (
	"context"
	"errors"

	crud "github.com/goliatone/go-crud"
)

// PanelBuilder configures a panel before registration.
type PanelBuilder struct {
	name         string
	repo         Repository
	listFields   []Field
	formFields   []Field
	detailFields []Field
	filters      []Filter
	actions      []Action
	bulkActions  []Action
	tabs         []PanelTab
	hooks        PanelHooks
	permissions  PanelPermissions
	useBlocks    bool
	useSEO       bool
	treeView     bool
	authorizer   Authorizer
	commandBus   *CommandBus
	activity     ActivitySink
}

// Panel represents a registered panel.
type Panel struct {
	name         string
	repo         Repository
	listFields   []Field
	formFields   []Field
	detailFields []Field
	filters      []Filter
	actions      []Action
	bulkActions  []Action
	tabs         []PanelTab
	hooks        PanelHooks
	permissions  PanelPermissions
	useBlocks    bool
	useSEO       bool
	treeView     bool
	authorizer   Authorizer
	commandBus   *CommandBus
	activity     ActivitySink
}

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
	Page     int
	PerPage  int
	SortBy   string
	SortDesc bool
	Filters  map[string]any
	Search   string
}

// Field describes a panel field.
type Field struct {
	Name       string   `json:"name"`
	Label      string   `json:"label"`
	Type       string   `json:"type"`
	Required   bool     `json:"required"`
	ReadOnly   bool     `json:"read_only"`
	Hidden     bool     `json:"hidden"`
	Options    []Option `json:"options,omitempty"`
	Validation string   `json:"validation,omitempty"`
}

// Option is a select/choice option.
type Option struct {
	Value any    `json:"value"`
	Label string `json:"label"`
}

// Filter defines a filter input.
type Filter struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// Action describes an action or bulk action linked to a command handler.
type Action struct {
	Name        string
	CommandName string
	Permission  string
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
	BeforeCreate func(ctx AdminContext, record map[string]any) error
	AfterCreate  func(ctx AdminContext, record map[string]any) error
	BeforeUpdate func(ctx AdminContext, record map[string]any) error
	AfterUpdate  func(ctx AdminContext, record map[string]any) error
	BeforeDelete func(ctx AdminContext, id string) error
	AfterDelete  func(ctx AdminContext, id string) error
}

// Schema renders list/form/detail schema descriptions.
type Schema struct {
	ListFields   []Field                      `json:"list_fields"`
	FormFields   []Field                      `json:"form_fields"`
	DetailFields []Field                      `json:"detail_fields"`
	Filters      []Filter                     `json:"filters,omitempty"`
	Actions      []Action                     `json:"actions,omitempty"`
	BulkActions  []Action                     `json:"bulk_actions,omitempty"`
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

// Build finalizes the panel.
func (b *PanelBuilder) Build() (*Panel, error) {
	if b.repo == nil {
		return nil, errors.New("repository required")
	}
	return &Panel{
		name:         b.name,
		repo:         b.repo,
		listFields:   b.listFields,
		formFields:   b.formFields,
		detailFields: b.detailFields,
		filters:      b.filters,
		actions:      b.actions,
		bulkActions:  b.bulkActions,
		tabs:         b.tabs,
		hooks:        b.hooks,
		permissions:  b.permissions,
		useBlocks:    b.useBlocks,
		useSEO:       b.useSEO,
		treeView:     b.treeView,
		authorizer:   b.authorizer,
		commandBus:   b.commandBus,
		activity:     b.activity,
	}, nil
}

// Schema returns a basic schema description.
func (p *Panel) Schema() Schema {
	return Schema{
		ListFields:   p.listFields,
		FormFields:   p.formFields,
		DetailFields: p.detailFields,
		Filters:      p.filters,
		Actions:      p.actions,
		BulkActions:  p.bulkActions,
		Tabs:         append([]PanelTab{}, p.tabs...),
		FormSchema:   buildFormSchema(p.formFields),
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
	default:
		return "string"
	}
}

func mapWidget(t string) string {
	switch t {
	case "textarea":
		return "textarea"
	case "media", "media_picker":
		return "media-picker"
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
	if p.hooks.BeforeUpdate != nil {
		if err := p.hooks.BeforeUpdate(ctx, record); err != nil {
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
	return errors.New("action not found")
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
	return errors.New("bulk action not found")
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
