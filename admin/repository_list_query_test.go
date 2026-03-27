package admin

import "testing"

func TestNormalizeRepositoryListQueryAppliesDefaultsAndSearchFallback(t *testing.T) {
	query := normalizeRepositoryListQuery(ListOptions{
		Filters: map[string]any{
			"_search": "  widget  ",
			"status":  "draft",
		},
	})

	if query.Page != 1 {
		t.Fatalf("expected default page 1, got %d", query.Page)
	}
	if query.PerPage != defaultRepositoryAdapterPerPage {
		t.Fatalf("expected default per-page %d, got %d", defaultRepositoryAdapterPerPage, query.PerPage)
	}
	if query.Search != "widget" {
		t.Fatalf("expected search fallback from filters, got %q", query.Search)
	}
	if len(query.FilterPredicates()) != 1 {
		t.Fatalf("expected one non-search predicate, got %d", len(query.FilterPredicates()))
	}
	if got := query.FilterPredicates()[0].Field; got != "status" {
		t.Fatalf("expected status predicate, got %q", got)
	}
}

func TestNormalizeRepositoryListQueryPreservesExplicitPredicates(t *testing.T) {
	query := normalizeRepositoryListQuery(ListOptions{
		Page:    2,
		PerPage: 5,
		SortBy:  "name",
		Predicates: []ListPredicate{
			{Field: "_search", Operator: "eq", Values: []string{"beta"}},
			{Field: "status", Operator: "in", Values: []string{"draft", "published"}},
		},
	})

	if query.Page != 2 || query.PerPage != 5 {
		t.Fatalf("unexpected pagination: %+v", query)
	}
	if query.Search != "beta" {
		t.Fatalf("expected search from explicit predicate, got %q", query.Search)
	}
	if len(query.FilterPredicates()) != 1 {
		t.Fatalf("expected one filter predicate, got %d", len(query.FilterPredicates()))
	}
	if got := query.FilterPredicates()[0].Operator; got != "in" {
		t.Fatalf("expected preserved operator 'in', got %q", got)
	}
}
