package boot

import router "github.com/goliatone/go-router"

// JobsStep registers job routes.
func JobsStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootJobs()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	path := routePath(ctx, ctx.AdminAPIGroup(), "jobs")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: withFeatureGate(responder, gates, FeatureJobs, func(c router.Context) error {
				payload, err := binding.List(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "jobs.trigger"),
			Handler: withFeatureGate(responder, gates, FeatureJobs, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				if err := binding.Trigger(c, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
