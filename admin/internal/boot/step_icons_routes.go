package boot

import router "github.com/goliatone/go-router"

// IconsRouteStep registers icon discovery and rendering routes.
func IconsRouteStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootIcons()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}

	routes := []RouteSpec{
		// GET /api/icons/libraries - list all libraries
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.libraries"),
			Handler: func(c router.Context) error {
				payload, err := binding.Libraries(c)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		// GET /api/icons/libraries/:id - get single library
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.library"),
			Handler: func(c router.Context) error {
				id := c.Param("id")
				payload, err := binding.Library(c, id)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		// GET /api/icons/libraries/:id/icons - list icons in library
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.library.icons"),
			Handler: func(c router.Context) error {
				id := c.Param("id")
				category := c.Query("category")
				payload, err := binding.LibraryIcons(c, id, category)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		// GET /api/icons/search - search icons
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.search"),
			Handler: func(c router.Context) error {
				query := c.Query("q")
				limit := queryInt(c, "limit", 50)
				payload, err := binding.Search(c, query, limit)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		// GET /api/icons/resolve - resolve icon reference
		{
			Method: "GET",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.resolve"),
			Handler: func(c router.Context) error {
				value := c.Query("value")
				payload, err := binding.Resolve(c, value)
				return writeJSONOrError(responder, c, payload, err)
			},
		},
		// POST /api/icons/render - render icon to HTML
		{
			Method: "POST",
			Path:   routePath(ctx, ctx.AdminAPIGroup(), "icons.render"),
			Handler: withParsedBody(ctx, responder, func(c router.Context, body map[string]any) error {
				value, _ := body["value"].(string)
				variant, _ := body["variant"].(string)
				payload, err := binding.Render(c, value, variant)
				return writeJSONOrError(responder, c, payload, err)
			}),
		},
	}
	return applyRoutes(ctx, routes)
}
