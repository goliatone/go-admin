package setup

import (
	"context"
	"log"

	"github.com/goliatone/go-admin/admin"
)

// SetupSettingsWithOptions swaps the settings backend to the go-options adapter.
func SetupSettingsWithOptions(adm *admin.Admin) {
	settings := adm.SettingsService()
	settings.UseAdapter(admin.NewGoOptionsSettingsAdapter())

	for _, def := range settingsDefinitions() {
		settings.RegisterDefinition(def)
	}

	if err := settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSystem,
		Values: defaultSystemSettings(),
	}); err != nil {
		log.Printf("go-options system settings failed: %v", err)
	}

	if err := settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSite,
		Values: goOptionsSiteOverrides(),
	}); err != nil {
		log.Printf("go-options site settings failed: %v", err)
	}
}

func goOptionsSiteOverrides() map[string]any {
	return map[string]any{
		"site.locale":              "en",
		"features.release_channel": "beta",
	}
}
