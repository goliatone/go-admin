package admin

import (
	"io/fs"
	"testing/fstest"

	admindata "github.com/goliatone/go-admin/data"
)

// GetWorkflowRuntimeMigrationsFS returns runtime workflow migrations rooted for sqlite usage.
func GetWorkflowRuntimeMigrationsFS() fs.FS {
	source := admindata.TranslationAssignmentMigrations()
	paths := []string{
		"0003_workflows.up.sql",
		"0003_workflows.down.sql",
		"0005_workflow_revisions.up.sql",
		"0005_workflow_revisions.down.sql",
		"sqlite/0004_workflow_bindings_active_unique.up.sql",
		"sqlite/0004_workflow_bindings_active_unique.down.sql",
	}

	filtered := fstest.MapFS{}
	for _, path := range paths {
		data, err := fs.ReadFile(source, path)
		if err != nil {
			continue
		}
		filtered[path] = &fstest.MapFile{Data: data, Mode: 0o644}
	}
	if len(filtered) == 0 {
		return source
	}
	return filtered
}
