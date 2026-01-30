package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"strings"

	"github.com/goliatone/go-admin/pkg/client"
	goerrors "github.com/goliatone/go-errors"
	formgen "github.com/goliatone/go-formgen"
	formgenjsonschema "github.com/goliatone/go-formgen/pkg/jsonschema"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
	formgenschema "github.com/goliatone/go-formgen/pkg/schema"
	router "github.com/goliatone/go-router"
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
		return errors.New("admin is nil")
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
	if m.defaultLocale == "" {
		m.defaultLocale = ctx.Admin.config.DefaultLocale
	}
	if m.menuGroupID == "" {
		m.menuGroupID = m.resolveMenuGroupID()
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
		validator, err := NewFormgenSchemaValidator(m.basePath)
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
			WithDynamicPanelMenu(m.basePath, m.menuCode, m.menuGroupID, m.defaultLocale),
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
	basePath := m.basePath
	if basePath == "" {
		basePath = "/admin"
	}
	contentTypesPath := joinPath(basePath, contentTypePanelID)
	blocksPath := joinPath(basePath, blockDefinitionsPanelID)
	contentModeling := MenuItem{
		ID:       contentTypeBuilderMenuGroupID,
		Label:    "Content Modeling",
		Icon:     "cube",
		Target:   map[string]any{"type": "url", "path": contentTypesPath, "key": contentTypePanelID},
		Locale:   locale,
		Menu:     m.menuCode,
		ParentID: m.menuParent,
		Position: intPtr(4),
	}
	blocks := MenuItem{
		Label:    "Block Library",
		Icon:     "view-grid",
		Target:   map[string]any{"type": "url", "path": blocksPath, "key": blockDefinitionsPanelID},
		Locale:   locale,
		Menu:     m.menuCode,
		ParentID: m.menuParent,
		Position: intPtr(5),
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
		return errors.New("admin is nil")
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
		return errors.New("admin is nil")
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
	for _, ct := range types {
		if admin.registry != nil {
			if _, exists := admin.registry.Panel(ct.Slug); exists {
				continue
			}
		}
		contentType := ct
		if _, err := m.panelFactory.CreatePanelFromContentType(context.Background(), &contentType); err != nil {
			return err
		}
	}
	return nil
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
	if id := strings.TrimSpace(firstNonEmpty(toString(record["content_type_id"]), toString(record["id"]))); id != "" {
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
	admin.search.Register(contentTypeSearchAdapterKey, &contentTypeSearchAdapter{
		svc:      m.contentTypeSvc,
		basePath: joinPath(m.basePath, contentTypePanelID),
		perm:     m.permission,
	})
}

func (m *ContentTypeBuilderModule) registerSchemaRoutes(admin *Admin) {
	if admin == nil || admin.router == nil {
		return
	}
	validatePath := joinPath(m.basePath, "api/"+contentTypePanelID+"/validate")
	previewPath := joinPath(m.basePath, "api/"+contentTypePanelID+"/preview")

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
			return writeError(c, errors.New("schema preview not configured"))
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
			ID:          firstNonEmpty(ct.ID, ct.Slug),
			Title:       firstNonEmpty(ct.Name, ct.Slug),
			Description: ct.Description,
			URL:         a.basePath,
			Icon:        firstNonEmpty(ct.Icon, "puzzle"),
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
		metadata["content_type_id"] = firstNonEmpty(ct.ID, ct.Slug)
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
		return errors.New("content type service not configured")
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
		return errors.New("content type service not configured")
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
		return errors.New("content type service not configured")
	}
	id := strings.TrimSpace(msg.ID)
	if id == "" {
		return errors.New("content type id required")
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
		return errors.New("content type service not configured")
	}
	id := strings.TrimSpace(msg.ID)
	if id == "" {
		return errors.New("content type id required")
	}
	status := strings.TrimSpace(msg.Status)
	if status == "" {
		status = "active"
	}
	ct := CMSContentType{ID: id, Status: status}
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
		return errors.New("name required")
	}
	if len(m.ContentType.Schema) == 0 {
		return errors.New("schema required")
	}
	return nil
}

// ContentTypeUpdateMsg is a command payload for updating content types.
type ContentTypeUpdateMsg struct {
	ContentType CMSContentType
}

func (ContentTypeUpdateMsg) Type() string { return contentTypeUpdateCommandName }

func (m ContentTypeUpdateMsg) Validate() error {
	if strings.TrimSpace(firstNonEmpty(m.ContentType.ID, m.ContentType.Slug)) == "" {
		return errors.New("content type id required")
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
		return errors.New("content type id required")
	}
	return nil
}

// ContentTypePublishMsg is a command payload for publishing content types.
type ContentTypePublishMsg struct {
	ID     string
	Status string
}

func (ContentTypePublishMsg) Type() string { return contentTypePublishCommandName }

func (m ContentTypePublishMsg) Validate() error {
	if strings.TrimSpace(m.ID) == "" {
		return errors.New("content type id required")
	}
	return nil
}

func buildContentTypeCreateMsg(payload map[string]any, _ []string) (ContentTypeCreateMsg, error) {
	if payload == nil {
		return ContentTypeCreateMsg{}, errors.New("payload required")
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
		ct.ID = firstNonEmpty(firstString(ids...), toString(payload["id"]))
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
	id := firstNonEmpty(firstString(ids...), toString(payload["id"]), toString(payload["slug"]))
	if id == "" {
		return ContentTypePublishMsg{}, errors.New("content type id required")
	}
	status := strings.TrimSpace(toString(payload["status"]))
	return ContentTypePublishMsg{ID: id, Status: status}, nil
}

func buildContentTypeDeleteMsg(payload map[string]any, ids []string) (ContentTypeDeleteMsg, error) {
	id := firstNonEmpty(firstString(ids...), toString(payload["id"]))
	if id == "" && payload != nil {
		id = toString(payload["slug"])
	}
	if id == "" {
		return ContentTypeDeleteMsg{}, errors.New("content type id required")
	}
	return ContentTypeDeleteMsg{ID: id}, nil
}

type FormgenSchemaValidator struct {
	orchestrator *formgenorchestrator.Orchestrator
	renderer     string
}

// NewFormgenSchemaValidator builds a formgen-backed schema validator/previewer.
func NewFormgenSchemaValidator(basePath string) (*FormgenSchemaValidator, error) {
	templatesFS, err := fs.Sub(client.Templates(), "formgen/vanilla")
	if err != nil {
		return nil, fmt.Errorf("init form templates: %w", err)
	}
	templateBundle := formgenvanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = withFallbackFS(templatesFS, templateBundle)
	}
	componentRegistry := components.NewDefaultRegistry()
	componentRegistry.MustRegister("schema-editor", SchemaEditorDescriptor(basePath))
	componentRegistry.MustRegister("block", BlockEditorDescriptor(basePath))

	registry := formgenrender.NewRegistry()
	renderer, err := formgenvanilla.New(
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
		formgenvanilla.WithComponentRegistry(componentRegistry),
	)
	if err != nil {
		return nil, fmt.Errorf("init form renderer: %w", err)
	}
	registry.MustRegister(renderer)

	orch := formgen.NewOrchestrator(
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(renderer.Name()),
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

func (v *FormgenSchemaValidator) generate(ctx context.Context, schema map[string]any, opts SchemaValidationOptions, includeHTML bool) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if v == nil || v.orchestrator == nil {
		return nil, errors.New("schema validator not configured")
	}
	if schema == nil {
		return nil, errors.New("schema required")
	}
	formID, err := resolveFormID(schema, opts)
	if err != nil {
		return nil, err
	}
	doc, err := schemaDocumentFromMap(stripUnsupportedSchemaKeywords(schema))
	if err != nil {
		return nil, err
	}
	normalizeOptions := formgenschema.NormalizeOptions{
		ContentTypeSlug:   strings.TrimSpace(opts.Slug),
		DefaultFormSuffix: defaultFormIDOperationSuffix,
		FormID:            formID,
	}
	if len(opts.UISchema) > 0 {
		if overlay, err := json.Marshal(opts.UISchema); err == nil {
			normalizeOptions.Overlay = overlay
		}
	}
	request := formgenorchestrator.Request{
		SchemaDocument:   &doc,
		Format:           SchemaFormatJSONSchema,
		OperationID:      formID,
		NormalizeOptions: normalizeOptions,
		Renderer:         v.renderer,
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
		return "", errors.New("form id not found")
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
	value := stripUnsupportedSchemaValue(schema)
	if out, ok := value.(map[string]any); ok {
		return out
	}
	return schema
}

func stripUnsupportedSchemaValue(value any) any {
	switch v := value.(type) {
	case map[string]any:
		out := make(map[string]any, len(v))
		for k, item := range v {
			if k == "additionalProperties" {
				continue
			}
			out[k] = stripUnsupportedSchemaValue(item)
		}
		return out
	case []any:
		out := make([]any, 0, len(v))
		for _, item := range v {
			out = append(out, stripUnsupportedSchemaValue(item))
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
		return nil, nil, opts, errors.New("payload required")
	}
	opts.Slug = strings.TrimSpace(firstNonEmpty(toString(body["slug"]), toString(body["content_type"]), toString(body["name"])))
	opts.FormID = strings.TrimSpace(firstNonEmpty(toString(body["form_id"]), toString(body["operation_id"])))

	schema := map[string]any{}
	if raw, ok := body["schema"]; ok {
		switch value := raw.(type) {
		case map[string]any:
			schema = cloneAnyMap(value)
		case string:
			if strings.TrimSpace(value) != "" {
				if err := json.Unmarshal([]byte(value), &schema); err != nil {
					return nil, nil, opts, err
				}
			}
		}
	} else if _, ok := body["$schema"]; ok {
		schema = cloneAnyMap(body)
	}
	if len(schema) == 0 {
		return nil, nil, opts, errors.New("schema required")
	}

	var uiSchema map[string]any
	if raw, ok := body["ui_schema"]; ok {
		if m, ok := raw.(map[string]any); ok {
			uiSchema = cloneAnyMap(m)
		} else if rawStr, ok := raw.(string); ok && strings.TrimSpace(rawStr) != "" {
			if err := json.Unmarshal([]byte(rawStr), &uiSchema); err != nil {
				return nil, nil, opts, err
			}
		}
	}
	return schema, uiSchema, opts, nil
}

func firstString(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
