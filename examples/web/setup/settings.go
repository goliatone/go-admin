package setup

import (
	"context"
	"fmt"

	"github.com/goliatone/go-admin/pkg/admin"
)

// SetupSettings configures settings definitions for the admin panel.
func SetupSettings(adm *admin.Admin) {
	settings := adm.SettingsService()

	for _, def := range settingsDefinitions() {
		settings.RegisterDefinition(def)
	}

	settings.Apply(context.Background(), admin.SettingsBundle{
		Scope:  admin.SettingsScopeSystem,
		Values: defaultSystemSettings(),
	})
}

func settingsDefinitions() []admin.SettingDefinition {
	return []admin.SettingDefinition{
		{
			Key:         "site.name",
			Title:       "Site Name",
			Description: "Your website name",
			Default:     "My Website",
			Type:        "string",
			Group:       "general",
		},
		{
			Key:         "site.description",
			Title:       "Site Description",
			Description: "Brief description of your website",
			Default:     "",
			Type:        "textarea",
			Group:       "general",
		},
		{
			Key:         "site.url",
			Title:       "Site URL",
			Description: "Full URL of your website",
			Default:     "https://example.com",
			Type:        "string",
			Group:       "general",
		},
		{
			Key:           "site.locale",
			Title:         "Default Locale",
			Description:   "Default language for the site",
			Default:       "en",
			Type:          "string",
			Group:         "general",
			AllowedScopes: []admin.SettingsScope{admin.SettingsScopeSystem, admin.SettingsScopeSite},
			OptionsProvider: func(ctx context.Context) ([]admin.SettingOption, error) {
				return []admin.SettingOption{
					{Label: "English", Value: "en"},
					{Label: "Spanish", Value: "es"},
					{Label: "Greek", Value: "el"},
				}, nil
			},
		},
		{
			Key:         "email.from_address",
			Title:       "From Email Address",
			Description: "Default sender email address",
			Default:     "noreply@example.com",
			Type:        "string",
			Group:       "email",
		},
		{
			Key:         "email.from_name",
			Title:       "From Name",
			Description: "Default sender name",
			Default:     "My Website",
			Type:        "string",
			Group:       "email",
		},
		{
			Key:         "email.smtp_host",
			Title:       "SMTP Host",
			Description: "SMTP server hostname",
			Default:     "smtp.example.com",
			Type:        "string",
		},
		{
			Key:         "features.comments_enabled",
			Title:       "Enable Comments",
			Description: "Allow users to comment on posts",
			Default:     true,
			Type:        "boolean",
			Group:       "features",
		},
		{
			Key:         "features.registration_enabled",
			Title:       "Enable User Registration",
			Description: "Allow new users to register",
			Default:     true,
			Type:        "boolean",
			Group:       "features",
		},
		{
			Key:         "features.maintenance_mode",
			Title:       "Maintenance Mode",
			Description: "Put site in maintenance mode",
			Default:     false,
			Type:        "boolean",
			Group:       "features",
		},
		{
			Key:            "features.maintenance_message",
			Title:          "Maintenance Message",
			Description:    "Message displayed while maintenance mode is on",
			Default:        "We will be back shortly",
			Type:           "textarea",
			Group:          "features",
			VisibilityRule: "features.maintenance_mode == true",
		},
		{
			Key:         "features.release_channel",
			Title:       "Release Channel",
			Description: "Pick the rollout channel",
			Default:     "stable",
			Type:        "string",
			Group:       "features",
			Options: []admin.SettingOption{
				{Label: "Stable", Value: "stable"},
				{Label: "Beta", Value: "beta"},
			},
		},
		{
			Key:         "performance.cache_enabled",
			Title:       "Enable Caching",
			Description: "Enable response caching",
			Default:     true,
			Type:        "boolean",
			Group:       "performance",
		},
		{
			Key:         "performance.cache_ttl",
			Title:       "Cache TTL (seconds)",
			Description: "How long to cache responses",
			Default:     3600,
			Type:        "number",
			Group:       "performance",
			Validator: func(ctx context.Context, value any) error {
				switch v := value.(type) {
				case int:
					if v <= 0 {
						return fmt.Errorf("must be positive")
					}
				case int64:
					if v <= 0 {
						return fmt.Errorf("must be positive")
					}
				case float64:
					if v <= 0 {
						return fmt.Errorf("must be positive")
					}
				}
				return nil
			},
		},
	}
}

func defaultSystemSettings() map[string]any {
	return map[string]any{
		"site.name":                     "Enterprise Admin",
		"site.url":                      "https://admin.example.com",
		"site.locale":                   "en",
		"features.comments_enabled":     true,
		"features.registration_enabled": true,
		"features.release_channel":      "stable",
	}
}
