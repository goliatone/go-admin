package services

import (
	"strings"

	goadmin "github.com/goliatone/go-admin/admin"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	gocore "github.com/goliatone/go-services/core"
)

// Option mutates setup-time module wiring.
type Option func(*setupOptions)

type setupOptions struct {
	loggerProvider goadmin.LoggerProvider
	logger         goadmin.Logger
	errorFactory   ErrorFactory
	errorMapper    ErrorMapper

	persistenceClient *persistence.Client
	repositoryFactory any
	secretProvider    SecretProvider
	registry          Registry
	providers         []Provider

	configProvider  ConfigProvider
	optionsResolver OptionsResolver

	registerMigrations *bool
	migrationOptions   []ServiceMigrationsOption

	lifecycle  *LifecycleConfig
	tableHooks []TableLifecycleHook

	lifecycleSubscribers []LifecycleSubscriberConfig

	activityPrimarySink  ServicesActivitySink
	activityFallbackSink ServicesActivitySink

	notificationSender             NotificationSender
	notificationDefinitionResolver NotificationDefinitionResolver
	notificationRecipientResolver  NotificationRecipientResolver

	jobEnqueuer           JobEnqueuer
	webhookVerifier       WebhookVerifier
	webhookHandler        WebhookHandler
	webhookDeliveryLedger WebhookDeliveryLedger
	inboundVerifier       InboundVerifier
	inboundHandlers       []InboundHandler
	inboundClaimStore     InboundClaimStore

	activityActionLabels map[string]string

	extensionHooks              *goservices.ExtensionHooks
	providerPacks               []goservices.ProviderPack
	commandQueryBundles         []namedCommandQueryBundle
	enabledProviderPacks        []string
	extensionFeatureFlags       map[string]bool
	extensionDiagnosticsEnabled *bool
}

type namedCommandQueryBundle struct {
	name    string
	factory goservices.CommandQueryBundleFactory
}

// WithLoggerProvider overrides logger provider wiring for go-services and worker adapters.
func WithLoggerProvider(provider goadmin.LoggerProvider) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.loggerProvider = provider
		}
	}
}

// WithLogger overrides logger wiring for go-services and worker adapters.
func WithLogger(logger goadmin.Logger) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.logger = logger
		}
	}
}

// WithErrorFactory overrides go-errors factory wiring passed into go-services.
func WithErrorFactory(factory ErrorFactory) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.errorFactory = factory
		}
	}
}

// WithErrorMapper overrides go-errors mapping used by go-services.
func WithErrorMapper(mapper ErrorMapper) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.errorMapper = mapper
		}
	}
}

// WithPersistenceClient overrides persistence client wiring.
func WithPersistenceClient(client *persistence.Client) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.persistenceClient = client
		}
	}
}

// WithRepositoryFactory overrides repository factory wiring.
func WithRepositoryFactory(factory any) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.repositoryFactory = factory
		}
	}
}

// WithSecretProvider overrides secret provider wiring.
func WithSecretProvider(provider SecretProvider) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.secretProvider = provider
		}
	}
}

// WithRegistry overrides provider registry wiring.
func WithRegistry(registry Registry) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.registry = registry
		}
	}
}

// WithProvider appends provider registrations performed at startup.
func WithProvider(provider Provider) Option {
	return func(opts *setupOptions) {
		if opts != nil && provider != nil {
			opts.providers = append(opts.providers, provider)
		}
	}
}

// WithExtensionHooks overrides module-level extension hooks registry wiring.
func WithExtensionHooks(hooks *goservices.ExtensionHooks) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.extensionHooks = hooks
		}
	}
}

// WithProviderPack registers a downstream provider pack for module bootstrap.
func WithProviderPack(name string, providers ...Provider) Option {
	return func(opts *setupOptions) {
		if opts == nil {
			return
		}
		packProviders := make([]gocore.Provider, 0, len(providers))
		for _, provider := range providers {
			if provider == nil {
				continue
			}
			packProviders = append(packProviders, provider)
		}
		if len(packProviders) == 0 {
			return
		}
		opts.providerPacks = append(opts.providerPacks, goservices.ProviderPack{
			Name:      strings.TrimSpace(name),
			Providers: packProviders,
		})
	}
}

// WithCommandQueryBundle registers a downstream command/query bundle factory.
func WithCommandQueryBundle(name string, factory goservices.CommandQueryBundleFactory) Option {
	return func(opts *setupOptions) {
		if opts == nil || factory == nil {
			return
		}
		opts.commandQueryBundles = append(opts.commandQueryBundles, namedCommandQueryBundle{
			name:    strings.TrimSpace(name),
			factory: factory,
		})
	}
}

// WithConfigProvider overrides go-config loader wiring.
func WithConfigProvider(provider ConfigProvider) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.configProvider = provider
		}
	}
}

// WithOptionsResolver overrides go-options layering wiring.
func WithOptionsResolver(resolver OptionsResolver) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.optionsResolver = resolver
		}
	}
}

// WithRegisterMigrations overrides migration registration behavior.
func WithRegisterMigrations(enabled bool) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.registerMigrations = &enabled
		}
	}
}

// WithMigrationOptions appends migration registration options.
func WithMigrationOptions(options ...ServiceMigrationsOption) Option {
	return func(opts *setupOptions) {
		if opts == nil || len(options) == 0 {
			return
		}
		opts.migrationOptions = append(opts.migrationOptions, options...)
	}
}

// WithLifecycleConfig overrides lifecycle dispatcher/projector config.
func WithLifecycleConfig(config LifecycleConfig) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			cfg := config
			opts.lifecycle = &cfg
		}
	}
}

// WithLifecycleSubscriber registers a named custom lifecycle projector subscriber.
func WithLifecycleSubscriber(name string, handler LifecycleEventHandler) Option {
	return func(opts *setupOptions) {
		if opts == nil || handler == nil {
			return
		}
		if trimmed := strings.TrimSpace(name); trimmed != "" {
			opts.lifecycleSubscribers = append(opts.lifecycleSubscribers, LifecycleSubscriberConfig{
				Name:    trimmed,
				Handler: handler,
			})
		}
	}
}

// WithExtensionLifecycleSubscriber registers a downstream lifecycle subscriber hook.
func WithExtensionLifecycleSubscriber(name string, handler LifecycleEventHandler) Option {
	return WithLifecycleSubscriber(name, handler)
}

// WithEnabledProviderPacks overrides enabled extension provider-pack names.
func WithEnabledProviderPacks(names ...string) Option {
	return func(opts *setupOptions) {
		if opts == nil || len(names) == 0 {
			return
		}
		opts.enabledProviderPacks = append(opts.enabledProviderPacks, names...)
	}
}

// WithExtensionFeatureFlags merges extension feature-flag overrides into module config.
func WithExtensionFeatureFlags(flags map[string]bool) Option {
	return func(opts *setupOptions) {
		if opts == nil || len(flags) == 0 {
			return
		}
		if opts.extensionFeatureFlags == nil {
			opts.extensionFeatureFlags = map[string]bool{}
		}
		for key, value := range flags {
			opts.extensionFeatureFlags[strings.TrimSpace(key)] = value
		}
	}
}

// WithExtensionDiagnosticsEnabled toggles extension diagnostics surfaces.
func WithExtensionDiagnosticsEnabled(enabled bool) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.extensionDiagnosticsEnabled = &enabled
		}
	}
}

// WithActivitySinks overrides activity primary/fallback sink wiring.
func WithActivitySinks(primary ServicesActivitySink, fallback ServicesActivitySink) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.activityPrimarySink = primary
			opts.activityFallbackSink = fallback
		}
	}
}

// WithLifecycleNotificationSender overrides lifecycle notifications sender wiring.
func WithLifecycleNotificationSender(sender NotificationSender) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.notificationSender = sender
		}
	}
}

// WithLifecycleNotificationDefinitionResolver overrides definition resolution wiring.
func WithLifecycleNotificationDefinitionResolver(resolver NotificationDefinitionResolver) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.notificationDefinitionResolver = resolver
		}
	}
}

// WithLifecycleNotificationRecipientResolver overrides recipient resolution wiring.
func WithLifecycleNotificationRecipientResolver(resolver NotificationRecipientResolver) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.notificationRecipientResolver = resolver
		}
	}
}

// WithTableLifecycleHook registers a setup hook executed with the resolved Bun DB.
func WithTableLifecycleHook(hook TableLifecycleHook) Option {
	return func(opts *setupOptions) {
		if opts != nil && hook != nil {
			opts.tableHooks = append(opts.tableHooks, hook)
		}
	}
}

// WithJobEnqueuer overrides async worker enqueue wiring used by services API handlers.
func WithJobEnqueuer(enqueuer JobEnqueuer) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.jobEnqueuer = enqueuer
		}
	}
}

// WithWebhookVerifier overrides webhook signature verification wiring.
func WithWebhookVerifier(verifier WebhookVerifier) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.webhookVerifier = verifier
		}
	}
}

// WithWebhookHandler overrides webhook dispatch handling.
func WithWebhookHandler(handler WebhookHandler) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.webhookHandler = handler
		}
	}
}

// WithWebhookDeliveryLedger overrides webhook delivery claim ledger wiring.
func WithWebhookDeliveryLedger(ledger WebhookDeliveryLedger) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.webhookDeliveryLedger = ledger
		}
	}
}

// WithInboundVerifier overrides inbound signature verification wiring.
func WithInboundVerifier(verifier InboundVerifier) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.inboundVerifier = verifier
		}
	}
}

// WithInboundHandler registers an inbound surface handler.
func WithInboundHandler(handler InboundHandler) Option {
	return func(opts *setupOptions) {
		if opts != nil && handler != nil {
			opts.inboundHandlers = append(opts.inboundHandlers, handler)
		}
	}
}

// WithInboundClaimStore overrides inbound claim-store wiring.
func WithInboundClaimStore(store InboundClaimStore) Option {
	return func(opts *setupOptions) {
		if opts != nil {
			opts.inboundClaimStore = store
		}
	}
}

// WithActivityActionLabelOverrides configures action label overrides returned by the activity API.
func WithActivityActionLabelOverrides(overrides map[string]string) Option {
	return func(opts *setupOptions) {
		if opts == nil {
			return
		}
		opts.activityActionLabels = copyStringMap(overrides)
	}
}

var _ gocore.ErrorMapper = ErrorMapper(nil)
