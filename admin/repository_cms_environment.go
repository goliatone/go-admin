package admin

import (
	"context"
	"strings"
)

const (
	defaultCMSChannelKey     = "default"
	defaultCMSEnvironmentKey = defaultCMSChannelKey
)

func normalizeCMSChannel(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return defaultCMSChannelKey
	}
	return normalized
}

func normalizeCMSEnvironment(value string) string {
	return normalizeCMSChannel(value)
}

func cmsChannelMatches(recordChannel, requestedChannel string) bool {
	requested := strings.TrimSpace(requestedChannel)
	if requested == "" {
		return true
	}
	return normalizeCMSChannel(recordChannel) == normalizeCMSChannel(requested)
}

func cmsEnvironmentMatches(recordEnvironment, requestedEnvironment string) bool {
	return cmsChannelMatches(recordEnvironment, requestedEnvironment)
}

func resolveCMSContentChannel(fallback string, ctx context.Context) string {
	channel := strings.TrimSpace(fallback)
	if channel == "" && ctx != nil {
		channel = strings.TrimSpace(ContentChannelFromContext(ctx))
	}
	if channel == "" && ctx != nil {
		channel = strings.TrimSpace(EnvironmentFromContext(ctx))
	}
	return strings.TrimSpace(channel)
}

func cmsContentTypeChannel(ct CMSContentType) string {
	return strings.TrimSpace(firstNonEmptyRaw(ct.Channel, ct.Environment))
}

func cmsBlockDefinitionChannel(def CMSBlockDefinition) string {
	return strings.TrimSpace(firstNonEmptyRaw(def.Channel, def.Environment))
}

func setCMSContentTypeChannel(ct *CMSContentType, channel string) {
	if ct == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	ct.Channel = channel
	ct.Environment = channel
}

func setCMSBlockDefinitionChannel(def *CMSBlockDefinition, channel string) {
	if def == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	def.Channel = channel
	def.Environment = channel
}

func firstNonEmptyRaw(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
