package persistence

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/uptrace/bun/driver/sqliteshim"
)

func TestPhase11LegacyCleanupMigrationDropsLegacySnapshotTables(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase11-legacy-cleanup.db") + "?_fk=1&_busy_timeout=5000"
	seedLegacySnapshotTablesForCleanupTest(t, dsn)

	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Migrations.LocalOnly = true
	cfg.SQLite.DSN = dsn
	cfg.Postgres.DSN = ""

	first, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("first Bootstrap: %v", err)
	}
	if exists, err := sqliteTableExists(context.Background(), first.SQLDB, removedSnapshotStateTable); err != nil {
		_ = first.Close()
		t.Fatalf("sqliteTableExists(%s): %v", removedSnapshotStateTable, err)
	} else if exists {
		_ = first.Close()
		t.Fatalf("expected %s dropped by migration", removedSnapshotStateTable)
	}
	if exists, err := sqliteTableExists(context.Background(), first.SQLDB, removedSnapshotMigrationMarkerTable); err != nil {
		_ = first.Close()
		t.Fatalf("sqliteTableExists(%s): %v", removedSnapshotMigrationMarkerTable, err)
	} else if exists {
		_ = first.Close()
		t.Fatalf("expected %s dropped by migration", removedSnapshotMigrationMarkerTable)
	}
	if err := first.Close(); err != nil {
		t.Fatalf("close first bootstrap: %v", err)
	}

	second, err := Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("second Bootstrap: %v", err)
	}
	defer func() { _ = second.Close() }()
	if exists, err := sqliteTableExists(context.Background(), second.SQLDB, removedSnapshotStateTable); err != nil {
		t.Fatalf("sqliteTableExists(%s): %v", removedSnapshotStateTable, err)
	} else if exists {
		t.Fatalf("expected %s absent after repeat bootstrap", removedSnapshotStateTable)
	}
	if exists, err := sqliteTableExists(context.Background(), second.SQLDB, removedSnapshotMigrationMarkerTable); err != nil {
		t.Fatalf("sqliteTableExists(%s): %v", removedSnapshotMigrationMarkerTable, err)
	} else if exists {
		t.Fatalf("expected %s absent after repeat bootstrap", removedSnapshotMigrationMarkerTable)
	}
}

func seedLegacySnapshotTablesForCleanupTest(t *testing.T, dsn string) {
	t.Helper()
	db, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("sql.Open: %v", err)
	}
	defer func() { _ = db.Close() }()

	if _, err := db.ExecContext(context.Background(), `
CREATE TABLE IF NOT EXISTS esign_store_state (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	snapshot_json TEXT NOT NULL,
	updated_at TEXT NOT NULL
)`); err != nil {
		t.Fatalf("create esign_store_state: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
CREATE TABLE IF NOT EXISTS esign_snapshot_migration_markers (
	marker_key TEXT PRIMARY KEY,
	completed_at TIMESTAMP NOT NULL,
	details_json TEXT NOT NULL DEFAULT '{}'
)`); err != nil {
		t.Fatalf("create esign_snapshot_migration_markers: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
INSERT INTO esign_store_state (id, snapshot_json, updated_at)
VALUES (1, '{}', '2026-01-01T00:00:00Z')
ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`); err != nil {
		t.Fatalf("seed esign_store_state: %v", err)
	}
	if _, err := db.ExecContext(context.Background(), `
INSERT INTO esign_snapshot_migration_markers (marker_key, completed_at, details_json)
VALUES ('legacy_esign_store_state_v1', CURRENT_TIMESTAMP, '{}')
ON CONFLICT(marker_key) DO UPDATE SET completed_at = excluded.completed_at, details_json = excluded.details_json`); err != nil {
		t.Fatalf("seed esign_snapshot_migration_markers: %v", err)
	}
}
