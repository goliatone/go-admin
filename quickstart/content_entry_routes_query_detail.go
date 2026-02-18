package quickstart

import (
	"context"
	"errors"
	"net/url"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	authlib "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

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
	preferencesAPI := resolveAdminPreferencesAPICollectionPath(urls, h.cfg, basePath)
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
		"title":                h.cfg.Title,
		"base_path":            basePath,
		"resource":             "content",
		"resource_label":       contentTypeLabel(contentType, panelName),
		"routes":               routesMap,
		"action_base":          actionBase,
		"items":                items,
		"columns":              columns,
		"filters":              filters,
		"total":                total,
		"datatable_id":         dataTableID,
		"list_api":             listAPI,
		"env":                  adminCtx.Environment,
		"panel_name":           panelName,
		"preferences_api_path": preferencesAPI,
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
			TableID:             dataTableID,
			APIEndpoint:         listAPI,
			ActionBase:          actionBase,
			PreferencesEndpoint: preferencesAPI,
			TranslationUX:       translationUXEnabled,
			EnableGroupedMode:   translationUXEnabled,
			DefaultViewMode:     contentEntryTranslationDefaultViewMode(translationUXEnabled),
			GroupByField:        contentEntryTranslationGroupByField(translationUXEnabled),
			StateStore:          stateStoreCfg,
			URLState:            h.dataGridURLState,
		},
	}))
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return h.renderTemplate(c, contentTypeSlug(contentType, panelName), h.listTemplate, viewCtx)
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
