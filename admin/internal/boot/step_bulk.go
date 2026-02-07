package boot

import router "github.com/goliatone/go-router"

// BulkStep registers bulk routes.
func BulkStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootBulk()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	base := routePath(ctx, ctx.AdminAPIGroup(), "bulk")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: withFeatureGate(responder, gates, FeatureBulk, func(c router.Context) error {
				payload, err := binding.List(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   base,
			Handler: withFeatureGate(responder, gates, FeatureBulk, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.Start(c, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "bulk.rollback"),
			Handler: withFeatureGate(responder, gates, FeatureBulk, func(c router.Context) error {
				id := c.Param("id", "")
				body, _ := ctx.ParseBody(c)
				payload, err := binding.Rollback(c, id, body)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
