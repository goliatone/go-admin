package stores

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"testing"
)

func newSQLiteStoreBatchTestStore(t *testing.T) (*SQLiteStore, string) {
	t.Helper()
	dsn := fmt.Sprintf(
		"file:%s?cache=shared&_fk=1&_busy_timeout=5000",
		filepath.Join(t.TempDir(), "batch-test.db"),
	)
	store, err := NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("NewSQLiteStore: %v", err)
	}
	return store, dsn
}

func sqliteStoreStateRowCount(t *testing.T, ctx context.Context, store *SQLiteStore) int {
	t.Helper()
	if store == nil || store.db == nil {
		t.Fatal("sqlite store db is nil")
	}
	var count int
	if err := store.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM esign_store_state`).Scan(&count); err != nil {
		t.Fatalf("count esign_store_state rows: %v", err)
	}
	return count
}

func createBatchTestDocument(t *testing.T, ctx context.Context, store *SQLiteStore, scope Scope, id string) {
	t.Helper()
	if _, err := store.Create(ctx, scope, DocumentRecord{
		ID:              id,
		Title:           "Batch Test Document " + id,
		SourceObjectKey: "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/" + id + ".pdf",
		SourceSHA256:    strings.Repeat("a", 64),
	}); err != nil {
		t.Fatalf("Create(%s): %v", id, err)
	}
}

func TestSQLiteStoreWithBatchDefersPersistUntilCompletion(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-batch", OrgID: "org-batch"}
	store, dsn := newSQLiteStoreBatchTestStore(t)
	defer func() {
		_ = store.Close()
	}()

	if err := store.WithBatch(ctx, func() error {
		createBatchTestDocument(t, ctx, store, scope, "doc-1")
		if count := sqliteStoreStateRowCount(t, ctx, store); count != 0 {
			t.Fatalf("expected no persisted snapshot rows mid-batch, got %d", count)
		}
		return nil
	}); err != nil {
		t.Fatalf("WithBatch: %v", err)
	}
	if count := sqliteStoreStateRowCount(t, ctx, store); count != 1 {
		t.Fatalf("expected one persisted snapshot row after batch flush, got %d", count)
	}

	reloaded, err := NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("reload NewSQLiteStore: %v", err)
	}
	defer func() {
		_ = reloaded.Close()
	}()
	docs, err := reloaded.List(ctx, scope, DocumentQuery{})
	if err != nil {
		t.Fatalf("reloaded List: %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("expected one persisted document after reload, got %d", len(docs))
	}
}

func TestSQLiteStoreWithBatchNestedFlushesAtOuterBoundary(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-batch", OrgID: "org-batch"}
	store, dsn := newSQLiteStoreBatchTestStore(t)
	defer func() {
		_ = store.Close()
	}()

	if err := store.WithBatch(ctx, func() error {
		createBatchTestDocument(t, ctx, store, scope, "doc-1")

		if err := store.WithBatch(ctx, func() error {
			createBatchTestDocument(t, ctx, store, scope, "doc-2")
			if count := sqliteStoreStateRowCount(t, ctx, store); count != 0 {
				t.Fatalf("expected no persisted snapshot rows mid-nested-batch, got %d", count)
			}
			return nil
		}); err != nil {
			return err
		}

		if count := sqliteStoreStateRowCount(t, ctx, store); count != 0 {
			t.Fatalf("expected no persisted snapshot rows before outer batch flush, got %d", count)
		}
		return nil
	}); err != nil {
		t.Fatalf("outer WithBatch: %v", err)
	}

	if count := sqliteStoreStateRowCount(t, ctx, store); count != 1 {
		t.Fatalf("expected one persisted snapshot row after outer flush, got %d", count)
	}

	reloaded, err := NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("reload NewSQLiteStore: %v", err)
	}
	defer func() {
		_ = reloaded.Close()
	}()
	docs, err := reloaded.List(ctx, scope, DocumentQuery{})
	if err != nil {
		t.Fatalf("reloaded List: %v", err)
	}
	if len(docs) != 2 {
		t.Fatalf("expected two persisted documents after nested batch reload, got %d", len(docs))
	}
}

func TestSQLiteStoreWithTxPersistsState(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-batch", OrgID: "org-batch"}
	store, dsn := newSQLiteStoreBatchTestStore(t)
	defer func() {
		_ = store.Close()
	}()

	if err := store.WithTx(ctx, func(tx TxStore) error {
		_, err := tx.Create(ctx, scope, DocumentRecord{
			ID:              "doc-tx-1",
			Title:           "Doc tx",
			SourceObjectKey: "tenant/tenant-batch/org/org-batch/docs/doc-tx-1.pdf",
			SourceSHA256:    strings.Repeat("a", 64),
		})
		return err
	}); err != nil {
		t.Fatalf("WithTx: %v", err)
	}

	reloaded, err := NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("reload NewSQLiteStore: %v", err)
	}
	defer func() {
		_ = reloaded.Close()
	}()
	docs, err := reloaded.List(ctx, scope, DocumentQuery{})
	if err != nil {
		t.Fatalf("reloaded List: %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("expected one persisted document after tx, got %d", len(docs))
	}
}

func TestSQLiteStoreWithTxPropagatesError(t *testing.T) {
	ctx := context.Background()
	store, _ := newSQLiteStoreBatchTestStore(t)
	defer func() {
		_ = store.Close()
	}()

	sentinel := errors.New("sentinel")
	err := store.WithTx(ctx, func(tx TxStore) error {
		_ = tx
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected sentinel error, got %v", err)
	}
}
