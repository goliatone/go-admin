package admin

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/boot"
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

	navMenuCode := NormalizeMenuSlug(cfg.NavMenuCode)
	if navMenuCode == "" {
		navMenuCode = NormalizeMenuSlug("admin.main")
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

// RegisterWidgetArea registers an additional dashboard widget area.
func (a *Admin) RegisterWidgetArea(def WidgetAreaDefinition) {
	if a.dashboard != nil {
		a.dashboard.RegisterArea(def)
		return
	}
	if a.widgetSvc != nil && strings.TrimSpace(def.Code) != "" {
		_ = a.widgetSvc.RegisterAreaDefinition(context.Background(), def)
	}
}

// WidgetAreas returns known dashboard widget areas.
func (a *Admin) WidgetAreas() []WidgetAreaDefinition {
	if a.dashboard != nil {
		return a.dashboard.Areas()
	}
	if a.widgetSvc != nil {
		return a.widgetSvc.Areas()
	}
	return nil
}

// EnforceDashboardAreas toggles validation for unknown widget areas.
func (a *Admin) EnforceDashboardAreas(enable bool) {
	if a.dashboard != nil {
		a.dashboard.EnforceKnownAreas(enable)
	}
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

// Bootstrap initializes CMS seed data (CMS container, admin menu, settings defaults).
func (a *Admin) Bootstrap(ctx context.Context) error {
	if a.gates.Enabled(FeatureCMS) || a.gates.Enabled(FeatureDashboard) {
		if err := a.ensureCMS(ctx); err != nil {
			return err
		}
		if err := a.registerWidgetAreas(); err != nil {
			return err
		}
		if err := a.registerDefaultWidgets(); err != nil {
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

	// TODO: Configurable
	if a.gates.Enabled(FeatureNotifications) && a.notifications != nil {
		_, _ = a.notifications.Add(ctx, Notification{Title: "Welcome to go-admin", Message: "Notifications are wired", Read: false})
	}

	return nil
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
	return a.Boot(boot.DefaultBootSteps()...)
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
	// Track canonical keys per menu code to avoid inserting duplicates into persistent stores.
	menuKeys := map[string]map[string]bool{}
	fallbackItems := []MenuItem{}
	if a.menuSvc != nil {
		menuCodes := map[string]bool{}
		for _, item := range items {
			code := item.Menu
			if code == "" {
				code = a.navMenuCode
			}
			code = NormalizeMenuSlug(code)
			if code == "" {
				code = a.navMenuCode
			}
			item = normalizeMenuItem(item, code)
			item = mapMenuIDs(item)
			keySet, ok := menuKeys[code]
			if !ok {
				keySet = map[string]bool{}
				menuKeys[code] = keySet
				if menu, err := a.menuSvc.Menu(ctx, code, item.Locale); err == nil && menu != nil {
					addMenuKeys(menu.Items, keySet)
				}
			}
			keys := canonicalMenuKeys(item)
			if hasAnyKey(keySet, keys) {
				continue
			}
			if !menuCodes[code] {
				if _, err := a.menuSvc.CreateMenu(ctx, code); err != nil {
					if !strings.Contains(strings.ToLower(err.Error()), "exist") {
						return err
					}
				}
				menuCodes[code] = true
			}
			if err := a.menuSvc.AddMenuItem(ctx, code, item); err != nil {
				return err
			}
			for _, key := range keys {
				keySet[key] = true
			}
			fallbackItems = append(fallbackItems, item)
		}
	}
	if (!cmsEnabled || a.menuSvc == nil) && a.nav != nil {
		if len(fallbackItems) == 0 {
			fallbackItems = items
		}
		// Ensure fallback navigation also receives deduped items when CMS is disabled.
		if len(fallbackItems) > 0 {
			deduped := dedupeMenuItems(fallbackItems)
			converted := convertMenuItems(deduped, a.translator, a.config.DefaultLocale)
			if len(converted) > 0 {
				a.nav.AddFallback(converted...)
			}
		}
	}
	return nil
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

func (a *Admin) requirePermission(ctx AdminContext, permission string, resource string) error {
	if permission == "" || a.authorizer == nil {
		return nil
	}
	if !a.authorizer.Can(ctx.Context, permission, resource) {
		return ErrForbidden
	}
	return nil
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

func joinPath(basePath, suffix string) string {
	return path.Join("/", basePath, suffix)
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
