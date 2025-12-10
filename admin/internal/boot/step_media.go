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
	path := joinPath(ctx.BasePath(), "api/media/library")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureMedia); err != nil {
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
			Path:   path,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureMedia); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				payload, err := binding.Add(c, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
