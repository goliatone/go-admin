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

// TranslationAssignmentMigrations returns queue assignment migrations rooted at sql/migrations.
func TranslationAssignmentMigrations() fs.FS {
	sub, err := fs.Sub(embeddedFS, "sql/migrations")
	if err != nil {
		return embeddedFS
	}
	return sub
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
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
		"postgres/0008_translation_flow_pg_features.up.sql",
		"postgres/0008_translation_flow_pg_features.down.sql",
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
		"sqlite/0008_translation_flow_active_unique.up.sql",
		"sqlite/0008_translation_flow_active_unique.down.sql",
	)
}
