package services

import (
	"io/fs"
	"strings"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
)

// MigrationRegistration records an ordered migration registration step.
type MigrationRegistration struct {
	Label string
}

// MigrationObserver receives ordered migration registration events.
type MigrationObserver func(MigrationRegistration)

// ServiceMigrationsOption customizes RegisterServiceMigrations behavior.
type ServiceMigrationsOption func(*serviceMigrationsOptions)

type serviceMigrationsOptions struct {
	enableAuth     bool
	enableUsers    bool
	enableServices bool

	authFS     fs.FS
	usersFS    fs.FS
	servicesFS fs.FS

	authLabel     string
	usersLabel    string
	servicesLabel string

	validationTargets []string
	appSources        []AppMigrationSource
	observer          MigrationObserver
}

// RegisterServiceMigrations registers go-auth, go-users, and go-services migrations
// in dependency order. App-local sources are registered last.
func RegisterServiceMigrations(client *persistence.Client, opts ...ServiceMigrationsOption) error {
	if client == nil {
		return nil
	}

	options := serviceMigrationsOptions{
		enableAuth:        true,
		enableUsers:       true,
		enableServices:    true,
		authLabel:         "go-auth",
		usersLabel:        "go-users",
		servicesLabel:     "go-services",
		validationTargets: []string{"postgres", "sqlite"},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.enableAuth {
		migrationsFS, err := resolveMigrationFS(options.authFS, auth.GetMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.authLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	if options.enableUsers {
		migrationsFS, err := resolveMigrationFS(options.usersFS, users.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	if options.enableServices {
		migrationsFS, err := resolveMigrationFS(options.servicesFS, goservices.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.servicesLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	for _, source := range options.appSources {
		if source.Filesystem == nil {
			continue
		}
		label := strings.TrimSpace(source.Label)
		if label == "" {
			label = "app-local"
		}
		if err := registerDialectMigrations(client, source.Filesystem, label, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	return nil
}

// WithServiceMigrationsAuthEnabled toggles go-auth migration registration.
func WithServiceMigrationsAuthEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.enableAuth = enabled
		}
	}
}

// WithServiceMigrationsUsersEnabled toggles go-users migration registration.
func WithServiceMigrationsUsersEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.enableUsers = enabled
		}
	}
}

// WithServiceMigrationsServicesEnabled toggles go-services migration registration.
func WithServiceMigrationsServicesEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.enableServices = enabled
		}
	}
}

// WithServiceMigrationsAuthFS overrides the go-auth migrations filesystem.
func WithServiceMigrationsAuthFS(fsys fs.FS) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.authFS = fsys
		}
	}
}

// WithServiceMigrationsUsersFS overrides the go-users migrations filesystem.
func WithServiceMigrationsUsersFS(fsys fs.FS) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.usersFS = fsys
		}
	}
}

// WithServiceMigrationsServicesFS overrides the go-services migrations filesystem.
func WithServiceMigrationsServicesFS(fsys fs.FS) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.servicesFS = fsys
		}
	}
}

// WithServiceMigrationsValidationTargets overrides dialect validation targets.
func WithServiceMigrationsValidationTargets(targets ...string) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts == nil {
			return
		}
		next := make([]string, 0, len(targets))
		for _, target := range targets {
			trimmed := strings.TrimSpace(strings.ToLower(target))
			if trimmed == "" {
				continue
			}
			next = append(next, trimmed)
		}
		if len(next) == 0 {
			return
		}
		opts.validationTargets = next
	}
}

// WithServiceMigrationsAppSource appends an app-local dialect-aware migration source.
func WithServiceMigrationsAppSource(label string, fsys fs.FS) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts == nil || fsys == nil {
			return
		}
		opts.appSources = append(opts.appSources, AppMigrationSource{
			Label:      strings.TrimSpace(label),
			Filesystem: fsys,
		})
	}
}

// WithServiceMigrationsObserver captures ordered migration registration steps.
func WithServiceMigrationsObserver(observer MigrationObserver) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.observer = observer
		}
	}
}

func resolveMigrationFS(override fs.FS, fallback fs.FS, subdir string) (fs.FS, error) {
	if override != nil {
		return override, nil
	}
	if fallback == nil {
		return nil, nil
	}
	return fs.Sub(fallback, subdir)
}

func registerDialectMigrations(
	client *persistence.Client,
	migrationsFS fs.FS,
	label string,
	targets []string,
	observer MigrationObserver,
) error {
	if client == nil || migrationsFS == nil {
		return nil
	}
	if observer != nil {
		observer(MigrationRegistration{Label: strings.TrimSpace(label)})
	}
	options := []persistence.DialectMigrationOption{
		persistence.WithDialectSourceLabel(label),
	}
	if len(targets) > 0 {
		options = append(options, persistence.WithValidationTargets(targets...))
	}
	client.RegisterDialectMigrations(migrationsFS, options...)
	return nil
}
