package boot

import router "github.com/goliatone/go-router"

// TranslationQueueRouteStep registers translation queue aggregate HTTP routes.
func TranslationQueueRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootTranslationQueue()
	if binding == nil {
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
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.my_work"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.MyWork(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.queue"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.Queue(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
