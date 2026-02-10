package stores

import (
	"embed"
	"io/fs"

	persistence "github.com/goliatone/go-persistence-bun"
)

//go:embed data/sql/migrations/*.sql data/sql/migrations/sqlite/*.sql data/sql/migrations/postgres/*.sql
var migrationsFS embed.FS

// RegisterMigrations registers e-sign phase-1 dialect-aware migrations.
func RegisterMigrations(client *persistence.Client) error {
	if client == nil {
		return nil
	}
	root, err := fs.Sub(migrationsFS, "data/sql/migrations")
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
