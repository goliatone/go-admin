package quickstart

import (
	"io/fs"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
)

// UserMigrationsOption customizes user-related migrations registration.
type UserMigrationsOption func(*userMigrationsOptions)

type userMigrationsOptions struct {
	enableAuth               bool
	enableUsersCore          bool
	enableUsersAuthBootstrap bool
	enableUsersAuthExtras    bool

	authFS               fs.FS
	usersCoreFS          fs.FS
	usersAuthBootstrapFS fs.FS
	usersAuthExtrasFS    fs.FS

	authLabel               string
	usersCoreLabel          string
	usersAuthBootstrapLabel string
	usersAuthExtrasLabel    string

	validationTargets []string
}

// RegisterUserMigrations registers go-auth and go-users migrations with sensible defaults.
// By default it registers go-auth migrations plus go-users core migrations.
func RegisterUserMigrations(client *persistence.Client, opts ...UserMigrationsOption) error {
	if client == nil {
		return nil
	}

	options := userMigrationsOptions{
		enableAuth:               true,
		enableUsersCore:          true,
		enableUsersAuthBootstrap: false,
		enableUsersAuthExtras:    false,
		authLabel:                "go-auth",
		usersCoreLabel:           "go-users",
		usersAuthBootstrapLabel:  "go-users-auth",
		usersAuthExtrasLabel:     "go-users-auth-extras",
		validationTargets:        []string{"postgres", "sqlite"},
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
		if err := registerDialectMigrations(client, migrationsFS, options.authLabel, options.validationTargets); err != nil {
			return err
		}
	}

	if options.enableUsersAuthBootstrap {
		migrationsFS, err := resolveMigrationFS(options.usersAuthBootstrapFS, users.GetAuthBootstrapMigrationsFS(), "data/sql/migrations/auth")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersAuthBootstrapLabel, options.validationTargets); err != nil {
			return err
		}
	}

	if options.enableUsersAuthExtras {
		migrationsFS, err := resolveMigrationFS(options.usersAuthExtrasFS, users.GetAuthExtrasMigrationsFS(), "data/sql/migrations/auth_extras")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersAuthExtrasLabel, options.validationTargets); err != nil {
			return err
		}
	}

	if options.enableUsersCore {
		migrationsFS, err := resolveMigrationFS(options.usersCoreFS, users.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersCoreLabel, options.validationTargets); err != nil {
			return err
		}
	}

	return nil
}

// WithUserMigrationsAuthEnabled toggles go-auth migrations.
func WithUserMigrationsAuthEnabled(enabled bool) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.enableAuth = enabled
		}
	}
}

// WithUserMigrationsAuthFS overrides the go-auth migrations filesystem (rooted at data/sql/migrations).
func WithUserMigrationsAuthFS(fsys fs.FS) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.authFS = fsys
		}
	}
}

// WithUserMigrationsCoreEnabled toggles go-users core migrations.
func WithUserMigrationsCoreEnabled(enabled bool) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.enableUsersCore = enabled
		}
	}
}

// WithUserMigrationsCoreFS overrides the go-users core migrations filesystem (rooted at data/sql/migrations).
func WithUserMigrationsCoreFS(fsys fs.FS) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.usersCoreFS = fsys
		}
	}
}

// WithUserMigrationsAuthBootstrapEnabled toggles go-users auth bootstrap migrations.
func WithUserMigrationsAuthBootstrapEnabled(enabled bool) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.enableUsersAuthBootstrap = enabled
		}
	}
}

// WithUserMigrationsAuthBootstrapFS overrides go-users auth bootstrap migrations.
func WithUserMigrationsAuthBootstrapFS(fsys fs.FS) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.usersAuthBootstrapFS = fsys
		}
	}
}

// WithUserMigrationsAuthExtrasEnabled toggles go-users auth extras migrations.
func WithUserMigrationsAuthExtrasEnabled(enabled bool) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.enableUsersAuthExtras = enabled
		}
	}
}

// WithUserMigrationsAuthExtrasFS overrides go-users auth extras migrations.
func WithUserMigrationsAuthExtrasFS(fsys fs.FS) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.usersAuthExtrasFS = fsys
		}
	}
}

// WithUserMigrationsValidationTargets overrides validation targets used by go-persistence-bun.
func WithUserMigrationsValidationTargets(targets ...string) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.validationTargets = targets
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

func registerDialectMigrations(client *persistence.Client, migrationsFS fs.FS, label string, targets []string) error {
	if client == nil || migrationsFS == nil {
		return nil
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
