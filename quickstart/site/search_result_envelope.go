package site

import (
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type searchResultEnvelope struct {
	Hits          []map[string]any `json:"hits"`
	Facets        []map[string]any `json:"facets"`
	FilterChips   []map[string]any `json:"filter_chips"`
	Pagination    map[string]any   `json:"pagination"`
	Page          int              `json:"page"`
	PerPage       int              `json:"per_page"`
	Total         int              `json:"total"`
	HasQuery      bool             `json:"has_query"`
	HasSearch     bool             `json:"has_search"`
	HasResults    bool             `json:"has_results"`
	ZeroResults   bool             `json:"zero_results"`
	TotalAccuracy string           `json:"total_accuracy,omitempty"`
	Counts        []map[string]any `json:"counts,omitempty"`
}

func buildSearchResultEnvelope(
	result admin.SearchResultPage,
	req admin.SearchRequest,
	activeRoute string,
	queryValues map[string][]string,
	executed bool,
	hasError bool,
) searchResultEnvelope {
	normalized := normalizeSearchResults(result, req.Filters, activeRoute, queryValues)
	hasQuery := strings.TrimSpace(req.Query) != ""
	hasResults := len(normalized.Hits) > 0
	return searchResultEnvelope{
		Hits:          normalized.Hits,
		Facets:        normalized.Facets,
		FilterChips:   normalized.FilterChips,
		Pagination:    normalized.Pagination,
		Page:          searchPositiveOrFallback(result.Page, req.Page),
		PerPage:       searchPositiveOrFallback(result.PerPage, req.PerPage),
		Total:         result.Total,
		HasQuery:      hasQuery,
		HasSearch:     executed,
		HasResults:    hasResults,
		ZeroResults:   executed && !hasResults && !hasError,
		TotalAccuracy: normalized.TotalAccuracy,
		Counts:        normalized.Counts,
	}
}

func searchPageState(envelope searchResultEnvelope, hasError bool) map[string]any {
	return map[string]any{
		"has_query":    envelope.HasQuery,
		"has_search":   envelope.HasSearch,
		"has_results":  envelope.HasResults,
		"zero_results": envelope.ZeroResults,
		"has_error":    hasError,
	}
}

func searchAPIData(envelope searchResultEnvelope) map[string]any {
	return map[string]any{
		"hits":           envelope.Hits,
		"facets":         envelope.Facets,
		"has_query":      envelope.HasQuery,
		"has_search":     envelope.HasSearch,
		"has_results":    envelope.HasResults,
		"zero_results":   envelope.ZeroResults,
		"page":           envelope.Page,
		"per_page":       envelope.PerPage,
		"total":          envelope.Total,
		"pagination":     envelope.Pagination,
		"total_accuracy": envelope.TotalAccuracy,
		"counts":         envelope.Counts,
	}
}
