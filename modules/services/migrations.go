package services

import (
	"fmt"
	"io/fs"
	"strings"

	auth "github.com/goliatone/go-auth"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	users "github.com/goliatone/go-users"
)

// Service migration source labels for dialect-aware registration.
const (
	ServiceMigrationsSourceLabelAuth     = "go-auth"
	ServiceMigrationsSourceLabelUsers    = "go-users"
	ServiceMigrationsSourceLabelServices = "go-services"
	ServiceMigrationsSourceLabelAppLocal = "app-local"
)

// ServiceMigrationsProfile controls which migration sources are registered.
type ServiceMigrationsProfile string

const (
	// ServiceMigrationsProfileServicesStack registers go-auth + go-users + go-services.
	ServiceMigrationsProfileServicesStack ServiceMigrationsProfile = "services-stack"
	// ServiceMigrationsProfileCombined registers go-auth + go-users only.
	ServiceMigrationsProfileCombined ServiceMigrationsProfile = "combined"
	// ServiceMigrationsProfileAuthOnly registers only go-auth migrations.
	ServiceMigrationsProfileAuthOnly ServiceMigrationsProfile = "auth-only"
)

// MigrationRegistration records an ordered migration registration step.
type MigrationRegistration struct {
	Label string `json:"label"`
}

// MigrationObserver receives ordered migration registration events.
type MigrationObserver func(MigrationRegistration)

// ServiceMigrationsOption customizes RegisterServiceMigrations behavior.
type ServiceMigrationsOption func(*serviceMigrationsOptions)

type serviceMigrationsOptions struct {
	profile ServiceMigrationsProfile

	enableAuth     *bool
	enableUsers    *bool
	enableServices *bool

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
	options := defaultServiceMigrationsOptions()
	applyServiceMigrationsOptions(&options, opts)
	enableAuth, enableUsers, enableServices, err := resolveServiceMigrationToggles(options)
	if err != nil {
		return err
	}
	orderedSources := make([]persistence.OrderedMigrationSource, 0, 3+len(options.appSources))
	sourceNameCounts := map[string]int{}
	if err := appendBuiltInServiceMigrationSources(&orderedSources, sourceNameCounts, options, enableAuth, enableUsers, enableServices); err != nil {
		return err
	}
	appendAppServiceMigrationSources(&orderedSources, sourceNameCounts, options)
	if len(orderedSources) == 0 {
		return nil
	}
	return client.RegisterOrderedMigrationSources(orderedSources...)
}

func defaultServiceMigrationsOptions() serviceMigrationsOptions {
	return serviceMigrationsOptions{
		profile:           ServiceMigrationsProfileServicesStack,
		authLabel:         ServiceMigrationsSourceLabelAuth,
		usersLabel:        ServiceMigrationsSourceLabelUsers,
		servicesLabel:     ServiceMigrationsSourceLabelServices,
		validationTargets: []string{"postgres", "sqlite"},
	}
}

func applyServiceMigrationsOptions(options *serviceMigrationsOptions, opts []ServiceMigrationsOption) {
	for _, opt := range opts {
		if opt != nil {
			opt(options)
		}
	}
}

func resolveServiceMigrationToggles(options serviceMigrationsOptions) (bool, bool, bool, error) {
	enableAuth, enableUsers, enableServices, err := resolveServiceMigrationsProfile(options.profile)
	if err != nil {
		return false, false, false, err
	}
	if options.enableAuth != nil {
		enableAuth = *options.enableAuth
	}
	if options.enableUsers != nil {
		enableUsers = *options.enableUsers
	}
	if options.enableServices != nil {
		enableServices = *options.enableServices
	}
	return enableAuth, enableUsers, enableServices, nil
}

func appendBuiltInServiceMigrationSources(orderedSources *[]persistence.OrderedMigrationSource, sourceNameCounts map[string]int, options serviceMigrationsOptions, enableAuth, enableUsers, enableServices bool) error {
	if enableAuth {
		if err := appendServiceMigrationSource(orderedSources, sourceNameCounts, options.authFS, auth.GetMigrationsFS(), options.authLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}
	if enableUsers {
		if err := appendServiceMigrationSource(orderedSources, sourceNameCounts, options.usersFS, users.GetCoreMigrationsFS(), options.usersLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}
	if enableServices {
		if err := appendServiceMigrationSource(orderedSources, sourceNameCounts, options.servicesFS, goservices.GetCoreMigrationsFS(), options.servicesLabel, options.validationTargets, options.observer); err != nil {
			return err
		}
	}
	return nil
}

func appendServiceMigrationSource(orderedSources *[]persistence.OrderedMigrationSource, sourceNameCounts map[string]int, customFS fs.FS, fallbackFS fs.FS, label string, validationTargets []string, observer MigrationObserver) error {
	migrationsFS, err := resolveMigrationFS(customFS, fallbackFS, "data/sql/migrations")
	if err != nil {
		return err
	}
	appendOrderedMigrationSource(orderedSources, sourceNameCounts, migrationsFS, label, validationTargets, observer)
	return nil
}

func appendAppServiceMigrationSources(orderedSources *[]persistence.OrderedMigrationSource, sourceNameCounts map[string]int, options serviceMigrationsOptions) {
	for _, source := range options.appSources {
		if source.Filesystem == nil {
			continue
		}
		label := strings.TrimSpace(source.Label)
		if label == "" {
			label = ServiceMigrationsSourceLabelAppLocal
		}
		appendOrderedMigrationSource(orderedSources, sourceNameCounts, source.Filesystem, label, options.validationTargets, options.observer)
	}
}

// WithServiceMigrationsProfile sets the canonical service migration registration profile.
func WithServiceMigrationsProfile(profile ServiceMigrationsProfile) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			opts.profile = profile
		}
	}
}

// WithServiceMigrationsAuthEnabled toggles go-auth migration registration.
func WithServiceMigrationsAuthEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			value := enabled
			opts.enableAuth = &value
		}
	}
}

// WithServiceMigrationsUsersEnabled toggles go-users migration registration.
func WithServiceMigrationsUsersEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			value := enabled
			opts.enableUsers = &value
		}
	}
}

// WithServiceMigrationsServicesEnabled toggles go-services migration registration.
func WithServiceMigrationsServicesEnabled(enabled bool) ServiceMigrationsOption {
	return func(opts *serviceMigrationsOptions) {
		if opts != nil {
			value := enabled
			opts.enableServices = &value
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

func resolveServiceMigrationsProfile(profile ServiceMigrationsProfile) (bool, bool, bool, error) {
	switch ServiceMigrationsProfile(strings.TrimSpace(strings.ToLower(string(profile)))) {
	case "", ServiceMigrationsProfileServicesStack:
		return true, true, true, nil
	case ServiceMigrationsProfileCombined:
		return true, true, false, nil
	case ServiceMigrationsProfileAuthOnly:
		return true, false, false, nil
	default:
		return false, false, false, fmt.Errorf("modules/services: unsupported service migrations profile %q", profile)
	}
}

func appendOrderedMigrationSource(
	orderedSources *[]persistence.OrderedMigrationSource,
	sourceNameCounts map[string]int,
	migrationsFS fs.FS,
	label string,
	targets []string,
	observer MigrationObserver,
) {
	if migrationsFS == nil || orderedSources == nil {
		return
	}
	normalizedLabel := strings.TrimSpace(label)
	if normalizedLabel == "" {
		return
	}
	if observer != nil {
		observer(MigrationRegistration{Label: normalizedLabel})
	}
	migrationOptions := []persistence.DialectMigrationOption{
		persistence.WithDialectSourceLabel(normalizedLabel),
	}
	if len(targets) > 0 {
		migrationOptions = append(migrationOptions, persistence.WithValidationTargets(targets...))
	}
	*orderedSources = append(*orderedSources, persistence.OrderedMigrationSource{
		Name:    uniqueOrderedSourceName(normalizedLabel, sourceNameCounts),
		Root:    migrationsFS,
		Options: migrationOptions,
	})
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
