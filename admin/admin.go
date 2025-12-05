package admin

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	router "github.com/goliatone/go-router"
)

// Admin orchestrates CMS-backed admin features and adapters.
type Admin struct {
	config          Config
	features        Features
	featureFlags    map[string]bool
	gates           FeatureGates
	registry        *Registry
	cms             CMSContainer
	widgetSvc       CMSWidgetService
	menuSvc         CMSMenuService
	contentSvc      CMSContentService
	authenticator   Authenticator
	router          AdminRouter
	commandRegistry *CommandRegistry
	dashboard       *Dashboard
	nav             *Navigation
	search          *SearchEngine
	authorizer      Authorizer
	notifications   NotificationService
	activity        ActivitySink
	jobs            *JobRegistry
	settings        *SettingsService
	settingsForm    *SettingsFormAdapter
	settingsCommand *SettingsUpdateCommand
	preferences     *PreferencesService
	profile         *ProfileService
	users           *UserManagementService
	tenants         *TenantService
	organizations   *OrganizationService
	panelForm       *PanelFormAdapter
	themeProvider   ThemeProvider
	defaultTheme    *ThemeSelection
	exportSvc       ExportService
	bulkSvc         BulkService
	mediaLibrary    MediaLibrary
	modulesLoaded   bool
	navMenuCode     string
	translator      Translator
}

type activityAware interface {
	WithActivitySink(ActivitySink)
}

// New constructs an Admin orchestrator with default in-memory services.
func New(cfg Config) *Admin {
	cfg.normalizeFeatures()
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

	registry := NewRegistry()
	container := cfg.CMS.Container
	if container == nil {
		container = NewNoopCMSContainer()
	}
	enableCommands := cfg.Features.Commands || cfg.Features.Settings || cfg.Features.Jobs || cfg.Features.Export || cfg.Features.Bulk || cfg.Features.Dashboard || cfg.Features.Notifications
	cmdReg := NewCommandRegistry(enableCommands)
	settingsSvc := NewSettingsService()
	settingsSvc.WithRegistry(registry)
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.ThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if cfg.Features.Settings {
		cmdReg.Register(settingsCmd)
	}
	var notifSvc NotificationService = DisabledNotificationService{}
	if cfg.Features.Notifications {
		notifSvc = NewInMemoryNotificationService()
	}

	var exportSvc ExportService = DisabledExportService{}
	if cfg.Features.Export {
		exportSvc = NewInMemoryExportService()
	}

	var bulkSvc BulkService = DisabledBulkService{}
	if cfg.Features.Bulk {
		bulkSvc = NewInMemoryBulkService()
	}

	var mediaLib MediaLibrary = DisabledMediaLibrary{}
	if cfg.Features.Media {
		mediaBase := cfg.BasePath
		if mediaBase == "" {
			mediaBase = "/admin"
		}
		mediaLib = NewInMemoryMediaLibrary(mediaBase)
	}

	activityFeed := NewActivityFeed()
	preferencesSvc := NewPreferencesService(nil).WithDefaults(cfg.Theme, cfg.ThemeVariant)
	preferencesSvc.WithActivitySink(activityFeed)
	profileSvc := NewProfileService(nil)
	profileSvc.WithActivitySink(activityFeed)
	userSvc := NewUserManagementService(nil, nil)
	userSvc.WithActivitySink(activityFeed)
	tenantSvc := NewTenantService(nil)
	tenantSvc.WithActivitySink(activityFeed)
	orgSvc := NewOrganizationService(nil)
	orgSvc.WithActivitySink(activityFeed)
	jobReg := NewJobRegistry(cmdReg)
	jobReg.WithActivitySink(activityFeed)
	if !cfg.Features.Jobs {
		jobReg.Enable(false)
	}
	if cfg.Features.Notifications {
		cmdReg.Register(&NotificationMarkCommand{Service: notifSvc})
	}
	if cfg.Features.Export {
		cmdReg.Register(&ExportCommand{Service: exportSvc})
	}
	if cfg.Features.Bulk {
		cmdReg.Register(&BulkCommand{Service: bulkSvc})
	}
	defaultTheme := &ThemeSelection{
		Name:        cfg.Theme,
		Variant:     cfg.ThemeVariant,
		Tokens:      cloneStringMap(cfg.ThemeTokens),
		Assets:      map[string]string{},
		ChartTheme:  cfg.ThemeVariant,
		AssetPrefix: cfg.ThemeAssetPrefix,
	}
	if cfg.LogoURL != "" {
		defaultTheme.Assets["logo"] = cfg.LogoURL
	}
	if cfg.FaviconURL != "" {
		defaultTheme.Assets["favicon"] = cfg.FaviconURL
	}

	navMenuCode := cfg.NavMenuCode
	if navMenuCode == "" {
		navMenuCode = "admin.main"
	}

	dashboard := NewDashboard()
	dashboard.WithRegistry(registry)

	adm := &Admin{
		config:          cfg,
		features:        cfg.Features,
		featureFlags:    cfg.FeatureFlags,
		gates:           NewFeatureGates(cfg.FeatureFlags),
		registry:        registry,
		cms:             container,
		widgetSvc:       container.WidgetService(),
		menuSvc:         container.MenuService(),
		contentSvc:      container.ContentService(),
		commandRegistry: cmdReg,
		dashboard:       dashboard,
		nav:             NewNavigation(container.MenuService(), nil),
		search:          NewSearchEngine(nil),
		notifications:   notifSvc,
		activity:        activityFeed,
		jobs:            jobReg,
		settings:        settingsSvc,
		settingsForm:    settingsForm,
		settingsCommand: settingsCmd,
		preferences:     preferencesSvc,
		profile:         profileSvc,
		users:           userSvc,
		tenants:         tenantSvc,
		organizations:   orgSvc,
		panelForm:       &PanelFormAdapter{},
		defaultTheme:    defaultTheme,
		exportSvc:       exportSvc,
		bulkSvc:         bulkSvc,
		mediaLibrary:    mediaLib,
		navMenuCode:     navMenuCode,
		translator:      NoopTranslator{},
	}
	adm.dashboard.WithWidgetService(adm.widgetSvc)
	adm.dashboard.WithPreferences(NewDashboardPreferencesAdapter(preferencesSvc))
	adm.dashboard.WithCommandBus(cmdReg)
	settingsForm.WithThemeResolver(adm.resolveTheme)
	adm.panelForm.ThemeResolver = adm.resolveTheme
	if adm.nav != nil {
		adm.nav.defaultMenuCode = navMenuCode
		adm.nav.UseCMS(adm.gates.Enabled(FeatureCMS))
	}
	if adm.search != nil {
		adm.search.Enable(adm.gates.Enabled(FeatureSearch))
	}
	if adm.settings != nil {
		adm.settings.Enable(adm.gates.Enabled(FeatureSettings))
	}
	adm.applyActivitySink(activityFeed)
	return adm
}

// WithAuth attaches an authenticator for route protection.
func (a *Admin) WithAuth(auth Authenticator, cfg *AuthConfig) *Admin {
	a.authenticator = auth
	if cfg != nil {
		a.config.AuthConfig = cfg
	}
	return a
}

// WithThemeProvider wires a theme selector/registry to downstream renderers.
func (a *Admin) WithThemeProvider(provider ThemeProvider) *Admin {
	a.themeProvider = provider
	return a
}

// WithTranslator wires an i18n translator for modules and UI surfaces.
func (a *Admin) WithTranslator(t Translator) *Admin {
	if t != nil {
		a.translator = t
		if a.nav != nil {
			a.nav.translator = t
		}
	}
	return a
}

// WithAuthorizer sets an authorizer for panel permissions.
func (a *Admin) WithAuthorizer(authz Authorizer) *Admin {
	a.authorizer = authz
	if a.nav != nil {
		a.nav.authorizer = authz
	}
	if a.search != nil {
		a.search.authorizer = authz
	}
	if a.dashboard != nil {
		a.dashboard.WithAuthorizer(authz)
	}
	return a
}

// WithActivitySink injects a shared activity sink (go-users compatible via adapter).
func (a *Admin) WithActivitySink(sink ActivitySink) *Admin {
	a.applyActivitySink(sink)
	return a
}

// WithUserManagement overrides the user and role repositories (go-users adapters or custom stores).
func (a *Admin) WithUserManagement(users UserRepository, roles RoleRepository) *Admin {
	a.users = NewUserManagementService(users, roles)
	a.applyActivitySink(a.activity)
	return a
}

// WithTenantManagement overrides the tenant repository (go-users adapters or custom stores).
func (a *Admin) WithTenantManagement(repo TenantRepository) *Admin {
	a.tenants = NewTenantService(repo)
	a.applyActivitySink(a.activity)
	return a
}

// WithOrganizationManagement overrides the organization repository.
func (a *Admin) WithOrganizationManagement(repo OrganizationRepository) *Admin {
	a.organizations = NewOrganizationService(repo)
	a.applyActivitySink(a.activity)
	return a
}

func (a *Admin) applyActivitySink(sink ActivitySink) {
	if a == nil || sink == nil {
		return
	}
	a.activity = sink
	if a.jobs != nil {
		a.jobs.WithActivitySink(sink)
	}
	if a.dashboard != nil {
		a.dashboard.WithActivitySink(sink)
	}
	if a.settings != nil {
		a.settings.WithActivitySink(sink)
	}
	if aware, ok := a.notifications.(activityAware); ok {
		aware.WithActivitySink(sink)
	}
	if aware, ok := a.widgetSvc.(activityAware); ok {
		aware.WithActivitySink(sink)
	}
	if aware, ok := a.menuSvc.(activityAware); ok {
		aware.WithActivitySink(sink)
	}
	if aware, ok := a.contentSvc.(activityAware); ok {
		aware.WithActivitySink(sink)
	}
	if a.preferences != nil {
		a.preferences.WithActivitySink(sink)
	}
	if a.profile != nil {
		a.profile.WithActivitySink(sink)
	}
	if a.users != nil {
		a.users.WithActivitySink(sink)
	}
	if a.tenants != nil {
		a.tenants.WithActivitySink(sink)
	}
	if a.organizations != nil {
		a.organizations.WithActivitySink(sink)
	}
}

// UseCMS overrides the default CMS container (menu/widget services).
// Call before Initialize to wire a real go-cms container.
func (a *Admin) UseCMS(container CMSContainer) *Admin {
	if container == nil {
		return a
	}
	a.cms = container
	prevWidget := a.widgetSvc
	prevMenu := a.menuSvc
	prevContent := a.contentSvc
	a.widgetSvc = container.WidgetService()
	if a.widgetSvc == nil {
		a.widgetSvc = prevWidget
	}
	menuSvc := container.MenuService()
	if provider, ok := container.(GoCMSMenuProvider); ok {
		if svc := provider.GoCMSMenuService(); svc != nil {
			menuSvc = NewGoCMSMenuAdapterFromAny(svc)
		}
	}
	if menuSvc == nil {
		menuSvc = prevMenu
	}
	a.menuSvc = menuSvc
	a.contentSvc = container.ContentService()
	if a.contentSvc == nil {
		a.contentSvc = prevContent
	}
	if a.nav != nil {
		a.nav.menuSvc = a.menuSvc
		a.nav.UseCMS(a.gates.Enabled(FeatureCMS))
	}
	if a.dashboard != nil {
		a.dashboard.WithWidgetService(a.widgetSvc)
	}
	a.applyActivitySink(a.activity)
	return a
}

// MenuService exposes the configured CMS menu service for host seeding.
func (a *Admin) MenuService() CMSMenuService {
	return a.menuSvc
}

func (a *Admin) resolveTheme(ctx context.Context) *ThemeSelection {
	selector := ThemeSelector{Name: a.config.Theme, Variant: a.config.ThemeVariant}
	if a.gates.Enabled(FeaturePreferences) && a.preferences != nil {
		if userID := userIDFromContext(ctx); userID != "" {
			selector = mergeSelector(selector, a.preferences.ThemeSelectorForUser(ctx, userID))
		}
	}
	selector = mergeSelector(selector, ThemeSelectorFromContext(ctx))

	base := cloneThemeSelection(a.defaultTheme)
	if selector.Name != "" {
		base.Name = selector.Name
		if base.Tokens == nil {
			base.Tokens = map[string]string{}
		}
		base.Tokens["theme"] = selector.Name
	}
	if selector.Variant != "" {
		base.Variant = selector.Variant
	}
	result := base
	if a.themeProvider != nil {
		if selection, err := a.themeProvider(ctx, selector); err == nil && selection != nil {
			result = mergeThemeSelections(base, selection)
		}
	}
	if selector.Variant != "" && selector.Variant != a.config.ThemeVariant && result.ChartTheme == a.config.ThemeVariant {
		result.ChartTheme = selector.Variant
	}
	if result.ChartTheme == "" && result.Variant != "" {
		result.ChartTheme = result.Variant
	}
	return result
}

func mergeSelector(base, override ThemeSelector) ThemeSelector {
	if override.Name != "" {
		base.Name = override.Name
	}
	if override.Variant != "" {
		base.Variant = override.Variant
	}
	return base
}

func (a *Admin) Theme(ctx context.Context) *ThemeSelection {
	return cloneThemeSelection(a.resolveTheme(ctx))
}

func (a *Admin) ThemePayload(ctx context.Context) map[string]map[string]string {
	return a.resolveTheme(ctx).payload()
}

func (a *Admin) themePayload(ctx context.Context) map[string]map[string]string {
	return a.ThemePayload(ctx)
}

func (a *Admin) withTheme(ctx AdminContext) AdminContext {
	if ctx.Theme == nil {
		ctx.Theme = a.resolveTheme(ctx.Context)
	}
	return ctx
}

func (a *Admin) adminContextFromRequest(c router.Context, locale string) AdminContext {
	ctx := newAdminContextFromRouter(c, locale)
	selector := selectorFromRequest(c)
	if selector.Name != "" || selector.Variant != "" {
		ctx.Context = WithThemeSelection(ctx.Context, selector)
	}
	return a.withTheme(ctx)
}

func selectorFromRequest(c router.Context) ThemeSelector {
	selector := ThemeSelector{}
	if c == nil {
		return selector
	}
	if name := strings.TrimSpace(c.Query("theme")); name != "" {
		selector.Name = name
	}
	if variant := strings.TrimSpace(c.Query("variant")); variant != "" {
		selector.Variant = variant
	}
	if selector.Name == "" {
		if name := strings.TrimSpace(c.Header("X-Admin-Theme")); name != "" {
			selector.Name = name
		}
	}
	if selector.Variant == "" {
		if variant := strings.TrimSpace(c.Header("X-Admin-Theme-Variant")); variant != "" {
			selector.Variant = variant
		}
	}
	return selector
}

func (a *Admin) authWrapper() func(router.HandlerFunc) router.HandlerFunc {
	if a == nil || a.authenticator == nil {
		return func(handler router.HandlerFunc) router.HandlerFunc {
			return handler
		}
	}
	if handlerAuth, ok := a.authenticator.(HandlerAuthenticator); ok && handlerAuth != nil {
		return func(handler router.HandlerFunc) router.HandlerFunc {
			return handlerAuth.WrapHandler(handler)
		}
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if err := a.authenticator.Wrap(c); err != nil {
				return err
			}
			return handler(c)
		}
	}
}

// Panel returns a panel builder pre-wired with the command registry.
// The caller configures fields/actions/hooks and registers the panel via RegisterPanel.
func (a *Admin) Panel(_ string) *PanelBuilder {
	return &PanelBuilder{commandBus: a.commandRegistry}
}

// Dashboard exposes the dashboard orchestration service.
func (a *Admin) Dashboard() *Dashboard {
	return a.dashboard
}

// Menu exposes the navigation resolver and fallback menu builder.
func (a *Admin) Menu() *Navigation {
	return a.nav
}

// Navigation returns the navigation resolver (alias for Menu).
func (a *Admin) Navigation() *Navigation {
	return a.nav
}

// Commands exposes the go-command registry hook.
func (a *Admin) Commands() *CommandRegistry {
	return a.commandRegistry
}

// Registry exposes the central registry for panels/modules/widgets/settings.
func (a *Admin) Registry() *Registry {
	return a.registry
}

// RegisterModule registers a pluggable module before initialization.
// Duplicate IDs are rejected to preserve ordering and idempotency.
func (a *Admin) RegisterModule(module Module) error {
	if a.registry == nil {
		return errors.New("registry not initialized")
	}
	return a.registry.RegisterModule(module)
}

// DashboardService exposes the dashboard orchestration.
func (a *Admin) DashboardService() *Dashboard {
	return a.dashboard
}

// SearchService exposes the search engine.
func (a *Admin) SearchService() *SearchEngine {
	return a.search
}

// SettingsService exposes the settings resolver.
func (a *Admin) SettingsService() *SettingsService {
	return a.settings
}

// NotificationService returns the inbox service.
func (a *Admin) NotificationService() NotificationService {
	return a.notifications
}

// ActivityFeed returns the activity sink.
func (a *Admin) ActivityFeed() ActivitySink {
	return a.activity
}

// ExportService exposes the export adapter.
func (a *Admin) ExportService() ExportService {
	return a.exportSvc
}

// BulkService exposes the bulk adapter.
func (a *Admin) BulkService() BulkService {
	return a.bulkSvc
}

// MediaLibrary exposes the media library adapter.
func (a *Admin) MediaLibrary() MediaLibrary {
	return a.mediaLibrary
}

// PreferencesService exposes the user preferences service.
func (a *Admin) PreferencesService() *PreferencesService {
	return a.preferences
}

// ProfileService exposes the user profile service.
func (a *Admin) ProfileService() *ProfileService {
	return a.profile
}

// UserService exposes the user and role management service.
func (a *Admin) UserService() *UserManagementService {
	return a.users
}

// TenantService exposes the tenant management service.
func (a *Admin) TenantService() *TenantService {
	return a.tenants
}

// OrganizationService exposes the organization management service.
func (a *Admin) OrganizationService() *OrganizationService {
	return a.organizations
}

func (a *Admin) recordActivity(ctx context.Context, actor, action, object string, metadata map[string]any) {
	if a == nil || a.activity == nil {
		return
	}
	if actor == "" {
		actor = actorFromContext(ctx)
	}
	_ = a.activity.Record(ctx, ActivityEntry{
		Actor:    actor,
		Action:   action,
		Object:   object,
		Metadata: metadata,
	})
}

// Jobs exposes the job registry.
func (a *Admin) Jobs() *JobRegistry {
	return a.jobs
}

// RegisterPanel registers a built panel with the admin.
func (a *Admin) RegisterPanel(name string, builder *PanelBuilder) (*Panel, error) {
	if builder == nil {
		return nil, errors.New("panel builder is nil")
	}
	builder.name = name
	builder.commandBus = a.commandRegistry
	if builder.activity == nil {
		builder.activity = a.activity
	}
	if builder.authorizer == nil {
		builder.authorizer = a.authorizer
	}
	panel, err := builder.Build()
	if err != nil {
		return nil, err
	}
	if a.registry != nil {
		if err := a.registry.RegisterPanel(name, panel); err != nil {
			return nil, err
		}
	}
	return panel, nil
}

// Bootstrap initializes CMS seed data (widget areas, admin menu, default widgets).
func (a *Admin) Bootstrap(ctx context.Context) error {
	if a.gates.Enabled(FeatureCMS) || a.gates.Enabled(FeatureDashboard) {
		if err := a.ensureCMS(ctx); err != nil {
			return err
		}
		if err := a.bootstrapWidgetAreas(ctx); err != nil {
			return err
		}
		if err := a.registerDefaultWidgets(ctx); err != nil {
			return err
		}
	}

	if err := a.bootstrapAdminMenu(ctx); err != nil {
		return err
	}

	if a.gates.Enabled(FeatureSettings) {
		if err := a.bootstrapSettingsDefaults(ctx); err != nil {
			return err
		}
	}

	if a.gates.Enabled(FeatureNotifications) && a.notifications != nil {
		_, _ = a.notifications.Add(ctx, Notification{Title: "Welcome to go-admin", Message: "Notifications are wired", Read: false})
	}
	return nil
}

func joinPath(basePath, suffix string) string {
	return path.Join("/", basePath, suffix)
}

func (a *Admin) decorateSchema(schema *Schema, panelName string) {
	if schema == nil {
		return
	}
	if a.gates.Enabled(FeatureExport) && a.exportSvc != nil {
		schema.Export = &ExportConfig{
			Resource: panelName,
			Formats:  []string{"json", "csv"},
			Endpoint: joinPath(a.config.BasePath, "api/export"),
		}
	}
	if a.gates.Enabled(FeatureBulk) && a.bulkSvc != nil {
		schema.Bulk = &BulkConfig{
			Endpoint:         joinPath(a.config.BasePath, "api/bulk"),
			SupportsRollback: supportsBulkRollback(a.bulkSvc),
		}
	}
	if a.gates.Enabled(FeatureMedia) && a.mediaLibrary != nil {
		libraryPath := joinPath(a.config.BasePath, "api/media/library")
		schema.Media = &MediaConfig{LibraryPath: libraryPath}
		applyMediaHints(schema, libraryPath)
	}
}

// Initialize attaches the router, bootstraps, and mounts base routes.
func (a *Admin) Initialize(r AdminRouter) error {
	if r == nil {
		return errors.New("router cannot be nil")
	}
	a.router = r
	if a.nav == nil {
		a.nav = NewNavigation(a.menuSvc, a.authorizer)
	}
	if a.nav != nil {
		a.nav.defaultMenuCode = a.navMenuCode
		a.nav.UseCMS(a.gates.Enabled(FeatureCMS))
	}
	if a.search == nil {
		a.search = NewSearchEngine(a.authorizer)
	}
	if a.search != nil {
		a.search.Enable(a.gates.Enabled(FeatureSearch))
	}
	if a.settings != nil {
		a.settings.Enable(a.gates.Enabled(FeatureSettings))
	}
	if err := a.validateConfig(); err != nil {
		return err
	}
	if err := a.Bootstrap(context.Background()); err != nil {
		return err
	}
	if err := a.loadModules(context.Background()); err != nil {
		return err
	}
	if a.jobs != nil {
		if err := a.jobs.Sync(context.Background()); err != nil {
			return err
		}
	}
	if err := a.ensureSettingsNavigation(context.Background()); err != nil {
		return err
	}
	a.registerHealthRoute()
	a.registerPanelRoutes()
	a.registerSettingsWidget()
	a.registerActivityWidget()
	a.registerNotificationsWidget()
	a.registerDashboardRoute()
	a.registerNavigationRoute()
	a.registerSearchRoute()
	a.registerExportRoute()
	a.registerBulkRoute()
	a.registerMediaRoute()
	a.registerNotificationsRoute()
	a.registerActivityRoute()
	a.registerJobsRoute()
	a.registerSettingsRoutes()
	return nil
}

func (a *Admin) ensureCMS(ctx context.Context) error {
	if !a.gates.Enabled(FeatureCMS) && !a.gates.Enabled(FeatureDashboard) {
		// Already using in-memory defaults.
		return nil
	}
	if a.cms == nil || a.menuSvc == nil || a.widgetSvc == nil {
		container, err := BuildGoCMSContainer(ctx, a.config)
		if err != nil {
			return err
		}
		if container != nil {
			a.UseCMS(container)
		}
	}
	if a.cms == nil {
		container := NewNoopCMSContainer()
		a.UseCMS(container)
	}
	return nil
}

func (a *Admin) validateConfig() error {
	issues := []FeatureDependencyError{}
	require := func(feature FeatureKey, deps ...FeatureKey) {
		if !a.gates.Enabled(feature) {
			return
		}
		missing := []string{}
		for _, dep := range deps {
			if !a.gates.Enabled(dep) {
				missing = append(missing, string(dep))
			}
		}
		if len(missing) > 0 {
			issues = append(issues, FeatureDependencyError{Feature: string(feature), Missing: missing})
		}
	}

	require(FeatureJobs, FeatureCommands)
	require(FeatureExport, FeatureCommands, FeatureJobs)
	require(FeatureBulk, FeatureCommands, FeatureJobs)

	for _, feature := range []FeatureKey{FeatureMedia, FeatureExport, FeatureBulk} {
		if a.gates.Enabled(feature) && !a.gates.Enabled(FeatureCMS) {
			issues = append(issues, FeatureDependencyError{
				Feature: string(feature),
				Missing: []string{string(FeatureCMS)},
			})
		}
	}
	if len(issues) == 0 {
		return nil
	}
	return InvalidFeatureConfigError{Issues: issues}
}

func (a *Admin) registerDefaultModules() error {
	if a.registry == nil {
		return nil
	}
	if a.gates.Enabled(FeatureUsers) {
		if _, exists := a.registry.Module(usersModuleID); !exists {
			if err := a.registry.RegisterModule(NewUserManagementModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeaturePreferences) {
		if _, exists := a.registry.Module(preferencesModuleID); !exists {
			if err := a.registry.RegisterModule(NewPreferencesModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureProfile) {
		if _, exists := a.registry.Module(profileModuleID); !exists {
			if err := a.registry.RegisterModule(NewProfileModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureTenants) {
		if _, exists := a.registry.Module(tenantsModuleID); !exists {
			if err := a.registry.RegisterModule(NewTenantsModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureOrganizations) {
		if _, exists := a.registry.Module(organizationsModuleID); !exists {
			if err := a.registry.RegisterModule(NewOrganizationsModule()); err != nil {
				return err
			}
		}
	}
	return nil
}

func (a *Admin) loadModules(ctx context.Context) error {
	if a.modulesLoaded {
		return nil
	}
	if err := a.registerDefaultModules(); err != nil {
		return err
	}
	ordered, err := a.orderModules()
	if err != nil {
		return err
	}
	for _, module := range ordered {
		if module == nil {
			continue
		}
		manifest := module.Manifest()
		if len(manifest.FeatureFlags) > 0 {
			for _, flag := range manifest.FeatureFlags {
				if !a.gates.EnabledKey(flag) {
					return FeatureDisabledError{
						Feature: flag,
						Reason:  fmt.Sprintf("required by module %s; set via Config.Features or FeatureFlags", manifest.ID),
					}
				}
			}
		}
		if aware, ok := module.(TranslatorAware); ok {
			aware.WithTranslator(a.translator)
		}
		if err := module.Register(ModuleContext{Admin: a, Locale: a.config.DefaultLocale, Translator: a.translator}); err != nil {
			return err
		}
		if contributor, ok := module.(MenuContributor); ok {
			items := contributor.MenuItems(a.config.DefaultLocale)
			if err := a.addMenuItems(ctx, items); err != nil {
				return err
			}
		}
	}
	a.modulesLoaded = true
	return nil
}

func (a *Admin) orderModules() ([]Module, error) {
	if a.registry == nil {
		return nil, nil
	}
	nodes := map[string]Module{}
	order := []string{}
	for _, m := range a.registry.Modules() {
		if m == nil {
			continue
		}
		manifest := m.Manifest()
		nodes[manifest.ID] = m
		order = append(order, manifest.ID)
	}
	visited := map[string]bool{}
	stack := map[string]bool{}
	result := []Module{}
	var visit func(id string) error
	visit = func(id string) error {
		if visited[id] {
			return nil
		}
		if stack[id] {
			return fmt.Errorf("module dependency cycle detected at %s", id)
		}
		stack[id] = true
		mod, ok := nodes[id]
		if !ok {
			return fmt.Errorf("module %s not registered", id)
		}
		for _, dep := range mod.Manifest().Dependencies {
			if _, ok := nodes[dep]; !ok {
				return fmt.Errorf("module %s missing dependency %s", id, dep)
			}
			if err := visit(dep); err != nil {
				return err
			}
		}
		stack[id] = false
		visited[id] = true
		result = append(result, mod)
		return nil
	}
	for _, id := range order {
		if err := visit(id); err != nil {
			return nil, err
		}
	}
	return result, nil
}

func (a *Admin) addMenuItems(ctx context.Context, items []MenuItem) error {
	if len(items) == 0 {
		return nil
	}
	cmsEnabled := a.gates.Enabled(FeatureCMS)
	if a.menuSvc != nil {
		menuCodes := map[string]bool{}
		for _, item := range items {
			code := item.Menu
			if code == "" {
				code = a.navMenuCode
			}
			if !menuCodes[code] {
				if _, err := a.menuSvc.CreateMenu(ctx, code); err != nil {
					return err
				}
				menuCodes[code] = true
			}
			if err := a.menuSvc.AddMenuItem(ctx, code, item); err != nil {
				return err
			}
		}
	}
	if (!cmsEnabled || a.menuSvc == nil) && a.nav != nil {
		converted := convertMenuItems(items, a.translator, a.config.DefaultLocale)
		if len(converted) > 0 {
			a.nav.AddFallback(converted...)
		}
	}
	return nil
}

func (a *Admin) registerHealthRoute() {
	if a.router == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "health")
	a.router.Get(path, wrap(func(c router.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	}))
}

func (a *Admin) registerPanelRoutes() {
	if a.router == nil {
		return
	}
	if a.registry == nil {
		return
	}
	wrap := a.authWrapper()
	for name, panel := range a.registry.Panels() {
		p := panel
		base := joinPath(a.config.BasePath, "api/"+name)

		// List
		a.router.Get(base, wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			opts := parseListOptions(c)
			baseSchema := panel.Schema()
			if baseSchema.UseBlocks || baseSchema.UseSEO || baseSchema.TreeView {
				if opts.Filters == nil {
					opts.Filters = map[string]any{}
				}
				if locale != "" {
					opts.Filters["locale"] = locale
				}
			}
			if opts.Search != "" {
				opts.Filters["_search"] = opts.Search
			}
			records, total, err := panel.List(ctx, opts)
			if err != nil {
				return writeError(c, err)
			}
			schema := p.SchemaWithTheme(a.themePayload(ctx.Context))
			a.decorateSchema(&schema, name)
			var form PanelFormRequest
			if a.panelForm != nil {
				form = a.panelForm.Build(p, ctx, nil, nil)
			}
			return writeJSON(c, map[string]any{
				"total":   total,
				"records": records,
				"schema":  schema,
				"form":    form,
			})
		}))

		// Detail
		a.router.Get(joinPath(base, ":id"), wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			rec, err := p.Get(ctx, id)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, rec)
		}))

		// Create
		a.router.Post(base, wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			record, err := parseJSONBody(c)
			if err != nil {
				return writeError(c, err)
			}
			created, err := p.Create(ctx, record)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, created)
		}))

		// Update
		a.router.Put(joinPath(base, ":id"), wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			record, err := parseJSONBody(c)
			if err != nil {
				return writeError(c, err)
			}
			updated, err := p.Update(ctx, id, record)
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, updated)
		}))

		// Delete (basic: expects ?id=)
		a.router.Delete(base, wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			id := c.Query("id")
			if id == "" {
				id = c.Param("id", "")
			}
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			if err := p.Delete(ctx, id); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "deleted"})
		}))

		a.router.Delete(joinPath(base, ":id"), wrap(func(c router.Context) error {
			locale := c.Query("locale")
			if locale == "" {
				locale = a.config.DefaultLocale
			}
			ctx := a.adminContextFromRequest(c, locale)
			id := c.Param("id", "")
			if id == "" {
				return writeError(c, errors.New("missing id"))
			}
			if err := p.Delete(ctx, id); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "deleted"})
		}))

		// Actions
		a.router.Post(joinPath(base, "actions/:action"), wrap(func(c router.Context) error {
			ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
			body := map[string]any{}
			if len(c.Body()) > 0 {
				payload, err := parseJSONBody(c)
				if err != nil {
					return writeError(c, err)
				}
				body = payload
				ctx.Context = WithCommandPayload(ctx.Context, payload)
			}
			if ids := parseCommandIDs(body, c.Query("id"), c.Query("ids")); len(ids) > 0 {
				ctx.Context = WithCommandIDs(ctx.Context, ids)
			}
			actionName := c.Param("action", "")
			if actionName == "" {
				return writeError(c, errors.New("action required"))
			}
			if err := p.RunAction(ctx, actionName); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "ok"})
		}))

		// Bulk actions
		a.router.Post(joinPath(base, "bulk/:action"), wrap(func(c router.Context) error {
			ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
			body := map[string]any{}
			if len(c.Body()) > 0 {
				payload, err := parseJSONBody(c)
				if err != nil {
					return writeError(c, err)
				}
				body = payload
				ctx.Context = WithCommandPayload(ctx.Context, payload)
			}
			if ids := parseCommandIDs(body, c.Query("id"), c.Query("ids")); len(ids) > 0 {
				ctx.Context = WithCommandIDs(ctx.Context, ids)
			}
			actionName := c.Param("action", "")
			if actionName == "" {
				return writeError(c, errors.New("action required"))
			}
			if err := p.RunBulkAction(ctx, actionName); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]string{"status": "ok"})
		}))
	}
}

func (a *Admin) registerDashboardRoute() {
	if a.router == nil || a.dashboard == nil || !a.gates.Enabled(FeatureDashboard) {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/dashboard")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureDashboard); err != nil {
			return writeError(c, err)
		}
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.adminContextFromRequest(c, locale)
		widgets, err := a.dashboard.Resolve(ctx)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"widgets": widgets,
			"theme":   a.themePayload(ctx.Context),
		})
	}))

	configPath := joinPath(a.config.BasePath, "api/dashboard/config")
	a.router.Get(configPath, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureDashboard); err != nil {
			return writeError(c, err)
		}
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.adminContextFromRequest(c, locale)
		layout := a.dashboard.resolvedInstances(ctx)
		areas := []WidgetAreaDefinition{}
		if a.widgetSvc != nil {
			areas = a.widgetSvc.Areas()
		}
		return writeJSON(c, map[string]any{
			"providers": a.dashboard.Providers(),
			"layout":    layout,
			"areas":     areas,
		})
	}))

	a.router.Post(configPath, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureDashboard); err != nil {
			return writeError(c, err)
		}
		ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		rawLayout, ok := body["layout"].([]any)
		if !ok {
			return writeError(c, errors.New("layout must be an array"))
		}
		layout := []DashboardWidgetInstance{}
		for _, item := range rawLayout {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			layout = append(layout, DashboardWidgetInstance{
				DefinitionCode: toString(obj["definition"]),
				AreaCode:       toString(obj["area"]),
				Config:         extractMap(obj["config"]),
				Position:       atoiDefault(toString(obj["position"]), 0),
				Locale:         toString(obj["locale"]),
			})
		}
		if len(layout) > 0 {
			a.dashboard.SetUserLayoutWithContext(ctx, layout)
		}
		return writeJSON(c, map[string]any{"layout": layout})
	}))
}

func (a *Admin) registerNavigationRoute() {
	if a.router == nil || a.nav == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/navigation")
	a.router.Get(path, wrap(func(c router.Context) error {
		menuCode := c.Query("code")
		if menuCode == "" {
			menuCode = a.navMenuCode
		}
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.adminContextFromRequest(c, locale)
		items := a.nav.ResolveMenu(ctx.Context, menuCode, locale)
		return writeJSON(c, map[string]any{
			"items": items,
			"theme": a.themePayload(ctx.Context),
		})
	}))
}

func (a *Admin) registerSearchRoute() {
	if a.router == nil || a.search == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/search")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureSearch); err != nil {
			return writeError(c, err)
		}
		query := c.Query("query")
		if query == "" {
			return writeError(c, errors.New("query required"))
		}
		limit := atoiDefault(c.Query("limit"), 10)
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.adminContextFromRequest(c, locale)
		results, err := a.search.Query(ctx, query, limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"results": results})
	}))

	typeaheadPath := joinPath(a.config.BasePath, "api/search/typeahead")
	a.router.Get(typeaheadPath, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureSearch); err != nil {
			return writeError(c, err)
		}
		query := c.Query("query")
		if query == "" {
			return writeError(c, errors.New("query required"))
		}
		limit := atoiDefault(c.Query("limit"), 5)
		locale := c.Query("locale")
		if locale == "" {
			locale = a.config.DefaultLocale
		}
		ctx := a.adminContextFromRequest(c, locale)
		results, err := a.search.Query(ctx, query, limit)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"results": results})
	}))
}

func (a *Admin) registerExportRoute() {
	if a.router == nil || a.exportSvc == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/export")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureExport); err != nil {
			return writeError(c, err)
		}
		req := ExportRequest{
			Resource: c.Query("resource"),
			Format:   c.Query("format"),
		}
		res, err := a.exportSvc.Export(c.Context(), req)
		if err != nil {
			return writeError(c, err)
		}
		c.SetHeader("Content-Type", res.ContentType)
		return writeJSON(c, map[string]any{
			"content_type": res.ContentType,
			"filename":     res.Filename,
			"data":         string(res.Content),
		})
	}))
	a.router.Post(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureExport); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		req := ExportRequest{
			Resource: toString(body["resource"]),
			Format:   toString(body["format"]),
		}
		res, err := a.exportSvc.Export(c.Context(), req)
		if err != nil {
			return writeError(c, err)
		}
		c.SetHeader("Content-Type", res.ContentType)
		return writeJSON(c, map[string]any{
			"content_type": res.ContentType,
			"filename":     res.Filename,
			"data":         string(res.Content),
		})
	}))
}

func (a *Admin) registerBulkRoute() {
	if a.router == nil || a.bulkSvc == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/bulk")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureBulk); err != nil {
			return writeError(c, err)
		}
		jobs := a.bulkSvc.List(c.Context())
		return writeJSON(c, map[string]any{"jobs": jobs})
	}))
	a.router.Post(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureBulk); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		total := atoiDefault(toString(body["total"]), 0)
		req := BulkRequest{
			Name:   toString(body["name"]),
			Action: toString(body["action"]),
			Total:  total,
		}
		if req.Name == "" && req.Action != "" {
			req.Name = req.Action
		}
		job, err := a.bulkSvc.Start(c.Context(), req)
		if err != nil {
			return writeError(c, err)
		}
		a.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.trigger", "bulk_job:"+job.ID, map[string]any{
			"name":   job.Name,
			"action": job.Action,
		})
		return writeJSON(c, map[string]any{"job": job})
	}))
	if rollbackSvc, ok := a.bulkSvc.(BulkRollbacker); ok {
		rollbackPath := joinPath(path, ":id/rollback")
		a.router.Post(rollbackPath, wrap(func(c router.Context) error {
			if err := a.gates.Require(FeatureBulk); err != nil {
				return writeError(c, err)
			}
			id := c.Param("id", "")
			if id == "" {
				if body, err := parseJSONBody(c); err == nil {
					id = toString(body["id"])
				}
			}
			if id == "" {
				return writeError(c, errors.New("id required"))
			}
			job, err := rollbackSvc.Rollback(c.Context(), id)
			if err != nil {
				return writeError(c, err)
			}
			a.recordActivity(c.Context(), c.Header("X-User-ID"), "bulk.rollback", "bulk_job:"+job.ID, map[string]any{
				"name":   job.Name,
				"action": job.Action,
			})
			return writeJSON(c, map[string]any{"job": job})
		}))
	}
}

func (a *Admin) registerMediaRoute() {
	if a.router == nil || a.mediaLibrary == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/media/library")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureMedia); err != nil {
			return writeError(c, err)
		}
		items, err := a.mediaLibrary.List(c.Context())
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"items": items})
	}))
	a.router.Post(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureMedia); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		item := MediaItem{
			ID:        toString(body["id"]),
			Name:      toString(body["name"]),
			URL:       toString(body["url"]),
			Thumbnail: toString(body["thumbnail"]),
			Metadata:  extractMap(body["metadata"]),
		}
		created, err := a.mediaLibrary.Add(c.Context(), item)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, created)
	}))
}

func (a *Admin) registerSettingsWidget() {
	if a.dashboard == nil || a.settings == nil || !a.gates.Enabled(FeatureSettings) {
		return
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return nil, err
		}
		values := a.settings.ResolveAll(ctx.UserID)
		keys := []string{}
		if raw, ok := cfg["keys"]; ok {
			switch v := raw.(type) {
			case []string:
				keys = append(keys, v...)
			case []any:
				for _, item := range v {
					if s, ok := item.(string); ok {
						keys = append(keys, s)
					}
				}
			}
		}
		shouldInclude := func(key string) bool {
			if len(keys) == 0 {
				return true
			}
			for _, k := range keys {
				if k == key {
					return true
				}
			}
			return false
		}
		payload := map[string]any{}
		for key, val := range values {
			if !shouldInclude(key) {
				continue
			}
			payload[key] = map[string]any{
				"value":      val.Value,
				"provenance": val.Provenance,
			}
		}
		return map[string]any{"values": payload}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.settings_overview",
		Name:          "Settings Overview",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{"keys": []string{"admin.title", "admin.default_locale"}},
		Permission:    a.config.SettingsPermission,
		Handler:       handler,
	})
}

func (a *Admin) registerNotificationsRoute() {
	if a.router == nil || a.notifications == nil {
		return
	}
	wrap := a.authWrapper()
	base := joinPath(a.config.BasePath, "api/notifications")
	a.router.Get(base, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureNotifications); err != nil {
			return writeError(c, err)
		}
		ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(ctx, a.config.NotificationsPermission, "notifications"); err != nil {
			return writeError(c, err)
		}
		items, err := a.notifications.List(ctx.Context)
		if err != nil {
			return writeError(c, err)
		}
		unread := 0
		for _, n := range items {
			if !n.Read {
				unread++
			}
		}
		return writeJSON(c, map[string]any{
			"notifications": items,
			"unread_count":  unread,
		})
	}))
	a.router.Post(joinPath(base, "read"), wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureNotifications); err != nil {
			return writeError(c, err)
		}
		payload, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		rawIDs, ok := payload["ids"].([]any)
		if !ok {
			return writeError(c, errors.New("ids must be array"))
		}
		read := true
		if r, ok := payload["read"].(bool); ok {
			read = r
		}
		ids := []string{}
		for _, v := range rawIDs {
			if s, ok := v.(string); ok {
				ids = append(ids, s)
			}
		}
		adminCtx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(adminCtx, a.config.NotificationsUpdatePermission, "notifications"); err != nil {
			return writeError(c, err)
		}
		cmdCtx := withNotificationContext(adminCtx.Context, ids, read)
		if a.commandRegistry != nil {
			err = a.commandRegistry.Dispatch(cmdCtx, NotificationMarkCommandName)
		} else if a.notifications != nil {
			err = a.notifications.Mark(cmdCtx, ids, read)
		} else {
			err = FeatureDisabledError{Feature: string(FeatureNotifications)}
		}
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]string{"status": "ok"})
	}))
}

func (a *Admin) registerNotificationsWidget() {
	if a.dashboard == nil || a.notifications == nil || !a.gates.Enabled(FeatureDashboard) || !a.gates.Enabled(FeatureNotifications) {
		return
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		limit := 5
		if raw, ok := cfg["limit"].(int); ok && raw > 0 {
			limit = raw
		} else if rawf, ok := cfg["limit"].(float64); ok && rawf > 0 {
			limit = int(rawf)
		}
		items, err := a.notifications.List(ctx.Context)
		if err != nil {
			return nil, err
		}
		unread := 0
		if limit > 0 && len(items) > limit {
			items = items[:limit]
		}
		for _, item := range items {
			if !item.Read {
				unread++
			}
		}
		return map[string]any{
			"notifications": items,
			"unread":        unread,
		}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.notifications",
		Name:          "Notifications",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{"limit": 5},
		Handler:       handler,
	})
}

func (a *Admin) registerActivityWidget() {
	if a.dashboard == nil || a.activity == nil || !a.gates.Enabled(FeatureDashboard) {
		return
	}
	handler := func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
		limit := 5
		if raw, ok := cfg["limit"].(int); ok && raw > 0 {
			limit = raw
		} else if rawf, ok := cfg["limit"].(float64); ok && rawf > 0 {
			limit = int(rawf)
		}
		entries, err := a.activity.List(ctx.Context, limit)
		if err != nil {
			return nil, err
		}
		return map[string]any{"entries": entries}, nil
	}
	a.dashboard.RegisterProvider(DashboardProviderSpec{
		Code:          "admin.widget.activity_feed",
		Name:          "Recent Activity",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"limit": 5},
		Permission:    "",
		Handler:       handler,
	})
}

func (a *Admin) registerActivityRoute() {
	if a.router == nil || a.activity == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/activity")
	a.router.Get(path, wrap(func(c router.Context) error {
		limit := atoiDefault(c.Query("limit"), 10)
		filters := []ActivityFilter{}
		if actor := strings.TrimSpace(c.Query("actor")); actor != "" {
			filters = append(filters, ActivityFilter{Actor: actor})
		}
		if action := strings.TrimSpace(c.Query("action")); action != "" {
			filters = append(filters, ActivityFilter{Action: action})
		}
		if object := strings.TrimSpace(c.Query("object")); object != "" {
			filters = append(filters, ActivityFilter{Object: object})
		}
		entries, err := a.activity.List(c.Context(), limit, filters...)
		if err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"entries": entries})
	}))
}

func (a *Admin) registerJobsRoute() {
	if a.router == nil || a.jobs == nil {
		return
	}
	wrap := a.authWrapper()
	path := joinPath(a.config.BasePath, "api/jobs")
	a.router.Get(path, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureJobs); err != nil {
			return writeError(c, err)
		}
		adminCtx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(adminCtx, a.config.JobsPermission, "jobs"); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"jobs": a.jobs.List()})
	}))
	a.router.Post(joinPath(path, "trigger"), wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureJobs); err != nil {
			return writeError(c, err)
		}
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		name, _ := body["name"].(string)
		if name == "" {
			return writeError(c, errors.New("name required"))
		}
		adminCtx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(adminCtx, a.config.JobsTriggerPermission, "jobs"); err != nil {
			return writeError(c, err)
		}
		if err := a.jobs.Trigger(adminCtx, name); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]string{"status": "ok"})
	}))
}

func (a *Admin) ensureSettingsNavigation(ctx context.Context) error {
	if a.nav == nil || !a.gates.Enabled(FeatureSettings) {
		return nil
	}
	settingsPath := joinPath(a.config.BasePath, "settings")
	const targetKey = "settings"

	if a.menuSvc != nil {
		menu, err := a.menuSvc.Menu(ctx, a.navMenuCode, a.config.DefaultLocale)
		if err == nil && menuHasTarget(menu.Items, targetKey, settingsPath) {
			return nil
		}
	}
	if navigationHasTarget(a.nav.fallback, targetKey, settingsPath) {
		return nil
	}

	item := MenuItem{
		Label:       "Settings",
		Icon:        "settings",
		Target:      map[string]any{"type": "url", "path": settingsPath, "key": targetKey},
		Permissions: []string{a.config.SettingsPermission},
		Menu:        a.navMenuCode,
		Locale:      a.config.DefaultLocale,
		Position:    80,
	}
	return a.addMenuItems(ctx, []MenuItem{item})
}

func menuHasTarget(items []MenuItem, key string, path string) bool {
	for _, item := range items {
		if targetMatches(item.Target, key, path) {
			return true
		}
		if menuHasTarget(item.Children, key, path) {
			return true
		}
	}
	return false
}

func navigationHasTarget(items []NavigationItem, key string, path string) bool {
	for _, item := range items {
		if targetMatches(item.Target, key, path) {
			return true
		}
		if navigationHasTarget(item.Children, key, path) {
			return true
		}
	}
	return false
}

func targetMatches(target map[string]any, key string, path string) bool {
	if len(target) == 0 {
		return false
	}
	if targetKey, ok := target["key"].(string); ok && targetKey == key {
		return true
	}
	if targetPath, ok := target["path"].(string); ok && path != "" && targetPath == path {
		return true
	}
	return false
}

func (a *Admin) registerSettingsRoutes() {
	if a.router == nil || a.settings == nil || !a.gates.Enabled(FeatureSettings) {
		return
	}
	base := joinPath(a.config.BasePath, "api/settings")
	wrap := a.authWrapper()

	a.router.Get(base, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureSettings); err != nil {
			return writeError(c, err)
		}
		ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"values": a.settings.ResolveAll(ctx.UserID),
		})
	}))

	a.router.Get(joinPath(a.config.BasePath, "api/settings/form"), wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureSettings); err != nil {
			return writeError(c, err)
		}
		ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(ctx, a.config.SettingsPermission, "settings"); err != nil {
			return writeError(c, err)
		}
		form := a.settingsForm.FormWithContext(ctx.Context, ctx.UserID)
		return writeJSON(c, form)
	}))

	a.router.Post(base, wrap(func(c router.Context) error {
		if err := a.gates.Require(FeatureSettings); err != nil {
			return writeError(c, err)
		}
		ctx := a.adminContextFromRequest(c, a.config.DefaultLocale)
		if err := a.requirePermission(ctx, a.config.SettingsUpdatePermission, "settings"); err != nil {
			return writeError(c, err)
		}
		payload, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		valuesRaw, ok := payload["values"].(map[string]any)
		if !ok {
			return writeError(c, errors.New("values must be an object"))
		}
		scope := SettingsScopeSite
		if s, ok := payload["scope"].(string); ok && s != "" {
			scope = SettingsScope(s)
		}
		bundle := SettingsBundle{
			Scope:  scope,
			UserID: ctx.UserID,
			Values: valuesRaw,
		}
		cmdCtx := WithSettingsBundle(ctx.Context, bundle)
		if err := a.commandRegistry.Dispatch(cmdCtx, settingsUpdateCommandName); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{
			"status": "ok",
			"values": a.settings.ResolveAll(ctx.UserID),
		})
	}))
}

func (a *Admin) requirePermission(ctx AdminContext, permission string, resource string) error {
	if permission == "" || a.authorizer == nil {
		return nil
	}
	if !a.authorizer.Can(ctx.Context, permission, resource) {
		return ErrForbidden
	}
	return nil
}

func (a *Admin) bootstrapWidgetAreas(ctx context.Context) error {
	if a.widgetSvc == nil {
		return nil
	}
	areas := []WidgetAreaDefinition{
		{Code: "admin.dashboard.main", Name: "Main Dashboard Area", Scope: "global"},
		{Code: "admin.dashboard.sidebar", Name: "Dashboard Sidebar", Scope: "global"},
		{Code: "admin.dashboard.footer", Name: "Dashboard Footer", Scope: "global"},
	}
	for _, area := range areas {
		if err := a.widgetSvc.RegisterAreaDefinition(ctx, area); err != nil {
			return err
		}
	}
	return nil
}

func (a *Admin) registerDefaultWidgets(ctx context.Context) error {
	if a.widgetSvc == nil {
		return nil
	}
	definitions := []WidgetDefinition{
		{
			Code: "admin.widget.user_stats",
			Name: "User Statistics",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"metric": map[string]any{
						"type": "string",
						"enum": []string{"activity", "notifications", "custom"},
					},
				},
			},
		},
		{
			Code: "admin.widget.activity_feed",
			Name: "Activity Feed",
			Schema: map[string]any{
				"type":       "object",
				"properties": map[string]any{"limit": map[string]any{"type": "integer", "default": 10}},
			},
		},
		{
			Code: "admin.widget.quick_actions",
			Name: "Quick Actions",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"actions": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "object",
							"properties": map[string]any{
								"label": map[string]any{"type": "string"},
								"url":   map[string]any{"type": "string"},
								"icon":  map[string]any{"type": "string"},
							},
						},
					},
				},
			},
		},
		{
			Code: "admin.widget.chart_sample",
			Name: "Sample Chart",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{"type": "string"},
					"type":  map[string]any{"type": "string", "enum": []string{"line", "bar", "pie"}},
				},
			},
		},
	}
	if a.gates.Enabled(FeatureSettings) {
		definitions = append(definitions, WidgetDefinition{
			Code: "admin.widget.settings_overview",
			Name: "Settings Overview",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"keys": map[string]any{
						"type":  "array",
						"items": map[string]any{"type": "string"},
					},
				},
			},
		})
	}
	for _, def := range definitions {
		if err := a.widgetSvc.RegisterDefinition(ctx, def); err != nil {
			return err
		}
	}
	a.registerDashboardProviders()
	return nil
}

func (a *Admin) registerDashboardProviders() {
	if a.dashboard == nil || !a.gates.Enabled(FeatureDashboard) {
		return
	}
	a.dashboard.WithWidgetService(a.widgetSvc)
	a.dashboard.WithCommandBus(a.commandRegistry)
	a.dashboard.WithAuthorizer(a.authorizer)

	statsSpec := DashboardProviderSpec{
		Code:          "admin.widget.user_stats",
		Name:          "User Statistics",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"metric": "activity", "title": "Activity"},
		Permission:    "",
		CommandName:   "dashboard.provider.user_stats",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			metric := toString(cfg["metric"])
			if metric == "" {
				metric = "activity"
			}
			title := toString(cfg["title"])
			if title == "" {
				title = "Statistic"
			}
			value := 0
			switch metric {
			case "notifications":
				if a.notifications != nil {
					items, _ := a.notifications.List(ctx.Context)
					value = len(items)
				}
			case "activity":
				if a.activity != nil {
					items, _ := a.activity.List(ctx.Context, 100)
					value = len(items)
				}
			default:
				if a.settings != nil {
					values := a.settings.ResolveAll(ctx.UserID)
					if v, ok := values[metric]; ok && v.Value != nil {
						if iv, ok := v.Value.(int); ok {
							value = iv
						}
					}
				}
			}
			return map[string]any{"title": title, "metric": metric, "value": value}, nil
		},
	}

	quickActionsSpec := DashboardProviderSpec{
		Code:          "admin.widget.quick_actions",
		Name:          "Quick Actions",
		DefaultArea:   "admin.dashboard.sidebar",
		DefaultConfig: map[string]any{},
		Permission:    "admin.quick_actions.view",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			if cfg == nil {
				cfg = map[string]any{}
			}
			actions, _ := cfg["actions"].([]any)
			if len(actions) == 0 {
				actions = []any{
					map[string]any{"label": "Go to CMS", "url": "/admin/pages", "icon": "file"},
					map[string]any{"label": "View Users", "url": "/admin/users", "icon": "users"},
				}
			}
			return map[string]any{"actions": actions}, nil
		},
	}

	chartSpec := DashboardProviderSpec{
		Code:          "admin.widget.chart_sample",
		Name:          "Sample Chart",
		DefaultArea:   "admin.dashboard.main",
		DefaultConfig: map[string]any{"title": "Weekly Totals", "type": "line"},
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			points := []map[string]any{
				{"label": "Mon", "value": 10},
				{"label": "Tue", "value": 15},
				{"label": "Wed", "value": 7},
				{"label": "Thu", "value": 20},
				{"label": "Fri", "value": 12},
			}
			return map[string]any{
				"title": toString(cfg["title"]),
				"type":  toString(cfg["type"]),
				"data":  points,
			}, nil
		},
	}

	a.dashboard.RegisterProvider(statsSpec)
	a.dashboard.RegisterProvider(quickActionsSpec)
	a.dashboard.RegisterProvider(chartSpec)
}

func (a *Admin) bootstrapSettingsDefaults(ctx context.Context) error {
	if a.settings == nil {
		return nil
	}
	dashboardEnabled := a.gates.Enabled(FeatureDashboard)
	searchEnabled := a.gates.Enabled(FeatureSearch)
	definitions := []SettingDefinition{
		{Key: "admin.title", Title: "Admin Title", Description: "Displayed in headers", Default: a.config.Title, Type: "string", Group: "admin"},
		{Key: "admin.default_locale", Title: "Default Locale", Description: "Locale fallback for navigation and CMS content", Default: a.config.DefaultLocale, Type: "string", Group: "admin"},
		{Key: "admin.theme", Title: "Theme", Description: "Theme selection for admin UI", Default: a.config.Theme, Type: "string", Group: "appearance"},
		{Key: "admin.dashboard_enabled", Title: "Dashboard Enabled", Description: "Toggle dashboard widgets", Default: dashboardEnabled, Type: "boolean", Group: "features"},
		{Key: "admin.search_enabled", Title: "Search Enabled", Description: "Toggle global search", Default: searchEnabled, Type: "boolean", Group: "features"},
	}
	for _, def := range definitions {
		a.settings.RegisterDefinition(def)
	}
	systemValues := map[string]any{}
	if a.config.Title != "" {
		systemValues["admin.title"] = a.config.Title
	}
	if a.config.DefaultLocale != "" {
		systemValues["admin.default_locale"] = a.config.DefaultLocale
	}
	if a.config.Theme != "" {
		systemValues["admin.theme"] = a.config.Theme
	}
	systemValues["admin.dashboard_enabled"] = dashboardEnabled
	systemValues["admin.search_enabled"] = searchEnabled

	if len(systemValues) > 0 {
		_ = a.settings.Apply(ctx, SettingsBundle{Scope: SettingsScopeSystem, Values: systemValues})
	}
	return nil
}

func (a *Admin) bootstrapAdminMenu(ctx context.Context) error {
	if a.menuSvc == nil {
		return nil
	}
	menu, err := a.menuSvc.CreateMenu(ctx, "admin.main")
	if err != nil {
		return err
	}
	_ = menu
	// Modules are responsible for contributing menu items. We only ensure the menu exists.
	return nil
}
