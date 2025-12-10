package boot

import router "github.com/goliatone/go-router"

// NavigationStep registers navigation routes.
func NavigationStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootNavigation()
	if binding == nil {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	path := joinPath(ctx.BasePath(), "api/navigation")
	defaultLocale := ctx.DefaultLocale()
	defaultMenu := ctx.NavMenuCode()
	routes := []RouteSpec{
		{
			Method: "GET",
			Path:   path,
			Handler: func(c router.Context) error {
				menuCode := c.Query("code")
				if menuCode == "" {
					menuCode = defaultMenu
				}
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				items, theme := binding.Resolve(c, locale, menuCode)
				return responder.WriteJSON(c, map[string]any{
					"items": items,
					"theme": theme,
				})
			},
		},
	}
	return applyRoutes(ctx, routes)
}
