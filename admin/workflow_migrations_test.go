package admin

import (
	"io/fs"
	"testing"
)

func TestGetWorkflowRuntimeMigrationsFSIncludesExpectedFiles(t *testing.T) {
	migrationsFS := GetWorkflowRuntimeMigrationsFS()
	expected := []string{
		"0003_workflows.up.sql",
		"0003_workflows.down.sql",
		"0005_workflow_revisions.up.sql",
		"0005_workflow_revisions.down.sql",
		"sqlite/0004_workflow_bindings_active_unique.up.sql",
		"sqlite/0004_workflow_bindings_active_unique.down.sql",
	}
	for _, path := range expected {
		if _, err := fs.ReadFile(migrationsFS, path); err != nil {
			t.Fatalf("expected migration file %s: %v", path, err)
		}
	}
}
