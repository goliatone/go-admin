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
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureJobs); err != nil {
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
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "jobs.trigger"),
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureJobs); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				if err := binding.Trigger(c, body); err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]string{"status": "ok"})
			},
		},
	}
	return applyRoutes(ctx, routes)
}
