package boot

import router "github.com/goliatone/go-router"

// UserImportRouteStep registers the user import endpoints.
func UserImportRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootUserImport()
	if binding == nil {
		return nil
	}
	base := routePath(ctx, ctx.AdminAPIGroup(), "users.import")
	routes := []RouteSpec{
		{
			Method: "POST",
			Path:   base,
			Handler: func(c router.Context) error {
				return binding.ImportUsers(c)
			},
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "users.import.template"),
			Handler: func(c router.Context) error {
				return binding.ImportTemplate(c)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
