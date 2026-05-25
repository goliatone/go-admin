package admin

import (
	"io/fs"

	admindata "github.com/goliatone/go-admin/data"
)

// GetTranslationAssignmentMigrationsFS returns the legacy queue assignment migration set.
func GetTranslationAssignmentMigrationsFS() fs.FS {
	return admindata.TranslationAssignmentMigrations()
}
