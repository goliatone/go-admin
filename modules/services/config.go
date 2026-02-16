package services

import (
	"context"
	"fmt"
	"io/fs"
	"net/url"
	"strings"
	"time"

	goadmin "github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	gocore "github.com/goliatone/go-services/core"
	goservicesinbound "github.com/goliatone/go-services/inbound"
	goserviceswebhooks "github.com/goliatone/go-services/webhooks"
	"github.com/uptrace/bun"
)

const (
	defaultConnectionCallbackRoute = "services.connections.callback"
)

// Provider aliases go-services provider contracts into the adapter package.
type Provider = gocore.Provider

// Registry aliases go-services provider registry contracts into the adapter package.
type Registry = gocore.Registry

// SecretProvider aliases go-services secret provider contracts into the adapter package.
type SecretProvider = gocore.SecretProvider

// ConfigProvider aliases go-services config loading contracts into the adapter package.
type ConfigProvider = gocore.ConfigProvider

// OptionsResolver aliases go-services options layering contracts into the adapter package.
type OptionsResolver = gocore.OptionsResolver

// ErrorFactory aliases go-services error factory contracts into the adapter package.
type ErrorFactory = gocore.ErrorFactory

// ErrorMapper aliases go-services error mapper contracts into the adapter package.
type ErrorMapper = gocore.ErrorMapper

// JobEnqueuer aliases go-services job enqueue contracts into the adapter package.
type JobEnqueuer = gocore.JobEnqueuer

// InboundHandler aliases go-services inbound handler contracts into the adapter package.
type InboundHandler = gocore.InboundHandler

// InboundClaimStore aliases go-services inbound idempotency claim store contracts into the adapter package.
type InboundClaimStore = gocore.IdempotencyClaimStore

// ServicesActivitySink aliases go-services activity sink contracts into the adapter package.
type ServicesActivitySink = gocore.ServicesActivitySink

// NotificationSender aliases go-services notification sender contracts into the adapter package.
type NotificationSender = gocore.NotificationSender

// NotificationDefinitionResolver aliases go-services notification definition resolver contracts.
type NotificationDefinitionResolver = gocore.NotificationDefinitionResolver

// NotificationRecipientResolver aliases go-services notification recipient resolver contracts.
type NotificationRecipientResolver = gocore.NotificationRecipientResolver

// LifecycleEventHandler aliases go-services lifecycle event handlers for custom projector subscribers.
type LifecycleEventHandler = gocore.LifecycleEventHandler

// WebhookVerifier aliases go-services webhook verification contracts into the adapter package.
type WebhookVerifier = goserviceswebhooks.Verifier

// WebhookHandler aliases go-services webhook handler contracts into the adapter package.
type WebhookHandler = goserviceswebhooks.Handler

// WebhookDeliveryLedger aliases go-services webhook delivery claim ledger contracts.
type WebhookDeliveryLedger = goserviceswebhooks.DeliveryLedger

// InboundVerifier aliases go-services inbound verification contracts into the adapter package.
type InboundVerifier = goservicesinbound.Verifier

// ProviderPack aliases go-services extension provider-pack contracts into the adapter package.
type ProviderPack = goservices.ProviderPack

// CommandQueryBundleFactory aliases go-services extension bundle factory contracts.
type CommandQueryBundleFactory = goservices.CommandQueryBundleFactory

// TableLifecycleHook runs after migration registration and before service startup.
// Hooks can be used to register table-specific operational wiring.
type TableLifecycleHook func(ctx context.Context, db *bun.DB) error

// AppMigrationSource describes app-local migrations to register after go-services.
type AppMigrationSource struct {
	Label      string
	Filesystem fs.FS
}

// LifecycleDispatcherConfig controls outbox dispatcher runtime defaults.
type LifecycleDispatcherConfig struct {
	Enabled        bool          `koanf:"enabled" mapstructure:"enabled"`
	BatchSize      int           `koanf:"batch_size" mapstructure:"batch_size"`
	MaxAttempts    int           `koanf:"max_attempts" mapstructure:"max_attempts"`
	InitialBackoff time.Duration `koanf:"initial_backoff" mapstructure:"initial_backoff"`
}

// LifecycleActivityProjectorConfig controls activity projector runtime wiring.
type LifecycleActivityProjectorConfig struct {
	Enabled            bool                 `koanf:"enabled" mapstructure:"enabled"`
	BufferSize         int                  `koanf:"buffer_size" mapstructure:"buffer_size"`
	FallbackBufferSize int                  `koanf:"fallback_buffer_size" mapstructure:"fallback_buffer_size"`
	RetentionTTL       time.Duration        `koanf:"retention_ttl" mapstructure:"retention_ttl"`
	RetentionRowCap    int                  `koanf:"retention_row_cap" mapstructure:"retention_row_cap"`
	PrimarySink        ServicesActivitySink `koanf:"-" mapstructure:"-"`
	FallbackSink       ServicesActivitySink `koanf:"-" mapstructure:"-"`
}

// LifecycleNotificationsProjectorConfig controls notifications projector wiring.
type LifecycleNotificationsProjectorConfig struct {
	Enabled            bool                           `koanf:"enabled" mapstructure:"enabled"`
	DefinitionMap      map[string]string              `koanf:"definition_map" mapstructure:"definition_map"`
	DefinitionResolver NotificationDefinitionResolver `koanf:"-" mapstructure:"-"`
	RecipientResolver  NotificationRecipientResolver  `koanf:"-" mapstructure:"-"`
	Sender             NotificationSender             `koanf:"-" mapstructure:"-"`
}

// LifecycleSubscriberConfig maps a named subscriber into lifecycle projector fan-out.
type LifecycleSubscriberConfig struct {
	Name    string
	Handler LifecycleEventHandler
}

// LifecycleProjectorsConfig groups projector switches for lifecycle fan-out.
type LifecycleProjectorsConfig struct {
	Activity      LifecycleActivityProjectorConfig      `koanf:"activity" mapstructure:"activity"`
	Notifications LifecycleNotificationsProjectorConfig `koanf:"notifications" mapstructure:"notifications"`
	Subscribers   []LifecycleSubscriberConfig           `koanf:"-" mapstructure:"-"`
}

// LifecycleConfig exposes module lifecycle runtime surface.
type LifecycleConfig struct {
	Dispatcher LifecycleDispatcherConfig `koanf:"dispatcher" mapstructure:"dispatcher"`
	Projectors LifecycleProjectorsConfig `koanf:"projectors" mapstructure:"projectors"`
}

// APIConfig controls admin services API route registration behavior.
type APIConfig struct {
	Enabled                      bool              `koanf:"enabled" mapstructure:"enabled"`
	RequireIdempotencyKey        bool              `koanf:"require_idempotency_key" mapstructure:"require_idempotency_key"`
	IdempotencyTTL               time.Duration     `koanf:"idempotency_ttl" mapstructure:"idempotency_ttl"`
	ActivityActionLabelOverrides map[string]string `koanf:"activity_action_label_overrides" mapstructure:"activity_action_label_overrides"`
}

// CallbackURLConfig controls callback URL resolution for OAuth/re-consent flows.
type CallbackURLConfig struct {
	Strict bool `koanf:"strict" mapstructure:"strict"`

	// PublicBaseURL overrides request-origin derived callback URL roots (scheme/host/path prefix).
	PublicBaseURL string `koanf:"public_base_url" mapstructure:"public_base_url"`

	// URLKitGroup overrides the URLKit group used to resolve callback routes.
	// Defaults to admin.AdminAPIGroup().
	URLKitGroup string `koanf:"urlkit_group" mapstructure:"urlkit_group"`

	// DefaultRoute is the URLKit route key used when no provider-specific route exists.
	DefaultRoute string `koanf:"default_route" mapstructure:"default_route"`

	// ProviderRoutes maps provider IDs to URLKit route keys.
	ProviderRoutes map[string]string `koanf:"provider_routes" mapstructure:"provider_routes"`

	// ProviderURLOverrides maps provider IDs to absolute callback URLs.
	ProviderURLOverrides map[string]string `koanf:"provider_url_overrides" mapstructure:"provider_url_overrides"`
}

// WorkerConfig controls async worker adapter wiring.
type WorkerConfig struct {
	Enabled bool `koanf:"enabled" mapstructure:"enabled"`
}

// WebhookConfig controls webhook processor defaults.
type WebhookConfig struct {
	Enabled     bool          `koanf:"enabled" mapstructure:"enabled"`
	ClaimLease  time.Duration `koanf:"claim_lease" mapstructure:"claim_lease"`
	MaxAttempts int           `koanf:"max_attempts" mapstructure:"max_attempts"`
}

// InboundConfig controls inbound dispatcher defaults.
type InboundConfig struct {
	Enabled bool          `koanf:"enabled" mapstructure:"enabled"`
	KeyTTL  time.Duration `koanf:"key_ttl" mapstructure:"key_ttl"`
}

// ExtensionsConfig controls downstream package integration points and diagnostics.
type ExtensionsConfig struct {
	EnabledProviderPacks []string        `koanf:"enabled_provider_packs" mapstructure:"enabled_provider_packs"`
	FeatureFlags         map[string]bool `koanf:"feature_flags" mapstructure:"feature_flags"`
	DiagnosticsEnabled   bool            `koanf:"diagnostics_enabled" mapstructure:"diagnostics_enabled"`
}

// Config controls go-admin services module wiring.
type Config struct {
	Enabled bool `koanf:"enabled" mapstructure:"enabled"`

	// Service runtime configuration consumed by go-services.
	Service     goservices.Config            `koanf:"service" mapstructure:"service"`
	Inheritance goservices.InheritanceConfig `koanf:"inheritance" mapstructure:"inheritance"`

	// ConfigValues is loaded through go-config/cfgx and merged via go-options.
	ConfigValues map[string]any `koanf:"config" mapstructure:"config"`

	// PersistenceClient defaults to go-persistence-bun client used for SQL stores.
	PersistenceClient *persistence.Client `koanf:"-" mapstructure:"-"`

	// RepositoryFactory optionally overrides default go-services SQL repository factory wiring.
	RepositoryFactory any `koanf:"-" mapstructure:"-"`

	// SecretProvider optionally overrides app-key secret provider wiring.
	SecretProvider SecretProvider `koanf:"-" mapstructure:"-"`

	// Encryption key material for default app-key secret provider.
	EncryptionKey     string `koanf:"encryption_key" mapstructure:"encryption_key"`
	EncryptionKeyID   string `koanf:"encryption_key_id" mapstructure:"encryption_key_id"`
	EncryptionVersion int    `koanf:"encryption_version" mapstructure:"encryption_version"`

	// Providers are registered on startup in deterministic order.
	Providers []Provider `koanf:"-" mapstructure:"-"`
	Registry  Registry   `koanf:"-" mapstructure:"-"`

	// Optional module-level logging/error wiring.
	LoggerProvider goadmin.LoggerProvider `koanf:"-" mapstructure:"-"`
	Logger         goadmin.Logger         `koanf:"-" mapstructure:"-"`
	ErrorFactory   ErrorFactory           `koanf:"-" mapstructure:"-"`
	ErrorMapper    ErrorMapper            `koanf:"-" mapstructure:"-"`

	// Optional overrides for go-services config loading/layering.
	ConfigProvider  ConfigProvider  `koanf:"-" mapstructure:"-"`
	OptionsResolver OptionsResolver `koanf:"-" mapstructure:"-"`

	// RegisterMigrations defaults to true when nil.
	RegisterMigrations *bool `koanf:"register_migrations" mapstructure:"register_migrations"`

	// Validation targets used when registering dialect-aware migrations.
	ValidationTargets []string `koanf:"validation_targets" mapstructure:"validation_targets"`

	// AppMigrations are registered after go-auth/go-users/go-services in dependency order.
	AppMigrations []AppMigrationSource `koanf:"-" mapstructure:"-"`

	// TableLifecycleHooks run after migration registration and before service startup.
	TableLifecycleHooks []TableLifecycleHook `koanf:"-" mapstructure:"-"`

	// Lifecycle runtime/projector config surface.
	Lifecycle LifecycleConfig `koanf:"lifecycle" mapstructure:"lifecycle"`

	// Admin services API/runtime integration controls.
	API        APIConfig         `koanf:"api" mapstructure:"api"`
	Callbacks  CallbackURLConfig `koanf:"callbacks" mapstructure:"callbacks"`
	Worker     WorkerConfig      `koanf:"worker" mapstructure:"worker"`
	Webhook    WebhookConfig     `koanf:"webhook" mapstructure:"webhook"`
	Inbound    InboundConfig     `koanf:"inbound" mapstructure:"inbound"`
	Extensions ExtensionsConfig  `koanf:"extensions" mapstructure:"extensions"`

	// Optional worker/inbound/webhook runtime adapters.
	JobEnqueuer           JobEnqueuer           `koanf:"-" mapstructure:"-"`
	WebhookVerifier       WebhookVerifier       `koanf:"-" mapstructure:"-"`
	WebhookHandler        WebhookHandler        `koanf:"-" mapstructure:"-"`
	WebhookDeliveryLedger WebhookDeliveryLedger `koanf:"-" mapstructure:"-"`
	InboundVerifier       InboundVerifier       `koanf:"-" mapstructure:"-"`
	InboundHandlers       []InboundHandler      `koanf:"-" mapstructure:"-"`
	InboundClaimStore     InboundClaimStore     `koanf:"-" mapstructure:"-"`
}

// RuntimeContracts exposes resolved logger/runtime bridges for async worker wiring.
type RuntimeContracts struct {
	LoggerProvider    goadmin.LoggerProvider
	Logger            goadmin.Logger
	JobLoggerProvider any
	JobLogger         any
}

// DefaultConfig returns module defaults aligned with SERVICES_TDD.md.
func DefaultConfig() Config {
	outboxDefaults := gocore.DefaultOutboxDispatcherConfig()
	return Config{
		Enabled:           false,
		Service:           goservices.DefaultConfig(),
		Inheritance:       goservices.InheritanceConfig{},
		EncryptionKeyID:   "app-key",
		EncryptionVersion: 1,
		ValidationTargets: []string{"postgres", "sqlite"},
		Lifecycle: LifecycleConfig{
			Dispatcher: LifecycleDispatcherConfig{
				Enabled:        true,
				BatchSize:      outboxDefaults.BatchSize,
				MaxAttempts:    outboxDefaults.MaxAttempts,
				InitialBackoff: outboxDefaults.InitialBackoff,
			},
			Projectors: LifecycleProjectorsConfig{
				Activity: LifecycleActivityProjectorConfig{
					Enabled:            true,
					BufferSize:         256,
					FallbackBufferSize: 1024,
					RetentionTTL:       30 * 24 * time.Hour,
					RetentionRowCap:    50000,
				},
				Notifications: LifecycleNotificationsProjectorConfig{
					Enabled:       false,
					DefinitionMap: map[string]string{},
				},
			},
		},
		API: APIConfig{
			Enabled:                      true,
			RequireIdempotencyKey:        true,
			IdempotencyTTL:               24 * time.Hour,
			ActivityActionLabelOverrides: map[string]string{},
		},
		Callbacks: CallbackURLConfig{
			Strict:               false,
			DefaultRoute:         defaultConnectionCallbackRoute,
			ProviderRoutes:       map[string]string{},
			ProviderURLOverrides: map[string]string{},
		},
		Worker: WorkerConfig{
			Enabled: true,
		},
		Webhook: WebhookConfig{
			Enabled:     true,
			ClaimLease:  30 * time.Second,
			MaxAttempts: 8,
		},
		Inbound: InboundConfig{
			Enabled: true,
			KeyTTL:  10 * time.Minute,
		},
		Extensions: ExtensionsConfig{
			EnabledProviderPacks: []string{},
			FeatureFlags:         map[string]bool{},
			DiagnosticsEnabled:   true,
		},
	}
}

func withDefaults(cfg Config) Config {
	defaults := DefaultConfig()

	if cfg.Service.ServiceName == "" {
		cfg.Service.ServiceName = defaults.Service.ServiceName
	}
	if len(cfg.Service.Inheritance.EnabledProviders) == 0 && len(cfg.Inheritance.EnabledProviders) > 0 {
		cfg.Service.Inheritance = goservices.InheritanceConfig{
			EnabledProviders: append([]string(nil), cfg.Inheritance.EnabledProviders...),
		}
	}
	if len(cfg.Service.Inheritance.EnabledProviders) == 0 {
		cfg.Service.Inheritance = defaults.Service.Inheritance
	}
	if strings.TrimSpace(cfg.EncryptionKeyID) == "" {
		cfg.EncryptionKeyID = defaults.EncryptionKeyID
	}
	if cfg.EncryptionVersion <= 0 {
		cfg.EncryptionVersion = defaults.EncryptionVersion
	}
	if len(cfg.ValidationTargets) == 0 {
		cfg.ValidationTargets = append([]string(nil), defaults.ValidationTargets...)
	}
	if cfg.Lifecycle.Dispatcher.BatchSize == 0 {
		cfg.Lifecycle.Dispatcher.BatchSize = defaults.Lifecycle.Dispatcher.BatchSize
	}
	if cfg.Lifecycle.Dispatcher.MaxAttempts == 0 {
		cfg.Lifecycle.Dispatcher.MaxAttempts = defaults.Lifecycle.Dispatcher.MaxAttempts
	}
	if cfg.Lifecycle.Dispatcher.InitialBackoff == 0 {
		cfg.Lifecycle.Dispatcher.InitialBackoff = defaults.Lifecycle.Dispatcher.InitialBackoff
	}
	if cfg.Lifecycle.Dispatcher.Enabled == false {
		cfg.Lifecycle.Dispatcher.Enabled = defaults.Lifecycle.Dispatcher.Enabled
	}
	if cfg.Lifecycle.Projectors.Activity.Enabled == false {
		cfg.Lifecycle.Projectors.Activity.Enabled = defaults.Lifecycle.Projectors.Activity.Enabled
	}
	if cfg.Lifecycle.Projectors.Activity.BufferSize <= 0 {
		cfg.Lifecycle.Projectors.Activity.BufferSize = defaults.Lifecycle.Projectors.Activity.BufferSize
	}
	if cfg.Lifecycle.Projectors.Activity.FallbackBufferSize <= 0 {
		cfg.Lifecycle.Projectors.Activity.FallbackBufferSize = defaults.Lifecycle.Projectors.Activity.FallbackBufferSize
	}
	if cfg.Lifecycle.Projectors.Activity.RetentionTTL <= 0 {
		cfg.Lifecycle.Projectors.Activity.RetentionTTL = defaults.Lifecycle.Projectors.Activity.RetentionTTL
	}
	if cfg.Lifecycle.Projectors.Activity.RetentionRowCap <= 0 {
		cfg.Lifecycle.Projectors.Activity.RetentionRowCap = defaults.Lifecycle.Projectors.Activity.RetentionRowCap
	}
	if cfg.Lifecycle.Projectors.Notifications.DefinitionMap == nil {
		cfg.Lifecycle.Projectors.Notifications.DefinitionMap = map[string]string{}
	}
	if cfg.API.IdempotencyTTL == 0 {
		cfg.API.IdempotencyTTL = defaults.API.IdempotencyTTL
	}
	if cfg.API.ActivityActionLabelOverrides == nil {
		cfg.API.ActivityActionLabelOverrides = map[string]string{}
	}
	if strings.TrimSpace(cfg.Callbacks.DefaultRoute) == "" {
		cfg.Callbacks.DefaultRoute = defaults.Callbacks.DefaultRoute
	}
	cfg.Callbacks.PublicBaseURL = strings.TrimSpace(cfg.Callbacks.PublicBaseURL)
	cfg.Callbacks.URLKitGroup = strings.TrimSpace(cfg.Callbacks.URLKitGroup)
	cfg.Callbacks.ProviderRoutes = normalizeStringMapEntries(cfg.Callbacks.ProviderRoutes)
	cfg.Callbacks.ProviderURLOverrides = normalizeStringMapEntries(cfg.Callbacks.ProviderURLOverrides)
	if cfg.Webhook.ClaimLease == 0 {
		cfg.Webhook.ClaimLease = defaults.Webhook.ClaimLease
	}
	if cfg.Webhook.MaxAttempts == 0 {
		cfg.Webhook.MaxAttempts = defaults.Webhook.MaxAttempts
	}
	if cfg.Inbound.KeyTTL == 0 {
		cfg.Inbound.KeyTTL = defaults.Inbound.KeyTTL
	}
	if cfg.Extensions.FeatureFlags == nil {
		cfg.Extensions.FeatureFlags = map[string]bool{}
	}
	if len(cfg.Extensions.EnabledProviderPacks) > 0 {
		cfg.Extensions.EnabledProviderPacks = normalizeStringListUnique(cfg.Extensions.EnabledProviderPacks)
	}
	if !cfg.Extensions.DiagnosticsEnabled {
		cfg.Extensions.DiagnosticsEnabled = defaults.Extensions.DiagnosticsEnabled
	}

	return cfg
}

func registerMigrationsEnabled(value *bool) bool {
	if value == nil {
		return true
	}
	return *value
}

func (c Config) validate() error {
	if !c.Enabled {
		return nil
	}
	if err := c.Service.Validate(); err != nil {
		return fmt.Errorf("modules/services: invalid service config: %w", err)
	}
	if c.PersistenceClient == nil && c.RepositoryFactory == nil {
		return fmt.Errorf("modules/services: persistence client or repository factory is required")
	}
	if registerMigrationsEnabled(c.RegisterMigrations) && c.PersistenceClient == nil {
		return fmt.Errorf("modules/services: persistence client is required when register_migrations is enabled")
	}
	if c.SecretProvider == nil && strings.TrimSpace(c.EncryptionKey) == "" {
		return fmt.Errorf("modules/services: encryption_key is required when secret provider override is not configured")
	}
	if c.Lifecycle.Dispatcher.BatchSize <= 0 {
		return fmt.Errorf("modules/services: lifecycle.dispatcher.batch_size must be greater than zero")
	}
	if c.Lifecycle.Dispatcher.MaxAttempts <= 0 {
		return fmt.Errorf("modules/services: lifecycle.dispatcher.max_attempts must be greater than zero")
	}
	if c.Lifecycle.Dispatcher.InitialBackoff <= 0 {
		return fmt.Errorf("modules/services: lifecycle.dispatcher.initial_backoff must be greater than zero")
	}
	if c.Lifecycle.Projectors.Activity.BufferSize <= 0 {
		return fmt.Errorf("modules/services: lifecycle.projectors.activity.buffer_size must be greater than zero")
	}
	if c.Lifecycle.Projectors.Activity.FallbackBufferSize <= 0 {
		return fmt.Errorf("modules/services: lifecycle.projectors.activity.fallback_buffer_size must be greater than zero")
	}
	if c.Lifecycle.Projectors.Activity.RetentionTTL <= 0 {
		return fmt.Errorf("modules/services: lifecycle.projectors.activity.retention_ttl must be greater than zero")
	}
	if c.Lifecycle.Projectors.Activity.RetentionRowCap <= 0 {
		return fmt.Errorf("modules/services: lifecycle.projectors.activity.retention_row_cap must be greater than zero")
	}
	if c.API.IdempotencyTTL <= 0 {
		return fmt.Errorf("modules/services: api.idempotency_ttl must be greater than zero")
	}
	for action, label := range c.API.ActivityActionLabelOverrides {
		if strings.TrimSpace(action) == "" {
			return fmt.Errorf("modules/services: api.activity_action_label_overrides keys must not be empty")
		}
		if strings.TrimSpace(label) == "" {
			return fmt.Errorf("modules/services: api.activity_action_label_overrides[%q] value must not be empty", action)
		}
	}
	if strings.TrimSpace(c.Callbacks.DefaultRoute) == "" {
		return fmt.Errorf("modules/services: callbacks.default_route must not be empty")
	}
	if baseURL := strings.TrimSpace(c.Callbacks.PublicBaseURL); baseURL != "" {
		if err := validateAbsoluteHTTPURL(baseURL); err != nil {
			return fmt.Errorf("modules/services: callbacks.public_base_url %w", err)
		}
	}
	for providerID, route := range c.Callbacks.ProviderRoutes {
		if strings.TrimSpace(providerID) == "" {
			return fmt.Errorf("modules/services: callbacks.provider_routes keys must not be empty")
		}
		if strings.TrimSpace(route) == "" {
			return fmt.Errorf("modules/services: callbacks.provider_routes[%q] value must not be empty", providerID)
		}
	}
	for providerID, overrideURL := range c.Callbacks.ProviderURLOverrides {
		if strings.TrimSpace(providerID) == "" {
			return fmt.Errorf("modules/services: callbacks.provider_url_overrides keys must not be empty")
		}
		if strings.TrimSpace(overrideURL) == "" {
			return fmt.Errorf("modules/services: callbacks.provider_url_overrides[%q] value must not be empty", providerID)
		}
		if err := validateAbsoluteHTTPURL(strings.TrimSpace(overrideURL)); err != nil {
			return fmt.Errorf("modules/services: callbacks.provider_url_overrides[%q] %w", providerID, err)
		}
	}
	if c.Webhook.ClaimLease <= 0 {
		return fmt.Errorf("modules/services: webhook.claim_lease must be greater than zero")
	}
	if c.Webhook.MaxAttempts <= 0 {
		return fmt.Errorf("modules/services: webhook.max_attempts must be greater than zero")
	}
	if c.Inbound.KeyTTL <= 0 {
		return fmt.Errorf("modules/services: inbound.key_ttl must be greater than zero")
	}
	for _, source := range c.AppMigrations {
		if source.Filesystem == nil {
			return fmt.Errorf("modules/services: app migration source %q filesystem is nil", strings.TrimSpace(source.Label))
		}
	}
	for _, target := range c.ValidationTargets {
		if strings.TrimSpace(target) == "" {
			return fmt.Errorf("modules/services: validation targets must not include empty values")
		}
	}
	for idx, subscriber := range c.Lifecycle.Projectors.Subscribers {
		if strings.TrimSpace(subscriber.Name) == "" {
			return fmt.Errorf("modules/services: lifecycle subscriber %d requires a name", idx)
		}
		if subscriber.Handler == nil {
			return fmt.Errorf("modules/services: lifecycle subscriber %d requires a handler", idx)
		}
	}
	for idx, packName := range c.Extensions.EnabledProviderPacks {
		if strings.TrimSpace(packName) == "" {
			return fmt.Errorf("modules/services: extensions.enabled_provider_packs[%d] must not be empty", idx)
		}
	}
	for flag, value := range c.Extensions.FeatureFlags {
		if strings.TrimSpace(flag) == "" {
			return fmt.Errorf("modules/services: extensions.feature_flags keys must not be empty")
		}
		_ = value
	}
	return nil
}

func normalizeStringListUnique(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	return out
}

func normalizeStringMapEntries(values map[string]string) map[string]string {
	if len(values) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(values))
	for key, value := range values {
		trimmedKey := strings.TrimSpace(key)
		trimmedValue := strings.TrimSpace(value)
		if trimmedKey == "" || trimmedValue == "" {
			continue
		}
		out[trimmedKey] = trimmedValue
	}
	return out
}

func validateAbsoluteHTTPURL(raw string) error {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return fmt.Errorf("must be a valid absolute URL: %w", err)
	}
	if parsed == nil || !parsed.IsAbs() || strings.TrimSpace(parsed.Host) == "" {
		return fmt.Errorf("must be a valid absolute URL")
	}
	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("must use http or https scheme")
	}
	return nil
}

func defaultErrorFactory(message string, category ...goerrors.Category) *goerrors.Error {
	return goerrors.New(message, category...)
}

func defaultErrorMapper(err error) *goerrors.Error {
	if err == nil {
		return nil
	}
	mapped := goerrors.MapToError(err, goerrors.DefaultErrorMappers())
	if mapped != nil {
		return mapped
	}
	return goerrors.Wrap(err, goerrors.CategoryInternal, err.Error())
}
