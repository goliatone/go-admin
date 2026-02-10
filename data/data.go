package data

import (
	"embed"
	"io/fs"
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
