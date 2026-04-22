package quickstart

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"path"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/admin"
	templateview "github.com/goliatone/go-admin/internal/templateview"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

const channelCookieName = "admin_channel"

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
func RegisterContentTypeBuilderUIRoutes[T any](
	r router.Router[T],
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
	options.basePath = normalizeQuickstartRouteBasePath(options.basePath)
	options.viewContext = resolveQuickstartUIViewContextBuilder(adm, cfg, options.viewContext)

	wrap := wrapQuickstartRouteAuth(auth)

	handlers := newContentTypeBuilderHandlers(adm, cfg, options.viewContext, options.permission, options.authResource)
	handlers.contentTypesTemplate = options.contentTypesTemplate
	handlers.blockDefinitionsTemplate = options.blockDefinitionsTemplate

	contentTypesPath := path.Join(options.basePath, "content", "types")
	blockDefinitionsPath := path.Join(options.basePath, "content", "block-library")
	uiRoutes := r.Group(options.basePath)
	uiRoutes.Get("/content/types", wrap(handlers.ContentTypes))
	uiRoutes.Get("/content/block-library", wrap(handlers.BlockDefinitions))
	uiRoutes.Get("/content_types", wrap(func(c router.Context) error {
		return c.Redirect(contentTypesPath)
	}))
	uiRoutes.Get("/block_definitions", wrap(func(c router.Context) error {
		return c.Redirect(blockDefinitionsPath)
	}))
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
func RegisterContentTypeBuilderAPIRoutes[T any](
	r router.Router[T],
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
	options.basePath = normalizeQuickstartRouteBasePath(options.basePath)

	wrap := wrapQuickstartRouteAuth(auth)

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, options.permission, options.authResource)
	apiBase := adminAPIBasePathFromConfig(options.basePath, cfg)
	apiRoutes := r.Group(apiBase)
	apiRoutes.Post("/content_types/:id/publish", wrap(handlers.PublishContentType))
	apiRoutes.Post("/content_types/:id/deprecate", wrap(handlers.DeprecateContentType))
	apiRoutes.Post("/content_types/:id/clone", wrap(handlers.CloneContentType))
	apiRoutes.Post("/content_types/:id/compatibility", wrap(handlers.ContentTypeCompatibility))
	apiRoutes.Get("/content_types/:id/versions", wrap(handlers.ContentTypeVersions))
	apiRoutes.Post("/session/channel", wrap(handlers.UpdateChannel))
	apiRoutes.Post("/block_definitions/:id/publish", wrap(handlers.PublishBlockDefinition))
	apiRoutes.Post("/block_definitions/:id/deprecate", wrap(handlers.DeprecateBlockDefinition))
	apiRoutes.Post("/block_definitions/:id/clone", wrap(handlers.CloneBlockDefinition))
	apiRoutes.Get("/block_definitions/:id/versions", wrap(handlers.BlockDefinitionVersions))
	apiRoutes.Get("/block_definitions/categories", wrap(handlers.BlockDefinitionCategories))
	apiRoutes.Get("/block_definitions/diagnostics", wrap(handlers.BlockDefinitionDiagnostics))
	apiRoutes.Get("/block_definitions/field_types", wrap(handlers.BlockDefinitionFieldTypes))
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
	contentTypeSvc           admin.CMSContentTypeService
	versions                 *contentTypeVersionStore
	permission               string
	authResource             string
}

type contentChannelDiagnostics struct {
	EffectiveChannel  string   `json:"effective_channel"`
	RequestedChannel  string   `json:"requested_channel"`
	TotalEffective    int      `json:"total_effective"`
	TotalDefault      int      `json:"total_default"`
	AvailableChannels []string `json:"available_channels"`
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
	var contentTypeSvc admin.CMSContentTypeService
	if adm != nil {
		contentSvc = adm.ContentService()
		contentTypeSvc = adm.ContentTypeService()
	}
	return &contentTypeBuilderHandlers{
		admin:          adm,
		cfg:            cfg,
		viewContext:    viewCtx,
		contentSvc:     contentSvc,
		contentTypeSvc: contentTypeSvc,
		versions:       newContentTypeVersionStore(),
		permission:     strings.TrimSpace(permission),
		authResource:   strings.TrimSpace(authResource),
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
	diagnostics := h.contentTypeDiagnostics(c)
	diagnostics.TotalEffective = len(contentTypes)

	var urls urlkit.Resolver
	if h.admin != nil {
		urls = h.admin.URLs()
	}
	viewCtx := router.ViewContext{
		"title":                            h.cfg.Title,
		"base_path":                        h.cfg.BasePath,
		"api_base_path":                    resolveAdminAPIBasePath(urls, h.cfg, h.cfg.BasePath),
		"resource":                         "content_types",
		"content_types":                    contentTypes,
		"selected_content_type_id":         selectedID,
		"selected_content_type_slug":       selectedID,
		"content_types_effective_channel":  diagnostics.EffectiveChannel,
		"content_types_requested_channel":  diagnostics.RequestedChannel,
		"content_types_total_effective":    diagnostics.TotalEffective,
		"content_types_total_default":      diagnostics.TotalDefault,
		"content_types_available_channels": diagnostics.AvailableChannels,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "content_types", c)
	}
	return templateview.RenderTemplateView(c, h.contentTypesTemplate, viewCtx)
}

func (h *contentTypeBuilderHandlers) BlockDefinitions(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	blockDefs, _, err := h.listPanelRecords(c, "block_definitions")
	if err != nil {
		return err
	}
	var urls urlkit.Resolver
	if h.admin != nil {
		urls = h.admin.URLs()
	}
	viewCtx := router.ViewContext{
		"title":             h.cfg.Title,
		"base_path":         h.cfg.BasePath,
		"api_base_path":     resolveAdminAPIBasePath(urls, h.cfg, h.cfg.BasePath),
		"resource":          "block_definitions",
		"block_definitions": blockDefs,
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, "block_definitions", c)
	}
	return templateview.RenderTemplateView(c, h.blockDefinitionsTemplate, viewCtx)
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

	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	record, recordErr := panel.Get(adminCtx, id)
	if recordErr != nil && !errors.Is(recordErr, admin.ErrNotFound) {
		return recordErr
	}
	resolvedID, resolvedFrom, resolveErr := h.resolveContentTypeID(adminCtx.Context, id, record)
	if resolveErr != nil {
		return resolveErr
	}
	if resolvedID == "" {
		h.logContentTypeIDMismatch("compatibility", id, resolvedID, resolvedFrom, record)
		return goerrors.New("content type not found", goerrors.CategoryNotFound).
			WithCode(http.StatusNotFound).
			WithTextCode(admin.TextCodeNotFound)
	}
	if recordErr != nil || record == nil {
		record, recordErr = panel.Get(adminCtx, resolvedID)
		if recordErr != nil {
			if errors.Is(recordErr, admin.ErrNotFound) {
				h.logContentTypeIDMismatch("compatibility", id, resolvedID, resolvedFrom, record)
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

func (h *contentTypeBuilderHandlers) BlockDefinitionDiagnostics(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}

	requested := strings.ToLower(strings.TrimSpace(resolveContentChannel(c)))
	effective := normalizeChannelKey(requested)
	response := map[string]any{
		"effective_channel":  effective,
		"requested_channel":  requested,
		"total_effective":    0,
		"total_default":      0,
		"available_channels": []string{defaultChannelKey},
	}
	if h.contentSvc == nil {
		return c.JSON(http.StatusOK, response)
	}

	defaultDefs, defaultErr := h.contentSvc.BlockDefinitions(admin.WithContentChannel(context.Background(), defaultChannelKey))
	effectiveDefs := defaultDefs
	effectiveErr := defaultErr
	if effective != defaultChannelKey {
		effectiveDefs, effectiveErr = h.contentSvc.BlockDefinitions(admin.WithContentChannel(context.Background(), effective))
	}
	if defaultErr != nil || effectiveErr != nil {
		return c.JSON(http.StatusOK, response)
	}

	envSet := map[string]struct{}{
		defaultChannelKey: {},
		effective:         {},
	}
	addEnv := func(defs []admin.CMSBlockDefinition, fallback string) {
		for _, def := range defs {
			env := normalizeChannelKey(admin.CMSBlockDefinitionChannel(def))
			if env == defaultChannelKey && strings.TrimSpace(def.Channel) == "" {
				env = normalizeChannelKey(fallback)
			}
			envSet[env] = struct{}{}
		}
	}
	addEnv(defaultDefs, defaultChannelKey)
	addEnv(effectiveDefs, effective)

	available := make([]string, 0, len(envSet))
	for env := range envSet {
		available = append(available, env)
	}
	sort.Strings(available)
	if len(available) > 1 {
		for i, env := range available {
			if env == defaultChannelKey {
				available[0], available[i] = available[i], available[0]
				break
			}
		}
	}

	response["total_effective"] = len(effectiveDefs)
	response["total_default"] = len(defaultDefs)
	response["available_channels"] = available
	return c.JSON(http.StatusOK, response)
}

func (h *contentTypeBuilderHandlers) UpdateChannel(c router.Context) error {
	if err := h.guard(c, "read"); err != nil {
		return err
	}
	req := struct {
		Channel        string `json:"channel"`
		ContentChannel string `json:"content_channel"`
	}{}
	if err := parseJSONBody(c, &req); err != nil {
		return err
	}
	channelCandidate := strings.TrimSpace(req.Channel)
	if channelCandidate == "" {
		channelCandidate = strings.TrimSpace(req.ContentChannel)
	}
	channel, ok := normalizeCookieChannel(channelCandidate)
	if !ok {
		return goerrors.New("invalid channel", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode("INVALID_CHANNEL")
	}
	path := strings.TrimSpace(h.cfg.BasePath)
	if path == "" {
		path = "/"
	}
	cookie := router.FirstPartySessionCookie(channelCookieName, channel)
	cookie.Path = path
	if channel == "" {
		cookie.MaxAge = -1
		cookie.Expires = time.Unix(0, 0)
		cookie.SessionOnly = false
	} else {
		cookie.Expires = time.Now().Add(365 * 24 * time.Hour)
		cookie.SessionOnly = false
	}
	c.Cookie(&cookie)
	return c.JSON(http.StatusOK, map[string]any{
		"channel": channel,
	})
}

func (h *contentTypeBuilderHandlers) listPanelRecords(c router.Context, panelName string) ([]map[string]any, int, error) {
	if h.admin == nil || h.admin.Registry() == nil {
		return nil, 0, goerrors.New("admin not configured", goerrors.CategoryInternal).
			WithCode(http.StatusInternalServerError).
			WithTextCode("ADMIN_UNAVAILABLE")
	}
	panel, ok := h.admin.Registry().Panel(panelName)
	if !ok || panel == nil {
		return nil, 0, goerrors.New("panel not found", goerrors.CategoryInternal).
			WithCode(http.StatusNotFound).
			WithTextCode("PANEL_NOT_FOUND")
	}
	search := strings.TrimSpace(c.Query("search"))
	filters := map[string]any{}
	if category := strings.TrimSpace(c.Query("category")); category != "" {
		filters["category"] = category
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		filters["status"] = status
	}
	adminCtx := adminContextFromRequest(h.admin, c, h.cfg.DefaultLocale)
	channel := resolveContentChannel(c)
	if strings.EqualFold(strings.TrimSpace(panelName), "block_definitions") ||
		strings.EqualFold(strings.TrimSpace(panelName), "content_types") {
		channel = normalizeChannelKey(channel)
	}
	if channel != "" {
		filters[admin.ContentChannelScopeQueryParam] = channel
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

func (h *contentTypeBuilderHandlers) contentTypeDiagnostics(c router.Context) contentChannelDiagnostics {
	requested := strings.ToLower(strings.TrimSpace(resolveContentChannel(c)))
	effective := normalizeChannelKey(requested)
	diagnostics := contentChannelDiagnostics{
		EffectiveChannel:  effective,
		RequestedChannel:  requested,
		TotalEffective:    0,
		TotalDefault:      0,
		AvailableChannels: []string{defaultChannelKey},
	}
	if h.contentTypeSvc == nil {
		return diagnostics
	}

	defaultTypes, defaultErr := h.contentTypeSvc.ContentTypes(admin.WithContentChannel(context.Background(), defaultChannelKey))
	effectiveTypes := defaultTypes
	effectiveErr := defaultErr
	if effective != defaultChannelKey {
		effectiveTypes, effectiveErr = h.contentTypeSvc.ContentTypes(admin.WithContentChannel(context.Background(), effective))
	}
	if defaultErr != nil || effectiveErr != nil {
		return diagnostics
	}

	envSet := map[string]struct{}{
		defaultChannelKey: {},
		effective:         {},
	}
	addEnv := func(types []admin.CMSContentType, fallback string) {
		for _, ct := range types {
			channel := strings.TrimSpace(admin.CMSContentTypeChannel(ct))
			env := normalizeChannelKey(channel)
			if env == defaultChannelKey && channel == "" {
				env = normalizeChannelKey(fallback)
			}
			envSet[env] = struct{}{}
		}
	}
	addEnv(defaultTypes, defaultChannelKey)
	addEnv(effectiveTypes, effective)

	available := make([]string, 0, len(envSet))
	for env := range envSet {
		available = append(available, env)
	}
	sort.Strings(available)
	if len(available) > 1 {
		for i, env := range available {
			if env == defaultChannelKey {
				available[0], available[i] = available[i], available[0]
				break
			}
		}
	}

	diagnostics.TotalEffective = len(effectiveTypes)
	diagnostics.TotalDefault = len(defaultTypes)
	diagnostics.AvailableChannels = available
	return diagnostics
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
