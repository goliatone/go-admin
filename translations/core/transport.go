package core

import "strings"

const (
	IdentityActorIDKey  = "actor_id"
	IdentityTenantIDKey = "tenant_id"
	IdentityOrgIDKey    = "org_id"
)

var reservedIdentityFields = []string{IdentityActorIDKey, IdentityTenantIDKey, IdentityOrgIDKey}

func ReservedIdentityFields() []string {
	return append([]string{}, reservedIdentityFields...)
}

func ForbiddenIdentityField(payload map[string]any) (string, bool) {
	if len(payload) == 0 {
		return "", false
	}
	for _, key := range reservedIdentityFields {
		if _, ok := payload[key]; ok {
			return key, true
		}
	}
	scope, _ := payload["scope"].(map[string]any)
	if len(scope) == 0 {
		return "", false
	}
	for _, key := range []string{IdentityTenantIDKey, IdentityOrgIDKey} {
		if _, ok := scope[key]; ok {
			return "scope." + key, true
		}
	}
	return "", false
}

func NormalizeLifecycleMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case string(AssignmentLifecycleManualArchive):
		return string(AssignmentLifecycleManualArchive)
	case string(AssignmentLifecycleSingleActivePerLang):
		return string(AssignmentLifecycleSingleActivePerLang)
	case string(AssignmentLifecycleAutoArchive):
		return string(AssignmentLifecycleAutoArchive)
	default:
		return ""
	}
}
