package boot

import router "github.com/goliatone/go-router"

// MediaStep registers media routes.
func MediaStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootMedia()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	path := routePath(ctx, ctx.AdminAPIGroup(), "media.library")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: withFeatureGate(responder, gates, FeatureMedia, func(c router.Context) error {
				payload, err := binding.List(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   path,
			Handler: withFeatureGate(responder, gates, FeatureMedia, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.Add(c, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
