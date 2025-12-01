package admin

import (
	"context"
	"testing"
)

func TestSearchEngineRespectsPermission(t *testing.T) {
	engine := NewSearchEngine(denyAll{})
	engine.Register("dummy", &repoSearchAdapter{
		repo:       NewMemoryRepository(),
		resource:   "dummy",
		permission: "search.dummy",
	})

	ctx := AdminContext{Context: context.Background()}
	results, err := engine.Query(ctx, "x", 5)
	if err != nil {
		t.Fatalf("query error: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected zero results due to permission, got %d", len(results))
	}
}

type stubSearchAdapter struct {
	name       string
	permission string
	results    []SearchResult
}

func (s *stubSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	_ = ctx
	out := []SearchResult{}
	for _, r := range s.results {
		if len(out) >= limit {
			break
		}
		if query == "" || query == r.Title || query == r.Description {
			out = append(out, r)
		}
	}
	return out, nil
}

func (s *stubSearchAdapter) Permission() string {
	return s.permission
}

func TestSearchAggregatesAdapters(t *testing.T) {
	engine := NewSearchEngine(allowAll{})
	engine.Register("users", &stubSearchAdapter{
		results: []SearchResult{{ID: "1", Title: "Alice", Description: "admin"}},
	})
	engine.Register("orders", &stubSearchAdapter{
		results: []SearchResult{{ID: "2", Title: "Order #2"}},
	})

	ctx := AdminContext{Context: context.Background()}
	results, err := engine.Query(ctx, "Order #2", 10)
	if err != nil {
		t.Fatalf("query error: %v", err)
	}
	if len(results) != 1 || results[0].Type != "orders" || results[0].ID != "2" {
		t.Fatalf("unexpected results: %+v", results)
	}
}
