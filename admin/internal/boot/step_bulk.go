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
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureBulk); err != nil {
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
			Path:   base,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureBulk); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				payload, err := binding.Start(c, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "bulk.rollback"),
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureBulk); err != nil {
						return responder.WriteError(c, err)
					}
				}
				id := c.Param("id", "")
				body, _ := ctx.ParseBody(c)
				payload, err := binding.Rollback(c, id, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
