package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type searchPageViewProjection struct {
	query        string
	hits         []map[string]any
	facets       []map[string]any
	filterChips  []map[string]any
	pagination   map[string]any
	sortOptions  []map[string]any
	filters      map[string][]string
	ranges       []admin.SearchRange
	rangeValues  map[string]map[string]any
	sort         string
	page         int
	perPage      int
	total        int
	indexes      []string
	collections  []string
	facetsActive []string
	clearURL     string
	landing      map[string]any
	state        map[string]any
	errorPayload map[string]any
}

func buildSearchPageViewProjection(
	req admin.SearchRequest,
	envelope searchResultEnvelope,
	facets []string,
	indexes []string,
	landing *searchLandingState,
	activeRoute string,
	queryValues map[string][]string,
	errorPayload map[string]any,
) searchPageViewProjection {
	return searchPageViewProjection{
		query:        strings.TrimSpace(req.Query),
		hits:         envelope.Hits,
		facets:       envelope.Facets,
		filterChips:  envelope.FilterChips,
		pagination:   envelope.Pagination,
		sortOptions:  searchSortOptions(req.Sort),
		filters:      cloneSearchFilters(req.Filters),
		ranges:       cloneSearchRanges(req.Ranges),
		rangeValues:  searchRangeValues(req.Ranges),
		sort:         strings.TrimSpace(req.Sort),
		page:         envelope.Page,
		perPage:      envelope.PerPage,
		total:        envelope.Total,
		indexes:      cloneStrings(indexes),
		collections:  cloneStrings(indexes),
		facetsActive: cloneStrings(facets),
		clearURL:     searchClearURL(activeRoute, queryValues),
		landing:      landingMetadata(landing),
		state:        searchPageState(envelope, len(errorPayload) > 0),
		errorPayload: errorPayload,
	}
}

func (p searchPageViewProjection) apply(view router.ViewContext) {
	if view == nil {
		return
	}
	view["search_query"] = p.query
	view["search_results"] = p.hits
	view["search_facets"] = p.facets
	view["search_filter_chips"] = p.filterChips
	view["search_pagination"] = p.pagination
	view["search_sort_options"] = p.sortOptions
	view["search_filters"] = cloneSearchFilters(p.filters)
	view["search_ranges"] = cloneSearchRanges(p.ranges)
	view["search_range_values"] = p.rangeValues
	view["search_indexes"] = cloneStrings(p.indexes)
	view["search_collections"] = cloneStrings(p.collections)
	view["search_clear_url"] = p.clearURL
	view["search_landing"] = p.landing
	view["search_state"] = p.state
	view["search_error"] = p.errorPayload
	view["search"] = p.nestedSearch()
}

func (p searchPageViewProjection) nestedSearch() map[string]any {
	return map[string]any{
		"query":         p.query,
		"results":       p.hits,
		"facets":        p.facets,
		"filter_chips":  p.filterChips,
		"filters":       cloneSearchFilters(p.filters),
		"ranges":        cloneSearchRanges(p.ranges),
		"range_values":  p.rangeValues,
		"pagination":    p.pagination,
		"sort_options":  p.sortOptions,
		"sort":          p.sort,
		"page":          p.page,
		"per_page":      p.perPage,
		"total":         p.total,
		"indexes":       cloneStrings(p.indexes),
		"collections":   cloneStrings(p.collections),
		"facets_active": cloneStrings(p.facetsActive),
		"error":         p.errorPayload,
		"clear_url":     p.clearURL,
		"landing":       p.landing,
		"state":         p.state,
	}
}
