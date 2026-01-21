package setup

import (
	"io/fs"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
)

func registerGoAuthMigrations(client *persistence.Client) error {
	if client == nil {
		return nil
	}
	migrationsFS, err := fs.Sub(auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		return err
	}
	client.RegisterDialectMigrations(
		migrationsFS,
		persistence.WithDialectSourceLabel("go-auth"),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	return nil
}

func registerGoUsersMigrations(client *persistence.Client) error {
	if client == nil {
		return nil
	}
	migrationsFS, err := fs.Sub(users.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		return err
	}
	client.RegisterDialectMigrations(
		migrationsFS,
		persistence.WithDialectSourceLabel("go-users"),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	return nil
}
