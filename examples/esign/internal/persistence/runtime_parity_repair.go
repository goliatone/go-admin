package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

type runtimeParityColumnSpec struct {
	table  string
	column string
	ddl    string
}

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
	if err := ensureSQLiteRuntimeParityColumnSpecs(ctx, db, runtimeParityColumnSpecs()); err != nil {
		return err
	}
	return backfillRuntimeParityEmailLogUpdatedAt(ctx, db, "sqlite")
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
	return executeRuntimeParityStatements(ctx, db, runtimeParityPostgresStatements(), "postgres")
}

func runtimeParityColumnSpecs() []runtimeParityColumnSpec {
	specs := make([]runtimeParityColumnSpec, 0, 70)
	specs = append(specs, runtimeParityDocumentColumnSpecs()...)
	specs = append(specs, runtimeParityAgreementColumnSpecs()...)
	specs = append(specs, runtimeParityGoogleImportColumnSpecs()...)
	specs = append(specs, runtimeParityJobRunColumnSpecs()...)
	specs = append(specs, runtimeParityFieldColumnSpecs()...)
	specs = append(specs, runtimeParityEmailAndEffectColumnSpecs()...)
	specs = append(specs, runtimeParityIntegrationCredentialColumnSpecs()...)
	return specs
}

func runtimeParityDocumentColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
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
	}
}

func runtimeParityAgreementColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
		{table: "agreements", column: "source_mime_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "agreements", column: "source_ingestion_mode", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "agreements", column: "source_revision_id", ddl: "TEXT NOT NULL DEFAULT ''"},
	}
}

func runtimeParityGoogleImportColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
		{table: "google_import_runs", column: "source_document_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "source_revision_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "source_artifact_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "lineage_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "fingerprint_status", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "candidate_status_json", ddl: "TEXT NOT NULL DEFAULT '[]'"},
		{table: "google_import_runs", column: "document_detail_url", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "google_import_runs", column: "agreement_detail_url", ddl: "TEXT NOT NULL DEFAULT ''"},
	}
}

func runtimeParityJobRunColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
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
	}
}

func runtimeParityFieldColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
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
	}
}

func runtimeParityEmailAndEffectColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
		{table: "email_logs", column: "attempt_count", ddl: "INTEGER NOT NULL DEFAULT 1"},
		{table: "email_logs", column: "max_attempts", ddl: "INTEGER NOT NULL DEFAULT 1"},
		{table: "email_logs", column: "correlation_id", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "email_logs", column: "next_retry_at", ddl: "TIMESTAMP NULL"},
		{table: "email_logs", column: "updated_at", ddl: "TIMESTAMP NOT NULL DEFAULT '1970-01-01T00:00:00Z'"},
		{table: "guarded_effects", column: "group_type", ddl: "TEXT NOT NULL DEFAULT ''"},
		{table: "guarded_effects", column: "group_id", ddl: "TEXT NOT NULL DEFAULT ''"},
	}
}

func runtimeParityIntegrationCredentialColumnSpecs() []runtimeParityColumnSpec {
	return []runtimeParityColumnSpec{
		{table: "integration_credentials", column: "profile_json", ddl: "TEXT NOT NULL DEFAULT '{}'"},
		{table: "integration_credentials", column: "last_used_at", ddl: "TIMESTAMP NULL"},
	}
}

func ensureSQLiteRuntimeParityColumnSpecs(ctx context.Context, db *sql.DB, specs []runtimeParityColumnSpec) error {
	for _, spec := range specs {
		exists, err := sqliteColumnExists(ctx, db, spec.table, spec.column)
		if err != nil {
			return err
		}
		if exists {
			continue
		}
		tableName, err := primitives.NormalizeSQLIdentifier(spec.table)
		if err != nil {
			return err
		}
		columnName, err := primitives.NormalizeSQLIdentifier(spec.column)
		if err != nil {
			return err
		}
		// #nosec G201 -- table and column identifiers are validated; ddl comes from internal constant specs above.
		stmt := fmt.Sprintf(`ALTER TABLE %s ADD COLUMN %s %s`, tableName, columnName, spec.ddl)
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure sqlite runtime parity column %s.%s: %w", spec.table, spec.column, err)
		}
	}
	return nil
}

func runtimeParityPostgresStatements() []string {
	statements := make([]string, 0, len(runtimeParityColumnSpecs())+4)
	for _, spec := range runtimeParityColumnSpecs() {
		statements = append(statements, fmt.Sprintf(
			`ALTER TABLE IF EXISTS %s ADD COLUMN IF NOT EXISTS %s %s`,
			spec.table,
			spec.column,
			spec.ddl,
		))
	}
	return append(statements,
		`ALTER TABLE IF EXISTS job_runs ALTER COLUMN attempt_count SET DEFAULT 0`,
		`ALTER TABLE IF EXISTS job_runs DROP CONSTRAINT IF EXISTS job_runs_attempt_count_check`,
		`ALTER TABLE IF EXISTS job_runs ADD CONSTRAINT job_runs_attempt_count_check CHECK (attempt_count >= 0)`,
		`UPDATE email_logs
		 SET updated_at = COALESCE(created_at, '1970-01-01T00:00:00Z')
		 WHERE updated_at = '1970-01-01T00:00:00Z'`,
	)
}

func executeRuntimeParityStatements(ctx context.Context, db *sql.DB, statements []string, dialect string) error {
	for _, stmt := range statements {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("ensure %s runtime parity columns: %w", dialect, err)
		}
	}
	return nil
}

func backfillRuntimeParityEmailLogUpdatedAt(ctx context.Context, db *sql.DB, dialect string) error {
	if _, err := db.ExecContext(ctx,
		`UPDATE email_logs
		 SET updated_at = COALESCE(created_at, '1970-01-01T00:00:00Z')
		 WHERE updated_at = '1970-01-01T00:00:00Z'`,
	); err != nil {
		return fmt.Errorf("ensure %s runtime parity email_logs.updated_at backfill: %w", dialect, err)
	}
	return nil
}
