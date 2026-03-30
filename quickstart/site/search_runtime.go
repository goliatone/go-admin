package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
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
	flow := r.prepareSearchPageFlow(c, topicSlug)
	ctx := r.searchViewContext(c, flow.state, flow.req, flow.result, flow.facets, flow.indexes, flow.landing, flow.err)
	if flow.err != nil {
		return renderSiteTemplateResponse(c, flow.state, r.siteCfg, siteTemplateResponse{
			JSONStatus:     502,
			TemplateStatus: 502,
			TemplateNames:  []string{searchTemplate},
			JSONPayload: siteTemplateResponsePayload(searchTemplate, ctx, map[string]any{
				"error": searchUnavailableErrorPayload(flow.err),
			}),
			ViewContext: ctx,
			FallbackError: SiteRuntimeError{
				Code:            searchUnavailableErrorCode,
				Status:          502,
				Message:         "search service unavailable",
				RequestedLocale: strings.TrimSpace(flow.req.Locale),
			},
		})
	}

	return renderSiteTemplateResponse(c, flow.state, r.siteCfg, siteTemplateResponse{
		JSONStatus:    200,
		TemplateNames: []string{searchTemplate},
		JSONPayload:   siteTemplateResponsePayload(searchTemplate, ctx, nil),
		ViewContext:   ctx,
		FallbackError: SiteRuntimeError{
			Status:          500,
			Message:         "no site template could render the search page",
			RequestedLocale: strings.TrimSpace(flow.req.Locale),
		},
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
		flow := r.prepareSearchPageFlow(c, "")
		if flow.err != nil {
			return c.JSON(502, searchAPIErrorResponse(flow.err))
		}

		envelope := buildSearchResultEnvelope(
			flow.result,
			flow.req,
			requestSearchRoute(c, r.baseRoute),
			searchCurrentQueryValues(c),
			false,
		)

		return c.JSON(200, searchAPIResponse(envelope, flow.req, flow.facets, flow.indexes, flow.landing))
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
		flow := r.prepareSearchSuggestFlow(c)
		if flow.err != nil {
			return c.JSON(502, searchAPIErrorResponse(flow.err))
		}
		return c.JSON(200, searchSuggestAPIResponse(flow.result, flow.req, flow.indexes))
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
	result, err := r.provider.Search(RequestContext(c), req)
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
	seed := r.buildSearchRequestTranslationSeed(c, state)
	page := searchPositiveOrFallback(searchIntQuery(c, "page", 1), 1)
	perPage := searchPositiveOrFallback(searchIntQuery(c, "per_page", searchIntQuery(c, "limit", 10)), 10)
	sortBy := strings.TrimSpace(firstNonEmpty(c.Query("sort"), c.Query("order")))

	ranges := searchBaseRanges(c)
	filters := cloneSearchFilters(seed.filters)
	landing := topicLandingState(topicSlug)
	applySearchLandingFilters(filters, landing)
	filters = r.injectSearchRequestFilters(RequestContext(c), c, seed, filters, ranges, false)

	req := admin.SearchRequest{
		Query:    seed.query,
		Locale:   seed.locale,
		Page:     page,
		PerPage:  perPage,
		Sort:     sortBy,
		Filters:  filters,
		Ranges:   cloneSearchRanges(ranges),
		Actor:    seed.actor,
		Request:  seed.request,
		Metadata: searchRequestMetadata(seed.facets, seed.indexes, landing, seed.acceptLanguage),
	}
	return req, seed.facets, seed.indexes, landing
}

func (r *searchRuntime) translateSuggestRequest(c router.Context, state RequestState) (admin.SuggestRequest, []string) {
	seed := r.buildSearchRequestTranslationSeed(c, state)
	limit := searchPositiveOrFallback(searchIntQuery(c, "limit", 8), 8)

	filters := r.injectSearchRequestFilters(RequestContext(c), c, seed, seed.filters, nil, true)

	req := admin.SuggestRequest{
		Query:    seed.query,
		Locale:   seed.locale,
		Limit:    limit,
		Filters:  filters,
		Actor:    seed.actor,
		Request:  seed.request,
		Metadata: searchSuggestRequestMetadata(seed.indexes, seed.acceptLanguage),
	}
	return req, seed.indexes
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
	view := newRuntimeViewContext(state)
	queryValues := searchCurrentQueryValues(c)
	activeRoute := requestSearchRoute(c, r.baseRoute)
	errorPayload := map[string]any{}
	if searchErr != nil {
		errorPayload = searchUnavailableErrorPayload(searchErr)
		delete(errorPayload, "status")
	}
	envelope := buildSearchResultEnvelope(result, req, activeRoute, queryValues, len(errorPayload) > 0)
	projection := buildSearchPageViewProjection(req, envelope, facets, indexes, landing, activeRoute, queryValues, errorPayload)

	view["search_route"] = activeRoute
	view["search_endpoint"] = strings.TrimSpace(r.siteCfg.Search.Endpoint)
	view["search_suggest_endpoint"] = strings.TrimSpace(searchSuggestRoute(r.siteCfg.Search.Endpoint))
	projection.apply(view)
	return view
}
