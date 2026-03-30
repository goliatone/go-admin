package site

import (
	"reflect"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestBuildSearchPageViewProjectionAppliesTopLevelAndNestedSearchShape(t *testing.T) {
	req := admin.SearchRequest{
		Query:   "welcome",
		Sort:    "published_at:desc",
		Filters: map[string][]string{"content_type": {"page"}},
		Ranges: []admin.SearchRange{
			{Field: "published_year", GTE: 2000, LTE: 2024},
		},
	}
	envelope := searchResultEnvelope{
		Hits: []map[string]any{
			{"id": "doc-1", "title": "Welcome"},
		},
		Facets: []map[string]any{
			{"name": "content_type"},
		},
		FilterChips: []map[string]any{
			{"key": "content_type", "value": "page"},
		},
		Pagination: map[string]any{
			"page": 2,
		},
		Page:        2,
		PerPage:     12,
		Total:       1,
		HasQuery:    true,
		HasResults:  true,
		ZeroResults: false,
	}
	errorPayload := map[string]any{
		"code":    searchUnavailableErrorCode,
		"message": "provider offline",
	}

	projection := buildSearchPageViewProjection(
		req,
		envelope,
		[]string{"content_type"},
		[]string{"content"},
		&searchLandingState{Slug: "architecture", Title: "Architecture", Breadcrumb: "Topics"},
		"/search",
		map[string][]string{
			"q":                  {"welcome"},
			"page":               {"2"},
			"facet_content_type": {"page"},
			"published_year_gte": {"2000"},
		},
		errorPayload,
	)

	view := router.ViewContext{}
	projection.apply(view)
	search := nestedMapFromAny(view["search"])

	if got := anyString(view["search_query"]); got != "welcome" {
		t.Fatalf("expected top-level search_query welcome, got %q", got)
	}
	if got := anyString(search["query"]); got != "welcome" {
		t.Fatalf("expected nested search query welcome, got %q", got)
	}
	if !reflect.DeepEqual(view["search_results"], search["results"]) {
		t.Fatalf("expected top-level and nested results to match, got top=%+v nested=%+v", view["search_results"], search["results"])
	}
	if !reflect.DeepEqual(view["search_facets"], search["facets"]) {
		t.Fatalf("expected top-level and nested facets to match, got top=%+v nested=%+v", view["search_facets"], search["facets"])
	}
	if !reflect.DeepEqual(view["search_filter_chips"], search["filter_chips"]) {
		t.Fatalf("expected top-level and nested filter_chips to match, got top=%+v nested=%+v", view["search_filter_chips"], search["filter_chips"])
	}
	if !reflect.DeepEqual(view["search_pagination"], search["pagination"]) {
		t.Fatalf("expected top-level and nested pagination to match, got top=%+v nested=%+v", view["search_pagination"], search["pagination"])
	}
	if got := anyString(view["search_clear_url"]); got != "/search?q=welcome" {
		t.Fatalf("expected clear url /search?q=welcome, got %q", got)
	}
	if got := anyString(search["clear_url"]); got != "/search?q=welcome" {
		t.Fatalf("expected nested clear url /search?q=welcome, got %q", got)
	}
	if !anyBool(nestedMapFromAny(view["search_state"])["has_error"]) {
		t.Fatalf("expected top-level search_state.has_error true, got %+v", view["search_state"])
	}
	if !anyBool(nestedMapFromAny(search["state"])["has_error"]) {
		t.Fatalf("expected nested search.state.has_error true, got %+v", search["state"])
	}
	if got := anyString(nestedMapFromAny(view["search_landing"])["slug"]); got != "architecture" {
		t.Fatalf("expected landing slug architecture, got %+v", view["search_landing"])
	}
	if got := anyString(nestedMapFromAny(search["landing"])["slug"]); got != "architecture" {
		t.Fatalf("expected nested landing slug architecture, got %+v", search["landing"])
	}

	topFilters, ok := view["search_filters"].(map[string][]string)
	if !ok {
		t.Fatalf("expected top-level search_filters map, got %T", view["search_filters"])
	}
	nestedFilters, ok := search["filters"].(map[string][]string)
	if !ok {
		t.Fatalf("expected nested search.filters map, got %T", search["filters"])
	}
	topFilters["content_type"][0] = "post"
	if nestedFilters["content_type"][0] != "page" {
		t.Fatalf("expected nested filters to remain cloned, got %+v", nestedFilters)
	}

	topRanges, ok := view["search_ranges"].([]admin.SearchRange)
	if !ok {
		t.Fatalf("expected top-level search_ranges slice, got %T", view["search_ranges"])
	}
	nestedRanges, ok := search["ranges"].([]admin.SearchRange)
	if !ok {
		t.Fatalf("expected nested search.ranges slice, got %T", search["ranges"])
	}
	topRanges[0].Field = "duration_seconds"
	if nestedRanges[0].Field != "published_year" {
		t.Fatalf("expected nested ranges to remain cloned, got %+v", nestedRanges)
	}
}
