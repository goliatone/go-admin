package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
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
	if !envBool("ESIGN_SERVICES_MODULE_ENABLED", true) {
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
	cfg.EncryptionKey = firstNonEmptyEnv("ESIGN_SERVICES_ENCRYPTION_KEY", defaultESignServicesEncryptionKey)
	cfg.Service.ServiceName = "go-admin-esign"

	opts := []servicesmodule.Option{}
	if envBool("ESIGN_GOOGLE_FEATURE_ENABLED", false) {
		provider, providerErr := buildGoogleDriveProviderFromEnv()
		if providerErr != nil {
			_ = sqlDB.Close()
			return nil, nil, providerErr
		}
		opts = append(opts, servicesmodule.WithCallbackURLConfig(resolveESignServicesCallbackConfig()))
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

func buildGoogleDriveProviderFromEnv() (servicesmodule.Provider, error) {
	clientID := strings.TrimSpace(os.Getenv(services.EnvGoogleClientID))
	clientSecret := strings.TrimSpace(os.Getenv(services.EnvGoogleClientSecret))
	if clientID == "" {
		return nil, fmt.Errorf("esign services module: %s is required when google feature is enabled", services.EnvGoogleClientID)
	}
	if clientSecret == "" {
		return nil, fmt.Errorf("esign services module: %s is required when google feature is enabled", services.EnvGoogleClientSecret)
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

func resolveESignServicesCallbackConfig() servicesmodule.CallbackURLConfig {
	config := servicesmodule.CallbackURLConfig{
		Strict: true,
	}
	if publicBaseURL := strings.TrimSpace(firstNonEmptyEnv("ESIGN_SERVICES_CALLBACK_PUBLIC_BASE_URL", strings.TrimSpace(os.Getenv("ESIGN_PUBLIC_BASE_URL")))); publicBaseURL != "" {
		config.PublicBaseURL = publicBaseURL
	}
	if googleRedirectURI := strings.TrimSpace(os.Getenv(services.EnvGoogleOAuthRedirectURI)); googleRedirectURI != "" {
		config.ProviderURLOverrides = map[string]string{
			services.GoogleServicesProviderID: googleRedirectURI,
		}
	}
	return config
}
