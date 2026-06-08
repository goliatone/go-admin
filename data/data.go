package data

import (
	"embed"
	"io/fs"
	"strings"
	"testing/fstest"
)

//go:embed uischemas sql/migrations/*.sql sql/migrations/sqlite/*.sql sql/migrations/postgres/*.sql
var embeddedFS embed.FS

// UISchemas returns the embedded UI schema filesystem.
func UISchemas() fs.FS {
	sub, err := fs.Sub(embeddedFS, "uischemas")
	if err != nil {
		return embeddedFS
	}
	return sub
}

// TranslationAssignmentMigrations returns the legacy queue assignment migration set.
func TranslationAssignmentMigrations() fs.FS {
	return migrationSubset(
		"0001_translation_assignments.up.sql",
		"0001_translation_assignments.down.sql",
		"sqlite/0002_translation_assignments_active_unique.up.sql",
		"sqlite/0002_translation_assignments_active_unique.down.sql",
		"postgres/0002_translation_assignments_active_unique.up.sql",
		"postgres/0002_translation_assignments_active_unique.down.sql",
	)
}

// WorkflowRuntimeMigrations returns the workflow runtime migration set.
func WorkflowRuntimeMigrations() fs.FS {
	return migrationSubset(
		"0003_workflows.up.sql",
		"0003_workflows.down.sql",
		"0005_workflow_revisions.up.sql",
		"0005_workflow_revisions.down.sql",
		"0006_workflow_authoring.up.sql",
		"0006_workflow_authoring.down.sql",
		"sqlite/0004_workflow_bindings_active_unique.up.sql",
		"sqlite/0004_workflow_bindings_active_unique.down.sql",
		"postgres/0004_workflow_bindings_active_unique.up.sql",
		"postgres/0004_workflow_bindings_active_unique.down.sql",
	)
}

func migrationSubset(paths ...string) fs.FS {
	if len(paths) == 0 {
		return fstest.MapFS{}
	}
	out := fstest.MapFS{}
	for _, path := range paths {
		path = strings.TrimSpace(path)
		if path == "" || path == "." || !fs.ValidPath(path) {
			continue
		}
		data, err := fs.ReadFile(embeddedFS, "sql/migrations/"+path)
		if err != nil {
			continue
		}
		out[path] = &fstest.MapFile{Data: data}
	}
	return out
}

// TranslationFlowMigrations returns the translation-flow migration set.
func TranslationFlowMigrations() fs.FS {
	return migrationSubset(
		"0007_translation_flow_foundation.up.sql",
		"0007_translation_flow_foundation.down.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0009_translation_exchange_runtime.down.sql",
		"0010_translation_flow_admin_fields.up.sql",
		"0010_translation_flow_admin_fields.down.sql",
		"0012_translation_performance_indexes.up.sql",
		"0012_translation_performance_indexes.down.sql",
		"0014_translation_assignment_assigned_at.up.sql",
		"0014_translation_assignment_assigned_at.down.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.up.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.down.sql",
		"postgres/0008_translation_flow_pg_features.up.sql",
		"postgres/0008_translation_flow_pg_features.down.sql",
		"postgres/0009_translation_exchange_runtime.up.sql",
		"postgres/0009_translation_exchange_runtime.down.sql",
		"postgres/0010_translation_flow_admin_fields.up.sql",
		"postgres/0010_translation_flow_admin_fields.down.sql",
		"postgres/0011_translation_flow_assignment_variant_fk.up.sql",
		"postgres/0011_translation_flow_assignment_variant_fk.down.sql",
		"postgres/0014_translation_assignment_assigned_at.up.sql",
		"postgres/0014_translation_assignment_assigned_at.down.sql",
	)
}

// TranslationFlowSQLiteMigrations returns the sqlite-specific translation-flow
// migrations for local runtimes.
func TranslationFlowSQLiteMigrations() fs.FS {
	return migrationSubset(
		"0007_translation_flow_foundation.up.sql",
		"0007_translation_flow_foundation.down.sql",
		"0009_translation_exchange_runtime.up.sql",
		"0009_translation_exchange_runtime.down.sql",
		"0010_translation_flow_admin_fields.up.sql",
		"0010_translation_flow_admin_fields.down.sql",
		"0012_translation_performance_indexes.up.sql",
		"0012_translation_performance_indexes.down.sql",
		"0014_translation_assignment_assigned_at.up.sql",
		"0014_translation_assignment_assigned_at.down.sql",
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.up.sql",
		"sqlite/0011_translation_flow_assignment_variant_fk.down.sql",
	)
}
