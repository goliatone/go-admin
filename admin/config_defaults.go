package admin

// applyConfigDefaults normalizes feature flags and fills deterministic defaults.
func applyConfigDefaults(cfg Config) Config {
	cfg.normalizeFeatures()

	if cfg.DefaultLocale == "" {
		cfg.DefaultLocale = "en"
	}
	if cfg.ThemeVariant == "" {
		cfg.ThemeVariant = "default"
	}

	if cfg.SettingsPermission == "" {
		cfg.SettingsPermission = "admin.settings.view"
	}
	if cfg.SettingsUpdatePermission == "" {
		cfg.SettingsUpdatePermission = "admin.settings.edit"
	}
	if cfg.NotificationsPermission == "" {
		cfg.NotificationsPermission = "admin.notifications.view"
	}
	if cfg.NotificationsUpdatePermission == "" {
		cfg.NotificationsUpdatePermission = "admin.notifications.update"
	}
	if cfg.PreferencesPermission == "" {
		cfg.PreferencesPermission = "admin.preferences.view"
	}
	if cfg.PreferencesUpdatePermission == "" {
		cfg.PreferencesUpdatePermission = "admin.preferences.edit"
	}
	if cfg.PreferencesManageTenantPermission == "" {
		cfg.PreferencesManageTenantPermission = "admin.preferences.manage_tenant"
	}
	if cfg.PreferencesManageOrgPermission == "" {
		cfg.PreferencesManageOrgPermission = "admin.preferences.manage_org"
	}
	if cfg.PreferencesManageSystemPermission == "" {
		cfg.PreferencesManageSystemPermission = "admin.preferences.manage_system"
	}
	if cfg.ProfilePermission == "" {
		cfg.ProfilePermission = "admin.profile.view"
	}
	if cfg.ProfileUpdatePermission == "" {
		cfg.ProfileUpdatePermission = "admin.profile.edit"
	}
	if cfg.UsersPermission == "" {
		cfg.UsersPermission = "admin.users.view"
	}
	if cfg.UsersCreatePermission == "" {
		cfg.UsersCreatePermission = "admin.users.create"
	}
	if cfg.UsersUpdatePermission == "" {
		cfg.UsersUpdatePermission = "admin.users.edit"
	}
	if cfg.UsersDeletePermission == "" {
		cfg.UsersDeletePermission = "admin.users.delete"
	}
	if cfg.RolesPermission == "" {
		cfg.RolesPermission = "admin.roles.view"
	}
	if cfg.RolesCreatePermission == "" {
		cfg.RolesCreatePermission = "admin.roles.create"
	}
	if cfg.RolesUpdatePermission == "" {
		cfg.RolesUpdatePermission = "admin.roles.edit"
	}
	if cfg.RolesDeletePermission == "" {
		cfg.RolesDeletePermission = "admin.roles.delete"
	}
	if cfg.TenantsPermission == "" {
		cfg.TenantsPermission = "admin.tenants.view"
	}
	if cfg.TenantsCreatePermission == "" {
		cfg.TenantsCreatePermission = "admin.tenants.create"
	}
	if cfg.TenantsUpdatePermission == "" {
		cfg.TenantsUpdatePermission = "admin.tenants.edit"
	}
	if cfg.TenantsDeletePermission == "" {
		cfg.TenantsDeletePermission = "admin.tenants.delete"
	}
	if cfg.OrganizationsPermission == "" {
		cfg.OrganizationsPermission = "admin.organizations.view"
	}
	if cfg.OrganizationsCreatePermission == "" {
		cfg.OrganizationsCreatePermission = "admin.organizations.create"
	}
	if cfg.OrganizationsUpdatePermission == "" {
		cfg.OrganizationsUpdatePermission = "admin.organizations.edit"
	}
	if cfg.OrganizationsDeletePermission == "" {
		cfg.OrganizationsDeletePermission = "admin.organizations.delete"
	}
	if cfg.JobsPermission == "" {
		cfg.JobsPermission = "admin.jobs.view"
	}
	if cfg.JobsTriggerPermission == "" {
		cfg.JobsTriggerPermission = "admin.jobs.trigger"
	}

	if cfg.SettingsThemeTokens == nil {
		cfg.SettingsThemeTokens = map[string]string{}
	}
	if cfg.ThemeTokens == nil {
		cfg.ThemeTokens = map[string]string{}
	}

	if cfg.BasePath != "" {
		cfg.SettingsThemeTokens["base_path"] = cfg.BasePath
		cfg.ThemeTokens["base_path"] = cfg.BasePath
	}
	if cfg.Theme != "" {
		cfg.SettingsThemeTokens["theme"] = cfg.Theme
		if _, ok := cfg.ThemeTokens["theme"]; !ok {
			cfg.ThemeTokens["theme"] = cfg.Theme
		}
	}
	for k, v := range cfg.SettingsThemeTokens {
		if _, ok := cfg.ThemeTokens[k]; !ok {
			cfg.ThemeTokens[k] = v
		}
	}

	return cfg
}
