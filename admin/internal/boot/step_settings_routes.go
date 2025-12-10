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
	base := joinPath(ctx.BasePath(), "api/settings")
	formPath := joinPath(ctx.BasePath(), "api/settings/form")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   base,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureSettings); err != nil {
						return responder.WriteError(c, err)
					}
				}
				payload, err := binding.Values(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
		{
			Method: "GET",
			Path:   formPath,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureSettings); err != nil {
						return responder.WriteError(c, err)
					}
				}
				payload, err := binding.Form(c)
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
					if err := gates.Require(FeatureSettings); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				payload, err := binding.Save(c, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
