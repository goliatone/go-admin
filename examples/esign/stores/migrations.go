package stores

import (
	"io/fs"

	esigndata "github.com/goliatone/go-admin/examples/esign/data"
	persistence "github.com/goliatone/go-persistence-bun"
)

// AppLocalMigrationsFS returns the e-sign app-local migration root filesystem.
func AppLocalMigrationsFS() (fs.FS, error) {
	return esigndata.AppLocalMigrationsFS()
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
		persistence.WithDialectSourceLabel("examples/esign"),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	return nil
}
