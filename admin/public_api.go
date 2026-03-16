package admin

import (
	"context"
	"errors"
	"net"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/listquery"
	"github.com/goliatone/go-admin/internal/primitives"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type menuByLocationWithOptions interface {
	MenuByLocationWithOptions(ctx context.Context, location, locale string, opts SiteMenuReadOptions) (*Menu, error)
}

type menuByCodeWithOptions interface {
	MenuByCodeWithOptions(ctx context.Context, code, locale string, opts SiteMenuReadOptions) (*Menu, error)
}

type siteRequestOptions struct {
	Query SiteQuery
	List  ListOptions
}

// RegisterPublicAPI registers read-only endpoints for content delivery.
func (a *Admin) RegisterPublicAPI(r AdminRouter) {
	if r == nil {
		return
	}
	target := r
	if a != nil && a.config.Site.Protected && a.authenticator != nil {
		target = wrapAdminRouter(r, a.authWrapper())
	}
	register := func(route string, handler router.HandlerFunc) {
		path := publicAPIRoutePath(a, route)
		if path == "" {
			return
		}
		target.Get(path, handler)
	}

	// Legacy read routes.
	register("content", a.handlePublicContentList)
	register("content.type", a.handlePublicContentList)
	register("content.item", a.handlePublicContent)
	register("menu", a.handlePublicMenu)
	register("preview", a.handlePublicPreview)

	// Normalized site routes.
	register(SiteRouteContentList, a.handleSiteContentList)
	register(SiteRouteContentDetail, a.handleSiteContentDetail)
	register(SiteRouteNavigationLegacy, a.handleSiteMenuByLocation)
	a.registerSiteMenuRoutes(target)
}

func (a *Admin) registerPreviewRoutes() {
	if a == nil || a.preview == nil || a.router == nil {
		return
	}
	path := adminAPIRoutePath(a, "preview")
	if path == "" {
		return
	}
	a.router.Get(path, a.handlePublicPreview)
}

func (a *Admin) registerSiteMenuRoutes(r AdminRouter) {
	if a == nil || r == nil {
		return
	}
	locationPath := strings.TrimSpace(publicAPIRoutePath(a, SiteRouteMenuByLocation))
	if locationPath == "" {
		return
	}
	base := strings.TrimSuffix(locationPath, "/:location")
	if base == locationPath {
		base = strings.TrimRight(locationPath, "/")
	}
	if base == "" {
		return
	}
	r.Get(base+"/*menu_ref", a.handleSiteMenuDispatch)
}

func (a *Admin) handlePublicContent(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}
	options := a.parseSiteRequestOptions(c, false)
	if err := a.authorizeSiteDraftRead(c, options.Query, false); err != nil {
		return writeError(c, err)
	}
	contentType := publicContentType(c)
	slug := c.Param("slug", "")
	if slug == "" {
		slug = c.Query("slug")
	}
	if slug == "" {
		return writeError(c, validationDomainError("content slug required", map[string]any{
			"field": "slug",
		}))
	}
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	content, err := a.findPublicContent(ctx, options.Query.Locale, contentType, slug, c.Query("category"), options.Query.IncludeDrafts)
	if err != nil {
		return writeError(c, err)
	}
	if content != nil {
		return writeJSON(c, content)
	}
	return writeError(c, ErrNotFound)
}

func (a *Admin) handlePublicContentList(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}

	options := a.parseSiteRequestOptions(c, false)
	if err := a.authorizeSiteDraftRead(c, options.Query, false); err != nil {
		return writeError(c, err)
	}
	contentType := publicContentType(c)
	category := c.Query("category")
	slug := c.Query("slug")
	ctx := a.siteContextFromRequest(c, options.Query.Locale)

	contents, err := a.listPublicContentsRaw(ctx, options.Query.Locale, contentType, category, options.Query.IncludeDrafts)
	if err != nil {
		return writeError(c, err)
	}

	if slug != "" {
		for i := range contents {
			if contentMatchesSlug(contents[i], slug) {
				return writeJSON(c, contents[i])
			}
		}
		return writeError(c, ErrNotFound)
	}
	return writeJSON(c, contents)
}

func (a *Admin) handleSiteContentList(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}
	options := a.parseSiteRequestOptions(c, true)
	if err := a.authorizeSiteDraftRead(c, options.Query, false); err != nil {
		return writeError(c, err)
	}

	contentType := publicContentType(c)
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	contents, err := a.listPublicContentsRaw(ctx, options.Query.Locale, contentType, c.Query("category"), options.Query.IncludeDrafts)
	if err != nil {
		return writeError(c, err)
	}
	if !siteLocaleFallbackAllowed(a) {
		contents = filterMissingRequestedLocale(contents)
	}

	records := a.contentRecordsForSite(contents, options.Query.Locale)
	paged, total := applyListOptionsToRecordMaps(records, options.List, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsContentRecordSearchMatcher,
	})
	meta := siteMetaForList(options.Query, total, paged)
	return writeJSON(c, SiteContentListResponse{Data: paged, Meta: meta})
}

func (a *Admin) handleSiteContentDetail(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}
	options := a.parseSiteRequestOptions(c, true)
	if err := a.authorizeSiteDraftRead(c, options.Query, false); err != nil {
		return writeError(c, err)
	}

	contentType := publicContentType(c)
	slug := strings.TrimSpace(c.Param("slug", ""))
	if slug == "" {
		slug = strings.TrimSpace(c.Query("slug"))
	}
	if slug == "" {
		return writeError(c, validationDomainError("content slug required", map[string]any{
			"field": "slug",
		}))
	}
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	content, err := a.findPublicContent(ctx, options.Query.Locale, contentType, slug, c.Query("category"), options.Query.IncludeDrafts)
	if err != nil {
		return writeError(c, err)
	}
	if content == nil {
		return writeError(c, ErrNotFound)
	}
	record := a.contentRecordForSite(*content, options.Query.Locale)
	meta := siteMetaForRecord(options.Query, record)
	return writeJSON(c, SiteContentDetailResponse{Data: record, Meta: meta})
}

func (a *Admin) handlePublicMenu(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.menuSvc == nil {
		return writeError(c, serviceUnavailableDomainError("menu service not available", map[string]any{
			"service": "menu",
		}))
	}
	location := c.Param("location", "")
	options := a.parseSiteRequestOptions(c, true)
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	previewValidated := false
	if token := strings.TrimSpace(options.Query.PreviewToken); token != "" {
		validated, err := a.previewTokenFromQuery(token)
		if err != nil {
			return writeError(c, err)
		}
		previewValidated = previewTokenAllowsMenuDrafts(validated)
		_, env := splitPreviewEntityType(validated.EntityType)
		if env != "" {
			ctx = WithEnvironment(ctx, env)
		}
		if previewValidated {
			options.Query.IncludeDrafts = true
		}
	}
	if err := a.authorizeSiteDraftRead(c, options.Query, previewValidated); err != nil {
		return writeError(c, err)
	}
	menu, err := a.menuByLocation(ctx, location, options.menuReadOptions(c, a))
	if err != nil {
		return writeError(c, err)
	}
	if menu != nil && a.contentSvc != nil {
		a.resolveMenuTargets(ctx, menu.Items, options.Query.Locale)
	}
	return writeJSON(c, menu)
}

func (a *Admin) handleSiteMenuByLocation(c router.Context) error {
	return a.handleSiteMenuByLocationPath(c, c.Param("location", ""))
}

func (a *Admin) handleSiteMenuByCode(c router.Context) error {
	return a.handleSiteMenuByCodePath(c, c.Param("code", ""))
}

func (a *Admin) handleSiteMenuDispatch(c router.Context) error {
	raw := strings.Trim(strings.TrimSpace(c.Param("menu_ref", "")), "/")
	if raw == "" {
		return writeError(c, validationDomainError("menu location required", map[string]any{
			"field": "location",
		}))
	}
	if after, ok := strings.CutPrefix(raw, "code/"); ok {
		code := strings.Trim(after, "/")
		return a.handleSiteMenuByCodePath(c, code)
	}
	return a.handleSiteMenuByLocationPath(c, raw)
}

func (a *Admin) handleSiteMenuByLocationPath(c router.Context, location string) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.menuSvc == nil {
		return writeError(c, serviceUnavailableDomainError("menu service not available", map[string]any{
			"service": "menu",
		}))
	}
	location = strings.TrimSpace(location)
	if location == "" {
		return writeError(c, validationDomainError("menu location required", map[string]any{
			"field": "location",
		}))
	}
	options := a.parseSiteRequestOptions(c, true)
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	previewValidated := false
	if token := strings.TrimSpace(options.Query.PreviewToken); token != "" {
		validated, err := a.previewTokenFromQuery(token)
		if err != nil {
			return writeError(c, err)
		}
		previewValidated = previewTokenAllowsMenuDrafts(validated)
		_, env := splitPreviewEntityType(validated.EntityType)
		if env != "" {
			ctx = WithEnvironment(ctx, env)
		}
		if previewValidated {
			options.Query.IncludeDrafts = true
		}
	}
	if err := a.authorizeSiteDraftRead(c, options.Query, previewValidated); err != nil {
		return writeError(c, err)
	}
	menuReadOpts := options.menuReadOptions(c, a)
	if menuReadOpts.ViewProfile == "" && previewValidated {
		menuReadOpts.ViewProfile = strings.TrimSpace(options.Query.ViewProfile)
	}
	menu, err := a.menuByLocation(ctx, location, menuReadOpts)
	if err != nil {
		return writeError(c, err)
	}
	if menu != nil && a.contentSvc != nil {
		a.resolveMenuTargets(ctx, menu.Items, options.Query.Locale)
	}
	query := options.Query
	query.ViewProfile = menuReadOpts.ViewProfile
	return writeJSON(c, SiteMenuResponse{Data: menu, Meta: siteMetaForMenu(query)})
}

func (a *Admin) handleSiteMenuByCodePath(c router.Context, code string) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	if a.menuSvc == nil {
		return writeError(c, serviceUnavailableDomainError("menu service not available", map[string]any{
			"service": "menu",
		}))
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return writeError(c, validationDomainError("menu code required", map[string]any{"field": "code"}))
	}
	options := a.parseSiteRequestOptions(c, true)
	ctx := a.siteContextFromRequest(c, options.Query.Locale)
	previewValidated := false
	if token := strings.TrimSpace(options.Query.PreviewToken); token != "" {
		validated, err := a.previewTokenFromQuery(token)
		if err != nil {
			return writeError(c, err)
		}
		previewValidated = previewTokenAllowsMenuDrafts(validated)
		_, env := splitPreviewEntityType(validated.EntityType)
		if env != "" {
			ctx = WithEnvironment(ctx, env)
		}
		if previewValidated {
			options.Query.IncludeDrafts = true
		}
	}
	if err := a.authorizeSiteDraftRead(c, options.Query, previewValidated); err != nil {
		return writeError(c, err)
	}
	menuReadOpts := options.menuReadOptions(c, a)
	if menuReadOpts.ViewProfile == "" && previewValidated {
		menuReadOpts.ViewProfile = strings.TrimSpace(options.Query.ViewProfile)
	}
	menu, err := a.menuByCode(ctx, code, menuReadOpts)
	if err != nil {
		return writeError(c, err)
	}
	if menu != nil && a.contentSvc != nil {
		a.resolveMenuTargets(ctx, menu.Items, options.Query.Locale)
	}
	query := options.Query
	query.ViewProfile = menuReadOpts.ViewProfile
	return writeJSON(c, SiteMenuResponse{Data: menu, Meta: siteMetaForMenu(query)})
}

func (a *Admin) handlePublicPreview(c router.Context) error {
	if err := a.authorizeSiteRead(c); err != nil {
		return writeError(c, err)
	}
	tokenString := c.Param("token", "")
	if a.preview == nil {
		return writeError(c, serviceUnavailableDomainError("preview service not available", map[string]any{
			"service": "preview",
		}))
	}

	token, err := a.preview.Validate(tokenString)
	if err != nil {
		return writeError(c, err)
	}

	if a.contentSvc == nil {
		return writeError(c, serviceUnavailableDomainError("content service not available", map[string]any{
			"service": "content",
		}))
	}

	locale := publicLocale(a, c)
	_, env := splitPreviewEntityType(token.EntityType)
	ctx := a.siteContextFromRequest(c, locale)
	if env != "" {
		ctx = WithEnvironment(ctx, env)
	}

	content, err := a.contentSvc.Content(ctx, token.ContentID, locale)
	if err == nil && content != nil {
		applyEmbeddedBlocksToContent(content)
		return writeJSON(c, content)
	}
	if err != nil && !errors.Is(err, ErrNotFound) {
		return writeError(c, err)
	}
	page, err := a.contentSvc.Page(ctx, token.ContentID, locale)
	if err != nil {
		return writeError(c, err)
	}
	if page != nil {
		applyEmbeddedBlocksToPage(page)
		return writeJSON(c, page)
	}
	return writeError(c, ErrNotFound)
}

func (a *Admin) parseSiteRequestOptions(c router.Context, includeContributionsDefault bool) siteRequestOptions {
	listOpts := parseListOptions(c)
	query := SiteQuery{
		Locale:               publicLocale(a, c),
		Page:                 listOpts.Page,
		PerPage:              listOpts.PerPage,
		Sort:                 strings.TrimSpace(listOpts.SortBy),
		SortDesc:             listOpts.SortDesc,
		Fields:               append([]string{}, listOpts.Fields...),
		Filters:              siteFilterValues(listOpts.Filters),
		Q:                    strings.TrimSpace(listOpts.Search),
		IncludeDrafts:        queryBool(c, "include_drafts", false),
		IncludeContributions: queryBool(c, "include_contributions", includeContributionsDefault),
		PreviewToken:         strings.TrimSpace(c.Query("preview_token")),
		ViewProfile:          strings.TrimSpace(c.Query("view_profile")),
	}
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PerPage <= 0 {
		query.PerPage = 10
	}
	return siteRequestOptions{Query: query, List: listOpts}
}

func (o siteRequestOptions) menuReadOptions(c router.Context, admin *Admin) SiteMenuReadOptions {
	viewProfile := o.Query.ViewProfile
	if strings.TrimSpace(viewProfile) != "" && !siteViewProfileOverrideAllowed(c, admin) {
		viewProfile = ""
	}
	return SiteMenuReadOptions{
		Locale:               o.Query.Locale,
		IncludeDrafts:        o.Query.IncludeDrafts,
		IncludeContributions: o.Query.IncludeContributions,
		PreviewToken:         o.Query.PreviewToken,
		ViewProfile:          strings.TrimSpace(viewProfile),
	}
}

func (a *Admin) siteContextFromRequest(c router.Context, locale string) context.Context {
	ctx := c.Context()
	if strings.TrimSpace(locale) != "" {
		ctx = WithLocale(ctx, locale)
	}
	ctx = WithLocaleFallback(ctx, siteLocaleFallbackAllowed(a))
	if channel := strings.TrimSpace(resolveContentChannelFromRouter(c)); channel != "" {
		ctx = WithContentChannel(ctx, channel)
	}
	return ctx
}

func siteLocaleFallbackAllowed(a *Admin) bool {
	if a == nil || a.config.Site.AllowLocaleFallback == nil {
		return true
	}
	return *a.config.Site.AllowLocaleFallback
}

func (a *Admin) authorizeSiteRead(c router.Context) error {
	if a == nil || !a.config.Site.Protected {
		return nil
	}
	permission := strings.TrimSpace(a.config.Site.ReadPermission)
	if permission == "" {
		return nil
	}
	if a.authorizer == nil || !a.authorizer.Can(c.Context(), permission, "site") {
		return permissionDenied(permission, "site")
	}
	return nil
}

func (a *Admin) authorizeSiteDraftRead(c router.Context, query SiteQuery, previewValidated bool) error {
	if !query.IncludeDrafts {
		return nil
	}
	if previewValidated || hasAuthActor(c.Context()) {
		return nil
	}
	if a != nil && a.config.Site.TrustPrivateNetworkDraftReads && isInternalSiteRequest(c) {
		return nil
	}
	permission := strings.TrimSpace(a.config.Site.DraftReadPermission)
	if permission == "" {
		permission = "admin.site.read_drafts"
	}
	if a.authorizer != nil && a.authorizer.Can(c.Context(), permission, "site") {
		return nil
	}
	return permissionDenied(permission, "site")
}

func isInternalSiteRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	host := net.ParseIP(strings.TrimSpace(c.IP()))
	if host == nil {
		return false
	}
	return host.IsLoopback() || host.IsPrivate()
}

func hasAuthActor(ctx context.Context) bool {
	actor, ok := auth.ActorFromContext(ctx)
	return ok && actor != nil
}

func siteViewProfileOverrideAllowed(c router.Context, admin *Admin) bool {
	if c == nil {
		return false
	}
	env := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(c.Query("runtime_env"), c.Query("site_runtime_env"))))
	if env != "" && env != "prod" && env != "production" {
		return true
	}
	if admin == nil {
		return hasAuthActor(c.Context())
	}
	if hasAuthActor(c.Context()) {
		permission := strings.TrimSpace(admin.config.Site.ViewProfileOverridePermission)
		if permission == "" {
			return true
		}
		if admin.authorizer == nil {
			return true
		}
		return admin.authorizer.Can(c.Context(), permission, "site")
	}
	return false
}

func (a *Admin) previewTokenFromQuery(token string) (*PreviewToken, error) {
	if strings.TrimSpace(token) == "" {
		return nil, nil
	}
	if a == nil || a.preview == nil {
		return nil, serviceUnavailableDomainError("preview service not available", map[string]any{"service": "preview"})
	}
	return a.preview.Validate(token)
}

func (a *Admin) menuByLocation(ctx context.Context, location string, opts SiteMenuReadOptions) (*Menu, error) {
	if a == nil || a.menuSvc == nil {
		return nil, ErrNotFound
	}
	if svc, ok := a.menuSvc.(menuByLocationWithOptions); ok && svc != nil {
		return svc.MenuByLocationWithOptions(ctx, location, opts.Locale, opts)
	}
	return a.menuSvc.MenuByLocation(ctx, location, opts.Locale)
}

func (a *Admin) menuByCode(ctx context.Context, code string, opts SiteMenuReadOptions) (*Menu, error) {
	if a == nil || a.menuSvc == nil {
		return nil, ErrNotFound
	}
	if svc, ok := a.menuSvc.(menuByCodeWithOptions); ok && svc != nil {
		return svc.MenuByCodeWithOptions(ctx, code, opts.Locale, opts)
	}
	return a.menuSvc.Menu(ctx, code, opts.Locale)
}

func (a *Admin) resolveMenuTargets(ctx context.Context, items []MenuItem, locale string) {
	for i := range items {
		item := &items[i]
		if item.Target != nil {
			if rawURL, ok := item.Target["url"].(string); !ok || strings.TrimSpace(rawURL) == "" {
				if pageID, ok := item.Target["page_id"].(string); ok && pageID != "" {
					if page, err := a.contentSvc.Page(ctx, pageID, locale); err == nil && page != nil {
						path := extractPathFromData(page.Data, page.Slug)
						if path != "" {
							item.Target["url"] = CanonicalPath(strings.TrimSpace(path), "")
						}
					}
				}
				if contentID, ok := item.Target["content_id"].(string); ok && contentID != "" {
					if content, err := a.contentSvc.Content(ctx, contentID, locale); err == nil && content != nil {
						if url := buildContentURL(content); url != "" {
							item.Target["url"] = url
						}
					}
				}
			}
		}
		if len(item.Children) > 0 {
			a.resolveMenuTargets(ctx, item.Children, locale)
		}
	}
}

func extractPathFromData(data map[string]any, fallback string) string {
	return ExtractContentPath(data, nil, fallback)
}

func buildContentURL(content *CMSContent) string {
	if content == nil {
		return ""
	}
	segment := strings.Trim(primitives.FirstNonEmptyRaw(content.ContentTypeSlug, content.ContentType), "/")
	return CanonicalContentPath(segment, content.Slug)
}

func publicLocale(a *Admin, c router.Context) string {
	if a == nil {
		return ""
	}
	locale := strings.TrimSpace(c.Query("locale"))
	if locale == "" {
		locale = a.config.DefaultLocale
	}
	return locale
}

func publicContentType(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(
		c.Param("type", ""),
		c.Query("type"),
		c.Query("content_type"),
	))
}

func splitPreviewEntityType(raw string) (string, string) {
	entityType := strings.ToLower(strings.TrimSpace(raw))
	if entityType == "" {
		return "", ""
	}
	if idx := strings.LastIndex(entityType, "@"); idx > 0 && idx+1 < len(entityType) {
		env := strings.TrimSpace(entityType[idx+1:])
		entityType = strings.TrimSpace(entityType[:idx])
		return entityType, env
	}
	return entityType, ""
}

func previewTokenAllowsMenuDrafts(token *PreviewToken) bool {
	if token == nil {
		return false
	}
	entityType, _ := splitPreviewEntityType(token.EntityType)
	return previewEntityAllowsMenuDrafts(entityType)
}

func previewEntityAllowsMenuDrafts(raw string) bool {
	entityType := strings.ToLower(strings.TrimSpace(raw))
	if entityType == "" {
		return false
	}
	switch entityType {
	case "menu", "menus", "navigation", "menu_binding", "menu_bindings", "menu_view_profile", "menu_view_profiles":
		return true
	default:
		return false
	}
}

func (a *Admin) listPublicContentsRaw(ctx context.Context, locale, contentType, category string, includeDrafts bool) ([]CMSContent, error) {
	contents, err := a.contentSvc.Contents(ctx, locale)
	if err != nil {
		return nil, err
	}
	out := make([]CMSContent, 0, len(contents))
	for _, cnt := range contents {
		if !allowPublicStatus(cnt.Status, includeDrafts) {
			continue
		}
		if contentType != "" && !matchesContentType(cnt, contentType) {
			continue
		}
		if category != "" {
			if cat, ok := cnt.Data["category"].(string); !ok || !strings.EqualFold(strings.TrimSpace(cat), strings.TrimSpace(category)) {
				continue
			}
		}
		applyEmbeddedBlocksToContent(&cnt)
		out = append(out, cnt)
	}
	return out, nil
}

func (a *Admin) findPublicContent(ctx context.Context, locale, contentType, slug, category string, includeDrafts bool) (*CMSContent, error) {
	contents, err := a.listPublicContentsRaw(ctx, locale, contentType, category, includeDrafts)
	if err != nil {
		return nil, err
	}
	for i := range contents {
		if !contentMatchesSlug(contents[i], slug) {
			continue
		}
		if contents[i].MissingRequestedLocale && !localeFallbackAllowed(ctx) {
			requested := strings.TrimSpace(primitives.FirstNonEmptyRaw(locale, localeFromContext(ctx), contents[i].RequestedLocale))
			return nil, translationMissingNotFoundError(requested, contents[i].AvailableLocales, map[string]any{
				"content_type": primitives.FirstNonEmptyRaw(contents[i].ContentTypeSlug, contents[i].ContentType, contentType),
				"slug":         strings.TrimSpace(slug),
			})
		}
		return &contents[i], nil
	}
	return nil, nil
}

func (a *Admin) contentRecordsForSite(contents []CMSContent, locale string) []map[string]any {
	out := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		out = append(out, a.contentRecordForSite(item, locale))
	}
	return out
}

func (a *Admin) contentRecordForSite(item CMSContent, locale string) map[string]any {
	item = normalizeCMSContentLocaleState(item, locale)
	applyEmbeddedBlocksToContent(&item)
	return cmsContentRecord(item, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	})
}

func allowPublicStatus(status string, includeDrafts bool) bool {
	if includeDrafts {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(status), "published")
}

func matchesContentType(content CMSContent, contentType string) bool {
	filter := strings.TrimSpace(contentType)
	if filter == "" {
		return true
	}
	if strings.EqualFold(content.ContentTypeSlug, filter) || strings.EqualFold(content.ContentType, filter) {
		return true
	}
	if before, ok := strings.CutSuffix(filter, "s"); ok {
		filter = before
		if strings.EqualFold(content.ContentTypeSlug, filter) || strings.EqualFold(content.ContentType, filter) {
			return true
		}
	}
	if strings.HasSuffix(content.ContentTypeSlug, "s") && strings.EqualFold(strings.TrimSuffix(content.ContentTypeSlug, "s"), filter) {
		return true
	}
	if strings.HasSuffix(content.ContentType, "s") && strings.EqualFold(strings.TrimSuffix(content.ContentType, "s"), filter) {
		return true
	}
	return false
}

func contentMatchesSlug(content CMSContent, slug string) bool {
	if matchesSlug(content.Slug, slug) {
		return true
	}
	path := strings.TrimSpace(toString(content.Data["path"]))
	return matchesSlug(path, slug)
}

func matchesSlug(value, slug string) bool {
	value = strings.TrimSpace(value)
	slug = strings.TrimSpace(slug)
	if value == "" || slug == "" {
		return false
	}
	if strings.EqualFold(value, slug) {
		return true
	}
	return strings.EqualFold(strings.Trim(value, "/"), strings.Trim(slug, "/"))
}

func siteFilterValues(filters map[string]any) map[string][]string {
	if len(filters) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(filters))
	for key, raw := range filters {
		if strings.TrimSpace(key) == "" {
			continue
		}
		out[key] = append([]string{}, listquery.ValuesFromAny(raw)...)
	}
	return out
}

func queryBool(c router.Context, key string, def bool) bool {
	if c == nil {
		return def
	}
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return def
	}
	return toBool(raw)
}

func siteMetaForList(query SiteQuery, total int, records []map[string]any) SiteResponseMeta {
	meta := SiteResponseMeta{
		RequestedLocale: strings.TrimSpace(query.Locale),
		Page:            query.Page,
		PerPage:         query.PerPage,
		Total:           total,
		Query:           query,
	}
	if len(records) == 0 {
		return meta
	}
	if resolved := strings.TrimSpace(toString(records[0]["resolved_locale"])); resolved != "" {
		meta.ResolvedLocale = resolved
	} else {
		meta.ResolvedLocale = strings.TrimSpace(toString(records[0]["locale"]))
	}
	if meta.RequestedLocale == "" {
		meta.RequestedLocale = strings.TrimSpace(toString(records[0]["requested_locale"]))
	}
	return meta
}

func siteMetaForRecord(query SiteQuery, record map[string]any) SiteResponseMeta {
	meta := SiteResponseMeta{
		RequestedLocale: strings.TrimSpace(query.Locale),
		Query:           query,
	}
	if resolved := strings.TrimSpace(toString(record["resolved_locale"])); resolved != "" {
		meta.ResolvedLocale = resolved
	} else {
		meta.ResolvedLocale = strings.TrimSpace(toString(record["locale"]))
	}
	if meta.RequestedLocale == "" {
		meta.RequestedLocale = strings.TrimSpace(toString(record["requested_locale"]))
	}
	return meta
}

func siteMetaForMenu(query SiteQuery) SiteResponseMeta {
	return SiteResponseMeta{
		RequestedLocale: strings.TrimSpace(query.Locale),
		Query:           query,
	}
}

func filterMissingRequestedLocale(contents []CMSContent) []CMSContent {
	if len(contents) == 0 {
		return contents
	}
	out := make([]CMSContent, 0, len(contents))
	for _, content := range contents {
		if content.MissingRequestedLocale {
			continue
		}
		out = append(out, content)
	}
	return out
}
