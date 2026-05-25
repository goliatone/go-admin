package admin

import (
	"io/fs"
	"testing"
)

func TestGetTranslationAssignmentMigrationsFSIncludesExpectedFiles(t *testing.T) {
	migrationsFS := GetTranslationAssignmentMigrationsFS()
	paths := []string{
		"0001_translation_assignments.up.sql",
		"0001_translation_assignments.down.sql",
		"sqlite/0002_translation_assignments_active_unique.up.sql",
		"sqlite/0002_translation_assignments_active_unique.down.sql",
		"postgres/0002_translation_assignments_active_unique.up.sql",
		"postgres/0002_translation_assignments_active_unique.down.sql",
	}
	for _, path := range paths {
		if _, err := fs.ReadFile(migrationsFS, path); err != nil {
			t.Fatalf("expected migration file %s: %v", path, err)
		}
	}
}

func TestGetTranslationAssignmentMigrationsFSExcludesWorkflowAndFlowFiles(t *testing.T) {
	migrationsFS := GetTranslationAssignmentMigrationsFS()
	excluded := []string{
		"0003_workflows.up.sql",
		"0007_translation_flow_foundation.up.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0010_translation_flow_admin_fields.up.sql",
	}
	for _, path := range excluded {
		if _, err := fs.ReadFile(migrationsFS, path); err == nil {
			t.Fatalf("expected migration file %s to be excluded", path)
		}
	}
}
