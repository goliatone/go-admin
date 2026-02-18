package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"
)

// CMSMenuRepository manages menu items for CMS-backed navigation.
type CMSMenuRepository struct {
	menu     CMSMenuService
	menuCode string
}

// NewCMSMenuRepository builds a menu repository with a default menu code.
func NewCMSMenuRepository(menu CMSMenuService, defaultCode string) *CMSMenuRepository {
	return &CMSMenuRepository{menu: menu, menuCode: defaultCode}
}

// List returns menu items for a menu code and locale.
func (r *CMSMenuRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.menu == nil {
		return nil, 0, ErrNotFound
	}
	code := r.menuCode
	if opts.Filters != nil {
		if c, ok := opts.Filters["menu"].(string); ok && c != "" {
			code = c
		}
	}
	locale := extractLocale(opts, "")
	menu, err := r.menu.Menu(ctx, code, locale)
	if err != nil {
		return nil, 0, err
	}
	flat := flattenMenuItems(menu.Items, "")
	search := strings.ToLower(extractSearch(opts))
	filtered := []MenuItem{}
	for _, item := range flat {
		if search != "" && !strings.Contains(strings.ToLower(item.Label), search) && !strings.Contains(strings.ToLower(item.Icon), search) {
			continue
		}
		filtered = append(filtered, item)
	}
	sliced, total := paginateMenu(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, item := range sliced {
		var position any
		if item.Position != nil {
			position = *item.Position
		}
		out = append(out, map[string]any{
			"id":          item.ID,
			"label":       item.Label,
			"icon":        item.Icon,
			"position":    position,
			"locale":      item.Locale,
			"menu":        code,
			"parent_id":   item.ParentID,
			"target":      item.Target,
			"badge":       primitives.CloneAnyMap(item.Badge),
			"permissions": append([]string{}, item.Permissions...),
			"classes":     append([]string{}, item.Classes...),
			"styles":      primitives.CloneStringMapNilOnEmpty(item.Styles),
		})
	}
	return out, total, nil
}

// Get returns a single menu item by id.
func (r *CMSMenuRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, item := range list {
		if item["id"] == id {
			return item, nil
		}
	}
	return nil, ErrNotFound
}

// Create inserts a menu item.
func (r *CMSMenuRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	if err := r.menu.AddMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	if item.ID == "" {
		menu, _ := r.menu.Menu(ctx, menuCode, "")
		for _, mi := range flattenMenuItems(menu.Items, "") {
			if mi.Label == item.Label && mi.Locale == item.Locale && mi.ParentID == item.ParentID {
				item.ID = mi.ID
				break
			}
		}
	}
	return r.Get(ctx, item.ID)
}

// Update modifies a menu item.
func (r *CMSMenuRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	item.ID = id
	if err := r.menu.UpdateMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

// Delete removes a menu item.
func (r *CMSMenuRepository) Delete(ctx context.Context, id string) error {
	if r.menu == nil {
		return ErrNotFound
	}
	return r.menu.DeleteMenuItem(ctx, r.menuCode, id)
}

// WidgetDefinitionRepository manages widget definitions through CMSWidgetService.
type WidgetDefinitionRepository struct {
	widgets CMSWidgetService
}

// NewWidgetDefinitionRepository builds a widget definition repository.
func NewWidgetDefinitionRepository(widgets CMSWidgetService) *WidgetDefinitionRepository {
	return &WidgetDefinitionRepository{widgets: widgets}
}

// List returns widget definitions.
func (r *WidgetDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, 0, err
	}
	defs := r.widgets.Definitions()
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetDefinition{}
	for _, def := range defs {
		if search != "" && !strings.Contains(strings.ToLower(def.Name), search) && !strings.Contains(strings.ToLower(def.Code), search) {
			continue
		}
		filtered = append(filtered, def)
	}
	sliced, total := paginateWidgetDefs(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		out = append(out, widgetDefinitionRecord(def))
	}
	return out, total, nil
}

// Get returns a widget definition by code.
func (r *WidgetDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	for _, def := range r.widgets.Definitions() {
		if def.Code == id {
			return widgetDefinitionRecord(def), nil
		}
	}
	return nil, ErrNotFound
}

// Create registers a widget definition.
func (r *WidgetDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	def := mapToWidgetDefinition(record)
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return widgetDefinitionRecord(def), nil
}

// Update updates a widget definition (overwrites).
func (r *WidgetDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	def := mapToWidgetDefinition(record)
	if def.Code == "" {
		def.Code = id
	}
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return widgetDefinitionRecord(def), nil
}

// Delete removes a widget definition.
func (r *WidgetDefinitionRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return err
	}
	return r.widgets.DeleteDefinition(ctx, id)
}

// WidgetInstanceRepository manages widget instances.
type WidgetInstanceRepository struct {
	widgets CMSWidgetService
}

// NewWidgetInstanceRepository builds a widget instance repository.
func NewWidgetInstanceRepository(widgets CMSWidgetService) *WidgetInstanceRepository {
	return &WidgetInstanceRepository{widgets: widgets}
}

// List returns widget instances filtered by area/page/locale.
func (r *WidgetInstanceRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, 0, err
	}
	filter := WidgetInstanceFilter{
		Area:   stringFromFilter(opts.Filters, "area"),
		PageID: stringFromFilter(opts.Filters, "page_id"),
		Locale: extractLocale(opts, ""),
	}
	instances, err := r.widgets.ListInstances(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetInstance{}
	for _, inst := range instances {
		if search != "" && !strings.Contains(strings.ToLower(inst.DefinitionCode), search) && !strings.Contains(strings.ToLower(inst.Area), search) {
			continue
		}
		filtered = append(filtered, inst)
	}
	sliced, total := paginateWidgetInstances(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, inst := range sliced {
		out = append(out, widgetInstanceRecord(inst))
	}
	return out, total, nil
}

// Get returns a widget instance by id.
func (r *WidgetInstanceRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instances, err := r.widgets.ListInstances(ctx, WidgetInstanceFilter{})
	if err != nil {
		return nil, err
	}
	for _, inst := range instances {
		if inst.ID == id {
			return widgetInstanceRecord(inst), nil
		}
	}
	return nil, ErrNotFound
}

// Create saves a widget instance.
func (r *WidgetInstanceRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instance := mapToWidgetInstance(record)
	created, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return widgetInstanceRecord(*created), nil
}

// Update modifies a widget instance.
func (r *WidgetInstanceRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instance := mapToWidgetInstance(record)
	instance.ID = id
	updated, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return widgetInstanceRecord(*updated), nil
}

// Delete removes a widget instance.
func (r *WidgetInstanceRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return err
	}
	return r.widgets.DeleteInstance(ctx, id)
}
