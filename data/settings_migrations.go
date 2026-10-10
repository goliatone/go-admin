package data

import (
	"embed"
	"io/fs"
)

//go:embed sql/settings/*.sql
var settingsMigrations embed.FS

// SettingsDocumentMigrations returns the portable SQLite/PostgreSQL document
// migrations. Hosts install these in their ordered migration lifecycle.
func SettingsDocumentMigrations() fs.FS {
	source, err := fs.Sub(settingsMigrations, "sql/settings")
	if err != nil {
		panic(err)
	}
	return source
}
