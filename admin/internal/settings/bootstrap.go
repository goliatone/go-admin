package settings

import "context"

// BootstrapConfig captures the inputs needed to derive default settings.
type BootstrapConfig struct {
	Title            string
	DefaultLocale    string
	Theme            string
	DashboardEnabled bool
	SearchEnabled    bool
}

// DefaultDefinition describes a basic setting definition used for bootstrap.
type DefaultDefinition struct {
	Key         string
	Title       string
	Description string
	Default     any
	Type        string
	Group       string
}

// DefaultDefinitions returns the bootstrap definitions and system-scoped values.
func DefaultDefinitions(cfg BootstrapConfig) ([]DefaultDefinition, map[string]any) {
	definitions := []DefaultDefinition{
		{Key: "admin.title", Title: "Admin Title", Description: "Displayed in headers", Default: cfg.Title, Type: "string", Group: "admin"},
		{Key: "admin.default_locale", Title: "Default Locale", Description: "Locale fallback for navigation and CMS content", Default: cfg.DefaultLocale, Type: "string", Group: "admin"},
		{Key: "admin.theme", Title: "Theme", Description: "Theme selection for admin UI", Default: cfg.Theme, Type: "string", Group: "appearance"},
		{Key: "admin.dashboard_enabled", Title: "Dashboard Enabled", Description: "Toggle dashboard widgets", Default: cfg.DashboardEnabled, Type: "boolean", Group: "features"},
		{Key: "admin.search_enabled", Title: "Search Enabled", Description: "Toggle global search", Default: cfg.SearchEnabled, Type: "boolean", Group: "features"},
	}

	systemValues := map[string]any{
		"admin.dashboard_enabled": cfg.DashboardEnabled,
		"admin.search_enabled":    cfg.SearchEnabled,
	}
	if cfg.Title != "" {
		systemValues["admin.title"] = cfg.Title
	}
	if cfg.DefaultLocale != "" {
		systemValues["admin.default_locale"] = cfg.DefaultLocale
	}
	if cfg.Theme != "" {
		systemValues["admin.theme"] = cfg.Theme
	}

	return definitions, systemValues
}

// BootstrapDefaults registers default settings definitions and applies system values.
func BootstrapDefaults(ctx context.Context, cfg BootstrapConfig, register func(DefaultDefinition), applySystem func(context.Context, map[string]any) error) error {
	defs, values := DefaultDefinitions(cfg)
	if register != nil {
		for _, def := range defs {
			register(def)
		}
	}
	if applySystem != nil && len(values) > 0 {
		return applySystem(ctx, values)
	}
	return nil
}
