package core

import "testing"

func TestVocabularyPayloadIncludesCanonicalContracts(t *testing.T) {
	payload := VocabularyPayload()
	if got := payload["schema_version"]; got != SchemaVersion {
		t.Fatalf("expected schema version %d, got %v", SchemaVersion, got)
	}
	statuses, _ := payload["statuses"].(map[string]any)
	if len(statuses) == 0 {
		t.Fatalf("expected statuses in payload")
	}
	if len(FamilyReadinessStates()) != 2 {
		t.Fatalf("expected 2 readiness states")
	}
	if len(AssignmentStatuses()) != 7 {
		t.Fatalf("expected 7 assignment states")
	}
	if len(ErrorCodes()) != 10 {
		t.Fatalf("expected 10 canonical error codes")
	}
}

func TestForbiddenIdentityFieldRejectsReservedTopLevelAndScopeKeys(t *testing.T) {
	cases := []struct {
		name    string
		payload map[string]any
		field   string
	}{
		{name: "actor", payload: map[string]any{"actor_id": "user-1"}, field: "actor_id"},
		{name: "tenant", payload: map[string]any{"tenant_id": "tenant-1"}, field: "tenant_id"},
		{name: "org", payload: map[string]any{"org_id": "org-1"}, field: "org_id"},
		{name: "scope tenant", payload: map[string]any{"scope": map[string]any{"tenant_id": "tenant-1"}}, field: "scope.tenant_id"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			field, ok := ForbiddenIdentityField(tc.payload)
			if !ok {
				t.Fatalf("expected forbidden field")
			}
			if field != tc.field {
				t.Fatalf("expected field %q, got %q", tc.field, field)
			}
		})
	}
	if field, ok := ForbiddenIdentityField(map[string]any{"locale": "fr"}); ok || field != "" {
		t.Fatalf("expected no forbidden field, got %q", field)
	}
}

func TestNormalizeLifecycleMode(t *testing.T) {
	if got := NormalizeLifecycleMode(" auto_archive "); got != string(AssignmentLifecycleAutoArchive) {
		t.Fatalf("expected auto_archive, got %q", got)
	}
	if got := NormalizeLifecycleMode("single_active_per_locale"); got != string(AssignmentLifecycleSingleActivePerLang) {
		t.Fatalf("expected single_active_per_locale, got %q", got)
	}
	if got := NormalizeLifecycleMode("unknown"); got != "" {
		t.Fatalf("expected empty mode for unknown value, got %q", got)
	}
}
