package helpers

import (
	"context"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-router"
)

// WithNav adds navigation items to the view context using the shared quickstart helper.
func WithNav(ctx router.ViewContext, adm *admin.Admin, cfg admin.Config, active string, reqCtx context.Context) router.ViewContext {
	return quickstart.WithNav(ctx, adm, cfg, active, reqCtx)
}

// BuildNavItems builds navigation menu items from the admin menu service (shared quickstart implementation).
func BuildNavItems(adm *admin.Admin, cfg admin.Config, ctx context.Context, active string) []map[string]any {
	return quickstart.BuildNavItems(adm, cfg, ctx, active)
}
