package main

import (
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
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

func defaultRuntimeConfig() appcfg.Config {
	return *appcfg.Defaults()
}

func productionRuntimeConfig() appcfg.Config {
	cfg := defaultRuntimeConfig()
	cfg.Runtime.Profile = "production"
	cfg.Public.BaseURL = "https://esign.example.com"
	cfg.Email.Transport = "smtp"
	cfg.Signer.UploadSigningKey = "upload-signing-key"
	cfg.Features.ESignGoogle = false
	return cfg
}
