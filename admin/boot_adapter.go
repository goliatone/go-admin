package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// Boot runs the admin boot pipeline with the given steps or the defaults.
func (a *Admin) Boot(steps ...boot.Step) error {
	if len(steps) == 0 {
		steps = boot.DefaultBootSteps()
	}
	if err := boot.Run(a, steps...); err != nil {
		return err
	}
	return a.registerDebugDashboardRoutes()
}

// Router exposes the configured router for boot steps.
func (a *Admin) Router() boot.Router {
	return a.router
}

// PublicRouter exposes the configured admin router for module route registration.
func (a *Admin) PublicRouter() AdminRouter {
	return a.router
}

// AuthWrapper returns the configured auth wrapper for boot steps.
func (a *Admin) AuthWrapper() boot.HandlerWrapper {
	return a.authWrapper()
}

// BasePath exposes the configured base path.
func (a *Admin) BasePath() string {
	return a.config.BasePath
}

// URLs exposes the URL manager.
func (a *Admin) URLs() urlkit.Resolver {
	return a.urlManager
}

// DefaultLocale exposes the configured default locale.
func (a *Admin) DefaultLocale() string {
	return a.config.DefaultLocale
}

// NavMenuCode returns the default navigation menu code.
func (a *Admin) NavMenuCode() string {
	return a.navMenuCode
}

// Gates exposes feature gates.
func (a *Admin) Gates() boot.FeatureGates {
	return featureGatesAdapter{gate: a.featureGate}
}

// Responder exposes response helpers.
func (a *Admin) Responder() boot.Responder {
	return responderAdapter{}
}

// ParseBody parses JSON into a map.
func (a *Admin) ParseBody(c router.Context) (map[string]any, error) {
	return parseJSONBody(c)
}

// Panels exposes panel bindings.
func (a *Admin) Panels() []boot.PanelBinding {
	return newPanelBindings(a)
}

// BootDashboard exposes the dashboard binding.
func (a *Admin) BootDashboard() boot.DashboardBinding {
	return newDashboardBinding(a)
}

// BootNavigation exposes the navigation binding.
func (a *Admin) BootNavigation() boot.NavigationBinding {
	return newNavigationBinding(a)
}

// BootSearch exposes the search binding.
func (a *Admin) BootSearch() boot.SearchBinding {
	return newSearchBinding(a)
}

// ExportRegistrar exposes the export HTTP registrar.
func (a *Admin) ExportRegistrar() boot.ExportRegistrar {
	return newExportRegistrarBinding(a)
}

// BootBulk exposes the bulk binding.
func (a *Admin) BootBulk() boot.BulkBinding {
	return newBulkBinding(a)
}

// BootMedia exposes the media binding.
func (a *Admin) BootMedia() boot.MediaBinding {
	return newMediaBinding(a)
}

// BootNotifications exposes the notifications binding.
func (a *Admin) BootNotifications() boot.NotificationsBinding {
	return newNotificationsBinding(a)
}

// BootActivity exposes the activity binding.
func (a *Admin) BootActivity() boot.ActivityBinding {
	return newActivityBinding(a)
}

// BootJobs exposes the jobs binding.
func (a *Admin) BootJobs() boot.JobsBinding {
	return newJobsBinding(a)
}

// BootSettings exposes the settings binding.
func (a *Admin) BootSettings() boot.SettingsBinding {
	return newSettingsBinding(a)
}

// BootFeatureOverrides exposes the feature overrides binding.
func (a *Admin) BootFeatureOverrides() boot.FeatureOverridesBinding {
	return newFeatureOverridesBinding(a)
}

// SettingsWidget registers the settings widget provider.
func (a *Admin) SettingsWidget() error {
	return a.registerSettingsWidget()
}

// ActivityWidget registers the activity widget provider.
func (a *Admin) ActivityWidget() error {
	return a.registerActivityWidget()
}

// NotificationsWidget registers the notifications widget provider.
func (a *Admin) NotificationsWidget() error {
	return a.registerNotificationsWidget()
}

// RegisterWidgetAreas registers default dashboard widget areas.
func (a *Admin) RegisterWidgetAreas() error {
	return a.registerWidgetAreas()
}

// RegisterWidgetDefinitions registers default widget definitions.
func (a *Admin) RegisterWidgetDefinitions() error {
	return a.registerDefaultWidgets()
}

// RegisterDashboardProviders registers built-in dashboard providers.
func (a *Admin) RegisterDashboardProviders() error {
	return a.registerDashboardProviders()
}
