package admin

import (
	"context"
	"errors"
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
	dash            *dashboardComponents
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

// New constructs an Admin orchestrator with explicit dependencies.
func New(cfg Config, deps Dependencies) (*Admin, error) {
	cfg = applyConfigDefaults(cfg)
	if err := deps.validate(cfg); err != nil {
		return nil, err
	}

	if deps.CMSContainer != nil {
		cfg.CMS.Container = deps.CMSContainer
	}
	if deps.CMSContainerBuilder != nil {
		cfg.CMS.ContainerBuilder = deps.CMSContainerBuilder
	}

	registry := deps.Registry
	if registry == nil {
		registry = NewRegistry()
	}

	container := cfg.CMS.Container
	if container == nil {
		container = NewNoopCMSContainer()
	}

	translator := deps.Translator
	if translator == nil {
		translator = NoopTranslator{}
	}

	activitySink := deps.ActivitySink
	if activitySink == nil {
		activitySink = NewActivityFeed()
	}

	cmdReg := deps.CommandRegistry
	if cmdReg == nil {
		enableCommands := cfg.Features.Commands || cfg.Features.Settings || cfg.Features.Jobs || cfg.Features.Export || cfg.Features.Bulk || cfg.Features.Dashboard || cfg.Features.Notifications
		cmdReg = NewCommandRegistry(enableCommands)
	}

	settingsSvc := deps.SettingsService
	if settingsSvc == nil {
		settingsSvc = NewSettingsService()
	}
	settingsSvc.WithRegistry(registry)
	if cfg.Features.Settings {
		if db, err := newSettingsDB(); err == nil {
			if adapter, err := NewBunSettingsAdapter(db); err == nil {
				settingsSvc.UseAdapter(adapter)
			}
		}
	}
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.ThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if cfg.Features.Settings {
		cmdReg.Register(settingsCmd)
	}

	notifSvc := deps.NotificationService
	if notifSvc == nil {
		notifSvc = DisabledNotificationService{}
		if cfg.Features.Notifications {
			if svc, err := newGoNotificationsService(cfg.DefaultLocale, translator, activitySink); err == nil {
				notifSvc = svc
			} else {
				mem := NewInMemoryNotificationService()
				mem.WithActivitySink(activitySink)
				notifSvc = mem
			}
		}
	}

	exportSvc := deps.ExportService
	if exportSvc == nil {
		exportSvc = DisabledExportService{}
		if cfg.Features.Export {
			exportSvc = NewInMemoryExportService()
		}
	}

	bulkSvc := deps.BulkService
	if bulkSvc == nil {
		bulkSvc = DisabledBulkService{}
		if cfg.Features.Bulk {
			bulkSvc = NewInMemoryBulkService()
		}
	}

	mediaLib := deps.MediaLibrary
	if mediaLib == nil {
		mediaLib = DisabledMediaLibrary{}
		if cfg.Features.Media {
			mediaBase := cfg.BasePath
			if mediaBase == "" {
				mediaBase = "/admin"
			}
			mediaLib = NewInMemoryMediaLibrary(mediaBase)
		}
	}

	preferencesSvc := NewPreferencesService(deps.PreferencesStore).WithDefaults(cfg.Theme, cfg.ThemeVariant)
	preferencesSvc.WithActivitySink(activitySink)
	profileSvc := NewProfileService(deps.ProfileStore)
	profileSvc.WithActivitySink(activitySink)
	userSvc := NewUserManagementService(deps.UserRepository, deps.RoleRepository)
	userSvc.WithActivitySink(activitySink)
	tenantSvc := NewTenantService(deps.TenantRepository)
	tenantSvc.WithActivitySink(activitySink)
	orgSvc := NewOrganizationService(deps.OrganizationRepository)
	orgSvc.WithActivitySink(activitySink)

	jobReg := deps.JobRegistry
	if jobReg == nil {
		jobReg = NewJobRegistry(cmdReg)
	}
	jobReg.WithActivitySink(activitySink)
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

	gates := NewFeatureGates(cfg.FeatureFlags)
	if deps.Gates != nil {
		gates = *deps.Gates
	}

	adm := &Admin{
		config:          cfg,
		features:        cfg.Features,
		featureFlags:    cfg.FeatureFlags,
		gates:           gates,
		registry:        registry,
		cms:             container,
		widgetSvc:       container.WidgetService(),
		menuSvc:         container.MenuService(),
		contentSvc:      container.ContentService(),
		authenticator:   deps.Authenticator,
		router:          deps.Router,
		commandRegistry: cmdReg,
		dashboard:       dashboard,
		nav:             NewNavigation(container.MenuService(), deps.Authorizer),
		search:          NewSearchEngine(deps.Authorizer),
		authorizer:      deps.Authorizer,
		notifications:   notifSvc,
		activity:        activitySink,
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
		translator:      translator,
	}

	adm.dashboard.WithWidgetService(adm.widgetSvc)
	adm.dashboard.WithPreferences(NewDashboardPreferencesAdapter(preferencesSvc))
	adm.dashboard.WithPreferenceService(preferencesSvc)
	adm.dashboard.WithCommandBus(cmdReg)
	adm.dashboard.WithActivitySink(activitySink)
	adm.dashboard.WithAuthorizer(deps.Authorizer)

	settingsForm.WithThemeResolver(adm.resolveTheme)
	adm.panelForm.ThemeResolver = adm.resolveTheme

	if adm.nav != nil {
		adm.nav.SetDefaultMenuCode(navMenuCode)
		adm.nav.UseCMS(adm.gates.Enabled(FeatureCMS))
		adm.nav.SetTranslator(translator)
	}
	if adm.search != nil {
		adm.search.Enable(adm.gates.Enabled(FeatureSearch))
	}
	if adm.settings != nil {
		adm.settings.Enable(adm.gates.Enabled(FeatureSettings))
	}
	adm.applyActivitySink(activitySink)

	return adm, nil
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
			a.nav.SetTranslator(t)
		}
	}
	return a
}

// WithAuthorizer sets an authorizer for panel permissions.
func (a *Admin) WithAuthorizer(authz Authorizer) *Admin {
	a.authorizer = authz
	if a.nav != nil {
		a.nav.SetAuthorizer(authz)
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
