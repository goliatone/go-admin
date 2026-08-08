package boot

import router "github.com/goliatone/go-router"

const (
	notificationDeliveryEventParameter   = "event_id"
	notificationDeliveryMessageParameter = "message_id"
)

// NotificationsRouteStep registers notifications routes.
func NotificationsRouteStep(ctx BootCtx) error {
	binding := ctx.BootNotifications()
	if binding == nil {
		return nil
	}
	if err := applyListActionRoutes(
		ctx,
		FeatureNotifications,
		"notifications",
		"notifications.read",
		func(c router.Context) (any, error) { return binding.List(c) },
		func(c router.Context, body map[string]any) error { return binding.Mark(c, body) },
	); err != nil {
		return err
	}
	return applyNotificationCapabilityRoutes(ctx, binding)
}

func applyNotificationCapabilityRoutes(ctx BootCtx, binding NotificationsBinding) error {
	if ctx == nil || ctx.Router() == nil || binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	capabilities := binding.Capabilities()
	routes := make([]RouteSpec, 0, 5)
	if capabilities.Deliveries {
		routes = append(routes,
			RouteSpec{Method: "GET", Path: routePath(ctx, ctx.AdminAPIGroup(), "notifications.deliveries"), Handler: withFeatureGate(responder, gates, FeatureNotifications, func(c router.Context) error {
				payload, err := binding.ListDeliveries(c)
				return writeJSONOrError(responder, c, payload, err)
			})},
			RouteSpec{Method: "GET", Path: routePath(ctx, ctx.AdminAPIGroup(), "notifications.deliveries.event"), Handler: withFeatureGate(responder, gates, FeatureNotifications, func(c router.Context) error {
				payload, err := binding.GetDeliveryEvent(c, c.Param(notificationDeliveryEventParameter))
				return writeJSONOrError(responder, c, payload, err)
			})},
			RouteSpec{Method: "GET", Path: routePath(ctx, ctx.AdminAPIGroup(), "notifications.deliveries.message"), Handler: withFeatureGate(responder, gates, FeatureNotifications, func(c router.Context) error {
				payload, err := binding.GetDeliveryMessage(c, c.Param(notificationDeliveryMessageParameter))
				return writeJSONOrError(responder, c, payload, err)
			})},
		)
	}
	if capabilities.Receipts {
		routes = append(routes, RouteSpec{Method: "POST", Path: routePath(ctx, ctx.AdminAPIGroup(), "notifications.receipts.lookup"), Handler: withFeatureGate(responder, gates, FeatureNotifications, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
			payload, err := binding.LookupReceipt(c, body)
			return writeJSONOrError(responder, c, payload, err)
		}))})
	}
	if capabilities.Retention {
		routes = append(routes, RouteSpec{Method: "POST", Path: routePath(ctx, ctx.AdminAPIGroup(), "notifications.retention.purge"), Handler: withFeatureGate(responder, gates, FeatureNotifications, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
			payload, err := binding.PurgeRetention(c, body)
			return writeJSONOrError(responder, c, payload, err)
		}))})
	}
	return applyRoutes(ctx, routes)
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
