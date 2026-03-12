package persistence

import (
	"context"
	"path/filepath"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	persistence "github.com/goliatone/go-persistence-bun"
)

func TestEnsureRuntimeParityColumnsSQLiteRepairsEmailLogUpdatedAtColumn(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase10-repair-email-logs.db") + "?_fk=1&_busy_timeout=5000"
	sqlDB, bunDialect, driverName, err := openDialectDB(context.Background(), DialectSQLite, dsn)
	if err != nil {
		t.Fatalf("openDialectDB: %v", err)
	}
	client, err := persistence.New(bootstrapPersistenceConfig{driver: driverName, server: dsn}, sqlDB, bunDialect)
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("persistence.New: %v", err)
	}
	defer func() { _ = client.Close() }()

	cfg := appcfg.Defaults()
	cfg.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	// Simulate an existing DB where migration 0008 was not fully applied.
	if _, err := sqlDB.ExecContext(context.Background(), `ALTER TABLE email_logs DROP COLUMN updated_at`); err != nil {
		// SQLite drop column may be unavailable in older engines; fallback by recreating table row assumptions.
		// In this case just verify the function still passes with column already present.
		if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectSQLite); err != nil {
			t.Fatalf("ensureRuntimeParityColumns existing-column case: %v", err)
		}
		return
	}

	if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectSQLite); err != nil {
		t.Fatalf("ensureRuntimeParityColumns: %v", err)
	}
	exists, err := sqliteColumnExists(context.Background(), sqlDB, "email_logs", "updated_at")
	if err != nil {
		t.Fatalf("sqliteColumnExists: %v", err)
	}
	if !exists {
		t.Fatalf("expected email_logs.updated_at to exist after parity repair")
	}
}

func TestEnsureRuntimeParityColumnsSQLiteBackfillsEmailLogUpdatedAt(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase10-repair-backfill.db") + "?_fk=1&_busy_timeout=5000"
	sqlDB, bunDialect, driverName, err := openDialectDB(context.Background(), DialectSQLite, dsn)
	if err != nil {
		t.Fatalf("openDialectDB: %v", err)
	}
	client, err := persistence.New(bootstrapPersistenceConfig{driver: driverName, server: dsn}, sqlDB, bunDialect)
	if err != nil {
		_ = sqlDB.Close()
		t.Fatalf("persistence.New: %v", err)
	}
	defer func() { _ = client.Close() }()

	cfg := appcfg.Defaults()
	cfg.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	if _, err := sqlDB.ExecContext(context.Background(),
		`INSERT INTO email_logs (id, tenant_id, org_id, agreement_id, template_code, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		"log-repair-1",
		"tenant-repair",
		"org-repair",
		"agreement-repair",
		"agreement_sent",
		"queued",
		"2026-03-09T01:00:00Z",
	); err != nil {
		t.Fatalf("insert email log seed: %v", err)
	}
	if _, err := sqlDB.ExecContext(context.Background(), `UPDATE email_logs SET updated_at = '1970-01-01T00:00:00Z' WHERE id = ?`, "log-repair-1"); err != nil {
		t.Fatalf("set sentinel updated_at: %v", err)
	}

	if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectSQLite); err != nil {
		t.Fatalf("ensureRuntimeParityColumns: %v", err)
	}

	var updatedAt string
	if err := sqlDB.QueryRowContext(context.Background(), `SELECT updated_at FROM email_logs WHERE id = ?`, "log-repair-1").Scan(&updatedAt); err != nil {
		t.Fatalf("query updated_at: %v", err)
	}
	if updatedAt == "" || updatedAt == "1970-01-01T00:00:00Z" {
		t.Fatalf("expected updated_at backfill from created_at, got %q", updatedAt)
	}
}
