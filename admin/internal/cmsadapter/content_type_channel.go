package cmsadapter

import (
	"strings"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
)

func ContentTypeChannel(ct cmsboot.CMSContentType) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(ct.Channel, ct.Environment))
}

func SetContentTypeChannel(ct *cmsboot.CMSContentType, channel string) {
	if ct == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	ct.Channel = channel
	ct.Environment = channel
}

func ResolveContentTypeChannel(ct cmsboot.CMSContentType, fallback string) string {
	if channel := strings.TrimSpace(ContentTypeChannel(ct)); channel != "" {
		return channel
	}
	return strings.TrimSpace(fallback)
}
