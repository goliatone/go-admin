package admin

// ModuleManifest captures identifying metadata and dependencies for a module.
// Labels/description keys are i18n-friendly and resolved by the host.
type ModuleManifest struct {
	ID             string
	NameKey        string
	DescriptionKey string
	Dependencies   []string
	FeatureFlags   []string
}

// ModuleContext is passed to modules so they can register panels, routes,
// commands, and other contributions against the admin orchestrator.
type ModuleContext struct {
	Admin  *Admin
	Locale string
}

// Module defines the minimal contract for pluggable slices.
// Modules should be registered before Admin.Initialize is called.
type Module interface {
	Manifest() ModuleManifest
	Register(ctx ModuleContext) error
}

// MenuContributor optionally lets a module contribute navigation items.
type MenuContributor interface {
	MenuItems(locale string) []MenuItem
}
