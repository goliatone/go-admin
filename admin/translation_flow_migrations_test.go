package admin

import (
	"io/fs"
	"testing"
)

func TestGetTranslationFlowMigrationsFSIncludesExpectedFiles(t *testing.T) {
	migrationsFS := GetTranslationFlowMigrationsFS()
	expected := []string{
		"0007_translation_flow_foundation.up.sql",
		"0007_translation_flow_foundation.down.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0009_translation_exchange_runtime.down.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
		"postgres/0008_translation_flow_pg_features.up.sql",
		"postgres/0008_translation_flow_pg_features.down.sql",
	}
	for _, path := range expected {
		if _, err := fs.ReadFile(migrationsFS, path); err != nil {
			t.Fatalf("expected migration file %s: %v", path, err)
		}
	}
}

func TestGetTranslationFlowSQLiteMigrationsFSExcludesPostgresFiles(t *testing.T) {
	migrationsFS := GetTranslationFlowSQLiteMigrationsFS()
	expected := []string{
		"0007_translation_flow_foundation.up.sql",
		"0007_translation_flow_foundation.down.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0009_translation_exchange_runtime.down.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
	}
	for _, path := range expected {
		if _, err := fs.ReadFile(migrationsFS, path); err != nil {
			t.Fatalf("expected migration file %s: %v", path, err)
		}
	}
	if _, err := fs.ReadFile(migrationsFS, "postgres/0008_translation_flow_pg_features.up.sql"); err == nil {
		t.Fatalf("expected postgres migration file to be excluded from sqlite subset")
	}
}
