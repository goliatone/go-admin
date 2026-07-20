package site

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func (r *searchRuntime) executeSearch(c router.Context, req admin.SearchRequest) (admin.SearchResultPage, error) {
	return r.executeSearchWithLanding(c, req, nil)
}

func (r *searchRuntime) executeSearchWithLanding(c router.Context, req admin.SearchRequest, landing *searchLandingState) (admin.SearchResultPage, error) {
	page := searchPositiveOrFallback(req.Page, 1)
	defaultPageSize := 10
	if r != nil && r.siteCfg.Search.PageSizePolicy != nil {
		defaultPageSize = r.siteCfg.Search.PageSizePolicy.Default
	}
	perPage := searchPositiveOrFallback(req.PerPage, defaultPageSize)
	empty := admin.SearchResultPage{
		Hits:    []admin.SearchHit{},
		Page:    page,
		PerPage: perPage,
		Total:   0,
	}
	req.Page = page
	req.PerPage = perPage
	if err := r.validateSearchRequestPolicy(req); err != nil {
		return empty, err
	}
	if strings.TrimSpace(req.Query) == "" {
		prepared, err := r.prepareFilterOnlyRequest(RequestContext(c), req, landing)
		if err != nil {
			return empty, err
		}
		if prepared == nil {
			return empty, nil
		}
		req = *prepared
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

type searchClientError struct{ message string }

func (e searchClientError) Error() string { return e.message }

func newSearchClientError(format string, args ...any) error {
	return searchClientError{message: fmt.Sprintf(format, args...)}
}

func (r *searchRuntime) validateSearchRequestPolicy(req admin.SearchRequest) error {
	if r == nil {
		return nil
	}
	if err := r.validateSearchVariant(req.Variant); err != nil {
		return err
	}
	if policy := r.siteCfg.Search.PageSizePolicy; policy != nil && !slices.Contains(policy.Allowed, req.PerPage) {
		return newSearchClientError("unsupported search page size %d", req.PerPage)
	}
	return nil
}

func (r *searchRuntime) validateSearchVariant(value admin.SearchVariant) error {
	if r == nil || r.siteCfg.Search.VariantPolicy == nil {
		return nil
	}
	value = admin.SearchVariant(strings.TrimSpace(string(value)))
	if value != "" && !slices.Contains(r.siteCfg.Search.VariantPolicy.Allowed, value) {
		return newSearchClientError("unsupported search variant %q", value)
	}
	return nil
}

func (r *searchRuntime) prepareFilterOnlyRequest(ctx context.Context, req admin.SearchRequest, landing *searchLandingState) (*admin.SearchRequest, error) {
	if r == nil || r.siteCfg.Search.FilterOnlyPolicy == nil || !r.siteCfg.Search.FilterOnlyPolicy.Enabled {
		return nil, nil
	}
	policy := r.siteCfg.Search.FilterOnlyPolicy
	if filterOnlyWindowExceedsPolicy(req, policy) {
		return nil, newSearchClientError("filter-only search exceeds configured page or candidate ceiling")
	}
	filters, filterConstraint := eligibleFilterOnlyFilters(req.Filters, landing, policy)
	ranges, rangeConstraint := eligibleFilterOnlyRanges(req.Ranges, policy)
	hasConstraint := filterConstraint || rangeConstraint
	if !hasConstraint {
		return nil, newSearchClientError("filter-only search requires an eligible effective constraint")
	}
	validator, ok := r.provider.(admin.FilterOnlyRequestValidator)
	if !ok {
		return nil, newSearchClientError("search provider does not acknowledge filter-only constraints")
	}
	req.Filters = filters
	req.Ranges = ranges
	req.Metadata = cloneAnyMap(req.Metadata)
	if req.Metadata == nil {
		req.Metadata = map[string]any{}
	}
	req.Metadata["max_candidates"] = policy.MaxCandidates
	req.MaxCandidates = policy.MaxCandidates
	if ctx == nil {
		ctx = context.Background()
	}
	if err := validator.ValidateFilterOnlyRequest(ctx, req); err != nil {
		return nil, newSearchClientError("filter-only request rejected: %v", err)
	}
	return &req, nil
}

func filterOnlyWindowExceedsPolicy(req admin.SearchRequest, policy *SiteSearchFilterOnlyPolicy) bool {
	return req.Page < 1 || req.Page > policy.MaxPage || req.PerPage < 1 || req.PerPage > policy.MaxPageSize || req.Page*req.PerPage > policy.MaxCandidates
}

func eligibleFilterOnlyFilters(input map[string][]string, landing *searchLandingState, policy *SiteSearchFilterOnlyPolicy) (map[string][]string, bool) {
	out := map[string][]string{}
	for _, field := range policy.EligibleFilterFields {
		if values := input[field]; len(values) > 0 {
			out[field] = append([]string(nil), values...)
		}
	}
	if landing != nil && slices.Contains(policy.EligibleLandingConstraints, landing.Slug) {
		landingFilters := map[string][]string{}
		applySearchLandingFilters(landingFilters, landing)
		for field, values := range landingFilters {
			if len(values) > 0 {
				out[field] = append([]string(nil), values...)
			}
		}
	}
	return out, len(out) > 0
}

func eligibleFilterOnlyRanges(input []admin.SearchRange, policy *SiteSearchFilterOnlyPolicy) ([]admin.SearchRange, bool) {
	out := make([]admin.SearchRange, 0, len(input))
	for _, item := range input {
		if slices.Contains(policy.EligibleRangeFields, item.Field) && (item.GTE != nil || item.LTE != nil) {
			out = append(out, item)
		}
	}
	return out, len(out) > 0
}

func (r *searchRuntime) translateSearchRequest(c router.Context, state RequestState, topicSlug string) (admin.SearchRequest, []string, []string, *searchLandingState) {
	seed := r.buildSearchRequestTranslationSeed(c, state)
	page := searchPositiveOrFallback(searchIntQuery(c, "page", 1), 1)
	defaultPageSize := 10
	if policy := r.siteCfg.Search.PageSizePolicy; policy != nil {
		defaultPageSize = policy.Default
	}
	perPage := searchPositiveOrFallback(searchIntQuery(c, "per_page", searchIntQuery(c, "limit", defaultPageSize)), defaultPageSize)
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
		Variant:  seed.variant,
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
	req.Variant = seed.variant
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
