package cmsadapter

import (
	"reflect"
	"strings"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
)

func ContentTypeChannel(ct cmsboot.CMSContentType) string {
	return strings.TrimSpace(primitives.FirstNonEmptyRaw(ct.Channel, legacyStringField(ct, "Environment")))
}

func SetContentTypeChannel(ct *cmsboot.CMSContentType, channel string) {
	if ct == nil {
		return
	}
	channel = strings.TrimSpace(channel)
	ct.Channel = channel
	setLegacyStringField(ct, "Environment", channel)
}

func ResolveContentTypeChannel(ct cmsboot.CMSContentType, fallback string) string {
	if channel := strings.TrimSpace(ContentTypeChannel(ct)); channel != "" {
		return channel
	}
	return strings.TrimSpace(fallback)
}

func legacyStringField(value any, name string) string {
	root := reflect.ValueOf(value)
	if root.Kind() == reflect.Pointer {
		if root.IsNil() {
			return ""
		}
		root = root.Elem()
	}
	if root.Kind() != reflect.Struct {
		return ""
	}
	field := root.FieldByName(name)
	if !field.IsValid() || field.Kind() != reflect.String {
		return ""
	}
	return field.String()
}

func setLegacyStringField(value any, name, next string) {
	field := reflect.ValueOf(value)
	if field.Kind() != reflect.Pointer || field.IsNil() {
		return
	}
	field = field.Elem().FieldByName(name)
	if !field.IsValid() || !field.CanSet() || field.Kind() != reflect.String {
		return
	}
	field.SetString(next)
}
