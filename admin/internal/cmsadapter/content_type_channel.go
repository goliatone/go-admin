package cmsadapter

import (
	"strings"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
)

func ContentTypeChannel(ct cmsboot.CMSContentType) string {
	//lint:ignore SA1019 compatibility bridge for legacy CMS content type records that still populate Environment.
	return strings.TrimSpace(firstNonEmptyRaw(ct.Channel, ct.Environment))
}

func SetContentTypeChannel(ct *cmsboot.CMSContentType, channel string) {
	if ct == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	ct.Channel = channel
	//lint:ignore SA1019 keep legacy Environment synchronized while older persisted records still depend on it.
	ct.Environment = channel
}

func ResolveContentTypeChannel(ct cmsboot.CMSContentType, fallback string) string {
	if channel := strings.TrimSpace(ContentTypeChannel(ct)); channel != "" {
		return channel
	}
	return strings.TrimSpace(fallback)
}
