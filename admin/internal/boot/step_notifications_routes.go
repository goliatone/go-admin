package boot

import router "github.com/goliatone/go-router"

// NotificationsRouteStep registers notifications routes.
func NotificationsRouteStep(ctx BootCtx) error {
	binding := ctx.BootNotifications()
	if binding == nil {
		return nil
	}
	return applyListActionRoutes(
		ctx,
		FeatureNotifications,
		"notifications",
		"notifications.read",
		func(c router.Context) (any, error) { return binding.List(c) },
		func(c router.Context, body map[string]any) error { return binding.Mark(c, body) },
	)
}

func applyListActionRoutes(
	ctx BootCtx,
	feature string,
	listPath string,
	actionPath string,
	list func(router.Context) (any, error),
	action func(router.Context, map[string]any) error,
) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), listPath),
			Handler: withFeatureGate(responder, gates, feature, func(c router.Context) error {
				payload, err := list(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), actionPath),
			Handler: withFeatureGate(responder, gates, feature, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				if err := action(c, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
