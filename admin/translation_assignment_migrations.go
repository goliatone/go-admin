package admin

import (
	"embed"
	"io/fs"
)

//go:embed data/sql/migrations/*.sql data/sql/migrations/sqlite/*.sql data/sql/migrations/postgres/*.sql
var translationAssignmentMigrationsFS embed.FS

// GetTranslationAssignmentMigrationsFS returns queue assignment migrations rooted at data/sql/migrations.
func GetTranslationAssignmentMigrationsFS() fs.FS {
	root, err := fs.Sub(translationAssignmentMigrationsFS, "data/sql/migrations")
	if err != nil {
		return translationAssignmentMigrationsFS
	}
	return root
}
