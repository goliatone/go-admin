package quickstart

import "github.com/goliatone/go-admin/admin"

// FeatureGatesFromConfig builds feature gates from typed features plus flag overrides.
func FeatureGatesFromConfig(cfg admin.Config) admin.FeatureGates {
	flags := map[string]bool{
		string(admin.FeatureDashboard):     cfg.Features.Dashboard,
		string(admin.FeatureSearch):        cfg.Features.Search,
		string(admin.FeatureExport):        cfg.Features.Export,
		string(admin.FeatureCMS):           cfg.Features.CMS,
		string(admin.FeatureJobs):          cfg.Features.Jobs,
		string(admin.FeatureCommands):      cfg.Features.Commands,
		string(admin.FeatureSettings):      cfg.Features.Settings,
		string(admin.FeatureNotifications): cfg.Features.Notifications,
		string(admin.FeatureMedia):         cfg.Features.Media,
		string(admin.FeatureBulk):          cfg.Features.Bulk,
		string(admin.FeaturePreferences):   cfg.Features.Preferences,
		string(admin.FeatureProfile):       cfg.Features.Profile,
		string(admin.FeatureUsers):         cfg.Features.Users,
		string(admin.FeatureTenants):       cfg.Features.Tenants,
		string(admin.FeatureOrganizations): cfg.Features.Organizations,
	}
	for key, value := range cfg.FeatureFlags {
		if current, ok := flags[key]; ok {
			if !current && value {
				flags[key] = true
			}
			continue
		}
		flags[key] = value
	}
	return admin.NewFeatureGates(flags)
}
