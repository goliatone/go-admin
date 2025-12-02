package setup

import (
	"context"

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
	})

	// Apply default system values
	settings.Apply(context.Background(), admin.SettingsBundle{
		Scope: admin.SettingsScopeSystem,
		Values: map[string]any{
			"site.name":                     "Enterprise Admin",
			"site.url":                      "https://admin.example.com",
			"features.comments_enabled":     true,
			"features.registration_enabled": true,
		},
	})
}
