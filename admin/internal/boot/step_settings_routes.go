package boot

import router "github.com/goliatone/go-router"

// SettingsRouteStep registers settings routes.
func SettingsRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootSettings()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	base := routePath(ctx, ctx.AdminAPIGroup(), "settings")
	formPath := routePath(ctx, ctx.AdminAPIGroup(), "settings.form")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: withFeatureGate(responder, gates, FeatureSettings, func(c router.Context) error {
				payload, err := binding.Values(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "GET",
			Path:   formPath,
			Handler: withFeatureGate(responder, gates, FeatureSettings, func(c router.Context) error {
				payload, err := binding.Form(c)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
		{
			Method: "POST",
			Path:   base,
			Handler: withFeatureGate(responder, gates, FeatureSettings, withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				payload, err := binding.Save(c, body)
				return writeJSONOrError(responder, c, payload, err)
			})),
		},
	}
	return applyRoutes(ctx, routes)
}
