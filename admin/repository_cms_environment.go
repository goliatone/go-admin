package admin

import "strings"

const defaultCMSEnvironmentKey = "default"

func normalizeCMSEnvironment(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return defaultCMSEnvironmentKey
	}
	return normalized
}

func cmsEnvironmentMatches(recordEnvironment, requestedEnvironment string) bool {
	requested := strings.TrimSpace(requestedEnvironment)
	if requested == "" {
		return true
	}
	return normalizeCMSEnvironment(recordEnvironment) == normalizeCMSEnvironment(requested)
}
