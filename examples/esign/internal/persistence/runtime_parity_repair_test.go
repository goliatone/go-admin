package persistence

import (
	"context"
	"database/sql"
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
	cfg.Persistence.Migrations.LocalOnly = true
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
	cfg.Persistence.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	if _, err := sqlDB.ExecContext(context.Background(),
		`INSERT INTO documents (id, tenant_id, org_id, title, source_original_name, source_object_key, source_sha256, size_bytes, page_count, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"document-repair",
		"tenant-repair",
		"org-repair",
		"Runtime Parity Repair",
		"repair.pdf",
		"tenant/tenant-repair/org/org-repair/docs/repair.pdf",
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		1024,
		1,
		"2026-03-09T00:30:00Z",
		"2026-03-09T00:30:00Z",
	); err != nil {
		t.Fatalf("insert document seed: %v", err)
	}
	if _, err := sqlDB.ExecContext(context.Background(),
		`INSERT INTO agreements (id, tenant_id, org_id, document_id, status, title, message, version, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		"agreement-repair",
		"tenant-repair",
		"org-repair",
		"document-repair",
		"sent",
		"Repair Agreement",
		"",
		1,
		"2026-03-09T00:45:00Z",
		"2026-03-09T00:45:00Z",
	); err != nil {
		t.Fatalf("insert agreement seed: %v", err)
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

func TestEnsureRuntimeParityColumnsSQLiteRepairsLineageLinkageColumns(t *testing.T) {
	dsn := "file:" + filepath.Join(t.TempDir(), "phase10-repair-lineage-columns.db") + "?_fk=1&_busy_timeout=5000"
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
	cfg.Persistence.Migrations.LocalOnly = true
	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	dropStatements := []string{
		`ALTER TABLE documents DROP COLUMN source_document_id`,
		`ALTER TABLE documents DROP COLUMN source_revision_id`,
		`ALTER TABLE documents DROP COLUMN source_artifact_id`,
		`ALTER TABLE agreements DROP COLUMN source_revision_id`,
	}
	for _, stmt := range dropStatements {
		if _, err := sqlDB.ExecContext(context.Background(), stmt); err != nil {
			if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectSQLite); err != nil {
				t.Fatalf("ensureRuntimeParityColumns existing-column case: %v", err)
			}
			assertSQLiteLineageColumnsExist(t, sqlDB)
			return
		}
	}

	if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectSQLite); err != nil {
		t.Fatalf("ensureRuntimeParityColumns: %v", err)
	}
	assertSQLiteLineageColumnsExist(t, sqlDB)
}

func TestEnsureRuntimeParityColumnsPostgresRepairsJobRunAttemptConstraint(t *testing.T) {
	dsn := requirePostgresTestDSN(t)
	sqlDB, bunDialect, driverName, err := openDialectDB(context.Background(), DialectPostgres, dsn)
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
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Persistence.Postgres.DSN = dsn
	cfg.Persistence.SQLite.DSN = ""
	if err := registerOrderedSources(client, cfg); err != nil {
		t.Fatalf("registerOrderedSources: %v", err)
	}
	if err := client.Migrate(context.Background()); err != nil {
		t.Fatalf("client.Migrate: %v", err)
	}

	if _, err := sqlDB.ExecContext(context.Background(), `
		ALTER TABLE job_runs ALTER COLUMN attempt_count SET DEFAULT 1;
		ALTER TABLE job_runs DROP CONSTRAINT IF EXISTS job_runs_attempt_count_check;
		ALTER TABLE job_runs ADD CONSTRAINT job_runs_attempt_count_check CHECK (attempt_count > 0);
	`); err != nil {
		t.Fatalf("set stale postgres constraint: %v", err)
	}

	if err := ensureRuntimeParityColumns(context.Background(), sqlDB, DialectPostgres); err != nil {
		t.Fatalf("ensureRuntimeParityColumns: %v", err)
	}

	if _, err := sqlDB.ExecContext(context.Background(), `
		INSERT INTO job_runs (
			id, tenant_id, org_id, job_name, dedupe_key, agreement_id, correlation_id,
			status, attempt_count, max_attempts, payload_json, available_at, worker_id,
			resource_kind, resource_id, last_error_code, last_error, created_at, updated_at
		) VALUES (
			'job-run-repair', 'tenant-repair', 'org-repair', 'jobs.esign.drain_email_outbox',
			'tenant-repair|org-repair', '', '', 'queued', 0, 3, '{}', NOW(), '',
			'scope', 'tenant-repair|org-repair', '', '', NOW(), NOW()
		)
	`); err != nil {
		t.Fatalf("insert repaired queued job run: %v", err)
	}
}

func assertSQLiteLineageColumnsExist(t *testing.T, db *sql.DB) {
	t.Helper()

	ctx := context.Background()
	requiredColumns := []struct {
		table  string
		column string
	}{
		{table: "documents", column: "source_document_id"},
		{table: "documents", column: "source_revision_id"},
		{table: "documents", column: "source_artifact_id"},
		{table: "agreements", column: "source_revision_id"},
	}
	for _, spec := range requiredColumns {
		exists, err := sqliteColumnExists(ctx, db, spec.table, spec.column)
		if err != nil {
			t.Fatalf("sqliteColumnExists %s.%s: %v", spec.table, spec.column, err)
		}
		if !exists {
			t.Fatalf("expected %s.%s to exist after parity repair", spec.table, spec.column)
		}
	}
}
