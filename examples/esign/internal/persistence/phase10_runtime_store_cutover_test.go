package persistence

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func newPhase10SQLiteBootstrap(t *testing.T, dsn string) *BootstrapResult {
	t.Helper()
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn
	cfg.Postgres.DSN = ""

	bootstrap, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}
	return bootstrap
}

func TestPhase10RuntimeStoreSQLiteDoesNotWriteLegacySnapshotState(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase10-runtime-cutover.db") + "?_fk=1&_busy_timeout=5000"
	bootstrap := newPhase10SQLiteBootstrap(t, dsn)
	defer func() { _ = bootstrap.Close() }()

	adapter, cleanup, err := NewStoreAdapter(bootstrap)
	if err != nil {
		t.Fatalf("NewStoreAdapter: %v", err)
	}
	defer func() { _ = cleanup() }()

	scope := stores.Scope{TenantID: "tenant-phase10", OrgID: "org-phase10"}
	if _, err := adapter.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 "doc-phase10-cutover",
		CreatedByUserID:    "user-phase10",
		SourceObjectKey:    "tenant/tenant-phase10/org/org-phase10/docs/doc-phase10-cutover.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("a", 64),
	}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	exists, err := sqliteTableExists(context.Background(), bootstrap.SQLDB, removedSnapshotStateTable)
	if err != nil {
		t.Fatalf("sqliteTableExists(%s): %v", removedSnapshotStateTable, err)
	}
	if exists {
		t.Fatalf("expected %s to be absent after legacy cleanup migration", removedSnapshotStateTable)
	}
}

func TestPhase10RuntimeStoreSQLitePersistsAcrossBootstrapRestart(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase10-runtime-restart.db") + "?_fk=1&_busy_timeout=5000"
	scope := stores.Scope{TenantID: "tenant-phase10-restart", OrgID: "org-phase10-restart"}

	first := newPhase10SQLiteBootstrap(t, dsn)
	firstStore, firstCleanup, err := NewStoreAdapter(first)
	if err != nil {
		_ = first.Close()
		t.Fatalf("NewStoreAdapter first: %v", err)
	}
	if _, err := firstStore.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 "doc-phase10-restart",
		CreatedByUserID:    "user-phase10-restart",
		SourceObjectKey:    "tenant/tenant-phase10-restart/org/org-phase10-restart/docs/doc-phase10-restart.pdf",
		SourceOriginalName: "source.pdf",
		SourceSHA256:       strings.Repeat("b", 64),
	}); err != nil {
		_ = firstCleanup()
		_ = first.Close()
		t.Fatalf("Create first: %v", err)
	}
	_ = firstCleanup()
	if err := first.Close(); err != nil {
		t.Fatalf("close first bootstrap: %v", err)
	}

	second := newPhase10SQLiteBootstrap(t, dsn)
	defer func() { _ = second.Close() }()
	secondStore, secondCleanup, err := NewStoreAdapter(second)
	if err != nil {
		t.Fatalf("NewStoreAdapter second: %v", err)
	}
	defer func() { _ = secondCleanup() }()

	docs, err := secondStore.List(context.Background(), scope, stores.DocumentQuery{})
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(docs) != 1 || docs[0].ID != "doc-phase10-restart" {
		t.Fatalf("expected persisted document after restart, got %+v", docs)
	}
}
