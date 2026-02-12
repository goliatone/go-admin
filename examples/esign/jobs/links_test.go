package jobs

import (
	"strings"
	"testing"
)

func TestBuildSignLinkUsesPublicBaseURL(t *testing.T) {
	t.Setenv(EnvPublicBaseURL, "https://esign.example.com/")
	got := buildSignLink("token-123")
	want := "https://esign.example.com/sign/token-123"
	if got != want {
		t.Fatalf("expected sign link %q, got %q", want, got)
	}
}

func TestBuildAssetContractLinkUsesPublicBaseURL(t *testing.T) {
	t.Setenv(EnvPublicBaseURL, "https://esign.example.com/")
	got := buildAssetContractLink("token-123")
	want := "https://esign.example.com/api/v1/esign/signing/assets/token-123"
	if got != want {
		t.Fatalf("expected asset contract link %q, got %q", want, got)
	}
}

func TestBuildCompletionLinkUsesPublicBaseURL(t *testing.T) {
	t.Setenv(EnvPublicBaseURL, "https://esign.example.com/")
	got := buildCompletionLink("token-123")
	want := "https://esign.example.com/sign/token-123/complete"
	if got != want {
		t.Fatalf("expected completion link %q, got %q", want, got)
	}
}

func TestBuildSignLinkEscapesToken(t *testing.T) {
	t.Setenv(EnvPublicBaseURL, "https://esign.example.com")
	got := buildSignLink("token/with/slash")
	if !strings.Contains(got, "token%2Fwith%2Fslash") {
		t.Fatalf("expected escaped token in sign link, got %q", got)
	}
}

func TestBuildSignLinkUsesConfiguredBaseAcrossRuntimeProfiles(t *testing.T) {
	profiles := []string{"development", "staging", "production"}
	for _, profile := range profiles {
		t.Setenv("ESIGN_RUNTIME_PROFILE", profile)
		t.Setenv(EnvPublicBaseURL, "https://links.example.com")
		got := buildSignLink("token-profile")
		if got != "https://links.example.com/sign/token-profile" {
			t.Fatalf("profile %q: expected profile-aware sign link, got %q", profile, got)
		}
	}
}
