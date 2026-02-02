package quickstart

import "github.com/goliatone/go-admin/admin"

// PreferencesModuleOption customizes the Preferences module wiring in quickstart.
type PreferencesModuleOption func(*admin.PreferencesModule)

// NewPreferencesModule builds a Preferences module with quickstart defaults.
func NewPreferencesModule(cfg admin.Config, menuParent string, opts ...PreferencesModuleOption) admin.Module {
	mod := admin.NewPreferencesModule()
	if cfg.BasePath != "" {
		mod.WithBasePath(cfg.BasePath)
	}
	if menuParent != "" {
		mod.WithMenuParent(menuParent)
	}
	for _, opt := range opts {
		if opt != nil {
			opt(mod)
		}
	}
	return mod
}

// WithPreferencesSchemaPath overrides the preferences form schema path.
func WithPreferencesSchemaPath(path string) PreferencesModuleOption {
	return func(mod *admin.PreferencesModule) {
		if mod == nil {
			return
		}
		mod.WithSchemaPath(path)
	}
}

// WithPreferencesJSONEditorStrict toggles client-side JSON editor strictness.
func WithPreferencesJSONEditorStrict(strict bool) PreferencesModuleOption {
	return func(mod *admin.PreferencesModule) {
		if mod == nil {
			return
		}
		mod.WithJSONEditorStrict(strict)
	}
}
