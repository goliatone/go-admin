package admin

import (
	"context"
	"errors"
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
	hooks        PanelHooks
	permissions  PanelPermissions
	useBlocks    bool
	useSEO       bool
	treeView     bool
	authorizer   Authorizer
	commandBus   *CommandRegistry
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
	hooks        PanelHooks
	permissions  PanelPermissions
	useBlocks    bool
	useSEO       bool
	treeView     bool
	authorizer   Authorizer
	commandBus   *CommandRegistry
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
	ListFields   []Field `json:"list_fields"`
	FormFields   []Field `json:"form_fields"`
	DetailFields []Field `json:"detail_fields"`
}

// WithRepository sets the panel repository.
func (b *PanelBuilder) WithRepository(repo Repository) *PanelBuilder {
	b.repo = repo
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

// WithCommandBus attaches the command registry.
func (b *PanelBuilder) WithCommandBus(bus *CommandRegistry) *PanelBuilder {
	b.commandBus = bus
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
		hooks:        b.hooks,
		permissions:  b.permissions,
		useBlocks:    b.useBlocks,
		useSEO:       b.useSEO,
		treeView:     b.treeView,
		authorizer:   b.authorizer,
		commandBus:   b.commandBus,
	}, nil
}

// Schema returns a basic schema description.
func (p *Panel) Schema() Schema {
	return Schema{
		ListFields:   p.listFields,
		FormFields:   p.formFields,
		DetailFields: p.detailFields,
	}
}

// List retrieves records with permissions enforced.
func (p *Panel) List(ctx AdminContext, opts ListOptions) ([]map[string]any, int, error) {
	if p.permissions.View != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.View, p.name) {
			return nil, 0, ErrForbidden
		}
	}
	return p.repo.List(ctx.Context, opts)
}

// Create inserts a record with hooks and permissions.
func (p *Panel) Create(ctx AdminContext, record map[string]any) (map[string]any, error) {
	if p.permissions.Create != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Create, p.name) {
			return nil, ErrForbidden
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
	return res, nil
}

// Update modifies a record with hooks and permissions.
func (p *Panel) Update(ctx AdminContext, id string, record map[string]any) (map[string]any, error) {
	if p.permissions.Edit != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Edit, p.name) {
			return nil, ErrForbidden
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
	return res, nil
}

// Delete removes a record with hooks and permissions.
func (p *Panel) Delete(ctx AdminContext, id string) error {
	if p.permissions.Delete != "" && p.authorizer != nil {
		if !p.authorizer.Can(ctx.Context, p.permissions.Delete, p.name) {
			return ErrForbidden
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
	return nil
}

// RunAction dispatches a command-backed action.
func (p *Panel) RunAction(ctx AdminContext, name string) error {
	for _, action := range p.actions {
		if action.Name == name && action.CommandName != "" && p.commandBus != nil {
			return p.commandBus.Dispatch(ctx.Context, action.CommandName)
		}
	}
	return errors.New("action not found")
}

// RunBulkAction dispatches a command-backed bulk action.
func (p *Panel) RunBulkAction(ctx AdminContext, name string) error {
	for _, action := range p.bulkActions {
		if action.Name == name && action.CommandName != "" && p.commandBus != nil {
			return p.commandBus.Dispatch(ctx.Context, action.CommandName)
		}
	}
	return errors.New("bulk action not found")
}
