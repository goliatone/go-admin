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
