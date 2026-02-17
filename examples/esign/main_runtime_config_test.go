package main

import "testing"

func TestValidateRuntimeProviderConfigurationRejectsDeterministicEmailInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "deterministic")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected production deterministic email configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsDeterministicGoogleProviderInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "deterministic")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected production deterministic google provider configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsGoogleFeatureWithMissingRealProviderConfigInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "real")
	t.Setenv("ESIGN_GOOGLE_CLIENT_ID", "")
	t.Setenv("ESIGN_GOOGLE_CLIENT_SECRET", "")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected production google provider configuration validation to fail")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsSMTPInProductionWithoutGoogle(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected production smtp configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationAllowsGoogleRealProviderInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_SERVICES_MODULE_ENABLED", "true")
	t.Setenv("ESIGN_SERVICES_ENCRYPTION_KEY", "production-services-encryption-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "real")
	t.Setenv("ESIGN_GOOGLE_CLIENT_ID", "client-id")
	t.Setenv("ESIGN_GOOGLE_CLIENT_SECRET", "client-secret")
	t.Setenv("ESIGN_GOOGLE_TOKEN_ENDPOINT", "https://oauth2.googleapis.com/token")
	t.Setenv("ESIGN_GOOGLE_REVOKE_ENDPOINT", "https://oauth2.googleapis.com/revoke")
	t.Setenv("ESIGN_GOOGLE_DRIVE_BASE_URL", "https://www.googleapis.com/drive/v3")
	t.Setenv("ESIGN_GOOGLE_USERINFO_ENDPOINT", "https://www.googleapis.com/oauth2/v2/userinfo")
	t.Setenv("ESIGN_GOOGLE_HEALTH_ENDPOINT", "https://www.googleapis.com/generate_204")
	t.Setenv("ESIGN_GOOGLE_OAUTH_REDIRECT_URI", "https://admin.esign.example.com/admin/esign/integrations/google/callback")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected production smtp + real google configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingGoogleOAuthRedirectURIInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_SERVICES_MODULE_ENABLED", "true")
	t.Setenv("ESIGN_SERVICES_ENCRYPTION_KEY", "production-services-encryption-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "real")
	t.Setenv("ESIGN_GOOGLE_CLIENT_ID", "client-id")
	t.Setenv("ESIGN_GOOGLE_CLIENT_SECRET", "client-secret")
	t.Setenv("ESIGN_GOOGLE_OAUTH_REDIRECT_URI", "")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected missing google oauth redirect URI to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsDeterministicOutsideProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "development")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "deterministic")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected non-production deterministic configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingSignerUploadSigningKeyInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected missing signer upload signing key to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsSignerUploadTTLPolicyOutOfRangeInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://esign.example.com")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_SIGNER_UPLOAD_TTL_SECONDS", "30")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected signer upload ttl policy out-of-range to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsMissingPublicBaseURLInStaging(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "staging")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected missing public base URL to fail in staging")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsLocalhostPublicBaseURLInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "http://localhost:8082")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY", "upload-signing-key")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected localhost public base URL to fail in production")
	}
}

func TestValidateRuntimeProviderConfigurationAllowsPublicBaseURLInStaging(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "staging")
	t.Setenv("ESIGN_PUBLIC_BASE_URL", "https://staging.esign.example.com")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected staging public base URL validation to pass, got %v", err)
	}
}

func TestResolveESignStartupPolicyDefaultsToEnforce(t *testing.T) {
	t.Setenv("ESIGN_STARTUP_POLICY", "")
	if got := string(resolveESignStartupPolicy()); got != "enforce" {
		t.Fatalf("expected enforce startup policy by default, got %q", got)
	}
}

func TestResolveESignStartupPolicySupportsWarnAliases(t *testing.T) {
	t.Setenv("ESIGN_STARTUP_POLICY", "warn")
	if got := string(resolveESignStartupPolicy()); got != "warn" {
		t.Fatalf("expected warn startup policy for warn alias, got %q", got)
	}
	t.Setenv("ESIGN_STARTUP_POLICY", "warning")
	if got := string(resolveESignStartupPolicy()); got != "warn" {
		t.Fatalf("expected warn startup policy for warning alias, got %q", got)
	}
}
