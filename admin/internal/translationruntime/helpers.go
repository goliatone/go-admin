package translationruntime

import (
	"maps"
	"strings"
)

func Channel(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func ChannelFromResolvedInputs(bodyChannel, queryChannel, adminChannel string, values ...string) string {
	resolved := make([]string, 0, len(values)+3)
	resolved = append(resolved, values...)
	resolved = append(resolved, bodyChannel, queryChannel, adminChannel)
	return Channel(resolved...)
}

func ChannelContract(channel string) map[string]any {
	return map[string]any{
		"channel": strings.TrimSpace(channel),
	}
}

func MergeChannelContract(payload map[string]any, channel string) map[string]any {
	if payload == nil {
		payload = map[string]any{}
	}
	maps.Copy(payload, ChannelContract(channel))
	return payload
}

func MissingCanonicalFamilyID(familyID string) bool {
	return strings.TrimSpace(familyID) == ""
}
