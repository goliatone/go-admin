package admin

import (
	"context"
	"encoding/json"
	"github.com/goliatone/go-admin/internal/primitives"
	"io/fs"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/pkg/client"
	goerrors "github.com/goliatone/go-errors"
	formgen "github.com/goliatone/go-formgen"
	formgenjsonschema "github.com/goliatone/go-formgen/pkg/jsonschema"
	formgenmodel "github.com/goliatone/go-formgen/pkg/model"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
	formgenschema "github.com/goliatone/go-formgen/pkg/schema"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	contentTypeBuilderModuleID    = "content_type_builder"
	contentTypePanelID            = "content_types"
	blockDefinitionsPanelID       = "block_definitions"
	contentTypeCreateCommandName  = "content_types.create"
	contentTypeUpdateCommandName  = "content_types.update"
	contentTypePublishCommandName = "content_types.publish"
	contentTypeDeleteCommandName  = "content_types.delete"
	contentTypeBuilderMenuGroupID = "content_modeling"
	defaultFormIDOperationSuffix  = ".edit"
	contentTypeSearchAdapterKey   = "content_types"
	contentTypeBuilderPermissions = "content_types"
	defaultContentEnvironmentKey  = "default"
)

// SchemaValidationOptions captures schema validation/preview context.
type SchemaValidationOptions struct {
	Slug     string
	FormID   string
	UISchema map[string]any
}

// SchemaValidator validates JSON schema input for content types.
type SchemaValidator interface {
	Validate(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) error
}

// SchemaPreviewer renders preview output for a schema.
type SchemaPreviewer interface {
	Preview(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) ([]byte, error)
}

// SchemaPreviewFallback renders preview HTML when preview generation fails.
type SchemaPreviewFallback func(ctx AdminContext, schema map[string]any, opts SchemaValidationOptions, err error) (html string, handled bool)

// ContentTypeBuilderModule wires the content type builder UI and dynamic panels.
type ContentTypeBuilderModule struct {
	basePath         string
	menuCode         string
	menuParent       string
	entryMenuParent  string
	menuGroupID      string
	defaultLocale    string
	permission       string
	contentTypeSvc   CMSContentTypeService
	contentSvc       CMSContentService
	panelFactory     *DynamicPanelFactory
	schemaValidator  SchemaValidator
	schemaGuardrails *SchemaGuardrails
	rateLimiter      *RateLimiter
	previewFallback  SchemaPreviewFallback
	activity         ActivitySink
	workflow         WorkflowEngine
	workflowAuth     WorkflowAuthorizer
	urls             urlkit.Resolver
}

// ContentTypeBuilderOption configures the content type builder module.
type ContentTypeBuilderOption func(*ContentTypeBuilderModule)

// NewContentTypeBuilderModule constructs a content type builder module.
func NewContentTypeBuilderModule(opts ...ContentTypeBuilderOption) *ContentTypeBuilderModule {
	module := &ContentTypeBuilderModule{}
	for _, opt := range opts {
		if opt != nil {
			opt(module)
		}
	}
	return module
}

// WithContentTypeBuilderBasePath configures the module base path.
func WithContentTypeBuilderBasePath(path string) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.basePath = path
	}
}

// WithContentTypeBuilderMenu configures the menu code + parent.
func WithContentTypeBuilderMenu(menuCode, menuParent string) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.menuCode = menuCode
		module.menuParent = menuParent
	}
}

// WithContentTypeBuilderEntryMenuParent configures the menu parent for content type entry panels.
func WithContentTypeBuilderEntryMenuParent(menuParent string) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.entryMenuParent = menuParent
	}
}

// WithContentTypeBuilderPermission sets the module permission guard.
func WithContentTypeBuilderPermission(permission string) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.permission = permission
	}
}

// WithContentTypeBuilderSchemaValidator injects a schema validator.
func WithContentTypeBuilderSchemaValidator(validator SchemaValidator) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.schemaValidator = validator
	}
}

// WithContentTypeBuilderPanelFactory injects a custom panel factory.
func WithContentTypeBuilderPanelFactory(factory *DynamicPanelFactory) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.panelFactory = factory
	}
}

// WithContentTypeBuilderGuardrails sets custom schema guardrails.
func WithContentTypeBuilderGuardrails(guardrails *SchemaGuardrails) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.schemaGuardrails = guardrails
	}
}

// WithContentTypeBuilderRateLimiter sets a custom rate limiter.
func WithContentTypeBuilderRateLimiter(limiter *RateLimiter) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.rateLimiter = limiter
	}
}

// WithContentTypeBuilderPreviewFallback sets a fallback renderer for preview errors.
func WithContentTypeBuilderPreviewFallback(fallback SchemaPreviewFallback) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.previewFallback = fallback
	}
}

// WithContentTypeBuilderWorkflow sets a workflow engine for content type builder panels.
func WithContentTypeBuilderWorkflow(workflow WorkflowEngine) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.workflow = workflow
	}
}

// WithContentTypeBuilderWorkflowAuthorizer sets a workflow authorizer for builder panels.
func WithContentTypeBuilderWorkflowAuthorizer(authorizer WorkflowAuthorizer) ContentTypeBuilderOption {
	return func(module *ContentTypeBuilderModule) {
		module.workflowAuth = authorizer
	}
}

// Manifest describes the module metadata.
func (m *ContentTypeBuilderModule) Manifest() ModuleManifest {
	return ModuleManifest{
		ID:             contentTypeBuilderModuleID,
		NameKey:        "modules.content_type_builder.name",
		DescriptionKey: "modules.content_type_builder.description",
		FeatureFlags:   []string{string(FeatureCMS), string(FeatureCommands)},
	}
}

// Register wires the module panels, commands, and dynamic panel registration.
func (m *ContentTypeBuilderModule) Register(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceUnavailableDomainError("admin is nil", map[string]any{
			"service": "admin",
		})
	}
	if ctx.Admin.contentTypeSvc == nil || ctx.Admin.contentSvc == nil {
		return FeatureDisabledError{Feature: string(FeatureCMS)}
	}
	if m.basePath == "" {
		m.basePath = ctx.Admin.config.BasePath
	}
	if m.menuCode == "" {
		m.menuCode = ctx.Admin.navMenuCode
	}
	if m.urls == nil {
		m.urls = ctx.Admin.URLs()
	}
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.menuGroupID == "" {
		m.menuGroupID = m.resolveMenuGroupID()
	}
	if m.entryMenuParent == "" {
		m.entryMenuParent = m.menuGroupID
	}
	if m.contentTypeSvc == nil {
		m.contentTypeSvc = ctx.Admin.contentTypeSvc
	}
	if m.contentSvc == nil {
		m.contentSvc = ctx.Admin.contentSvc
	}

	// Initialize schema guardrails with defaults
	if m.schemaGuardrails == nil {
		m.schemaGuardrails = NewSchemaGuardrails()
	}

	// Initialize rate limiter with defaults (30 requests/minute)
	if m.rateLimiter == nil {
		m.rateLimiter = DefaultSchemaRateLimiter()
	}

	if m.schemaValidator == nil {
		apiBase := ""
		if ctx.Admin != nil {
			apiBase = ctx.Admin.AdminAPIBasePath()
		}
		validator, err := NewFormgenSchemaValidatorWithAPIBase(m.basePath, apiBase)
		if err != nil {
			return err
		}
		// Wrap validator with guardrails
		m.schemaValidator = NewGuardrailedSchemaValidator(validator, m.schemaGuardrails)
	}

	if m.panelFactory == nil {
		m.panelFactory = NewDynamicPanelFactory(ctx.Admin,
			WithDynamicPanelSchemaConverter(NewSchemaToFieldsConverter()),
			WithDynamicPanelSchemaValidator(m.schemaValidator),
			WithDynamicPanelMenu(m.basePath, m.menuCode, m.entryMenuParent, m.defaultLocale),
		)
	}

	if m.activity == nil {
		m.activity = ctx.Admin.ActivityFeed()
	}

	if err := m.registerContentTypePanel(ctx); err != nil {
		return err
	}
	if err := m.registerBlockDefinitionsPanel(ctx); err != nil {
		return err
	}
	m.registerCommands(ctx.Admin)
	m.registerSearchAdapter(ctx.Admin)
	m.registerSchemaRoutes(ctx.Admin)
	m.registerBlockDefinitionCategoriesRoute(ctx.Admin)
	m.registerBlockDefinitionDiagnosticsRoute(ctx.Admin)
	m.registerBlockDefinitionFieldTypesRoute(ctx.Admin)
	m.registerBlockDefinitionTemplateRoutes(ctx.Admin)

	if err := m.loadExistingContentTypes(ctx.Admin); err != nil {
		return err
	}

	return nil
}

// MenuItems contributes navigation for content modeling.
// TODO: we should be able to configure menu icons
func (m *ContentTypeBuilderModule) MenuItems(locale string) []MenuItem {
	if locale == "" {
		locale = m.defaultLocale
	}
	contentTypesPath := resolveURLWith(m.urls, "admin", "content.types", nil, nil)
	if contentTypesPath == "" {
		contentTypesPath = joinBasePath(m.basePath, path.Join("content", "types"))
	}
	blocksPath := resolveURLWith(m.urls, "admin", "content.block_library", nil, nil)
	if blocksPath == "" {
		blocksPath = joinBasePath(m.basePath, path.Join("content", "block-library"))
	}
	contentModeling := MenuItem{
		ID:       contentTypeBuilderMenuGroupID,
		Label:    "Content Modeling",
		Icon:     "cube",
		Target:   map[string]any{"type": "url", "path": contentTypesPath, "key": contentTypePanelID},
		Locale:   locale,
		Menu:     m.menuCode,
		ParentID: m.menuParent,
		Position: primitives.Int(4),
	}
	blocks := MenuItem{
		Label:    "Block Library",
		Icon:     "view-grid",
		Target:   map[string]any{"type": "url", "path": blocksPath, "key": blockDefinitionsPanelID},
		Locale:   locale,
		Menu:     m.menuCode,
		ParentID: m.menuParent,
		Position: primitives.Int(5),
	}
	return []MenuItem{contentModeling, blocks}
}

func (m *ContentTypeBuilderModule) resolveMenuGroupID() string {
	menuCode := strings.TrimSpace(m.menuCode)
	item := MenuItem{
		ID:       contentTypeBuilderMenuGroupID,
		Menu:     menuCode,
		ParentID: m.menuParent,
		Locale:   m.defaultLocale,
	}
	normalized := normalizeMenuItem(item, menuCode)
	if normalized.ID != "" {
		return normalized.ID
	}
	return contentTypeBuilderMenuGroupID
}

func (m *ContentTypeBuilderModule) registerContentTypePanel(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceUnavailableDomainError("admin is nil", map[string]any{
			"service": "admin",
		})
	}
	if ctx.Admin.registry != nil {
		if _, exists := ctx.Admin.registry.Panel(contentTypePanelID); exists {
			return nil
		}
	}
	hooks := PanelHooks{
		AfterCreate: func(adminCtx AdminContext, record map[string]any) error {
			contentType, err := m.resolveContentType(adminCtx.Context, record)
			if err != nil || contentType == nil {
				return err
			}
			_, err = m.panelFactory.CreatePanelFromContentType(adminCtx.Context, contentType)
			return err
		},
		AfterUpdate: func(adminCtx AdminContext, record map[string]any) error {
			contentType, err := m.resolveContentType(adminCtx.Context, record)
			if err != nil || contentType == nil {
				return err
			}
			return m.panelFactory.RefreshPanel(adminCtx.Context, contentType)
		},
		BeforeDelete: func(adminCtx AdminContext, id string) error {
			return m.panelFactory.RemovePanel(adminCtx.Context, id)
		},
	}

	builder := ctx.Admin.Panel(contentTypePanelID).
		WithRepository(NewCMSContentTypeRepository(m.contentTypeSvc)).
		ListFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "textarea"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "schema", Label: "Schema", Type: "jsonschema", Required: true},
			Field{Name: "ui_schema", Label: "UI Schema", Type: "jsonschema"},
			Field{Name: "capabilities", Label: "Capabilities", Type: "textarea"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
		).
		Hooks(hooks)

	if perm := strings.TrimSpace(m.permission); perm != "" {
		builder.Permissions(PanelPermissions{
			View:   perm,
			Create: perm,
			Edit:   perm,
			Delete: perm,
		})
	}

	_, err := ctx.Admin.RegisterPanel(contentTypePanelID, builder)
	return err
}

func (m *ContentTypeBuilderModule) registerBlockDefinitionsPanel(ctx ModuleContext) error {
	if ctx.Admin == nil {
		return serviceUnavailableDomainError("admin is nil", map[string]any{
			"service": "admin",
		})
	}
	if ctx.Admin.registry != nil {
		if _, exists := ctx.Admin.registry.Panel(blockDefinitionsPanelID); exists {
			return nil
		}
	}
	builder := ctx.Admin.Panel(blockDefinitionsPanelID).
		WithRepository(NewCMSBlockDefinitionRepository(m.contentSvc, m.contentTypeSvc)).
		ListFields(
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "category", Label: "Category", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "schema_version", Label: "Schema Version", Type: "text"},
			Field{Name: "migration_status", Label: "Migration Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		).
		FormFields(
			Field{Name: "name", Label: "Name", Type: "text", Required: true},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "textarea"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "category", Label: "Category", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
			Field{Name: "schema", Label: "Schema", Type: "jsonschema"},
			Field{Name: "ui_schema", Label: "UI Schema", Type: "jsonschema"},
		).
		DetailFields(
			Field{Name: "id", Label: "ID", Type: "text"},
			Field{Name: "name", Label: "Name", Type: "text"},
			Field{Name: "slug", Label: "Slug", Type: "text"},
			Field{Name: "description", Label: "Description", Type: "text"},
			Field{Name: "icon", Label: "Icon", Type: "text"},
			Field{Name: "category", Label: "Category", Type: "text"},
			Field{Name: "status", Label: "Status", Type: "text"},
			Field{Name: "type", Label: "Type", Type: "text"},
			Field{Name: "schema_version", Label: "Schema Version", Type: "text"},
			Field{Name: "migration_status", Label: "Migration Status", Type: "text"},
			Field{Name: "locale", Label: "Locale", Type: "text"},
		)

	workflow := m.workflow
	if workflow == nil && ctx.Admin != nil {
		workflow = ctx.Admin.workflow
	}
	if workflow == nil {
		workflow = resolveCMSWorkflowEngine(ctx.Admin)
	}
	if workflow != nil {
		builder.WithWorkflow(workflow)
		if m.workflowAuth != nil {
			builder.WithWorkflowAuthorizer(m.workflowAuth)
		}
	}

	if perm := strings.TrimSpace(m.permission); perm != "" {
		builder.Permissions(PanelPermissions{
			View:   perm,
			Create: perm,
			Edit:   perm,
			Delete: perm,
		})
	}

	_, err := ctx.Admin.RegisterPanel(blockDefinitionsPanelID, builder)
	return err
}

func (m *ContentTypeBuilderModule) loadExistingContentTypes(admin *Admin) error {
	if admin == nil || admin.contentTypeSvc == nil || m.panelFactory == nil {
		return nil
	}
	types, err := admin.contentTypeSvc.ContentTypes(context.Background())
	if err != nil {
		return err
	}
	sort.SliceStable(types, func(i, j int) bool {
		left := strings.ToLower(strings.TrimSpace(types[i].Slug))
		right := strings.ToLower(strings.TrimSpace(types[j].Slug))
		if left == "" {
			left = strings.ToLower(strings.TrimSpace(types[i].Name))
		}
		if right == "" {
			right = strings.ToLower(strings.TrimSpace(types[j].Name))
		}
		if left == "" {
			left = strings.TrimSpace(types[i].ID)
		}
		if right == "" {
			right = strings.TrimSpace(types[j].ID)
		}
		if left == right {
			return strings.TrimSpace(types[i].ID) < strings.TrimSpace(types[j].ID)
		}
		return left < right
	})
	for _, ct := range types {
		contentType := ct
		if err := m.panelFactory.RefreshPanel(context.Background(), &contentType); err != nil {
			return err
		}
	}
	return nil
}

// AfterMenuSeed refreshes panels/navigation after menu seeding.
func (m *ContentTypeBuilderModule) AfterMenuSeed(_ context.Context, admin *Admin) error {
	return m.loadExistingContentTypes(admin)
}

func (m *ContentTypeBuilderModule) resolveContentType(ctx context.Context, record map[string]any) (*CMSContentType, error) {
	if m.contentTypeSvc == nil {
		return nil, ErrNotFound
	}
	if record == nil {
		return nil, ErrNotFound
	}
	if slug := strings.TrimSpace(toString(record["slug"])); slug != "" {
		if ct, err := m.contentTypeSvc.ContentTypeBySlug(ctx, slug); err == nil && ct != nil {
			return ct, nil
		}
	}
	if id := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["content_type_id"]), toString(record["id"]))); id != "" {
		return m.contentTypeSvc.ContentType(ctx, id)
	}
	return nil, ErrNotFound
}

func (m *ContentTypeBuilderModule) registerCommands(admin *Admin) {
	if admin == nil || admin.commandBus == nil {
		return
	}
	_ = RegisterMessageFactory(admin.commandBus, contentTypeCreateCommandName, buildContentTypeCreateMsg)
	_ = RegisterMessageFactory(admin.commandBus, contentTypeUpdateCommandName, buildContentTypeUpdateMsg)
	_ = RegisterMessageFactory(admin.commandBus, contentTypePublishCommandName, buildContentTypePublishMsg)
	_ = RegisterMessageFactory(admin.commandBus, contentTypeDeleteCommandName, buildContentTypeDeleteMsg)

	_, _ = RegisterCommand(admin.commandBus, &contentTypeCreateCommand{service: m.contentTypeSvc, panels: m.panelFactory, activity: m.activity})
	_, _ = RegisterCommand(admin.commandBus, &contentTypeUpdateCommand{service: m.contentTypeSvc, panels: m.panelFactory, activity: m.activity})
	_, _ = RegisterCommand(admin.commandBus, &contentTypePublishCommand{service: m.contentTypeSvc, panels: m.panelFactory, activity: m.activity})
	_, _ = RegisterCommand(admin.commandBus, &contentTypeDeleteCommand{service: m.contentTypeSvc, panels: m.panelFactory, activity: m.activity})
}

func (m *ContentTypeBuilderModule) registerSearchAdapter(admin *Admin) {
	if admin == nil || admin.search == nil || m.contentTypeSvc == nil {
		return
	}
	contentTypesPath := resolveURLWith(m.urls, "admin", "content.types", nil, nil)
	if contentTypesPath == "" {
		contentTypesPath = joinBasePath(m.basePath, path.Join("content", "types"))
	}
	admin.search.Register(contentTypeSearchAdapterKey, &contentTypeSearchAdapter{
		svc:      m.contentTypeSvc,
		basePath: contentTypesPath,
		perm:     m.permission,
	})
}

func (m *ContentTypeBuilderModule) registerSchemaRoutes(admin *Admin) {
	if admin == nil || admin.router == nil {
		return
	}
	validatePath := adminAPIRoutePath(admin, "content_types.validate")
	previewPath := adminAPIRoutePath(admin, "content_types.preview")

	validateHandler := func(c router.Context) error {
		// Apply rate limiting
		if m.rateLimiter != nil {
			clientKey := rateLimitKeyFromRequest(c)
			if !m.rateLimiter.Allow(clientKey) {
				return writeError(c, RateLimitError())
			}
		}

		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		schema, uiSchema, opts, err := parseSchemaPayload(body)
		if err != nil {
			return writeError(c, err)
		}
		opts.UISchema = uiSchema
		if err := m.schemaValidator.Validate(adminCtx.Context, schema, opts); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"valid": true})
	}

	previewHandler := func(c router.Context) error {
		// Apply rate limiting
		if m.rateLimiter != nil {
			clientKey := rateLimitKeyFromRequest(c)
			if !m.rateLimiter.Allow(clientKey) {
				return writeError(c, RateLimitError())
			}
		}

		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		schema, uiSchema, opts, err := parseSchemaPayload(body)
		if err != nil {
			return writeError(c, err)
		}
		opts.UISchema = uiSchema
		if !schemaHasPreviewableFields(schema) {
			return writeJSON(c, map[string]any{
				"html": `<p class="text-sm text-gray-500">Add fields to preview the form.</p>`,
			})
		}
		previewer, ok := m.schemaValidator.(SchemaPreviewer)
		if !ok {
			return writeError(c, serviceUnavailableDomainError("schema preview not configured", map[string]any{
				"service": "schema_preview",
			}))
		}
		html, err := previewer.Preview(adminCtx.Context, schema, opts)
		if err != nil {
			if m.previewFallback != nil {
				if fallback, handled := m.previewFallback(adminCtx, schema, opts, err); handled {
					return writeJSON(c, map[string]any{"html": fallback})
				}
			}
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"html": string(html)})
	}

	authWrap := admin.authWrapper()
	if authWrap != nil {
		validateHandler = authWrap(validateHandler)
		previewHandler = authWrap(previewHandler)
	}
	admin.router.Post(validatePath, validateHandler)
	admin.router.Post(previewPath, previewHandler)
}

func (m *ContentTypeBuilderModule) registerBlockDefinitionCategoriesRoute(admin *Admin) {
	if admin == nil || admin.router == nil || m.contentSvc == nil {
		return
	}
	categoriesPath := adminAPIRoutePath(admin, "block_definitions_meta.categories")

	handler := func(c router.Context) error {
		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}
		defs, err := m.contentSvc.BlockDefinitions(adminCtx.Context)
		if err != nil {
			return writeJSON(c, map[string]any{"categories": []string{}})
		}
		seen := map[string]struct{}{}
		categories := []string{}
		for _, def := range defs {
			cat := strings.ToLower(strings.TrimSpace(def.Category))
			if cat == "" {
				cat = strings.ToLower(strings.TrimSpace(schemaCategoryFromSchema(def.Schema)))
			}
			if cat == "" {
				cat = "custom"
			}
			if cat == "" {
				continue
			}
			if _, ok := seen[cat]; ok {
				continue
			}
			seen[cat] = struct{}{}
			categories = append(categories, cat)
		}
		return writeJSON(c, map[string]any{"categories": categories})
	}

	if authWrap := admin.authWrapper(); authWrap != nil {
		handler = authWrap(handler)
	}
	admin.router.Get(categoriesPath, handler)
}

func (m *ContentTypeBuilderModule) registerBlockDefinitionDiagnosticsRoute(admin *Admin) {
	if admin == nil || admin.router == nil || m.contentSvc == nil {
		return
	}
	diagnosticsPath := adminAPIRoutePath(admin, "block_definitions_meta.diagnostics")

	handler := func(c router.Context) error {
		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}

		requestedEnv := strings.ToLower(strings.TrimSpace(c.Query("env")))
		if requestedEnv == "" {
			requestedEnv = strings.ToLower(strings.TrimSpace(c.Query("environment")))
		}
		effectiveEnv := requestedEnv
		if effectiveEnv == "" {
			effectiveEnv = defaultContentEnvironmentKey
		}
		defaultDefs, defaultErr := m.contentSvc.BlockDefinitions(WithEnvironment(context.Background(), defaultContentEnvironmentKey))
		effectiveDefs := defaultDefs
		effectiveErr := defaultErr
		if effectiveEnv != defaultContentEnvironmentKey {
			effectiveDefs, effectiveErr = m.contentSvc.BlockDefinitions(WithEnvironment(context.Background(), effectiveEnv))
		}
		if defaultErr != nil || effectiveErr != nil {
			return writeJSON(c, map[string]any{
				"effective_environment": effectiveEnv,
				"requested_environment": requestedEnv,
				"total_effective":       0,
				"total_default":         0,
				"available_environments": []string{
					defaultContentEnvironmentKey,
				},
			})
		}

		envSet := map[string]struct{}{
			defaultContentEnvironmentKey: {},
			effectiveEnv:                 {},
		}
		addEnvFromDefs := func(defs []CMSBlockDefinition, fallback string) {
			for _, def := range defs {
				env := strings.ToLower(strings.TrimSpace(def.Environment))
				if env == "" {
					env = fallback
				}
				if env == "" {
					env = defaultContentEnvironmentKey
				}
				envSet[env] = struct{}{}
			}
		}
		addEnvFromDefs(defaultDefs, defaultContentEnvironmentKey)
		addEnvFromDefs(effectiveDefs, effectiveEnv)

		available := make([]string, 0, len(envSet))
		for env := range envSet {
			available = append(available, env)
		}
		sort.Strings(available)
		if len(available) > 1 {
			for i, env := range available {
				if env == defaultContentEnvironmentKey {
					available[0], available[i] = available[i], available[0]
					break
				}
			}
		}

		return writeJSON(c, map[string]any{
			"effective_environment":  effectiveEnv,
			"requested_environment":  requestedEnv,
			"total_effective":        len(effectiveDefs),
			"total_default":          len(defaultDefs),
			"available_environments": available,
		})
	}

	if authWrap := admin.authWrapper(); authWrap != nil {
		handler = authWrap(handler)
	}
	admin.router.Get(diagnosticsPath, handler)
}

func (m *ContentTypeBuilderModule) registerBlockDefinitionFieldTypesRoute(admin *Admin) {
	if admin == nil || admin.router == nil {
		return
	}
	fieldTypesPath := adminAPIRoutePath(admin, "block_definitions_meta.field_types")

	handler := func(c router.Context) error {
		adminCtx := admin.adminContextFromRequest(c, admin.config.DefaultLocale)
		if err := m.authorize(adminCtx, admin.authorizer); err != nil {
			return writeError(c, err)
		}
		reg := DefaultBlockFieldTypeRegistry()
		return writeJSON(c, map[string]any{
			"categories":  reg.Groups(),
			"field_types": reg.FieldTypes(),
		})
	}

	if authWrap := admin.authWrapper(); authWrap != nil {
		handler = authWrap(handler)
	}
	admin.router.Get(fieldTypesPath, handler)
}

func (m *ContentTypeBuilderModule) authorize(ctx AdminContext, authorizer Authorizer) error {
	if m.permission == "" || authorizer == nil {
		return nil
	}
	if !authorizer.Can(ctx.Context, m.permission, contentTypeBuilderPermissions) {
		return permissionDenied(m.permission, contentTypeBuilderPermissions)
	}
	return nil
}

type contentTypeSearchAdapter struct {
	svc      CMSContentTypeService
	basePath string
	perm     string
}

func (a *contentTypeSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	if a == nil || a.svc == nil {
		return nil, ErrNotFound
	}
	types, err := a.svc.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	query = strings.ToLower(strings.TrimSpace(query))
	results := []SearchResult{}
	for _, ct := range types {
		if query != "" && !strings.Contains(strings.ToLower(ct.Name), query) &&
			!strings.Contains(strings.ToLower(ct.Slug), query) &&
			!strings.Contains(strings.ToLower(ct.Description), query) {
			continue
		}
		results = append(results, SearchResult{
			Type:        "content_type",
			ID:          primitives.FirstNonEmptyRaw(ct.ID, ct.Slug),
			Title:       primitives.FirstNonEmptyRaw(ct.Name, ct.Slug),
			Description: ct.Description,
			URL:         a.basePath,
			Icon:        primitives.FirstNonEmptyRaw(ct.Icon, "puzzle"),
		})
		if len(results) >= limit {
			break
		}
	}
	return results, nil
}

func (a *contentTypeSearchAdapter) Permission() string {
	return a.perm
}

// recordContentTypeActivity records an activity event for content type operations.
func recordContentTypeActivity(ctx context.Context, sink ActivitySink, action string, ct *CMSContentType, extra map[string]any) {
	if sink == nil {
		return
	}
	actor := actorFromContext(ctx)
	if actor == "" {
		actor = ActivityActorTypeSystem
	}

	metadata := map[string]any{
		"channel": "cms",
	}
	if ct != nil {
		metadata["content_type_id"] = primitives.FirstNonEmptyRaw(ct.ID, ct.Slug)
		metadata["content_type_slug"] = ct.Slug
		metadata["content_type_name"] = ct.Name
		if ct.Status != "" {
			metadata["status"] = ct.Status
		}
	}
	for k, v := range extra {
		metadata[k] = v
	}

	object := "content_type"
	if ct != nil && ct.Slug != "" {
		object = "content_type:" + ct.Slug
	} else if ct != nil && ct.ID != "" {
		object = "content_type:" + ct.ID
	}

	entry := ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   object,
		Channel:  "cms",
		Metadata: metadata,
	}
	_ = sink.Record(ctx, entry)
}

type contentTypeCreateCommand struct {
	service  CMSContentTypeService
	panels   *DynamicPanelFactory
	activity ActivitySink
}

func (c *contentTypeCreateCommand) Execute(ctx context.Context, msg ContentTypeCreateMsg) error {
	if c == nil || c.service == nil {
		return serviceUnavailableDomainError("content type service not configured", map[string]any{
			"service": "content_type",
		})
	}
	created, err := c.service.CreateContentType(ctx, msg.ContentType)
	if err != nil {
		return err
	}
	if c.panels != nil && created != nil {
		_, _ = c.panels.CreatePanelFromContentType(ctx, created)
	}
	recordContentTypeActivity(ctx, c.activity, "created", created, nil)
	return nil
}

type contentTypeUpdateCommand struct {
	service  CMSContentTypeService
	panels   *DynamicPanelFactory
	activity ActivitySink
}

func (c *contentTypeUpdateCommand) Execute(ctx context.Context, msg ContentTypeUpdateMsg) error {
	if c == nil || c.service == nil {
		return serviceUnavailableDomainError("content type service not configured", map[string]any{
			"service": "content_type",
		})
	}
	updated, err := c.service.UpdateContentType(ctx, msg.ContentType)
	if err != nil {
		return err
	}
	if c.panels != nil && updated != nil {
		_ = c.panels.RefreshPanel(ctx, updated)
	}
	recordContentTypeActivity(ctx, c.activity, "updated", updated, nil)
	return nil
}

type contentTypeDeleteCommand struct {
	service  CMSContentTypeService
	panels   *DynamicPanelFactory
	activity ActivitySink
}

func (c *contentTypeDeleteCommand) Execute(ctx context.Context, msg ContentTypeDeleteMsg) error {
	if c == nil || c.service == nil {
		return serviceUnavailableDomainError("content type service not configured", map[string]any{
			"service": "content_type",
		})
	}
	id := strings.TrimSpace(msg.ID)
	if id == "" {
		return validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	var deletedCT *CMSContentType
	if ct, err := c.service.ContentTypeBySlug(ctx, id); err == nil && ct != nil && ct.ID != "" {
		deletedCT = ct
		id = ct.ID
	}
	if err := c.service.DeleteContentType(ctx, id); err != nil {
		return err
	}
	if c.panels != nil {
		_ = c.panels.RemovePanel(ctx, id)
	}
	if deletedCT == nil {
		deletedCT = &CMSContentType{ID: id}
	}
	recordContentTypeActivity(ctx, c.activity, "deleted", deletedCT, nil)
	return nil
}

type contentTypePublishCommand struct {
	service  CMSContentTypeService
	panels   *DynamicPanelFactory
	activity ActivitySink
}

func (c *contentTypePublishCommand) Execute(ctx context.Context, msg ContentTypePublishMsg) error {
	if c == nil || c.service == nil {
		return serviceUnavailableDomainError("content type service not configured", map[string]any{
			"service": "content_type",
		})
	}
	id := strings.TrimSpace(msg.ID)
	if id == "" {
		return validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	status := strings.TrimSpace(msg.Status)
	if status == "" {
		status = "active"
	}
	ct := CMSContentType{ID: id, Status: status, AllowBreakingChanges: msg.AllowBreakingChanges}
	var previousStatus string
	if existing, err := c.service.ContentTypeBySlug(ctx, id); err == nil && existing != nil && existing.ID != "" {
		ct.ID = existing.ID
		ct.Slug = existing.Slug
		previousStatus = existing.Status
	}
	updated, err := c.service.UpdateContentType(ctx, ct)
	if err != nil {
		return err
	}
	if c.panels != nil && updated != nil {
		_ = c.panels.RefreshPanel(ctx, updated)
	}
	extra := map[string]any{
		"from_status": previousStatus,
		"to_status":   status,
	}
	recordContentTypeActivity(ctx, c.activity, "published", updated, extra)
	return nil
}

// ContentTypeCreateMsg is a command payload for creating content types.
type ContentTypeCreateMsg struct {
	ContentType CMSContentType
}

func (ContentTypeCreateMsg) Type() string { return contentTypeCreateCommandName }

func (m ContentTypeCreateMsg) Validate() error {
	if strings.TrimSpace(m.ContentType.Name) == "" {
		return validationDomainError("name required", map[string]any{
			"field": "name",
		})
	}
	if len(m.ContentType.Schema) == 0 {
		return validationDomainError("schema required", map[string]any{
			"field": "schema",
		})
	}
	return nil
}

// ContentTypeUpdateMsg is a command payload for updating content types.
type ContentTypeUpdateMsg struct {
	ContentType CMSContentType
}

func (ContentTypeUpdateMsg) Type() string { return contentTypeUpdateCommandName }

func (m ContentTypeUpdateMsg) Validate() error {
	if strings.TrimSpace(primitives.FirstNonEmptyRaw(m.ContentType.ID, m.ContentType.Slug)) == "" {
		return validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	return nil
}

// ContentTypeDeleteMsg is a command payload for deleting content types.
type ContentTypeDeleteMsg struct {
	ID string
}

func (ContentTypeDeleteMsg) Type() string { return contentTypeDeleteCommandName }

func (m ContentTypeDeleteMsg) Validate() error {
	if strings.TrimSpace(m.ID) == "" {
		return validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	return nil
}

// ContentTypePublishMsg is a command payload for publishing content types.
type ContentTypePublishMsg struct {
	ID                   string
	Status               string
	AllowBreakingChanges bool
}

func (ContentTypePublishMsg) Type() string { return contentTypePublishCommandName }

func (m ContentTypePublishMsg) Validate() error {
	if strings.TrimSpace(m.ID) == "" {
		return validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	return nil
}

func buildContentTypeCreateMsg(payload map[string]any, _ []string) (ContentTypeCreateMsg, error) {
	if payload == nil {
		return ContentTypeCreateMsg{}, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	ct := mapToCMSContentType(payload)
	return ContentTypeCreateMsg{ContentType: ct}, nil
}

func buildContentTypeUpdateMsg(payload map[string]any, ids []string) (ContentTypeUpdateMsg, error) {
	if payload == nil {
		payload = map[string]any{}
	}
	ct := mapToCMSContentType(payload)
	if ct.ID == "" {
		ct.ID = primitives.FirstNonEmptyRaw(firstString(ids...), toString(payload["id"]))
	}
	if ct.ID == "" && ct.Slug == "" {
		ct.Slug = toString(payload["slug"])
	}
	return ContentTypeUpdateMsg{ContentType: ct}, nil
}

func buildContentTypePublishMsg(payload map[string]any, ids []string) (ContentTypePublishMsg, error) {
	if payload == nil {
		payload = map[string]any{}
	}
	id := primitives.FirstNonEmptyRaw(firstString(ids...), toString(payload["id"]), toString(payload["slug"]))
	if id == "" {
		return ContentTypePublishMsg{}, validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	status := strings.TrimSpace(toString(payload["status"]))
	allowBreaking := toBool(payload["allow_breaking_changes"]) || toBool(payload["allow_breaking"]) || toBool(payload["force"])
	return ContentTypePublishMsg{ID: id, Status: status, AllowBreakingChanges: allowBreaking}, nil
}

func buildContentTypeDeleteMsg(payload map[string]any, ids []string) (ContentTypeDeleteMsg, error) {
	id := primitives.FirstNonEmptyRaw(firstString(ids...), toString(payload["id"]))
	if id == "" && payload != nil {
		id = toString(payload["slug"])
	}
	if id == "" {
		return ContentTypeDeleteMsg{}, validationDomainError("content type id required", map[string]any{
			"field": "id",
		})
	}
	return ContentTypeDeleteMsg{ID: id}, nil
}

type FormgenSchemaValidator struct {
	orchestrator *formgenorchestrator.Orchestrator
	renderer     string
}

// NewFormgenSchemaValidator builds a formgen-backed schema validator/previewer.
func NewFormgenSchemaValidator(basePath string) (*FormgenSchemaValidator, error) {
	return NewFormgenSchemaValidatorWithAPIBase(basePath, "")
}

// NewFormgenSchemaValidatorWithAPIBase builds a formgen-backed schema validator/previewer with an explicit API base.
func NewFormgenSchemaValidatorWithAPIBase(basePath, apiBase string) (*FormgenSchemaValidator, error) {
	templatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		return nil, serviceUnavailableDomainError("init form templates failed", map[string]any{"component": "content_type_builder", "error": err.Error()})
	}
	templateBundle := formgenvanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = withFallbackFS(templatesFS, templateBundle)
	}
	componentRegistry := components.NewDefaultRegistry()
	componentRegistry.MustRegister("schema-editor", SchemaEditorDescriptor(basePath))
	componentRegistry.MustRegister("block", BlockEditorDescriptor(basePath))
	componentRegistry.MustRegister("block-library-picker", BlockLibraryPickerDescriptorWithAPIBase(basePath, apiBase))
	componentRegistry.MustRegister("permission-matrix", PermissionMatrixDescriptor(basePath))

	registry := formgenrender.NewRegistry()
	renderer, err := formgenvanilla.New(
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
		formgenvanilla.WithComponentRegistry(componentRegistry),
	)
	if err != nil {
		return nil, serviceUnavailableDomainError("init form renderer failed", map[string]any{"component": "content_type_builder", "error": err.Error()})
	}
	registry.MustRegister(renderer)

	orch := formgen.NewOrchestrator(
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(renderer.Name()),
		formgenorchestrator.WithSchemaTransformer(jsonEditorHybridTransformer()),
	)
	return &FormgenSchemaValidator{orchestrator: orch, renderer: renderer.Name()}, nil
}

// Validate verifies that a schema can be normalized by go-formgen.
func (v *FormgenSchemaValidator) Validate(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) error {
	_, err := v.generate(ctx, schema, opts, false)
	if err != nil {
		return schemaValidationError(err)
	}
	return nil
}

// Preview renders a form preview from a schema.
func (v *FormgenSchemaValidator) Preview(ctx context.Context, schema map[string]any, opts SchemaValidationOptions) ([]byte, error) {
	return v.generate(ctx, schema, opts, true)
}

// RenderForm renders HTML for a schema using formgen with custom render options.
func (v *FormgenSchemaValidator) RenderForm(ctx context.Context, schema map[string]any, opts SchemaValidationOptions, renderOpts formgenrender.RenderOptions) (string, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if v == nil || v.orchestrator == nil {
		return "", serviceUnavailableDomainError("schema validator not configured", map[string]any{
			"service": "schema_validator",
		})
	}
	if schema == nil {
		return "", validationDomainError("schema required", map[string]any{
			"field": "schema",
		})
	}

	formID, err := resolveFormID(schema, opts)
	if err != nil {
		slug := strings.TrimSpace(opts.Slug)
		if slug == "" {
			return "", err
		}
		formID = slug + defaultFormIDOperationSuffix
	}
	doc, err := schemaDocumentFromMap(prepareSchemaForFormgen(schema))
	if err != nil {
		return "", err
	}
	normalizeOptions := formgenschema.NormalizeOptions{
		ContentTypeSlug:   strings.TrimSpace(opts.Slug),
		DefaultFormSuffix: defaultFormIDOperationSuffix,
		FormID:            formID,
	}
	if len(opts.UISchema) > 0 {
		overlayDoc := primitives.CloneAnyMap(opts.UISchema)
		if overlayDoc != nil {
			if _, ok := overlayDoc["$schema"]; !ok {
				overlayDoc["$schema"] = "x-ui-overlay/v1"
			}
		}
		if overlay, err := json.Marshal(overlayDoc); err == nil {
			normalizeOptions.Overlay = overlay
		}
	}

	request := formgenorchestrator.Request{
		SchemaDocument:   &doc,
		Format:           SchemaFormatJSONSchema,
		OperationID:      formID,
		NormalizeOptions: normalizeOptions,
		Renderer:         v.renderer,
		RenderOptions:    renderOpts,
	}
	html, err := v.orchestrator.Generate(ctx, request)
	if err != nil {
		return "", err
	}
	return string(html), nil
}

func (v *FormgenSchemaValidator) generate(ctx context.Context, schema map[string]any, opts SchemaValidationOptions, includeHTML bool) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if v == nil || v.orchestrator == nil {
		return nil, serviceUnavailableDomainError("schema validator not configured", map[string]any{
			"service": "schema_validator",
		})
	}
	if schema == nil {
		return nil, validationDomainError("schema required", map[string]any{
			"field": "schema",
		})
	}
	formID, err := resolveFormID(schema, opts)
	if err != nil {
		return nil, err
	}
	doc, err := schemaDocumentFromMap(prepareSchemaForFormgen(schema))
	if err != nil {
		return nil, err
	}
	normalizeOptions := formgenschema.NormalizeOptions{
		ContentTypeSlug:   strings.TrimSpace(opts.Slug),
		DefaultFormSuffix: defaultFormIDOperationSuffix,
		FormID:            formID,
	}
	if len(opts.UISchema) > 0 {
		overlayDoc := primitives.CloneAnyMap(opts.UISchema)
		if overlayDoc != nil {
			if _, ok := overlayDoc["$schema"]; !ok {
				overlayDoc["$schema"] = "x-ui-overlay/v1"
			}
		}
		if overlay, err := json.Marshal(overlayDoc); err == nil {
			normalizeOptions.Overlay = overlay
		}
	}
	request := formgenorchestrator.Request{
		SchemaDocument:   &doc,
		Format:           SchemaFormatJSONSchema,
		OperationID:      formID,
		NormalizeOptions: normalizeOptions,
		Renderer:         v.renderer,
		RenderOptions: formgenrender.RenderOptions{
			ChromeClasses: &formgenrender.ChromeClasses{
				Form:     "space-y-6",
				Header:   "space-y-1",
				Section:  "space-y-4",
				Fieldset: "space-y-4",
				Actions:  "hidden",
				Grid:     "grid gap-6",
			},
		},
	}
	html, err := v.orchestrator.Generate(ctx, request)
	if err != nil {
		return nil, err
	}
	if !includeHTML {
		return nil, nil
	}
	return html, nil
}

func resolveFormID(schema map[string]any, opts SchemaValidationOptions) (string, error) {
	if opts.FormID != "" {
		return opts.FormID, nil
	}
	refs, err := formgenjsonschema.DiscoverFormsFromMap(schema, formgenjsonschema.FormDiscoveryOptions{
		Slug:         strings.TrimSpace(opts.Slug),
		FormIDSuffix: defaultFormIDOperationSuffix,
	})
	if err != nil {
		return "", err
	}
	if len(refs) == 0 || strings.TrimSpace(refs[0].ID) == "" {
		return "", notFoundDomainError("form id not found", map[string]any{
			"field": "form_id",
		})
	}
	return refs[0].ID, nil
}

func schemaDocumentFromMap(schema map[string]any) (formgenschema.Document, error) {
	raw, err := json.Marshal(schema)
	if err != nil {
		return formgenschema.Document{}, err
	}
	source := formgenschema.SourceFromFile("inline.schema.json")
	return formgenschema.NewDocument(source, raw)
}

func schemaHasPreviewableFields(schema map[string]any) bool {
	if schema == nil {
		return false
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || len(props) == 0 {
		return false
	}
	return true
}

func stripUnsupportedSchemaKeywords(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	value := stripUnsupportedSchemaValue(schema, false)
	if out, ok := value.(map[string]any); ok {
		return out
	}
	return schema
}

func prepareSchemaForFormgen(schema map[string]any) map[string]any {
	return normalizeFormgenSchemaCompatibility(stripUnsupportedSchemaKeywords(schema))
}

func normalizeFormgenSchemaCompatibility(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	out := deepCloneAnyMap(schema)
	normalizeFormgenSchemaValue(out)
	return out
}

func deepCloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = deepCloneAnyValue(value)
	}
	return out
}

func deepCloneAnyValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return deepCloneAnyMap(typed)
	case []any:
		out := make([]any, len(typed))
		for i := range typed {
			out[i] = deepCloneAnyValue(typed[i])
		}
		return out
	default:
		return value
	}
}

func normalizeFormgenSchemaValue(value any) {
	switch typed := value.(type) {
	case map[string]any:
		if isOneOfArraySchema(typed) {
			normalizeBlockPickerWidgetHints(typed)
		}
		for _, child := range typed {
			normalizeFormgenSchemaValue(child)
		}
	case []any:
		for _, child := range typed {
			normalizeFormgenSchemaValue(child)
		}
	}
}

func isOneOfArraySchema(node map[string]any) bool {
	if node == nil {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(toString(node["type"])), "array") {
		return false
	}
	items, ok := node["items"].(map[string]any)
	if !ok || items == nil {
		return false
	}
	oneOf, ok := items["oneOf"].([]any)
	return ok && len(oneOf) > 0
}

func normalizeBlockPickerWidgetHints(node map[string]any) {
	if node == nil {
		return
	}
	if !hasBlockLibraryWidgetHint(node) {
		return
	}
	items, _ := node["items"].(map[string]any)
	if items == nil {
		return
	}
	oneOf, _ := items["oneOf"].([]any)
	allowed := extractAllowedBlockTypes(oneOf)
	if len(oneOf) > 0 {
		delete(items, "oneOf")
		if strings.TrimSpace(toString(items["type"])) == "" {
			items["type"] = "object"
		}
	}
	ensureAllowedBlocksConfig(node, allowed)
	ensureBlockPickerComponentHints(node, allowed)
}

func hasBlockLibraryWidgetHint(node map[string]any) bool {
	if node == nil {
		return false
	}
	if hasWidgetInMap(node, "x-formgen") || hasWidgetInMap(node, "x-admin") {
		return true
	}
	return isBlockLibraryWidget(node["x-formgen-widget"]) || isBlockLibraryWidget(node["x-admin-widget"])
}

func hasWidgetInMap(node map[string]any, key string) bool {
	raw, ok := node[key]
	if !ok || raw == nil {
		return false
	}
	mapped, ok := raw.(map[string]any)
	if !ok || mapped == nil {
		return false
	}
	return isBlockLibraryWidget(mapped["widget"])
}

func ensureAllowedBlocksConfig(node map[string]any, allowed []string) {
	if len(allowed) == 0 || node == nil {
		return
	}
	for _, key := range []string{"x-formgen", "x-admin"} {
		raw, ok := node[key]
		if !ok || raw == nil {
			continue
		}
		mapped, ok := raw.(map[string]any)
		if !ok || mapped == nil || !isBlockLibraryWidget(mapped["widget"]) {
			continue
		}
		if _, exists := mapped["allowedBlocks"]; !exists {
			mapped["allowedBlocks"] = append([]string{}, allowed...)
		}
	}
}

func ensureBlockPickerComponentHints(node map[string]any, allowed []string) {
	if node == nil {
		return
	}
	formgen := ensureExtensionObject(node, "x-formgen")
	if formgen == nil {
		return
	}
	if _, ok := formgen["widget"]; !ok {
		formgen["widget"] = "block-library-picker"
	}
	if strings.TrimSpace(toString(formgen["component.name"])) == "" {
		formgen["component.name"] = "block-library-picker"
	}
	config := ensureComponentConfigObject(formgen)
	if len(allowed) > 0 {
		if _, exists := config["allowedBlocks"]; !exists {
			config["allowedBlocks"] = append([]string{}, allowed...)
		}
	}
	if _, exists := config["includeInactive"]; !exists {
		config["includeInactive"] = true
	}
	if len(config) > 0 {
		formgen["component.config"] = config
	}
}

func ensureExtensionObject(node map[string]any, key string) map[string]any {
	if node == nil {
		return nil
	}
	if raw, ok := node[key]; ok {
		if mapped, ok := raw.(map[string]any); ok && mapped != nil {
			return mapped
		}
	}
	mapped := map[string]any{}
	node[key] = mapped
	return mapped
}

func ensureComponentConfigObject(ext map[string]any) map[string]any {
	if ext == nil {
		return map[string]any{}
	}
	if raw, ok := ext["component.config"]; ok {
		switch value := raw.(type) {
		case map[string]any:
			if value != nil {
				return value
			}
		case string:
			parsed := map[string]any{}
			if strings.TrimSpace(value) != "" && json.Unmarshal([]byte(value), &parsed) == nil {
				return parsed
			}
		}
	}
	return map[string]any{}
}

func extractAllowedBlockTypes(oneOf []any) []string {
	if len(oneOf) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(oneOf))
	add := func(value string) {
		trimmed := strings.TrimSpace(value)
		for _, candidate := range blockTypeAliasCandidates(trimmed) {
			if candidate == "" || seen[candidate] {
				continue
			}
			seen[candidate] = true
			out = append(out, candidate)
		}
	}
	for _, entry := range oneOf {
		item, ok := entry.(map[string]any)
		if !ok || item == nil {
			continue
		}
		if ref := strings.TrimSpace(toString(item["$ref"])); ref != "" {
			parts := strings.Split(ref, "/")
			add(parts[len(parts)-1])
			continue
		}
		props, _ := item["properties"].(map[string]any)
		if props == nil {
			continue
		}
		typeProp, _ := props["_type"].(map[string]any)
		if typeProp == nil {
			continue
		}
		add(toString(typeProp["const"]))
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func blockTypeAliasCandidates(value string) []string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	seen := map[string]bool{}
	out := []string{}
	add := func(candidate string) {
		key := strings.TrimSpace(candidate)
		if key == "" || seen[key] {
			return
		}
		seen[key] = true
		out = append(out, key)
	}
	add(trimmed)
	add(strings.ReplaceAll(trimmed, "-", "_"))
	add(strings.ReplaceAll(trimmed, "_", "-"))
	return out
}

func isBlockLibraryWidget(raw any) bool {
	widget := strings.TrimSpace(strings.ToLower(toString(raw)))
	return widget == "block-library-picker" || widget == "block-library"
}

func stripUnsupportedSchemaValue(value any, inProperties bool) any {
	switch v := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(v))
		for k, item := range v {
			if !inProperties && (k == "additionalProperties" || k == "metadata") {
				continue
			}
			if !inProperties && k == "properties" {
				out[k] = stripUnsupportedSchemaValue(item, true)
				continue
			}
			out[k] = stripUnsupportedSchemaValue(item, false)
		}
		return out
	case []any:
		out := make([]any, 0, len(v))
		for _, item := range v {
			out = append(out, stripUnsupportedSchemaValue(item, false))
		}
		return out
	default:
		return value
	}
}

func schemaValidationError(err error) error {
	if err == nil {
		return nil
	}
	fields := map[string]string{"schema": strings.TrimSpace(err.Error())}
	return goerrors.NewValidationFromMap("validation failed", fields)
}

func parseSchemaPayload(body map[string]any) (map[string]any, map[string]any, SchemaValidationOptions, error) {
	opts := SchemaValidationOptions{}
	if body == nil {
		return nil, nil, opts, validationDomainError("payload required", map[string]any{
			"field": "payload",
		})
	}
	opts.Slug = strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["slug"]), toString(body["content_type"]), toString(body["name"])))
	opts.FormID = strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(body["form_id"]), toString(body["operation_id"])))

	schema := map[string]any{}
	if raw, ok := body["schema"]; ok {
		switch value := raw.(type) {
		case map[string]any:
			schema = primitives.CloneAnyMap(value)
		case string:
			if strings.TrimSpace(value) != "" {
				if err := json.Unmarshal([]byte(value), &schema); err != nil {
					return nil, nil, opts, err
				}
			}
		}
	} else if _, ok := body["$schema"]; ok {
		schema = primitives.CloneAnyMap(body)
	}
	if len(schema) == 0 {
		return nil, nil, opts, validationDomainError("schema required", map[string]any{
			"field": "schema",
		})
	}

	var uiSchema map[string]any
	if raw, ok := body["ui_schema"]; ok {
		if m, ok := raw.(map[string]any); ok {
			uiSchema = primitives.CloneAnyMap(m)
		} else if rawStr, ok := raw.(string); ok && strings.TrimSpace(rawStr) != "" {
			if err := json.Unmarshal([]byte(rawStr), &uiSchema); err != nil {
				return nil, nil, opts, err
			}
		}
	}
	return schema, uiSchema, opts, nil
}

// jsonEditorHybridTransformer returns a transformer that sets editorMode to
// "hybrid" on schemaless object fields so the JSON editor renders with both
// the GUI key-value editor and the raw textarea.
func jsonEditorHybridTransformer() formgenorchestrator.TransformerFunc {
	return func(ctx context.Context, form *formgenmodel.FormModel) error {
		setHybridMode(form.Fields)
		return nil
	}
}

func setHybridMode(fields []formgenmodel.Field) {
	for idx := range fields {
		field := &fields[idx]
		if field.Type == formgenmodel.FieldTypeObject && field.Relationship == nil && len(field.Nested) == 0 {
			if field.UIHints == nil {
				field.UIHints = make(map[string]string)
			}
			field.UIHints["editorMode"] = "hybrid"
			field.UIHints["editorActiveView"] = "gui"
		}
		if len(field.Nested) > 0 {
			setHybridMode(field.Nested)
		}
		if field.Items != nil && len(field.Items.Nested) > 0 {
			setHybridMode(field.Items.Nested)
		}
	}
}

func firstString(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
