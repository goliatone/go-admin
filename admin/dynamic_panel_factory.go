package admin

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"sync"
)

// DynamicPanelFactory builds CRUD panels from CMS content types.
type DynamicPanelFactory struct {
	admin           *Admin
	schemaConverter *SchemaToFieldsConverter
	schemaValidator SchemaValidator
	hooks           DynamicPanelHooks
	basePath        string
	menuCode        string
	menuParent      string
	defaultLocale   string
	mu              sync.RWMutex
	slugByID        map[string]string
}

// DynamicPanelHooks exposes lifecycle callbacks for panel creation.
type DynamicPanelHooks struct {
	BeforeCreate func(ctx context.Context, contentType *CMSContentType) error
	AfterCreate  func(ctx context.Context, panel *Panel) error
	BeforeUpdate func(ctx context.Context, contentType *CMSContentType) error
	AfterUpdate  func(ctx context.Context, panel *Panel) error
}

// DynamicPanelFactoryOption customizes the factory.
type DynamicPanelFactoryOption func(*DynamicPanelFactory)

// NewDynamicPanelFactory constructs a factory for dynamic content type panels.
func NewDynamicPanelFactory(admin *Admin, opts ...DynamicPanelFactoryOption) *DynamicPanelFactory {
	factory := &DynamicPanelFactory{
		admin:         admin,
		slugByID:      map[string]string{},
		defaultLocale: "",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(factory)
		}
	}
	if factory.schemaConverter == nil {
		factory.schemaConverter = NewSchemaToFieldsConverter()
	}
	return factory
}

// WithDynamicPanelHooks sets lifecycle hooks for the factory.
func WithDynamicPanelHooks(hooks DynamicPanelHooks) DynamicPanelFactoryOption {
	return func(factory *DynamicPanelFactory) {
		factory.hooks = hooks
	}
}

// WithDynamicPanelSchemaConverter sets a schema converter.
func WithDynamicPanelSchemaConverter(converter *SchemaToFieldsConverter) DynamicPanelFactoryOption {
	return func(factory *DynamicPanelFactory) {
		factory.schemaConverter = converter
	}
}

// WithDynamicPanelSchemaValidator sets a schema validator.
func WithDynamicPanelSchemaValidator(validator SchemaValidator) DynamicPanelFactoryOption {
	return func(factory *DynamicPanelFactory) {
		factory.schemaValidator = validator
	}
}

// WithDynamicPanelMenu configures navigation defaults for dynamic panels.
func WithDynamicPanelMenu(basePath, menuCode, menuParent, locale string) DynamicPanelFactoryOption {
	return func(factory *DynamicPanelFactory) {
		if strings.TrimSpace(basePath) != "" {
			factory.basePath = basePath
		}
		if strings.TrimSpace(menuCode) != "" {
			factory.menuCode = menuCode
		}
		if strings.TrimSpace(menuParent) != "" {
			factory.menuParent = menuParent
		}
		if strings.TrimSpace(locale) != "" {
			factory.defaultLocale = locale
		}
	}
}

func (f *DynamicPanelFactory) resolveEnvironment(ctx context.Context, contentType *CMSContentType) string {
	if contentType != nil {
		if env := strings.TrimSpace(contentType.Environment); env != "" {
			return env
		}
	}
	return strings.TrimSpace(EnvironmentFromContext(ctx))
}

func (f *DynamicPanelFactory) panelName(slug, env string) string {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return ""
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return slug
	}
	return slug + "@" + env
}

func (f *DynamicPanelFactory) envKey(env, id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return ""
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return id
	}
	return env + "::" + id
}

// CreatePanelFromContentType generates and registers a panel for a content type.
func (f *DynamicPanelFactory) CreatePanelFromContentType(ctx context.Context, contentType *CMSContentType) (*Panel, error) {
	return f.createPanel(ctx, contentType, f.hooks.BeforeCreate, f.hooks.AfterCreate)
}

// RefreshPanel updates an existing panel when the content type changes.
func (f *DynamicPanelFactory) RefreshPanel(ctx context.Context, contentType *CMSContentType) error {
	if contentType == nil {
		return errors.New("content type is nil")
	}
	if f.hooks.BeforeUpdate != nil {
		if err := f.hooks.BeforeUpdate(ctx, contentType); err != nil {
			return err
		}
	}
	env := f.resolveEnvironment(ctx, contentType)
	panelName := f.panelName(contentType.Slug, env)
	if f.admin != nil {
		if previous := f.storedSlug(env, contentType.ID); previous != "" && previous != contentType.Slug {
			previousName := f.panelName(previous, env)
			if err := f.admin.UnregisterPanel(previousName); err != nil && !errors.Is(err, ErrNotFound) {
				return err
			}
			if err := f.removeFromNavigation(ctx, previous, env); err != nil && !errors.Is(err, ErrNotFound) {
				return err
			}
		}
		if err := f.admin.UnregisterPanel(panelName); err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
	}
	panel, err := f.createPanel(ctx, contentType, nil, nil)
	if err != nil {
		return err
	}
	if f.hooks.AfterUpdate != nil {
		return f.hooks.AfterUpdate(ctx, panel)
	}
	return nil
}

// RemovePanel removes a panel when a content type is deleted.
func (f *DynamicPanelFactory) RemovePanel(ctx context.Context, slugOrID string) error {
	if f.admin == nil {
		return errors.New("admin is nil")
	}
	slug := strings.TrimSpace(slugOrID)
	if slug == "" {
		return errors.New("content type slug required")
	}
	env := f.resolveEnvironment(ctx, nil)
	slug = f.resolveSlug(env, slug)
	panelName := f.panelName(slug, env)
	if err := f.admin.UnregisterPanel(panelName); err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}
	return f.removeFromNavigation(ctx, slug, env)
}

func (f *DynamicPanelFactory) createPanel(ctx context.Context, contentType *CMSContentType, before func(context.Context, *CMSContentType) error, after func(context.Context, *Panel) error) (*Panel, error) {
	if f == nil || f.admin == nil {
		return nil, errors.New("admin not configured")
	}
	if contentType == nil {
		return nil, errors.New("content type is nil")
	}
	if strings.TrimSpace(contentType.Slug) == "" {
		return nil, errors.New("content type slug required")
	}

	if before != nil {
		if err := before(ctx, contentType); err != nil {
			return nil, err
		}
	}

	if err := f.validateSchema(ctx, contentType); err != nil {
		return nil, err
	}

	env := f.resolveEnvironment(ctx, contentType)
	panelName := f.panelName(contentType.Slug, env)
	repo := NewCMSContentTypeEntryRepository(f.admin.contentSvc, *contentType)
	fields := f.schemaConverter.Convert(contentType.Schema, contentType.UISchema)

	builder := f.admin.Panel(panelName).
		WithRepository(repo).
		ListFields(fields.List...).
		FormFields(fields.Form...).
		DetailFields(fields.Detail...).
		Filters(fields.Filters...).
		UseBlocks(hasBlocksField(contentType.Schema)).
		UseSEO(hasSEOCapability(contentType.Capabilities)).
		Permissions(panelPermissionsForContentType(*contentType))

	if len(contentType.Schema) > 0 {
		builder.FormSchema(cloneAnyMap(contentType.Schema))
	}

	if tabs := extractTabs(contentType.UISchema, panelName); len(tabs) > 0 {
		builder.Tabs(tabs...)
	}

	panel, err := f.admin.RegisterPanel(panelName, builder)
	if err != nil {
		return nil, err
	}

	f.storeSlug(contentType, env)

	if err := f.addToNavigation(ctx, contentType, env, panelName); err != nil {
		return nil, err
	}

	if after != nil {
		if err := after(ctx, panel); err != nil {
			return nil, err
		}
	}

	return panel, nil
}

func (f *DynamicPanelFactory) validateSchema(ctx context.Context, contentType *CMSContentType) error {
	if f.schemaValidator == nil || contentType == nil {
		return nil
	}
	opts := SchemaValidationOptions{
		Slug:     strings.TrimSpace(contentType.Slug),
		UISchema: cloneAnyMap(contentType.UISchema),
	}
	if err := f.schemaValidator.Validate(ctx, contentType.Schema, opts); err != nil {
		return fmt.Errorf("invalid schema: %w", err)
	}
	return nil
}

func (f *DynamicPanelFactory) storeSlug(contentType *CMSContentType, env string) {
	if contentType == nil {
		return
	}
	id := strings.TrimSpace(contentType.ID)
	slug := strings.TrimSpace(contentType.Slug)
	if id == "" || slug == "" {
		return
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.slugByID == nil {
		f.slugByID = map[string]string{}
	}
	f.slugByID[f.envKey(env, id)] = slug
}

func (f *DynamicPanelFactory) storedSlug(env, id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	f.mu.RLock()
	defer f.mu.RUnlock()
	if f.slugByID == nil {
		return ""
	}
	return strings.TrimSpace(f.slugByID[f.envKey(env, id)])
}

func (f *DynamicPanelFactory) resolveSlug(env, slugOrID string) string {
	slug := strings.TrimSpace(slugOrID)
	if slug == "" {
		return ""
	}
	f.mu.RLock()
	defer f.mu.RUnlock()
	if value, ok := f.slugByID[f.envKey(env, slug)]; ok && value != "" {
		return value
	}
	return slug
}

func (f *DynamicPanelFactory) addToNavigation(ctx context.Context, contentType *CMSContentType, env string, panelName string) error {
	if f == nil || f.admin == nil || contentType == nil {
		return nil
	}
	menuCode := strings.TrimSpace(f.menuCode)
	if menuCode == "" {
		menuCode = f.admin.navMenuCode
	}
	basePath := strings.TrimSpace(f.basePath)
	if basePath == "" {
		basePath = f.admin.config.BasePath
	}
	locale := strings.TrimSpace(f.defaultLocale)
	if locale == "" {
		locale = f.admin.config.DefaultLocale
	}

	label := strings.TrimSpace(firstNonEmpty(contentType.Name, contentType.Slug))
	if label == "" {
		return nil
	}
	path := joinPath(basePath, contentType.Slug)
	if env != "" {
		separator := "?"
		if strings.Contains(path, "?") {
			separator = "&"
		}
		path = path + separator + "env=" + url.QueryEscape(env)
	}
	if panelName == "" {
		panelName = contentType.Slug
	}
	target := map[string]any{"type": "url", "path": path, "key": panelName}

	item := MenuItem{
		Label:    label,
		Icon:     strings.TrimSpace(contentType.Icon),
		Target:   target,
		Menu:     menuCode,
		Locale:   locale,
		ParentID: strings.TrimSpace(f.menuParent),
	}
	perms := panelPermissionsForContentType(*contentType)
	if strings.TrimSpace(perms.View) != "" {
		item.Permissions = []string{perms.View}
	}

	return f.admin.addMenuItems(ctx, []MenuItem{item})
}

func (f *DynamicPanelFactory) removeFromNavigation(ctx context.Context, slug, env string) error {
	if f == nil || f.admin == nil || f.admin.menuSvc == nil {
		return nil
	}
	menuCode := strings.TrimSpace(f.menuCode)
	if menuCode == "" {
		menuCode = f.admin.navMenuCode
	}
	if slug == "" {
		return nil
	}
	panelName := f.panelName(slug, env)
	path := joinPath(f.admin.config.BasePath, slug)
	if env != "" {
		separator := "?"
		if strings.Contains(path, "?") {
			separator = "&"
		}
		path = path + separator + "env=" + url.QueryEscape(env)
	}
	target := map[string]any{"type": "url", "path": path, "key": panelName}
	item := MenuItem{
		Label:    slug,
		Target:   target,
		Menu:     menuCode,
		ParentID: strings.TrimSpace(f.menuParent),
	}
	item = normalizeMenuItem(item, menuCode)
	return f.admin.menuSvc.DeleteMenuItem(ctx, menuCode, item.ID)
}

func panelPermissionsForContentType(contentType CMSContentType) PanelPermissions {
	slug := strings.TrimSpace(firstNonEmpty(contentType.Slug, contentType.Name, contentType.ID))
	if slug == "" {
		return PanelPermissions{}
	}
	base := slug + ":"
	return PanelPermissions{
		View:   base + "read",
		Create: base + "create",
		Edit:   base + "update",
		Delete: base + "delete",
	}
}

func hasBlocksField(schema map[string]any) bool {
	if schema == nil {
		return false
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		return false
	}
	raw, ok := props["blocks"].(map[string]any)
	if !ok {
		return false
	}
	if meta := extractXFormgen(raw); meta != nil {
		if widget := strings.TrimSpace(toString(meta["widget"])); widget == "block" || widget == "blocks" {
			return true
		}
	}
	return hasBlockUnion(raw)
}

func hasSEOCapability(capabilities map[string]any) bool {
	if len(capabilities) == 0 {
		return false
	}
	if raw, ok := capabilities["seo"]; ok {
		return toBool(raw)
	}
	return false
}

func extractTabs(uiSchema map[string]any, panelName string) []PanelTab {
	if uiSchema == nil {
		return nil
	}
	layout, ok := uiSchema["layout"].(map[string]any)
	if !ok {
		return nil
	}
	rawTabs, ok := layout["tabs"].([]any)
	if !ok {
		return nil
	}
	out := make([]PanelTab, 0, len(rawTabs))
	for _, raw := range rawTabs {
		tab, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		id := strings.TrimSpace(toString(tab["id"]))
		label := strings.TrimSpace(toString(tab["label"]))
		if id == "" && label == "" {
			continue
		}
		position := 0
		if order, ok := numericOrder(tab["order"]); ok {
			position = order
		}
		target := PanelTabTarget{Type: "panel", Panel: panelName}
		out = append(out, PanelTab{
			ID:       id,
			Label:    label,
			Position: position,
			Scope:    PanelTabScopeForm,
			Target:   target,
		})
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
	return out
}
