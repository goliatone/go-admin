package data

import (
	"embed"
	"io/fs"
)

//go:embed sql/migrations/*.sql sql/migrations/sqlite/*.sql sql/migrations/postgres/*.sql
var migrationsFS embed.FS

// AppLocalMigrationsFS returns the e-sign app-local migration root filesystem.
func AppLocalMigrationsFS() (fs.FS, error) {
	return fs.Sub(migrationsFS, "sql/migrations")
}
