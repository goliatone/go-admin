package stores

import (
	"net"
	"strings"
	"time"
)

// RetentionPolicy configures artifact, log, and PII metadata lifecycle controls.
type RetentionPolicy struct {
	ArtifactTTL    time.Duration
	LogTTL         time.Duration
	PIIMetadataTTL time.Duration
}

// RetentionLifecycleCheck summarizes a periodic retention sweep evaluation.
type RetentionLifecycleCheck struct {
	CheckedAt        time.Time
	ArtifactDueCount int
	LogDueCount      int
	PIIDueCount      int
}

func DefaultRetentionPolicy() RetentionPolicy {
	return RetentionPolicy{
		ArtifactTTL:    365 * 24 * time.Hour,
		LogTTL:         180 * 24 * time.Hour,
		PIIMetadataTTL: 90 * 24 * time.Hour,
	}
}

func (p RetentionPolicy) Validate() error {
	if p.ArtifactTTL <= 0 {
		return invalidRecordError("retention_policy", "artifact_ttl", "must be > 0")
	}
	if p.LogTTL <= 0 {
		return invalidRecordError("retention_policy", "log_ttl", "must be > 0")
	}
	if p.PIIMetadataTTL <= 0 {
		return invalidRecordError("retention_policy", "pii_metadata_ttl", "must be > 0")
	}
	return nil
}

func (p RetentionPolicy) ShouldPurgeArtifact(createdAt, now time.Time) bool {
	if createdAt.IsZero() {
		return false
	}
	return now.UTC().After(createdAt.UTC().Add(p.ArtifactTTL))
}

func (p RetentionPolicy) ShouldPurgeLog(createdAt, now time.Time) bool {
	if createdAt.IsZero() {
		return false
	}
	return now.UTC().After(createdAt.UTC().Add(p.LogTTL))
}

func (p RetentionPolicy) ShouldPurgePIIMetadata(createdAt, now time.Time) bool {
	if createdAt.IsZero() {
		return false
	}
	return now.UTC().After(createdAt.UTC().Add(p.PIIMetadataTTL))
}

// EvaluateLifecycleCheck counts records that should be purged for a periodic sweep.
func (p RetentionPolicy) EvaluateLifecycleCheck(now time.Time, artifactCreatedAt, logCreatedAt, piiCreatedAt []time.Time) RetentionLifecycleCheck {
	check := RetentionLifecycleCheck{
		CheckedAt: now.UTC(),
	}
	for _, createdAt := range artifactCreatedAt {
		if p.ShouldPurgeArtifact(createdAt, now) {
			check.ArtifactDueCount++
		}
	}
	for _, createdAt := range logCreatedAt {
		if p.ShouldPurgeLog(createdAt, now) {
			check.LogDueCount++
		}
	}
	for _, createdAt := range piiCreatedAt {
		if p.ShouldPurgePIIMetadata(createdAt, now) {
			check.PIIDueCount++
		}
	}
	return check
}

// MinimizeAuditMetadata strips non-essential PII fields and truncates retained identity metadata.
func MinimizeAuditMetadata(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := map[string]any{}
	if value := strings.TrimSpace(toString(input["ip_address"])); value != "" {
		out["ip_address"] = minimizeIP(value)
	}
	if value := strings.TrimSpace(toString(input["user_agent"])); value != "" {
		if len(value) > 128 {
			value = value[:128]
		}
		out["user_agent"] = value
	}
	for _, key := range []string{"consent_at", "signed_at", "actor_type", "actor_id"} {
		if value, ok := input[key]; ok {
			out[key] = value
		}
	}
	return out
}

func minimizeIP(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parsed := net.ParseIP(raw)
	if parsed == nil {
		return ""
	}
	if ipv4 := parsed.To4(); ipv4 != nil {
		return ipv4.Mask(net.CIDRMask(24, 32)).String() + "/24"
	}
	masked := parsed.Mask(net.CIDRMask(64, 128))
	if masked == nil {
		return ""
	}
	return masked.String() + "/64"
}

func toString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return ""
	}
}
