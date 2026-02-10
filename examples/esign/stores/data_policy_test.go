package stores

import (
	"testing"
	"time"
)

func TestRetentionPolicyLifecycleControls(t *testing.T) {
	policy := DefaultRetentionPolicy()
	if err := policy.Validate(); err != nil {
		t.Fatalf("Validate: %v", err)
	}

	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	if !policy.ShouldPurgeArtifact(now.Add(-policy.ArtifactTTL-time.Hour), now) {
		t.Fatal("expected artifact beyond ttl to be purged")
	}
	if policy.ShouldPurgeArtifact(now.Add(-time.Hour), now) {
		t.Fatal("expected recent artifact to be retained")
	}
	if !policy.ShouldPurgeLog(now.Add(-policy.LogTTL-time.Hour), now) {
		t.Fatal("expected log beyond ttl to be purged")
	}
	if !policy.ShouldPurgePIIMetadata(now.Add(-policy.PIIMetadataTTL-time.Hour), now) {
		t.Fatal("expected pii metadata beyond ttl to be purged")
	}
}

func TestMinimizeAuditMetadata(t *testing.T) {
	input := map[string]any{
		"ip_address":        "192.168.1.57",
		"user_agent":        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
		"email":             "person@example.com",
		"name":              "Signer Name",
		"signature_payload": "data:image/png;base64,AAAA",
		"consent_at":        "2026-02-01T12:00:00Z",
		"actor_id":          "user-1",
	}

	minimized := MinimizeAuditMetadata(input)

	if minimized["ip_address"] != "192.168.1.0/24" {
		t.Fatalf("expected masked ipv4, got %v", minimized["ip_address"])
	}
	if _, ok := minimized["email"]; ok {
		t.Fatalf("expected email removed, got %v", minimized["email"])
	}
	if _, ok := minimized["signature_payload"]; ok {
		t.Fatalf("expected signature payload removed, got %v", minimized["signature_payload"])
	}
	if minimized["consent_at"] == nil {
		t.Fatal("expected consent_at retained")
	}
	if minimized["actor_id"] != "user-1" {
		t.Fatalf("expected actor_id retained, got %v", minimized["actor_id"])
	}
}
