package cmsadapter

import (
	"testing"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
)

func TestContentTypeChannelHelpersPreserveLegacyEnvironmentMirror(t *testing.T) {
	ct := cmsboot.CMSContentType{}
	setLegacyStringField(&ct, "Environment", "legacy-preview")
	if got := ContentTypeChannel(ct); got != "legacy-preview" {
		t.Fatalf("expected legacy-preview from deprecated environment, got %q", got)
	}

	SetContentTypeChannel(&ct, "preview")
	if ct.Channel != "preview" || legacyStringField(ct, "Environment") != "preview" {
		t.Fatalf("expected channel/environment to stay synchronized, got %+v", ct)
	}
	if got := ContentTypeChannel(ct); got != "preview" {
		t.Fatalf("expected preview after setter, got %q", got)
	}
}

func TestResolveContentTypeChannelPrefersRecordChannel(t *testing.T) {
	ct := cmsboot.CMSContentType{Channel: "preview"}
	if got := ResolveContentTypeChannel(ct, "staging"); got != "preview" {
		t.Fatalf("expected preview record channel, got %q", got)
	}

	ct = cmsboot.CMSContentType{}
	if got := ResolveContentTypeChannel(ct, "staging"); got != "staging" {
		t.Fatalf("expected fallback staging, got %q", got)
	}
}
