package services

import (
	"context"
	"fmt"
	"sort"
	"strings"

	goadmin "github.com/goliatone/go-admin/admin"
	goservices "github.com/goliatone/go-services"
	gologgeradapter "github.com/goliatone/go-services/adapters/gologger"
	gocore "github.com/goliatone/go-services/core"
	goservicesinbound "github.com/goliatone/go-services/inbound"
	"github.com/goliatone/go-services/security"
	sqlstore "github.com/goliatone/go-services/store/sql"
	servicesync "github.com/goliatone/go-services/sync"
	goserviceswebhooks "github.com/goliatone/go-services/webhooks"
)

// Module stores resolved go-services wiring for go-admin runtime integration.
type Module struct {
	admin             *goadmin.Admin
	config            Config
	service           *goservices.Service
	facade            *goservices.Facade
	extensionHooks    *goservices.ExtensionHooks
	extensionBundles  map[string]any
	extensionDiag     ExtensionDiagnostics
	repositoryFactory any
	runtime           RuntimeContracts
	worker            *WorkerRuntime
	webhookProcessor  *goserviceswebhooks.Processor
	inboundDispatcher *goservicesinbound.Dispatcher
	syncOrchestrator  *servicesync.Orchestrator
	outboxDispatcher  gocore.LifecycleDispatcher
	activityRuntime   *activityRuntime
	idempotencyStore  *idempotencyStore
	workflowRuntime   *workflowRuntime
}

// ExtensionDiagnostics exposes resolved extension wiring state for downstream integrations.
type ExtensionDiagnostics struct {
	RegisteredProviderPacks  []string        `json:"registered_provider_packs"`
	EnabledProviderPacks     []string        `json:"enabled_provider_packs"`
	DisabledProviderPacks    []string        `json:"disabled_provider_packs"`
	CommandQueryBundles      []string        `json:"command_query_bundles"`
	BuiltCommandQueryBundles []string        `json:"built_command_query_bundles"`
	LifecycleSubscribers     []string        `json:"lifecycle_subscribers"`
	FeatureFlags             map[string]bool `json:"feature_flags"`
}

// Setup wires go-services into an existing go-admin app.
func Setup(adminApp *goadmin.Admin, cfg Config, opts ...Option) (*Module, error) {
	cfg = withDefaults(cfg)
	setupCfg := setupOptions{}
	for _, opt := range opts {
		if opt != nil {
			opt(&setupCfg)
		}
	}

	if setupCfg.lifecycle != nil {
		cfg.Lifecycle = *setupCfg.lifecycle
	}
	if len(setupCfg.lifecycleSubscribers) > 0 {
		cfg.Lifecycle.Projectors.Subscribers = append(cfg.Lifecycle.Projectors.Subscribers, setupCfg.lifecycleSubscribers...)
	}
	if setupCfg.activityPrimarySink != nil {
		cfg.Lifecycle.Projectors.Activity.PrimarySink = setupCfg.activityPrimarySink
	}
	if setupCfg.activityFallbackSink != nil {
		cfg.Lifecycle.Projectors.Activity.FallbackSink = setupCfg.activityFallbackSink
	}
	if setupCfg.notificationSender != nil {
		cfg.Lifecycle.Projectors.Notifications.Sender = setupCfg.notificationSender
	}
	if setupCfg.notificationDefinitionResolver != nil {
		cfg.Lifecycle.Projectors.Notifications.DefinitionResolver = setupCfg.notificationDefinitionResolver
	}
	if setupCfg.notificationRecipientResolver != nil {
		cfg.Lifecycle.Projectors.Notifications.RecipientResolver = setupCfg.notificationRecipientResolver
	}
	if setupCfg.loggerProvider != nil {
		cfg.LoggerProvider = setupCfg.loggerProvider
	}
	if setupCfg.logger != nil {
		cfg.Logger = setupCfg.logger
	}
	if setupCfg.errorFactory != nil {
		cfg.ErrorFactory = setupCfg.errorFactory
	}
	if setupCfg.errorMapper != nil {
		cfg.ErrorMapper = setupCfg.errorMapper
	}
	if setupCfg.persistenceClient != nil {
		cfg.PersistenceClient = setupCfg.persistenceClient
	}
	if setupCfg.repositoryFactory != nil {
		cfg.RepositoryFactory = setupCfg.repositoryFactory
	}
	if setupCfg.secretProvider != nil {
		cfg.SecretProvider = setupCfg.secretProvider
	}
	if setupCfg.registry != nil {
		cfg.Registry = setupCfg.registry
	}
	if setupCfg.configProvider != nil {
		cfg.ConfigProvider = setupCfg.configProvider
	}
	if setupCfg.optionsResolver != nil {
		cfg.OptionsResolver = setupCfg.optionsResolver
	}
	if setupCfg.registerMigrations != nil {
		cfg.RegisterMigrations = setupCfg.registerMigrations
	}
	if len(setupCfg.providers) > 0 {
		cfg.Providers = append(cfg.Providers, setupCfg.providers...)
	}
	if len(setupCfg.tableHooks) > 0 {
		cfg.TableLifecycleHooks = append(cfg.TableLifecycleHooks, setupCfg.tableHooks...)
	}
	if setupCfg.jobEnqueuer != nil {
		cfg.JobEnqueuer = setupCfg.jobEnqueuer
	}
	if setupCfg.webhookVerifier != nil {
		cfg.WebhookVerifier = setupCfg.webhookVerifier
	}
	if setupCfg.webhookHandler != nil {
		cfg.WebhookHandler = setupCfg.webhookHandler
	}
	if setupCfg.webhookDeliveryLedger != nil {
		cfg.WebhookDeliveryLedger = setupCfg.webhookDeliveryLedger
	}
	if setupCfg.inboundVerifier != nil {
		cfg.InboundVerifier = setupCfg.inboundVerifier
	}
	if len(setupCfg.inboundHandlers) > 0 {
		cfg.InboundHandlers = append(cfg.InboundHandlers, setupCfg.inboundHandlers...)
	}
	if setupCfg.inboundClaimStore != nil {
		cfg.InboundClaimStore = setupCfg.inboundClaimStore
	}
	if len(setupCfg.activityActionLabels) > 0 {
		cfg.API.ActivityActionLabelOverrides = copyStringMap(setupCfg.activityActionLabels)
	}
	if setupCfg.callbackURLs != nil {
		cfg.Callbacks = mergeCallbackURLConfig(cfg.Callbacks, *setupCfg.callbackURLs)
	}
	if len(setupCfg.enabledProviderPacks) > 0 {
		cfg.Extensions.EnabledProviderPacks = normalizeStringListUnique(setupCfg.enabledProviderPacks)
	}
	if len(setupCfg.extensionFeatureFlags) > 0 {
		if cfg.Extensions.FeatureFlags == nil {
			cfg.Extensions.FeatureFlags = map[string]bool{}
		}
		for key, value := range setupCfg.extensionFeatureFlags {
			if trimmed := strings.TrimSpace(key); trimmed != "" {
				cfg.Extensions.FeatureFlags[trimmed] = value
			}
		}
	}
	if setupCfg.extensionDiagnosticsEnabled != nil {
		cfg.Extensions.DiagnosticsEnabled = *setupCfg.extensionDiagnosticsEnabled
	}

	if !cfg.Enabled {
		return nil, nil
	}
	if adminApp == nil {
		return nil, fmt.Errorf("modules/services: admin app is required when services module is enabled")
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}

	providerInput := cfg.LoggerProvider
	if providerInput == nil {
		providerInput = adminApp.LoggerProvider()
	}
	loggerInput := cfg.Logger
	if loggerInput == nil {
		loggerInput = adminApp.Logger()
	}
	resolvedProvider, resolvedLogger, jobProvider, jobLogger := gologgeradapter.ResolveForJob(
		"admin.modules.services",
		providerInput,
		loggerInput,
	)

	errorFactory := cfg.ErrorFactory
	if errorFactory == nil {
		errorFactory = defaultErrorFactory
	}
	errorMapper := cfg.ErrorMapper
	if errorMapper == nil {
		errorMapper = defaultErrorMapper
	}

	configProvider := cfg.ConfigProvider
	if configProvider == nil {
		configProvider = gocore.NewCfgxConfigProvider(rawConfigLoader{values: cfg.ConfigValues})
	}
	optionsResolver := cfg.OptionsResolver
	if optionsResolver == nil {
		optionsResolver = gocore.GoOptionsResolver{}
	}

	registry := cfg.Registry
	if registry == nil {
		registry = gocore.NewProviderRegistry()
	}
	extensionHooks := setupCfg.extensionHooks
	if extensionHooks == nil {
		extensionHooks = goservices.NewExtensionHooks()
	}
	for _, pack := range setupCfg.providerPacks {
		if err := extensionHooks.RegisterProviderPack(pack); err != nil {
			return nil, fmt.Errorf("modules/services: register provider pack %q: %w", strings.TrimSpace(pack.Name), err)
		}
	}
	for _, bundle := range setupCfg.commandQueryBundles {
		if err := extensionHooks.RegisterCommandQueryBundle(bundle.name, bundle.factory); err != nil {
			return nil, fmt.Errorf("modules/services: register command/query bundle %q: %w", strings.TrimSpace(bundle.name), err)
		}
	}

	providers := append([]Provider(nil), cfg.Providers...)
	sort.SliceStable(providers, func(i, j int) bool {
		if providers[i] == nil {
			return false
		}
		if providers[j] == nil {
			return true
		}
		return strings.TrimSpace(providers[i].ID()) < strings.TrimSpace(providers[j].ID())
	})
	for _, provider := range providers {
		if provider == nil {
			continue
		}
		if err := registry.Register(provider); err != nil {
			return nil, fmt.Errorf("modules/services: register provider %q: %w", strings.TrimSpace(provider.ID()), err)
		}
	}

	registeredPacks := extensionHooks.ProviderPacks()
	enabledPackSet := toEnabledPackSet(cfg.Extensions.EnabledProviderPacks)
	enabledProviderPacks := []string{}
	disabledProviderPacks := []string{}
	for _, pack := range registeredPacks {
		name := strings.TrimSpace(pack.Name)
		if !packEnabled(name, enabledPackSet) {
			disabledProviderPacks = append(disabledProviderPacks, name)
			continue
		}
		enabledProviderPacks = append(enabledProviderPacks, name)
		for _, provider := range pack.Providers {
			if provider == nil {
				return nil, fmt.Errorf("modules/services: provider pack %q contains nil provider", name)
			}
			if err := registry.Register(provider); err != nil {
				return nil, fmt.Errorf("modules/services: register provider from pack %q: %w", name, err)
			}
		}
	}
	if len(enabledPackSet) > 0 {
		for name := range enabledPackSet {
			if !containsString(enabledProviderPacks, name) {
				return nil, fmt.Errorf("modules/services: enabled provider pack %q is not registered", name)
			}
		}
	}

	secretProvider := cfg.SecretProvider
	if secretProvider == nil {
		provider, err := security.NewAppKeySecretProviderFromString(
			cfg.EncryptionKey,
			security.WithKeyID(cfg.EncryptionKeyID),
			security.WithVersion(cfg.EncryptionVersion),
		)
		if err != nil {
			return nil, fmt.Errorf("modules/services: build secret provider: %w", err)
		}
		secretProvider = provider
	}

	persistenceClient := cfg.PersistenceClient
	repositoryFactory := cfg.RepositoryFactory
	if repositoryFactory == nil {
		factory, err := sqlstore.NewRepositoryFactoryFromPersistence(persistenceClient)
		if err != nil {
			return nil, fmt.Errorf("modules/services: build repository factory: %w", err)
		}
		repositoryFactory = factory
	}

	var grantStore gocore.GrantStore
	if db := resolveBunDB(persistenceClient, repositoryFactory); db != nil {
		store, err := sqlstore.NewGrantStore(db)
		if err != nil {
			return nil, fmt.Errorf("modules/services: build grant store: %w", err)
		}
		grantStore = store
	}

	if registerMigrationsEnabled(cfg.RegisterMigrations) {
		migrationOptions := []ServiceMigrationsOption{
			WithServiceMigrationsValidationTargets(cfg.ValidationTargets...),
		}
		for _, source := range cfg.AppMigrations {
			if source.Filesystem == nil {
				continue
			}
			migrationOptions = append(migrationOptions, WithServiceMigrationsAppSource(source.Label, source.Filesystem))
		}
		migrationOptions = append(migrationOptions, setupCfg.migrationOptions...)
		if err := RegisterServiceMigrations(persistenceClient, migrationOptions...); err != nil {
			return nil, fmt.Errorf("modules/services: register migrations: %w", err)
		}
	}

	if len(cfg.TableLifecycleHooks) > 0 {
		if persistenceClient == nil || persistenceClient.DB() == nil {
			return nil, fmt.Errorf("modules/services: table lifecycle hooks require persistence client")
		}
		for idx, hook := range cfg.TableLifecycleHooks {
			if hook == nil {
				continue
			}
			if err := hook(context.Background(), persistenceClient.DB()); err != nil {
				return nil, fmt.Errorf("modules/services: table lifecycle hook %d failed: %w", idx, err)
			}
		}
	}

	serviceOptions := []goservices.Option{
		goservices.WithLoggerProvider(resolvedProvider),
		goservices.WithLogger(resolvedLogger),
		goservices.WithErrorFactory(errorFactory),
		goservices.WithErrorMapper(errorMapper),
		goservices.WithSecretProvider(secretProvider),
		goservices.WithConfigProvider(configProvider),
		goservices.WithOptionsResolver(optionsResolver),
		goservices.WithRegistry(registry),
	}
	if persistenceClient != nil {
		serviceOptions = append(serviceOptions, goservices.WithPersistenceClient(persistenceClient))
	}
	if repositoryFactory != nil {
		serviceOptions = append(serviceOptions, goservices.WithRepositoryFactory(repositoryFactory))
	}
	if grantStore != nil {
		serviceOptions = append(serviceOptions, goservices.WithGrantStore(grantStore))
	}

	service, err := goservices.Setup(cfg.Service, serviceOptions...)
	if err != nil {
		return nil, fmt.Errorf("modules/services: setup go-services: %w", err)
	}
	module := &Module{
		admin:             adminApp,
		config:            cfg,
		service:           service,
		extensionHooks:    extensionHooks,
		repositoryFactory: repositoryFactory,
		runtime: RuntimeContracts{
			LoggerProvider:    resolvedProvider,
			Logger:            resolvedLogger,
			JobLoggerProvider: jobProvider,
			JobLogger:         jobLogger,
		},
	}
	facade, err := goservices.NewFacade(service, goservices.WithActivityReader(module))
	if err != nil {
		return nil, fmt.Errorf("modules/services: build command/query facade: %w", err)
	}
	module.facade = facade
	extensionBundles, err := extensionHooks.BuildCommandQueryBundles(service)
	if err != nil {
		return nil, fmt.Errorf("modules/services: build command/query bundles: %w", err)
	}
	module.extensionBundles = extensionBundles
	lifecycleSubscribers := make([]string, 0, len(cfg.Lifecycle.Projectors.Subscribers))
	for _, subscriber := range cfg.Lifecycle.Projectors.Subscribers {
		if trimmed := strings.TrimSpace(subscriber.Name); trimmed != "" {
			lifecycleSubscribers = append(lifecycleSubscribers, trimmed)
		}
	}
	sort.Strings(lifecycleSubscribers)
	module.extensionDiag = ExtensionDiagnostics{
		RegisteredProviderPacks:  packNames(registeredPacks),
		EnabledProviderPacks:     enabledProviderPacks,
		DisabledProviderPacks:    disabledProviderPacks,
		CommandQueryBundles:      extensionHooks.BundleNames(),
		BuiltCommandQueryBundles: mapKeysSorted(extensionBundles),
		LifecycleSubscribers:     lifecycleSubscribers,
		FeatureFlags:             copyBoolMap(cfg.Extensions.FeatureFlags),
	}
	if err := module.ensureCallbackURLRoute(); err != nil {
		return nil, err
	}
	if err := module.initializeRuntime(); err != nil {
		return nil, err
	}

	return module, nil
}

func mergeCallbackURLConfig(base CallbackURLConfig, override CallbackURLConfig) CallbackURLConfig {
	out := base
	out.Strict = base.Strict || override.Strict
	if trimmed := strings.TrimSpace(override.PublicBaseURL); trimmed != "" {
		out.PublicBaseURL = trimmed
	}
	if trimmed := strings.TrimSpace(override.URLKitGroup); trimmed != "" {
		out.URLKitGroup = trimmed
	}
	if trimmed := strings.TrimSpace(override.DefaultRoute); trimmed != "" {
		out.DefaultRoute = trimmed
	}
	if override.ProviderRoutes != nil {
		out.ProviderRoutes = normalizeStringMapEntries(override.ProviderRoutes)
	}
	if override.ProviderURLOverrides != nil {
		out.ProviderURLOverrides = normalizeStringMapEntries(override.ProviderURLOverrides)
	}
	return out
}

// Config returns the resolved module configuration.
func (m *Module) Config() Config {
	if m == nil {
		return Config{}
	}
	return m.config
}

// Service returns the resolved go-services runtime instance.
func (m *Module) Service() *goservices.Service {
	if m == nil {
		return nil
	}
	return m.service
}

// Facade returns grouped command/query handlers for transport adapters.
func (m *Module) Facade() *goservices.Facade {
	if m == nil {
		return nil
	}
	return m.facade
}

// RepositoryFactory returns the resolved store repository factory wiring.
func (m *Module) RepositoryFactory() any {
	if m == nil {
		return nil
	}
	return m.repositoryFactory
}

// Runtime returns resolved logger/runtime adapter bridges.
func (m *Module) Runtime() RuntimeContracts {
	if m == nil {
		return RuntimeContracts{}
	}
	return m.runtime
}

// LifecycleConfig returns the resolved lifecycle/projector settings.
func (m *Module) LifecycleConfig() LifecycleConfig {
	if m == nil {
		return LifecycleConfig{}
	}
	return m.config.Lifecycle
}

// Worker returns the resolved async worker runtime adapter.
func (m *Module) Worker() *WorkerRuntime {
	if m == nil {
		return nil
	}
	return m.worker
}

// ExtensionBundles returns built downstream command/query bundle wiring.
func (m *Module) ExtensionBundles() map[string]any {
	if m == nil || len(m.extensionBundles) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(m.extensionBundles))
	for key, value := range m.extensionBundles {
		out[key] = value
	}
	return out
}

// ExtensionDiagnostics returns extension hook registration diagnostics.
func (m *Module) ExtensionDiagnostics() ExtensionDiagnostics {
	if m == nil {
		return ExtensionDiagnostics{FeatureFlags: map[string]bool{}}
	}
	return ExtensionDiagnostics{
		RegisteredProviderPacks:  append([]string(nil), m.extensionDiag.RegisteredProviderPacks...),
		EnabledProviderPacks:     append([]string(nil), m.extensionDiag.EnabledProviderPacks...),
		DisabledProviderPacks:    append([]string(nil), m.extensionDiag.DisabledProviderPacks...),
		CommandQueryBundles:      append([]string(nil), m.extensionDiag.CommandQueryBundles...),
		BuiltCommandQueryBundles: append([]string(nil), m.extensionDiag.BuiltCommandQueryBundles...),
		LifecycleSubscribers:     append([]string(nil), m.extensionDiag.LifecycleSubscribers...),
		FeatureFlags:             copyBoolMap(m.extensionDiag.FeatureFlags),
	}
}

type rawConfigLoader struct {
	values map[string]any
}

func (l rawConfigLoader) LoadRaw(context.Context) (map[string]any, error) {
	if len(l.values) == 0 {
		return map[string]any{}, nil
	}
	out := make(map[string]any, len(l.values))
	for key, value := range l.values {
		out[key] = value
	}
	return out, nil
}

func toEnabledPackSet(names []string) map[string]bool {
	if len(names) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(names))
	for _, name := range names {
		if trimmed := strings.TrimSpace(name); trimmed != "" {
			out[trimmed] = true
		}
	}
	return out
}

func packEnabled(name string, enabled map[string]bool) bool {
	if len(enabled) == 0 {
		return true
	}
	return enabled[strings.TrimSpace(name)]
}

func packNames(packs []goservices.ProviderPack) []string {
	if len(packs) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(packs))
	for _, pack := range packs {
		if trimmed := strings.TrimSpace(pack.Name); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	sort.Strings(out)
	return out
}

func containsString(values []string, value string) bool {
	needle := strings.TrimSpace(value)
	for _, item := range values {
		if strings.TrimSpace(item) == needle {
			return true
		}
	}
	return false
}

func mapKeysSorted(values map[string]any) []string {
	if len(values) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(values))
	for key := range values {
		if trimmed := strings.TrimSpace(key); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	sort.Strings(out)
	return out
}

func copyBoolMap(in map[string]bool) map[string]bool {
	if len(in) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}
