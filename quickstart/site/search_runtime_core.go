package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

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
