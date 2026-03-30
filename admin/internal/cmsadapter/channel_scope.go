package cmsadapter

import (
	"context"
	"strings"
)

const (
	DefaultChannelKey     = "default"
	DefaultEnvironmentKey = DefaultChannelKey
)

type ContextStringResolver func(context.Context) string

func NormalizeChannel(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return DefaultChannelKey
	}
	return normalized
}

func ChannelsMatch(recordChannel, requestedChannel string) bool {
	requested := strings.TrimSpace(requestedChannel)
	if requested == "" {
		return true
	}
	return NormalizeChannel(recordChannel) == NormalizeChannel(requested)
}

func ResolveContextChannel(fallback string, ctx context.Context, resolvers ...ContextStringResolver) string {
	channel := strings.TrimSpace(fallback)
	if channel != "" || ctx == nil {
		return channel
	}
	for _, resolver := range resolvers {
		if resolver == nil {
			continue
		}
		if resolved := strings.TrimSpace(resolver(ctx)); resolved != "" {
			return resolved
		}
	}
	return ""
}
