package admin

import (
	"context"
	"fmt"
	"testing"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

// Exercise the adapter through real SQLite queries, including compatibility
// behavior that differs from the query planner's current defaults.
func TestBunRepositoryAdapterQueryCompatibility(t *testing.T) {
	db := setupTestBunDB(t)
	defer mustClose(t, "db", db)
	runBunRepositoryQueryCompatibility(t, db)
}

func runBunRepositoryQueryCompatibility(t *testing.T, db *bun.DB) {
	t.Helper()
	ctx := context.Background()
	adapter := NewBunRepositoryAdapter(newTestProductRepo(db), WithBunSearchColumns[*bunTestProduct]("name"))
	for i := 1; i <= 12; i++ {
		status := "draft"
		if i > 6 {
			status = "published"
		}
		if _, err := adapter.Create(ctx, map[string]any{"name": fmt.Sprintf("Resource %02d", i), "status": status}); err != nil {
			t.Fatal(err)
		}
	}
	// q remains an ordinary field; CRUD's newer q search alias must not absorb it.
	if _, err := db.Exec("ALTER TABLE bun_products ADD COLUMN q TEXT"); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("UPDATE bun_products SET q = status"); err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		name  string
		opts  ListOptions
		total int
		names []string
	}{
		{"default limit", ListOptions{}, 12, resourceNames(1, 10)},
		{"negative limit", ListOptions{PerPage: -1}, 12, resourceNames(1, 10)},
		{"second page", ListOptions{Page: 2}, 12, resourceNames(11, 12)},
		{"explicit limit", ListOptions{PerPage: 2}, 12, resourceNames(1, 2)},
		{"descending", ListOptions{PerPage: 2, SortDesc: true}, 12, []string{"Resource 12", "Resource 11"}},
		{"case insensitive search", ListOptions{Search: "RESOURCE 01"}, 1, []string{"Resource 01"}},
		{"legacy search", ListOptions{Filters: map[string]any{"_search": "Resource 02"}}, 1, []string{"Resource 02"}},
		{"explicit search wins", ListOptions{Search: "Resource 03", Filters: map[string]any{"_search": "Resource 02"}}, 1, []string{"Resource 03"}},
		{"search wildcards", ListOptions{Search: "Resource 0_"}, 9, resourceNames(1, 9)},
		{"equality", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "eq", Values: []string{"draft"}}}}, 6, resourceNames(1, 6)},
		{"not equal", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "ne", Values: []string{"draft"}}}}, 6, resourceNames(7, 12)},
		{"not equal alias", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "neq", Values: []string{"draft"}}}}, 6, resourceNames(7, 12)},
		{"greater", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "gt", Values: []string{"Resource 10"}}}}, 2, resourceNames(11, 12)},
		{"greater equal", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "gte", Values: []string{"Resource 10"}}}}, 3, resourceNames(10, 12)},
		{"less", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "lt", Values: []string{"Resource 03"}}}}, 2, resourceNames(1, 2)},
		{"less equal", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "lte", Values: []string{"Resource 03"}}}}, 3, resourceNames(1, 3)},
		{"in", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "in", Values: []string{"Resource 01", "Resource 12"}}}}, 2, []string{"Resource 01", "Resource 12"}},
		{"not in", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "nin", Values: []string{"Resource 01", "Resource 12"}}}}, 10, resourceNames(2, 11)},
		{"like contains", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "like", Values: []string{"01", "12"}}}}, 2, []string{"Resource 01", "Resource 12"}},
		{"ilike contains", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "ilike", Values: []string{"resource 01"}}}}, 1, []string{"Resource 01"}},
		{"contains insensitive", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "contains", Values: []string{"RESOURCE 01"}}}}, 1, []string{"Resource 01"}},
		{"or", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "or", Values: []string{"Resource 01", "Resource 12"}}}}, 2, []string{"Resource 01", "Resource 12"}},
		{"and", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "and", Values: []string{"draft", "published"}}}}, 0, nil},
		{"unknown remains equality", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "unsupported", Values: []string{"draft"}}}}, 6, resourceNames(1, 6)},
		{"unknown does not broaden", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "unsupported", Values: []string{"missing"}}}}, 0, nil},
		{"new alias retains fallback", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "not_in", Values: []string{"draft"}}}}, 6, resourceNames(1, 6)},
		{"explicit filters replace legacy", ListOptions{Filters: map[string]any{"status": "published"}, Predicates: []ListPredicate{{Field: "status", Operator: "eq", Values: []string{"draft"}}}}, 6, resourceNames(1, 6)},
		{"q remains a filter", ListOptions{Filters: map[string]any{"q": "draft"}}, 6, resourceNames(1, 6)},
		{"mixed conjunction and disjunction", ListOptions{Predicates: []ListPredicate{
			{Field: "status", Operator: "eq", Values: []string{"draft"}},
			{Field: "name", Operator: "or", Values: []string{"Resource 01", "Resource 12"}},
		}}, 1, []string{"Resource 01"}},
		{"multiple disjunction fields", ListOptions{Predicates: []ListPredicate{
			{Field: "name", Operator: "or", Values: []string{"Resource 01"}},
			{Field: "status", Operator: "or", Values: []string{"published"}},
		}}, 7, append([]string{"Resource 01"}, resourceNames(7, 12)...)},
		{"multi-value equality remains conjunction", ListOptions{Predicates: []ListPredicate{{Field: "status", Operator: "eq", Values: []string{"draft", "published"}}}}, 0, nil},
		{"invalid identifier denies", ListOptions{Predicates: []ListPredicate{{Field: "status OR 1=1", Operator: "eq", Values: []string{"draft"}}}}, 0, nil},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tc.opts.SortBy = "name"
			rows, total, err := adapter.List(ctx, tc.opts)
			if err != nil {
				t.Fatal(err)
			}
			if total != tc.total || len(rows) != len(tc.names) {
				t.Fatalf("total=%d rows=%d; want total=%d rows=%d", total, len(rows), tc.total, len(tc.names))
			}
			for i, name := range tc.names {
				if rows[i]["name"] != name {
					t.Fatalf("row %d=%v; want %s", i, rows[i]["name"], name)
				}
			}
		})
	}
}

func resourceNames(first, last int) []string {
	names := make([]string, 0, last-first+1)
	for i := first; i <= last; i++ {
		names = append(names, fmt.Sprintf("Resource %02d", i))
	}
	return names
}

func TestBunRepositoryAdapterScopeAndCustomFilters(t *testing.T) {
	db := setupTestBunDB(t)
	defer mustClose(t, "db", db)
	repo := newTestProductRepo(db)
	plain := NewBunRepositoryAdapter(repo)
	for _, row := range []map[string]any{{"name": "Resource A", "status": "draft"}, {"name": "Resource B", "status": "published"}} {
		if _, err := plain.Create(context.Background(), row); err != nil {
			t.Fatal(err)
		}
	}
	calls := 0
	scoped := NewBunRepositoryAdapter(repo,
		WithBunBaseCriteria[*bunTestProduct](repository.SelectBy("status", "=", "draft")),
		WithBunFilterMapping[*bunTestProduct](map[string]func(any) repository.SelectCriteria{
			"label": func(value any) repository.SelectCriteria {
				calls++
				return repository.SelectBy("name", "=", fmt.Sprint(value))
			},
		}),
	)
	for _, tc := range []struct {
		name string
		opts ListOptions
	}{
		{"base criteria constrain OR", ListOptions{Predicates: []ListPredicate{{Field: "name", Operator: "or", Values: []string{"Resource A", "Resource B"}}}}},
		{"custom builder remains scoped", ListOptions{Filters: map[string]any{"label": "Resource A"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rows, total, err := scoped.List(context.Background(), tc.opts)
			if err != nil {
				t.Fatal(err)
			}
			if total != 1 || len(rows) != 1 || rows[0]["name"] != "Resource A" {
				t.Fatalf("rows=%v total=%d", rows, total)
			}
		})
	}
	if calls != 1 {
		t.Fatalf("custom builder calls=%d", calls)
	}
}
