package admin

import (
	"context"
	"database/sql"
	"io/fs"
	"strings"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestTranslationFlowFoundationUsesPortableBooleanPredicate(t *testing.T) {
	migrationsFS := GetTranslationFlowMigrationsFS()
	data, err := fs.ReadFile(migrationsFS, "0007_translation_flow_foundation.up.sql")
	if err != nil {
		t.Fatalf("read foundation migration: %v", err)
	}
	sqlText := string(data)
	if strings.Contains(sqlText, "is_source = 1") {
		t.Fatalf("foundation migration must not compare boolean is_source to integer 1")
	}
	if !strings.Contains(sqlText, "WHERE is_source;") {
		t.Fatalf("foundation migration missing portable source predicate")
	}
}

func TestTranslationFlowPostgresAdditiveOverridesAreRetrySafe(t *testing.T) {
	migrationsFS := GetTranslationFlowMigrationsFS()
	for _, path := range []string{
		"postgres/0009_translation_exchange_runtime.up.sql",
		"postgres/0010_translation_flow_admin_fields.up.sql",
		"postgres/0014_translation_assignment_assigned_at.up.sql",
	} {
		data, err := fs.ReadFile(migrationsFS, path)
		if err != nil {
			t.Fatalf("read postgres override %s: %v", path, err)
		}
		sqlText := string(data)
		if !strings.Contains(sqlText, "ADD COLUMN IF NOT EXISTS") {
			t.Fatalf("postgres override %s must use ADD COLUMN IF NOT EXISTS", path)
		}
		if strings.Contains(sqlText, " BLOB") {
			t.Fatalf("postgres override %s must not use SQLite BLOB type", path)
		}
	}
}

func TestTranslationFlowPostgresFeatureMigrationUsesExpressionIndexSyntax(t *testing.T) {
	migrationsFS := GetTranslationFlowMigrationsFS()
	data, err := fs.ReadFile(migrationsFS, "postgres/0008_translation_flow_pg_features.up.sql")
	if err != nil {
		t.Fatalf("read postgres feature migration: %v", err)
	}
	sqlText := string(data)
	if strings.Contains(sqlText, "USING GIN (CAST(") {
		t.Fatalf("postgres feature migration must wrap cast expression indexes in expression parentheses")
	}
	if !strings.Contains(sqlText, "USING GIN ((blocker_codes_json::jsonb))") {
		t.Fatalf("postgres feature migration missing expected GIN expression index syntax")
	}
}

func TestTranslationAssignmentSQLiteSubsetAppliesCleanly(t *testing.T) {
	migrationsFS := GetTranslationAssignmentMigrationsFS()
	applySQLiteMigrations(t, migrationsFS,
		"0001_translation_assignments.up.sql",
		"sqlite/0002_translation_assignments_active_unique.up.sql",
	)
}

func TestWorkflowRuntimeSQLiteSubsetAppliesCleanly(t *testing.T) {
	migrationsFS := GetWorkflowRuntimeMigrationsFS()
	applySQLiteMigrations(t, migrationsFS,
		"0003_workflows.up.sql",
		"sqlite/0004_workflow_bindings_active_unique.up.sql",
		"0005_workflow_revisions.up.sql",
		"0006_workflow_authoring.up.sql",
	)
}

func TestTranslationFlowSQLiteSubsetAppliesCleanly(t *testing.T) {
	migrationsFS := GetTranslationFlowSQLiteMigrationsFS()
	applySQLiteMigrations(t, migrationsFS,
		"0007_translation_flow_foundation.up.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0010_translation_flow_admin_fields.up.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.up.sql",
		"0014_translation_assignment_assigned_at.up.sql",
	)
}

func TestTranslationFlowSQLiteSubsetAddsAssignmentAssignedAt(t *testing.T) {
	migrationsFS := GetTranslationFlowSQLiteMigrationsFS()
	db := migratedSQLiteDB(t, migrationsFS,
		"0007_translation_flow_foundation.up.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0010_translation_flow_admin_fields.up.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.up.sql",
		"0014_translation_assignment_assigned_at.up.sql",
	)
	defer func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Fatalf("close sqlite: %v", closeErr)
		}
	}()
	if !sqliteColumnExists(t, db, "translation_assignments", "assigned_at") {
		t.Fatalf("expected translation_assignments.assigned_at column")
	}
}

func applySQLiteMigrations(t *testing.T, migrationsFS fs.FS, paths ...string) {
	t.Helper()
	db := migratedSQLiteDB(t, migrationsFS, paths...)
	if closeErr := db.Close(); closeErr != nil {
		t.Fatalf("close sqlite: %v", closeErr)
	}
}

func migratedSQLiteDB(t *testing.T, migrationsFS fs.FS, paths ...string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	for _, path := range paths {
		data, readErr := fs.ReadFile(migrationsFS, path)
		if readErr != nil {
			closeSQLiteDB(t, db)
			t.Fatalf("read migration %s: %v", path, readErr)
		}
		if _, execErr := db.ExecContext(context.Background(), string(data)); execErr != nil {
			closeSQLiteDB(t, db)
			t.Fatalf("apply migration %s: %v", path, execErr)
		}
	}
	return db
}

func closeSQLiteDB(t *testing.T, db *sql.DB) {
	t.Helper()
	if closeErr := db.Close(); closeErr != nil {
		t.Fatalf("close sqlite: %v", closeErr)
	}
}

func sqliteColumnExists(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	rows, err := db.QueryContext(context.Background(), "PRAGMA table_info("+table+")")
	if err != nil {
		t.Fatalf("inspect sqlite table %s: %v", table, err)
	}
	defer func() {
		if closeErr := rows.Close(); closeErr != nil {
			t.Fatalf("close pragma rows: %v", closeErr)
		}
	}()
	for rows.Next() {
		var cid int
		var name, typ string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &typ, &notNull, &defaultValue, &pk); err != nil {
			t.Fatalf("scan pragma row: %v", err)
		}
		if name == column {
			return true
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate pragma rows: %v", err)
	}
	return false
}
