package quickstart

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// ContentEntryUIOption customizes content entry UI routes.
type ContentEntryUIOption func(*contentEntryUIOptions)

type templateExistsFunc func(string) bool

type contentEntryUIOptions struct {
	basePath           string
	listTemplate       string
	formTemplate       string
	detailTemplate     string
	viewContext        UIViewContextBuilder
	permission         string
	authResource       string
	formRenderer       *admin.FormgenSchemaValidator
	templateExists     templateExistsFunc
	defaultRenderers   map[string]string
	translationUX      bool
	dataGridStateStore PanelDataGridStateStoreOptions
	dataGridURLState   PanelDataGridURLStateOptions
}

const textCodeTranslationFallbackEditBlocked = "TRANSLATION_FALLBACK_EDIT_BLOCKED"

var recommendedContentEntryDefaultRenderers = map[string]string{
	"blocks":               "blocks_chips",
	"block-library-picker": "blocks_chips",
}

// RecommendedContentEntryDefaultRenderers returns a copy of the recommended
// default renderer map used by WithContentEntryRecommendedDefaults.
func RecommendedContentEntryDefaultRenderers() map[string]string {
	return cloneStringMap(recommendedContentEntryDefaultRenderers)
}

// WithContentEntryUIBasePath overrides the base path used to build content entry routes.
func WithContentEntryUIBasePath(basePath string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.basePath = strings.TrimSpace(basePath)
		}
	}
}

// WithContentEntryUITemplates overrides template names for content entry routes.
func WithContentEntryUITemplates(listTemplate, formTemplate, detailTemplate string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		if strings.TrimSpace(listTemplate) != "" {
			opts.listTemplate = strings.TrimSpace(listTemplate)
		}
		if strings.TrimSpace(formTemplate) != "" {
			opts.formTemplate = strings.TrimSpace(formTemplate)
		}
		if strings.TrimSpace(detailTemplate) != "" {
			opts.detailTemplate = strings.TrimSpace(detailTemplate)
		}
	}
}

// WithContentEntryUIViewContext overrides the view context builder for content entry routes.
func WithContentEntryUIViewContext(builder UIViewContextBuilder) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && builder != nil {
			opts.viewContext = builder
		}
	}
}

// WithContentEntryUIPermission sets the permission used for authz checks.
func WithContentEntryUIPermission(permission string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.permission = strings.TrimSpace(permission)
		}
	}
}

// WithContentEntryUIAuthResource overrides the go-auth resource used for checks.
func WithContentEntryUIAuthResource(resource string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.authResource = strings.TrimSpace(resource)
		}
	}
}

// WithContentEntryFormRenderer overrides the form renderer used for content entry forms.
func WithContentEntryFormRenderer(renderer *admin.FormgenSchemaValidator) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil && renderer != nil {
			opts.formRenderer = renderer
		}
	}
}

// WithContentEntryUITemplateExists sets a template existence checker used to resolve panel template fallbacks.
func WithContentEntryUITemplateExists(checker func(name string) bool) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil || checker == nil {
			return
		}
		opts.templateExists = checker
	}
}

// WithContentEntryUITemplateFS configures deterministic template fallback resolution from filesystem sources.
func WithContentEntryUITemplateFS(fsys ...fs.FS) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil || len(fsys) == 0 {
			return
		}
		if checker := templateExistsFromFS(fsys...); checker != nil {
			opts.templateExists = checker
		}
	}
}

// WithContentEntryDefaultRenderers replaces the configured default renderer map.
// Values are used when ui_schema does not specify a renderer.
func WithContentEntryDefaultRenderers(renderers map[string]string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.defaultRenderers = contentEntryNormalizeDefaultRenderers(renderers)
	}
}

// WithContentEntryMergeDefaultRenderers merges renderer defaults into the existing map.
// Keys in renderers override existing configured values.
func WithContentEntryMergeDefaultRenderers(renderers map[string]string) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.defaultRenderers = contentEntryMergeDefaultRenderers(opts.defaultRenderers, renderers)
	}
}

// WithContentEntryRecommendedDefaults merges recommended content-entry defaults.
func WithContentEntryRecommendedDefaults() ContentEntryUIOption {
	return WithContentEntryMergeDefaultRenderers(RecommendedContentEntryDefaultRenderers())
}

// WithContentEntryTranslationUX enables translation list UX enhancements
// (grouped/matrix view mode wiring and grouped URL sync) for translation-enabled panels.
func WithContentEntryTranslationUX(enabled bool) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts != nil {
			opts.translationUX = enabled
		}
	}
}

// WithContentEntryDataGridStateStore configures DataGrid persisted-state storage for content list templates.
func WithContentEntryDataGridStateStore(cfg PanelDataGridStateStoreOptions) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.dataGridStateStore = cfg
	}
}

// WithContentEntryDataGridURLState configures DataGrid URL-state limits for content list templates.
func WithContentEntryDataGridURLState(cfg PanelDataGridURLStateOptions) ContentEntryUIOption {
	return func(opts *contentEntryUIOptions) {
		if opts == nil {
			return
		}
		opts.dataGridURLState = cfg
	}
}

// RegisterContentEntryUIRoutes registers HTML routes for content entries.
func RegisterContentEntryUIRoutes[T any](
	r router.Router[T],
	cfg admin.Config,
	adm *admin.Admin,
	auth admin.HandlerAuthenticator,
	opts ...ContentEntryUIOption,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	options := contentEntryUIOptions{
		basePath:       strings.TrimSpace(cfg.BasePath),
		listTemplate:   "resources/content/list",
		formTemplate:   "resources/content/form",
		detailTemplate: "resources/content/detail",
		authResource:   "admin",
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
	if options.formRenderer == nil {
		apiBase := ""
		if adm != nil {
			apiBase = adm.AdminAPIBasePath()
		}
		renderer, err := admin.NewFormgenSchemaValidatorWithAPIBase(cfg.BasePath, apiBase)
		if err != nil {
			return err
		}
		options.formRenderer = renderer
	}

	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if auth != nil {
			return auth.WrapHandler(handler)
		}
		return handler
	}

	handlers := newContentEntryHandlers(adm, cfg, options.viewContext, options)
	// TODO: Make configurable, use URLKit and url manager
	base := path.Join(options.basePath, "content")
	listPath := path.Join(base, ":name")
	newPath := path.Join(base, ":name", "new")
	createPath := path.Join(base, ":name")
	detailPath := path.Join(base, ":name", ":id")
	editPath := path.Join(base, ":name", ":id", "edit")
	updatePath := path.Join(base, ":name", ":id")
	deletePath := path.Join(base, ":name", ":id", "delete")

	r.Get(listPath, wrap(handlers.List))
	r.Get(newPath, wrap(handlers.New))
	r.Post(createPath, wrap(handlers.Create))
	r.Get(detailPath, wrap(handlers.Detail))
	r.Get(editPath, wrap(handlers.Edit))
	r.Post(updatePath, wrap(handlers.Update))
	r.Post(deletePath, wrap(handlers.Delete))
	registerCanonicalContentEntryPanelRoutes(r, adm, wrap, handlers)
	return nil
}

func registerCanonicalContentEntryPanelRoutes[T any](
	r router.Router[T],
	adm *admin.Admin,
	wrap func(router.HandlerFunc) router.HandlerFunc,
	handlers *contentEntryHandlers,
) {
	if r == nil || adm == nil || handlers == nil || adm.Registry() == nil {
		return
	}
	bindings := canonicalPanelRouteBindings(adm.URLs(), adm.Registry().Panels())
	for _, binding := range bindings {
		panelName := strings.TrimSpace(binding.Panel)
		listPath := strings.TrimSpace(binding.Path)
		entryMode := binding.EntryMode
		if panelName == "" || listPath == "" {
			continue
		}
		newPath := path.Join(listPath, "new")
		detailPath := path.Join(listPath, ":id")
		editPath := path.Join(listPath, ":id", "edit")
		deletePath := path.Join(listPath, ":id", "delete")

		r.Get(listPath, wrap(func(c router.Context) error {
			return handlers.entryForPanel(c, panelName, entryMode)
		}))
		r.Get(newPath, wrap(func(c router.Context) error {
			return handlers.newForPanel(c, panelName)
		}))
		r.Post(listPath, wrap(func(c router.Context) error {
			return handlers.createForPanel(c, panelName)
		}))
		r.Get(detailPath, wrap(func(c router.Context) error {
			return handlers.detailForPanel(c, panelName)
		}))
		r.Get(editPath, wrap(func(c router.Context) error {
			return handlers.editForPanel(c, panelName)
		}))
		r.Post(detailPath, wrap(func(c router.Context) error {
			return handlers.updateForPanel(c, panelName)
		}))
		r.Post(deletePath, wrap(func(c router.Context) error {
			return handlers.deleteForPanel(c, panelName)
		}))
	}
}

type panelRouteBinding struct {
	Panel     string
	Path      string
	EntryMode admin.PanelEntryMode
}

func canonicalPanelRouteBindings(urls urlkit.Resolver, panels map[string]*admin.Panel) []panelRouteBinding {
	if len(panels) == 0 || urls == nil {
		return nil
	}
	panelNames := make([]string, 0, len(panels))
	for panelName := range panels {
		panelNames = append(panelNames, panelName)
	}
	sort.Strings(panelNames)

	pathSeen := map[string]bool{}
	out := make([]panelRouteBinding, 0, len(panelNames))
	for _, panelName := range panelNames {
		panel := panels[panelName]
		if panel != nil && panel.UIRouteMode() == admin.PanelUIRouteModeCustom {
			continue
		}
		canonicalPanel := canonicalPanelName(panelName)
		if canonicalPanel == "" {
			continue
		}
		routePath := resolveCanonicalPanelRoutePath(urls, canonicalPanel)
		if routePath == "" || pathSeen[routePath] {
			continue
		}
		pathSeen[routePath] = true
		entryMode := admin.PanelEntryModeList
		if panel != nil {
			entryMode = panel.EntryMode()
		}
		out = append(out, panelRouteBinding{Panel: canonicalPanel, Path: routePath, EntryMode: entryMode})
	}
	return out
}

func canonicalPanelName(panelName string) string {
	trimmed := strings.TrimSpace(panelName)
	if trimmed == "" {
		return ""
	}
	if at := strings.Index(trimmed, "@"); at > 0 {
		trimmed = strings.TrimSpace(trimmed[:at])
	}
	return trimmed
}

func resolveCanonicalPanelRoutePath(urls urlkit.Resolver, panelName string) string {
	for _, routeKey := range panelRouteKeys(panelName) {
		routePath := strings.TrimSpace(resolveRoutePath(urls, "admin", routeKey))
		if routePath == "" {
			continue
		}
		// Skip template routes (e.g. /content/:panel) and keep concrete panel routes.
		if strings.Contains(routePath, ":") || strings.Contains(routePath, "*") {
			continue
		}
		return routePath
	}
	return ""
}

func panelRouteKeys(panelName string) []string {
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return nil
	}
	out := []string{panelName}
	add := func(candidate string) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return
		}
		for _, existing := range out {
			if existing == candidate {
				return
			}
		}
		out = append(out, candidate)
	}
	add(strings.ReplaceAll(panelName, "-", "_"))
	add(strings.ReplaceAll(panelName, "_", "-"))
	return out
}

func contentEntryPanelSupportsTranslationUX(panel *admin.Panel) bool {
	if panel == nil {
		return false
	}
	schema := panel.Schema()
	for _, action := range schema.Actions {
		if strings.EqualFold(strings.TrimSpace(action.Name), admin.CreateTranslationKey) {
			return true
		}
	}
	for _, field := range schema.ListFields {
		if strings.EqualFold(strings.TrimSpace(field.Name), "translation_group_id") {
			return true
		}
	}
	return false
}

func contentEntryTranslationDefaultViewMode(enabled bool) string {
	if enabled {
		return "grouped"
	}
	return ""
}

func contentEntryTranslationGroupByField(enabled bool) string {
	if enabled {
		return "translation_group_id"
	}
	return ""
}

type contentEntryHandlers struct {
	admin              *admin.Admin
	cfg                admin.Config
	viewContext        UIViewContextBuilder
	listTemplate       string
	formTemplate       string
	detailTemplate     string
	permission         string
	authResource       string
	contentTypes       admin.CMSContentTypeService
	formRenderer       *admin.FormgenSchemaValidator
	templateExists     templateExistsFunc
	defaultRenderers   map[string]string
	translationUX      bool
	dataGridStateStore PanelDataGridStateStoreOptions
	dataGridURLState   PanelDataGridURLStateOptions
}

func newContentEntryHandlers(adm *admin.Admin, cfg admin.Config, viewCtx UIViewContextBuilder, opts contentEntryUIOptions) *contentEntryHandlers {
	var contentTypes admin.CMSContentTypeService
	if adm != nil {
		contentTypes = adm.ContentTypeService()
	}
	return &contentEntryHandlers{
		admin:              adm,
		cfg:                cfg,
		viewContext:        viewCtx,
		listTemplate:       opts.listTemplate,
		formTemplate:       opts.formTemplate,
		detailTemplate:     opts.detailTemplate,
		permission:         strings.TrimSpace(opts.permission),
		authResource:       strings.TrimSpace(opts.authResource),
		contentTypes:       contentTypes,
		formRenderer:       opts.formRenderer,
		templateExists:     opts.templateExists,
		defaultRenderers:   cloneStringMap(opts.defaultRenderers),
		translationUX:      opts.translationUX,
		dataGridStateStore: opts.dataGridStateStore,
		dataGridURLState:   opts.dataGridURLState,
	}
}

func (h *contentEntryHandlers) List(c router.Context) error {
	return h.listForPanel(c, "")
}

func (h *contentEntryHandlers) listForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "read"); err != nil {
		return err
	}
	items, total, err := h.listPanelItems(panel, adminCtx)
	if err != nil {
		return err
	}
	filters := contentEntryFilters(panel)
	columns := contentEntryColumns(panel, contentType, filters, h.defaultRenderers)
	// Inject block icons map for blocks_chips renderer (only when needed).
	if contentEntryNeedsBlocksChips(columns) {
		if iconMap := contentEntryBlockIconsMap(adminCtx, h.admin); iconMap != nil {
			columns = contentEntryAttachBlocksIconMap(columns, iconMap)
		}
	}
	var urls urlkit.Resolver
	if h.admin != nil {
		urls = h.admin.URLs()
	}
	basePath := resolveAdminBasePath(urls, h.cfg.BasePath)
	slug := contentTypeSlug(contentType, panelName)
	actionBase := path.Join(basePath, "content", slug)
	routes := newContentEntryRoutes(basePath, slug, adminCtx.Environment)
	routesMap := routes.routesMap()
	if contentTypeSchema(contentType, panel) == nil {
		routesMap["new"] = ""
		routesMap["create"] = ""
	}
	dataTableID := "content-" + slug
	listAPI := resolveAdminPanelAPICollectionURL(urls, h.cfg, basePath, panelName)
	translationUXEnabled := h.translationUX && contentEntryPanelSupportsTranslationUX(panel)
	stateStoreCfg := h.dataGridStateStore
	stateStoreConfigured := strings.TrimSpace(stateStoreCfg.Mode) != "" ||
		strings.TrimSpace(stateStoreCfg.Resource) != "" ||
		stateStoreCfg.SyncDebounceMS > 0 ||
		stateStoreCfg.MaxShareEntries > 0
	if stateStoreConfigured && strings.TrimSpace(stateStoreCfg.Resource) == "" {
		stateStoreCfg.Resource = panelName
	}

	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      basePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"routes":         routesMap,
		"action_base":    actionBase,
		"items":          items,
		"columns":        columns,
		"filters":        filters,
		"total":          total,
		"datatable_id":   dataTableID,
		"list_api":       listAPI,
		"env":            adminCtx.Environment,
		"panel_name":     panelName,
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   slug,
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	viewCtx = mergeViewContext(viewCtx, BuildPanelViewCapabilities(h.cfg, PanelViewCapabilityOptions{
		BasePath:    basePath,
		URLResolver: urls,
		Definition:  canonicalPanelName(panelName),
		Variant:     adminCtx.Environment,
		DataGrid: PanelDataGridConfigOptions{
			TableID:           dataTableID,
			APIEndpoint:       listAPI,
			ActionBase:        actionBase,
			TranslationUX:     translationUXEnabled,
			EnableGroupedMode: translationUXEnabled,
			DefaultViewMode:   contentEntryTranslationDefaultViewMode(translationUXEnabled),
			GroupByField:      contentEntryTranslationGroupByField(translationUXEnabled),
			StateStore:        stateStoreCfg,
			URLState:          h.dataGridURLState,
		},
	}))
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return h.renderTemplate(c, contentTypeSlug(contentType, panelName), h.listTemplate, viewCtx)
}

func (h *contentEntryHandlers) New(c router.Context) error {
	return h.newForPanel(c, "")
}

func (h *contentEntryHandlers) newForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if contentTypeSchema(contentType, panel) == nil {
		return admin.ErrNotFound
	}
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
	}
	values := map[string]any{
		"locale": defaultLocaleValue("", h.cfg.DefaultLocale),
		"status": "draft",
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, nil, false, "")
}

func (h *contentEntryHandlers) Create(c router.Context) error {
	return h.createForPanel(c, "")
}

func (h *contentEntryHandlers) createForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	schema := contentTypeSchema(contentType, panel)
	if schema == nil {
		return admin.ErrNotFound
	}
	if err := h.guardPanel(c, panelName, panel, "create"); err != nil {
		return err
	}
	record, err := h.parseFormPayload(c, schema)
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	if status := strings.TrimSpace(anyToString(record["status"])); status == "" {
		record["status"] = "draft"
	}
	created, err := panel.Create(adminCtx, record)
	if err != nil {
		return err
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Environment)
	return c.Redirect(contentEntryCreateRedirectTarget(baseSlug, anyToString(created["id"]), routes))
}

func (h *contentEntryHandlers) Detail(c router.Context) error {
	return h.detailForPanel(c, "")
}

func (h *contentEntryHandlers) entryForPanel(c router.Context, panelSlug string, entryMode admin.PanelEntryMode) error {
	switch entryMode {
	case admin.PanelEntryModeDetailCurrentUser:
		adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
		userID := strings.TrimSpace(adminCtx.UserID)
		if userID == "" {
			return admin.ErrForbidden
		}
		return h.detailForPanelWithID(c, panelSlug, userID)
	default:
		return h.listForPanel(c, panelSlug)
	}
}

func (h *contentEntryHandlers) detailForPanel(c router.Context, panelSlug string) error {
	return h.detailForPanelWithID(c, panelSlug, strings.TrimSpace(c.Param("id")))
}

func (h *contentEntryHandlers) detailForPanelWithID(c router.Context, panelSlug string, id string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "read"); err != nil {
		return err
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	baseSlug := contentTypeSlug(contentType, panelName)
	if record != nil {
		record = h.hydrateDetailRelationLinks(panelName, record, adminCtx.Environment)
		record["actions"] = map[string]string{
			"edit":   routes.edit(id),
			"delete": routes.delete(id),
		}
	}
	fields := detailFieldsForRecord(panel, contentType, record)
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.cfg.BasePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"panel_name":     baseSlug,
		"routes":         routes.routesMap(),
		"resource_item":  record,
		"fields":         fields,
		"upload_success": queryParamEnabled(c, "created"),
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   baseSlug,
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return h.renderTemplate(c, contentTypeSlug(contentType, panelName), h.detailTemplate, viewCtx)
}

func (h *contentEntryHandlers) Edit(c router.Context) error {
	return h.editForPanel(c, "")
}

func (h *contentEntryHandlers) editForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	record, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	values := contentEntryValues(record)
	previewURL, err := h.previewURLForRecord(c.Context(), panelName, id, record)
	if err != nil {
		return err
	}
	return h.renderForm(c, panelName, panel, contentType, adminCtx, values, record, true, previewURL)
}

func (h *contentEntryHandlers) Update(c router.Context) error {
	return h.updateForPanel(c, "")
}

func (h *contentEntryHandlers) updateForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "edit"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	existingRecord, err := panel.Get(adminCtx, id)
	if err != nil {
		return err
	}
	existingTranslationState := contentEntryTranslationStateFromRecord(existingRecord)
	if existingTranslationState.InFallbackMode {
		requestedLocale := strings.TrimSpace(existingTranslationState.RequestedLocale)
		if requestedLocale == "" {
			requestedLocale = contentEntryRequestedLocale(c, "")
		}
		return goerrors.New("cannot save fallback content; create the requested translation first", goerrors.CategoryValidation).
			WithCode(http.StatusConflict).
			WithTextCode(textCodeTranslationFallbackEditBlocked).
			WithMetadata(map[string]any{
				"panel":                    strings.TrimSpace(panelName),
				"id":                       strings.TrimSpace(id),
				"requested_locale":         requestedLocale,
				"resolved_locale":          strings.TrimSpace(existingTranslationState.ResolvedLocale),
				"missing_requested_locale": existingTranslationState.MissingRequestedLocale,
				"fallback_used":            existingTranslationState.FallbackUsed,
			})
	}
	record, err := h.parseFormPayload(c, contentTypeSchema(contentType, panel))
	if err != nil {
		return err
	}
	if locale := strings.TrimSpace(anyToString(record["locale"])); locale == "" {
		record["locale"] = defaultLocaleValue("", h.cfg.DefaultLocale)
	}
	updated, err := panel.Update(adminCtx, id, record)
	if err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	if updatedID := strings.TrimSpace(anyToString(updated["id"])); updatedID != "" {
		target := routes.edit(updatedID)
		if locale := contentEntryRequestedLocale(c, existingTranslationState.RequestedLocale); locale != "" {
			target = appendQueryParam(target, "locale", locale)
		}
		return c.Redirect(target)
	}
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) Delete(c router.Context) error {
	return h.deleteForPanel(c, "")
}

func (h *contentEntryHandlers) deleteForPanel(c router.Context, panelSlug string) error {
	panel, panelName, contentType, adminCtx, err := h.resolvePanelContext(c, panelSlug)
	if err != nil {
		return err
	}
	if err := h.guardPanel(c, panelName, panel, "delete"); err != nil {
		return err
	}
	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		return admin.ErrNotFound
	}
	if err := panel.Delete(adminCtx, id); err != nil {
		return err
	}
	routes := newContentEntryRoutes(h.cfg.BasePath, contentTypeSlug(contentType, panelName), adminCtx.Environment)
	return c.Redirect(routes.index())
}

func (h *contentEntryHandlers) resolvePanelContext(c router.Context, panelSlug string) (*admin.Panel, string, *admin.CMSContentType, admin.AdminContext, error) {
	if h.admin == nil || h.admin.Registry() == nil {
		return nil, "", nil, admin.AdminContext{}, admin.ErrNotFound
	}
	name := strings.TrimSpace(panelSlug)
	fromContentNameParam := false
	if name == "" && c != nil {
		name = strings.TrimSpace(c.Param("name"))
		fromContentNameParam = name != ""
	}
	if name == "" {
		return nil, "", nil, admin.AdminContext{}, admin.ErrNotFound
	}
	adminCtx := adminContextFromRequest(c, h.cfg.DefaultLocale)
	panel, panelName, err := h.panelFor(name, adminCtx.Environment)
	if err != nil {
		return nil, "", nil, adminCtx, err
	}
	// Generic /content/:name routes should not serve panels that explicitly own
	// their UI route surface (e.g. /users is owned by dedicated handlers).
	if fromContentNameParam && panel != nil && panel.UIRouteMode() == admin.PanelUIRouteModeCustom {
		return nil, "", nil, adminCtx, admin.ErrNotFound
	}
	contentType, err := h.contentTypeFor(adminCtx.Context, name, adminCtx.Environment)
	if err != nil {
		if !errors.Is(err, admin.ErrNotFound) {
			return nil, "", nil, adminCtx, err
		}
		contentType = nil
	}
	return panel, panelName, contentType, adminCtx, nil
}

func (h *contentEntryHandlers) panelFor(slug string, env string) (*admin.Panel, string, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, "", admin.ErrNotFound
	}
	panelName := slug
	if strings.TrimSpace(env) != "" {
		panelName = slug + "@" + strings.TrimSpace(env)
	}
	if panel, ok := h.admin.Registry().Panel(panelName); ok && panel != nil {
		return panel, panelName, nil
	}
	if panel, ok := h.admin.Registry().Panel(slug); ok && panel != nil {
		return panel, slug, nil
	}
	return nil, panelName, admin.ErrNotFound
}

func (h *contentEntryHandlers) contentTypeFor(ctx context.Context, slug string, env string) (*admin.CMSContentType, error) {
	if h.contentTypes == nil {
		return nil, admin.ErrNotFound
	}
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, admin.ErrNotFound
	}
	env = strings.TrimSpace(env)
	if env == "" {
		return h.contentTypes.ContentTypeBySlug(ctx, slug)
	}
	types, err := h.contentTypes.ContentTypes(ctx)
	if err != nil {
		return nil, err
	}
	for _, ct := range types {
		if !strings.EqualFold(strings.TrimSpace(ct.Environment), env) {
			continue
		}
		panelSlug := contentTypePanelSlug(&ct)
		if strings.EqualFold(strings.TrimSpace(ct.Slug), slug) || (panelSlug != "" && strings.EqualFold(panelSlug, slug)) {
			contentType := ct
			return &contentType, nil
		}
	}
	return h.contentTypes.ContentTypeBySlug(ctx, slug)
}

func (h *contentEntryHandlers) hydrateDetailRelationLinks(panelName string, record map[string]any, env string) map[string]any {
	if len(record) == 0 {
		return record
	}
	var urls urlkit.Resolver
	if h != nil && h.admin != nil {
		urls = h.admin.URLs()
	}
	links := contentEntryRecordLinks(record["links"])
	for key, rawID := range record {
		key = strings.TrimSpace(key)
		if key == "" || key == "id" || !strings.HasSuffix(strings.ToLower(key), "_id") {
			continue
		}
		relationID := strings.TrimSpace(anyToString(rawID))
		if relationID == "" {
			continue
		}
		relationName := strings.TrimSuffix(key, "_id")
		relationPanel := h.resolveRelationPanelName(panelName, relationName, env)
		if relationPanel == "" {
			continue
		}
		relationURL := strings.TrimSpace(resolveAdminPanelDetailURL(urls, h.cfg.BasePath, relationPanel, relationID))
		if relationURL == "" {
			continue
		}
		relationURL = contentEntryURLWithEnv(relationURL, env)
		record[relationName+"_url"] = relationURL
		links[relationName] = relationURL
		links[key] = relationURL
	}
	if len(links) > 0 {
		record["links"] = links
	}
	return record
}

func (h *contentEntryHandlers) resolveRelationPanelName(panelName, relationName, env string) string {
	candidates := relationPanelCandidates(panelName, relationName)
	if len(candidates) == 0 {
		return ""
	}
	env = strings.TrimSpace(env)
	registry := h.admin
	if registry == nil || registry.Registry() == nil {
		return candidates[0]
	}
	for _, candidate := range candidates {
		if _, ok := registry.Registry().Panel(candidate); ok {
			return candidate
		}
		if env != "" {
			if _, ok := registry.Registry().Panel(candidate + "@" + env); ok {
				return candidate
			}
		}
	}
	return ""
}

func relationPanelCandidates(panelName, relationName string) []string {
	relationName = strings.TrimSpace(relationName)
	if relationName == "" {
		return nil
	}
	normalized := strings.ReplaceAll(relationName, "-", "_")
	plural := normalizeRelationPlural(normalized)
	prefix := relationPanelPrefix(panelName)
	out := make([]string, 0, 6)
	add := func(candidate string) {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			return
		}
		for _, existing := range out {
			if strings.EqualFold(existing, candidate) {
				return
			}
		}
		out = append(out, candidate)
	}
	if prefix != "" {
		add(prefix + "_" + plural)
		add(prefix + "_" + normalized)
	}
	add(plural)
	add(normalized)
	return out
}

func relationPanelPrefix(panelName string) string {
	panelName = strings.TrimSpace(canonicalPanelName(panelName))
	if panelName == "" {
		return ""
	}
	split := strings.FieldsFunc(panelName, func(r rune) bool {
		return r == '_' || r == '-'
	})
	if len(split) < 2 {
		return ""
	}
	return strings.TrimSpace(split[0])
}

func normalizeRelationPlural(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if strings.HasSuffix(value, "s") {
		return value
	}
	return value + "s"
}

func contentEntryRecordLinks(raw any) map[string]string {
	links := map[string]string{}
	switch typed := raw.(type) {
	case map[string]string:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			value = strings.TrimSpace(value)
			if key == "" || value == "" {
				continue
			}
			links[key] = value
		}
	case map[string]any:
		for key, value := range typed {
			key = strings.TrimSpace(key)
			parsed := strings.TrimSpace(anyToString(value))
			if key == "" || parsed == "" {
				continue
			}
			links[key] = parsed
		}
	}
	return links
}

func contentEntryURLWithEnv(rawURL, env string) string {
	rawURL = strings.TrimSpace(rawURL)
	env = strings.TrimSpace(env)
	if rawURL == "" || env == "" {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	query := parsed.Query()
	if strings.TrimSpace(query.Get("env")) == "" {
		query.Set("env", env)
		parsed.RawQuery = query.Encode()
	}
	return parsed.String()
}

func (h *contentEntryHandlers) listPanelItems(panel *admin.Panel, adminCtx admin.AdminContext) ([]map[string]any, int, error) {
	if panel == nil {
		return nil, 0, admin.ErrNotFound
	}
	items, total, err := panel.List(adminCtx, admin.ListOptions{Page: 1, PerPage: 1})
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (h *contentEntryHandlers) guardPanel(c router.Context, panelName string, panel *admin.Panel, action string) error {
	if c == nil {
		return admin.ErrForbidden
	}
	permission := strings.TrimSpace(h.permission)
	if permission == "" && panel != nil {
		perms := panel.Schema().Permissions
		switch action {
		case "read":
			permission = perms.View
		case "create":
			permission = perms.Create
		case "edit":
			permission = perms.Edit
		case "delete":
			permission = perms.Delete
		}
	}
	if permission != "" {
		if authz := h.admin.Authorizer(); authz != nil {
			if authz.Can(c.Context(), permission, panelName) {
				return nil
			}
			return admin.ErrForbidden
		}
	}
	resource := h.authResource
	if resource == "" {
		resource = "admin"
	}
	if authlib.Can(c.Context(), resource, action) {
		return nil
	}
	if permission == "" {
		return nil
	}
	return admin.ErrForbidden
}

func (h *contentEntryHandlers) renderForm(
	c router.Context,
	panelName string,
	panel *admin.Panel,
	contentType *admin.CMSContentType,
	adminCtx admin.AdminContext,
	values map[string]any,
	resourceItem map[string]any,
	isEdit bool,
	previewURL string,
) error {
	if h.formRenderer == nil {
		return errors.New("form renderer is not configured")
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Environment)
	translationState := contentEntryTranslationStateFromRecord(resourceItem)
	formAction := routes.create()
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		formAction = routes.update(id)
		if locale := contentEntryRequestedLocale(c, translationState.RequestedLocale); locale != "" {
			formAction = appendQueryParam(formAction, "locale", locale)
		}
	}
	schema := contentTypeSchema(contentType, panel)
	if schema == nil {
		return admin.ErrNotFound
	}
	uiSchema := contentTypeUISchema(contentType)
	opts := admin.SchemaValidationOptions{
		Slug:     formAction,
		UISchema: uiSchema,
	}
	renderOpts := formgenrender.RenderOptions{Values: values}
	html, err := h.formRenderer.RenderForm(c.Context(), schema, opts, renderOpts)
	if err != nil {
		return err
	}
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.cfg.BasePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"panel_name":     baseSlug,
		"routes":         routes.routesMap(),
		"form_action":    formAction,
		"form_html":      html,
		"resource_item":  resourceItem,
		"is_edit":        isEdit,
		"create_success": queryParamEnabled(c, "created"),
		"preview_url":    strings.TrimSpace(previewURL),
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   baseSlug,
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return h.renderTemplate(c, baseSlug, h.formTemplate, viewCtx)
}

func (h *contentEntryHandlers) previewURLForRecord(ctx context.Context, panelName, id string, record map[string]any) (string, error) {
	if h == nil || h.admin == nil || strings.TrimSpace(id) == "" {
		return "", nil
	}
	targetPath := resolveContentEntryPreviewPath(panelName, record)
	if targetPath == "" {
		return "", nil
	}
	previewSvc := h.admin.Preview()
	if previewSvc == nil {
		return "", nil
	}
	token, err := previewSvc.Generate(strings.TrimSpace(panelName), strings.TrimSpace(id), time.Hour)
	if err != nil {
		return "", err
	}
	return buildSitePreviewURL(targetPath, token), nil
}

func resolveContentEntryPreviewPath(panelName string, record map[string]any) string {
	_ = panelName
	if record == nil {
		return ""
	}
	for _, key := range []string{"path", "preview_url"} {
		if resolved := normalizePreviewPath(anyToString(record[key])); resolved != "" {
			return resolved
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		for _, key := range []string{"path", "preview_url"} {
			if resolved := normalizePreviewPath(anyToString(data[key])); resolved != "" {
				return resolved
			}
		}
	}
	slug := strings.TrimSpace(anyToString(record["slug"]))
	if slug == "" {
		return ""
	}
	return normalizePreviewPath(slug)
}

func normalizePreviewPath(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return trimmed
}

func buildSitePreviewURL(targetPath, token string) string {
	path := strings.TrimSpace(targetPath)
	token = strings.TrimSpace(token)
	if path == "" || token == "" {
		return ""
	}
	separator := "?"
	if strings.Contains(path, "?") {
		separator = "&"
	}
	return path + separator + "preview_token=" + url.QueryEscape(token)
}

func (h *contentEntryHandlers) parseFormPayload(c router.Context, schema map[string]any) (map[string]any, error) {
	if c == nil {
		return map[string]any{}, nil
	}
	if isJSONRequest(c) {
		payload := map[string]any{}
		if err := parseJSONBody(c, &payload); err != nil {
			return nil, err
		}
		return payload, nil
	}
	body := c.Body()
	values := url.Values{}
	if len(body) > 0 {
		if isMultipartFormRequest(c) {
			parsed, err := parseMultipartFormValues(c)
			if err != nil {
				return nil, goerrors.New("invalid multipart form payload", goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			values = parsed
		} else {
			parsed, err := url.ParseQuery(string(body))
			if err != nil {
				return nil, goerrors.New("invalid form payload", goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			values = parsed
		}
	}
	record := map[string]any{}
	schemaMap, boolPaths := flattenSchema(schema)
	for key, vals := range values {
		if key == "" {
			continue
		}
		if len(vals) == 0 {
			continue
		}
		schemaDef := schemaMap[key]
		if len(vals) > 1 {
			value, err := parseMultiValue(vals, schemaDef)
			if err != nil {
				return nil, goerrors.New(fmt.Sprintf("invalid form payload for %s", strings.TrimSpace(key)), goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			setNestedValue(record, key, value)
			continue
		}
		value := parseValue(vals[0], schemaDef)
		setNestedValue(record, key, value)
	}
	for _, path := range boolPaths {
		if !hasNestedValue(record, path) {
			setNestedValue(record, path, false)
		}
	}
	return record, nil
}

func isMultipartFormRequest(c router.Context) bool {
	contentType := strings.ToLower(strings.TrimSpace(requestContentType(c)))
	return strings.Contains(contentType, "multipart/form-data")
}

func requestContentType(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Header("Content-Type"))
}

func parseMultipartFormValues(c router.Context) (url.Values, error) {
	values := url.Values{}
	if c == nil {
		return values, nil
	}
	body := c.Body()
	if len(body) == 0 {
		return values, nil
	}
	contentType := strings.TrimSpace(requestContentType(c))
	if contentType == "" {
		return values, nil
	}
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, err
	}
	boundary := strings.TrimSpace(params["boundary"])
	if boundary == "" {
		return nil, fmt.Errorf("missing multipart boundary")
	}
	reader := multipart.NewReader(bytes.NewReader(body), boundary)
	for {
		part, err := reader.NextPart()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, err
		}
		name := strings.TrimSpace(part.FormName())
		if name == "" {
			_ = part.Close()
			continue
		}
		if strings.TrimSpace(part.FileName()) != "" {
			_ = part.Close()
			continue
		}
		data, readErr := io.ReadAll(part)
		_ = part.Close()
		if readErr != nil {
			return nil, readErr
		}
		values.Add(name, string(data))
	}
	return values, nil
}

func contentEntryValues(record map[string]any) map[string]any {
	values := map[string]any{}
	if record == nil {
		return values
	}
	for key, val := range record {
		if key == "data" {
			continue
		}
		values[key] = val
	}
	if data, ok := record["data"].(map[string]any); ok {
		for key, val := range data {
			if _, exists := values[key]; exists {
				continue
			}
			values[key] = val
		}
	}
	return values
}

type contentEntryTranslationState struct {
	RequestedLocale        string
	ResolvedLocale         string
	MissingRequestedLocale bool
	FallbackUsed           bool
	InFallbackMode         bool
}

func contentEntryTranslationStateFromRecord(record map[string]any) contentEntryTranslationState {
	state := contentEntryTranslationState{}
	if len(record) == 0 {
		return state
	}
	state.RequestedLocale = contentEntryStringField(record, []string{
		"requested_locale",
		"translation.meta.requested_locale",
		"content_translation.meta.requested_locale",
	})
	state.ResolvedLocale = contentEntryStringField(record, []string{
		"resolved_locale",
		"locale",
		"translation.meta.resolved_locale",
		"content_translation.meta.resolved_locale",
	})
	state.MissingRequestedLocale = contentEntryBoolField(record, []string{
		"missing_requested_locale",
		"translation.meta.missing_requested_locale",
		"content_translation.meta.missing_requested_locale",
	})
	state.FallbackUsed = contentEntryBoolField(record, []string{
		"fallback_used",
		"translation.meta.fallback_used",
		"content_translation.meta.fallback_used",
	})
	if !state.FallbackUsed && state.RequestedLocale != "" && state.ResolvedLocale != "" &&
		!strings.EqualFold(state.RequestedLocale, state.ResolvedLocale) {
		state.FallbackUsed = true
	}
	if !state.MissingRequestedLocale && state.FallbackUsed {
		state.MissingRequestedLocale = true
	}
	state.InFallbackMode = state.FallbackUsed || state.MissingRequestedLocale
	return state
}

func contentEntryRequestedLocale(c router.Context, fallback string) string {
	if c != nil {
		if locale := strings.TrimSpace(c.Query("locale")); locale != "" {
			return locale
		}
		if locale := strings.TrimSpace(c.Query("requested_locale")); locale != "" {
			return locale
		}
	}
	return strings.TrimSpace(fallback)
}

func contentEntryStringField(record map[string]any, paths []string) string {
	for _, path := range paths {
		value := contentEntryNestedValue(record, path)
		if value == nil {
			continue
		}
		if trimmed := strings.TrimSpace(anyToString(value)); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func contentEntryBoolField(record map[string]any, paths []string) bool {
	for _, path := range paths {
		value := contentEntryNestedValue(record, path)
		switch typed := value.(type) {
		case bool:
			return typed
		case string:
			switch strings.ToLower(strings.TrimSpace(typed)) {
			case "true", "1", "yes", "on":
				return true
			case "false", "0", "no", "off":
				return false
			}
		}
	}
	return false
}

func contentEntryNestedValue(record map[string]any, lookupPath string) any {
	lookupPath = strings.TrimSpace(lookupPath)
	if len(record) == 0 || lookupPath == "" {
		return nil
	}
	parts := strings.Split(lookupPath, ".")
	var current any = record
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			return nil
		}
		currentMap, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		next, exists := currentMap[part]
		if !exists {
			return nil
		}
		current = next
	}
	return current
}

func contentEntryColumns(panel *admin.Panel, contentType *admin.CMSContentType, filters []map[string]any, defaultRenderers map[string]string) []map[string]any {
	fields := []admin.Field{}
	filterable := map[string]struct{}{}
	if panel != nil {
		schema := panel.Schema()
		fields = schema.ListFields
		for _, filter := range schema.Filters {
			name := strings.TrimSpace(filter.Name)
			if name == "" {
				continue
			}
			filterable[name] = struct{}{}
		}
	}
	for _, filter := range filters {
		name := strings.TrimSpace(anyToString(filter["name"]))
		if name == "" {
			continue
		}
		filterable[name] = struct{}{}
	}
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title"},
			{Name: "slug", Label: "Slug"},
			{Name: "status", Label: "Status"},
			{Name: "locale", Label: "Locale"},
		}
	}
	cols := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(strings.TrimSpace(field.Name))
		}
		sortable := contentEntryFieldSortable(field)
		col := map[string]any{
			"field":      field.Name,
			"label":      label,
			"sortable":   sortable,
			"filterable": false,
			"default":    !field.Hidden,
		}
		renderer, rendererOptions := contentEntryFieldRenderer(field, contentType, defaultRenderers)
		if renderer != "" {
			col["renderer"] = renderer
		}
		if len(rendererOptions) > 0 {
			col["renderer_options"] = rendererOptions
		}
		if _, ok := filterable[field.Name]; ok {
			col["filterable"] = true
		}
		cols = append(cols, col)
	}
	return cols
}

func contentEntryFieldSortable(field admin.Field) bool {
	if field.Hidden {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "textarea", "json", "object", "array", "block-library-picker", "blocks":
		return false
	default:
		return true
	}
}

func contentEntryFieldRenderer(field admin.Field, contentType *admin.CMSContentType, defaultRenderers map[string]string) (string, map[string]any) {
	hints := contentEntryFieldUISchemaHints(contentType, field.Name)
	renderer := contentEntryRendererNameFromHints(hints)
	if renderer == "" {
		renderer = contentEntryDefaultRenderer(field, defaultRenderers)
	}
	return renderer, contentEntryRendererOptionsFromHints(hints)
}

func contentEntryDefaultRenderer(field admin.Field, defaultRenderers map[string]string) string {
	if renderer := contentEntryConfiguredDefaultRenderer(field, defaultRenderers); renderer != "" {
		return renderer
	}
	fieldType := strings.ToLower(strings.TrimSpace(field.Type))
	fieldName := strings.ToLower(strings.TrimSpace(field.Name))
	switch fieldType {
	case "array", "multiselect", "list", "tags", "block-library-picker", "blocks":
		return "_array"
	case "json", "jsonschema", "object":
		return "_object"
	}
	switch fieldName {
	case "tags", "blocks":
		return "_array"
	}
	return ""
}

func contentEntryConfiguredDefaultRenderer(field admin.Field, defaultRenderers map[string]string) string {
	if len(defaultRenderers) == 0 {
		return ""
	}
	fieldType := strings.ToLower(strings.TrimSpace(field.Type))
	if fieldType == "" {
		return ""
	}
	return strings.TrimSpace(defaultRenderers[fieldType])
}

func contentEntryNormalizeDefaultRenderers(renderers map[string]string) map[string]string {
	if len(renderers) == 0 {
		return nil
	}
	out := make(map[string]string, len(renderers))
	for fieldType, renderer := range renderers {
		key := strings.ToLower(strings.TrimSpace(fieldType))
		value := strings.TrimSpace(renderer)
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func contentEntryMergeDefaultRenderers(base map[string]string, renderers map[string]string) map[string]string {
	out := cloneStringMap(contentEntryNormalizeDefaultRenderers(base))
	normalized := contentEntryNormalizeDefaultRenderers(renderers)
	if len(normalized) == 0 {
		return out
	}
	if out == nil {
		out = make(map[string]string, len(normalized))
	}
	for fieldType, renderer := range normalized {
		out[fieldType] = renderer
	}
	return out
}

func contentEntryFieldUISchemaHints(contentType *admin.CMSContentType, fieldName string) map[string]any {
	if contentType == nil || len(contentType.UISchema) == 0 {
		return nil
	}
	fields, ok := contentType.UISchema["fields"].(map[string]any)
	if !ok || len(fields) == 0 {
		return nil
	}
	name := strings.TrimSpace(fieldName)
	if name == "" {
		return nil
	}
	candidates := []string{name, "/" + name}
	for _, key := range candidates {
		value, ok := fields[key]
		if !ok {
			continue
		}
		hints, ok := value.(map[string]any)
		if !ok {
			continue
		}
		return hints
	}
	return nil
}

func contentEntryHintScopes(hints map[string]any) []map[string]any {
	if len(hints) == 0 {
		return nil
	}
	scopes := []map[string]any{}
	for _, key := range []string{"table", "list", "datagrid", "data_grid"} {
		if value, ok := hints[key].(map[string]any); ok && len(value) > 0 {
			scopes = append(scopes, value)
		}
	}
	scopes = append(scopes, hints)
	return scopes
}

func contentEntryRendererNameFromHints(hints map[string]any) string {
	for _, scope := range contentEntryHintScopes(hints) {
		for _, key := range []string{"renderer", "cell_renderer", "cellRenderer"} {
			if name := strings.TrimSpace(anyToString(scope[key])); name != "" {
				return name
			}
		}
	}
	return ""
}

func contentEntryRendererOptionsFromHints(hints map[string]any) map[string]any {
	options := map[string]any{}
	for _, scope := range contentEntryHintScopes(hints) {
		for _, key := range []string{"renderer_options", "rendererOptions"} {
			raw, ok := scope[key].(map[string]any)
			if !ok || len(raw) == 0 {
				continue
			}
			for optKey, optValue := range raw {
				if _, exists := options[optKey]; exists {
					continue
				}
				options[optKey] = optValue
			}
		}
		if _, exists := options["display_key"]; !exists {
			if key := strings.TrimSpace(anyToString(scope["display_key"])); key != "" {
				options["display_key"] = key
			} else if key := strings.TrimSpace(anyToString(scope["displayKey"])); key != "" {
				options["display_key"] = key
			}
		}
		if _, exists := options["display_keys"]; !exists {
			keys := contentEntryStringList(scope["display_keys"])
			if len(keys) == 0 {
				keys = contentEntryStringList(scope["displayKeys"])
			}
			if len(keys) > 0 {
				out := make([]any, 0, len(keys))
				for _, key := range keys {
					out = append(out, key)
				}
				options["display_keys"] = out
			}
		}
	}
	if len(options) == 0 {
		return nil
	}
	return options
}

func contentEntryStringList(raw any) []string {
	switch typed := raw.(type) {
	case string:
		if value := strings.TrimSpace(typed); value != "" {
			return []string{value}
		}
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(item); value != "" {
				out = append(out, value)
			}
		}
		if len(out) > 0 {
			return out
		}
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(anyToString(item)); value != "" {
				out = append(out, value)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	return nil
}

func contentEntryFilters(panel *admin.Panel) []map[string]any {
	if panel == nil {
		return []map[string]any{}
	}
	schema := panel.Schema()
	optionsByField := map[string][]map[string]any{}
	formFieldByName := map[string]admin.Field{}
	for _, field := range schema.FormFields {
		name := strings.TrimSpace(field.Name)
		if name == "" {
			if name != "" {
				formFieldByName[name] = field
			}
			continue
		}
		if len(field.Options) > 0 {
			optionsByField[name] = contentEntryFilterOptions(field.Options)
		}
		formFieldByName[name] = field
	}
	if len(schema.Filters) == 0 {
		return contentEntryColumnFallbackFilters(schema.ListFields, formFieldByName, optionsByField)
	}
	out := make([]map[string]any, 0, len(schema.Filters))
	for _, filter := range schema.Filters {
		name := strings.TrimSpace(filter.Name)
		if name == "" {
			continue
		}
		label := strings.TrimSpace(filter.Label)
		if label == "" {
			label = titleCase(name)
		}
		entry := map[string]any{
			"name":  name,
			"label": label,
			"type":  strings.TrimSpace(filter.Type),
		}
		if len(filter.Operators) > 0 {
			entry["operators"] = append([]string{}, filter.Operators...)
		}
		if op := strings.TrimSpace(filter.DefaultOperator); op != "" {
			entry["default_operator"] = op
		}
		if len(filter.Options) > 0 {
			entry["options"] = contentEntryFilterOptions(filter.Options)
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryColumnFallbackFilters(listFields []admin.Field, formFieldByName map[string]admin.Field, optionsByField map[string][]map[string]any) []map[string]any {
	fields := listFields
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title", Type: "text"},
			{Name: "slug", Label: "Slug", Type: "text"},
			{Name: "status", Label: "Status", Type: "select"},
			{Name: "locale", Label: "Locale", Type: "select"},
		}
	}
	seen := map[string]struct{}{}
	out := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		name := strings.TrimSpace(field.Name)
		if name == "" || field.Hidden {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(name)
		}
		filterType := normalizeContentEntryFilterType(field.Type)
		if formField, ok := formFieldByName[name]; ok {
			if normalized := normalizeContentEntryFilterType(formField.Type); normalized != "" {
				filterType = normalized
			}
		}
		if filterType == "" {
			filterType = "text"
		}
		entry := map[string]any{
			"name":             name,
			"label":            label,
			"type":             filterType,
			"operators":        []string{"eq", "ilike", "in"},
			"default_operator": "ilike",
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
			entry["type"] = "select"
			entry["operators"] = []string{"eq", "in"}
			entry["default_operator"] = "eq"
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryFilterOptions(options []admin.Option) []map[string]any {
	if len(options) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		label := strings.TrimSpace(option.Label)
		if label == "" {
			label = strings.TrimSpace(anyToString(option.Value))
		}
		out = append(out, map[string]any{
			"label": label,
			"value": option.Value,
		})
	}
	return out
}

func normalizeContentEntryFilterType(raw string) string {
	return admin.NormalizeFilterType(raw)
}

func detailFieldsForRecord(panel *admin.Panel, contentType *admin.CMSContentType, record map[string]any) []map[string]any {
	fields := []admin.Field{}
	if panel != nil {
		schema := panel.Schema()
		if len(schema.DetailFields) > 0 {
			fields = schema.DetailFields
		} else if len(schema.ListFields) > 0 {
			fields = schema.ListFields
		}
	}
	out := []map[string]any{}
	if len(fields) > 0 {
		for _, field := range fields {
			label := strings.TrimSpace(field.Label)
			if label == "" {
				label = titleCase(strings.TrimSpace(field.Name))
			}
			out = append(out, map[string]any{
				"label": label,
				"value": formatContentEntryDetailValue(record[field.Name], contentEntryDisplayKeys(field.Name, contentType)),
			})
		}
		return out
	}
	if record == nil {
		return out
	}
	keys := make([]string, 0, len(record))
	for key := range record {
		if key == "data" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		out = append(out, map[string]any{
			"label": titleCase(key),
			"value": formatContentEntryDetailValue(record[key], contentEntryDisplayKeys(key, contentType)),
		})
	}
	return out
}

func contentEntryDisplayKeys(fieldName string, contentType *admin.CMSContentType) []string {
	hints := contentEntryFieldUISchemaHints(contentType, fieldName)
	scopes := contentEntryHintScopes(hints)
	if len(scopes) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, scope := range scopes {
		if key := strings.TrimSpace(anyToString(scope["display_key"])); key != "" {
			if _, exists := seen[key]; !exists {
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
		if key := strings.TrimSpace(anyToString(scope["displayKey"])); key != "" {
			if _, exists := seen[key]; !exists {
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
		for _, raw := range []any{scope["display_keys"], scope["displayKeys"]} {
			for _, key := range contentEntryStringList(raw) {
				if _, exists := seen[key]; exists {
					continue
				}
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func formatContentEntryDetailValue(value any, displayKeys []string) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case []string:
		if len(typed) == 0 {
			return ""
		}
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return strings.Join(out, ", ")
	case []any:
		if len(typed) == 0 {
			return ""
		}
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := strings.TrimSpace(formatContentEntryDetailValue(item, displayKeys)); text != "" {
				out = append(out, text)
			}
		}
		return strings.Join(out, ", ")
	case map[string]any:
		return summarizeContentEntryObject(typed, displayKeys)
	case map[string]string:
		converted := make(map[string]any, len(typed))
		for key, item := range typed {
			converted[key] = item
		}
		return summarizeContentEntryObject(converted, displayKeys)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	default:
		if encoded, err := json.Marshal(typed); err == nil {
			return string(encoded)
		}
		return anyToString(typed)
	}
}

func summarizeContentEntryObject(value map[string]any, displayKeys []string) string {
	if len(value) == 0 {
		return ""
	}
	candidates := make([]string, 0, len(displayKeys)+11)
	candidates = append(candidates, displayKeys...)
	candidates = append(candidates, "name", "label", "title", "slug", "id", "code", "key", "value", "type", "blockType", "block_type")
	seen := map[string]struct{}{}
	for _, key := range candidates {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		candidate, ok := contentEntryObjectValueByPath(value, key)
		if !ok {
			continue
		}
		if text := strings.TrimSpace(formatContentEntryDetailValue(candidate, nil)); text != "" {
			return text
		}
	}
	if encoded, err := json.Marshal(value); err == nil {
		return string(encoded)
	}
	return anyToString(value)
}

func contentEntryObjectValueByPath(value map[string]any, key string) (any, bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, false
	}
	if candidate, ok := value[key]; ok {
		return candidate, true
	}
	segments := strings.Split(key, ".")
	if len(segments) == 1 {
		return nil, false
	}
	var current any = value
	for idx, segment := range segments {
		typed, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		candidate, ok := typed[segment]
		if !ok {
			return nil, false
		}
		if idx == len(segments)-1 {
			return candidate, true
		}
		current = candidate
	}
	return nil, false
}

func contentTypeSchema(contentType *admin.CMSContentType, panel *admin.Panel) map[string]any {
	if contentType != nil && len(contentType.Schema) > 0 {
		schema := ensureContentEntryJSONSchema(cloneAnyMap(contentType.Schema))
		if contentEntrySchemaHasRenderableFields(schema) {
			return schema
		}
	}
	if panel != nil {
		if schema := panel.Schema().FormSchema; len(schema) > 0 {
			normalized := ensureContentEntryJSONSchema(cloneAnyMap(schema))
			if contentEntrySchemaHasRenderableFields(normalized) {
				return normalized
			}
		}
		if schema := schemaFromPanelFields(panel.Schema().FormFields); len(schema) > 0 {
			normalized := ensureContentEntryJSONSchema(schema)
			if contentEntrySchemaHasRenderableFields(normalized) {
				return normalized
			}
		}
	}
	return nil
}

func contentEntrySchemaHasRenderableFields(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	properties, ok := schema["properties"].(map[string]any)
	if !ok || len(properties) == 0 {
		return false
	}
	for key := range properties {
		if strings.TrimSpace(key) != "" {
			return true
		}
	}
	return false
}

func ensureContentEntryJSONSchema(schema map[string]any) map[string]any {
	if len(schema) == 0 {
		return nil
	}
	stripUnsupportedContentEntrySchemaKeywords(schema)
	if raw, ok := schema["$schema"]; ok {
		if strings.TrimSpace(anyToString(raw)) != "" {
			return schema
		}
	}
	schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
	return schema
}

func stripUnsupportedContentEntrySchemaKeywords(node any) {
	switch typed := node.(type) {
	case map[string]any:
		delete(typed, "readOnly")
		delete(typed, "read_only")
		for _, value := range typed {
			stripUnsupportedContentEntrySchemaKeywords(value)
		}
	case []any:
		for _, value := range typed {
			stripUnsupportedContentEntrySchemaKeywords(value)
		}
	}
}

func contentTypeUISchema(contentType *admin.CMSContentType) map[string]any {
	if contentType == nil {
		return nil
	}
	return cloneAnyMap(contentType.UISchema)
}

func contentTypeLabel(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return titleCase(panelSlug)
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
	}
	return titleCase(strings.TrimSpace(fallback))
}

func contentTypeSlug(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return panelSlug
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
	}
	return strings.TrimSpace(fallback)
}

func contentTypePanelSlug(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return panelSlugFromCapabilities(contentType.Capabilities)
}

func contentTypeID(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.ID)
}

func contentTypeIcon(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Icon)
}

func contentTypeStatus(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Status)
}

func schemaFromPanelFields(fields []admin.Field) map[string]any {
	if len(fields) == 0 {
		return nil
	}
	properties := map[string]any{}
	required := []string{}
	for _, field := range fields {
		name := strings.TrimSpace(field.Name)
		if name == "" {
			continue
		}
		fieldSchema := map[string]any{
			"type": schemaTypeForField(field),
		}
		if label := strings.TrimSpace(field.Label); label != "" {
			fieldSchema["title"] = label
		}
		if enumValues := enumValuesFromField(field); len(enumValues) > 0 {
			fieldSchema["enum"] = enumValues
		}
		if fieldSchema["type"] == "array" {
			fieldSchema["items"] = map[string]any{"type": "string"}
		}
		properties[name] = fieldSchema
		if field.Required {
			required = append(required, name)
		}
	}
	if len(properties) == 0 {
		return nil
	}
	schema := map[string]any{
		"$schema":    "https://json-schema.org/draft/2020-12/schema",
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func schemaTypeForField(field admin.Field) string {
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "checkbox", "toggle", "switch", "boolean", "bool":
		return "boolean"
	case "integer", "int":
		return "integer"
	case "number", "float", "decimal", "currency":
		return "number"
	case "json", "jsonschema", "object":
		return "object"
	case "multiselect", "array", "list", "tags":
		return "array"
	default:
		return "string"
	}
}

func enumValuesFromField(field admin.Field) []any {
	if len(field.Options) == 0 {
		return nil
	}
	values := make([]any, 0, len(field.Options))
	for _, option := range field.Options {
		switch v := option.Value.(type) {
		case nil:
			continue
		case string:
			if strings.TrimSpace(v) == "" {
				continue
			}
			values = append(values, strings.TrimSpace(v))
		default:
			values = append(values, v)
		}
	}
	if len(values) == 0 {
		return nil
	}
	return values
}

func (h *contentEntryHandlers) renderTemplate(c router.Context, panelSlug string, fallbackTemplate string, viewCtx router.ViewContext) error {
	if c == nil {
		return admin.ErrNotFound
	}
	fallbackTemplate = strings.TrimSpace(fallbackTemplate)
	if fallbackTemplate == "" {
		return admin.ErrNotFound
	}
	customTemplate := contentEntryPanelTemplate(panelSlug, fallbackTemplate)
	if customTemplate == "" || customTemplate == fallbackTemplate {
		return c.Render(fallbackTemplate, viewCtx)
	}
	if h.templateExists != nil {
		if h.templateExists(customTemplate) {
			return c.Render(customTemplate, viewCtx)
		}
		return c.Render(fallbackTemplate, viewCtx)
	}
	if err := c.Render(customTemplate, viewCtx); err != nil {
		if !isTemplateResolutionError(err) {
			return err
		}
		return c.Render(fallbackTemplate, viewCtx)
	}
	return nil
}

func templateExistsFromFS(fsys ...fs.FS) templateExistsFunc {
	stack := make([]fs.FS, 0, len(fsys))
	for _, current := range fsys {
		if current == nil {
			continue
		}
		stack = append(stack, normalizeTemplatesFS(current))
	}
	merged := fallbackFSList(stack)
	if merged == nil {
		return nil
	}
	return func(name string) bool {
		candidates := templateLookupCandidates(name)
		for _, candidate := range candidates {
			info, err := fs.Stat(merged, candidate)
			if err != nil {
				continue
			}
			if !info.IsDir() {
				return true
			}
		}
		return false
	}
}

func templateLookupCandidates(name string) []string {
	normalized := normalizeTemplateLookupName(name)
	if normalized == "" {
		return nil
	}
	if path.Ext(normalized) != "" {
		return []string{normalized}
	}
	return []string{
		normalized,
		normalized + ".html",
	}
}

func normalizeTemplateLookupName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	name = strings.TrimPrefix(name, "/")
	name = path.Clean(name)
	if name == "." {
		return ""
	}
	return name
}

func contentEntryPanelTemplate(panelSlug, fallbackTemplate string) string {
	fallbackTemplate = strings.TrimSpace(fallbackTemplate)
	panelSlug = normalizeContentEntryTemplateSlug(panelSlug)
	if fallbackTemplate == "" || panelSlug == "" {
		return fallbackTemplate
	}
	return path.Join("resources", panelSlug, path.Base(fallbackTemplate))
}

func normalizeContentEntryTemplateSlug(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if idx := strings.Index(raw, "@"); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.ReplaceAll(raw, "_", "-")
	raw = strings.ReplaceAll(raw, ".", "-")
	return strings.Trim(raw, "- ")
}

func isTemplateResolutionError(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(strings.TrimSpace(err.Error()))
	if !strings.Contains(lower, "does not exist") {
		return false
	}
	return strings.Contains(lower, "template") ||
		strings.Contains(lower, "view") ||
		strings.Contains(lower, "layout")
}

func defaultLocaleValue(value string, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	if strings.TrimSpace(fallback) != "" {
		return strings.TrimSpace(fallback)
	}
	return "en"
}

// contentEntryRoutes builds UI routes for content entries.
type contentEntryRoutes struct {
	basePath string
	slug     string
	env      string
}

func newContentEntryRoutes(basePath, slug, env string) contentEntryRoutes {
	return contentEntryRoutes{basePath: strings.TrimSpace(basePath), slug: strings.TrimSpace(slug), env: strings.TrimSpace(env)}
}

func (r contentEntryRoutes) withEnv(raw string) string {
	if r.env == "" {
		return raw
	}
	separator := "?"
	if strings.Contains(raw, "?") {
		separator = "&"
	}
	return raw + separator + "env=" + url.QueryEscape(r.env)
}

func (r contentEntryRoutes) index() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) new() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, "new"))
}

func (r contentEntryRoutes) show(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) edit(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "edit"))
}

func (r contentEntryRoutes) update(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id))
}

func (r contentEntryRoutes) create() string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug))
}

func (r contentEntryRoutes) delete(id string) string {
	return r.withEnv(path.Join(r.basePath, "content", r.slug, id, "delete"))
}

func (r contentEntryRoutes) routesMap() map[string]string {
	return map[string]string{
		"index":  r.index(),
		"new":    r.new(),
		"create": r.create(),
	}
}

func contentEntryCreateRedirectTarget(slug, createdID string, routes contentEntryRoutes) string {
	id := strings.TrimSpace(createdID)
	if id == "" {
		return routes.index()
	}
	if shouldRedirectToDetailAfterCreate(slug) {
		return appendQueryParam(routes.show(id), "created", "1")
	}
	target := routes.edit(id)
	if shouldAppendCreateMarkerAfterCreate(slug) {
		target = appendQueryParam(target, "created", "1")
	}
	return target
}

func shouldRedirectToDetailAfterCreate(slug string) bool {
	normalized := strings.ToLower(strings.TrimSpace(slug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	switch normalized {
	case "esign_documents":
		return true
	default:
		return false
	}
}

func shouldAppendCreateMarkerAfterCreate(slug string) bool {
	normalized := strings.ToLower(strings.TrimSpace(slug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	switch normalized {
	case "esign_agreements":
		return true
	default:
		return false
	}
}

func appendQueryParam(rawPath, key, value string) string {
	pathValue := strings.TrimSpace(rawPath)
	if pathValue == "" {
		return ""
	}
	parsed, err := url.Parse(pathValue)
	if err != nil {
		separator := "?"
		if strings.Contains(pathValue, "?") {
			separator = "&"
		}
		return pathValue + separator + url.QueryEscape(strings.TrimSpace(key)) + "=" + url.QueryEscape(strings.TrimSpace(value))
	}
	query := parsed.Query()
	query.Set(strings.TrimSpace(key), strings.TrimSpace(value))
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func queryParamEnabled(c router.Context, key string) bool {
	if c == nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(c.Query(key))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func isJSONRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	contentType := strings.ToLower(requestContentType(c))
	return strings.Contains(contentType, "application/json")
}

type schemaPathInfo struct {
	Schema map[string]any
	Type   string
}

func flattenSchema(schema map[string]any) (map[string]schemaPathInfo, []string) {
	out := map[string]schemaPathInfo{}
	boolPaths := []string{}
	walkSchemaProperties(schema, "", out, &boolPaths)
	return out, boolPaths
}

func walkSchemaProperties(schema map[string]any, prefix string, out map[string]schemaPathInfo, boolPaths *[]string) {
	if schema == nil {
		return
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || len(props) == 0 {
		return
	}
	for key, raw := range props {
		prop, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		pathKey := key
		if prefix != "" {
			pathKey = prefix + "." + key
		}
		stype := schemaType(prop)
		out[pathKey] = schemaPathInfo{Schema: prop, Type: stype}
		if stype == "boolean" {
			*boolPaths = append(*boolPaths, pathKey)
		}
		if stype == "object" {
			walkSchemaProperties(prop, pathKey, out, boolPaths)
		}
	}
}

func schemaType(schema map[string]any) string {
	if schema == nil {
		return ""
	}
	switch v := schema["type"].(type) {
	case string:
		return strings.TrimSpace(v)
	case []any:
		for _, item := range v {
			if s, ok := item.(string); ok {
				return strings.TrimSpace(s)
			}
		}
	}
	return ""
}

func parseMultiValue(values []string, info schemaPathInfo) (any, error) {
	stype := strings.TrimSpace(info.Type)
	if stype != "array" {
		return parseScalarMultiValue(values, info)
	}
	itemsSchema, _ := info.Schema["items"].(map[string]any)
	parsed := make([]any, 0, len(values))
	for _, raw := range values {
		parsed = append(parsed, parseValue(raw, schemaPathInfo{Schema: itemsSchema, Type: schemaType(itemsSchema)}))
	}
	return parsed, nil
}

func parseScalarMultiValue(values []string, info schemaPathInfo) (any, error) {
	unique := []string{}
	seen := map[string]struct{}{}
	var candidate any
	for _, raw := range values {
		parsed := parseValue(raw, info)
		candidate = parsed
		normalized := strings.TrimSpace(anyToString(parsed))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		unique = append(unique, normalized)
	}
	switch len(unique) {
	case 0:
		if candidate == nil {
			return "", nil
		}
		return candidate, nil
	case 1:
		return parseValue(unique[0], info), nil
	default:
		return nil, fmt.Errorf("conflicting duplicate scalar values %v", unique)
	}
}

func parseValue(raw string, info schemaPathInfo) any {
	trimmed := strings.TrimSpace(raw)
	stype := strings.TrimSpace(info.Type)
	switch stype {
	case "boolean":
		return parseBoolValue(trimmed)
	case "integer":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.Atoi(trimmed); err == nil {
			return n
		}
	case "number":
		if trimmed == "" {
			return ""
		}
		if n, err := strconv.ParseFloat(trimmed, 64); err == nil {
			return n
		}
	case "array", "object":
		if parsed, ok := parseJSONValue(trimmed); ok {
			return parsed
		}
	}
	if parsed, ok := parseJSONValue(trimmed); ok {
		if strings.HasPrefix(trimmed, "{") || strings.HasPrefix(trimmed, "[") {
			return parsed
		}
	}
	return raw
}

func parseJSONValue(raw string) (any, bool) {
	if raw == "" {
		return nil, false
	}
	var decoded any
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return nil, false
	}
	return decoded, true
}

func parseBoolValue(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "0", "false", "off", "no":
		return false
	default:
		return true
	}
}

func setNestedValue(record map[string]any, path string, value any) {
	if record == nil {
		return
	}
	segments := strings.Split(path, ".")
	current := record
	for i, segment := range segments {
		if i == len(segments)-1 {
			current[segment] = value
			return
		}
		next, ok := current[segment].(map[string]any)
		if !ok || next == nil {
			next = map[string]any{}
			current[segment] = next
		}
		current = next
	}
}

func hasNestedValue(record map[string]any, path string) bool {
	if record == nil {
		return false
	}
	segments := strings.Split(path, ".")
	var current any = record
	for i, segment := range segments {
		currentMap, ok := current.(map[string]any)
		if !ok {
			return false
		}
		val, ok := currentMap[segment]
		if !ok {
			return false
		}
		if i == len(segments)-1 {
			return val != nil || ok
		}
		current = val
	}
	return false
}

func titleCase(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return value
	}
	value = strings.ReplaceAll(value, "_", " ")
	value = strings.ReplaceAll(value, "-", " ")
	parts := strings.Fields(value)
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}

// contentEntryNeedsBlocksChips returns true if any column uses the blocks_chips renderer.
func contentEntryNeedsBlocksChips(columns []map[string]any) bool {
	for _, col := range columns {
		renderer := strings.TrimSpace(anyToString(col["renderer"]))
		if renderer == "blocks_chips" {
			return true
		}
	}
	return false
}

// contentEntryBlockIconsMap builds a map of block type slugs to icon references
// by querying the block_definitions panel for the current environment.
// Returns nil on error (logged once) so list rendering continues without icons.
func contentEntryBlockIconsMap(ctx admin.AdminContext, adm *admin.Admin) map[string]string {
	if adm == nil || adm.Registry() == nil {
		return nil
	}
	panel, ok := adm.Registry().Panel("block_definitions")
	if !ok || panel == nil {
		return nil
	}
	filters := map[string]any{
		"status": "active",
	}
	if env := strings.TrimSpace(ctx.Environment); env != "" {
		filters["environment"] = env
	}
	items, _, err := panel.List(ctx, admin.ListOptions{
		PerPage: 10000,
		Filters: filters,
	})
	if err != nil {
		// Log once per request path, but don't fail the page.
		return nil
	}
	if len(items) == 0 {
		return nil
	}
	iconMap := make(map[string]string, len(items))
	for _, item := range items {
		slug := strings.TrimSpace(anyToString(item["slug"]))
		if slug == "" {
			continue
		}
		icon := strings.TrimSpace(anyToString(item["icon"]))
		if icon == "" {
			icon = "view-grid" // default fallback
		}
		iconMap[slug] = icon
	}
	if len(iconMap) == 0 {
		return nil
	}
	return iconMap
}

// contentEntryAttachBlocksIconMap attaches the block_icons_map to renderer_options
// for columns using blocks_chips renderer, if not already provided by ui_schema.
func contentEntryAttachBlocksIconMap(columns []map[string]any, iconMap map[string]string) []map[string]any {
	if len(iconMap) == 0 {
		return columns
	}
	for i, col := range columns {
		renderer := strings.TrimSpace(anyToString(col["renderer"]))
		if renderer != "blocks_chips" {
			continue
		}
		opts, _ := col["renderer_options"].(map[string]any)
		if opts == nil {
			opts = map[string]any{}
		}
		// Only set if not already provided (user override wins).
		if _, exists := opts["block_icons_map"]; !exists {
			if _, exists := opts["blockIconsMap"]; !exists {
				opts["block_icons_map"] = iconMap
			}
		}
		columns[i]["renderer_options"] = opts
	}
	return columns
}
