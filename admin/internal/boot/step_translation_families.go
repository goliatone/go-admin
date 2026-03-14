package boot

import router "github.com/goliatone/go-router"

// TranslationFamiliesRouteStep registers translation family list/detail/create HTTP routes.
func TranslationFamiliesRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootTranslationFamilies()
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
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.families"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, func(c router.Context) error {
				payload, err := binding.List(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.families.id"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, func(c router.Context) error {
				payload, err := binding.Detail(c, c.Param("family_id"))
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.families.variants"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, func(c router.Context) error {
				payload, err := binding.Create(c, c.Param("family_id"))
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.matrix"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, func(c router.Context) error {
				payload, err := binding.Matrix(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.matrix.actions.create_missing"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.CreateMissingBulk(c, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.matrix.actions.export_selected"),
			Handler: withFeatureGate(responder, gates, FeatureCMS, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.ExportSelectedBulk(c, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
