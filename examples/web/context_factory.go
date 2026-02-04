package main

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
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
			locale = admin.LocaleFromContext(base)
		}
		if locale == "" {
			locale = strings.TrimSpace(defaultLocale)
		}
		if locale != "" {
			base = admin.WithLocale(base, locale)
		}

		environment := strings.TrimSpace(ctx.Query("env"))
		if environment == "" {
			environment = strings.TrimSpace(ctx.Query("environment"))
		}
		if environment == "" {
			environment = admin.EnvironmentFromContext(base)
		}
		if environment != "" {
			base = admin.WithEnvironment(base, environment)
		}

		if setter, ok := ctx.(interface{ SetUserContext(context.Context) }); ok {
			setter.SetUserContext(base)
		}
		return ctx
	}
}
