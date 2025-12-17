package stores

import (
	"context"
	"testing"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/uptrace/bun"
)

func TestExtractListOptionsFromCriteriaParsesOrderBy(t *testing.T) {
	opts := extractListOptionsFromCriteria(context.Background(), []repository.SelectCriteria{
		func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.OrderExpr(`"role" DESC`)
		},
	})

	if opts.SortBy != "role" {
		t.Fatalf("expected SortBy to be %q, got %q", "role", opts.SortBy)
	}
	if !opts.SortDesc {
		t.Fatalf("expected SortDesc to be true")
	}
}
