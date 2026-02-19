package quickstart

import "strings"

const defaultEnvironmentKey = "default"

func normalizeEnvironmentKey(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return defaultEnvironmentKey
	}
	return normalized
}
