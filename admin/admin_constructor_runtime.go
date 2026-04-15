package admin

import (
	"strings"

	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/internal/primitives"
	translationgoadmin "github.com/goliatone/go-admin/translations/adapters/goadmin"
	cmdrpc "github.com/goliatone/go-command/rpc"
	"github.com/goliatone/go-featuregate/catalog"
	fggate "github.com/goliatone/go-featuregate/gate"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/query"
)

type adminConstructorState struct {
	cfg                    Config
	registry               *Registry
	container              CMSContainer
	translator             Translator
	loggerProvider         LoggerProvider
	logger                 Logger
	featureGate            fggate.FeatureGate
	featureCatalog         catalog.Catalog
	featureCatalogResolver catalog.MessageResolver
	activitySink           ActivitySink
	activityPolicy         activity.ActivityAccessPolicy
	activityFeed           ActivityFeedQuerier
	replSessionStore       DebugREPLSessionStore
	replSessionManager     *DebugREPLSessionManager
	replCommandCatalog     *DebugREPLCommandCatalog
	debugSessionStore      DebugUserSessionStore
	actionDiagnostics      *ActionDiagnosticsStore
	commandBus             *CommandBus
	rpcServer              *cmdrpc.Server
	settingsSvc            *SettingsService
	settingsForm           *SettingsFormAdapter
	settingsCmd            *SettingsUpdateCommand
	notifSvc               NotificationService
	exportRegistry         ExportRegistry
	exportRegistrar        ExportHTTPRegistrar
	exportMetadata         ExportMetadataProvider
	bulkSvc                BulkService
	urlManager             *urlkit.RouteManager
	routingPlanner         routing.Planner
	routingReport          routing.StartupReport
	mediaLib               MediaLibrary
	mediaActivityHook      MediaActivityHook
	preferencesSvc         *PreferencesService
	profileSvc             *ProfileService
	userSvc                *UserManagementService
	tenantSvc              *TenantService
	orgSvc                 *OrganizationService
	jobReg                 *JobRegistry
	defaultTheme           *ThemeSelection
	navMenuCode            string
	dashboard              *Dashboard
	iconService            *IconService
}

// New constructs an Admin orchestrator with explicit dependencies.
func New(cfg Config, deps Dependencies) (*Admin, error) {
	state, err := resolveAdminConstructorState(cfg, deps)
	if err != nil {
		return nil, err
	}
	adm := newAdminFromConstructorState(state, deps)
	if err = initializeConstructedAdmin(adm, state, deps); err != nil {
		return nil, err
	}
	return adm, nil
}

func resolveAdminConstructorState(cfg Config, deps Dependencies) (adminConstructorState, error) {
	state := adminConstructorState{}
	state.cfg = applyConfigDefaults(cfg)
	SetDefaultErrorPresenter(NewErrorPresenter(state.cfg.Errors))
	if err := deps.validate(state.cfg); err != nil {
		return state, err
	}
	state.cfg = applyCMSDependencyConfig(state.cfg, deps)
	state.registry = resolveRegistryDependency(deps.Registry)
	state.container = resolveCMSContainer(state.cfg.CMS.Container)
	state.translator = resolveTranslatorDependency(deps.Translator)
	state.loggerProvider, state.logger = resolveLoggerDependencies(deps.LoggerProvider, deps.Logger)
	state.registry.WithLogger(resolveNamedLogger("admin.registry", state.loggerProvider, state.logger))
	setTranslationObservabilityLogger(resolveNamedLogger("admin.translation", state.loggerProvider, state.logger))
	state.featureGate = resolveFeatureGateDependency(deps.FeatureGate)

	var err error
	state.featureCatalog, err = resolveFeatureCatalogDependency(state.cfg, deps.FeatureCatalog)
	if err != nil {
		return state, err
	}
	state.featureCatalogResolver = resolveFeatureCatalogResolverDependency(deps.FeatureCatalogResolver)
	state.activitySink, state.activityPolicy, state.activityFeed = resolveActivityDependencies(deps)
	state.replSessionStore, state.replSessionManager, state.replCommandCatalog, state.debugSessionStore, state.actionDiagnostics = resolveDebugDependencies(state.cfg, deps)
	state.commandBus, state.rpcServer, err = resolveCommandInfrastructure(&state.cfg, deps, state.featureGate)
	if err != nil {
		return state, err
	}
	state.settingsSvc, state.settingsForm, state.settingsCmd, err = resolveSettingsInfrastructure(state.cfg, deps, state.registry, state.featureGate, state.commandBus)
	if err != nil {
		return state, err
	}
	return resolveAdminRuntimeState(state, deps)
}

func resolveAdminRuntimeState(state adminConstructorState, deps Dependencies) (adminConstructorState, error) {
	var err error
	state.notifSvc = resolveNotificationService(state.cfg, deps, state.featureGate, state.translator, state.activitySink)
	state.exportRegistry = deps.ExportRegistry
	state.exportRegistrar = deps.ExportRegistrar
	state.exportMetadata = deps.ExportMetadata
	state.bulkSvc = resolveBulkService(deps.BulkService, state.featureGate)
	state.urlManager, err = resolveAdminURLManager(state.cfg, deps.URLManager, state.featureGate)
	if err != nil {
		return state, err
	}
	state.routingPlanner, state.routingReport, err = resolveRoutingPlanner(state.cfg, state.urlManager, state.featureGate)
	if err != nil {
		return state, err
	}
	state.mediaLib = resolveMediaLibrary(state.cfg, deps.MediaLibrary, state.featureGate, state.urlManager)
	state.mediaActivityHook = deps.MediaActivityHook
	state.preferencesSvc, state.profileSvc, state.userSvc, state.tenantSvc, state.orgSvc = resolveDomainServices(state.cfg, deps, state.activitySink)
	state.jobReg = resolveJobRegistry(deps.JobRegistry, state.featureGate, state.activitySink)
	if err = registerFeatureCommands(state.featureGate, state.commandBus, state.notifSvc, state.bulkSvc); err != nil {
		return state, err
	}
	state.defaultTheme = resolveDefaultThemeSelection(state.cfg)
	state.navMenuCode = resolveAdminNavMenuCode(state.cfg.NavMenuCode)
	state.dashboard = newAdminDashboard(state.registry, state.loggerProvider, state.logger)
	state.iconService, err = resolveIconService(deps.IconService, state.loggerProvider, state.logger)
	if err != nil {
		return state, err
	}
	return state, nil
}

func newAdminFromConstructorState(state adminConstructorState, deps Dependencies) *Admin {
	return &Admin{
		config:                 state.cfg,
		logger:                 state.logger,
		loggerProvider:         state.loggerProvider,
		featureGate:            state.featureGate,
		featureCatalog:         state.featureCatalog,
		featureCatalogResolver: state.featureCatalogResolver,
		urlManager:             state.urlManager,
		routingPlanner:         state.routingPlanner,
		routingReport:          state.routingReport,
		registry:               state.registry,
		cms:                    state.container,
		widgetSvc:              state.container.WidgetService(),
		menuSvc:                state.container.MenuService(),
		contentSvc:             state.container.ContentService(),
		contentTypeSvc:         nil,
		authenticator:          deps.Authenticator,
		router:                 deps.Router,
		commandBus:             state.commandBus,
		validatePanelCommandWiring: deps.CommandBus != nil ||
			featureEnabled(state.featureGate, FeatureCommands) ||
			(state.commandBus != nil && state.commandBus.enabled),
		rpcServer:              state.rpcServer,
		rpcCommandPolicyHook:   deps.RPCCommandPolicyHook,
		dashboard:              state.dashboard,
		actionDiagnostics:      state.actionDiagnostics,
		replSessionStore:       state.replSessionStore,
		replSessionManager:     state.replSessionManager,
		replCommandCatalog:     state.replCommandCatalog,
		debugSessionStore:      state.debugSessionStore,
		nav:                    NewNavigation(state.container.MenuService(), deps.Authorizer),
		search:                 NewSearchEngine(deps.Authorizer),
		authorizer:             deps.Authorizer,
		notifications:          state.notifSvc,
		activity:               state.activitySink,
		activityFeed:           state.activityFeed,
		activityPolicy:         state.activityPolicy,
		jobs:                   state.jobReg,
		settings:               state.settingsSvc,
		settingsForm:           state.settingsForm,
		settingsCommand:        state.settingsCmd,
		preferences:            state.preferencesSvc,
		profile:                state.profileSvc,
		users:                  state.userSvc,
		tenants:                state.tenantSvc,
		organizations:          state.orgSvc,
		bulkUserImport:         deps.BulkUserImport,
		panelForm:              &PanelFormAdapter{},
		defaultTheme:           state.defaultTheme,
		exportRegistry:         state.exportRegistry,
		exportRegistrar:        state.exportRegistrar,
		exportMetadata:         state.exportMetadata,
		bulkSvc:                state.bulkSvc,
		mediaLibrary:           state.mediaLib,
		mediaActivityHook:      state.mediaActivityHook,
		moduleStartupPolicy:    ModuleStartupPolicyEnforce,
		navMenuCode:            state.navMenuCode,
		translator:             state.translator,
		workflow:               deps.Workflow,
		workflowRuntime:        deps.WorkflowRuntime,
		translationPolicy:      deps.TranslationPolicy,
		translationFamilyStore: deps.TranslationFamilyStore,
		preview:                NewPreviewService(state.cfg.PreviewSecret),
		iconService:            state.iconService,
		menuBuilder:            NewMenuBuilderService(),
		doctorChecks:           map[string]DoctorCheck{},
	}
}

func initializeConstructedAdmin(adm *Admin, state adminConstructorState, deps Dependencies) error {
	adm.RegisterDoctorChecks(defaultDoctorChecks()...)
	if err := registerCoreRPCEndpoints(state.rpcServer, adm); err != nil {
		return err
	}
	if err := registerWorkflowRPCEndpoints(state.rpcServer, adm); err != nil {
		return err
	}
	if _, err := RegisterQuery(state.commandBus, &dashboardDiagnosticsQuery{admin: adm}); err != nil {
		return err
	}
	resolveAdminContentTypeService(adm, state.container)
	activitySink := resolveActivitySinkEnrichment(adm, deps, state.settingsSvc, state.jobReg, state.activitySink)
	configureAdminRuntime(adm, deps, state.settingsForm, state.preferencesSvc, state.commandBus, activitySink, state.translator)
	if err := bindAdminWorkflowRuntime(adm); err != nil {
		return err
	}
	return nil
}

func applyCMSDependencyConfig(cfg Config, deps Dependencies) Config {
	if deps.CMSContainer != nil {
		cfg.CMS.Container = deps.CMSContainer
	}
	if deps.CMSContainerBuilder != nil {
		cfg.CMS.ContainerBuilder = deps.CMSContainerBuilder
	}
	return cfg
}

func resolveRegistryDependency(registry *Registry) *Registry {
	if registry != nil {
		return registry
	}
	return NewRegistry()
}

func resolveCMSContainer(container CMSContainer) CMSContainer {
	if container != nil {
		return container
	}
	return NewNoopCMSContainer()
}

func resolveTranslatorDependency(translator Translator) Translator {
	if translator != nil {
		return translator
	}
	return NoopTranslator{}
}

func resolveFeatureGateDependency(featureGate fggate.FeatureGate) fggate.FeatureGate {
	if featureGate != nil {
		return featureGate
	}
	return newFeatureGateFromFlags(nil)
}

func resolveFeatureCatalogDependency(cfg Config, featureCatalog catalog.Catalog) (catalog.Catalog, error) {
	if featureCatalog != nil {
		return featureCatalog, nil
	}
	catalogPath := strings.TrimSpace(cfg.FeatureCatalogPath)
	if catalogPath == "" {
		return nil, nil
	}
	return loadFeatureCatalogFile(catalogPath)
}

func resolveFeatureCatalogResolverDependency(resolver catalog.MessageResolver) catalog.MessageResolver {
	if resolver != nil {
		return resolver
	}
	return catalog.PlainResolver{}
}

func resolveActivityDependencies(deps Dependencies) (ActivitySink, activity.ActivityAccessPolicy, ActivityFeedQuerier) {
	activitySink := deps.ActivitySink
	if activitySink == nil {
		activitySink = NewActivityFeed()
	}
	activityPolicy := deps.ActivityAccessPolicy
	if activityPolicy == nil {
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
	return activitySink, activityPolicy, activityFeed
}

func resolveDebugDependencies(cfg Config, deps Dependencies) (DebugREPLSessionStore, *DebugREPLSessionManager, *DebugREPLCommandCatalog, DebugUserSessionStore, *ActionDiagnosticsStore) {
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
	actionDiagnostics := NewActionDiagnosticsStore(cfg.Debug.MaxLogEntries)
	return replSessionStore, replSessionManager, replCommandCatalog, debugSessionStore, actionDiagnostics
}

func resolveCommandInfrastructure(cfg *Config, deps Dependencies, featureGate fggate.FeatureGate) (*CommandBus, *cmdrpc.Server, error) {
	commandBus := deps.CommandBus
	if commandBus == nil {
		enableCommands := featureEnabled(featureGate, FeatureCommands) ||
			featureEnabled(featureGate, FeatureSettings) ||
			featureEnabled(featureGate, FeatureJobs) ||
			featureEnabled(featureGate, FeatureBulk) ||
			featureEnabled(featureGate, FeatureDashboard) ||
			featureEnabled(featureGate, FeatureNotifications)
		commandBus = NewCommandBus(enableCommands)
	}
	commandPolicy, err := normalizeCommandExecutionPolicy(cfg.Commands.Execution)
	if err != nil {
		return nil, nil, err
	}
	rpcPolicy, err := normalizeRPCCommandConfig(cfg.Commands.RPC)
	if err != nil {
		return nil, nil, err
	}
	cfg.Commands.RPC = rpcPolicy
	if err = commandBus.SetExecutionPolicy(commandPolicy); err != nil {
		return nil, nil, err
	}
	if err = RegisterCoreCommandFactories(commandBus); err != nil {
		return nil, nil, err
	}
	return commandBus, newRPCServer(deps.RPCServer), nil
}

func resolveSettingsInfrastructure(cfg Config, deps Dependencies, registry *Registry, featureGate fggate.FeatureGate, commandBus *CommandBus) (*SettingsService, *SettingsFormAdapter, *SettingsUpdateCommand, error) {
	settingsSvc := deps.SettingsService
	if settingsSvc == nil {
		settingsSvc = NewSettingsService()
	}
	settingsSvc.WithRegistry(registry)
	if featureEnabled(featureGate, FeatureSettings) {
		if db, dbErr := newSettingsDB(); dbErr == nil {
			if adapter, adapterErr := NewBunSettingsAdapter(db); adapterErr == nil {
				settingsSvc.UseAdapter(adapter)
			}
		}
	}
	settingsForm := NewSettingsFormAdapter(settingsSvc, cfg.Theme, cfg.ThemeTokens)
	settingsCmd := &SettingsUpdateCommand{Service: settingsSvc, Permission: cfg.SettingsUpdatePermission}
	if featureEnabled(featureGate, FeatureSettings) {
		if _, err := RegisterCommand(commandBus, settingsCmd); err != nil {
			return nil, nil, nil, err
		}
	}
	return settingsSvc, settingsForm, settingsCmd, nil
}

func resolveNotificationService(cfg Config, deps Dependencies, featureGate fggate.FeatureGate, translator Translator, activitySink ActivitySink) NotificationService {
	notifSvc := deps.NotificationService
	if notifSvc != nil {
		return notifSvc
	}
	notifSvc = DisabledNotificationService{}
	if !featureEnabled(featureGate, FeatureNotifications) {
		return notifSvc
	}
	if svc, err := newGoNotificationsService(cfg.DefaultLocale, translator, activitySink); err == nil {
		return svc
	}
	mem := NewInMemoryNotificationService()
	mem.WithActivitySink(activitySink)
	return mem
}

func resolveBulkService(bulkSvc BulkService, featureGate fggate.FeatureGate) BulkService {
	if bulkSvc != nil {
		return bulkSvc
	}
	if featureEnabled(featureGate, FeatureBulk) {
		return NewInMemoryBulkService()
	}
	return DisabledBulkService{}
}

func resolveAdminURLManager(cfg Config, urlManager *urlkit.RouteManager, featureGate fggate.FeatureGate) (*urlkit.RouteManager, error) {
	requireMediaRoutes := featureEnabled(featureGate, FeatureMedia)
	if urlManager != nil {
		if err := validateURLKitRoutes(cfg, urlManager, requireMediaRoutes); err != nil {
			return nil, validationDomainError("url manager validation error", map[string]any{
				"component": "url_manager",
				"error":     err.Error(),
			})
		}
		return urlManager, nil
	}
	return newURLManager(cfg, requireMediaRoutes)
}

func resolveRoutingPlanner(cfg Config, urlManager *urlkit.RouteManager, featureGate fggate.FeatureGate) (routing.Planner, routing.StartupReport, error) {
	routingPlanner, routingReport, err := newRoutingPlanner(cfg, urlManager)
	if err != nil {
		return nil, routing.StartupReport{}, err
	}
	if routingPlanner == nil || (!featureEnabled(featureGate, FeatureCMS) && !featureEnabled(featureGate, FeatureTranslationExchange) && !featureEnabled(featureGate, FeatureTranslationQueue)) {
		return routingPlanner, routingReport, nil
	}
	if err = routingPlanner.RegisterModule(translationgoadmin.ModuleContract()); err != nil {
		return nil, routing.StartupReport{}, validationDomainError("translation routing registration failed", map[string]any{
			"component": "translations",
			"slug":      translationgoadmin.ModuleSlug,
			"error":     strings.TrimSpace(err.Error()),
		})
	}
	return routingPlanner, routingPlanner.Report(), nil
}

func resolveMediaLibrary(cfg Config, mediaLib MediaLibrary, featureGate fggate.FeatureGate, urlManager *urlkit.RouteManager) MediaLibrary {
	if mediaLib != nil {
		return mediaLib
	}
	mediaLib = DisabledMediaLibrary{}
	if !featureEnabled(featureGate, FeatureMedia) {
		return mediaLib
	}
	mediaBase := resolveURLWith(urlManager, "admin", "dashboard", nil, nil)
	if mediaBase == "" {
		mediaBase = adminBasePath(cfg)
	}
	mediaBase = strings.TrimRight(mediaBase, "/")
	return NewInMemoryMediaLibrary(mediaBase)
}

func resolveDomainServices(cfg Config, deps Dependencies, activitySink ActivitySink) (*PreferencesService, *ProfileService, *UserManagementService, *TenantService, *OrganizationService) {
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
	return preferencesSvc, profileSvc, userSvc, tenantSvc, orgSvc
}

func resolveJobRegistry(jobReg *JobRegistry, featureGate fggate.FeatureGate, activitySink ActivitySink) *JobRegistry {
	if jobReg == nil {
		jobReg = NewJobRegistry()
	}
	jobReg.WithActivitySink(activitySink)
	if !featureEnabled(featureGate, FeatureJobs) {
		jobReg.Enable(false)
	}
	return jobReg
}

func registerFeatureCommands(featureGate fggate.FeatureGate, commandBus *CommandBus, notifSvc NotificationService, bulkSvc BulkService) error {
	if featureEnabled(featureGate, FeatureNotifications) {
		if _, err := RegisterCommand(commandBus, &NotificationMarkCommand{Service: notifSvc}); err != nil {
			return err
		}
	}
	if featureEnabled(featureGate, FeatureBulk) {
		if _, err := RegisterCommand(commandBus, &BulkCommand{Service: bulkSvc}); err != nil {
			return err
		}
	}
	return nil
}

func resolveDefaultThemeSelection(cfg Config) *ThemeSelection {
	defaultTheme := &ThemeSelection{
		Name:        cfg.Theme,
		Variant:     cfg.ThemeVariant,
		Tokens:      primitives.CloneStringMapNilOnEmpty(cfg.ThemeTokens),
		Assets:      primitives.CloneStringMapNilOnEmpty(cfg.ThemeAssets),
		ChartTheme:  cfg.ThemeVariant,
		AssetPrefix: cfg.ThemeAssetPrefix,
	}
	if defaultTheme.Assets == nil {
		defaultTheme.Assets = map[string]string{}
	}
	if cfg.LogoURL != "" {
		defaultTheme.Assets["logo"] = cfg.LogoURL
	}
	if cfg.FaviconURL != "" {
		defaultTheme.Assets["favicon"] = cfg.FaviconURL
	}
	return defaultTheme
}

func resolveAdminNavMenuCode(navMenuCode string) string {
	navMenuCode = NormalizeMenuSlug(navMenuCode)
	if navMenuCode != "" {
		return navMenuCode
	}
	return NormalizeMenuSlug("admin.main")
}

func newAdminDashboard(registry *Registry, loggerProvider LoggerProvider, logger Logger) *Dashboard {
	dashboard := NewDashboard()
	dashboard.WithRegistry(registry)
	dashboard.WithLogger(resolveNamedLogger("admin.dashboard", loggerProvider, logger))
	return dashboard
}

func resolveIconService(iconService *IconService, loggerProvider LoggerProvider, logger Logger) (*IconService, error) {
	if iconService != nil {
		return iconService, nil
	}
	iconService = NewIconService(
		WithIconServiceLogger(resolveNamedLogger("admin.icons", loggerProvider, logger)),
	)
	if err := RegisterBuiltinIconLibraries(iconService); err != nil {
		return nil, err
	}
	return iconService, nil
}

func resolveAdminContentTypeService(adm *Admin, container CMSContainer) {
	if adm == nil {
		return
	}
	if adm.contentTypeSvc == nil {
		adm.contentTypeSvc = container.ContentTypeService()
	}
	if adm.contentTypeSvc == nil {
		if svc, ok := adm.contentSvc.(CMSContentTypeService); ok && svc != nil {
			adm.contentTypeSvc = svc
		}
	}
}

func resolveActivitySinkEnrichment(adm *Admin, deps Dependencies, settingsSvc *SettingsService, jobReg *JobRegistry, activitySink ActivitySink) ActivitySink {
	enrichmentMode := deps.ActivityEnrichmentWriteMode
	if enrichmentMode == "" {
		enrichmentMode = activity.EnrichmentWriteModeWrapper
	}
	sessionIDProvider := deps.ActivitySessionIDProvider
	if sessionIDProvider == nil {
		sessionIDProvider = defaultSessionIDProvider()
	}
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
	case activity.EnrichmentWriteModeWrapper, activity.EnrichmentWriteModeHybrid:
		return newEnrichedActivitySink(
			activitySink,
			activityEnricher,
			deps.ActivityEnrichmentErrorHandler,
			sessionIDProvider,
			strings.TrimSpace(deps.ActivitySessionIDKey),
		)
	default:
		return activitySink
	}
}

func configureAdminRuntime(adm *Admin, deps Dependencies, settingsForm *SettingsFormAdapter, preferencesSvc *PreferencesService, commandBus *CommandBus, activitySink ActivitySink, translator Translator) {
	if adm == nil {
		return
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
		adm.nav.SetDefaultMenuCode(adm.navMenuCode)
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
}

func bindAdminWorkflowRuntime(adm *Admin) error {
	if adm == nil || adm.workflowRuntime == nil {
		return nil
	}
	return adm.bindWorkflowRuntime(adm.workflowRuntime)
}
