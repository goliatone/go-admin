package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

// DefaultAdminUIViewContextBuilder returns the default admin UI view-context builder.
func DefaultAdminUIViewContextBuilder(adm *admin.Admin, cfg admin.Config) UIViewContextBuilder {
	return defaultUIViewContextBuilder(adm, cfg)
}

// WithAdminUIViewContext applies the default admin UI view-context builder.
func WithAdminUIViewContext(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, c router.Context) router.ViewContext {
	builder := defaultUIViewContextBuilder(adm, cfg)
	if builder == nil {
		return ctx
	}
	return builder(ctx, active, c)
}
