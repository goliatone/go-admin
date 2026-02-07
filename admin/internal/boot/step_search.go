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
	path := routePath(ctx, ctx.AdminAPIGroup(), "search")
	typeaheadPath := routePath(ctx, ctx.AdminAPIGroup(), "search.typeahead")
	defaultLocale := ctx.DefaultLocale()
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: withFeatureGate(responder, gates, FeatureSearch, func(c router.Context) error {
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
				return writeJSONOrError(responder, c, map[string]any{"results": results}, err)
			}),
		},
		{
			Method: "GET",
			Path:   typeaheadPath,
			Handler: withFeatureGate(responder, gates, FeatureSearch, func(c router.Context) error {
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
				return writeJSONOrError(responder, c, map[string]any{"results": results}, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
