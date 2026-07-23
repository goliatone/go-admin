package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-command"
)

// applyConfigDefaults fills deterministic defaults.
func applyConfigDefaults(cfg Config) Config {
	cfg = applyCMSAndSiteConfigDefaults(cfg)
	cfg = applyRoutingAndDebugConfigDefaults(cfg)
	cfg = applyPermissionConfigDefaults(cfg)
	cfg.MediaDelivery = normalizeMediaDeliveryConfig(cfg.MediaDelivery)
	cfg.EnhancedActions = normalizeEnhancedActionNegotiationConfig(cfg.EnhancedActions)
	cfg = applyThemeTokenConfigDefaults(cfg)
	cfg.Errors = normalizeErrorConfig(cfg.Errors, cfg.Debug)
	cfg = applyCommandConfigDefaults(cfg)
	return cfg
}

func applyCMSAndSiteConfigDefaults(cfg Config) Config {
	if cfg.CMS.GoCMSConfig == nil && cfg.CMSConfig != nil {
		cfg.CMS.GoCMSConfig = cfg.CMSConfig
	}
	if cfg.DefaultLocale == "" {
		cfg.DefaultLocale = "en"
	}
	if cfg.ThemeVariant == "" {
		cfg.ThemeVariant = "default"
	}
	if cfg.PreviewSecret == "" {
		cfg.PreviewSecret = "admin-preview-secret-change-me"
	}
	cfg.PreviewURLAllowedHosts = normalizePreviewURLAllowedHosts(cfg.PreviewURLAllowedHosts)
	if cfg.Site.AllowLocaleFallback == nil {
		allow := true
		cfg.Site.AllowLocaleFallback = &allow
	}
	if cfg.Site.ReadPermission == "" {
		cfg.Site.ReadPermission = PermAdminSiteRead
	}
	if cfg.Site.DraftReadPermission == "" {
		cfg.Site.DraftReadPermission = PermAdminSiteReadDrafts
	}
	if cfg.Site.ViewProfileOverridePermission == "" {
		cfg.Site.ViewProfileOverridePermission = PermAdminSiteViewProfileOverride
	}
	return cfg
}

func applyRoutingAndDebugConfigDefaults(cfg Config) Config {
	cfg.URLs = normalizeURLConfig(cfg.URLs, cfg.BasePath)
	cfg.Routing = routing.NormalizeConfig(cfg.Routing, routingRootDerivationInput(cfg))
	cfg.Debug = normalizeDebugConfig(cfg.Debug, adminBasePath(cfg))
	cfg.Routing = applyDefaultModuleRoutingConfig(cfg.Routing, cfg.Debug)
	return cfg
}

func applyPermissionConfigDefaults(cfg Config) Config {
	cfg = applySettingsPermissionDefaults(cfg)
	cfg = applyPreferencePermissionDefaults(cfg)
	cfg = applyIdentityPermissionDefaults(cfg)
	cfg = applyScopePermissionDefaults(cfg)
	cfg = applyContentPermissionDefaults(cfg)
	return cfg
}

func applySettingsPermissionDefaults(cfg Config) Config {
	cfg.SettingsPermission = EffectiveSettingsPermission(cfg)
	if cfg.SettingsUpdatePermission == "" {
		cfg.SettingsUpdatePermission = PermAdminSettingsEdit
	}
	if cfg.FeatureFlagsViewPermission == "" {
		cfg.FeatureFlagsViewPermission = PermAdminFeatureFlagsView
	}
	if cfg.FeatureFlagsUpdatePermission == "" {
		cfg.FeatureFlagsUpdatePermission = PermAdminFeatureFlagsUpdate
	}
	if cfg.NotificationsPermission == "" {
		cfg.NotificationsPermission = PermAdminNotificationsView
	}
	if cfg.NotificationsUpdatePermission == "" {
		cfg.NotificationsUpdatePermission = PermAdminNotificationsUpdate
	}
	if cfg.ActivityPermission == "" {
		cfg.ActivityPermission = PermAdminActivityView
	}
	return cfg
}

func applyPreferencePermissionDefaults(cfg Config) Config {
	cfg.PreferencesPermission = EffectivePreferencesPermission(cfg)
	if cfg.PreferencesUpdatePermission == "" {
		cfg.PreferencesUpdatePermission = PermAdminPreferencesEdit
	}
	if cfg.DashboardPreferencesPermission == "" {
		cfg.DashboardPreferencesPermission = cfg.PreferencesPermission
	}
	if cfg.DashboardPreferencesUpdatePermission == "" {
		cfg.DashboardPreferencesUpdatePermission = cfg.PreferencesUpdatePermission
	}
	if cfg.PreferencesManageTenantPermission == "" {
		cfg.PreferencesManageTenantPermission = PermAdminPreferencesManageTenant
	}
	if cfg.PreferencesManageOrgPermission == "" {
		cfg.PreferencesManageOrgPermission = PermAdminPreferencesManageOrg
	}
	if cfg.PreferencesManageSystemPermission == "" {
		cfg.PreferencesManageSystemPermission = PermAdminPreferencesManageSystem
	}
	return cfg
}

func applyIdentityPermissionDefaults(cfg Config) Config {
	cfg.ProfilePermission = EffectiveProfilePermission(cfg)
	if cfg.ProfileUpdatePermission == "" {
		cfg.ProfileUpdatePermission = PermAdminProfileEdit
	}
	if cfg.UsersPermission == "" {
		cfg.UsersPermission = PermAdminUsersView
	}
	if cfg.UsersCreatePermission == "" {
		cfg.UsersCreatePermission = PermAdminUsersCreate
	}
	if cfg.UsersImportPermission == "" {
		cfg.UsersImportPermission = PermAdminUsersImport
	}
	if cfg.UsersUpdatePermission == "" {
		cfg.UsersUpdatePermission = PermAdminUsersEdit
	}
	if cfg.UsersDeletePermission == "" {
		cfg.UsersDeletePermission = PermAdminUsersDelete
	}
	if cfg.RolesPermission == "" {
		cfg.RolesPermission = PermAdminRolesView
	}
	if cfg.RolesCreatePermission == "" {
		cfg.RolesCreatePermission = PermAdminRolesCreate
	}
	if cfg.RolesUpdatePermission == "" {
		cfg.RolesUpdatePermission = PermAdminRolesEdit
	}
	if cfg.RolesDeletePermission == "" {
		cfg.RolesDeletePermission = PermAdminRolesDelete
	}
	return cfg
}

// EffectiveSettingsPermission returns the permission enforced by settings
// routes and navigation when the caller leaves SettingsPermission unset.
func EffectiveSettingsPermission(cfg Config) string {
	return firstNonEmpty(strings.TrimSpace(cfg.SettingsPermission), PermAdminSettingsView)
}

// EffectivePreferencesPermission returns the permission enforced by
// preferences routes and navigation when the caller leaves it unset.
func EffectivePreferencesPermission(cfg Config) string {
	return firstNonEmpty(strings.TrimSpace(cfg.PreferencesPermission), PermAdminPreferencesView)
}

// EffectiveProfilePermission returns the permission enforced by profile routes
// and navigation when the caller leaves it unset.
func EffectiveProfilePermission(cfg Config) string {
	return firstNonEmpty(strings.TrimSpace(cfg.ProfilePermission), PermAdminProfileView)
}

func applyScopePermissionDefaults(cfg Config) Config {
	if cfg.TenantsPermission == "" {
		cfg.TenantsPermission = PermAdminTenantsView
	}
	if cfg.TenantsCreatePermission == "" {
		cfg.TenantsCreatePermission = PermAdminTenantsCreate
	}
	if cfg.TenantsUpdatePermission == "" {
		cfg.TenantsUpdatePermission = PermAdminTenantsEdit
	}
	if cfg.TenantsDeletePermission == "" {
		cfg.TenantsDeletePermission = PermAdminTenantsDelete
	}
	if cfg.OrganizationsPermission == "" {
		cfg.OrganizationsPermission = PermAdminOrganizationsView
	}
	if cfg.OrganizationsCreatePermission == "" {
		cfg.OrganizationsCreatePermission = PermAdminOrganizationsCreate
	}
	if cfg.OrganizationsUpdatePermission == "" {
		cfg.OrganizationsUpdatePermission = PermAdminOrganizationsEdit
	}
	if cfg.OrganizationsDeletePermission == "" {
		cfg.OrganizationsDeletePermission = PermAdminOrganizationsDelete
	}
	return cfg
}

func applyContentPermissionDefaults(cfg Config) Config {
	if cfg.MenuBuilderPermission == "" {
		cfg.MenuBuilderPermission = PermAdminMenusView
	}
	if cfg.MenuBuilderEditPermission == "" {
		cfg.MenuBuilderEditPermission = PermAdminMenusEdit
	}
	if cfg.MenuBuilderPublishPermission == "" {
		cfg.MenuBuilderPublishPermission = PermAdminMenusPublish
	}
	if cfg.MediaPermission == "" {
		cfg.MediaPermission = PermAdminMediaView
	}
	if cfg.MediaCreatePermission == "" {
		cfg.MediaCreatePermission = PermAdminMediaCreate
	}
	if cfg.MediaUpdatePermission == "" {
		cfg.MediaUpdatePermission = PermAdminMediaEdit
	}
	if cfg.MediaDeletePermission == "" {
		cfg.MediaDeletePermission = PermAdminMediaDelete
	}
	if cfg.JobsPermission == "" {
		cfg.JobsPermission = PermAdminJobsView
	}
	if cfg.JobsTriggerPermission == "" {
		cfg.JobsTriggerPermission = PermAdminJobsTrigger
	}
	return cfg
}

func applyThemeTokenConfigDefaults(cfg Config) Config {
	if cfg.ActivityActionLabels == nil {
		cfg.ActivityActionLabels = map[string]string{}
	}
	if strings.TrimSpace(cfg.ActivityActionLabels[DefaultEntryNavigationActivityAction]) == "" {
		cfg.ActivityActionLabels[DefaultEntryNavigationActivityAction] = "Navigation visibility updated"
	}
	if cfg.ThemeAssets == nil {
		cfg.ThemeAssets = map[string]string{}
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

func applyCommandConfigDefaults(cfg Config) Config {
	cfg.Commands.Execution.DefaultMode = command.NormalizeExecutionMode(cfg.Commands.Execution.DefaultMode)
	if cfg.Commands.Execution.DefaultMode == "" {
		cfg.Commands.Execution.DefaultMode = command.ExecutionModeInline
	}
	if cfg.Commands.Execution.PerCommand == nil {
		cfg.Commands.Execution.PerCommand = map[string]command.ExecutionMode{}
	}
	cfg.Commands.RPC = applyRPCCommandConfigDefaults(cfg.Commands.RPC)
	return cfg
}

func applyDefaultModuleRoutingConfig(cfg routing.Config, debugCfg DebugConfig) routing.Config {
	if cfg.Modules == nil {
		cfg.Modules = map[string]routing.ModuleConfig{}
	}
	defaults := map[string]routing.ModuleMountOverride{
		featureFlagsModuleID: {
			UIBase: joinBasePath(cfg.Roots.AdminRoot, "feature-flags"),
		},
		usersModuleID: {
			UIBase: cfg.Roots.AdminRoot,
		},
		contentTypeBuilderModuleID: {
			UIBase: joinBasePath(cfg.Roots.AdminRoot, "content"),
		},
		debugRoutingSlug: {
			UIBase: normalizeBasePath(debugCfg.BasePath),
		},
	}

	for slug, mount := range defaults {
		moduleCfg := cfg.Modules[slug]
		if strings.TrimSpace(moduleCfg.Mount.UIBase) == "" {
			moduleCfg.Mount.UIBase = mount.UIBase
		}
		if strings.TrimSpace(moduleCfg.Mount.APIBase) == "" && strings.TrimSpace(mount.APIBase) != "" {
			moduleCfg.Mount.APIBase = mount.APIBase
		}
		if strings.TrimSpace(moduleCfg.Mount.PublicAPIBase) == "" && strings.TrimSpace(mount.PublicAPIBase) != "" {
			moduleCfg.Mount.PublicAPIBase = mount.PublicAPIBase
		}
		cfg.Modules[slug] = moduleCfg
	}

	return cfg
}
