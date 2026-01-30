package quickstart

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// ContentTypeBuilderUIOption customizes content type builder UI routes.
type ContentTypeBuilderUIOption func(*contentTypeBuilderUIOptions)

type contentTypeBuilderUIOptions struct {
	basePath                 string
	contentTypesTemplate     string
	blockDefinitionsTemplate string
	viewContext              UIViewContextBuilder
	permission               string
	authResource             string
}

// WithContentTypeBuilderUIBasePath overrides the base path used to build UI routes.
func WithContentTypeBuilderUIBasePath(basePath string) ContentTypeBuilderUIOption {
	return func(opts *contentTypeBuilderUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentTypeBuilderUITemplates overrides template names for UI routes.
func WithContentTypeBuilderUITemplates(contentTypes, blockDefinitions string) ContentTypeBuilderUIOption {
	return func(opts *contentTypeBuilderUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(contentTypes) != "" {
			opts.contentTypesTemplate = strings.TrimSpace(contentTypes)
		}
		if strings.TrimSpace(blockDefinitions) != "" {
			opts.blockDefinitionsTemplate = strings.TrimSpace(blockDefinitions)
		}
	}
}

// WithContentTypeBuilderUIViewContext overrides the view context builder for UI routes.
func WithContentTypeBuilderUIViewContext(builder UIViewContextBuilder) ContentTypeBuilderUIOption {
	return func(opts *contentTypeBuilderUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithContentTypeBuilderUIPermission sets the permission used for authz checks.
func WithContentTypeBuilderUIPermission(permission string) ContentTypeBuilderUIOption {
	return func(opts *contentTypeBuilderUIOptions) {
		if opts != nil {
			opts.permission = strings.TrimSpace(permission)
		}
	}
}

// WithContentTypeBuilderUIAuthResource overrides the go-auth resource used for checks.
func WithContentTypeBuilderUIAuthResource(resource string) ContentTypeBuilderUIOption {
	return func(opts *contentTypeBuilderUIOptions) {
		if opts != nil {
			opts.authResource = strings.TrimSpace(resource)
		}
	}
}

// RegisterContentTypeBuilderUIRoutes registers HTML routes for the content type builder.
func RegisterContentTypeBuilderUIRoutes(
	r router.Router[*fiber.App],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentTypeBuilderUIOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := contentTypeBuilderUIOptions{
		basePath:                 strings.TrimSpace(cfg.BasePath),
		contentTypesTemplate:     "resources/content-types/editor",
		blockDefinitionsTemplate: "resources/block-definitions/index",
		authResource:             "admin",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.basePath == "" {
		options.basePath = "/"
	}
	if options.viewContext == nil {
		options.viewContext = defaultUIViewContextBuilder(adm, cfg)
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, options.viewContext, options.permission, options.authResource)
	handlers.contentTypesTemplate = options.contentTypesTemplate
	handlers.blockDefinitionsTemplate = options.blockDefinitionsTemplate

	contentTypesPath := path.Join(options.basePath, "content_types")
	blockDefinitionsPath := path.Join(options.basePath, "block_definitions")
	r.Get(contentTypesPath, wrap(handlers.ContentTypes))
	r.Get(blockDefinitionsPath, wrap(handlers.BlockDefinitions))
	return nil
}

// ContentTypeBuilderAPIOption customizes content type builder API routes.
type ContentTypeBuilderAPIOption func(*contentTypeBuilderAPIOptions)

type contentTypeBuilderAPIOptions struct {
	basePath     string
	permission   string
	authResource string
}

// WithContentTypeBuilderAPIBasePath overrides the base path used to build API routes.
func WithContentTypeBuilderAPIBasePath(basePath string) ContentTypeBuilderAPIOption {
	return func(opts *contentTypeBuilderAPIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentTypeBuilderAPIPermission sets the permission used for authz checks.
func WithContentTypeBuilderAPIPermission(permission string) ContentTypeBuilderAPIOption {
	return func(opts *contentTypeBuilderAPIOptions) {
		if opts != nil {
			opts.permission = strings.TrimSpace(permission)
		}
	}
}

// WithContentTypeBuilderAPIAuthResource overrides the go-auth resource used for checks.
func WithContentTypeBuilderAPIAuthResource(resource string) ContentTypeBuilderAPIOption {
	return func(opts *contentTypeBuilderAPIOptions) {
		if opts != nil {
			opts.authResource = strings.TrimSpace(resource)
		}
	}
}

// RegisterContentTypeBuilderAPIRoutes registers API helper routes for content types and block definitions.
func RegisterContentTypeBuilderAPIRoutes(
	r router.Router[*fiber.App],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentTypeBuilderAPIOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	options := contentTypeBuilderAPIOptions{
		basePath:     strings.TrimSpace(cfg.BasePath),
		authResource: "admin",
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}
	if options.basePath == "" {
		options.basePath = "/"
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, options.permission, options.authResource)
	apiBase := path.Join(options.basePath, "api")
	r.Post(path.Join(apiBase, "content_types", ":id", "publish"), wrap(handlers.PublishContentType))
	r.Post(path.Join(apiBase, "content_types", ":id", "deprecate"), wrap(handlers.DeprecateContentType))
	r.Post(path.Join(apiBase, "content_types", ":id", "clone"), wrap(handlers.CloneContentType))
	r.Post(path.Join(apiBase, "content_types", ":id", "compatibility"), wrap(handlers.ContentTypeCompatibility))
	r.Get(path.Join(apiBase, "content_types", ":id", "versions"), wrap(handlers.ContentTypeVersions))
	r.Post(path.Join(apiBase, "block_definitions", ":id", "publish"), wrap(handlers.PublishBlockDefinition))
	r.Post(path.Join(apiBase, "block_definitions", ":id", "deprecate"), wrap(handlers.DeprecateBlockDefinition))
	r.Post(path.Join(apiBase, "block_definitions", ":id", "clone"), wrap(handlers.CloneBlockDefinition))
	r.Get(path.Join(apiBase, "block_definitions", ":id", "versions"), wrap(handlers.BlockDefinitionVersions))
	r.Get(path.Join(apiBase, "block_definitions", "categories"), wrap(handlers.BlockDefinitionCategories))
	r.Get(path.Join(apiBase, "block_definitions", "field_types"), wrap(handlers.BlockDefinitionFieldTypes))
	return nil
}

// ContentTypeBuilderHandlers renders content type builder views and API helpers.
type contentTypeBuilderHandlers struct {
	admin                    *admin.Admin
	cfg                      admin.Config
	viewContext              UIViewContextBuilder
	contentTypesTemplate     string
	blockDefinitionsTemplate string
	contentSvc               admin.CMSContentService
	versions                 *contentTypeVersionStore
	permission               string
	authResource             string
}

type panelReader interface {
	Get(ctx admin.AdminContext, id string) (map[string]any, error)
	Create(ctx admin.AdminContext, record map[string]any) (map[string]any, error)
	Update(ctx admin.AdminContext, id string, record map[string]any) (map[string]any, error)
}

type schemaChange struct {
	Type        string `json:"type"`
	Path        string `json:"path"`
	Field       string `json:"field,omitempty"`
	Description string `json:"description,omitempty"`
	IsBreaking  bool   `json:"is_breaking,omitempty"`
}

type contentTypeSchemaVersion struct {
	Version         string         `json:"version"`
	Schema          map[string]any `json:"schema"`
	UISchema        map[string]any `json:"ui_schema,omitempty"`
	CreatedAt       string         `json:"created_at"`
	CreatedBy       string         `json:"created_by,omitempty"`
	IsBreaking      bool           `json:"is_breaking,omitempty"`
	MigrationStatus string         `json:"migration_status,omitempty"`
	MigratedCount   *int           `json:"migrated_count,omitempty"`
	TotalCount      *int           `json:"total_count,omitempty"`
	Changes         []schemaChange `json:"changes,omitempty"`
}

type blockSchemaVersion struct {
	Version         string         `json:"version"`
	Schema          map[string]any `json:"schema"`
	CreatedAt       string         `json:"created_at"`
	CreatedBy       string         `json:"created_by,omitempty"`
	IsBreaking      bool           `json:"is_breaking,omitempty"`
	MigrationStatus string         `json:"migration_status,omitempty"`
	MigratedCount   *int           `json:"migrated_count,omitempty"`
	TotalCount      *int           `json:"total_count,omitempty"`
}

type contentTypeVersionStore struct {
	mu       sync.Mutex
	versions map[string][]contentTypeSchemaVersion
	pending  map[string]contentTypeSchemaVersion
	counters map[string]int
}

func newContentTypeVersionStore() *contentTypeVersionStore {
	return &contentTypeVersionStore{
		versions: map[string][]contentTypeSchemaVersion{},
		pending:  map[string]contentTypeSchemaVersion{},
		counters: map[string]int{},
	}
}

func (s *contentTypeVersionStore) setPending(key string, entry contentTypeSchemaVersion) {
	if s == nil || key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pending[key] = entry
}

func (s *contentTypeVersionStore) flushPending(key string) (contentTypeSchemaVersion, bool) {
	if s == nil || key == "" {
		return contentTypeSchemaVersion{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.pending[key]
	if ok {
		delete(s.pending, key)
	}
	return entry, ok
}

func (s *contentTypeVersionStore) addVersion(key string, entry contentTypeSchemaVersion) {
	if s == nil || key == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if strings.TrimSpace(entry.Version) == "" {
		s.counters[key]++
		entry.Version = fmt.Sprintf("%d", s.counters[key])
	} else if parsed := parseVersionNumber(entry.Version); parsed > s.counters[key] {
		s.counters[key] = parsed
	}
	s.versions[key] = append(s.versions[key], entry)
}

func (s *contentTypeVersionStore) listVersions(key string) []contentTypeSchemaVersion {
	if s == nil || key == "" {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	versions := s.versions[key]
	if len(versions) == 0 {
		return nil
	}
	out := make([]contentTypeSchemaVersion, 0, len(versions))
	for i := len(versions) - 1; i >= 0; i-- {
		out = append(out, versions[i])
	}
	return out
}

func newContentTypeBuilderHandlers(adm *admin.Admin, cfg admin.Config, viewCtx UIViewContextBuilder, permission string, authResource string) *contentTypeBuilderHandlers {
	return &contentTypeBuilderHandlers{
		admin:        adm,
		cfg:          cfg,
		viewContext:  viewCtx,
		contentSvc:   adm.ContentService(),
		versions:     newContentTypeVersionStore(),
		permission:   strings.TrimSpace(permission),
		authResource: strings.TrimSpace(authResource),
	}
}

func (h *contentTypeBuilderHandlers) ContentTypes(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	contentTypes, _, err := h.listPanelRecords(c, "content_types")
	if err != nil {
		return err
	}
	selectedID := strings.TrimSpace(c.Query("id"))
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("slug"))
	}
	if selectedID == "" {
		selectedID = strings.TrimSpace(c.Query("content_type"))
	}

	viewCtx := router.ViewContext{
		"title":                      h.cfg.Title,
		"base_path":                  h.cfg.BasePath,
		"resource":                   "content_types",
		"content_types":              contentTypes,
		"selected_content_type_id":   selectedID,
		"selected_content_type_slug": selectedID,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "content_types", c)
	}
	return c.Render(h.contentTypesTemplate, viewCtx)
}

func (h *contentTypeBuilderHandlers) BlockDefinitions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	blockDefs, _, err := h.listPanelRecords(c, "block_definitions")
	if err != nil {
		return err
	}
	viewCtx := router.ViewContext{
		"title":             h.cfg.Title,
		"base_path":         h.cfg.BasePath,
		"resource":          "block_definitions",
		"block_definitions": blockDefs,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "block_definitions", c)
	}
	return c.Render(h.blockDefinitionsTemplate, viewCtx)
}

func (h *contentTypeBuilderHandlers) PublishContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "active")
}

func (h *contentTypeBuilderHandlers) DeprecateContentType(c router.Context) error {
	return h.updateContentTypeStatus(c, "deprecated")
}

func (h *contentTypeBuilderHandlers) CloneContentType(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	req := struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newSlug := strings.TrimSpace(req.Slug)
	if newSlug == "" {
		return goerrors.New("slug required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SLUG_REQUIRED")
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "content_type_id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	delete(clone, "schema_version")
	clone["slug"] = newSlug
	clone["name"] = strings.TrimSpace(req.Name)
	if clone["name"] == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	clone["status"] = "draft"
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *contentTypeBuilderHandlers) ContentTypeCompatibility(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	req := struct {
		Schema   map[string]any `json:"schema"`
		UISchema map[string]any `json:"ui_schema"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	if req.Schema == nil {
		return goerrors.New("schema required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("SCHEMA_REQUIRED")
	}

	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	currentSchema := normalizeSchemaValue(record["schema"])
	breaking, warnings := diffSchemas(currentSchema, req.Schema)
	payload := map[string]any{
		"compatible":             len(breaking) == 0,
		"breaking_changes":       breaking,
		"warnings":               warnings,
		"migration_required":     len(breaking) > 0,
		"affected_entries_count": 0,
	}

	key := contentTypeKey(id, record)
	if h.versions != nil {
		changes := make([]schemaChange, 0, len(breaking)+len(warnings))
		changes = append(changes, breaking...)
		changes = append(changes, warnings...)
		entry := contentTypeSchemaVersion{
			Schema:     req.Schema,
			UISchema:   req.UISchema,
			CreatedAt:  time.Now().UTC().Format(time.RFC3339),
			IsBreaking: len(breaking) > 0,
			Changes:    changes,
		}
		h.versions.setPending(key, entry)
	}
	return c.JSON(http.StatusOK, payload)
}

func (h *contentTypeBuilderHandlers) ContentTypeVersions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	key := contentTypeKey(id, record)
	versions := h.versions.listVersions(key)
	if len(versions) == 0 {
		entry := buildVersionFromRecord(record)
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
			versions = h.versions.listVersions(key)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": versions})
}

func (h *contentTypeBuilderHandlers) PublishBlockDefinition(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	return h.updateBlockDefinitionStatus(c, "active")
}

func (h *contentTypeBuilderHandlers) DeprecateBlockDefinition(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	return h.updateBlockDefinitionStatus(c, "deprecated")
}

func (h *contentTypeBuilderHandlers) CloneBlockDefinition(c router.Context) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	req := struct {
		Type string `json:"type"`
		Slug string `json:"slug"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	newType := strings.TrimSpace(req.Type)
	if newType == "" {
		return goerrors.New("type required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("TYPE_REQUIRED")
	}
	newSlug := strings.TrimSpace(req.Slug)
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	clone := map[string]any{}
	for k, v := range record {
		clone[k] = v
	}
	delete(clone, "id")
	delete(clone, "created_at")
	delete(clone, "updated_at")
	clone["type"] = newType
	if newSlug != "" {
		clone["slug"] = newSlug
	}
	if strings.TrimSpace(anyToString(clone["name"])) == "" {
		clone["name"] = fmt.Sprintf("%s Copy", strings.TrimSpace(anyToString(record["name"])))
	}
	created, err := panel.Create(adminCtx, clone)
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, created)
}

func (h *contentTypeBuilderHandlers) BlockDefinitionVersions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	if h.contentSvc == nil {
		return goerrors.New("content service unavailable", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("CONTENT_SERVICE_UNAVAILABLE")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	definitionID := strings.TrimSpace(anyToString(record["id"]))
	if definitionID == "" {
		definitionID = id
	}
	versions, err := h.contentSvc.BlockDefinitionVersions(adminCtx.Context, definitionID)
	if err != nil {
		return err
	}
	output := buildBlockSchemaVersions(versions)
	if len(output) == 0 {
		entry := buildBlockVersionFromRecord(record)
		if entry.Schema != nil && len(entry.Schema) > 0 {
			output = append(output, entry)
		}
	}
	return c.JSON(http.StatusOK, map[string]any{"versions": output})
}

func (h *contentTypeBuilderHandlers) BlockDefinitionCategories(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"categories": []string{"content", "media", "layout", "interactive", "custom"},
	})
}

func (h *contentTypeBuilderHandlers) BlockDefinitionFieldTypes(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	return c.JSON(http.StatusOK, map[string]any{
		"categories": admin.BlockFieldTypeGroups(),
	})
}

func (h *contentTypeBuilderHandlers) listPanelRecords(c router.Context, panelName string) ([]map[string]any, int, error) {
	if h.admin == nil || h.admin.Registry() == nil {
		return nil, 0, nil
	}
	panel, ok := h.admin.Registry().Panel(panelName)
	if !ok || panel == nil {
		return nil, 0, nil
	}
	search := strings.TrimSpace(c.Query("search"))
	filters := map[string]any{}
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		filters["category"] = category
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filters["status"] = status
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	if env := strings.TrimSpace(adminCtx.Environment); env != "" {
		filters["environment"] = env
	}
	opts := admin.ListOptions{
		PerPage: 200,
		Search:  search,
	}
	if len(filters) > 0 {
		opts.Filters = filters
	}
	return panel.List(adminCtx, opts)
}

func (h *contentTypeBuilderHandlers) panelFor(name string) (panelReader, error) {
	if h.admin == nil || h.admin.Registry() == nil {
		return nil, goerrors.New("admin not configured", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("ADMIN_UNAVAILABLE")
	}
	panel, ok := h.admin.Registry().Panel(name)
	if !ok || panel == nil {
		return nil, goerrors.New("panel not found", goerrors.CategoryInternal).
			WithCode(http.StatusNotFound).
			WithTextCode("PANEL_NOT_FOUND")
	}
	return panel, nil
}

func (h *contentTypeBuilderHandlers) updateContentTypeStatus(c router.Context, status string) error {
	if err := h.guard(c, "edit"); err != nil {
		return err
	}
	panel, err := h.panelFor("content_types")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("content type id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	if record, err := panel.Get(adminCtx, id); err == nil && record != nil {
		if actualID := strings.TrimSpace(anyToString(record["content_type_id"])); actualID != "" {
			id = actualID
		}
	}
	updated, err := panel.Update(adminCtx, id, map[string]any{
		"status": status,
	})
	if err != nil {
		return err
	}
	if status == "active" && h.versions != nil {
		key := contentTypeKey(id, updated)
		entry, ok := h.versions.flushPending(key)
		if !ok {
			entry = buildVersionFromRecord(updated)
		}
		if entry.Schema != nil {
			h.versions.addVersion(key, entry)
		}
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *contentTypeBuilderHandlers) updateBlockDefinitionStatus(c router.Context, status string) error {
	panel, err := h.panelFor("block_definitions")
	if err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return goerrors.New("block id required", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("ID_REQUIRED")
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	updated, err := panel.Update(adminCtx, id, map[string]any{
		"status": status,
	})
	if err != nil {
		return err
	}
	return c.JSON(http.StatusOK, updated)
}

func (h *contentTypeBuilderHandlers) guard(c router.Context, action string) error {
	if c == nil || h == nil {
		return admin.ErrForbidden
	}
	ctx := c.Context()
	if h.permission != "" && h.admin != nil {
		if authz := h.admin.Authorizer(); authz != nil {
			if authz.Can(ctx, h.permission, "content_types") {
				return nil
			}
			return admin.ErrForbidden
		}
	}
	resource := h.authResource
	if resource == "" {
		resource = "admin"
	}
	if authlib.Can(ctx, resource, action) {
		return nil
	}
	return admin.ErrForbidden
}

func parseJSONBody(c router.Context, target any) error {
	if c == nil || target == nil {
		return nil
	}
	body := c.Body()
	if len(body) == 0 {
		return nil
	}
	if err := json.Unmarshal(body, target); err != nil {
		return goerrors.New("invalid json payload", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_JSON")
	}
	return nil
}

func contentTypeKey(id string, record map[string]any) string {
	if record != nil {
		if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
			return val
		}
	}
	return strings.TrimSpace(id)
}

func buildVersionFromRecord(record map[string]any) contentTypeSchemaVersion {
	schema := normalizeSchemaValue(record["schema"])
	if schema == nil || len(schema) == 0 {
		return contentTypeSchemaVersion{}
	}
	entry := contentTypeSchemaVersion{
		Schema:   schema,
		UISchema: normalizeSchemaValue(record["ui_schema"]),
	}
	if version := strings.TrimSpace(anyToString(record["schema_version"])); version != "" {
		entry.Version = version
	}
	if created := strings.TrimSpace(anyToString(record["updated_at"])); created != "" {
		entry.CreatedAt = created
	} else if created := strings.TrimSpace(anyToString(record["created_at"])); created != "" {
		entry.CreatedAt = created
	} else {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return entry
}

func buildBlockSchemaVersions(items []admin.CMSBlockDefinitionVersion) []blockSchemaVersion {
	if len(items) == 0 {
		return nil
	}
	out := make([]blockSchemaVersion, 0, len(items))
	for i := len(items) - 1; i >= 0; i-- {
		out = append(out, blockSchemaVersionFromCMS(items[i]))
	}
	return out
}

func blockSchemaVersionFromCMS(item admin.CMSBlockDefinitionVersion) blockSchemaVersion {
	version := strings.TrimSpace(item.SchemaVersion)
	schema := item.Schema
	if schema == nil {
		schema = map[string]any{}
	}
	createdAt := item.CreatedAt
	if createdAt.IsZero() {
		createdAt = item.UpdatedAt
	}
	created := createdAt.UTC().Format(time.RFC3339)
	if createdAt.IsZero() {
		created = time.Now().UTC().Format(time.RFC3339)
	}
	status := strings.TrimSpace(item.MigrationStatus)
	if status == "" {
		status = schemaMigrationStatusFromSchema(schema)
	}
	return blockSchemaVersion{
		Version:         version,
		Schema:          schema,
		CreatedAt:       created,
		MigrationStatus: status,
	}
}

func buildBlockVersionFromRecord(record map[string]any) blockSchemaVersion {
	schema := normalizeSchemaValue(record["schema"])
	if schema == nil || len(schema) == 0 {
		return blockSchemaVersion{}
	}
	entry := blockSchemaVersion{
		Schema: schema,
	}
	if version := strings.TrimSpace(anyToString(record["schema_version"])); version != "" {
		entry.Version = version
	}
	if status := strings.TrimSpace(anyToString(record["migration_status"])); status != "" {
		entry.MigrationStatus = status
	} else {
		entry.MigrationStatus = schemaMigrationStatusFromSchema(schema)
	}
	if created := strings.TrimSpace(anyToString(record["updated_at"])); created != "" {
		entry.CreatedAt = created
	} else if created := strings.TrimSpace(anyToString(record["created_at"])); created != "" {
		entry.CreatedAt = created
	} else {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	return entry
}

func schemaMigrationStatusFromSchema(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	if meta, ok := schema["metadata"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-cms"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	if meta, ok := schema["x-admin"].(map[string]any); ok {
		if status, ok := meta["migration_status"].(string); ok {
			return strings.TrimSpace(status)
		}
	}
	return ""
}

func normalizeSchemaValue(value any) map[string]any {
	switch v := value.(type) {
	case map[string]any:
		return v
	case string:
		var out map[string]any
		if err := json.Unmarshal([]byte(v), &out); err == nil {
			return out
		}
	}
	return map[string]any{}
}

func diffSchemas(oldSchema, newSchema map[string]any) ([]schemaChange, []schemaChange) {
	breaking := []schemaChange{}
	warnings := []schemaChange{}
	if oldSchema == nil {
		oldSchema = map[string]any{}
	}
	if newSchema == nil {
		newSchema = map[string]any{}
	}
	oldProps := extractProperties(oldSchema)
	newProps := extractProperties(newSchema)
	oldRequired := requiredSet(oldSchema)
	newRequired := requiredSet(newSchema)

	for field, oldDef := range oldProps {
		newDef, ok := newProps[field]
		if !ok {
			isBreaking := oldRequired[field]
			change := schemaChange{
				Type:       "removed",
				Path:       "properties." + field,
				Field:      field,
				IsBreaking: isBreaking,
			}
			if isBreaking {
				change.Description = "Required field removed"
				breaking = append(breaking, change)
			} else {
				change.Description = "Field removed"
				warnings = append(warnings, change)
			}
			continue
		}
		breaking = append(breaking, compareField(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
		warnings = append(warnings, compareFieldWarnings(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
	}

	for field := range newProps {
		if _, ok := oldProps[field]; ok {
			continue
		}
		if newRequired[field] {
			breaking = append(breaking, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Required field added",
				IsBreaking:  true,
			})
		} else {
			warnings = append(warnings, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Field added",
			})
		}
	}

	return breaking, warnings
}

func extractProperties(schema map[string]any) map[string]any {
	propsRaw, ok := schema["properties"]
	if !ok {
		return map[string]any{}
	}
	switch props := propsRaw.(type) {
	case map[string]any:
		return props
	default:
		return map[string]any{}
	}
}

func requiredSet(schema map[string]any) map[string]bool {
	required := map[string]bool{}
	raw, ok := schema["required"]
	if !ok || raw == nil {
		return required
	}
	switch vals := raw.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				required[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				required[s] = true
			}
		}
	}
	return required
}

func compareField(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldType := strings.TrimSpace(anyToString(oldMap["type"]))
	newType := strings.TrimSpace(anyToString(newMap["type"]))
	if oldType != "" && newType != "" && oldType != newType {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".type",
			Field:       field,
			Description: fmt.Sprintf("Type changed from %s to %s", oldType, newType),
			IsBreaking:  true,
		})
	}

	if oldRequired && !newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is no longer required",
			IsBreaking:  true,
		})
	}

	if !oldRequired && newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is now required",
			IsBreaking:  true,
		})
	}

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 {
		if enumShrink(oldEnum, newEnum) {
			out = append(out, schemaChange{
				Type:        "modified",
				Path:        "properties." + field + ".enum",
				Field:       field,
				Description: "Enum values removed",
				IsBreaking:  true,
			})
		}
	}

	return out
}

func compareFieldWarnings(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 && enumExpand(oldEnum, newEnum) {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".enum",
			Field:       field,
			Description: "Enum values added",
		})
	}

	oldDesc := strings.TrimSpace(anyToString(oldMap["description"]))
	newDesc := strings.TrimSpace(anyToString(newMap["description"]))
	if oldDesc != "" && newDesc != "" && oldDesc != newDesc {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".description",
			Field:       field,
			Description: "Description changed",
		})
	}

	return out
}

func extractEnumSet(value any) map[string]bool {
	out := map[string]bool{}
	switch vals := value.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				out[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				out[s] = true
			}
		}
	}
	return out
}

func enumShrink(oldSet, newSet map[string]bool) bool {
	for val := range oldSet {
		if !newSet[val] {
			return true
		}
	}
	return false
}

func enumExpand(oldSet, newSet map[string]bool) bool {
	for val := range newSet {
		if !oldSet[val] {
			return true
		}
	}
	return false
}

func parseVersionNumber(version string) int {
	if version == "" {
		return 0
	}
	num := 0
	for _, ch := range version {
		if ch < '0' || ch > '9' {
			break
		}
		num = num*10 + int(ch-'0')
	}
	return num
}

func anyToString(value any) string {
	if value == nil {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return fmt.Sprint(value)
}

func resolveEnvironment(c router.Context) string {
	if c == nil {
		return ""
	}
	if env := strings.TrimSpace(c.Query("env")); env != "" {
		return env
	}
	if env := strings.TrimSpace(c.Query("environment")); env != "" {
		return env
	}
	session := BuildSessionUser(c.Context())
	if env := strings.TrimSpace(session.Environment); env != "" {
		return env
	}
	return stringFromMetadata(session.Metadata, "environment", "env")
}

func adminContextFromRequest(c router.Context, locale string) admin.AdminContext {
	if c == nil {
		return admin.AdminContext{Locale: locale}
	}
	ctx := c.Context()
	userID := strings.TrimSpace(c.Header("X-User-ID"))
	tenantID := ""
	orgID := ""
	if actor, ok := authlib.ActorFromRouterContext(c); ok && actor != nil {
		if actor.ActorID != "" {
			userID = actor.ActorID
		} else if actor.Subject != "" {
			userID = actor.Subject
		}
		if actor.TenantID != "" {
			tenantID = actor.TenantID
		}
		if actor.OrganizationID != "" {
			orgID = actor.OrganizationID
		}
		ctx = authlib.WithActorContext(ctx, actor)
	}
	environment := resolveEnvironment(c)
	if environment != "" {
		ctx = admin.WithEnvironment(ctx, environment)
	}
	return admin.AdminContext{
		Context:     ctx,
		UserID:      userID,
		TenantID:    tenantID,
		OrgID:       orgID,
		Environment: environment,
		Locale:      locale,
	}
}
