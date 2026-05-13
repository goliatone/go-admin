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

const (
	userMigrationsSourceKeyAuth               = "go-auth"
	userMigrationsSourceKeyUsersCore          = "go-users"
	userMigrationsSourceKeyUsersAuthBootstrap = "go-users-auth"
	userMigrationsSourceKeyUsersAuthExtras    = "go-users-auth-extras"

	userMigrationsSourceOrderAuth               = 10
	userMigrationsSourceOrderUsersAuthBootstrap = 20
	userMigrationsSourceOrderUsersAuthExtras    = 30
	userMigrationsSourceOrderUsersCore          = 40
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
	Label string `json:"label"`
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

	enabled, err := resolveUserMigrationEnabledSources(options)
	if err != nil {
		return err
	}

	orderedSources := make([]persistence.OrderedMigrationSource, 0, 4)
	sourceNameCounts := map[string]int{}
	for _, source := range userMigrationSourceSpecs(options, enabled) {
		if !source.enabled {
			continue
		}
		migrationsFS, err := resolveMigrationFS(source.overrideFS, source.defaultFS, source.subdir)
		if err != nil {
			return err
		}
		appendStableOrderedMigrationSource(&orderedSources, sourceNameCounts, migrationsFS, source.label, source.sourceKey, source.order, source.dependsOn, options.validationTargets, options.observer)
	}

	if len(orderedSources) == 0 {
		return nil
	}
	return client.RegisterOrderedMigrationSources(orderedSources...)
}

type userMigrationEnabledSources struct {
	auth               bool
	usersCore          bool
	usersAuthBootstrap bool
	usersAuthExtras    bool
}

type userMigrationSourceSpec struct {
	enabled    bool
	overrideFS fs.FS
	defaultFS  fs.FS
	subdir     string
	label      string
	sourceKey  string
	order      int
	dependsOn  []string
}

func resolveUserMigrationEnabledSources(options userMigrationsOptions) (userMigrationEnabledSources, error) {
	enableAuth, enableUsersCore, enableUsersAuthBootstrap, enableUsersAuthExtras, err := resolveUserMigrationsProfile(options.profile)
	if err != nil {
		return userMigrationEnabledSources{}, err
	}
	enabled := userMigrationEnabledSources{
		auth:               enableAuth,
		usersCore:          enableUsersCore,
		usersAuthBootstrap: enableUsersAuthBootstrap,
		usersAuthExtras:    enableUsersAuthExtras,
	}
	if options.enableAuth != nil {
		enabled.auth = *options.enableAuth
	}
	if options.enableUsersCore != nil {
		enabled.usersCore = *options.enableUsersCore
	}
	if options.enableUsersAuthBootstrap != nil {
		enabled.usersAuthBootstrap = *options.enableUsersAuthBootstrap
	}
	if options.enableUsersAuthExtras != nil {
		enabled.usersAuthExtras = *options.enableUsersAuthExtras
	}
	return enabled, nil
}

func userMigrationSourceSpecs(options userMigrationsOptions, enabled userMigrationEnabledSources) []userMigrationSourceSpec {
	return []userMigrationSourceSpec{
		{enabled: enabled.auth, overrideFS: options.authFS, defaultFS: auth.GetMigrationsFS(), subdir: "data/sql/migrations", label: options.authLabel, sourceKey: userMigrationsSourceKeyAuth, order: userMigrationsSourceOrderAuth},
		{enabled: enabled.usersAuthBootstrap, overrideFS: options.usersAuthBootstrapFS, defaultFS: users.GetAuthBootstrapMigrationsFS(), subdir: "data/sql/migrations/auth", label: options.usersAuthBootstrapLabel, sourceKey: userMigrationsSourceKeyUsersAuthBootstrap, order: userMigrationsSourceOrderUsersAuthBootstrap},
		{enabled: enabled.usersAuthExtras, overrideFS: options.usersAuthExtrasFS, defaultFS: users.GetAuthExtrasMigrationsFS(), subdir: "data/sql/migrations/auth_extras", label: options.usersAuthExtrasLabel, sourceKey: userMigrationsSourceKeyUsersAuthExtras, order: userMigrationsSourceOrderUsersAuthExtras, dependsOn: userAuthExtrasDependencies(enabled)},
		{enabled: enabled.usersCore, overrideFS: options.usersCoreFS, defaultFS: users.GetCoreMigrationsFS(), subdir: "data/sql/migrations", label: options.usersCoreLabel, sourceKey: userMigrationsSourceKeyUsersCore, order: userMigrationsSourceOrderUsersCore, dependsOn: userCoreDependencies(enabled)},
	}
}

func userAuthExtrasDependencies(enabled userMigrationEnabledSources) []string {
	if enabled.usersAuthBootstrap {
		return []string{userMigrationsSourceKeyUsersAuthBootstrap}
	}
	return nil
}

func userCoreDependencies(enabled userMigrationEnabledSources) []string {
	if enabled.usersAuthExtras {
		return []string{userMigrationsSourceKeyUsersAuthExtras}
	}
	if enabled.usersAuthBootstrap {
		return []string{userMigrationsSourceKeyUsersAuthBootstrap}
	}
	if enabled.auth {
		return []string{userMigrationsSourceKeyAuth}
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

func appendStableOrderedMigrationSource(
	orderedSources *[]persistence.OrderedMigrationSource,
	sourceNameCounts map[string]int,
	migrationsFS fs.FS,
	label string,
	sourceKey string,
	order int,
	dependsOn []string,
	targets []string,
	observer UserMigrationObserver,
) {
	if migrationsFS == nil || orderedSources == nil {
		return
	}
	normalizedLabel := strings.TrimSpace(label)
	if normalizedLabel == "" {
		return
	}
	if observer != nil {
		observer(UserMigrationRegistration{Label: normalizedLabel})
	}
	migrationOptions := []persistence.DialectMigrationOption{
		persistence.WithDialectSourceLabel(normalizedLabel),
	}
	if len(targets) > 0 {
		migrationOptions = append(migrationOptions, persistence.WithValidationTargets(targets...))
	}
	sourceOptions := []persistence.OrderedMigrationSourceOption{
		persistence.WithOrderedMigrationDialectOptions(migrationOptions...),
	}
	if len(dependsOn) > 0 {
		sourceOptions = append(sourceOptions, persistence.WithOrderedMigrationDependencies(dependsOn...))
	}
	*orderedSources = append(*orderedSources, persistence.NewStableOrderedMigrationSource(
		uniqueOrderedSourceName(normalizedLabel, sourceNameCounts),
		migrationsFS,
		sourceKey,
		order,
		sourceOptions...,
	))
}

func uniqueOrderedSourceName(base string, sourceNameCounts map[string]int) string {
	trimmed := strings.TrimSpace(base)
	if trimmed == "" {
		trimmed = "source"
	}
	if sourceNameCounts == nil {
		return trimmed
	}
	key := strings.ToLower(trimmed)
	sourceNameCounts[key]++
	count := sourceNameCounts[key]
	if count <= 1 {
		return trimmed
	}
	return fmt.Sprintf("%s-%d", trimmed, count)
}
