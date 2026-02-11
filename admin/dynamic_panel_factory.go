package admin

import (
	"context"
	"errors"
	"net/url"
	"path"
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
	if !contentTypePublished(contentType) {
		if err := f.validateSchema(ctx, contentType); err != nil {
			return nil, err
		}
		env := f.resolveEnvironment(ctx, contentType)
		if err := f.cleanupPanel(ctx, contentType, env); err != nil {
			return nil, err
		}
		return nil, nil
	}
	return f.createPanel(ctx, contentType, f.hooks.BeforeCreate, f.hooks.AfterCreate, nil)
}

// RefreshPanel updates an existing panel when the content type changes.
func (f *DynamicPanelFactory) RefreshPanel(ctx context.Context, contentType *CMSContentType) error {
	if contentType == nil {
		return validationDomainError("content type is nil", map[string]any{"field": "content_type"})
	}
	if f.hooks.BeforeUpdate != nil {
		if err := f.hooks.BeforeUpdate(ctx, contentType); err != nil {
			return err
		}
	}
	env := f.resolveEnvironment(ctx, contentType)
	if !contentTypePublished(contentType) {
		if err := f.validateSchema(ctx, contentType); err != nil {
			return err
		}
		return f.cleanupPanel(ctx, contentType, env)
	}
	panelSlug := panelSlugForContentType(contentType)
	panelName := f.panelName(panelSlug, env)
	var navPosition *int
	if f.admin != nil {
		if previous := f.storedSlug(env, contentType.ID); previous != "" && previous != panelSlug {
			navPosition = f.resolveMenuItemPosition(ctx, previous, env)
			previousName := f.panelName(previous, env)
			if err := f.admin.UnregisterPanel(previousName); err != nil && !errors.Is(err, ErrNotFound) {
				return err
			}
			if err := f.removeFromNavigation(ctx, previous, env); err != nil && !errors.Is(err, ErrNotFound) && !isMenuItemMissing(err) {
				return err
			}
		}
		if err := f.admin.UnregisterPanel(panelName); err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
	}
	panel, err := f.createPanel(ctx, contentType, nil, nil, navPosition)
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
		return serviceNotConfiguredDomainError("admin", nil)
	}
	slug := strings.TrimSpace(slugOrID)
	if slug == "" {
		return requiredFieldDomainError("content type slug", nil)
	}
	env := f.resolveEnvironment(ctx, nil)
	slug = f.resolveSlug(env, slug)
	panelName := f.panelName(slug, env)
	if err := f.admin.UnregisterPanel(panelName); err != nil && !errors.Is(err, ErrNotFound) {
		return err
	}
	if err := f.removeFromNavigation(ctx, slug, env); err != nil && !errors.Is(err, ErrNotFound) && !isMenuItemMissing(err) {
		return err
	}
	return nil
}

func (f *DynamicPanelFactory) createPanel(ctx context.Context, contentType *CMSContentType, before func(context.Context, *CMSContentType) error, after func(context.Context, *Panel) error, navPosition *int) (*Panel, error) {
	if f == nil || f.admin == nil {
		return nil, serviceNotConfiguredDomainError("admin", nil)
	}
	if contentType == nil {
		return nil, validationDomainError("content type is nil", map[string]any{"field": "content_type"})
	}
	if strings.TrimSpace(contentType.Slug) == "" {
		return nil, requiredFieldDomainError("content type slug", nil)
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
	panelSlug := panelSlugForContentType(contentType)
	if panelSlug == "" {
		return nil, requiredFieldDomainError("content type panel slug", nil)
	}
	if err := f.ensurePanelSlugUnique(env, panelSlug, contentType.ID); err != nil {
		return nil, err
	}
	panelName := f.panelName(panelSlug, env)
	repo := NewCMSContentTypeEntryRepository(f.admin.contentSvc, *contentType)
	fields := f.schemaConverter.Convert(contentType.Schema, contentType.UISchema)
	blocksEnabled, blocksConfigured := blocksCapability(contentType.Capabilities)
	if !blocksConfigured {
		blocksEnabled = hasBlocksField(contentType.Schema)
	}
	builder := f.admin.Panel(panelName).
		WithRepository(repo).
		ListFields(fields.List...).
		FormFields(fields.Form...).
		DetailFields(fields.Detail...).
		Filters(fields.Filters...).
		UseBlocks(blocksEnabled).
		UseSEO(hasSEOCapability(contentType.Capabilities)).
		TreeView(hasTreeCapability(contentType.Capabilities)).
		Permissions(panelPermissionsForContentType(*contentType))

	builder.WithWorkflow(nil)
	workflowKey := capabilityString(contentType.Capabilities, "workflow", "workflow_key", "workflowKey")
	if workflow := workflowEngineForContentType(f.admin, contentType); workflow != nil {
		builder.WithWorkflow(workflow)
		normalized := strings.ToLower(strings.TrimSpace(workflowKey))
		if normalized == "pages" || normalized == "posts" {
			if actions := resolveCMSWorkflowActions(f.admin); len(actions) > 0 {
				builder.Actions(actions...)
			}
		}
	}

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

	f.registerPanelSearchAdapter(panel, panelSlug, env)
	f.storeSlug(contentType, env, panelSlug)

	if err := f.addToNavigation(ctx, contentType, env, panelSlug, panelName, navPosition); err != nil {
		return nil, err
	}

	if after != nil {
		if err := after(ctx, panel); err != nil {
			return nil, err
		}
	}

	return panel, nil
}

func (f *DynamicPanelFactory) registerPanelSearchAdapter(panel *Panel, panelSlug, env string) {
	if f == nil || f.admin == nil || panel == nil || panel.repo == nil {
		return
	}
	if f.admin.search == nil || !featureEnabled(f.admin.featureGate, FeatureSearch) {
		return
	}
	slug := strings.TrimSpace(panelSlug)
	if slug == "" {
		slug = strings.TrimSpace(panel.name)
	}
	basePath := strings.TrimSpace(f.basePath)
	if basePath == "" {
		basePath = f.admin.config.BasePath
	}
	adapter := &repoSearchAdapter{
		repo:        panel.repo,
		resource:    slug,
		permission:  strings.TrimSpace(panel.permissions.View),
		basePath:    basePath,
		panelSlug:   slug,
		environment: strings.TrimSpace(env),
	}
	f.admin.search.Register(panel.name, adapter)
}

func (f *DynamicPanelFactory) cleanupPanel(ctx context.Context, contentType *CMSContentType, env string) error {
	if f == nil || f.admin == nil || contentType == nil {
		return nil
	}
	currentSlug := panelSlugForContentType(contentType)
	storedSlug := f.storedSlug(env, contentType.ID)
	slugs := []string{}
	if storedSlug != "" {
		slugs = append(slugs, storedSlug)
	}
	if currentSlug != "" && currentSlug != storedSlug {
		slugs = append(slugs, currentSlug)
	}
	if len(slugs) == 0 {
		return nil
	}
	for _, slug := range slugs {
		panelName := f.panelName(slug, env)
		if err := f.admin.UnregisterPanel(panelName); err != nil && !errors.Is(err, ErrNotFound) {
			return err
		}
		if err := f.removeFromNavigation(ctx, slug, env); err != nil && !errors.Is(err, ErrNotFound) && !isMenuItemMissing(err) {
			return err
		}
	}
	return nil
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
		return validationDomainError("invalid schema", map[string]any{"error": err.Error()})
	}
	return nil
}

func (f *DynamicPanelFactory) storeSlug(contentType *CMSContentType, env string, slug string) {
	if contentType == nil {
		return
	}
	id := strings.TrimSpace(contentType.ID)
	slug = strings.TrimSpace(slug)
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

func (f *DynamicPanelFactory) addToNavigation(ctx context.Context, contentType *CMSContentType, env string, panelSlug string, panelName string, navPosition *int) error {
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
	if override := strings.TrimSpace(panelSlug); override != "" {
		label = titleCase(override)
	}
	if label == "" {
		return nil
	}
	params := map[string]string{"panel": panelSlug}
	var query any
	if env != "" {
		query = map[string]string{"env": env}
	}
	panelPath := resolveURLWith(f.admin.urlManager, "admin", "content.panel", params, query)
	if panelPath == "" {
		panelPath = joinBasePath(basePath, path.Join("content", panelSlug))
		if env != "" {
			separator := "?"
			if strings.Contains(panelPath, "?") {
				separator = "&"
			}
			panelPath = panelPath + separator + "env=" + url.QueryEscape(env)
		}
	}
	if panelName == "" {
		panelName = contentType.Slug
	}
	target := map[string]any{"type": "url", "path": panelPath, "key": panelName}

	item := MenuItem{
		Label:    label,
		Icon:     strings.TrimSpace(contentType.Icon),
		Target:   target,
		Menu:     menuCode,
		Locale:   locale,
		ParentID: strings.TrimSpace(f.menuParent),
	}
	if navPosition != nil {
		item.Position = intPtr(*navPosition)
	}
	perms := panelPermissionsForContentType(*contentType)
	if strings.TrimSpace(perms.View) != "" {
		item.Permissions = []string{perms.View}
	}

	if err := f.admin.addMenuItems(ctx, []MenuItem{item}); err != nil {
		if isMenuItemMissing(err) {
			return nil
		}
		return err
	}
	return nil
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
	params := map[string]string{"panel": slug}
	var query any
	if env != "" {
		query = map[string]string{"env": env}
	}
	panelPath := resolveURLWith(f.admin.urlManager, "admin", "content.panel", params, query)
	if panelPath == "" {
		panelPath = joinBasePath(f.admin.config.BasePath, path.Join("content", slug))
		if env != "" {
			separator := "?"
			if strings.Contains(panelPath, "?") {
				separator = "&"
			}
			panelPath = panelPath + separator + "env=" + url.QueryEscape(env)
		}
	}
	target := map[string]any{"type": "url", "path": panelPath, "key": panelName}
	item := MenuItem{
		Label:    slug,
		Target:   target,
		Menu:     menuCode,
		ParentID: strings.TrimSpace(f.menuParent),
	}
	item = normalizeMenuItem(item, menuCode)
	if err := f.admin.menuSvc.DeleteMenuItem(ctx, menuCode, item.ID); err != nil {
		if isMenuItemMissing(err) {
			return nil
		}
		return err
	}
	return nil
}

func (f *DynamicPanelFactory) resolveMenuItemPosition(ctx context.Context, slug, env string) *int {
	if f == nil || f.admin == nil || f.admin.menuSvc == nil {
		return nil
	}
	menuCode := strings.TrimSpace(f.menuCode)
	if menuCode == "" {
		menuCode = f.admin.navMenuCode
	}
	if strings.TrimSpace(menuCode) == "" {
		return nil
	}
	locale := strings.TrimSpace(f.defaultLocale)
	if locale == "" {
		locale = f.admin.config.DefaultLocale
	}
	itemID := f.menuItemID(menuCode, slug, env)
	if itemID == "" {
		return nil
	}
	menu, err := f.admin.menuSvc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		return nil
	}
	return findMenuItemPosition(menu.Items, itemID)
}

func (f *DynamicPanelFactory) menuItemID(menuCode, slug, env string) string {
	if f == nil || f.admin == nil {
		return ""
	}
	if strings.TrimSpace(slug) == "" {
		return ""
	}
	panelName := f.panelName(slug, env)
	params := map[string]string{"panel": slug}
	var query any
	if env != "" {
		query = map[string]string{"env": env}
	}
	panelPath := resolveURLWith(f.admin.urlManager, "admin", "content.panel", params, query)
	if panelPath == "" {
		panelPath = joinBasePath(f.admin.config.BasePath, path.Join("content", slug))
		if env != "" {
			separator := "?"
			if strings.Contains(panelPath, "?") {
				separator = "&"
			}
			panelPath = panelPath + separator + "env=" + url.QueryEscape(env)
		}
	}
	target := map[string]any{"type": "url", "path": panelPath, "key": panelName}
	item := MenuItem{
		Label:    slug,
		Target:   target,
		Menu:     menuCode,
		ParentID: strings.TrimSpace(f.menuParent),
	}
	item = normalizeMenuItem(item, menuCode)
	return item.ID
}

func findMenuItemPosition(items []MenuItem, id string) *int {
	for _, item := range items {
		if item.ID == id {
			if item.Position == nil {
				return nil
			}
			pos := *item.Position
			return &pos
		}
		if len(item.Children) > 0 {
			if pos := findMenuItemPosition(item.Children, id); pos != nil {
				return pos
			}
		}
	}
	return nil
}

func panelPermissionsForContentType(contentType CMSContentType) PanelPermissions {
	if perms, ok := permissionsFromCapabilities(contentType.Capabilities); ok {
		return perms
	}
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
	enabled, _ := capabilityFlag(capabilities, "seo", "use_seo", "useSeo")
	return enabled
}

func hasTreeCapability(capabilities map[string]any) bool {
	enabled, _ := capabilityFlag(capabilities, "tree", "tree_view", "treeView")
	return enabled
}

func blocksCapability(capabilities map[string]any) (bool, bool) {
	if enabled, ok := capabilityFlag(capabilities, "blocks"); ok {
		return enabled, true
	}
	if types, ok := blockTypesFromCapabilities(capabilities); ok {
		return len(types) > 0, true
	}
	return false, false
}

func capabilityFlag(capabilities map[string]any, keys ...string) (bool, bool) {
	if len(capabilities) == 0 {
		return false, false
	}
	for _, key := range keys {
		if raw, ok := capabilities[key]; ok {
			return capabilityEnabled(raw), true
		}
	}
	return false, false
}

func capabilityEnabled(raw any) bool {
	switch value := raw.(type) {
	case bool:
		return value
	case string:
		return toBool(value)
	case []string:
		return len(value) > 0
	case []any:
		return len(value) > 0
	case map[string]any:
		keys := []string{"enabled", "active", "use", "types", "allowed", "block_types", "blockTypes"}
		for _, key := range keys {
			if nested, ok := value[key]; ok {
				return capabilityEnabled(nested)
			}
		}
		return len(value) > 0
	default:
		return toBool(value)
	}
}

func panelSlugForContentType(contentType *CMSContentType) string {
	if contentType == nil {
		return ""
	}
	if override := capabilityString(contentType.Capabilities, "panel_slug", "panelSlug", "panel-slug"); override != "" {
		return override
	}
	return strings.TrimSpace(contentType.Slug)
}

func permissionsFromCapabilities(capabilities map[string]any) (PanelPermissions, bool) {
	if len(capabilities) == 0 {
		return PanelPermissions{}, false
	}
	raw, ok := capabilities["permissions"]
	if !ok {
		raw, ok = capabilities["permission"]
	}
	if !ok {
		return PanelPermissions{}, false
	}
	switch value := raw.(type) {
	case string:
		base := strings.TrimSpace(value)
		if base == "" {
			return PanelPermissions{}, false
		}
		return panelPermissionsFromBase(base), true
	case []string:
		if len(value) == 0 {
			return PanelPermissions{}, false
		}
		if base := strings.TrimSpace(value[0]); base != "" {
			return panelPermissionsFromBase(base), true
		}
	case []any:
		if len(value) == 0 {
			return PanelPermissions{}, false
		}
		if base := strings.TrimSpace(toString(value[0])); base != "" {
			return panelPermissionsFromBase(base), true
		}
	case map[string]any:
		if base := capabilityString(value, "base", "resource", "name", "key"); base != "" {
			return panelPermissionsFromBase(base), true
		}
		perms := PanelPermissions{
			View:   strings.TrimSpace(firstNonEmpty(toString(value["view"]), toString(value["read"]))),
			Create: strings.TrimSpace(toString(value["create"])),
			Edit:   strings.TrimSpace(firstNonEmpty(toString(value["edit"]), toString(value["update"]))),
			Delete: strings.TrimSpace(toString(value["delete"])),
		}
		if perms.View != "" || perms.Create != "" || perms.Edit != "" || perms.Delete != "" {
			return perms, true
		}
	}
	return PanelPermissions{}, false
}

func panelPermissionsFromBase(base string) PanelPermissions {
	base = strings.TrimSpace(base)
	base = strings.TrimSuffix(base, ".")
	return PanelPermissions{
		View:   base + ".view",
		Create: base + ".create",
		Edit:   base + ".edit",
		Delete: base + ".delete",
	}
}

func workflowEngineForContentType(admin *Admin, contentType *CMSContentType) WorkflowEngine {
	if contentType == nil {
		return nil
	}
	workflowKey := capabilityString(contentType.Capabilities, "workflow", "workflow_key", "workflowKey")
	if workflowKey == "" {
		return nil
	}
	engine := resolveCMSWorkflowEngine(admin)
	if engine == nil {
		adminScopedLogger(admin, "admin.dynamic_panel_factory").Warn("workflow engine unavailable",
			"content_type", contentType.Slug,
			"workflow", workflowKey)
		return nil
	}
	checker, ok := engine.(WorkflowDefinitionChecker)
	if !ok {
		adminScopedLogger(admin, "admin.dynamic_panel_factory").Warn("workflow definition checker unavailable",
			"content_type", contentType.Slug,
			"workflow", workflowKey)
		return nil
	}
	if !checker.HasWorkflow(workflowKey) {
		adminScopedLogger(admin, "admin.dynamic_panel_factory").Warn("workflow not found",
			"content_type", contentType.Slug,
			"workflow", workflowKey)
		return nil
	}
	return workflowAlias{engine: engine, entityType: workflowKey}
}

type workflowAlias struct {
	engine     WorkflowEngine
	entityType string
}

func (w workflowAlias) Transition(ctx context.Context, input TransitionInput) (*TransitionResult, error) {
	if w.engine == nil {
		return nil, ErrWorkflowNotFound
	}
	if strings.TrimSpace(w.entityType) != "" {
		input.EntityType = w.entityType
	}
	return w.engine.Transition(ctx, input)
}

func (w workflowAlias) AvailableTransitions(ctx context.Context, _ string, state string) ([]WorkflowTransition, error) {
	if w.engine == nil {
		return nil, nil
	}
	entityType := strings.TrimSpace(w.entityType)
	if entityType == "" {
		return nil, nil
	}
	return w.engine.AvailableTransitions(ctx, entityType, state)
}

func (f *DynamicPanelFactory) ensurePanelSlugUnique(env string, slug string, id string) error {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return requiredFieldDomainError("panel slug", nil)
	}
	key := f.envKey(env, strings.TrimSpace(id))
	f.mu.RLock()
	defer f.mu.RUnlock()
	if f.slugByID == nil {
		return nil
	}
	for storedKey, storedSlug := range f.slugByID {
		if strings.TrimSpace(storedSlug) != slug {
			continue
		}
		if key != "" && storedKey == key {
			continue
		}
		return conflictDomainError("panel slug already registered", map[string]any{"slug": slug})
	}
	return nil
}

func capabilityString(capabilities map[string]any, keys ...string) string {
	if len(capabilities) == 0 {
		return ""
	}
	for _, key := range keys {
		if raw, ok := capabilities[key]; ok {
			if value := capabilityStringValue(raw); value != "" {
				return value
			}
		}
	}
	return ""
}

func capabilityStringValue(raw any) string {
	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value)
	case []string:
		if len(value) == 0 {
			return ""
		}
		return strings.TrimSpace(value[0])
	case []any:
		if len(value) == 0 {
			return ""
		}
		return strings.TrimSpace(toString(value[0]))
	case map[string]any:
		keys := []string{"value", "name", "key", "slug", "id"}
		for _, key := range keys {
			if nested, ok := value[key]; ok {
				if result := capabilityStringValue(nested); result != "" {
					return result
				}
			}
		}
		return ""
	}
	return strings.TrimSpace(toString(raw))
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
