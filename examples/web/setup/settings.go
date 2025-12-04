package setup

import (
	"context"
	"fmt"

	"github.com/goliatone/go-admin/admin"
)

// SetupSettings configures settings definitions for the admin panel
func SetupSettings(adm *admin.Admin) {
	settings := adm.SettingsService()

	// General settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.name",
		Title:       "Site Name",
		Description: "Your website name",
		Default:     "My Website",
		Type:        "string",
		Group:       "general",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.description",
		Title:       "Site Description",
		Description: "Brief description of your website",
		Default:     "",
		Type:        "textarea",
		Group:       "general",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "site.url",
		Title:       "Site URL",
		Description: "Full URL of your website",
		Default:     "https://example.com",
		Type:        "string",
		Group:       "general",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
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
	})

	// Email settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.from_address",
		Title:       "From Email Address",
		Description: "Default sender email address",
		Default:     "noreply@example.com",
		Type:        "string",
		Group:       "email",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.from_name",
		Title:       "From Name",
		Description: "Default sender name",
		Default:     "My Website",
		Type:        "string",
		Group:       "email",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "email.smtp_host",
		Title:       "SMTP Host",
		Description: "SMTP server hostname",
		Default:     "smtp.example.com",
		Type:        "string",
		Group:       "email",
	})

	// Feature flags
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.comments_enabled",
		Title:       "Enable Comments",
		Description: "Allow users to comment on posts",
		Default:     true,
		Type:        "boolean",
		Group:       "features",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.registration_enabled",
		Title:       "Enable User Registration",
		Description: "Allow new users to register",
		Default:     true,
		Type:        "boolean",
		Group:       "features",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "features.maintenance_mode",
		Title:       "Maintenance Mode",
		Description: "Put site in maintenance mode",
		Default:     false,
		Type:        "boolean",
		Group:       "features",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:            "features.maintenance_message",
		Title:          "Maintenance Message",
		Description:    "Message displayed while maintenance mode is on",
		Default:        "We will be back shortly",
		Type:           "textarea",
		Group:          "features",
		VisibilityRule: "features.maintenance_mode == true",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
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
	})

	// Performance settings
	settings.RegisterDefinition(admin.SettingDefinition{
		Key:         "performance.cache_enabled",
		Title:       "Enable Caching",
		Description: "Enable response caching",
		Default:     true,
		Type:        "boolean",
		Group:       "performance",
	})
	settings.RegisterDefinition(admin.SettingDefinition{
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
	})

	// Apply default system values
	settings.Apply(context.Background(), admin.SettingsBundle{
		Scope: admin.SettingsScopeSystem,
		Values: map[string]any{
			"site.name":                     "Enterprise Admin",
			"site.url":                      "https://admin.example.com",
			"site.locale":                   "en",
			"features.comments_enabled":     true,
			"features.registration_enabled": true,
			"features.release_channel":      "stable",
		},
	})
}
