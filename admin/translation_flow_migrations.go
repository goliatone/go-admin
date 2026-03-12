package admin

import (
	admindata "github.com/goliatone/go-admin/data"
	"io/fs"
)

// GetTranslationFlowMigrationsFS returns the full Phase 2 translation-flow migration set.
func GetTranslationFlowMigrationsFS() fs.FS {
	return admindata.TranslationFlowMigrations()
}

// GetTranslationFlowSQLiteMigrationsFS returns the sqlite-compatible Phase 2 translation-flow migrations.
func GetTranslationFlowSQLiteMigrationsFS() fs.FS {
	return admindata.TranslationFlowSQLiteMigrations()
}
