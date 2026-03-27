package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strings"
	"sync"

	"github.com/goliatone/go-admin/admin/routing"
	translationgoadmin "github.com/goliatone/go-admin/translations/adapters/goadmin"
	translationservices "github.com/goliatone/go-admin/translations/services"
	cmdrpc "github.com/goliatone/go-command/rpc"
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
	routingPlanner               routing.Planner
	routingReport                routing.StartupReport
	registry                     *Registry
	cms                          CMSContainer
	widgetSvc                    CMSWidgetService
	menuSvc                      CMSMenuService
	contentSvc                   CMSContentService
	contentTypeSvc               CMSContentTypeService
	authenticator                Authenticator
	router                       AdminRouter
	commandBus                   *CommandBus
	commandRegistryInitialized   bool
	validatePanelCommandWiring   bool
	rpcServer                    *cmdrpc.Server
	rpcCommandPolicyHook         RPCCommandPolicyHook
	dashboard                    *Dashboard
	debugCollector               *DebugCollector
	actionDiagnostics            *ActionDiagnosticsStore
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
	moduleStartupPolicy          ModuleStartupPolicy
	navMenuCode                  string
	translator                   Translator
	workflow                     WorkflowEngine
	workflowRuntime              WorkflowRuntime
	translationExchangeRuntime   *TranslationExchangeRuntime
	traitWorkflowDefaults        map[string]string
	translationPolicy            TranslationPolicy
	translationFamilyStore       translationservices.FamilyStore
	cmsWorkflowDefaults          bool
	cmsWorkflowActions           []Action
	cmsWorkflowActionsSet        bool
	preview                      *PreviewService
	panelTabPermissionEvaluator  PanelTabPermissionEvaluator
	panelTabCollisionHandler     PanelTabCollisionHandler
	cmsRoutesRegistered          bool
	contentAliasRoutesRegistered bool
	iconService                  *IconService
	menuBuilder                  *MenuBuilderService
	bootContext                  context.Context
	doctorMu                     sync.RWMutex
	doctorChecks                 map[string]DoctorCheck
	menuBuilderRoutesRegistered  bool
}

type activityAware interface {
	WithActivitySink(ActivitySink)
}

type adminLocaleCatalog interface {
	ActiveLocales(ctx context.Context) ([]string, error)
}

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
	state.urlManager, err = resolveAdminURLManager(state.cfg, deps.URLManager)
	if err != nil {
		return state, err
	}
	state.routingPlanner, state.routingReport, err = resolveRoutingPlanner(state.cfg, state.urlManager, state.featureGate)
	if err != nil {
		return state, err
	}
	state.mediaLib = resolveMediaLibrary(state.cfg, deps.MediaLibrary, state.featureGate, state.urlManager)
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

func resolveAdminURLManager(cfg Config, urlManager *urlkit.RouteManager) (*urlkit.RouteManager, error) {
	if urlManager != nil {
		return urlManager, nil
	}
	return newURLManager(cfg)
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

// WithModuleStartupPolicy configures how module startup validation errors are handled.
func (a *Admin) WithModuleStartupPolicy(policy ModuleStartupPolicy) *Admin {
	if a == nil {
		return a
	}
	switch strings.ToLower(strings.TrimSpace(string(policy))) {
	case string(ModuleStartupPolicyWarn):
		a.moduleStartupPolicy = ModuleStartupPolicyWarn
	default:
		a.moduleStartupPolicy = ModuleStartupPolicyEnforce
	}
	return a
}

// RoutingReport exposes the current routing diagnostics snapshot.
func (a *Admin) RoutingReport() routing.StartupReport {
	if a == nil {
		return routing.StartupReport{}
	}
	return a.routingReport
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
	if a == nil {
		return a
	}
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
	if a.registry != nil {
		for _, panel := range a.registry.Panels() {
			if panel == nil || panel.authorizer != nil {
				continue
			}
			panel.authorizer = authz
		}
	}
	return a
}

// WithWorkflow attaches a workflow engine to the admin orchestrator.
func (a *Admin) WithWorkflow(w WorkflowEngine) *Admin {
	if a == nil {
		return a
	}
	a.workflow = w
	applyCMSWorkflowDefaults(a)
	if a.workflowRuntime != nil {
		if err := a.bindWorkflowRuntime(a.workflowRuntime); err != nil {
			a.loggerFor("admin.workflow.runtime").Warn("workflow runtime binding failed", "error", err)
		}
	}
	return a
}

// WithWorkflowRuntime wires persisted workflow definitions/bindings.
func (a *Admin) WithWorkflowRuntime(runtime WorkflowRuntime) *Admin {
	if a == nil {
		return a
	}
	if err := a.bindWorkflowRuntime(runtime); err != nil {
		a.loggerFor("admin.workflow.runtime").Warn("workflow runtime binding failed", "error", err)
	}
	return a
}

// WithTraitWorkflowDefaults sets default workflow IDs by panel trait.
func (a *Admin) WithTraitWorkflowDefaults(defaults map[string]string) *Admin {
	if a == nil {
		return a
	}
	a.traitWorkflowDefaults = normalizeTraitWorkflowDefaults(defaults)
	return a
}

// WithTranslationPolicy attaches a translation policy used during workflow transitions.
func (a *Admin) WithTranslationPolicy(policy TranslationPolicy) *Admin {
	a.translationPolicy = policy
	return a
}

// WithTranslationFamilyStore wires the canonical translation family store used by family bindings.
func (a *Admin) WithTranslationFamilyStore(store translationservices.FamilyStore) *Admin {
	if a == nil {
		return a
	}
	a.translationFamilyStore = store
	return a
}

// WithTranslationExchangeRuntime wires the exchange job runtime used by transport bindings.
func (a *Admin) WithTranslationExchangeRuntime(runtime *TranslationExchangeRuntime) *Admin {
	if a == nil {
		return a
	}
	a.translationExchangeRuntime = runtime
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

func normalizeTraitWorkflowDefaults(defaults map[string]string) map[string]string {
	if len(defaults) == 0 {
		return nil
	}
	out := map[string]string{}
	for rawTrait, rawWorkflowID := range defaults {
		trait := strings.ToLower(strings.TrimSpace(rawTrait))
		workflowID := strings.TrimSpace(rawWorkflowID)
		if trait == "" || workflowID == "" {
			continue
		}
		out[trait] = workflowID
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (a *Admin) bindWorkflowRuntime(runtime WorkflowRuntime) error {
	if a == nil {
		return nil
	}
	a.workflowRuntime = runtime
	if runtime == nil {
		return nil
	}
	if err := configureWorkflowAuthoringRuntime(runtime); err != nil {
		return err
	}
	return runtime.BindWorkflowEngine(resolveCMSWorkflowEngine(a))
}

func configureWorkflowAuthoringRuntime(runtime WorkflowRuntime) error {
	typed, ok := runtime.(*WorkflowRuntimeService)
	if !ok || typed == nil {
		return nil
	}
	bunRepo, ok := typed.workflows.(*BunWorkflowDefinitionRepository)
	if !ok || bunRepo == nil || bunRepo.db == nil {
		return nil
	}
	if err := EnsureWorkflowAuthoringCutover(context.Background(), bunRepo.db); err != nil {
		return err
	}
	if typed.AuthoringStore() == nil {
		typed.SetAuthoringStore(NewBunWorkflowAuthoringStore(bunRepo.db))
	}
	return nil
}

// Authorizer exposes the configured authorizer (if any).
func (a *Admin) Authorizer() Authorizer {
	if a == nil {
		return nil
	}
	return a.authorizer
}

// Authenticator exposes the configured authenticator (if any).
func (a *Admin) Authenticator() Authenticator {
	if a == nil {
		return nil
	}
	return a.authenticator
}

// HasAuthenticator reports whether an authenticator is configured.
func (a *Admin) HasAuthenticator() bool {
	return a != nil && a.authenticator != nil
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
	a.applyCoreActivitySink(sink)
	a.applyAwareActivitySink(sink)
	a.applyDomainActivitySink(sink)
}

func (a *Admin) applyCoreActivitySink(sink ActivitySink) {
	if a.jobs != nil {
		a.jobs.WithActivitySink(sink)
	}
	if a.dashboard != nil {
		a.dashboard.WithActivitySink(sink)
	}
	if a.settings != nil {
		a.settings.WithActivitySink(sink)
	}
}

func (a *Admin) applyAwareActivitySink(sink ActivitySink) {
	propagateActivityAwareSink(a.notifications, sink)
	propagateActivityAwareSink(a.widgetSvc, sink)
	propagateActivityAwareSink(a.menuSvc, sink)
	propagateActivityAwareSink(a.contentSvc, sink)
	a.attachWorkflowActivitySink(sink)
}

func (a *Admin) applyDomainActivitySink(sink ActivitySink) {
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

func propagateActivityAwareSink(target any, sink ActivitySink) {
	aware, ok := target.(activityAware)
	if !ok {
		return
	}
	aware.WithActivitySink(sink)
}

func (a *Admin) attachWorkflowActivitySink(sink ActivitySink) {
	aware, ok := a.workflow.(workflowActivityAware)
	if !ok {
		return
	}
	if err := aware.AttachActivitySink(sink); err != nil {
		a.loggerFor("admin.workflow").Warn("failed to attach workflow activity sink", "error", err)
	}
}

type workflowActivityAware interface {
	AttachActivitySink(ActivitySink) error
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

// ResolveLocaleFromRequest resolves the effective request locale using explicit
// query parameters first and Accept-Language against the active CMS locale
// catalog when one is available.
func (a *Admin) ResolveLocaleFromRequest(c router.Context, fallback string) string {
	ctx := context.Background()
	if c != nil {
		ctx = c.Context()
	}
	return resolveAdminLocaleFromRouter(c, fallback, a.activeLocales(ctx))
}

func (a *Admin) activeLocales(ctx context.Context) []string {
	if a == nil || a.cms == nil {
		return nil
	}
	provider, ok := a.cms.(adminLocaleCatalog)
	if !ok || provider == nil {
		return nil
	}
	locales, err := provider.ActiveLocales(ctx)
	if err != nil {
		return nil
	}
	return normalizeLocaleCandidates(locales...)
}

func (a *Admin) adminContextFromRequest(c router.Context, locale string) AdminContext {
	locale = a.ResolveLocaleFromRequest(c, locale)
	ctx := newAdminContextFromRouter(c, locale)
	ctx.Translator = a.translator
	selector := selectorFromRequest(c)
	if selector.Name != "" || selector.Variant != "" {
		ctx.Context = WithThemeSelection(ctx.Context, selector)
	}
	if sink := newAdminActionDiagnosticSink(a); sink != nil {
		ctx.Context = ContextWithActionDiagnostics(ctx.Context, sink)
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

// RPCServer exposes the command RPC server bound to this admin instance.
func (a *Admin) RPCServer() *cmdrpc.Server {
	return a.rpcServer
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

// IconService returns the icon service for icon resolution and rendering.
func (a *Admin) IconService() *IconService {
	return a.iconService
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
		if err := syncTranslationQueueTabForPanel(a, name, panel); err != nil {
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
	return permissionAllowed(a.authorizer, ctx.Context, perm, "navigation")
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
