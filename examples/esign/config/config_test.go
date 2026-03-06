package config

import (
	"context"
	"testing"
)

func TestLoadAppliesAPPPrefixOverrides(t *testing.T) {
	t.Setenv("APP_ADMIN__TITLE", "E-Sign Test")
	t.Setenv("APP_FEATURES__ESIGN_GOOGLE", "true")
	t.Setenv("APP_RUNTIME__PROFILE", "staging")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__MAX_REQUESTS", "240")
	t.Setenv("APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__WINDOW_SECONDS", "30")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Admin.Title != "E-Sign Test" {
		t.Fatalf("expected APP_ADMIN__TITLE override, got %q", cfg.Admin.Title)
	}
	if !cfg.Features.ESignGoogle {
		t.Fatalf("expected APP_FEATURES__ESIGN_GOOGLE override=true")
	}
	if cfg.Runtime.Profile != "staging" {
		t.Fatalf("expected APP_RUNTIME__PROFILE override, got %q", cfg.Runtime.Profile)
	}
	if cfg.Network.RateLimit.SignerWrite.MaxRequests != 240 {
		t.Fatalf("expected APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__MAX_REQUESTS override, got %d", cfg.Network.RateLimit.SignerWrite.MaxRequests)
	}
	if cfg.Network.RateLimit.SignerWrite.WindowSeconds != 30 {
		t.Fatalf("expected APP_NETWORK__RATE_LIMIT__SIGNER_WRITE__WINDOW_SECONDS override, got %d", cfg.Network.RateLimit.SignerWrite.WindowSeconds)
	}
}

func TestLoadIgnoresLegacyEnvAliases(t *testing.T) {
	t.Setenv("APP_RUNTIME__PROFILE", "development")
	t.Setenv("APP_SERVER__ADDRESS", ":9090")
	t.Setenv("ESIGN_RUNTIME_PROFILE", "production")
	t.Setenv("PORT", "9090")

	cfg, _, err := Load(context.Background())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Runtime.Profile != "development" {
		t.Fatalf("expected APP_RUNTIME__PROFILE value, got %q", cfg.Runtime.Profile)
	}
	if cfg.Server.Address != ":9090" {
		t.Fatalf("expected APP_SERVER__ADDRESS override -> :9090, got %q", cfg.Server.Address)
	}
}
