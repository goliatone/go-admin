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

func cmsChannelMatches(recordChannel, requestedChannel string) bool {
	requested := strings.TrimSpace(requestedChannel)
	if requested == "" {
		return true
	}
	return normalizeCMSChannel(recordChannel) == normalizeCMSChannel(requested)
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
	//lint:ignore SA1019 compatibility bridge for legacy CMS content type records that still populate Environment.
	return strings.TrimSpace(firstNonEmptyRaw(ct.Channel, ct.Environment))
}

func CMSContentTypeChannel(ct CMSContentType) string {
	return cmsContentTypeChannel(ct)
}

func cmsBlockDefinitionChannel(def CMSBlockDefinition) string {
	//lint:ignore SA1019 compatibility bridge for legacy CMS block definitions that still populate Environment.
	return strings.TrimSpace(firstNonEmptyRaw(def.Channel, def.Environment))
}

func setCMSContentTypeChannel(ct *CMSContentType, channel string) {
	if ct == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	ct.Channel = channel
	//lint:ignore SA1019 keep legacy Environment synchronized while older persisted records still depend on it.
	ct.Environment = channel
}

func setCMSBlockDefinitionChannel(def *CMSBlockDefinition, channel string) {
	if def == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	def.Channel = channel
	//lint:ignore SA1019 keep legacy Environment synchronized while older persisted records still depend on it.
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
