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
			Handler: withFeatureGate(responder, gates, FeatureNotifications, func(c router.Context) error {
				payload, err := binding.List(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "notifications.read"),
			Handler: withFeatureGate(responder, gates, FeatureNotifications, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				if err := binding.Mark(c, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
