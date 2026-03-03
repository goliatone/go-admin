package quickstart

import "strings"

const defaultChannelKey = "default"

func normalizeChannelKey(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return defaultChannelKey
	}
	return normalized
}
