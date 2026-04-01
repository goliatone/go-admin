package translationruntime

import "testing"

func TestChannelReturnsFirstTrimmedNonEmptyValue(t *testing.T) {
	if got := Channel("", " preview ", "fallback"); got != "preview" {
		t.Fatalf("expected preview, got %q", got)
	}
}

func TestChannelFromResolvedInputsPrefersExplicitInputsBeforeAdminFallback(t *testing.T) {
	if got := ChannelFromResolvedInputs("body", "query", "admin", "explicit"); got != "explicit" {
		t.Fatalf("expected explicit, got %q", got)
	}
	if got := ChannelFromResolvedInputs("", "query", "admin"); got != "query" {
		t.Fatalf("expected query, got %q", got)
	}
	if got := ChannelFromResolvedInputs("", "", "admin"); got != "admin" {
		t.Fatalf("expected admin, got %q", got)
	}
}

func TestMergeChannelContractClonesOrSeedsPayload(t *testing.T) {
	payload := map[string]any{"ok": true}
	got := MergeChannelContract(payload, " preview ")
	if got["ok"] != true || got["channel"] != "preview" {
		t.Fatalf("unexpected merged payload: %#v", got)
	}
	if _, ok := MergeChannelContract(nil, "prod")["channel"]; !ok {
		t.Fatalf("expected seeded payload with channel")
	}
}

func TestMissingCanonicalFamilyIDUsesTrimmedCheck(t *testing.T) {
	if !MissingCanonicalFamilyID("   ") {
		t.Fatalf("expected blank family id to be missing")
	}
	if MissingCanonicalFamilyID("fam-1") {
		t.Fatalf("expected family id to be present")
	}
}
