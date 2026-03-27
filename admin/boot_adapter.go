package admin

import (
	"context"

	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

// Boot runs the admin boot pipeline with the given steps or the defaults.
func (a *Admin) Boot(steps ...boot.Step) error {
	return a.BootWithContext(a.LifecycleContext(), steps...)
}

// BootWithContext runs the admin boot pipeline with the given lifecycle context and steps.
func (a *Admin) BootWithContext(ctx context.Context, steps ...boot.Step) error {
	if a != nil && a.router != nil {
		if err := a.validateMountAuthBoundary(); err != nil {
			return err
		}
	}
	if len(steps) == 0 {
		steps = boot.DefaultBootSteps()
	}
	if a != nil {
		previousCtx := a.bootContext
		if ctx == nil {
			ctx = previousCtx
		}
		if ctx == nil {
			ctx = context.Background()
		}
		a.bootContext = ctx
		defer func() { a.bootContext = previousCtx }()
	}
	if err := boot.Run(a, steps...); err != nil {
		return err
	}

	a.registerContentEntryAliases()
	a.registerCMSRoutesFromService()

	if a.config.EnablePublicAPI {
		a.RegisterPublicAPI(a.router)
	}
	a.registerPreviewRoutes()
	a.registerMenuBuilderRoutes()

	return a.registerDebugDashboardRoutes()
}

// LifecycleContext exposes the current boot lifecycle context to boot steps.
func (a *Admin) LifecycleContext() context.Context {
	if a == nil || a.bootContext == nil {
		return context.Background()
	}
	return a.bootContext
}

// Router exposes the configured router for boot steps.
func (a *Admin) Router() boot.Router {
	return a.router
}

// PublicRouter exposes the configured admin router for module route registration.
func (a *Admin) PublicRouter() AdminRouter {
	return a.router
}

// ProtectedRouter exposes the admin router wrapped with auth middleware when configured.
func (a *Admin) ProtectedRouter() AdminRouter {
	if a == nil {
		return nil
	}
	if a.authenticator == nil {
		return a.router
	}
	return wrapAdminRouter(a.router, a.authWrapper())
}

// AuthWrapper returns the configured auth wrapper for boot steps.
func (a *Admin) AuthWrapper() boot.HandlerWrapper {
	return a.authWrapper()
}

// BasePath exposes the configured base path.
func (a *Admin) BasePath() string {
	return adminBasePath(a.config)
}

// AdminUIGroup exposes the URLKit admin UI group path.
func (a *Admin) AdminUIGroup() string {
	return routing.DefaultUIGroupPath()
}

// AdminAPIGroup exposes the URLKit admin API group path.
func (a *Admin) AdminAPIGroup() string {
	return adminAPIGroupName(a.config)
}

// RoutingPlanner exposes the current routing planner.
func (a *Admin) RoutingPlanner() routing.Planner {
	if a == nil {
		return nil
	}
	return a.routingPlanner
}

// AdminAPIBasePath returns the base path for admin API routes (including version when configured).
func (a *Admin) AdminAPIBasePath() string {
	return adminAPIBasePath(a)
}

// URLs exposes the URL manager.
func (a *Admin) URLs() urlkit.Resolver {
	if a == nil || a.urlManager == nil {
		return nil
	}
	return a.urlManager
}

// LoggerProvider exposes the configured logger provider.
func (a *Admin) LoggerProvider() LoggerProvider {
	if a == nil {
		return nil
	}
	return a.loggerProvider
}

// Logger exposes the base configured logger.
func (a *Admin) Logger() Logger {
	if a == nil {
		return ensureLogger(nil)
	}
	return ensureLogger(a.logger)
}

// NamedLogger resolves a named logger via the configured provider.
func (a *Admin) NamedLogger(name string) Logger {
	if a == nil {
		return ensureLogger(nil)
	}
	return a.loggerFor(name)
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
	if c == nil || len(c.Body()) == 0 {
		return map[string]any{}, nil
	}
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

// BootUserImport exposes the user import binding.
func (a *Admin) BootUserImport() boot.UserImportBinding {
	return newUserImportBinding(a)
}

// BootTranslationExchange exposes translation exchange bindings.
func (a *Admin) BootTranslationExchange() boot.TranslationExchangeBinding {
	if !featureEnabled(a.featureGate, FeatureTranslationExchange) {
		return nil
	}
	return newTranslationExchangeBinding(a)
}

// BootTranslationFamilies exposes translation family list/detail bindings.
func (a *Admin) BootTranslationFamilies() boot.TranslationFamiliesBinding {
	if !featureEnabled(a.featureGate, FeatureCMS) {
		return nil
	}
	return newTranslationFamilyBinding(a)
}

// BootTranslationQueue exposes translation queue aggregate bindings.
func (a *Admin) BootTranslationQueue() boot.TranslationQueueBinding {
	if !featureEnabled(a.featureGate, FeatureTranslationQueue) {
		return nil
	}
	return newTranslationQueueBinding(a)
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

// BootWorkflows exposes persisted workflow management bindings.
func (a *Admin) BootWorkflows() boot.WorkflowManagementBinding {
	return newWorkflowManagementBinding(a)
}

// BootSchemaRegistry exposes schema registry bindings.
func (a *Admin) BootSchemaRegistry() boot.SchemaRegistryBinding {
	return newSchemaRegistryBinding(a)
}

// BootFeatureOverrides exposes the feature overrides binding.
func (a *Admin) BootFeatureOverrides() boot.FeatureOverridesBinding {
	return newFeatureOverridesBinding(a)
}

// BootIcons exposes the icons binding for icon discovery and rendering.
func (a *Admin) BootIcons() boot.IconsBinding {
	return newIconsBinding(a)
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
