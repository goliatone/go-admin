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
