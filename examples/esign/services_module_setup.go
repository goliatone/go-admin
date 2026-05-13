package main

import (
	"context"
	"fmt"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/services"
	servicesmodule "github.com/goliatone/go-admin/modules/services"
	goservices "github.com/goliatone/go-services"
	gdrive "github.com/goliatone/go-services/providers/google/drive"
)

const defaultESignServicesEncryptionKey = "go-admin-esign-services-app-key"

func setupESignServicesModule(adm *coreadmin.Admin, bootstrap *esignpersistence.BootstrapResult) (*servicesmodule.Module, error) {
	if adm == nil {
		return nil, fmt.Errorf("esign services module: admin is required")
	}
	runtimeCfg := appcfg.Active()
	if !runtimeCfg.Services.ModuleEnabled {
		return nil, nil
	}
	if bootstrap == nil || bootstrap.Client == nil || bootstrap.SQLDB == nil {
		return nil, fmt.Errorf("esign services module: shared bootstrap persistence handles are required")
	}

	cfg := servicesmodule.DefaultConfig()
	cfg.Enabled = true
	cfg.PersistenceClient = bootstrap.Client
	// Phase 2+ bootstrap is the single migration owner; module setup must not register its own sources.
	registerMigrations := false
	cfg.RegisterMigrations = &registerMigrations
	cfg.EncryptionKey = strings.TrimSpace(runtimeCfg.Services.EncryptionKey)
	if cfg.EncryptionKey == "" {
		cfg.EncryptionKey = defaultESignServicesEncryptionKey
	}
	cfg.Service.ServiceName = "go-admin-esign"

	opts := []servicesmodule.Option{}
	if runtimeCfg.Features.ESignGoogle {
		provider, providerErr := buildGoogleDriveProviderFromConfig(runtimeCfg)
		if providerErr != nil {
			return nil, providerErr
		}
		opts = append(opts, servicesmodule.WithCallbackURLConfig(resolveESignServicesCallbackConfig(runtimeCfg)))
		opts = append(opts, servicesmodule.WithProvider(provider))
	}

	module, err := servicesmodule.Setup(adm, cfg, opts...)
	if err != nil {
		return nil, err
	}
	if err := ensureESignServicesSchema(context.Background(), bootstrap); err != nil {
		return nil, err
	}
	return module, nil
}

func ensureESignServicesSchema(ctx context.Context, bootstrap *esignpersistence.BootstrapResult) error {
	if bootstrap == nil || bootstrap.BunDB == nil {
		return fmt.Errorf("esign services module: db handle is required")
	}
	if err := servicesmodule.VerifyServicesOAuthStorageSchema(ctx, bootstrap.BunDB); err != nil {
		return fmt.Errorf("esign services module: %w", err)
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
