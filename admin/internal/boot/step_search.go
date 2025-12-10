package boot

import router "github.com/goliatone/go-router"

// SearchStep registers search routes.
func SearchStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootSearch()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	path := joinPath(ctx.BasePath(), "api/search")
	typeaheadPath := joinPath(ctx.BasePath(), "api/search/typeahead")
	defaultLocale := ctx.DefaultLocale()
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureSearch); err != nil {
						return responder.WriteError(c, err)
					}
				}
				query := c.Query("query")
				if query == "" {
					return responder.WriteError(c, errMissingQuery)
				}
				limit := atoiDefault(c.Query("limit"), 10)
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				results, err := binding.Query(c, locale, query, limit)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]any{"results": results})
			},
		},
		{
			Method: "GET",
			Path:   typeaheadPath,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureSearch); err != nil {
						return responder.WriteError(c, err)
					}
				}
				query := c.Query("query")
				if query == "" {
					return responder.WriteError(c, errMissingQuery)
				}
				limit := atoiDefault(c.Query("limit"), 5)
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				results, err := binding.Query(c, locale, query, limit)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, map[string]any{"results": results})
			},
		},
	}
	return applyRoutes(ctx, routes)
}
