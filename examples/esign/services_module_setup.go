package main

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	servicesmodule "github.com/goliatone/go-admin/modules/services"
	persistence "github.com/goliatone/go-persistence-bun"
	goservices "github.com/goliatone/go-services"
	gdrive "github.com/goliatone/go-services/providers/google/drive"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"github.com/uptrace/bun/driver/sqliteshim"
)

const defaultESignServicesEncryptionKey = "go-admin-esign-services-app-key"

type eSignServicesPersistenceConfig struct {
	driver string
	server string
}

func (c eSignServicesPersistenceConfig) GetDebug() bool {
	return false
}

func (c eSignServicesPersistenceConfig) GetDriver() string {
	return c.driver
}

func (c eSignServicesPersistenceConfig) GetServer() string {
	return c.server
}

func (c eSignServicesPersistenceConfig) GetPingTimeout() time.Duration {
	return time.Second
}

func (c eSignServicesPersistenceConfig) GetOtelIdentifier() string {
	return ""
}

func setupESignServicesModule(adm *coreadmin.Admin) (*servicesmodule.Module, func(), error) {
	if adm == nil {
		return nil, nil, fmt.Errorf("esign services module: admin is required")
	}
	runtimeCfg := appcfg.Active()
	if !runtimeCfg.Services.ModuleEnabled {
		return nil, nil, nil
	}

	dsn := stores.ResolveSQLiteDSN()
	ensureSQLiteDSNDir(dsn)

	sqlDB, err := sql.Open(sqliteshim.ShimName, dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("esign services module: open sqlite: %w", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	if err := sqlDB.Ping(); err != nil {
		_ = sqlDB.Close()
		return nil, nil, fmt.Errorf("esign services module: ping sqlite: %w", err)
	}
	if err := stores.ConfigureSQLiteConnection(context.Background(), sqlDB); err != nil {
		_ = sqlDB.Close()
		return nil, nil, fmt.Errorf("esign services module: configure sqlite: %w", err)
	}

	client, err := persistence.New(
		eSignServicesPersistenceConfig{driver: sqliteshim.ShimName, server: dsn},
		sqlDB,
		sqlitedialect.New(),
	)
	if err != nil {
		_ = sqlDB.Close()
		return nil, nil, fmt.Errorf("esign services module: persistence client: %w", err)
	}

	cfg := servicesmodule.DefaultConfig()
	cfg.Enabled = true
	cfg.PersistenceClient = client
	cfg.EncryptionKey = strings.TrimSpace(runtimeCfg.Services.EncryptionKey)
	if cfg.EncryptionKey == "" {
		cfg.EncryptionKey = defaultESignServicesEncryptionKey
	}
	cfg.Service.ServiceName = "go-admin-esign"

	opts := []servicesmodule.Option{}
	if runtimeCfg.Features.ESignGoogle {
		provider, providerErr := buildGoogleDriveProviderFromConfig(runtimeCfg)
		if providerErr != nil {
			_ = sqlDB.Close()
			return nil, nil, providerErr
		}
		opts = append(opts, servicesmodule.WithCallbackURLConfig(resolveESignServicesCallbackConfig(runtimeCfg)))
		opts = append(opts, servicesmodule.WithProvider(provider))
	}

	module, err := servicesmodule.Setup(adm, cfg, opts...)
	if err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}
	if err := client.Migrate(context.Background()); err != nil {
		_ = sqlDB.Close()
		return nil, nil, fmt.Errorf("esign services module: migrate services schema: %w", err)
	}
	if err := ensureESignServicesSchema(context.Background(), sqlDB); err != nil {
		_ = sqlDB.Close()
		return nil, nil, err
	}

	cleanup := func() {
		_ = sqlDB.Close()
	}
	return module, cleanup, nil
}

func ensureESignServicesSchema(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return fmt.Errorf("esign services module: sqlite db is required")
	}
	requiredTables := []string{
		"service_connections",
		"service_credentials",
		"service_grant_events",
		"service_grant_snapshots",
	}
	for _, table := range requiredTables {
		var count int
		if err := db.QueryRowContext(
			ctx,
			`SELECT COUNT(1) FROM sqlite_master WHERE type='table' AND name = ?`,
			table,
		).Scan(&count); err != nil {
			return fmt.Errorf("esign services module: check services schema table %q: %w", table, err)
		}
		if count <= 0 {
			return fmt.Errorf("esign services module: missing required table %q after migration", table)
		}
	}
	return nil
}

func buildGoogleDriveProviderFromConfig(runtimeCfg appcfg.Config) (servicesmodule.Provider, error) {
	clientID := strings.TrimSpace(runtimeCfg.Google.ClientID)
	clientSecret := strings.TrimSpace(runtimeCfg.Google.ClientSecret)
	if clientID == "" {
		return nil, fmt.Errorf("esign services module: APP_GOOGLE__CLIENT_ID is required when google feature is enabled")
	}
	if clientSecret == "" {
		return nil, fmt.Errorf("esign services module: APP_GOOGLE__CLIENT_SECRET is required when google feature is enabled")
	}
	cfg := gdrive.DefaultConfig()
	cfg.ClientID = clientID
	cfg.ClientSecret = clientSecret
	cfg.DefaultScopes = append([]string(nil), services.DefaultGoogleOAuthScopes...)
	cfg.SupportedScopeTypes = []string{"user"}

	provider, err := goservices.DriveProvider(cfg)
	if err != nil {
		return nil, fmt.Errorf("esign services module: drive provider: %w", err)
	}
	return provider, nil
}

func resolveESignServicesCallbackConfig(runtimeCfg appcfg.Config) servicesmodule.CallbackURLConfig {
	config := servicesmodule.CallbackURLConfig{
		Strict: true,
	}
	publicBaseURL := strings.TrimSpace(runtimeCfg.Services.CallbackPublicBaseURL)
	if publicBaseURL == "" {
		publicBaseURL = strings.TrimSpace(runtimeCfg.Public.BaseURL)
	}
	if publicBaseURL != "" {
		config.PublicBaseURL = publicBaseURL
	}
	if googleRedirectURI := strings.TrimSpace(runtimeCfg.Google.OAuthRedirectURI); googleRedirectURI != "" {
		config.ProviderURLOverrides = map[string]string{
			services.GoogleServicesProviderID: googleRedirectURI,
		}
	}
	return config
}
