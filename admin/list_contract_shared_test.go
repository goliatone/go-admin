package admin

import (
	"context"
	"fmt"
	"testing"

	admincontract "github.com/goliatone/go-admin/quickstart/admin"
)

func TestPanelRepositoryListPaginationContracts(t *testing.T) {
	// Register every Repository implementation here so list total/pagination
	// semantics are enforced consistently by one shared contract suite.
	t.Run("memory repository", func(t *testing.T) {
		repo := NewMemoryRepository()
		seedRepositoryRecords(t, repo, []map[string]any{
			{"name": "Alpha", "status": "published"},
			{"name": "Bravo", "status": "published"},
			{"name": "Charlie", "status": "draft"},
			{"name": "Delta", "status": "published"},
			{"name": "Echo", "status": "draft"},
			{"name": "Foxtrot", "status": "published"},
		})

		admincontract.AssertPaginationContract(t, listContractFromRepository(repo), admincontract.PaginationContractConfig{
			TotalExpected: 4,
			PerPage:       2,
			SortBy:        "name",
			Filters:       map[string]any{"status": "published"},
			UniqueKey:     "id",
		})
	})

	t.Run("crud adapter", func(t *testing.T) {
		service := newStubCRUDService()
		service.records = []map[string]any{
			{"id": "1", "name": "Alpha", "status": "published"},
			{"id": "2", "name": "Bravo", "status": "published"},
			{"id": "3", "name": "Charlie", "status": "draft"},
			{"id": "4", "name": "Delta", "status": "published"},
			{"id": "5", "name": "Echo", "status": "draft"},
			{"id": "6", "name": "Foxtrot", "status": "published"},
		}
		adapter := NewCRUDRepositoryAdapter(service)

		admincontract.AssertPaginationContract(t, listContractFromRepository(adapter), admincontract.PaginationContractConfig{
			TotalExpected: 4,
			PerPage:       2,
			SortBy:        "name",
			Filters:       map[string]any{"status": "published"},
			UniqueKey:     "id",
		})
	})

	t.Run("bun adapter", func(t *testing.T) {
		db := setupTestBunDB(t)
		t.Cleanup(func() { _ = db.Close() })

		repo := newTestProductRepo(db)
		adapter := NewBunRepositoryAdapter[*bunTestProduct](repo, WithBunSearchColumns[*bunTestProduct]("name"))
		seedRepositoryRecords(t, adapter, []map[string]any{
			{"name": "Alpha", "status": "published"},
			{"name": "Bravo", "status": "published"},
			{"name": "Charlie", "status": "draft"},
			{"name": "Delta", "status": "published"},
			{"name": "Echo", "status": "draft"},
			{"name": "Foxtrot", "status": "published"},
		})

		admincontract.AssertPaginationContract(t, listContractFromRepository(adapter), admincontract.PaginationContractConfig{
			TotalExpected: 4,
			PerPage:       2,
			SortBy:        "name",
			Filters:       map[string]any{"status": "published"},
			UniqueKey:     "id",
		})
	})

	t.Run("cms page repository", func(t *testing.T) {
		content := NewInMemoryContentService()
		repo := NewCMSPageRepository(content)

		_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Alpha", Slug: "/alpha", Locale: "en"})
		_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Bravo", Slug: "/bravo", Locale: "en"})
		_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Charlie", Slug: "/charlie", Locale: "en"})
		_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Delta", Slug: "/delta", Locale: "en"})
		_, _ = content.CreatePage(context.Background(), CMSPage{Title: "Inicio", Slug: "/inicio", Locale: "es"})

		admincontract.AssertPaginationContract(t, listContractFromRepository(repo), admincontract.PaginationContractConfig{
			TotalExpected: 4,
			PerPage:       2,
			SortBy:        "title",
			Filters:       map[string]any{"locale": "en"},
			UniqueKey:     "id",
		})
	})
}

func seedRepositoryRecords(t *testing.T, repo Repository, records []map[string]any) {
	t.Helper()
	for idx, record := range records {
		if _, err := repo.Create(context.Background(), record); err != nil {
			t.Fatalf("seed create failed at index %d: %v", idx, err)
		}
	}
}

func listContractFromRepository(repo Repository) admincontract.ListFunc {
	return func(ctx context.Context, opts admincontract.ListOptions) ([]map[string]any, int, error) {
		return repo.List(ctx, toAdminListOptions(opts))
	}
}

func toAdminListOptions(opts admincontract.ListOptions) ListOptions {
	converted := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Filters:  map[string]any{},
		Search:   opts.Search,
	}
	if len(opts.Filters) > 0 {
		for key, value := range opts.Filters {
			converted.Filters[key] = value
		}
	}
	if len(opts.Predicates) > 0 {
		converted.Predicates = make([]ListPredicate, 0, len(opts.Predicates))
		for _, predicate := range opts.Predicates {
			converted.Predicates = append(converted.Predicates, ListPredicate{
				Field:    predicate.Field,
				Operator: predicate.Operator,
				Values:   append([]string{}, predicate.Values...),
			})
		}
	}
	if len(converted.Filters) == 0 {
		converted.Filters = nil
	}
	return converted
}

func TestPanelRepositoryListPaginationContractSupportsSearch(t *testing.T) {
	repo := NewMemoryRepository()
	seedRepositoryRecords(t, repo, []map[string]any{
		{"name": "Alpha Site", "status": "published"},
		{"name": "Alpha Docs", "status": "published"},
		{"name": "Beta Site", "status": "published"},
		{"name": "Gamma Site", "status": "published"},
	})

	admincontract.AssertPaginationContract(t, listContractFromRepository(repo), admincontract.PaginationContractConfig{
		TotalExpected: 2,
		PerPage:       1,
		SortBy:        "name",
		Search:        "alpha",
		UniqueKey:     "id",
	})
}

func TestPanelRepositoryListPaginationContractSupportsPredicates(t *testing.T) {
	repo := NewMemoryRepository()
	seedRepositoryRecords(t, repo, []map[string]any{
		{"name": "Alpha", "status": "published"},
		{"name": "Bravo", "status": "draft"},
		{"name": "Charlie", "status": "published"},
		{"name": "Delta", "status": "published"},
	})

	admincontract.AssertPaginationContract(t, listContractFromRepository(repo), admincontract.PaginationContractConfig{
		TotalExpected: 3,
		PerPage:       2,
		SortBy:        "name",
		Predicates: []admincontract.ListPredicate{
			{Field: "status", Operator: "eq", Values: []string{"published"}},
		},
		UniqueKey: "id",
	})
}

func TestPanelRepositoryListPaginationContractHarnessConvertsPredicateValues(t *testing.T) {
	opts := toAdminListOptions(admincontract.ListOptions{
		Page:    2,
		PerPage: 25,
		Predicates: []admincontract.ListPredicate{
			{Field: "status", Operator: "in", Values: []string{"draft", "published"}},
		},
		Filters: map[string]any{"locale": "en"},
	})

	if opts.Page != 2 || opts.PerPage != 25 {
		t.Fatalf("expected page/perPage conversion, got page=%d perPage=%d", opts.Page, opts.PerPage)
	}
	if len(opts.Predicates) != 1 {
		t.Fatalf("expected one predicate, got %d", len(opts.Predicates))
	}
	if got := fmt.Sprintf("%s:%s:%v", opts.Predicates[0].Field, opts.Predicates[0].Operator, opts.Predicates[0].Values); got != "status:in:[draft published]" {
		t.Fatalf("unexpected predicate conversion: %s", got)
	}
	if opts.Filters["locale"] != "en" {
		t.Fatalf("expected locale filter preserved, got %+v", opts.Filters)
	}
}
