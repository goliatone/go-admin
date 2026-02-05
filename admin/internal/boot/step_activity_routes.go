package boot

import router "github.com/goliatone/go-router"

// ActivityRouteStep registers activity routes.
func ActivityRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootActivity()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	path := routePath(ctx, ctx.AdminAPIGroup(), "activity")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				payload, err := binding.List(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
