package helpers

import (
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	"github.com/goliatone/go-router"
)

// WithTheme resolves the active theme (with optional query/header overrides) and adds it to the view context.
func WithTheme(ctx router.ViewContext, adm *admin.Admin, req router.Context) router.ViewContext {
	return quickstart.WithThemeContext(ctx, adm, req)
}
