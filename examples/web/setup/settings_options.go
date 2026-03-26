package setup

import (
	"context"

	weblog "github.com/goliatone/go-admin/examples/web/internal/logging"
	"github.com/goliatone/go-admin/pkg/admin"
)

// SetupSettingsWithOptions swaps the settings backend to the go-options adapter.
func SetupSettingsWithOptions(adm *admin.Admin) {
	settings := adm.SettingsService()

	for _, def := range settingsDefinitions() {
		settings.RegisterDefinition(def)
	}

	if err := settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSystem,
		Values: defaultSystemSettings(),
	}); err != nil {
		weblog.Named("examples.web.settings").Warn("go-options system settings failed", "error", err)
	}

	if err := settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSite,
		Values: goOptionsSiteOverrides(),
	}); err != nil {
		weblog.Named("examples.web.settings").Warn("go-options site settings failed", "error", err)
	}
}

func goOptionsSiteOverrides() map[string]any {
	return map[string]any{
		"site.locale":              "en",
		"features.release_channel": "beta",
	}
}
