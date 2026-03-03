package main

import (
	"context"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-crud"
)

func contentCRUDContextFactory(defaultLocale string) func(crud.Context) crud.Context {
	return func(ctx crud.Context) crud.Context {
		if ctx == nil {
			return ctx
		}
		base := ctx.UserContext()
		locale := strings.TrimSpace(ctx.Query("locale"))
		if locale == "" {
			locale = strings.TrimSpace(ctx.Query("requested_locale"))
		}
		if locale == "" {
			locale = coreadmin.LocaleFromContext(base)
		}
		if locale == "" {
			locale = strings.TrimSpace(defaultLocale)
		}
		if locale != "" {
			base = coreadmin.WithLocale(base, locale)
		}

		channel := strings.TrimSpace(ctx.Query("channel"))
		if channel == "" {
			channel = strings.TrimSpace(ctx.Query("content_channel"))
		}
		if channel == "" {
			channel = strings.TrimSpace(ctx.Query("env"))
		}
		if channel == "" {
			channel = strings.TrimSpace(ctx.Query("environment"))
		}
		if channel == "" {
			channel = strings.TrimSpace(ctx.Query("content_env"))
		}
		if channel == "" {
			channel = strings.TrimSpace(ctx.Query("site_env"))
		}
		if channel == "" {
			channel = coreadmin.ContentChannelFromContext(base)
		}
		if channel != "" {
			base = coreadmin.WithContentChannel(base, channel)
		}

		if setter, ok := ctx.(interface{ SetUserContext(context.Context) }); ok {
			setter.SetUserContext(base)
		}
		return ctx
	}
}
