package boot

import router "github.com/goliatone/go-router"

// TranslationExchangeRouteStep registers translation exchange HTTP routes.
func TranslationExchangeRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootTranslationExchange()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	routes := []RouteSpec{
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.export"),
			Handler: func(c router.Context) error {
				payload, err := binding.Export(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.template"),
			Handler: func(c router.Context) error {
				return binding.Template(c)
			},
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.import.validate"),
			Handler: func(c router.Context) error {
				payload, err := binding.ImportValidate(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "translations.import.apply"),
			Handler: func(c router.Context) error {
				payload, err := binding.ImportApply(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
	}
	return applyRoutes(ctx, routes)
}
