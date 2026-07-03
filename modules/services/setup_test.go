package services

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	goadmin "github.com/goliatone/go-admin/admin"
	persistence "github.com/goliatone/go-persistence-bun"
	router "github.com/goliatone/go-router"
	goservices "github.com/goliatone/go-services"
	gocore "github.com/goliatone/go-services/core"
	servicesratelimit "github.com/goliatone/go-services/ratelimit"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

type testPersistenceConfig struct {
	driver string
	server string
}

func (c testPersistenceConfig) GetDebug() bool {
	return false
}

func (c testPersistenceConfig) GetDriver() string {
	return c.driver
}

func (c testPersistenceConfig) GetServer() string {
	return c.server
}

func (c testPersistenceConfig) GetPingTimeout() time.Duration {
	return 10 * time.Second
}

func (c testPersistenceConfig) GetOtelIdentifier() string {
	return ""
}

func newTestPersistenceClient(t *testing.T) *persistence.Client {
	t.Helper()

	dsn := "file:" + filepath.Join(t.TempDir(), "services_module.db") + "?cache=shared&_fk=1"
	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	t.Cleanup(func() {
		if closeErr := sqlDB.Close(); closeErr != nil {
			t.Errorf("close sqlite: %v", closeErr)
		}
	})

	client, err := persistence.New(testPersistenceConfig{driver: sqliteshim.ShimName, server: dsn}, sqlDB, sqlitedialect.New())
	if err != nil {
		t.Fatalf("persistence.New: %v", err)
	}
	return client
}

func newTestAdmin(t *testing.T) *goadmin.Admin {
	t.Helper()
	adm, err := goadmin.New(goadmin.Config{}, goadmin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuth(testServicesPassthroughAuthenticator{}, nil)
	return adm
}

type testServicesPassthroughAuthenticator struct{}

func (testServicesPassthroughAuthenticator) Wrap(router.Context) error {
	return nil
}

func (testServicesPassthroughAuthenticator) WrapHandler(handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return func(router.Context) error { return nil }
	}
	return handler
}

type fixedConfigProvider struct {
	cfg gocore.Config
}

func (p fixedConfigProvider) Load(context.Context, gocore.Config) (gocore.Config, error) {
	return p.cfg, nil
}

type fixedOptionsResolver struct {
	cfg gocore.Config
}

func (r fixedOptionsResolver) Resolve(gocore.Config, gocore.Config, gocore.Config) (gocore.Config, error) {
	return r.cfg, nil
}

type testRateLimitStateStore struct{}

func (s *testRateLimitStateStore) Get(context.Context, gocore.RateLimitKey) (servicesratelimit.State, error) {
	return servicesratelimit.State{}, nil
}

type testRateLimitStateStoreProvider struct {
	store rateLimitStateStore
}

func (p testRateLimitStateStoreProvider) RateLimitStateStore() rateLimitStateStore {
	return p.store
}

type testLegacyConcreteRateLimitStateStoreProvider struct {
	store *testRateLimitStateStore
}

func (p testLegacyConcreteRateLimitStateStoreProvider) RateLimitStateStore() *testRateLimitStateStore {
	return p.store
}

func TestResolveRateLimitStateStoreUsesDirectStore(t *testing.T) {
	store := &testRateLimitStateStore{}
	if got := resolveRateLimitStateStore(store); got != store {
		t.Fatalf("expected direct store, got %#v", got)
	}
}

func TestResolveRateLimitStateStoreUsesTypedProvider(t *testing.T) {
	store := &testRateLimitStateStore{}
	factory := testRateLimitStateStoreProvider{store: store}
	if got := resolveRateLimitStateStore(factory); got != store {
		t.Fatalf("expected provider store, got %#v", got)
	}
}

func TestResolveRateLimitStateStoreReturnsNilForNilProviderStore(t *testing.T) {
	factory := testRateLimitStateStoreProvider{}
	if got := resolveRateLimitStateStore(factory); got != nil {
		t.Fatalf("expected nil store, got %#v", got)
	}
}

func TestResolveRateLimitStateStoreRejectsUnsupportedFactoryShapes(t *testing.T) {
	if got := resolveRateLimitStateStore(struct{}{}); got != nil {
		t.Fatalf("expected nil for unsupported factory, got %#v", got)
	}

	legacy := testLegacyConcreteRateLimitStateStoreProvider{store: &testRateLimitStateStore{}}
	if got := resolveRateLimitStateStore(legacy); got != nil {
		t.Fatalf("expected nil for legacy concrete-return provider, got %#v", got)
	}
}

func TestSetup_DisabledNoop(t *testing.T) {
	module, err := Setup(nil, Config{})
	if err != nil {
		t.Fatalf("setup: %v", err)
	}
	if module != nil {
		t.Fatalf("expected nil module when disabled")
	}
}

func TestSetup_ModuleStartupDefaultsAndWiring(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	module, err := Setup(adm, cfg)
	if err != nil {
		t.Fatalf("setup: %v", err)
	}
	if module == nil {
		t.Fatalf("expected module")
	}
	if module.Service() == nil {
		t.Fatalf("expected services runtime")
	}
	if module.Facade() == nil {
		t.Fatalf("expected services facade")
	}
	if module.Runtime().LoggerProvider == nil {
		t.Fatalf("expected runtime logger provider")
	}
	if module.Runtime().JobLoggerProvider == nil {
		t.Fatalf("expected job logger provider bridge")
	}
	if module.RepositoryFactory() == nil {
		t.Fatalf("expected repository factory")
	}
	if module.LifecycleConfig().Dispatcher.BatchSize <= 0 {
		t.Fatalf("expected lifecycle dispatcher defaults")
	}

	deps := module.Service().Dependencies()
	if deps.PersistenceClient == nil {
		t.Fatalf("expected persistence client in service dependencies")
	}
	if deps.RepositoryFactory == nil {
		t.Fatalf("expected repository factory in service dependencies")
	}
	if deps.SecretProvider == nil {
		t.Fatalf("expected secret provider in service dependencies")
	}
	if deps.ConfigProvider == nil {
		t.Fatalf("expected config provider in service dependencies")
	}
	if deps.OptionsResolver == nil {
		t.Fatalf("expected options resolver in service dependencies")
	}

	if err := client.ValidateDialects(context.Background()); err != nil {
		t.Fatalf("validate dialects: %v", err)
	}
}

func TestRegisterSetupMigrationsPreservesConfigAppMigrationIdentity(t *testing.T) {
	client := newTestPersistenceClient(t)

	cfg := DefaultConfig()
	cfg.PersistenceClient = client
	cfg.ValidationTargets = []string{"sqlite"}
	cfg.AppMigrations = []AppMigrationSource{
		{
			Label:      "App B",
			SourceKey:  "app-b",
			Order:      110,
			Filesystem: appMigrationTestFS("app_b"),
		},
		{
			Label:      "App A",
			SourceKey:  "app-a",
			Order:      120,
			Filesystem: appMigrationTestFS("app_a"),
		},
	}

	if err := registerSetupMigrations(cfg, setupOptions{}); err != nil {
		t.Fatalf("register setup migrations: %v", err)
	}
	plan, err := client.Plan(context.Background())
	if err != nil {
		t.Fatalf("plan migrations: %v", err)
	}
	assertSourceStablePlanEntry(t, plan, "app_b", 110, []string{"go_services"})
	assertSourceStablePlanEntry(t, plan, "app_a", 120, []string{"go_services"})
}

func TestSetup_RespectsWithXOverrides(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client
	cfg.ConfigValues = map[string]any{"service_name": "from-config"}

	module, err := Setup(
		adm,
		cfg,
		WithRegisterMigrations(false),
		WithConfigProvider(fixedConfigProvider{cfg: gocore.Config{ServiceName: "provider-name"}}),
		WithOptionsResolver(fixedOptionsResolver{cfg: gocore.Config{ServiceName: "resolver-name"}}),
	)
	if err != nil {
		t.Fatalf("setup: %v", err)
	}
	if got := module.Service().Config().ServiceName; got != "resolver-name" {
		t.Fatalf("expected options resolver override, got %q", got)
	}
}

func TestSetup_RunsTableLifecycleHooks(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	called := false
	module, err := Setup(
		adm,
		cfg,
		WithRegisterMigrations(false),
		WithTableLifecycleHook(func(ctx context.Context, db *bun.DB) error {
			_ = ctx
			if db == nil {
				return errors.New("db is nil")
			}
			called = true
			return nil
		}),
	)
	if err != nil {
		t.Fatalf("setup: %v", err)
	}
	if module == nil {
		t.Fatalf("expected module")
	}
	if !called {
		t.Fatalf("expected table lifecycle hook execution")
	}
}

func TestVerifyServicesOAuthStorageSchemaDiagnostics(t *testing.T) {
	ctx := context.Background()
	client := newTestPersistenceClient(t)

	err := VerifyServicesOAuthStorageSchema(ctx, client.DB())
	if err == nil {
		t.Fatalf("expected missing schema diagnostic")
	}
	for _, snippet := range []string{
		"modules/services: go-services OAuth storage schema is incomplete",
		"source-stable go-services migrations",
		"service_connections",
	} {
		if !strings.Contains(err.Error(), snippet) {
			t.Fatalf("expected diagnostic to contain %q, got %v", snippet, err)
		}
	}

	if err := RegisterServiceMigrations(client); err != nil {
		t.Fatalf("RegisterServiceMigrations: %v", err)
	}
	if err := client.Migrate(ctx); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if err := VerifyServicesOAuthStorageSchema(ctx, client.DB()); err != nil {
		t.Fatalf("VerifyServicesOAuthStorageSchema after migrate: %v", err)
	}
}

func TestRequiredServicesOAuthStorageTablesUseGoServicesList(t *testing.T) {
	required := RequiredServicesOAuthStorageTables()
	for _, table := range []string{
		"service_connections",
		"service_credentials",
		"service_grant_events",
		"service_grant_snapshots",
	} {
		if !containsString(required, table) {
			t.Fatalf("expected required OAuth storage table %q in %v", table, required)
		}
	}
}

func TestSetup_MisconfigurationFailures(t *testing.T) {
	client := newTestPersistenceClient(t)

	base := DefaultConfig()
	base.Enabled = true
	base.EncryptionKey = "test-services-key"
	base.PersistenceClient = client

	tests := []struct {
		name string
		cfg  Config
		adm  *goadmin.Admin
	}{
		{
			name: "nil admin",
			cfg:  base,
			adm:  nil,
		},
		{
			name: "missing persistence and repository",
			cfg: func() Config {
				cfg := base
				cfg.PersistenceClient = nil
				cfg.RepositoryFactory = nil
				return cfg
			}(),
			adm: newTestAdmin(t),
		},
		{
			name: "missing encryption material",
			cfg: func() Config {
				cfg := base
				cfg.EncryptionKey = ""
				cfg.SecretProvider = nil
				return cfg
			}(),
			adm: newTestAdmin(t),
		},
		{
			name: "migration enabled without persistence",
			cfg: func() Config {
				cfg := base
				cfg.PersistenceClient = nil
				enabled := true
				cfg.RegisterMigrations = &enabled
				cfg.RepositoryFactory = struct{}{}
				return cfg
			}(),
			adm: newTestAdmin(t),
		},
		{
			name: "invalid lifecycle dispatcher values",
			cfg: func() Config {
				cfg := base
				cfg.Lifecycle.Dispatcher.BatchSize = -1
				return cfg
			}(),
			adm: newTestAdmin(t),
		},
		{
			name: "invalid callbacks public base url",
			cfg: func() Config {
				cfg := base
				cfg.Callbacks.PublicBaseURL = "://bad-url"
				return cfg
			}(),
			adm: newTestAdmin(t),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			module, err := Setup(tc.adm, tc.cfg)
			if err == nil {
				t.Fatalf("expected error, got module=%v", module)
			}
		})
	}
}

func TestSetup_LifecycleConfigOverride(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	override := cfg.Lifecycle
	override.Dispatcher.Enabled = false
	override.Dispatcher.BatchSize = 7
	override.Projectors.Activity.Enabled = false
	override.Projectors.Notifications.Enabled = true
	override.Projectors.Notifications.DefinitionMap = map[string]string{
		"connection.failed": "services.connection.failed",
	}

	module, err := Setup(adm, cfg, WithRegisterMigrations(false), WithLifecycleConfig(override))
	if err != nil {
		t.Fatalf("setup: %v", err)
	}
	resolved := module.LifecycleConfig()
	if resolved.Dispatcher.Enabled {
		t.Fatalf("expected dispatcher disabled override")
	}
	if resolved.Dispatcher.BatchSize != 7 {
		t.Fatalf("expected dispatcher batch size override")
	}
	if resolved.Projectors.Activity.Enabled {
		t.Fatalf("expected activity projector disabled override")
	}
	if !resolved.Projectors.Notifications.Enabled {
		t.Fatalf("expected notifications projector enabled override")
	}
	if len(resolved.Projectors.Notifications.DefinitionMap) != 1 {
		t.Fatalf("expected notifications definition map override")
	}
}

func TestSetup_CallbackURLConfigOverride(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	module, err := Setup(adm, cfg, WithRegisterMigrations(false), WithCallbackURLConfig(CallbackURLConfig{
		Strict:               true,
		PublicBaseURL:        "https://callbacks.example.com",
		ProviderRoutes:       map[string]string{"github": "custom.github.callback"},
		ProviderURLOverrides: map[string]string{"google_drive": "https://alt.example.com/oauth/google-drive/callback"},
	}))
	if err != nil {
		t.Fatalf("setup: %v", err)
	}

	if !module.config.Callbacks.Strict {
		t.Fatalf("expected callbacks.strict override")
	}
	if got := strings.TrimSpace(module.config.Callbacks.PublicBaseURL); got != "https://callbacks.example.com" {
		t.Fatalf("expected callbacks.public_base_url override, got %q", got)
	}
	if got := module.config.Callbacks.ProviderRoutes["github"]; got != "custom.github.callback" {
		t.Fatalf("expected provider route override, got %q", got)
	}
	if got := module.config.Callbacks.ProviderURLOverrides["google_drive"]; got != "https://alt.example.com/oauth/google-drive/callback" {
		t.Fatalf("expected provider url override, got %q", got)
	}
}

func TestSetup_ExtensionHooksRegistrationLifecycle(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	module, err := Setup(
		adm,
		cfg,
		WithRegisterMigrations(false),
		WithProviderPack("orders-pack", testServicesProvider{id: "orders_provider"}),
		WithEnabledProviderPacks("orders-pack"),
		WithCommandQueryBundle("orders-bundle", func(goservices.CommandQueryService) (any, error) {
			return map[string]any{"bundle": "orders"}, nil
		}),
		WithExtensionLifecycleSubscriber("orders.lifecycle", &flakyLifecycleSubscriber{}),
		WithExtensionFeatureFlags(map[string]bool{"orders.enabled": true}),
	)
	if err != nil {
		t.Fatalf("setup with extensions: %v", err)
	}
	if module == nil {
		t.Fatalf("expected module")
	}

	if _, ok := module.Service().Dependencies().Registry.Get("orders_provider"); !ok {
		t.Fatalf("expected provider from registered pack")
	}
	bundles := module.ExtensionBundles()
	if _, ok := bundles["orders-bundle"]; !ok {
		t.Fatalf("expected built orders-bundle in extension bundles")
	}

	diag := module.ExtensionDiagnostics()
	if len(diag.EnabledProviderPacks) != 1 || diag.EnabledProviderPacks[0] != "orders-pack" {
		t.Fatalf("expected enabled provider pack diagnostics, got %#v", diag.EnabledProviderPacks)
	}
	if len(diag.CommandQueryBundles) != 1 || diag.CommandQueryBundles[0] != "orders-bundle" {
		t.Fatalf("expected command/query bundle diagnostics, got %#v", diag.CommandQueryBundles)
	}
	if got := diag.FeatureFlags["orders.enabled"]; !got {
		t.Fatalf("expected extension feature flag override in diagnostics")
	}
	foundSubscriber := false
	for _, name := range diag.LifecycleSubscribers {
		if strings.TrimSpace(name) == "orders.lifecycle" {
			foundSubscriber = true
			break
		}
	}
	if !foundSubscriber {
		t.Fatalf("expected lifecycle subscriber in diagnostics: %#v", diag.LifecycleSubscribers)
	}
}

func TestSetup_ExtensionHooksDuplicateRegistrationFails(t *testing.T) {
	client := newTestPersistenceClient(t)
	adm := newTestAdmin(t)

	cfg := DefaultConfig()
	cfg.Enabled = true
	cfg.EncryptionKey = "test-services-key"
	cfg.PersistenceClient = client

	_, err := Setup(
		adm,
		cfg,
		WithRegisterMigrations(false),
		WithProviderPack("duplicate-pack", testServicesProvider{id: "provider_one"}),
		WithProviderPack("duplicate-pack", testServicesProvider{id: "provider_two"}),
	)
	if err == nil {
		t.Fatalf("expected duplicate provider pack registration error")
	}

	_, err = Setup(
		adm,
		cfg,
		WithRegisterMigrations(false),
		WithCommandQueryBundle("duplicate-bundle", func(goservices.CommandQueryService) (any, error) { return nil, nil }),
		WithCommandQueryBundle("duplicate-bundle", func(goservices.CommandQueryService) (any, error) { return nil, nil }),
	)
	if err == nil {
		t.Fatalf("expected duplicate command/query bundle registration error")
	}
}
