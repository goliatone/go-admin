package quickstart

import (
	"fmt"
	"io/fs"
	"strings"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	users "github.com/goliatone/go-users"
)

// User migration source labels for dialect-aware registration.
const (
	UserMigrationsSourceLabelAuth               = "go-auth"
	UserMigrationsSourceLabelUsersCore          = "go-users"
	UserMigrationsSourceLabelUsersAuthBootstrap = "go-users-auth"
	UserMigrationsSourceLabelUsersAuthExtras    = "go-users-auth-extras"
)

// UserMigrationsProfile controls which migration sources are registered.
type UserMigrationsProfile string

const (
	// UserMigrationsProfileCombined registers go-auth plus go-users core migrations.
	UserMigrationsProfileCombined UserMigrationsProfile = "combined"
	// UserMigrationsProfileAuthOnly registers only go-auth migrations.
	UserMigrationsProfileAuthOnly UserMigrationsProfile = "auth-only"
	// UserMigrationsProfileUsersStandalone registers go-users standalone tracks.
	UserMigrationsProfileUsersStandalone UserMigrationsProfile = "users-standalone"
)

// UserMigrationRegistration records one ordered migration registration step.
type UserMigrationRegistration struct {
	Label string
}

// UserMigrationObserver receives ordered migration registration events.
type UserMigrationObserver func(UserMigrationRegistration)

// UserMigrationsOption customizes user-related migrations registration.
type UserMigrationsOption func(*userMigrationsOptions)

type userMigrationsOptions struct {
	profile UserMigrationsProfile

	enableAuth               *bool
	enableUsersCore          *bool
	enableUsersAuthBootstrap *bool
	enableUsersAuthExtras    *bool

	authFS               fs.FS
	usersCoreFS          fs.FS
	usersAuthBootstrapFS fs.FS
	usersAuthExtrasFS    fs.FS

	authLabel               string
	usersCoreLabel          string
	usersAuthBootstrapLabel string
	usersAuthExtrasLabel    string

	validationTargets []string
	observer          UserMigrationObserver
}

// RegisterUserMigrations registers go-auth and go-users migrations with sensible defaults.
// By default it registers go-auth migrations plus go-users core migrations.
func RegisterUserMigrations(client *persistence.Client, opts ...UserMigrationsOption) error {
	if client == nil {
		return nil
	}

	options := userMigrationsOptions{
		profile:                 UserMigrationsProfileCombined,
		authLabel:               UserMigrationsSourceLabelAuth,
		usersCoreLabel:          UserMigrationsSourceLabelUsersCore,
		usersAuthBootstrapLabel: UserMigrationsSourceLabelUsersAuthBootstrap,
		usersAuthExtrasLabel:    UserMigrationsSourceLabelUsersAuthExtras,
		validationTargets:       []string{"postgres", "sqlite"},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	enableAuth, enableUsersCore, enableUsersAuthBootstrap, enableUsersAuthExtras, err := resolveUserMigrationsProfile(options.profile)
	if err != nil {
		return err
	}
	if options.enableAuth != nil {
		enableAuth = *options.enableAuth
	}
	if options.enableUsersCore != nil {
		enableUsersCore = *options.enableUsersCore
	}
	if options.enableUsersAuthBootstrap != nil {
		enableUsersAuthBootstrap = *options.enableUsersAuthBootstrap
	}
	if options.enableUsersAuthExtras != nil {
		enableUsersAuthExtras = *options.enableUsersAuthExtras
	}

	if enableAuth {
		migrationsFS, err := resolveMigrationFS(options.authFS, auth.GetMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.authLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	if enableUsersAuthBootstrap {
		migrationsFS, err := resolveMigrationFS(options.usersAuthBootstrapFS, users.GetAuthBootstrapMigrationsFS(), "data/sql/migrations/auth")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersAuthBootstrapLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	if enableUsersAuthExtras {
		migrationsFS, err := resolveMigrationFS(options.usersAuthExtrasFS, users.GetAuthExtrasMigrationsFS(), "data/sql/migrations/auth_extras")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersAuthExtrasLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	if enableUsersCore {
		migrationsFS, err := resolveMigrationFS(options.usersCoreFS, users.GetCoreMigrationsFS(), "data/sql/migrations")
		if err != nil {
			return err
		}
		if err := registerDialectMigrations(client, migrationsFS, options.usersCoreLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}

	return nil
}

// WithUserMigrationsProfile sets the canonical user migration registration profile.
func WithUserMigrationsProfile(profile UserMigrationsProfile) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			opts.profile = profile
		}
	}
}

// WithUserMigrationsAuthEnabled toggles go-auth migrations.
func WithUserMigrationsAuthEnabled(enabled bool) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
		if opts != nil {
			value := enabled
			opts.enableAuth = &value
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
			value := enabled
			opts.enableUsersCore = &value
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
			value := enabled
			opts.enableUsersAuthBootstrap = &value
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
			value := enabled
			opts.enableUsersAuthExtras = &value
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

// WithUserMigrationsObserver captures ordered migration registration steps.
func WithUserMigrationsObserver(observer UserMigrationObserver) UserMigrationsOption {
	return func(opts *userMigrationsOptions) {
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

func resolveUserMigrationsProfile(profile UserMigrationsProfile) (bool, bool, bool, bool, error) {
	switch UserMigrationsProfile(strings.TrimSpace(strings.ToLower(string(profile)))) {
	case "", UserMigrationsProfileCombined:
		return true, true, false, false, nil
	case UserMigrationsProfileAuthOnly:
		return true, false, false, false, nil
	case UserMigrationsProfileUsersStandalone:
		return false, true, true, true, nil
	default:
		return false, false, false, false, fmt.Errorf("quickstart: unsupported user migrations profile %q", profile)
	}
}

func registerDialectMigrations(
	client *persistence.Client,
	migrationsFS fs.FS,
	label string,
	targets []string,
	observer UserMigrationObserver,
) error {
	if client == nil || migrationsFS == nil {
		return nil
	}
	normalizedLabel := strings.TrimSpace(label)
	if normalizedLabel == "" {
		return nil
	}
	if observer != nil {
		observer(UserMigrationRegistration{Label: normalizedLabel})
	}
	options := []persistence.DialectMigrationOption{
		persistence.WithDialectSourceLabel(normalizedLabel),
	}
	if len(targets) > 0 {
		options = append(options, persistence.WithValidationTargets(targets...))
	}
	client.RegisterDialectMigrations(migrationsFS, options...)
	return nil
}
