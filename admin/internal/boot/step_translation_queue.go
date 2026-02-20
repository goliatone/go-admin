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
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.entity_types"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.EntityTypesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.source_records"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.SourceRecordsOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.locales"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.LocalesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.groups"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.TranslationGroupsOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.options.assignees"),
			Handler: withFeatureGate(responder, gates, FeatureTranslationQueue, func(c router.Context) error {
				payload, err := binding.AssigneesOptions(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
