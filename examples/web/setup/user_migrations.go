package setup

import (
	"io/fs"
	"path"
	"strings"
	"testing/fstest"

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
	migrationsFS, err := fs.Sub(users.MigrationsFS, "data/sql/migrations")
	if err != nil {
		return err
	}
	overlay, err := buildGoUsersMigrationOverlay(migrationsFS)
	if err != nil {
		return err
	}
	client.RegisterDialectMigrations(
		overlay,
		persistence.WithDialectSourceLabel("go-users"),
		persistence.WithValidationTargets("postgres", "sqlite"),
	)
	return nil
}

// buildGoUsersMigrationOverlay filters out go-users migrations that overlap go-auth.
func buildGoUsersMigrationOverlay(root fs.FS) (fs.FS, error) {
	if root == nil {
		return nil, nil
	}

	skipPrefixes := map[string]struct{}{
		"00001": {},
		"00002": {},
	}
	files := fstest.MapFS{}
	if err := fs.WalkDir(root, ".", func(entryPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(strings.ToLower(entryPath), ".sql") {
			return nil
		}
		base := path.Base(entryPath)
		prefix, _, ok := splitMigrationBase(base)
		if !ok {
			return nil
		}
		if _, skip := skipPrefixes[prefix]; skip {
			return nil
		}

		data, err := fs.ReadFile(root, entryPath)
		if err != nil {
			return err
		}
		files[entryPath] = &fstest.MapFile{
			Data: data,
			Mode: 0o644,
		}
		return nil
	}); err != nil {
		return nil, err
	}

	return files, nil
}

func splitMigrationBase(base string) (string, string, bool) {
	parts := strings.SplitN(base, "_", 2)
	if len(parts) != 2 {
		return "", "", false
	}
	return parts[0], parts[1], true
}
