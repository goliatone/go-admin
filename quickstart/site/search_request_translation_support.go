package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-search/adapters/media"
)

type searchRequestTranslationSeed struct {
	locale         string
	query          string
	indexes        []string
	facets         []string
	filters        map[string][]string
	actor          map[string]any
	request        map[string]any
	acceptLanguage string
	variant        admin.SearchVariant
}

func (r *searchRuntime) buildSearchRequestTranslationSeed(
	c router.Context,
	state RequestState,
) searchRequestTranslationSeed {
	variantParameter := r.searchVariantParameter()
	return searchRequestTranslationSeed{
		locale:         strings.TrimSpace(firstNonEmpty(c.Query("locale"), state.Locale)),
		query:          strings.TrimSpace(firstNonEmpty(c.Query("q"), c.Query("query"), c.Query("search"))),
		indexes:        searchIndexValues(c, r.siteCfg.Search.Indexes),
		facets:         searchFacetValues(c),
		filters:        searchBaseFilters(c, variantParameter),
		actor:          searchActorPayload(c),
		request:        searchRequestPayload(c),
		acceptLanguage: searchAcceptLanguage(c),
		variant:        r.resolveSearchVariant(c, variantParameter),
	}
}

func (r *searchRuntime) searchVariantParameter() string {
	if r == nil || r.siteCfg.Search.VariantPolicy == nil {
		return ""
	}
	return strings.TrimSpace(firstNonEmpty(r.siteCfg.Search.VariantPolicy.QueryParameter, "variant"))
}

func (r *searchRuntime) resolveSearchVariant(c router.Context, parameter string) admin.SearchVariant {
	if r == nil || r.siteCfg.Search.VariantPolicy == nil {
		return ""
	}
	value := ""
	if c != nil && parameter != "" {
		value = strings.TrimSpace(c.Query(parameter))
	}
	if value == "" {
		value = strings.TrimSpace(string(r.siteCfg.Search.VariantPolicy.Default))
	}
	return admin.SearchVariant(value)
}

func (r *searchRuntime) injectSearchRequestFilters(
	ctx context.Context,
	c router.Context,
	seed searchRequestTranslationSeed,
	filters map[string][]string,
	ranges []admin.SearchRange,
	isSuggest bool,
) map[string][]string {
	return r.injectModuleFilters(ctx, c, SiteSearchFilterRequest{
		Query:     seed.query,
		Locale:    seed.locale,
		Filters:   cloneSearchFilters(filters),
		Ranges:    cloneSearchRanges(ranges),
		IsSuggest: isSuggest,
	}, filters)
}

func applySearchLandingFilters(filters map[string][]string, landing *searchLandingState) {
	if landing == nil {
		return
	}
	preset, ok := media.TopicLandingPreset(landing.Slug)
	if !ok {
		return
	}
	for field, values := range preset.FacetFilter {
		searchAddFilterValue(filters, field, values...)
	}
}
