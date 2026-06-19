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
	ctx.QueriesM["filter.locale"] = "en"
	ctx.QueriesM["fields"] = "id,title,status"
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
	if got := toString(result.Filters["locale"]); got != "en" {
		t.Fatalf("expected locale filter from filter.locale syntax, got %q", got)
	}
	if got := toString(result.Filters["environment"]); got != "staging" {
		t.Fatalf("expected environment staging, got %q", got)
	}
	if len(result.Fields) != 3 || result.Fields[0] != "id" || result.Fields[1] != "title" || result.Fields[2] != "status" {
		t.Fatalf("expected parsed fields [id title status], got %+v", result.Fields)
	}
}

func TestParseContextBuildsPredicates(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["q"] = "home"
	ctx.QueriesM["status"] = "published"
	ctx.QueriesM["title__ilike"] = "home,landing"

	result := ParseContext(ctx, 1, 10)
	if len(result.Predicates) != 2 {
		t.Fatalf("expected 2 predicates, got %d", len(result.Predicates))
	}
	if result.Search != "home" {
		t.Fatalf("expected q fallback to search=home, got %q", result.Search)
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

func TestParseContextUsesSnakeCaseSortBy(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["sort_by"] = "updated_at"
	ctx.QueriesM["sort_desc"] = "true"

	result := ParseContext(ctx, 1, 10)

	if result.SortBy != "updated_at" {
		t.Fatalf("expected sort_by fallback, got %q", result.SortBy)
	}
	if !result.SortDesc {
		t.Fatalf("expected sort_desc=true")
	}
	if _, ok := result.Filters["sort_by"]; ok {
		t.Fatalf("expected sort_by to be reserved, got filters=%+v", result.Filters)
	}
}

func TestParseContextTreatsDollarScopeKeysAsReserved(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["$channel"] = "staging"
	ctx.QueriesM["channel"] = "editorial"
	ctx.QueriesM["content_channel"] = "preview"
	ctx.QueriesM["site_content_channel"] = "qa"
	ctx.QueriesM["status"] = "published"

	result := ParseContext(ctx, 1, 10)

	if got := toString(result.Filters["status"]); got != "published" {
		t.Fatalf("expected status filter to remain, got %q", got)
	}
	if _, ok := result.Filters["$channel"]; ok {
		t.Fatalf("expected $channel to be reserved list scope, got filters=%+v", result.Filters)
	}
	if got := toString(result.Filters["channel"]); got != "editorial" {
		t.Fatalf("expected plain channel to remain available for record filtering, got %q", got)
	}
	if _, ok := result.Filters["content_channel"]; ok {
		t.Fatalf("expected content_channel to be reserved list scope, got filters=%+v", result.Filters)
	}
	if _, ok := result.Filters["site_content_channel"]; ok {
		t.Fatalf("expected site_content_channel to be reserved list scope, got filters=%+v", result.Filters)
	}
}

func TestParseContextReservesSnakeCaseDataGridStateKeys(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["per_page"] = "50"
	ctx.QueriesM["view_mode"] = "grouped"
	ctx.QueriesM["advanced_search"] = `[{"field":"title"}]`
	ctx.QueriesM["hidden_columns"] = `["summary"]`
	ctx.QueriesM["expanded_groups"] = "abc123"
	ctx.QueriesM["state"] = "share-token"
	ctx.QueriesM["status"] = "draft"

	result := ParseContext(ctx, 1, 10)

	if result.PerPage != 50 {
		t.Fatalf("expected per_page to set per page 50, got %d", result.PerPage)
	}
	if got := toString(result.Filters["status"]); got != "draft" {
		t.Fatalf("expected status filter to remain, got %q", got)
	}
	for _, key := range []string{"per_page", "view_mode", "advanced_search", "hidden_columns", "expanded_groups", "state"} {
		if _, ok := result.Filters[key]; ok {
			t.Fatalf("expected %s to be reserved DataGrid state, got filters=%+v", key, result.Filters)
		}
	}
}

func TestParseContextDoesNotTreatCamelCasePerPageAsPagination(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["perPage"] = "50"

	result := ParseContext(ctx, 1, 10)

	if result.PerPage != 10 {
		t.Fatalf("expected camel-case perPage not to set pagination, got per_page=%d", result.PerPage)
	}
}
