package admin

import (
	"context"
	"sort"
	"strings"

	"github.com/goliatone/go-featuregate/catalog"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
	"github.com/goliatone/go-users/query"
)

// Admin orchestrates CMS-backed admin features and adapters.
type Admin struct {
	config                       Config
	logger                       Logger
	loggerProvider               LoggerProvider
	featureGate                  fggate.FeatureGate
	featureCatalog               catalog.Catalog
	featureCatalogResolver       catalog.MessageResolver
	urlManager                   *urlkit.RouteManager
	registry                     *Registry
	cms                          CMSContainer
	widgetSvc                    CMSWidgetService
	menuSvc                      CMSMenuService
	contentSvc                   CMSContentService
	contentTypeSvc               CMSContentTypeService
	authenticator                Authenticator
	router                       AdminRouter
	commandBus                   *CommandBus
	dashboard                    *Dashboard
	debugCollector               *DebugCollector
	replSessionStore             DebugREPLSessionStore
	replSessionManager           *DebugREPLSessionManager
	replCommandCatalog           *DebugREPLCommandCatalog
	debugSessionStore            DebugUserSessionStore
	dash                         *dashboardComponents
	nav                          *Navigation
	search                       *SearchEngine
	authorizer                   Authorizer
	notifications                NotificationService
	activity                     ActivitySink
	activityFeed                 ActivityFeedQuerier
	activityPolicy               activity.ActivityAccessPolicy
	jobs                         *JobRegistry
	settings                     *SettingsService
	settingsForm                 *SettingsFormAdapter
	settingsCommand              *SettingsUpdateCommand
	preferences                  *PreferencesService
	profile                      *ProfileService
	users                        *UserManagementService
	tenants                      *TenantService
	organizations                *OrganizationService
	bulkUserImport               *command.BulkUserImportCommand
	panelForm                    *PanelFormAdapter
	themeProvider                ThemeProvider
	themeManifest                *theme.Manifest
	defaultTheme                 *ThemeSelection
	exportRegistry               ExportRegistry
	exportRegistrar              ExportHTTPRegistrar
	exportMetadata               ExportMetadataProvider
	bulkSvc                      BulkService
	mediaLibrary                 MediaLibrary
	initHooks                    []func(AdminRouter) error
	initHooksRun                 bool
	modulesLoaded                bool
	navMenuCode                  string
	translator                   Translator
	workflow                     WorkflowEngine
	translationPolicy            TranslationPolicy
	cmsWorkflowDefaults          bool
	cmsWorkflowActions           []Action
	cmsWorkflowActionsSet        bool
	preview                      *PreviewService
	panelTabPermissionEvaluator  PanelTabPermissionEvaluator
	panelTabCollisionHandler     PanelTabCollisionHandler
	cmsRoutesRegistered          bool
	contentAliasRoutesRegistered bool
}

type activityAware interface {
	WithActivitySink(ActivitySink)
}

// New constructs an Admin orchestrator with explicit dependencies.
func New(cfg Config, deps Dependencies) (*Admin, error) {
	cfg = applyConfigDefaults(cfg)
	SetDefaultErrorPresenter(NewErrorPresenter(cfg.Errors))
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
	loggerProvider, logger := resolveLoggerDependencies(deps.LoggerProvider, deps.Logger)
	registry.WithLogger(resolveNamedLogger("admin.registry", loggerProvider, logger))

	featureGate := deps.FeatureGate
	if featureGate == nil {
		featureGate = newFeatureGateFromFlags(nil)
	}

	featureCatalog := deps.FeatureCatalog
	if featureCatalog == nil {
		catalogPath := strings.TrimSpace(cfg.FeatureCatalogPath)
		if catalogPath != "" {
			loaded, err := loadFeatureCatalogFile(catalogPath)
			if err != nil {
				return nil, err
			}
			featureCatalog = loaded
		}
	}
	featureCatalogResolver := deps.FeatureCatalogResolver
	if featureCatalogResolver == nil {
		featureCatalogResolver = catalog.PlainResolver{}
	}

	activitySink := deps.ActivitySink
	if activitySink == nil {
		activitySink = NewActivityFeed()
	}
	activityPolicy := deps.ActivityAccessPolicy
	if activityPolicy == nil {
		// TODO: Review to make sure we have something that makes sense
		activityPolicy = activity.NewDefaultAccessPolicy()
	}
	activityFeed := deps.ActivityFeedQuery
	if activityFeed == nil {
		activityFeed = deps.ActivityService
	}
	if activityFeed == nil && deps.ActivityRepository != nil {
		opts := []query.ActivityQueryOption{}
		if activityPolicy != nil {
			opts = append(opts, query.WithActivityAccessPolicy(activityPolicy))
		}
		activityFeed = query.NewActivityFeedQuery(deps.ActivityRepository, nil, opts...)
	}

	replSessionStore := deps.DebugREPLSessionStore
	if replSessionStore == nil {
		replSessionStore = NewInMemoryDebugREPLSessionStore()
	}
	replSessionManager := NewDebugREPLSessionManager(replSessionStore, cfg.Debug.Repl)
	replCommandCatalog := debugREPLCommandCatalog()
	debugSessionStore := deps.DebugUserSessionStore
	if debugSessionStore == nil {
		debugSessionStore = NewInMemoryDebugUserSessionStore()
	}

	commandBus := deps.CommandBus
	if commandBus == nil {
		enableCommands := featureEnabled(featureGate, FeatureCommands) || featureEnabled(featureGate, FeatureSettings) || featureEnabled(featureGate, FeatureJobs) || featureEnabled(featureGate, FeatureBulk) || featureEnabled(featureGate, FeatureDashboard) || featureEnabled(featureGate, FeatureNotifications)
		commandBus = NewCommandBus(enableCommands)
	}
	if err := RegisterCoreCommandFactories(commandBus); err != nil {
		return nil, err
	}

	settingsSvc := deps.SettingsService
	if settingsSvc == nil {
		settingsSvc = NewSettingsService()
	}
	settingsSvc.WithRegistry(registry)
	if featureEnabled(featureGate, FeatureSettings) {
		if db, err := newSettingsDB(); err == nil {
			if adapter, err := NewBunSettingsAdapter(db); err == nil {
				settingsSvc.UseAdapter(adapter)
			}
		}
	}
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.ThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if featureEnabled(featureGate, FeatureSettings) {
		if _, err := RegisterCommand(commandBus, settingsCmd); err != nil {
			return nil, err
		}
	}

	notifSvc := deps.NotificationService
	if notifSvc == nil {
		notifSvc = DisabledNotificationService{}
		if featureEnabled(featureGate, FeatureNotifications) {
			if svc, err := newGoNotificationsService(cfg.DefaultLocale, translator, activitySink); err == nil {
				notifSvc = svc
			} else {
				mem := NewInMemoryNotificationService()
				mem.WithActivitySink(activitySink)
				notifSvc = mem
			}
		}
	}

	exportRegistry := deps.ExportRegistry
	exportRegistrar := deps.ExportRegistrar
	exportMetadata := deps.ExportMetadata

	bulkSvc := deps.BulkService
	if bulkSvc == nil {
		bulkSvc = DisabledBulkService{}
		if featureEnabled(featureGate, FeatureBulk) {
			bulkSvc = NewInMemoryBulkService()
		}
	}

	urlManager := deps.URLManager
	if urlManager == nil {
		var err error
		urlManager, err = newURLManager(cfg)
		if err != nil {
			return nil, err
		}
	}

	mediaLib := deps.MediaLibrary
	if mediaLib == nil {
		mediaLib = DisabledMediaLibrary{}
		if featureEnabled(featureGate, FeatureMedia) {
			mediaBase := resolveURLWith(urlManager, "admin", "dashboard", nil, nil)
			if mediaBase == "" {
				mediaBase = adminBasePath(cfg)
			}
			mediaBase = strings.TrimRight(mediaBase, "/")
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
		jobReg = NewJobRegistry()
	}
	jobReg.WithActivitySink(activitySink)
	if !featureEnabled(featureGate, FeatureJobs) {
		jobReg.Enable(false)
	}

	if featureEnabled(featureGate, FeatureNotifications) {
		if _, err := RegisterCommand(commandBus, &NotificationMarkCommand{Service: notifSvc}); err != nil {
			return nil, err
		}
	}
	if featureEnabled(featureGate, FeatureBulk) {
		if _, err := RegisterCommand(commandBus, &BulkCommand{Service: bulkSvc}); err != nil {
			return nil, err
		}
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
	dashboard.WithLogger(resolveNamedLogger("admin.dashboard", loggerProvider, logger))

	adm := &Admin{
		config:                 cfg,
		logger:                 logger,
		loggerProvider:         loggerProvider,
		featureGate:            featureGate,
		featureCatalog:         featureCatalog,
		featureCatalogResolver: featureCatalogResolver,
		urlManager:             urlManager,
		registry:               registry,
		cms:                    container,
		widgetSvc:              container.WidgetService(),
		menuSvc:                container.MenuService(),
		contentSvc:             container.ContentService(),
		contentTypeSvc:         nil,
		authenticator:          deps.Authenticator,
		router:                 deps.Router,
		commandBus:             commandBus,
		dashboard:              dashboard,
		replSessionStore:       replSessionStore,
		replSessionManager:     replSessionManager,
		replCommandCatalog:     replCommandCatalog,
		debugSessionStore:      debugSessionStore,
		nav:                    NewNavigation(container.MenuService(), deps.Authorizer),
		search:                 NewSearchEngine(deps.Authorizer),
		authorizer:             deps.Authorizer,
		notifications:          notifSvc,
		activity:               activitySink,
		activityFeed:           activityFeed,
		activityPolicy:         activityPolicy,
		jobs:                   jobReg,
		settings:               settingsSvc,
		settingsForm:           settingsForm,
		settingsCommand:        settingsCmd,
		preferences:            preferencesSvc,
		profile:                profileSvc,
		users:                  userSvc,
		tenants:                tenantSvc,
		organizations:          orgSvc,
		bulkUserImport:         deps.BulkUserImport,
		panelForm:              &PanelFormAdapter{},
		defaultTheme:           defaultTheme,
		exportRegistry:         exportRegistry,
		exportRegistrar:        exportRegistrar,
		exportMetadata:         exportMetadata,
		bulkSvc:                bulkSvc,
		mediaLibrary:           mediaLib,
		navMenuCode:            navMenuCode,
		translator:             translator,
		workflow:               deps.Workflow,
		translationPolicy:      deps.TranslationPolicy,
		preview:                NewPreviewService(cfg.PreviewSecret),
	}

	if _, err := RegisterQuery(commandBus, &dashboardDiagnosticsQuery{admin: adm}); err != nil {
		return nil, err
	}

	if adm.contentTypeSvc == nil {
		adm.contentTypeSvc = container.ContentTypeService()
	}
	if adm.contentTypeSvc == nil {
		if svc, ok := adm.contentSvc.(CMSContentTypeService); ok && svc != nil {
			adm.contentTypeSvc = svc
		}
	}

	enrichmentMode := deps.ActivityEnrichmentWriteMode
	if enrichmentMode == "" {
		enrichmentMode = activity.EnrichmentWriteModeWrapper
	}
	sessionIDProvider := deps.ActivitySessionIDProvider
	if sessionIDProvider == nil {
		sessionIDProvider = defaultSessionIDProvider()
	}
	sessionIDKey := strings.TrimSpace(deps.ActivitySessionIDKey)

	activityEnricher := deps.ActivityEnricher
	if activityEnricher == nil && enrichmentMode == activity.EnrichmentWriteModeWrapper {
		activityEnricher = NewAdminActivityEnricher(AdminActivityEnricherConfig{
			ActorResolver: AdminActorResolver{
				Users:    deps.UserRepository,
				Profiles: deps.ProfileStore,
			},
			ObjectResolver: NewAdminObjectResolver(AdminObjectResolverConfig{
				Users:         deps.UserRepository,
				Roles:         deps.RoleRepository,
				Tenants:       deps.TenantRepository,
				Organizations: deps.OrganizationRepository,
				Profiles:      deps.ProfileStore,
				Settings:      settingsSvc,
				Jobs:          jobReg,
				Widgets:       adm.widgetSvc,
				Menus:         adm.menuSvc,
				Content:       adm.contentSvc,
			}),
		})
	}

	switch enrichmentMode {
	case activity.EnrichmentWriteModeWrapper:
		activitySink = newEnrichedActivitySink(activitySink, activityEnricher, deps.ActivityEnrichmentErrorHandler, sessionIDProvider, sessionIDKey)
	case activity.EnrichmentWriteModeHybrid:
		activitySink = newEnrichedActivitySink(activitySink, activityEnricher, deps.ActivityEnrichmentErrorHandler, sessionIDProvider, sessionIDKey)
	}

	adm.activity = activitySink

	adm.dashboard.WithWidgetService(adm.widgetSvc)
	adm.dashboard.WithPreferences(NewDashboardPreferencesAdapter(preferencesSvc))
	adm.dashboard.WithPreferenceService(preferencesSvc)
	adm.dashboard.WithCommandBus(commandBus)
	adm.dashboard.WithActivitySink(activitySink)
	adm.dashboard.WithAuthorizer(deps.Authorizer)

	settingsForm.WithThemeResolver(adm.resolveTheme)
	adm.panelForm.ThemeResolver = adm.resolveTheme

	if adm.nav != nil {
		adm.nav.SetDefaultMenuCode(navMenuCode)
		adm.nav.UseCMS(featureEnabled(adm.featureGate, FeatureCMS))
		adm.nav.SetTranslator(translator)
	}
	if adm.search != nil {
		adm.search.Enable(featureEnabled(adm.featureGate, FeatureSearch))
	}
	if adm.settings != nil {
		adm.settings.Enable(featureEnabled(adm.featureGate, FeatureSettings))
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

// WithWorkflow attaches a workflow engine to the admin orchestrator.
func (a *Admin) WithWorkflow(w WorkflowEngine) *Admin {
	a.workflow = w
	applyCMSWorkflowDefaults(a)
	return a
}

// WithTranslationPolicy attaches a translation policy used during workflow transitions.
func (a *Admin) WithTranslationPolicy(policy TranslationPolicy) *Admin {
	a.translationPolicy = policy
	return a
}

// WithCMSWorkflowDefaults enables registering default CMS workflows on a custom engine
// that can report existing definitions.
func (a *Admin) WithCMSWorkflowDefaults() *Admin {
	if a == nil {
		return a
	}
	a.cmsWorkflowDefaults = true
	applyCMSWorkflowDefaults(a)
	return a
}

// WithCMSWorkflowActions overrides the default CMS workflow actions for demo panels.
func (a *Admin) WithCMSWorkflowActions(actions ...Action) *Admin {
	if a == nil {
		return a
	}
	a.cmsWorkflowActions = append([]Action{}, actions...)
	a.cmsWorkflowActionsSet = true
	return a
}

// Authorizer exposes the configured authorizer (if any).
func (a *Admin) Authorizer() Authorizer {
	if a == nil {
		return nil
	}
	return a.authorizer
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

// WithRoleAssignmentLookup sets the lookup used to validate custom role assignments.
func (a *Admin) WithRoleAssignmentLookup(lookup RoleAssignmentLookup) *Admin {
	if a == nil || a.users == nil || lookup == nil {
		return a
	}
	a.users.WithRoleAssignmentLookup(lookup)
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
	if featureEnabled(a.featureGate, FeaturePreferences) && a.preferences != nil {
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
	ctx.Translator = a.translator
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
	return &PanelBuilder{commandBus: a.commandBus}
}

// Dashboard exposes the dashboard orchestration service.
func (a *Admin) Dashboard() *Dashboard {
	return a.dashboard
}

// Debug exposes the debug collector when the module is enabled.
func (a *Admin) Debug() *DebugCollector {
	return a.debugCollector
}

// DebugREPLSessions exposes the REPL session store.
func (a *Admin) DebugREPLSessions() DebugREPLSessionStore {
	return a.replSessionStore
}

// DebugUserSessions exposes the debug user session store.
func (a *Admin) DebugUserSessions() DebugUserSessionStore {
	return a.debugSessionStore
}

// DebugREPLSessionManager exposes the REPL session lifecycle manager.
func (a *Admin) DebugREPLSessionManager() *DebugREPLSessionManager {
	return a.replSessionManager
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
func (a *Admin) Commands() *CommandBus {
	return a.commandBus
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

// ExportRegistry exposes the export definition registry.
func (a *Admin) ExportRegistry() ExportRegistry {
	return a.exportRegistry
}

// ExportHTTPRegistrar exposes the export HTTP registrar.
func (a *Admin) ExportHTTPRegistrar() ExportHTTPRegistrar {
	return a.exportRegistrar
}

// ExportMetadataProvider exposes export metadata resolution.
func (a *Admin) ExportMetadataProvider() ExportMetadataProvider {
	return a.exportMetadata
}

// BulkService exposes the bulk adapter.
func (a *Admin) BulkService() BulkService {
	return a.bulkSvc
}

// MediaLibrary exposes the media library adapter.
func (a *Admin) MediaLibrary() MediaLibrary {
	return a.mediaLibrary
}

// Preview returns the preview service.
func (a *Admin) Preview() *PreviewService {
	return a.preview
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
	if actor == "" {
		actor = ActivityActorTypeSystem
	}
	if actor == ActivityActorTypeSystem {
		metadata = tagActivityActorType(metadata, ActivityActorTypeSystem)
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
		return nil, validationDomainError("panel builder is nil", map[string]any{
			"component": "admin",
			"field":     "panel_builder",
		})
	}
	builder.name = name
	builder.commandBus = a.commandBus
	if builder.activity == nil {
		builder.activity = a.activity
	}
	if builder.authorizer == nil {
		builder.authorizer = a.authorizer
	}
	if builder.workflow == nil && !builder.workflowSet {
		builder.workflow = a.workflow
	}
	if builder.translationPolicy == nil && !builder.translationPolicySet {
		builder.translationPolicy = a.translationPolicy
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

// UnregisterPanel removes a previously registered panel.
func (a *Admin) UnregisterPanel(name string) error {
	if a.registry == nil {
		return serviceNotConfiguredDomainError("registry", map[string]any{
			"component": "admin",
		})
	}
	return a.registry.UnregisterPanel(name)
}

// RegisterPanelTab attaches a tab to an existing or future panel.
func (a *Admin) RegisterPanelTab(panelName string, tab PanelTab) error {
	if a.registry == nil {
		return serviceNotConfiguredDomainError("registry", map[string]any{
			"component": "admin",
		})
	}
	if a.panelTabCollisionHandler == nil {
		return a.registry.RegisterPanelTab(panelName, tab)
	}

	tabID := strings.TrimSpace(tab.ID)
	if tabID == "" {
		tabID = derivePanelTabID(tab)
		tab.ID = tabID
	}
	if tabID == "" {
		return requiredFieldDomainError("panel tab id", map[string]any{
			"component": "admin",
		})
	}

	for _, existing := range a.registry.PanelTabs(panelName) {
		if existing.ID != tabID {
			continue
		}
		chosen, err := a.resolvePanelTabCollision(panelName, existing, tab)
		if err != nil {
			return err
		}
		chosen.ID = tabID
		chosen = normalizePanelTab(chosen)
		return a.registry.SetPanelTab(panelName, chosen)
	}

	return a.registry.RegisterPanelTab(panelName, tab)
}

// WithPanelTabPermissionEvaluator sets a custom permission evaluator for tabs.
func (a *Admin) WithPanelTabPermissionEvaluator(fn PanelTabPermissionEvaluator) *Admin {
	a.panelTabPermissionEvaluator = fn
	return a
}

// WithPanelTabCollisionHandler sets a collision handler for tab registrations.
func (a *Admin) WithPanelTabCollisionHandler(fn PanelTabCollisionHandler) *Admin {
	a.panelTabCollisionHandler = fn
	return a
}

func (a *Admin) decorateSchema(schema *Schema, panelName string) {
	if schema == nil {
		return
	}
	if featureEnabled(a.featureGate, FeatureExport) {
		exportURL := resolveURLWith(a.urlManager, "admin", "exports", nil, nil)
		schema.Export = &ExportConfig{
			Definition: panelName,
			Endpoint:   exportURL,
		}
	}
	if featureEnabled(a.featureGate, FeatureBulk) && a.bulkSvc != nil {
		bulkURL := resolveURLWith(a.urlManager, adminAPIGroupName(a.config), "bulk", nil, nil)
		schema.Bulk = &BulkConfig{
			Endpoint:         bulkURL,
			SupportsRollback: supportsBulkRollback(a.bulkSvc),
		}
	}
	if featureEnabled(a.featureGate, FeatureMedia) && a.mediaLibrary != nil {
		libraryPath := resolveURLWith(a.urlManager, adminAPIGroupName(a.config), "media.library", nil, nil)
		schema.Media = &MediaConfig{LibraryPath: libraryPath}
		applyMediaHints(schema, libraryPath)
	}
}

func (a *Admin) decorateSchemaFor(ctx AdminContext, schema *Schema, panelName string) error {
	if schema == nil {
		return nil
	}
	a.decorateSchema(schema, panelName)
	tabs, err := a.resolvePanelTabs(ctx, panelName)
	if err != nil {
		return err
	}
	if len(tabs) > 0 {
		schema.Tabs = tabs
	} else {
		schema.Tabs = nil
	}

	if ctx.Translator != nil && ctx.Locale != "" {
		a.translateSchema(ctx, schema)
	}

	return nil
}

func (a *Admin) translateSchema(ctx AdminContext, schema *Schema) {
	t := ctx.Translator
	locale := ctx.Locale

	translate := func(label, key string) string {
		if key == "" {
			return label
		}
		res, err := t.Translate(locale, key)
		if err != nil || res == "" || res == key {
			return label
		}
		return res
	}

	translateField := func(f *Field) {
		f.Label = translate(f.Label, f.LabelKey)
		for i := range f.Options {
			f.Options[i].Label = translate(f.Options[i].Label, f.Options[i].LabelKey)
		}
	}

	for i := range schema.ListFields {
		translateField(&schema.ListFields[i])
	}
	for i := range schema.FormFields {
		translateField(&schema.FormFields[i])
	}
	for i := range schema.DetailFields {
		translateField(&schema.DetailFields[i])
	}
	for i := range schema.Filters {
		schema.Filters[i].Label = translate(schema.Filters[i].Label, schema.Filters[i].LabelKey)
	}
	for i := range schema.Actions {
		schema.Actions[i].Label = translate(schema.Actions[i].Label, schema.Actions[i].LabelKey)
	}
	for i := range schema.BulkActions {
		schema.BulkActions[i].Label = translate(schema.BulkActions[i].Label, schema.BulkActions[i].LabelKey)
	}
	for i := range schema.Tabs {
		schema.Tabs[i].Label = translate(schema.Tabs[i].Label, schema.Tabs[i].LabelKey)
	}
}

func (a *Admin) resolvePanelTabs(ctx AdminContext, panelName string) ([]PanelTab, error) {
	if a == nil || a.registry == nil {
		return nil, nil
	}
	ownerTabs := []PanelTab{}
	if panel, ok := a.registry.Panel(panelName); ok && panel != nil {
		ownerTabs = append(ownerTabs, panel.tabs...)
	}
	registryTabs := a.registry.PanelTabs(panelName)
	return a.mergePanelTabs(ctx, panelName, ownerTabs, registryTabs)
}

// ResolvePanelTabs returns the effective tabs for a panel using the provided admin context.
func (a *Admin) ResolvePanelTabs(ctx AdminContext, panelName string) ([]PanelTab, error) {
	if a == nil {
		return nil, nil
	}
	if ctx.Context == nil {
		ctx.Context = context.Background()
	}
	if ctx.Translator == nil {
		ctx.Translator = a.translator
	}
	return a.resolvePanelTabs(a.withTheme(ctx), panelName)
}

// ResolvePanelTabsFromRequest resolves panel tabs using request-derived context and permissions.
func (a *Admin) ResolvePanelTabsFromRequest(c router.Context, panelName, locale string) ([]PanelTab, error) {
	if a == nil || c == nil {
		return nil, nil
	}
	return a.ResolvePanelTabs(a.adminContextFromRequest(c, locale), panelName)
}

func (a *Admin) mergePanelTabs(ctx AdminContext, panelName string, groups ...[]PanelTab) ([]PanelTab, error) {
	byID := map[string]PanelTab{}
	for _, group := range groups {
		for _, tab := range group {
			normalized := normalizePanelTab(tab)
			if normalized.ID == "" {
				continue
			}
			if !a.panelTabAllowed(ctx, normalized, panelName) {
				continue
			}
			if existing, ok := byID[normalized.ID]; ok {
				chosen, err := a.resolvePanelTabCollision(panelName, existing, normalized)
				if err != nil {
					return nil, err
				}
				chosen.ID = normalized.ID
				chosen = normalizePanelTab(chosen)
				if !a.panelTabAllowed(ctx, chosen, panelName) {
					continue
				}
				byID[normalized.ID] = chosen
				continue
			}
			byID[normalized.ID] = normalized
		}
	}
	if len(byID) == 0 {
		return nil, nil
	}
	out := make([]PanelTab, 0, len(byID))
	for _, tab := range byID {
		out = append(out, tab)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Position == out[j].Position {
			return out[i].ID < out[j].ID
		}
		return out[i].Position < out[j].Position
	})
	out = prependImplicitDetailTab(out)
	return out, nil
}

func normalizePanelTab(tab PanelTab) PanelTab {
	if strings.TrimSpace(tab.ID) == "" {
		tab.ID = derivePanelTabID(tab)
	}
	if tab.Scope == "" {
		tab.Scope = PanelTabScopeList
	}
	if len(tab.Contexts) == 0 {
		tab.Contexts = []string{string(tab.Scope)}
	}
	return tab
}

func prependImplicitDetailTab(tabs []PanelTab) []PanelTab {
	if len(tabs) == 0 {
		return tabs
	}
	firstDetailIdx := -1
	for i := range tabs {
		if strings.EqualFold(strings.TrimSpace(tabs[i].ID), "details") {
			return tabs
		}
		if panelTabMatchesContext(tabs[i], string(PanelTabScopeDetail)) && firstDetailIdx == -1 {
			firstDetailIdx = i
		}
	}
	if firstDetailIdx == -1 {
		return tabs
	}
	details := normalizePanelTab(PanelTab{
		ID:       "details",
		Label:    "Details",
		Scope:    PanelTabScopeDetail,
		Contexts: []string{string(PanelTabScopeDetail)},
	})
	out := make([]PanelTab, 0, len(tabs)+1)
	out = append(out, tabs[:firstDetailIdx]...)
	out = append(out, details)
	out = append(out, tabs[firstDetailIdx:]...)
	return out
}

func panelTabMatchesContext(tab PanelTab, context string) bool {
	context = strings.ToLower(strings.TrimSpace(context))
	if context == "" {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(string(tab.Scope)), context) {
		return true
	}
	for _, candidate := range tab.Contexts {
		if strings.EqualFold(strings.TrimSpace(candidate), context) {
			return true
		}
	}
	return false
}

func (a *Admin) panelTabAllowed(ctx AdminContext, tab PanelTab, panelName string) bool {
	if a == nil {
		return false
	}
	if a.panelTabPermissionEvaluator != nil {
		return a.panelTabPermissionEvaluator(ctx, tab, panelName)
	}
	perm := strings.TrimSpace(tab.Permission)
	if perm == "" {
		return true
	}
	if a.authorizer == nil {
		return true
	}
	return a.authorizer.Can(ctx.Context, perm, "navigation")
}

func (a *Admin) resolvePanelTabCollision(panelName string, existing PanelTab, incoming PanelTab) (PanelTab, error) {
	if a != nil && a.panelTabCollisionHandler != nil {
		return a.panelTabCollisionHandler(panelName, existing, incoming)
	}
	a.loggerFor("admin.tabs").Warn("panel tab collision",
		"panel", panelName,
		"id", existing.ID,
		"existing_label", existing.Label,
		"incoming_label", incoming.Label)
	return existing, nil
}
