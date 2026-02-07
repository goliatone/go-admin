package boot

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestParseListOptionsPreservesOperatorQualifiedFilterKeys(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["search"] = "home"
	ctx.QueriesM["status"] = "published"
	ctx.QueriesM["status__in"] = "draft,published"
	ctx.QueriesM["title__ilike"] = "landing"
	ctx.QueriesM["author__eq"] = "alice"
	ctx.QueriesM["filter_category__in"] = "news,updates"
	ctx.QueriesM["env"] = "staging"

	opts := parseListOptions(ctx)

	if opts.Search != "home" {
		t.Fatalf("expected search to remain independent, got %q", opts.Search)
	}
	if got := toString(opts.Filters["status"]); got != "published" {
		t.Fatalf("expected status filter, got %q", got)
	}
	if got := toString(opts.Filters["status__in"]); got != "draft,published" {
		t.Fatalf("expected status__in filter key preserved, got %q", got)
	}
	if got := toString(opts.Filters["title__ilike"]); got != "landing" {
		t.Fatalf("expected title__ilike filter key preserved, got %q", got)
	}
	if got := toString(opts.Filters["author__eq"]); got != "alice" {
		t.Fatalf("expected author__eq filter key preserved, got %q", got)
	}
	if got := toString(opts.Filters["category__in"]); got != "news,updates" {
		t.Fatalf("expected filter_ prefix to preserve operator key, got %q", got)
	}
	if got := toString(opts.Filters["environment"]); got != "staging" {
		t.Fatalf("expected environment fallback filter, got %q", got)
	}
	if len(opts.Predicates) == 0 {
		t.Fatalf("expected parsed predicates, got none")
	}
	byField := map[string]ListPredicate{}
	for _, predicate := range opts.Predicates {
		byField[predicate.Field+"__"+predicate.Operator] = predicate
	}
	if got, ok := byField["status__eq"]; !ok || len(got.Values) != 1 || got.Values[0] != "published" {
		t.Fatalf("expected status eq predicate, got %+v", got)
	}
	if got, ok := byField["status__in"]; !ok || len(got.Values) != 2 || got.Values[0] != "draft" || got.Values[1] != "published" {
		t.Fatalf("expected status in predicate, got %+v", got)
	}
	if got, ok := byField["title__ilike"]; !ok || len(got.Values) != 1 || got.Values[0] != "landing" {
		t.Fatalf("expected title ilike predicate, got %+v", got)
	}
}

func TestParseListOptionsDoesNotConvertFieldILikeIntoSearch(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["title__ilike"] = "home"

	opts := parseListOptions(ctx)

	if opts.Search != "" {
		t.Fatalf("expected empty global search, got %q", opts.Search)
	}
	if got := toString(opts.Filters["title__ilike"]); got != "home" {
		t.Fatalf("expected title__ilike filter to be preserved, got %q", got)
	}
}
