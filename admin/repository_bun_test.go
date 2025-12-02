package admin

import (
	"context"
	"database/sql"
	"errors"
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
	id, _ := created["id"].(string)
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
