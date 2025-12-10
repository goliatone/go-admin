package boot

import router "github.com/goliatone/go-router"

// ExportStep registers export routes.
func ExportStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootExport()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	path := joinPath(ctx.BasePath(), "api/export")
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureExport); err != nil {
						return responder.WriteError(c, err)
					}
				}
				payload, err := binding.Export(c, c.Query("resource"), c.Query("format"))
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
					if err := gates.Require(FeatureExport); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				payload, err := binding.Export(c, toString(body["resource"]), toString(body["format"]))
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
