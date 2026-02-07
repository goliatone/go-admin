package listquery

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestParseContextPreservesOperatorQualifiedFilters(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["page"] = "2"
	ctx.QueriesM["per_page"] = "25"
	ctx.QueriesM["search"] = "home"
	ctx.QueriesM["status"] = "published"
	ctx.QueriesM["status__in"] = "draft,published"
	ctx.QueriesM["title__ilike"] = "landing"
	ctx.QueriesM["filter_category__in"] = "news,updates"
	ctx.QueriesM["env"] = "staging"

	result := ParseContext(ctx, 1, 10)
	if result.Page != 2 {
		t.Fatalf("expected page 2, got %d", result.Page)
	}
	if result.PerPage != 25 {
		t.Fatalf("expected per page 25, got %d", result.PerPage)
	}
	if result.Search != "home" {
		t.Fatalf("expected search home, got %q", result.Search)
	}
	if got := toString(result.Filters["status"]); got != "published" {
		t.Fatalf("expected status filter, got %q", got)
	}
	if got := toString(result.Filters["status__in"]); got != "draft,published" {
		t.Fatalf("expected status__in filter, got %q", got)
	}
	if got := toString(result.Filters["title__ilike"]); got != "landing" {
		t.Fatalf("expected title__ilike filter, got %q", got)
	}
	if got := toString(result.Filters["category__in"]); got != "news,updates" {
		t.Fatalf("expected category__in filter, got %q", got)
	}
	if got := toString(result.Filters["environment"]); got != "staging" {
		t.Fatalf("expected environment staging, got %q", got)
	}
}

func TestParseContextBuildsPredicates(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["status"] = "published"
	ctx.QueriesM["title__ilike"] = "home,landing"

	result := ParseContext(ctx, 1, 10)
	if len(result.Predicates) != 2 {
		t.Fatalf("expected 2 predicates, got %d", len(result.Predicates))
	}

	byKey := map[string]Predicate{}
	for _, predicate := range result.Predicates {
		byKey[predicate.Field+"__"+predicate.Operator] = predicate
	}

	if got, ok := byKey["status__eq"]; !ok || len(got.Values) != 1 || got.Values[0] != "published" {
		t.Fatalf("expected status eq predicate, got %+v", got)
	}
	if got, ok := byKey["title__ilike"]; !ok || len(got.Values) != 2 || got.Values[0] != "home" || got.Values[1] != "landing" {
		t.Fatalf("expected title ilike predicate, got %+v", got)
	}
}
