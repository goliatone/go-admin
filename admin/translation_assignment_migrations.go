package admin

import (
	admindata "github.com/goliatone/go-admin/data"
	"io/fs"
)

// GetTranslationAssignmentMigrationsFS returns queue assignment migrations from top-level data/sql/migrations.
func GetTranslationAssignmentMigrationsFS() fs.FS {
	return admindata.TranslationAssignmentMigrations()
}
