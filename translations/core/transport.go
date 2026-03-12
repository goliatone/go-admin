package core

import "strings"

var reservedIdentityFields = []string{"actor_id", "tenant_id", "org_id"}

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
	for _, key := range []string{"tenant_id", "org_id"} {
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
