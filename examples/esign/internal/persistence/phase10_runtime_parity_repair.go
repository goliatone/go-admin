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
		{table: "documents", column: "source_mime_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "source_ingestion_mode", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_compatibility_tier", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_compatibility_reason", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_normalization_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "documents", column: "pdf_analyzed_at", ddl: "TIMESTAMP NULL"},
		{table: "documents", column: "pdf_policy_version", ddl: "TEXT NOT NULL DEFAULT ''"},

		{table: "agreements", column: "source_mime_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "agreements", column: "source_ingestion_mode", ddl: "TEXT NOT NULL DEFAULT ''"},

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
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_mime_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS source_ingestion_mode TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_compatibility_tier TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_compatibility_reason TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_normalization_status TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_analyzed_at TIMESTAMP NULL`,
		`ALTER TABLE IF EXISTS documents ADD COLUMN IF NOT EXISTS pdf_policy_version TEXT NOT NULL DEFAULT ''`,

		`ALTER TABLE IF EXISTS agreements ADD COLUMN IF NOT EXISTS source_mime_type TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE IF EXISTS agreements ADD COLUMN IF NOT EXISTS source_ingestion_mode TEXT NOT NULL DEFAULT ''`,

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
