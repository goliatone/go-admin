package persistence

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing/fstest"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esigndata "github.com/goliatone/go-admin/examples/esign/data"
	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
)

const (
	migrationSourceLabelAuth     = "go-auth"
	migrationSourceLabelUsers    = "go-users"
	migrationSourceLabelServices = "go-services"
	migrationSourceLabelAppLocal = "app-local"
)

var defaultValidationTargets = []string{"postgres", "sqlite"}

type migrationRegistration struct {
	Label string `json:"label"`
}

type migrationObserver func(migrationRegistration)

type migrationRegistrationOptions struct {
	observer migrationObserver
}

type migrationRegistrationOption func(*migrationRegistrationOptions)

func withMigrationObserver(observer migrationObserver) migrationRegistrationOption {
	return func(opts *migrationRegistrationOptions) {
		if opts == nil {
			return
		}
		opts.observer = observer
	}
}

func registerOrderedSources(client *persistence.Client, cfg appcfg.Config, opts ...migrationRegistrationOption) error {
	if client == nil {
		return nil
	}

	options := migrationRegistrationOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	orderedSources := make([]persistence.OrderedMigrationSource, 0, 4)
	if !cfg.Persistence.Migrations.LocalOnly {
		if err := appendCoreMigrationSources(&orderedSources, cfg, options.observer); err != nil {
			return err
		}
	}

	appLocalRoot, err := resolveAppLocalMigrationFS(cfg)
	if err != nil {
		return err
	}
	appendOrderedSource(&orderedSources, migrationSourceLabelAppLocal, appLocalRoot, options.observer)

	if len(orderedSources) == 0 {
		return nil
	}
	return client.RegisterOrderedMigrationSources(orderedSources...)
}

func appendCoreMigrationSources(sources *[]persistence.OrderedMigrationSource, cfg appcfg.Config, observer migrationObserver) error {
	authRoot, err := resolveMigrationFS(auth.GetMigrationsFS(), "data/sql/migrations")
	if err != nil {
		return fmt.Errorf("resolve %s migrations: %w", migrationSourceLabelAuth, err)
	}
	appendOrderedSource(sources, migrationSourceLabelAuth, authRoot, observer)

	usersRoot, err := resolveMigrationFS(users.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		return fmt.Errorf("resolve %s migrations: %w", migrationSourceLabelUsers, err)
	}
	usersRoot, err = applyUsersMigrationOverlay(usersRoot)
	if err != nil {
		return fmt.Errorf("overlay %s migrations: %w", migrationSourceLabelUsers, err)
	}
	appendOrderedSource(sources, migrationSourceLabelUsers, usersRoot, observer)

	if !cfg.Services.ModuleEnabled {
		return nil
	}
	servicesRoot, err := resolveMigrationFS(goservices.GetCoreMigrationsFS(), "data/sql/migrations")
	if err != nil {
		return fmt.Errorf("resolve %s migrations: %w", migrationSourceLabelServices, err)
	}
	appendOrderedSource(sources, migrationSourceLabelServices, servicesRoot, observer)
	return nil
}

func appendOrderedSource(sources *[]persistence.OrderedMigrationSource, label string, root fs.FS, observer migrationObserver) {
	if sources == nil || root == nil {
		return
	}
	label = strings.TrimSpace(label)
	if label == "" {
		return
	}
	if observer != nil {
		observer(migrationRegistration{Label: label})
	}
	migrationOptions := []persistence.DialectMigrationOption{
		persistence.WithDialectSourceLabel(label),
		persistence.WithValidationTargets(defaultValidationTargets...),
		persistence.WithValidateOnMigrate(true),
	}
	*sources = append(*sources, persistence.OrderedMigrationSource{
		Name:    label,
		Root:    root,
		Options: migrationOptions,
	})
}

func resolveMigrationFS(source fs.FS, subdir string) (fs.FS, error) {
	if source == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(subdir)
	if trimmed == "" {
		return source, nil
	}
	return fs.Sub(source, trimmed)
}

func applyUsersMigrationOverlay(base fs.FS) (fs.FS, error) {
	if base == nil {
		return nil, nil
	}
	overlay, err := esigndata.GoUsersOverlayMigrationsFS()
	if err != nil {
		return nil, fmt.Errorf("resolve go-users overlay migrations: %w", err)
	}
	return mergeMigrationFS(base, overlay)
}

func mergeMigrationFS(base fs.FS, overlay fs.FS) (fs.FS, error) {
	if base == nil {
		return overlay, nil
	}
	if overlay == nil {
		return base, nil
	}
	merged := fstest.MapFS{}
	if err := copyMigrationFS(merged, base); err != nil {
		return nil, err
	}
	if err := copyMigrationFS(merged, overlay); err != nil {
		return nil, err
	}
	return merged, nil
}

func copyMigrationFS(dst fstest.MapFS, source fs.FS) error {
	return fs.WalkDir(source, ".", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d == nil || d.IsDir() {
			return nil
		}
		data, err := fs.ReadFile(source, path)
		if err != nil {
			return err
		}
		dst[path] = &fstest.MapFile{Data: data, Mode: 0o644}
		return nil
	})
}

func resolveAppLocalMigrationFS(cfg appcfg.Config) (fs.FS, error) {
	localDir := strings.TrimSpace(cfg.Persistence.Migrations.LocalDir)
	if localDir == "" {
		localDir = "data/sql/migrations"
	}
	localDir = filepath.Clean(localDir)

	candidates := []string{}
	if configPath := strings.TrimSpace(cfg.ConfigPath); configPath != "" {
		configDir := filepath.Dir(configPath)
		candidates = append(candidates, filepath.Join(configDir, "..", localDir))
	}
	candidates = append(candidates,
		filepath.Join("examples", "esign", localDir),
		localDir,
	)

	for _, candidate := range candidates {
		candidate = filepath.Clean(strings.TrimSpace(candidate))
		if candidate == "" {
			continue
		}
		info, err := os.Stat(candidate)
		if err != nil || !info.IsDir() {
			continue
		}
		return os.DirFS(candidate), nil
	}

	embeddedRoot, err := esigndata.AppLocalMigrationsFS()
	if err != nil {
		return nil, fmt.Errorf("resolve app-local migrations root %q: %w", localDir, err)
	}
	return embeddedRoot, nil
}
