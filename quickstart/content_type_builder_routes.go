package quickstart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"path"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const environmentCookieName = "admin_env"

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
	r.Post(path.Join(apiBase, "session", "environment"), wrap(handlers.UpdateEnvironment))
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
	var contentSvc admin.CMSContentService
	if adm != nil {
		contentSvc = adm.ContentService()
	}
	return &contentTypeBuilderHandlers{
		admin:        adm,
		cfg:          cfg,
		viewContext:  viewCtx,
		contentSvc:   contentSvc,
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
	record, recordErr := panel.Get(adminCtx, id)
	if recordErr != nil && !errors.Is(recordErr, admin.ErrNotFound) {
		return recordErr
	}
	resolvedID, resolvedFrom, resolveErr := h.resolveContentTypeID(adminCtx.Context, id, record)
	if resolveErr != nil {
		return resolveErr
	}
	if resolvedID == "" {
		logContentTypeIDMismatch("compatibility", id, resolvedID, resolvedFrom, record)
		return goerrors.New("content type not found", goerrors.CategoryNotFound).
			WithCode(http.StatusNotFound).
			WithTextCode(admin.TextCodeNotFound)
	}
	if recordErr != nil || record == nil {
		record, recordErr = panel.Get(adminCtx, resolvedID)
		if recordErr != nil {
			if errors.Is(recordErr, admin.ErrNotFound) {
				logContentTypeIDMismatch("compatibility", id, resolvedID, resolvedFrom, record)
				return goerrors.New("content type not found", goerrors.CategoryNotFound).
					WithCode(http.StatusNotFound).
					WithTextCode(admin.TextCodeNotFound)
			}
			return recordErr
		}
	}
	currentSchema := normalizeSchemaValue(record["schema"])
	mergedSchema := mergeContentTypeSchema(currentSchema, req.Schema)
	breaking, warnings := compatibilityChanges(currentSchema, mergedSchema)
	payload := map[string]any{
		"compatible":             len(breaking) == 0,
		"breaking_changes":       breaking,
		"warnings":               warnings,
		"migration_required":     len(breaking) > 0,
		"affected_entries_count": 0,
	}

	key := contentTypeKey(resolvedID, record)
	if h.versions != nil {
		changes := make([]schemaChange, 0, len(breaking)+len(warnings))
		changes = append(changes, breaking...)
		changes = append(changes, warnings...)
		entry := contentTypeSchemaVersion{
			Schema:     mergedSchema,
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

func (h *contentTypeBuilderHandlers) UpdateEnvironment(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	req := struct {
		Environment string `json:"environment"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	env := strings.TrimSpace(req.Environment)
	path := strings.TrimSpace(h.cfg.BasePath)
	if path == "" {
		path = "/"
	}
	cookie := router.Cookie{
		Name:     environmentCookieName,
		Value:    env,
		Path:     path,
		HTTPOnly: true,
		SameSite: router.CookieSameSiteLaxMode,
	}
	if env == "" {
		cookie.MaxAge = -1
		cookie.Expires = time.Unix(0, 0)
	} else {
		cookie.Expires = time.Now().Add(365 * 24 * time.Hour)
	}
	c.Cookie(&cookie)
	return c.JSON(http.StatusOK, map[string]any{
		"environment": env,
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
	req := struct {
		Force                bool `json:"force"`
		AllowBreakingChanges bool `json:"allow_breaking_changes"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	allowBreaking := req.Force || req.AllowBreakingChanges
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)

	record, recordErr := panel.Get(adminCtx, id)
	if recordErr != nil && !errors.Is(recordErr, admin.ErrNotFound) {
		return recordErr
	}

	resolvedID, resolvedFrom, resolveErr := h.resolveContentTypeID(adminCtx.Context, id, record)
	if resolveErr != nil {
		return resolveErr
	}
	if resolvedID == "" {
		logContentTypeIDMismatch("publish", id, resolvedID, resolvedFrom, record)
		return goerrors.New("content type not found", goerrors.CategoryNotFound).
			WithCode(http.StatusNotFound).
			WithTextCode(admin.TextCodeNotFound)
	}

	updatePayload := map[string]any{
		"status": status,
	}
	if status == "active" && allowBreaking {
		updatePayload["allow_breaking_changes"] = true
	}
	updated, err := panel.Update(adminCtx, resolvedID, updatePayload)
	if err != nil {
		if errors.Is(err, admin.ErrNotFound) {
			logContentTypeIDMismatch("publish", id, resolvedID, resolvedFrom, record)
			return goerrors.New("content type not found", goerrors.CategoryNotFound).
				WithCode(http.StatusNotFound).
				WithTextCode(admin.TextCodeNotFound)
		}
		return err
	}
	if status == "active" && h.versions != nil {
		key := contentTypeKey(resolvedID, updated)
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

func (h *contentTypeBuilderHandlers) resolveContentTypeID(ctx context.Context, requestID string, record map[string]any) (string, string, error) {
	requestID = strings.TrimSpace(requestID)
	if requestID == "" {
		return "", "", nil
	}
	if h == nil || h.admin == nil {
		if record != nil {
			if resolved := resolveContentTypeUpdateID(requestID, record); resolved != "" {
				return resolved, "record", nil
			}
		}
		return requestID, "request", nil
	}
	svc := h.admin.ContentTypeService()
	if svc == nil {
		if record != nil {
			if resolved := resolveContentTypeUpdateID(requestID, record); resolved != "" {
				return resolved, "record", nil
			}
		}
		return requestID, "request", nil
	}

	if ct, err := svc.ContentType(ctx, requestID); err == nil && ct != nil {
		if id := strings.TrimSpace(ct.ID); id != "" {
			return id, "id", nil
		}
		return requestID, "id", nil
	} else if err != nil && !errors.Is(err, admin.ErrNotFound) {
		return "", "", err
	}

	if ct, err := svc.ContentTypeBySlug(ctx, requestID); err == nil && ct != nil {
		if id := strings.TrimSpace(ct.ID); id != "" {
			return id, "slug", nil
		}
		return requestID, "slug", nil
	} else if err != nil && !errors.Is(err, admin.ErrNotFound) {
		return "", "", err
	}

	return "", "", nil
}

func logContentTypeIDMismatch(action, requestID, resolvedID, resolvedFrom string, record map[string]any) {
	if action == "" {
		action = "update"
	}
	recordID := ""
	recordTypeID := ""
	recordSlug := ""
	if record != nil {
		recordID = strings.TrimSpace(anyToString(record["id"]))
		recordTypeID = strings.TrimSpace(anyToString(record["content_type_id"]))
		recordSlug = strings.TrimSpace(anyToString(record["slug"]))
	}
	log.Printf("[content types] %s id mismatch request_id=%q resolved_id=%q resolved_from=%q record_id=%q record_content_type_id=%q record_slug=%q",
		action, requestID, resolvedID, resolvedFrom, recordID, recordTypeID, recordSlug)
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
	payload := map[string]any{
		"status": status,
	}
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active":
		payload["transition"] = "publish"
	case "deprecated":
		payload["transition"] = "deprecate"
	}
	updated, err := panel.Update(adminCtx, id, payload)
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
		if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
			return val
		}
		if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
			return val
		}
	}
	return strings.TrimSpace(id)
}

func resolveContentTypeUpdateID(fallback string, record map[string]any) string {
	if record == nil {
		return strings.TrimSpace(fallback)
	}
	if val := strings.TrimSpace(anyToString(record["slug"])); val != "" {
		return val
	}
	if val := strings.TrimSpace(anyToString(record["id"])); val != "" {
		return val
	}
	if val := strings.TrimSpace(anyToString(record["content_type_id"])); val != "" {
		return val
	}
	return strings.TrimSpace(fallback)
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

func mergeContentTypeSchema(base, incoming map[string]any) map[string]any {
	if incoming == nil {
		return base
	}
	if base == nil {
		return incoming
	}
	merged := compatCloneMap(incoming)
	if baseDefs, ok := base["$defs"].(map[string]any); ok && len(baseDefs) > 0 {
		defs, _ := merged["$defs"].(map[string]any)
		if defs == nil {
			defs = map[string]any{}
		}
		for key, value := range baseDefs {
			if _, exists := defs[key]; exists {
				continue
			}
			defs[key] = compatCloneValue(value)
		}
		merged["$defs"] = defs
	}
	if baseMeta, ok := base["metadata"].(map[string]any); ok && len(baseMeta) > 0 {
		meta, _ := merged["metadata"].(map[string]any)
		if meta == nil {
			meta = map[string]any{}
		}
		for key, value := range baseMeta {
			if _, exists := meta[key]; exists {
				continue
			}
			meta[key] = compatCloneValue(value)
		}
		merged["metadata"] = meta
	}
	return merged
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

func compatibilityChanges(oldSchema, newSchema map[string]any) ([]schemaChange, []schemaChange) {
	result := checkSchemaCompatibility(oldSchema, newSchema)
	breaking := make([]schemaChange, 0, len(result.BreakingChanges))
	for _, change := range result.BreakingChanges {
		path := strings.TrimSpace(change.Field)
		if path == "" {
			path = strings.TrimSpace(change.Type)
		}
		breaking = append(breaking, schemaChange{
			Type:        change.Type,
			Path:        path,
			Field:       change.Field,
			Description: change.Description,
			IsBreaking:  true,
		})
	}
	if len(breaking) == 0 {
		_, warnings := diffSchemas(oldSchema, newSchema)
		return breaking, warnings
	}
	return breaking, nil
}

type compatibilityChangeLevel int

const (
	compatChangeNone compatibilityChangeLevel = iota
	compatChangePatch
	compatChangeMinor
	compatChangeMajor
)

type compatibilityBreakingChange struct {
	Type        string
	Field       string
	Description string
}

type compatibilityResult struct {
	Compatible      bool
	ChangeLevel     compatibilityChangeLevel
	BreakingChanges []compatibilityBreakingChange
	Warnings        []string
}

func checkSchemaCompatibility(oldSchema, newSchema map[string]any) compatibilityResult {
	result := compatibilityResult{Compatible: true, ChangeLevel: compatChangeNone}
	oldNormalized := normalizeCompatibilitySchema(oldSchema)
	newNormalized := normalizeCompatibilitySchema(newSchema)

	oldFields := collectCompatibilityFields(oldNormalized)
	newFields := collectCompatibilityFields(newNormalized)

	hasMinor := false
	for path, oldField := range oldFields {
		newField, ok := newFields[path]
		if !ok {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "field_removed",
				Field:       path,
				Description: "field removed",
			})
			continue
		}
		switch compareCompatTypeInfo(oldField.Type, newField.Type) {
		case compatTypeChangeBreaking:
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "type_changed",
				Field:       path,
				Description: "field type changed",
			})
		case compatTypeChangeMinor:
			hasMinor = true
		}
		if !oldField.Required && newField.Required {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "required_added",
				Field:       path,
				Description: "required field added",
			})
		}
		if oldField.Required && !newField.Required {
			hasMinor = true
		}
	}

	for path, newField := range newFields {
		if _, ok := oldFields[path]; ok {
			continue
		}
		if newField.Required {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "required_added",
				Field:       path,
				Description: "required field added",
			})
			continue
		}
		hasMinor = true
	}

	changed := !reflect.DeepEqual(stripSchemaVersionMetadata(oldSchema), stripSchemaVersionMetadata(newSchema))
	if len(result.BreakingChanges) > 0 {
		result.Compatible = false
		result.ChangeLevel = compatChangeMajor
		return result
	}
	if hasMinor {
		result.ChangeLevel = compatChangeMinor
		return result
	}
	if changed {
		result.ChangeLevel = compatChangePatch
	}
	return result
}

type compatFieldDescriptor struct {
	Type     compatTypeInfo
	Required bool
}

type compatTypeInfo struct {
	kind      string
	scalars   map[string]struct{}
	items     *compatTypeInfo
	signature string
}

type compatTypeChange int

const (
	compatTypeChangeNone compatTypeChange = iota
	compatTypeChangeMinor
	compatTypeChangeBreaking
)

func collectCompatibilityFields(schema map[string]any) map[string]compatFieldDescriptor {
	fields := map[string]compatFieldDescriptor{}
	walkCompatibilityFields(schema, "", fields)
	return fields
}

func walkCompatibilityFields(node map[string]any, prefix string, fields map[string]compatFieldDescriptor) {
	if node == nil {
		return
	}
	required := requiredSetFromValue(node["required"])
	if props, ok := node["properties"].(map[string]any); ok {
		for name, raw := range props {
			child, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			path := joinCompatibilityPath(prefix, name)
			fields[path] = compatFieldDescriptor{
				Type:     parseCompatTypeInfo(child),
				Required: required[name],
			}
			walkCompatibilityFields(child, path, fields)
		}
	}
	if items, ok := node["items"].(map[string]any); ok {
		itemPath := prefix
		if itemPath == "" {
			itemPath = "[]"
		} else {
			itemPath = itemPath + "[]"
		}
		walkCompatibilityFields(items, itemPath, fields)
	}
	if oneOf, ok := node["oneOf"].([]any); ok {
		for idx, entry := range oneOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "oneOf", idx), fields)
		}
	}
	if allOf, ok := node["allOf"].([]any); ok {
		for idx, entry := range allOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "allOf", idx), fields)
		}
	}
	if defs, ok := node["$defs"].(map[string]any); ok {
		for name, entry := range defs {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "$defs", name), fields)
		}
	}
}

func requiredSetFromValue(value any) map[string]bool {
	set := map[string]bool{}
	switch typed := value.(type) {
	case []string:
		for _, name := range typed {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			set[name] = true
		}
	case []any:
		for _, entry := range typed {
			name, ok := entry.(string)
			if !ok {
				continue
			}
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			set[name] = true
		}
	}
	return set
}

func parseCompatTypeInfo(node map[string]any) compatTypeInfo {
	if node == nil {
		return compatTypeInfo{kind: "unknown"}
	}
	types := readCompatTypeList(node["type"])
	if len(types) > 0 {
		containsObject := containsCompatType(types, "object")
		containsArray := containsCompatType(types, "array")
		if containsObject || containsArray {
			if len(types) > 1 {
				return compatTypeInfo{kind: "unknown", signature: "type:" + strings.Join(types, "|")}
			}
			if containsArray {
				items, _ := node["items"].(map[string]any)
				info := compatTypeInfo{kind: "array"}
				if items != nil {
					itemInfo := parseCompatTypeInfo(items)
					info.items = &itemInfo
				}
				return info
			}
			return compatTypeInfo{kind: "object"}
		}
		return compatTypeInfo{kind: "scalar", scalars: compatToSet(types)}
	}

	if info, ok := compatTypeInfoFromConst(node["const"]); ok {
		return info
	}
	if info, ok := compatTypeInfoFromEnum(node["enum"]); ok {
		return info
	}

	if props, ok := node["properties"].(map[string]any); ok && len(props) > 0 {
		return compatTypeInfo{kind: "object"}
	}
	if items, ok := node["items"].(map[string]any); ok {
		info := compatTypeInfo{kind: "array"}
		itemInfo := parseCompatTypeInfo(items)
		info.items = &itemInfo
		return info
	}
	if oneOf, ok := node["oneOf"].([]any); ok {
		union := map[string]struct{}{}
		for _, entry := range oneOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			childInfo := parseCompatTypeInfo(child)
			if childInfo.kind != "scalar" {
				return compatTypeInfo{kind: "unknown", signature: "oneOf"}
			}
			for scalar := range childInfo.scalars {
				union[scalar] = struct{}{}
			}
		}
		if len(union) > 0 {
			return compatTypeInfo{kind: "scalar", scalars: union}
		}
		return compatTypeInfo{kind: "unknown", signature: "oneOf"}
	}
	if allOf, ok := node["allOf"].([]any); ok && len(allOf) > 0 {
		return compatTypeInfo{kind: "unknown", signature: "allOf"}
	}

	return compatTypeInfo{kind: "unknown"}
}

func compatTypeInfoFromConst(value any) (compatTypeInfo, bool) {
	if value == nil {
		return compatTypeInfo{}, false
	}
	if kind := compatKindFromValue(value); kind != "" {
		return compatTypeInfo{kind: "scalar", scalars: compatToSet([]string{kind})}, true
	}
	return compatTypeInfo{}, false
}

func compatTypeInfoFromEnum(value any) (compatTypeInfo, bool) {
	if value == nil {
		return compatTypeInfo{}, false
	}
	switch typed := value.(type) {
	case []any:
		types := make(map[string]struct{})
		for _, entry := range typed {
			if kind := compatKindFromValue(entry); kind != "" {
				types[kind] = struct{}{}
			}
		}
		if len(types) == 0 {
			return compatTypeInfo{}, false
		}
		return compatTypeInfo{kind: "scalar", scalars: types}, true
	case []string:
		if len(typed) == 0 {
			return compatTypeInfo{}, false
		}
		return compatTypeInfo{kind: "scalar", scalars: compatToSet([]string{"string"})}, true
	}
	return compatTypeInfo{}, false
}

func compatKindFromValue(value any) string {
	switch typed := value.(type) {
	case string:
		if strings.TrimSpace(typed) == "" {
			return ""
		}
		return "string"
	case bool:
		return "boolean"
	case float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "number"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	case nil:
		return "null"
	default:
		return ""
	}
}

func compareCompatTypeInfo(oldInfo, newInfo compatTypeInfo) compatTypeChange {
	if oldInfo.kind == "" && newInfo.kind == "" {
		return compatTypeChangeNone
	}
	if oldInfo.kind != newInfo.kind {
		if oldInfo.kind == "scalar" && newInfo.kind == "scalar" {
			return compareCompatScalarSets(oldInfo.scalars, newInfo.scalars)
		}
		return compatTypeChangeBreaking
	}
	switch oldInfo.kind {
	case "scalar":
		return compareCompatScalarSets(oldInfo.scalars, newInfo.scalars)
	case "array":
		if oldInfo.items == nil && newInfo.items == nil {
			return compatTypeChangeNone
		}
		if oldInfo.items == nil && newInfo.items != nil {
			return compatTypeChangeBreaking
		}
		if oldInfo.items != nil && newInfo.items == nil {
			return compatTypeChangeMinor
		}
		return compareCompatTypeInfo(*oldInfo.items, *newInfo.items)
	case "object":
		return compatTypeChangeNone
	default:
		if oldInfo.signature == "" && newInfo.signature == "" {
			return compatTypeChangeNone
		}
		if oldInfo.signature != "" || newInfo.signature != "" {
			if oldInfo.signature == newInfo.signature {
				return compatTypeChangeNone
			}
		}
		return compatTypeChangeBreaking
	}
}

func compareCompatScalarSets(oldSet, newSet map[string]struct{}) compatTypeChange {
	if len(oldSet) == 0 && len(newSet) == 0 {
		return compatTypeChangeNone
	}
	if len(oldSet) == 0 || len(newSet) == 0 {
		return compatTypeChangeBreaking
	}
	if compatIsSuperset(newSet, oldSet) {
		if len(newSet) == len(oldSet) {
			return compatTypeChangeNone
		}
		return compatTypeChangeMinor
	}
	return compatTypeChangeBreaking
}

func normalizeCompatibilitySchema(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	if compatIsJSONSchema(schema) {
		return compatCloneMap(schema)
	}
	fields, ok := schema["fields"]
	if !ok {
		return compatCloneMap(schema)
	}
	props, required := normalizeCompatFields(fields)
	normalized := map[string]any{
		"type":                 "object",
		"properties":           props,
		"additionalProperties": false,
	}
	if len(required) > 0 {
		normalized["required"] = required
	}
	if override, ok := schema["additionalProperties"]; ok {
		if allowed, ok := override.(bool); ok {
			normalized["additionalProperties"] = allowed
		}
	}
	return normalized
}

func compatIsJSONSchema(schema map[string]any) bool {
	if _, ok := schema["$schema"]; ok {
		return true
	}
	if _, ok := schema["type"]; ok {
		return true
	}
	if _, ok := schema["properties"]; ok {
		return true
	}
	if _, ok := schema["oneOf"]; ok {
		return true
	}
	if _, ok := schema["anyOf"]; ok {
		return true
	}
	if _, ok := schema["allOf"]; ok {
		return true
	}
	return false
}

func normalizeCompatFields(fields any) (map[string]any, []string) {
	properties := make(map[string]any)
	required := make([]string, 0)

	switch typed := fields.(type) {
	case []any:
		for _, entry := range typed {
			if fieldMap, ok := entry.(map[string]any); ok {
				addCompatField(properties, &required, fieldMap)
				continue
			}
			if name, ok := entry.(string); ok {
				addCompatField(properties, &required, map[string]any{"name": name})
			}
		}
	case []map[string]any:
		for _, fieldMap := range typed {
			addCompatField(properties, &required, fieldMap)
		}
	}

	return properties, required
}

func addCompatField(properties map[string]any, required *[]string, field map[string]any) {
	if field == nil {
		return
	}
	name, _ := field["name"].(string)
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	if schema, ok := field["schema"].(map[string]any); ok {
		properties[name] = compatCloneMap(schema)
	} else if fieldType, ok := field["type"].(string); ok {
		if jsonType := normalizeCompatJSONType(fieldType); jsonType != "" {
			properties[name] = map[string]any{"type": jsonType}
		} else {
			properties[name] = map[string]any{}
		}
	} else {
		properties[name] = map[string]any{}
	}
	if required != nil {
		if flag, ok := field["required"].(bool); ok && flag {
			*required = append(*required, name)
		}
	}
}

func normalizeCompatJSONType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "string", "number", "integer", "boolean", "object", "array", "null":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func readCompatTypeList(value any) []string {
	switch typed := value.(type) {
	case string:
		trimmed := strings.ToLower(strings.TrimSpace(typed))
		if trimmed == "" {
			return nil
		}
		return []string{trimmed}
	case []string:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			trimmed := strings.ToLower(strings.TrimSpace(entry))
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		sort.Strings(out)
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			if name, ok := entry.(string); ok {
				trimmed := strings.ToLower(strings.TrimSpace(name))
				if trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
		sort.Strings(out)
		return out
	default:
		return nil
	}
}

func compatToSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
}

func containsCompatType(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func compatIsSuperset(superset, subset map[string]struct{}) bool {
	for value := range subset {
		if _, ok := superset[value]; !ok {
			return false
		}
	}
	return true
}

const (
	compatMetadataKey        = "metadata"
	compatMetadataSlugKey    = "slug"
	compatMetadataVersionKey = "schema_version"
)

func stripSchemaVersionMetadata(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	clean := compatCloneMap(schema)
	meta, ok := clean[compatMetadataKey].(map[string]any)
	if !ok || meta == nil {
		return clean
	}
	metaCopy := compatCloneMap(meta)
	delete(metaCopy, compatMetadataVersionKey)
	delete(metaCopy, compatMetadataSlugKey)
	if len(metaCopy) == 0 {
		delete(clean, compatMetadataKey)
		return clean
	}
	clean[compatMetadataKey] = metaCopy
	return clean
}

func joinCompatibilityPath(parts ...any) string {
	segments := make([]string, 0, len(parts))
	for _, part := range parts {
		switch value := part.(type) {
		case string:
			if value == "" {
				continue
			}
			segments = append(segments, value)
		case int:
			segments = append(segments, "["+compatIntToString(value)+"]")
		}
	}
	return strings.Join(segments, ".")
}

func compatIntToString(value int) string {
	if value == 0 {
		return "0"
	}
	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}
	var digits [20]byte
	idx := len(digits)
	for value > 0 {
		idx--
		digits[idx] = byte('0' + value%10)
		value /= 10
	}
	return sign + string(digits[idx:])
}

func compatCloneMap(input map[string]any) map[string]any {
	if input == nil {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = compatCloneValue(value)
	}
	return out
}

func compatCloneSlice(input []any) []any {
	if input == nil {
		return nil
	}
	out := make([]any, len(input))
	for i, value := range input {
		out[i] = compatCloneValue(value)
	}
	return out
}

func compatCloneValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return compatCloneMap(typed)
	case []any:
		return compatCloneSlice(typed)
	default:
		return typed
	}
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
	if env := strings.TrimSpace(c.Cookies(environmentCookieName)); env != "" {
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
