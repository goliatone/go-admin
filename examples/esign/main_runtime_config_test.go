package main

import "testing"

func TestValidateRuntimeProviderConfigurationRejectsDeterministicEmailInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "deterministic")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected production deterministic email configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsDeterministicGoogleProviderInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "deterministic")

	if err := validateRuntimeProviderConfiguration(); err == nil {
		t.Fatal("expected production deterministic google provider configuration to fail")
	}
}

func TestValidateRuntimeProviderConfigurationRejectsGoogleFeatureWithMissingRealProviderConfigInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
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
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "false")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected production smtp configuration to pass, got %v", err)
	}
}

func TestValidateRuntimeProviderConfigurationAllowsGoogleRealProviderInProduction(t *testing.T) {
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("ESIGN_EMAIL_TRANSPORT", "smtp")
	t.Setenv("ESIGN_GOOGLE_FEATURE_ENABLED", "true")
	t.Setenv("ESIGN_GOOGLE_PROVIDER_MODE", "real")
	t.Setenv("ESIGN_GOOGLE_CLIENT_ID", "client-id")
	t.Setenv("ESIGN_GOOGLE_CLIENT_SECRET", "client-secret")
	t.Setenv("ESIGN_GOOGLE_TOKEN_ENDPOINT", "https://oauth2.googleapis.com/token")
	t.Setenv("ESIGN_GOOGLE_REVOKE_ENDPOINT", "https://oauth2.googleapis.com/revoke")
	t.Setenv("ESIGN_GOOGLE_DRIVE_BASE_URL", "https://www.googleapis.com/drive/v3")
	t.Setenv("ESIGN_GOOGLE_USERINFO_ENDPOINT", "https://www.googleapis.com/oauth2/v2/userinfo")
	t.Setenv("ESIGN_GOOGLE_HEALTH_ENDPOINT", "https://www.googleapis.com/generate_204")

	if err := validateRuntimeProviderConfiguration(); err != nil {
		t.Fatalf("expected production smtp + real google configuration to pass, got %v", err)
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
