package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

func ensureRuntimeParityColumns(ctx context.Context, db *sql.DB, dialect Dialect) error {
	if db == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	switch dialect {
	case DialectSQLite:
		return ensureSQLiteRuntimeParityColumns(ctx, db)
	case DialectPostgres:
		return ensurePostgresRuntimeParityColumns(ctx, db)
	default:
		return nil
	}
}

func ensureSQLiteRuntimeParityColumns(ctx context.Context, db *sql.DB) error {
	type columnSpec struct {
		table  string
		column string
		ddl    string
	}
	specs := []columnSpec{
		{table: "documents", column: "created_by_user_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "normalized_object_key", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_original_name", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_mime_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_ingestion_mode", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_document_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_revision_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_artifact_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_compatibility_tier", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_compatibility_reason", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_normalization_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_analyzed_at", ddl: "TIMESTAMP NULL"},
		{table: "documents", column: "pdf_policy_version", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_actor_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_command_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_dispatch_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_exec_mode", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_correlation", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_failure", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_original_key", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_output_key", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "remediation_requested_at", ddl: "TIMESTAMP NULL"},
		{table: "documents", column: "remediation_started_at", ddl: "TIMESTAMP NULL"},
		{table: "documents", column: "remediation_completed_at", ddl: "TIMESTAMP NULL"},

		{table: "agreements", column: "source_mime_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "agreements", column: "source_ingestion_mode", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "agreements", column: "source_revision_id", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "google_import_runs", column: "source_document_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "source_revision_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "source_artifact_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "lineage_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "fingerprint_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "candidate_status_json", ddl: "TEXT NOT NULL DEFAULT '[]'"},
		{table: "google_import_runs", column: "document_detail_url", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "agreement_detail_url", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "job_runs", column: "payload_json", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "job_runs", column: "available_at", ddl: "TIMESTAMP NULL"},
		{table: "job_runs", column: "started_at", ddl: "TIMESTAMP NULL"},
		{table: "job_runs", column: "completed_at", ddl: "TIMESTAMP NULL"},
		{table: "job_runs", column: "claimed_at", ddl: "TIMESTAMP NULL"},
		{table: "job_runs", column: "lease_expires_at", ddl: "TIMESTAMP NULL"},
		{table: "job_runs", column: "worker_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "job_runs", column: "resource_kind", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "job_runs", column: "resource_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "job_runs", column: "last_error_code", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "fields", column: "field_definition_id", ddl: "TEXT NULL"},
		{table: "fields", column: "placement_source", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "fields", column: "link_group_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "fields", column: "linked_from_field_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "fields", column: "is_unlinked", ddl: "BOOLEAN NOT NULL DEFAULT FALSE"},

		{table: "field_definitions", column: "link_group_id", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "field_instances", column: "placement_source", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "field_instances", column: "resolver_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "field_instances", column: "confidence", ddl: "DOUBLE PRECISION NOT NULL DEFAULT 0"},
		{table: "field_instances", column: "placement_run_id", ddl: "TEXT NULL"},
		{table: "field_instances", column: "manual_override", ddl: "BOOLEAN NOT NULL DEFAULT FALSE"},
		{table: "field_instances", column: "link_group_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "field_instances", column: "linked_from_field_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "field_instances", column: "is_unlinked", ddl: "BOOLEAN NOT NULL DEFAULT FALSE"},

		{table: "email_logs", column: "attempt_count", ddl: "INTEGER NOT NULL DEFAULT 1"},
		{table: "email_logs", column: "max_attempts", ddl: "INTEGER NOT NULL DEFAULT 1"},
		{table: "email_logs", column: "correlation_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "email_logs", column: "next_retry_at", ddl: "TIMESTAMP NULL"},
		{table: "email_logs", column: "updated_at", ddl: "TIMESTAMP NOT NULL DEFAULT '1970-01-01T00:00:00Z'"},
		{table: "guarded_effects", column: "group_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "guarded_effects", column: "group_id", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "integration_credentials", column: "profile_json", ddl: "TEXT NOT NULL DEFAULT '{}'"},
		{table: "integration_credentials", column: "last_used_at", ddl: "TIMESTAMP NULL"},
	}

	for _, spec := range specs {
		exists, err := sqliteColumnExists(ctx, db, spec.table, spec.column)
		if err != nil {
			return err
		}
		if exists {
			continue
		}
		stmt := `ALTER TABLE ` + spec.table + ` ADD COLUMN ` + spec.column + ` ` + spec.ddl
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure sqlite runtime parity column %s.%s: %w", spec.table, spec.column, err)
		}
	}

	if _, err := db.ExecContext(ctx,
		`UPDATE email_logs
		 SET updated_at = COALESCE(created_at, '1970-01-01T00:00:00Z')
		 WHERE updated_at = '1970-01-01T00:00:00Z'`,
	); err != nil {
		return fmt.Errorf("ensure sqlite runtime parity email_logs.updated_at backfill: %w", err)
	}
	return nil
}

func sqliteColumnExists(ctx context.Context, db *sql.DB, table, column string) (bool, error) {
	table = strings.TrimSpace(strings.ToLower(table))
	column = strings.TrimSpace(strings.ToLower(column))
	if db == nil || table == "" || column == "" {
		return false, nil
	}

	rows, err := db.QueryContext(ctx, `PRAGMA table_info(`+table+`)`)
	if err != nil {
		return false, fmt.Errorf("query sqlite table info for %s: %w", table, err)
	}
	defer func() { _ = rows.Close() }()

	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue any
			pk        int
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return false, fmt.Errorf("scan sqlite table info for %s: %w", table, err)
		}
		if strings.TrimSpace(strings.ToLower(name)) == column {
			return true, nil
		}
	}
	if err := rows.Err(); err != nil {
		return false, fmt.Errorf("iterate sqlite table info for %s: %w", table, err)
	}
	return false, nil
}

func ensurePostgresRuntimeParityColumns(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return nil
	}
	statements := []string{
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS created_by_user_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS normalized_object_key TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_original_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_mime_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_ingestion_mode TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_document_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_revision_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_artifact_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_compatibility_tier TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_compatibility_reason TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_normalization_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_analyzed_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_policy_version TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_actor_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_command_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_dispatch_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_exec_mode TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_correlation TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_failure TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_original_key TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_output_key TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_requested_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_started_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS remediation_completed_at TIMESTAMP NULL`,

		`ALTER TABLE IF EXISTS agreements ADD COLUMN IF NOT EXISTS source_mime_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS agreements ADD COLUMN IF NOT EXISTS source_ingestion_mode TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS agreements ADD COLUMN IF NOT EXISTS source_revision_id TEXT NOT NULL DEFAULT ''`,

		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS source_document_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS source_revision_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS source_artifact_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS lineage_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS fingerprint_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS candidate_status_json TEXT NOT NULL DEFAULT '[]'`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS document_detail_url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS google_import_runs ADD COLUMN IF NOT EXISTS agreement_detail_url TEXT NOT NULL DEFAULT ''`,

		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS payload_json TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS available_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS worker_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS resource_kind TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS resource_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS job_runs ADD COLUMN IF NOT EXISTS last_error_code TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS job_runs ALTER COLUMN attempt_count SET DEFAULT 0`,
		`ALTER TABLE IF EXISTS job_runs DROP CONSTRAINT IF EXISTS job_runs_attempt_count_check`,
		`ALTER TABLE IF EXISTS job_runs ADD CONSTRAINT job_runs_attempt_count_check CHECK (attempt_count >= 0)`,

		`ALTER TABLE IF EXISTS fields ADD COLUMN IF NOT EXISTS field_definition_id TEXT NULL`,
		`ALTER TABLE IF EXISTS fields ADD COLUMN IF NOT EXISTS placement_source TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS fields ADD COLUMN IF NOT EXISTS link_group_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS fields ADD COLUMN IF NOT EXISTS linked_from_field_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS fields ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN NOT NULL DEFAULT FALSE`,

		`ALTER TABLE IF EXISTS field_definitions ADD COLUMN IF NOT EXISTS link_group_id TEXT NOT NULL DEFAULT ''`,

		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS placement_source TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS resolver_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS placement_run_id TEXT NULL`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS link_group_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS linked_from_field_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS field_instances ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN NOT NULL DEFAULT FALSE`,

		`ALTER TABLE IF EXISTS email_logs ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE IF EXISTS email_logs ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE IF EXISTS email_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS email_logs ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS email_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT '1970-01-01T00:00:00Z'`,
		`ALTER TABLE IF EXISTS guarded_effects ADD COLUMN IF NOT EXISTS group_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS guarded_effects ADD COLUMN IF NOT EXISTS group_id TEXT NOT NULL DEFAULT ''`,

		`ALTER TABLE IF EXISTS integration_credentials ADD COLUMN IF NOT EXISTS profile_json TEXT NOT NULL DEFAULT '{}'`,
		`ALTER TABLE IF EXISTS integration_credentials ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NULL`,

		`UPDATE email_logs
		 SET updated_at = COALESCE(created_at, '1970-01-01T00:00:00Z')
		 WHERE updated_at = '1970-01-01T00:00:00Z'`,
	}
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure postgres runtime parity columns: %w", err)
		}
	}
	return nil
}
