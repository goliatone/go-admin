package jobs

import (
	"strings"
	"testing"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
)

func TestBuildSignLinkUsesPublicBaseURL(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Public.BaseURL = "https://esign.example.com/"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	got := buildSignLink("token-123")
	want := "https://esign.example.com/sign/token-123"
	if got != want {
		t.Fatalf("expected sign link %q, got %q", want, got)
	}
}

func TestBuildAssetContractLinkUsesPublicBaseURL(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Public.BaseURL = "https://esign.example.com/"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	got := buildAssetContractLink("token-123")
	want := "https://esign.example.com/api/v1/esign/signing/assets/token-123"
	if got != want {
		t.Fatalf("expected asset contract link %q, got %q", want, got)
	}
}

func TestBuildCompletionLinkUsesPublicBaseURL(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Public.BaseURL = "https://esign.example.com/"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	got := buildCompletionLink("token-123")
	want := "https://esign.example.com/sign/token-123/complete"
	if got != want {
		t.Fatalf("expected completion link %q, got %q", want, got)
	}
}

func TestBuildSignLinkEscapesToken(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Public.BaseURL = "https://esign.example.com"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	got := buildSignLink("token/with/slash")
	if !strings.Contains(got, "token%2Fwith%2Fslash") {
		t.Fatalf("expected escaped token in sign link, got %q", got)
	}
}

func TestBuildSignLinkUsesConfiguredBaseAcrossRuntimeProfiles(t *testing.T) {
	profiles := []string{"development", "staging", "production"}
	for _, profile := range profiles {
		cfg := appcfg.Defaults()
		cfg.Runtime.Profile = profile
		cfg.Public.BaseURL = "https://links.example.com"
		appcfg.SetActive(cfg)
		got := buildSignLink("token-profile")
		if got != "https://links.example.com/sign/token-profile" {
			t.Fatalf("profile %q: expected profile-aware sign link, got %q", profile, got)
		}
	}
	t.Cleanup(appcfg.ResetActive)
}
