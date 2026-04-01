package admin

import (
	"context"
	"strings"
	"sync"

	"github.com/goliatone/go-admin/admin/routing"
	translationservices "github.com/goliatone/go-admin/translations/services"
	cmdrpc "github.com/goliatone/go-command/rpc"
	"github.com/goliatone/go-featuregate/catalog"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	theme "github.com/goliatone/go-theme"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/activity"
	"github.com/goliatone/go-users/command"
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
			return handlerAuth.WrapHandler(func(c router.Context) error {
				markAuthenticatedRequest(c)
				return handler(c)
			})
		}
	}
	return func(handler router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if err := a.authenticator.Wrap(c); err != nil {
				return err
			}
			markAuthenticatedRequest(c)
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
