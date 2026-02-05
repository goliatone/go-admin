package boot

import router "github.com/goliatone/go-router"

// NotificationsRouteStep registers notifications routes.
func NotificationsRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootNotifications()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	base := routePath(ctx, ctx.AdminAPIGroup(), "notifications")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureNotifications); err != nil {
						return responder.WriteError(c, err)
					}
				}
				payload, err := binding.List(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "notifications.read"),
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureNotifications); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				if err := binding.Mark(c, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			},
		},
	}
	return applyRoutes(ctx, routes)
}
