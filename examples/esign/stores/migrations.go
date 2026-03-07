package stores

import (
	"embed"
	"io/fs"

	persistence "github.com/goliatone/go-persistence-bun"
)

//go:embed data/sql/migrations/*.sql data/sql/migrations/sqlite/*.sql data/sql/migrations/postgres/*.sql
var migrationsFS embed.FS

// AppLocalMigrationsFS returns the e-sign app-local migration root filesystem.
func AppLocalMigrationsFS() (fs.FS, error) {
	return fs.Sub(migrationsFS, "data/sql/migrations")
}

// RegisterMigrations registers e-sign phase-1 dialect-aware migrations.
func RegisterMigrations(client *persistence.Client) error {
	if client == nil {
		return nil
	}
	root, err := AppLocalMigrationsFS()
	if err != nil {
		return err
	}
	client.RegisterDialectMigrations(
		root,
		persistence.WithDialectSourceLabel("examples/esign/stores"),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	return nil
}
