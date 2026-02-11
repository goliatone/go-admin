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

func TestBuildSignLinkEscapesToken(t *testing.T) {
	t.Setenv(EnvPublicBaseURL, "https://esign.example.com")
	got := buildSignLink("token/with/slash")
	if !strings.Contains(got, "token%2Fwith%2Fslash") {
		t.Fatalf("expected escaped token in sign link, got %q", got)
	}
}
