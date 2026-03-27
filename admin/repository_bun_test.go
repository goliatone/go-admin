package admin

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"testing"
	"time"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

type bunTestProduct struct {
	bun.BaseModel `bun:"table:bun_products,alias:p"`

	ID        uuid.UUID `bun:"id,pk,notnull" json:"id"`
	Name      string    `bun:"name,notnull" json:"name"`
	Status    string    `bun:"status,notnull" json:"status"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
}

func newTestProductRepo(db *bun.DB) repository.Repository[*bunTestProduct] {
	handlers := repository.ModelHandlers[*bunTestProduct]{
		NewRecord: func() *bunTestProduct { return &bunTestProduct{} },
		GetID: func(product *bunTestProduct) uuid.UUID {
			return product.ID
		},
		SetID: func(product *bunTestProduct, id uuid.UUID) {
			product.ID = id
		},
		GetIdentifier: func() string { return "name" },
		GetIdentifierValue: func(product *bunTestProduct) string {
			return product.Name
		},
	}
	return repository.MustNewRepository[*bunTestProduct](db, handlers)
}

func setupTestBunDB(t *testing.T) *bun.DB {
	t.Helper()
	sqldb, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqldb.SetMaxOpenConns(1)
	sqldb.SetMaxIdleConns(1)

	db := bun.NewDB(sqldb, sqlitedialect.New())
	if _, err := db.NewCreateTable().IfNotExists().Model((*bunTestProduct)(nil)).Exec(context.Background()); err != nil {
		t.Fatalf("create table: %v", err)
	}
	return db
}

func TestBunRepositoryAdapterCRUD(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](repo, WithBunSearchColumns[*bunTestProduct]("name"))

	created, err := adapter.Create(ctx, map[string]any{"name": "Widget", "status": "draft"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	id := fmt.Sprint(created["id"])
	if id == "" {
		t.Fatalf("expected created id")
	}

	list, total, err := adapter.List(ctx, ListOptions{Search: "wid", PerPage: 5})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("unexpected list result: total=%d len=%d", total, len(list))
	}

	updated, err := adapter.Update(ctx, id, map[string]any{"status": "published"})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated["status"] != "published" {
		t.Fatalf("expected status published, got %+v", updated)
	}

	fetched, err := adapter.Get(ctx, id)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if fetched["name"] != "Widget" {
		t.Fatalf("unexpected fetched record: %+v", fetched)
	}

	if err := adapter.Delete(ctx, id); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := adapter.Get(ctx, id); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}

func TestBunRepositoryAdapterUpdatePatchAllowlist(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](
		repo,
		WithBunPatchAllowedFields[*bunTestProduct]("status"),
	)

	created, err := adapter.Create(ctx, map[string]any{"name": "Widget", "status": "draft"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	id := fmt.Sprint(created["id"])

	if _, err := adapter.Update(ctx, id, map[string]any{"status": "published"}); err != nil {
		t.Fatalf("update status: %v", err)
	}

	_, err = adapter.Update(ctx, id, map[string]any{"name": "Renamed"})
	if err == nil {
		t.Fatalf("expected allowlist error")
	}
	if !errors.Is(err, repository.ErrPatchFieldNotAllowed) {
		t.Fatalf("expected ErrPatchFieldNotAllowed, got %v", err)
	}
}

func TestBunRepositoryAdapterUpdateNotFoundMapsError(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](repo)

	_, err := adapter.Update(ctx, uuid.NewString(), map[string]any{"status": "published"})
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestBunRepositoryAdapterListUsesLegacySearchFilterWhenSearchEmpty(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](repo, WithBunSearchColumns[*bunTestProduct]("name"))

	if _, err := adapter.Create(ctx, map[string]any{"name": "Alpha", "status": "draft"}); err != nil {
		t.Fatalf("create alpha: %v", err)
	}
	if _, err := adapter.Create(ctx, map[string]any{"name": "Beta", "status": "published"}); err != nil {
		t.Fatalf("create beta: %v", err)
	}

	results, total, err := adapter.List(ctx, ListOptions{
		PerPage: 10,
		Filters: map[string]any{"_search": "bet"},
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(results) != 1 {
		t.Fatalf("unexpected search results: total=%d len=%d results=%+v", total, len(results), results)
	}
	if got := fmt.Sprint(results[0]["name"]); got != "Beta" {
		t.Fatalf("expected Beta, got %q", got)
	}
}

func TestBunRepositoryAdapterListHonorsExplicitPredicates(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](repo)

	if _, err := adapter.Create(ctx, map[string]any{"name": "Alpha", "status": "draft"}); err != nil {
		t.Fatalf("create alpha: %v", err)
	}
	if _, err := adapter.Create(ctx, map[string]any{"name": "Beta", "status": "published"}); err != nil {
		t.Fatalf("create beta: %v", err)
	}

	results, total, err := adapter.List(ctx, ListOptions{
		PerPage: 10,
		Predicates: []ListPredicate{
			{Field: "status", Operator: "eq", Values: []string{"published"}},
		},
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(results) != 1 {
		t.Fatalf("unexpected predicate results: total=%d len=%d results=%+v", total, len(results), results)
	}
	if got := fmt.Sprint(results[0]["status"]); got != "published" {
		t.Fatalf("expected published result, got %q", got)
	}
}

func TestBunRepositoryAdapterListSupportsInPredicate(t *testing.T) {
	ctx := context.Background()
	db := setupTestBunDB(t)
	defer db.Close()

	repo := newTestProductRepo(db)
	adapter := NewBunRepositoryAdapter[*bunTestProduct](repo)

	if _, err := adapter.Create(ctx, map[string]any{"name": "Alpha", "status": "draft"}); err != nil {
		t.Fatalf("create alpha: %v", err)
	}
	if _, err := adapter.Create(ctx, map[string]any{"name": "Beta", "status": "published"}); err != nil {
		t.Fatalf("create beta: %v", err)
	}
	if _, err := adapter.Create(ctx, map[string]any{"name": "Gamma", "status": "archived"}); err != nil {
		t.Fatalf("create gamma: %v", err)
	}

	results, total, err := adapter.List(ctx, ListOptions{
		PerPage: 10,
		Predicates: []ListPredicate{
			{Field: "status", Operator: "in", Values: []string{"draft", "published"}},
		},
	})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 2 || len(results) != 2 {
		t.Fatalf("unexpected in-predicate results: total=%d len=%d results=%+v", total, len(results), results)
	}
}
