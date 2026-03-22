package site

import (
	"context"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-search/adapters/media"
)

const (
	searchUnavailableErrorCode = "search_unavailable"
	searchTemplate             = "site/search"
)

type searchRuntime struct {
	siteCfg   ResolvedSiteConfig
	provider  admin.SearchProvider
	modules   []SiteModule
	baseRoute string
}

type searchLandingState struct {
	Slug       string
	Title      string
	Breadcrumb string
}

func newSearchRuntime(siteCfg ResolvedSiteConfig, provider admin.SearchProvider, modules []SiteModule) *searchRuntime {
	if provider == nil {
		return nil
	}
	return &searchRuntime{
		siteCfg:   siteCfg,
		provider:  provider,
		modules:   compactModules(modules),
		baseRoute: prefixedRoutePath(siteCfg.BasePath, siteCfg.Search.Route),
	}
}

func (r *searchRuntime) PageHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return r.renderPage(c, "")
	}
}

func (r *searchRuntime) TopicPageHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		return r.renderPage(c, strings.TrimSpace(c.Param("topic_slug")))
	}
}

func (r *searchRuntime) renderPage(c router.Context, topicSlug string) error {
	state := fallbackRequestState(c, r.siteCfg)
	req, facets, indexes, landing := r.translateSearchRequest(c, state, topicSlug)
	result, searchErr := r.executeSearch(c, req)
	ctx := r.searchViewContext(c, state, req, result, facets, indexes, landing, searchErr)
	if searchErr != nil {
		if wantsJSONResponse(c) {
			return c.JSON(502, map[string]any{
				"error": map[string]any{
					"code":    searchUnavailableErrorCode,
					"status":  502,
					"message": strings.TrimSpace(searchErr.Error()),
				},
				"template": searchTemplate,
				"context":  ctx,
			})
		}
		c.Status(502)
		if err := renderSiteTemplate(c, searchTemplate, ctx); err == nil {
			return nil
		}
		return renderSiteRuntimeError(c, state, r.siteCfg, SiteRuntimeError{
			Code:            searchUnavailableErrorCode,
			Status:          502,
			Message:         "search service unavailable",
			RequestedLocale: strings.TrimSpace(req.Locale),
		})
	}

	if wantsJSONResponse(c) {
		return c.JSON(200, map[string]any{
			"template": searchTemplate,
			"context":  ctx,
		})
	}
	if err := renderSiteTemplate(c, searchTemplate, ctx); err == nil {
		return nil
	}
	return renderSiteRuntimeError(c, state, r.siteCfg, SiteRuntimeError{
		Status:          500,
		Message:         "no site template could render the search page",
		RequestedLocale: strings.TrimSpace(req.Locale),
	})
}

func (r *searchRuntime) APIHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		state := fallbackRequestState(c, r.siteCfg)
		req, facets, indexes, landing := r.translateSearchRequest(c, state, "")
		result, searchErr := r.executeSearch(c, req)
		if searchErr != nil {
			return c.JSON(502, map[string]any{
				"error": map[string]any{
					"code":    searchUnavailableErrorCode,
					"status":  502,
					"message": strings.TrimSpace(searchErr.Error()),
				},
			})
		}

		page := searchPositiveOrFallback(result.Page, req.Page)
		perPage := searchPositiveOrFallback(result.PerPage, req.PerPage)
		data := normalizeSearchResults(result, req.Filters, requestSearchRoute(c, r.baseRoute), searchCurrentQueryValues(c))

		return c.JSON(200, map[string]any{
			"data": map[string]any{
				"hits":       data.Hits,
				"facets":     data.Facets,
				"page":       page,
				"per_page":   perPage,
				"total":      result.Total,
				"pagination": data.Pagination,
			},
			"meta": map[string]any{
				"query":       req.Query,
				"locale":      req.Locale,
				"sort":        req.Sort,
				"filters":     cloneSearchFilters(req.Filters),
				"ranges":      cloneSearchRanges(req.Ranges),
				"facets":      cloneStrings(facets),
				"indexes":     cloneStrings(indexes),
				"collections": cloneStrings(indexes),
				"landing":     landingMetadata(landing),
			},
		})
	}
}

func (r *searchRuntime) SuggestAPIHandler() router.HandlerFunc {
	if r == nil || r.provider == nil {
		return defaultNotFoundHandler
	}
	return func(c router.Context) error {
		if c == nil {
			return nil
		}
		state := fallbackRequestState(c, r.siteCfg)
		req, indexes := r.translateSuggestRequest(c, state)
		result := admin.SuggestResult{Suggestions: []string{}}
		var suggestErr error
		if strings.TrimSpace(req.Query) != "" {
			result, suggestErr = r.provider.Suggest(requestContext(c), req)
		}
		if suggestErr != nil {
			return c.JSON(502, map[string]any{
				"error": map[string]any{
					"code":    searchUnavailableErrorCode,
					"status":  502,
					"message": strings.TrimSpace(suggestErr.Error()),
				},
			})
		}
		return c.JSON(200, map[string]any{
			"data": map[string]any{
				"suggestions": append([]string{}, result.Suggestions...),
			},
			"meta": map[string]any{
				"query":       strings.TrimSpace(req.Query),
				"locale":      strings.TrimSpace(req.Locale),
				"filters":     cloneSearchFilters(req.Filters),
				"indexes":     cloneStrings(indexes),
				"collections": cloneStrings(indexes),
			},
		})
	}
}

func (r *searchRuntime) executeSearch(c router.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	page := searchPositiveOrFallback(req.Page, 1)
	perPage := searchPositiveOrFallback(req.PerPage, 10)
	empty := admin.SearchResultPage{
		Hits:    []admin.SearchHit{},
		Page:    page,
		PerPage: perPage,
		Total:   0,
	}
	if strings.TrimSpace(req.Query) == "" {
		return empty, nil
	}
	result, err := r.provider.Search(requestContext(c), req)
	if err != nil {
		return empty, err
	}
	if result.Page <= 0 {
		result.Page = page
	}
	if result.PerPage <= 0 {
		result.PerPage = perPage
	}
	if result.Hits == nil {
		result.Hits = []admin.SearchHit{}
	}
	return result, nil
}

func (r *searchRuntime) translateSearchRequest(c router.Context, state RequestState, topicSlug string) (admin.SearchRequest, []string, []string, *searchLandingState) {
	locale := strings.TrimSpace(firstNonEmpty(c.Query("locale"), state.Locale))
	query := strings.TrimSpace(firstNonEmpty(c.Query("q"), c.Query("query"), c.Query("search")))
	page := searchPositiveOrFallback(searchIntQuery(c, "page", 1), 1)
	perPage := searchPositiveOrFallback(searchIntQuery(c, "per_page", searchIntQuery(c, "limit", 10)), 10)
	sortBy := strings.TrimSpace(firstNonEmpty(c.Query("sort"), c.Query("order")))
	facets := searchFacetValues(c)
	indexes := searchIndexValues(c, r.siteCfg.Search.Indexes)

	ranges := searchBaseRanges(c)
	filters := searchBaseFilters(c)
	landing := topicLandingState(topicSlug)
	if landing != nil {
		if preset, ok := media.TopicLandingPreset(landing.Slug); ok {
			for field, values := range preset.FacetFilter {
				searchAddFilterValue(filters, field, values...)
			}
		}
	}
	filters = r.injectModuleFilters(requestContext(c), c, SiteSearchFilterRequest{
		Query:     query,
		Locale:    locale,
		Filters:   cloneSearchFilters(filters),
		Ranges:    cloneSearchRanges(ranges),
		IsSuggest: false,
	}, filters)

	req := admin.SearchRequest{
		Query:   query,
		Locale:  locale,
		Page:    page,
		PerPage: perPage,
		Sort:    sortBy,
		Filters: filters,
		Ranges:  cloneSearchRanges(ranges),
		Actor:   searchActorPayload(c),
		Request: searchRequestPayload(c),
		Metadata: map[string]any{
			"facets":          cloneStrings(facets),
			"indexes":         cloneStrings(indexes),
			"collections":     cloneStrings(indexes),
			"accept_language": searchAcceptLanguage(c),
			"landing":         landingMetadata(landing),
		},
	}
	return req, facets, indexes, landing
}

func (r *searchRuntime) translateSuggestRequest(c router.Context, state RequestState) (admin.SuggestRequest, []string) {
	locale := strings.TrimSpace(firstNonEmpty(c.Query("locale"), state.Locale))
	query := strings.TrimSpace(firstNonEmpty(c.Query("q"), c.Query("query"), c.Query("search")))
	limit := searchPositiveOrFallback(searchIntQuery(c, "limit", 8), 8)
	indexes := searchIndexValues(c, r.siteCfg.Search.Indexes)

	filters := searchBaseFilters(c)
	filters = r.injectModuleFilters(requestContext(c), c, SiteSearchFilterRequest{
		Query:     query,
		Locale:    locale,
		Filters:   cloneSearchFilters(filters),
		IsSuggest: true,
	}, filters)

	req := admin.SuggestRequest{
		Query:   query,
		Locale:  locale,
		Limit:   limit,
		Filters: filters,
		Actor:   searchActorPayload(c),
		Request: searchRequestPayload(c),
		Metadata: map[string]any{
			"indexes":         cloneStrings(indexes),
			"collections":     cloneStrings(indexes),
			"accept_language": searchAcceptLanguage(c),
		},
	}
	return req, indexes
}

func (r *searchRuntime) injectModuleFilters(
	ctx context.Context,
	c router.Context,
	req SiteSearchFilterRequest,
	filters map[string][]string,
) map[string][]string {
	out := cloneSearchFilters(filters)
	for _, module := range r.modules {
		injector, ok := module.(SiteSearchFilterInjector)
		if !ok || injector == nil {
			continue
		}
		req.Filters = cloneSearchFilters(out)
		injected := injector.SearchFilters(ctx, c, req)
		for key, values := range injected {
			searchAddFilterValue(out, key, values...)
		}
	}
	return out
}

func (r *searchRuntime) searchViewContext(
	c router.Context,
	state RequestState,
	req admin.SearchRequest,
	result admin.SearchResultPage,
	facets []string,
	indexes []string,
	landing *searchLandingState,
	searchErr error,
) router.ViewContext {
	view := cloneViewContext(state.ViewContext)
	queryValues := searchCurrentQueryValues(c)
	activeRoute := requestSearchRoute(c, r.baseRoute)
	normalized := normalizeSearchResults(result, req.Filters, activeRoute, queryValues)
	sortOptions := searchSortOptions(req.Sort)
	rangeValues := searchRangeValues(req.Ranges)
	errorPayload := map[string]any{}
	if searchErr != nil {
		errorPayload = map[string]any{
			"code":    searchUnavailableErrorCode,
			"message": strings.TrimSpace(searchErr.Error()),
		}
	}

	view["search_route"] = activeRoute
	view["search_endpoint"] = strings.TrimSpace(r.siteCfg.Search.Endpoint)
	view["search_suggest_endpoint"] = strings.TrimSpace(searchSuggestRoute(r.siteCfg.Search.Endpoint))
	view["search_query"] = strings.TrimSpace(req.Query)
	view["search_results"] = normalized.Hits
	view["search_facets"] = normalized.Facets
	view["search_filter_chips"] = normalized.FilterChips
	view["search_pagination"] = normalized.Pagination
	view["search_sort_options"] = sortOptions
	view["search_filters"] = cloneSearchFilters(req.Filters)
	view["search_ranges"] = cloneSearchRanges(req.Ranges)
	view["search_range_values"] = rangeValues
	view["search_indexes"] = cloneStrings(indexes)
	view["search_collections"] = cloneStrings(indexes)
	view["search_clear_url"] = searchClearURL(activeRoute, queryValues)
	view["search_landing"] = landingMetadata(landing)
	view["search_state"] = map[string]any{
		"has_query":    strings.TrimSpace(req.Query) != "",
		"has_results":  len(normalized.Hits) > 0,
		"zero_results": strings.TrimSpace(req.Query) != "" && len(normalized.Hits) == 0 && len(errorPayload) == 0,
		"has_error":    len(errorPayload) > 0,
	}
	view["search_error"] = errorPayload
	view["search"] = map[string]any{
		"query":         strings.TrimSpace(req.Query),
		"results":       normalized.Hits,
		"facets":        normalized.Facets,
		"filter_chips":  normalized.FilterChips,
		"filters":       cloneSearchFilters(req.Filters),
		"ranges":        cloneSearchRanges(req.Ranges),
		"range_values":  rangeValues,
		"pagination":    normalized.Pagination,
		"sort_options":  sortOptions,
		"sort":          strings.TrimSpace(req.Sort),
		"page":          searchPositiveOrFallback(result.Page, req.Page),
		"per_page":      searchPositiveOrFallback(result.PerPage, req.PerPage),
		"total":         result.Total,
		"indexes":       cloneStrings(indexes),
		"collections":   cloneStrings(indexes),
		"facets_active": cloneStrings(facets),
		"error":         errorPayload,
		"clear_url":     view["search_clear_url"],
		"landing":       view["search_landing"],
		"state":         view["search_state"],
	}
	return view
}

type normalizedSearchResult struct {
	Hits        []map[string]any `json:"hits"`
	Facets      []map[string]any `json:"facets"`
	FilterChips []map[string]any `json:"filter_chips"`
	Pagination  map[string]any   `json:"pagination"`
}

func normalizeSearchResults(
	result admin.SearchResultPage,
	activeFilters map[string][]string,
	baseRoute string,
	currentQuery map[string][]string,
) normalizedSearchResult {
	hits := make([]map[string]any, 0, len(result.Hits))
	for _, hit := range result.Hits {
		hits = append(hits, normalizeSearchHit(hit))
	}

	facets := make([]map[string]any, 0, len(result.Facets))
	for _, facet := range result.Facets {
		facetName := strings.TrimSpace(facet.Name)
		if facetName == "" {
			continue
		}
		buckets := make([]map[string]any, 0, len(facet.Buckets))
		for _, bucket := range facet.Buckets {
			value := strings.TrimSpace(bucket.Value)
			if value == "" {
				continue
			}
			active := bucket.Selected || searchFilterContains(activeFilters[facetName], value)
			nextQuery := cloneSearchFilters(currentQuery)
			if active {
				searchRemoveFilterValue(nextQuery, facetName, value)
			} else {
				searchAddFilterValue(nextQuery, facetName, value)
			}
			buckets = append(buckets, map[string]any{
				"value":        value,
				"label":        strings.TrimSpace(firstNonEmpty(bucket.Label, value)),
				"count":        bucket.Count,
				"active":       active,
				"selected":     active,
				"path":         append([]string{}, bucket.Path...),
				"level":        bucket.Level,
				"indent_px":    bucket.Level * 12,
				"parent_value": bucket.ParentValue,
				"metadata":     cloneAnyMap(bucket.Metadata),
				"url":          searchURLWithQuery(baseRoute, nextQuery),
			})
		}
		if len(buckets) == 0 {
			continue
		}
		facets = append(facets, map[string]any{
			"name":        facetName,
			"kind":        strings.TrimSpace(facet.Kind),
			"disjunctive": facet.Disjunctive,
			"metadata":    cloneAnyMap(facet.Metadata),
			"buckets":     buckets,
		})
	}

	chips := searchFilterChips(activeFilters, baseRoute, currentQuery)
	page := searchPositiveOrFallback(result.Page, 1)
	perPage := searchPositiveOrFallback(result.PerPage, 10)
	hasPrev := page > 1
	hasNext := result.Total > page*perPage
	prevPage := page - 1
	if prevPage < 1 {
		prevPage = 1
	}
	nextPage := page + 1
	prevQuery := cloneSearchFilters(currentQuery)
	prevQuery["page"] = []string{strconv.Itoa(prevPage)}
	nextQuery := cloneSearchFilters(currentQuery)
	nextQuery["page"] = []string{strconv.Itoa(nextPage)}
	pagination := map[string]any{
		"page":      page,
		"per_page":  perPage,
		"total":     result.Total,
		"has_prev":  hasPrev,
		"has_next":  hasNext,
		"prev_page": prevPage,
		"next_page": nextPage,
		"prev_url":  searchURLWithQuery(baseRoute, prevQuery),
		"next_url":  searchURLWithQuery(baseRoute, nextQuery),
	}

	return normalizedSearchResult{
		Hits:        hits,
		Facets:      facets,
		FilterChips: chips,
		Pagination:  pagination,
	}
}

func normalizeSearchHit(hit admin.SearchHit) map[string]any {
	fields := cloneAnyMap(hit.Fields)
	out := map[string]any{
		"id":               strings.TrimSpace(hit.ID),
		"type":             strings.TrimSpace(hit.Type),
		"title":            strings.TrimSpace(hit.Title),
		"summary":          strings.TrimSpace(hit.Summary),
		"locale":           strings.TrimSpace(hit.Locale),
		"score":            hit.Score,
		"fields":           fields,
		"snippet":          strings.TrimSpace(hit.Snippet),
		"highlighted":      strings.TrimSpace(hit.Highlighted),
		"parent_id":        strings.TrimSpace(hit.ParentID),
		"parent_title":     strings.TrimSpace(hit.ParentTitle),
		"parent_url":       strings.TrimSpace(hit.ParentURL),
		"parent_thumbnail": strings.TrimSpace(hit.ParentThumbnail),
		"parent_summary":   strings.TrimSpace(hit.ParentSummary),
		"anchor":           hit.Anchor,
		"metadata":         cloneAnyMap(hit.Metadata),
	}
	if out["title"] == "" {
		out["title"] = strings.TrimSpace(anyString(hit.Fields["title"]))
	}
	if out["summary"] == "" {
		out["summary"] = strings.TrimSpace(anyString(hit.Fields["summary"]))
	}
	out["url"] = searchNormalizedHitURL(hit)
	if hit.PublishedAt != nil {
		out["published_at"] = hit.PublishedAt.UTC().Format(time.RFC3339)
	}
	if out["summary"] == "" {
		out["summary"] = strings.TrimSpace(hit.Snippet)
	}
	if badge := strings.TrimSpace(anyString(fields["result_badge"])); badge != "" {
		out["badge"] = badge
	}
	return out
}

func searchNormalizedHitURL(hit admin.SearchHit) string {
	fields := cloneAnyMap(hit.Fields)
	candidates := []string{
		strings.TrimSpace(hit.URL),
		strings.TrimSpace(anyString(fields["canonical_url"])),
		strings.TrimSpace(anyString(fields["canonical_path"])),
		strings.TrimSpace(anyString(fields["url"])),
		strings.TrimSpace(anyString(fields["path"])),
		strings.TrimSpace(anyString(fields["href"])),
	}
	for _, candidate := range candidates {
		if normalized := strings.TrimSpace(admin.CanonicalPath(candidate, "")); normalized != "" {
			return normalized
		}
	}
	contentType := strings.TrimSpace(firstNonEmpty(
		hit.Type,
		anyString(fields["content_type"]),
		anyString(fields["type"]),
		anyString(fields["entity_type"]),
	))
	slug := strings.TrimSpace(firstNonEmpty(
		anyString(fields["slug"]),
		anyString(fields["path_slug"]),
		anyString(fields["id"]),
		hit.ID,
	))
	if path := admin.CanonicalContentPath(contentType, slug); path != "" {
		return path
	}
	return ""
}

func searchSortOptions(active string) []map[string]any {
	active = strings.TrimSpace(strings.ToLower(active))
	options := []map[string]any{
		{"value": "", "label": "Relevance"},
		{"value": "published_year:desc", "label": "Newest"},
		{"value": "published_year:asc", "label": "Oldest"},
		{"value": "duration_seconds:asc", "label": "Shortest"},
		{"value": "duration_seconds:desc", "label": "Longest"},
		{"value": "published_at:desc", "label": "Newest"},
		{"value": "published_at:asc", "label": "Oldest"},
		{"value": "title:asc", "label": "Title A-Z"},
		{"value": "title:desc", "label": "Title Z-A"},
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		value := strings.TrimSpace(strings.ToLower(anyString(option["value"])))
		clone := cloneAnyMap(option)
		clone["active"] = value == active || (active == "" && value == "")
		out = append(out, clone)
	}
	return out
}

func searchFilterChips(filters map[string][]string, baseRoute string, currentQuery map[string][]string) []map[string]any {
	if len(filters) == 0 {
		return []map[string]any{}
	}
	keys := make([]string, 0, len(filters))
	for key := range filters {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	out := []map[string]any{}
	for _, key := range keys {
		for _, value := range filters[key] {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			nextQuery := cloneSearchFilters(currentQuery)
			searchRemoveFilterValue(nextQuery, key, value)
			out = append(out, map[string]any{
				"key":        key,
				"value":      value,
				"label":      key + ": " + value,
				"remove_url": searchURLWithQuery(baseRoute, nextQuery),
			})
		}
	}
	return out
}

func searchCurrentQueryValues(c router.Context) map[string][]string {
	if c == nil {
		return map[string][]string{}
	}
	out := map[string][]string{}
	for key := range c.Queries() {
		values := searchQueryValues(c, key)
		if len(values) == 0 {
			continue
		}
		out[key] = values
	}
	return out
}

func searchRequestPayload(c router.Context) map[string]any {
	if c == nil {
		return map[string]any{}
	}
	return map[string]any{
		"method":          strings.TrimSpace(c.Method()),
		"path":            strings.TrimSpace(c.Path()),
		"ip":              strings.TrimSpace(c.IP()),
		"user_agent":      strings.TrimSpace(c.Header("User-Agent")),
		"accept_language": searchAcceptLanguage(c),
		"query":           c.Queries(),
		"query_values":    searchCurrentQueryValues(c),
	}
}

func searchActorPayload(c router.Context) map[string]any {
	if c == nil {
		return nil
	}
	var actor *auth.ActorContext
	if resolved, ok := auth.ActorFromRouterContext(c); ok && resolved != nil {
		actor = resolved
	} else if resolved, ok := auth.ActorFromContext(c.Context()); ok && resolved != nil {
		actor = resolved
	}
	if actor == nil {
		return nil
	}
	out := map[string]any{
		"actor_id":        strings.TrimSpace(actor.ActorID),
		"subject":         strings.TrimSpace(actor.Subject),
		"role":            strings.TrimSpace(actor.Role),
		"tenant_id":       strings.TrimSpace(actor.TenantID),
		"organization_id": strings.TrimSpace(actor.OrganizationID),
		"metadata":        cloneAnyMap(actor.Metadata),
	}
	if out["actor_id"] == "" && out["subject"] != "" {
		out["actor_id"] = out["subject"]
	}
	return out
}

func searchFacetValues(c router.Context) []string {
	values := append(searchQueryValues(c, "facet"), searchQueryValues(c, "facets")...)
	return searchDedupeStrings(values)
}

func searchIndexValues(c router.Context, fallback []string) []string {
	values := append(searchQueryValues(c, "index"), searchQueryValues(c, "indexes")...)
	if len(values) == 0 {
		values = append(searchQueryValues(c, "collection"), searchQueryValues(c, "collections")...)
	}
	values = searchDedupeStrings(values)
	if len(values) > 0 {
		return values
	}
	return cloneStrings(fallback)
}

func searchCollectionValues(c router.Context, fallback []string) []string {
	return searchIndexValues(c, fallback)
}

func searchBaseFilters(c router.Context) map[string][]string {
	out := map[string][]string{}
	if c == nil {
		return out
	}
	reserved := map[string]struct{}{
		"q":               {},
		"query":           {},
		"search":          {},
		"page":            {},
		"per_page":        {},
		"limit":           {},
		"offset":          {},
		"sort":            {},
		"order":           {},
		"facet":           {},
		"facets":          {},
		"index":           {},
		"indexes":         {},
		"format":          {},
		"collection":      {},
		"collections":     {},
		"accept_language": {},
		"env":             {},
		"environment":     {},
		"preview_token":   {},
		"view_profile":    {},
	}
	for key := range c.Queries() {
		normalizedKey := strings.TrimSpace(key)
		if normalizedKey == "" {
			continue
		}
		if _, skip := reserved[normalizedKey]; skip {
			continue
		}
		if _, _, ok := searchRangeKeyParts(normalizedKey); ok {
			continue
		}
		values := searchQueryValues(c, normalizedKey)
		if len(values) == 0 {
			continue
		}
		switch {
		case strings.HasPrefix(normalizedKey, "filter."):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filter.")
		case strings.HasPrefix(normalizedKey, "filter_"):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filter_")
		case strings.HasPrefix(normalizedKey, "filters."):
			normalizedKey = strings.TrimPrefix(normalizedKey, "filters.")
		case strings.HasPrefix(normalizedKey, "facet_"):
			normalizedKey = strings.TrimPrefix(normalizedKey, "facet_")
		}
		searchAddFilterValue(out, normalizedKey, values...)
	}

	searchForwardFilterAlias(out, c, "locale", "locale")
	searchForwardFilterAlias(out, c, "content_type", "content_type", "content_types", "type")
	searchForwardFilterAlias(out, c, "tag", "tag", "tags")
	searchForwardFilterAlias(out, c, "category", "category", "categories")
	searchForwardFilterAlias(out, c, "date_from", "date_from", "from", "start_date")
	searchForwardFilterAlias(out, c, "date_to", "date_to", "to", "end_date")

	return out
}

func searchBaseRanges(c router.Context) []admin.SearchRange {
	if c == nil {
		return nil
	}
	acc := map[string]*admin.SearchRange{}
	keys := make([]string, 0, len(c.Queries()))
	for key := range c.Queries() {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		field, bound, ok := searchRangeKeyParts(strings.TrimSpace(key))
		if !ok {
			continue
		}
		values := searchQueryValues(c, key)
		if len(values) == 0 {
			continue
		}
		entry := acc[field]
		if entry == nil {
			entry = &admin.SearchRange{Field: field}
			acc[field] = entry
		}
		value := searchParseRangeValue(values[len(values)-1])
		if value == nil {
			continue
		}
		switch bound {
		case "gte":
			entry.GTE = value
		case "lte":
			entry.LTE = value
		}
	}
	if len(acc) == 0 {
		return nil
	}
	fields := make([]string, 0, len(acc))
	for field := range acc {
		fields = append(fields, field)
	}
	sort.Strings(fields)
	out := make([]admin.SearchRange, 0, len(fields))
	for _, field := range fields {
		entry := acc[field]
		if entry == nil || (entry.GTE == nil && entry.LTE == nil) {
			continue
		}
		out = append(out, *entry)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func searchRangeKeyParts(key string) (string, string, bool) {
	key = strings.TrimSpace(key)
	switch {
	case strings.HasSuffix(key, "_gte"):
		field := strings.TrimSpace(strings.TrimSuffix(key, "_gte"))
		return field, "gte", field != ""
	case strings.HasSuffix(key, "_lte"):
		field := strings.TrimSpace(strings.TrimSuffix(key, "_lte"))
		return field, "lte", field != ""
	default:
		return "", "", false
	}
}

func searchParseRangeValue(raw string) any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if parsed, err := strconv.Atoi(raw); err == nil {
		return parsed
	}
	if parsed, err := strconv.ParseFloat(raw, 64); err == nil {
		return parsed
	}
	return raw
}

func searchForwardFilterAlias(target map[string][]string, c router.Context, canonical string, aliases ...string) {
	for _, alias := range aliases {
		values := searchQueryValues(c, alias)
		if len(values) == 0 {
			continue
		}
		searchAddFilterValue(target, canonical, values...)
	}
}

func searchQueryValues(c router.Context, key string) []string {
	if c == nil {
		return []string{}
	}
	values := []string{}
	func() {
		defer func() { _ = recover() }()
		values = append(values, c.QueryValues(key)...)
	}()
	if len(values) == 0 {
		if scalar := strings.TrimSpace(c.Query(key)); scalar != "" {
			values = append(values, scalar)
		}
	}
	out := []string{}
	for _, value := range values {
		for _, part := range strings.Split(value, ",") {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return searchDedupeStrings(out)
}

func searchDedupeStrings(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func searchAcceptLanguage(c router.Context) string {
	if c == nil {
		return ""
	}
	if value := strings.TrimSpace(firstNonEmpty(c.Query("accept_language"), c.Header("Accept-Language"))); value != "" {
		return value
	}
	return ""
}

func requestSearchRoute(c router.Context, fallback string) string {
	if c == nil {
		return fallback
	}
	if path := strings.TrimSpace(c.Path()); path != "" {
		return path
	}
	return fallback
}

func searchClearURL(baseRoute string, currentQuery map[string][]string) string {
	next := cloneSearchFilters(currentQuery)
	for key := range next {
		switch {
		case key == "page":
			delete(next, key)
		case strings.HasPrefix(key, "facet_"):
			delete(next, key)
		case strings.HasPrefix(key, "filter_"):
			delete(next, key)
		case strings.HasPrefix(key, "filter."):
			delete(next, key)
		case strings.HasPrefix(key, "filters."):
			delete(next, key)
		case strings.HasSuffix(key, "_gte"):
			delete(next, key)
		case strings.HasSuffix(key, "_lte"):
			delete(next, key)
		}
		if key == "content_type" || key == "tag" || key == "category" || key == "date_from" || key == "date_to" {
			delete(next, key)
		}
	}
	return searchURLWithQuery(baseRoute, next)
}

func topicLandingState(slug string) *searchLandingState {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil
	}
	preset, ok := media.TopicLandingPreset(slug)
	if !ok {
		return &searchLandingState{Slug: slug}
	}
	return &searchLandingState{
		Slug:       preset.Slug,
		Title:      preset.Title,
		Breadcrumb: preset.Breadcrumb,
	}
}

func landingMetadata(landing *searchLandingState) map[string]any {
	if landing == nil {
		return nil
	}
	return map[string]any{
		"slug":       strings.TrimSpace(landing.Slug),
		"title":      strings.TrimSpace(landing.Title),
		"breadcrumb": strings.TrimSpace(landing.Breadcrumb),
	}
}

func searchRangeValues(ranges []admin.SearchRange) map[string]map[string]any {
	out := map[string]map[string]any{}
	for _, item := range ranges {
		field := strings.TrimSpace(item.Field)
		if field == "" {
			continue
		}
		out[field] = map[string]any{
			"gte": item.GTE,
			"lte": item.LTE,
		}
	}
	return out
}

func cloneSearchFilters(input map[string][]string) map[string][]string {
	if len(input) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(input))
	for key, values := range input {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = append([]string{}, values...)
	}
	return out
}

func cloneSearchRanges(input []admin.SearchRange) []admin.SearchRange {
	if len(input) == 0 {
		return nil
	}
	out := make([]admin.SearchRange, 0, len(input))
	for _, item := range input {
		field := strings.TrimSpace(item.Field)
		if field == "" || (item.GTE == nil && item.LTE == nil) {
			continue
		}
		out = append(out, admin.SearchRange{
			Field: field,
			GTE:   item.GTE,
			LTE:   item.LTE,
		})
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func searchAddFilterValue(filters map[string][]string, key string, values ...string) {
	if filters == nil {
		return
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return
	}
	existing := append([]string{}, filters[key]...)
	seen := map[string]struct{}{}
	for _, value := range existing {
		seen[strings.TrimSpace(value)] = struct{}{}
	}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		existing = append(existing, value)
	}
	if len(existing) == 0 {
		return
	}
	filters[key] = existing
}

func searchRemoveFilterValue(filters map[string][]string, key, value string) {
	if len(filters) == 0 {
		return
	}
	key = strings.TrimSpace(key)
	value = strings.TrimSpace(value)
	if key == "" || value == "" {
		return
	}
	values := filters[key]
	if len(values) == 0 {
		return
	}
	out := make([]string, 0, len(values))
	for _, current := range values {
		if strings.TrimSpace(current) == value {
			continue
		}
		out = append(out, current)
	}
	if len(out) == 0 {
		delete(filters, key)
		return
	}
	filters[key] = out
}

func searchFilterContains(values []string, target string) bool {
	target = strings.TrimSpace(target)
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), target) {
			return true
		}
	}
	return false
}

func searchURLWithQuery(path string, query map[string][]string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		path = "/search"
	}
	if len(query) == 0 {
		return path
	}
	keys := make([]string, 0, len(query))
	for key := range query {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	values := url.Values{}
	for _, key := range keys {
		for _, value := range query[key] {
			value = strings.TrimSpace(value)
			if value == "" {
				continue
			}
			values.Add(key, value)
		}
	}
	if encoded := values.Encode(); encoded != "" {
		return path + "?" + encoded
	}
	return path
}

func searchPositiveOrFallback(value, fallback int) int {
	if value > 0 {
		return value
	}
	if fallback > 0 {
		return fallback
	}
	return 1
}

func searchIntQuery(c router.Context, key string, fallback int) int {
	if c == nil {
		return fallback
	}
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func fallbackRequestState(c router.Context, cfg ResolvedSiteConfig) RequestState {
	if state, ok := RequestStateFromRequest(c); ok {
		return state
	}
	activePath := cfg.Search.Route
	if c != nil {
		activePath = c.Path()
	}
	return RequestState{
		Locale:              cfg.DefaultLocale,
		DefaultLocale:       cfg.DefaultLocale,
		SupportedLocales:    cloneStrings(cfg.SupportedLocales),
		AllowLocaleFallback: cfg.AllowLocaleFallback,
		BasePath:            cfg.BasePath,
		AssetBasePath:       cfg.Views.AssetBasePath,
		ActivePath:          activePath,
		ViewContext:         router.ViewContext{},
	}
}
