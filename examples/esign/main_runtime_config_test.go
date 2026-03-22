package main

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-uploader"
)

func TestValidateRuntimeProviderConfigurationRejectsDeterministicEmailInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "deterministic"

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected production deterministic email configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsDeterministicGoogleProviderInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Features.ESignGoogle = true
	cfg.Email.Transport = "smtp"
	cfg.Google.ClientID = ""
	cfg.Google.ClientSecret = ""

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected production deterministic google provider configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsGoogleFeatureWithMissingRealProviderConfigInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Features.ESignGoogle = true
	cfg.Email.Transport = "smtp"
	cfg.Google.ClientID = ""
	cfg.Google.ClientSecret = ""

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected production google provider configuration validation to fail")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsSMTPInProductionWithoutGoogle(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "smtp"
	cfg.Features.ESignGoogle = false

	if err := validateRuntimeProviderConfiguration(cfg); err != nil {
		t.Fatalf("expected production smtp configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationAllowsGoogleRealProviderInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "smtp"
	cfg.Services.ModuleEnabled = true
	cfg.Services.EncryptionKey = "production-services-encryption-key"
	cfg.Features.ESignGoogle = true
	cfg.Google.ClientID = "client-id"
	cfg.Google.ClientSecret = "client-secret"
	cfg.Google.OAuthRedirectURI = "https://admin.esign.example.com/admin/esign/integrations/google/callback"

	if err := validateRuntimeProviderConfiguration(cfg); err != nil {
		t.Fatalf("expected production smtp + real google configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingGoogleOAuthRedirectURIInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "smtp"
	cfg.Services.ModuleEnabled = true
	cfg.Services.EncryptionKey = "production-services-encryption-key"
	cfg.Features.ESignGoogle = true
	cfg.Google.ClientID = "client-id"
	cfg.Google.ClientSecret = "client-secret"
	cfg.Google.OAuthRedirectURI = ""

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected missing google oauth redirect URI to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsDeterministicOutsideProduction(t *testing.T) {
	cfg := defaultRuntimeConfig()
	cfg.Runtime.Profile = "development"
	cfg.Email.Transport = "deterministic"
	cfg.Features.ESignGoogle = true

	if err := validateRuntimeProviderConfiguration(cfg); err != nil {
		t.Fatalf("expected non-production deterministic configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingSignerUploadSigningKeyInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "smtp"
	cfg.Features.ESignGoogle = false
	cfg.Signer.UploadSigningKey = ""

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected missing signer upload signing key to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsSignerUploadTTLPolicyOutOfRangeInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Email.Transport = "smtp"
	cfg.Features.ESignGoogle = false
	cfg.Signer.UploadSigningKey = "upload-signing-key"
	cfg.Signer.UploadTTLSeconds = 30

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected signer upload ttl policy out-of-range to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsAuthSeedFileInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Auth.SeedFile = "dev_seed.json"

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected production auth seed file usage to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsDemoAuthSigningKeyInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Auth.SigningKey = defaultESignAuthSigningKey

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected demo auth signing key in production to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingPublicBaseURLInStaging(t *testing.T) {
	cfg := defaultRuntimeConfig()
	cfg.Runtime.Profile = "staging"
	cfg.Public.BaseURL = ""

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected missing public base URL to fail in staging")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsLocalhostPublicBaseURLInProduction(t *testing.T) {
	cfg := productionRuntimeConfig()
	cfg.Public.BaseURL = "http://localhost:8082"
	cfg.Email.Transport = "smtp"
	cfg.Signer.UploadSigningKey = "upload-signing-key"
	cfg.Features.ESignGoogle = false

	if err := validateRuntimeProviderConfiguration(cfg); err == nil {
		t.Fatal("expected localhost public base URL to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsPublicBaseURLInStaging(t *testing.T) {
	cfg := defaultRuntimeConfig()
	cfg.Runtime.Profile = "staging"
	cfg.Public.BaseURL = "https://staging.esign.example.com"

	if err := validateRuntimeProviderConfiguration(cfg); err != nil {
		t.Fatalf("expected staging public base URL validation to pass, got %v", err)
	}
}

func TestResolveESignStartupPolicyDefaultsToEnforce(t *testing.T) {
	if got := string(resolveESignStartupPolicy("")); got != "enforce" {
		t.Fatalf("expected enforce startup policy by default, got %q", got)
	}
}

func TestResolveESignStartupPolicySupportsWarnAliases(t *testing.T) {
	if got := string(resolveESignStartupPolicy("warn")); got != "warn" {
		t.Fatalf("expected warn startup policy for warn alias, got %q", got)
	}
	if got := string(resolveESignStartupPolicy("warning")); got != "warn" {
		t.Fatalf("expected warn startup policy for warning alias, got %q", got)
	}
}

func TestNewESignStorageBundleDefaultsToFSBackend(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Storage.Backend = ""
	cfg.Storage.Fs.BasePath = t.TempDir()

	bundle, err := newESignStorageBundle(nil, cfg)
	if err != nil {
		t.Fatalf("newESignStorageBundle: %v", err)
	}
	if bundle == nil || bundle.Provider == nil || bundle.Manager == nil {
		t.Fatal("expected configured storage bundle")
	}
	if _, ok := bundle.Provider.(*uploader.FSProvider); !ok {
		t.Fatalf("expected fs provider, got %T", bundle.Provider)
	}
}

func TestNewESignStorageBundleBuildsS3ProviderConfig(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Storage.Backend = "s3"
	cfg.Storage.EncryptionAlgorithm = "aws:kms"
	cfg.Storage.KmsKeyID = "kms-key-1"
	cfg.Storage.S3.Bucket = "esign-test"
	cfg.Storage.S3.Region = "us-east-1"
	cfg.Storage.S3.EndpointURL = "http://localhost:4566"
	cfg.Storage.S3.AccessKeyID = "test"
	cfg.Storage.S3.SecretAccessKey = "test"
	cfg.Storage.S3.UsePathStyle = true

	bundle, err := newESignStorageBundle(nil, cfg)
	if err != nil {
		t.Fatalf("newESignStorageBundle: %v", err)
	}
	provider, ok := bundle.Provider.(*uploader.AWSProvider)
	if !ok {
		t.Fatalf("expected aws provider, got %T", bundle.Provider)
	}
	if provider == nil {
		t.Fatal("expected aws provider instance")
	}
}

func defaultRuntimeConfig() appcfg.Config {
	return appcfg.Defaults()
}

func productionRuntimeConfig() appcfg.Config {
	cfg := defaultRuntimeConfig()
	cfg.Runtime.Profile = "production"
	cfg.Public.BaseURL = "https://esign.example.com"
	cfg.Auth.SeedFile = ""
	cfg.Auth.AdminID = "prod-admin-id"
	cfg.Auth.AdminEmail = "admin@esign.example.com"
	cfg.Auth.AdminRole = "admin"
	cfg.Auth.AdminPassword = "prod-admin-password"
	cfg.Auth.SigningKey = "prod-auth-signing-key"
	cfg.Auth.ContextKey = "esign_admin_prod"
	cfg.Email.Transport = "smtp"
	cfg.Signer.UploadSigningKey = "upload-signing-key"
	cfg.Features.ESignGoogle = false
	return cfg
}

func TestNewESignRuntimeStoreCreatesCanonicalRuntimeAdapterFromSQLiteBootstrapDSN(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.SQLite.DSN = "file:" + filepath.Join(t.TempDir(), "runtime-store.db") + "?_busy_timeout=5000&_foreign_keys=on"
	bootstrap, err := esignpersistence.Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap sqlite runtime store test: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	store, cleanup, err := newESignRuntimeStore(bootstrap)
	if err != nil {
		t.Fatalf("newESignRuntimeStore sqlite: %v", err)
	}
	if store == nil {
		t.Fatalf("expected sqlite-backed runtime store adapter")
	}
	if cleanup == nil {
		t.Fatalf("expected sqlite-backed runtime store cleanup function")
	}
	if err := cleanup(); err != nil {
		t.Fatalf("cleanup sqlite-backed runtime store: %v", err)
	}
}

func TestNewESignRuntimeStoreSupportsPostgresWhenBootstrapHandlesPresent(t *testing.T) {
	dsn := requirePostgresRuntimeTestDSN(t)
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectPostgres
	cfg.Persistence.Postgres.DSN = dsn
	cfg.Persistence.SQLite.DSN = ""
	bootstrap, err := esignpersistence.Bootstrap(context.Background(), cfg)
	if err != nil {
		t.Fatalf("Bootstrap postgres runtime store test: %v", err)
	}
	defer func() { _ = bootstrap.Close() }()

	store, cleanup, err := newESignRuntimeStore(bootstrap)
	if err != nil {
		t.Fatalf("newESignRuntimeStore postgres: %v", err)
	}
	if store == nil {
		t.Fatalf("expected postgres runtime store instance")
	}
	if cleanup != nil {
		if cerr := cleanup(); cerr != nil {
			t.Fatalf("postgres runtime store cleanup: %v", cerr)
		}
	}
}

func TestSetupESignServicesModuleRequiresSharedBootstrapWhenEnabled(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Services.ModuleEnabled = true
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	_, err := setupESignServicesModule(&coreadmin.Admin{}, nil)
	if err == nil {
		t.Fatalf("expected shared bootstrap requirement error")
	}
	if !strings.Contains(err.Error(), "shared bootstrap persistence handles are required") {
		t.Fatalf("expected shared bootstrap requirement message, got %v", err)
	}
}

func TestSetupESignServicesModuleNoOpWhenDisabled(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Services.ModuleEnabled = false
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	module, err := setupESignServicesModule(&coreadmin.Admin{}, nil)
	if err != nil {
		t.Fatalf("setupESignServicesModule disabled: %v", err)
	}
	if module != nil {
		t.Fatalf("expected nil services module when feature disabled")
	}
}
