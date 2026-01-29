package boot

import router "github.com/goliatone/go-router"

// DashboardStep registers dashboard routes.
func DashboardStep(ctx BootCtx) error {
	if ctx == nil || ctx.Router() == nil {
		return nil
	}
	binding := ctx.BootDashboard()
	if binding == nil || !binding.Enabled() {
		return nil
	}
	responder := ctx.Responder()
	if responder == nil {
		return nil
	}
	gates := ctx.Gates()
	routes := []RouteSpec{}
	basePath := ctx.BasePath()
	defaultLocale := ctx.DefaultLocale()

	if binding.HasRenderer() {
		htmlPath := joinPath(basePath, "dashboard")
		routes = append(routes, RouteSpec{
			Method: "GET",
			Path:   htmlPath,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureDashboard); err != nil {
						return responder.WriteError(c, err)
					}
				}
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				html, err := binding.RenderHTML(c, locale)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteHTML(c, html)
			},
		})
	}

	routes = append(routes, RouteSpec{
		Method: "GET",
		Path:   joinPath(basePath, "api/dashboard"),
		Handler: func(c router.Context) error {
			if gates != nil {
				if err := gates.Require(FeatureDashboard); err != nil {
					return responder.WriteError(c, err)
				}
			}
			locale := c.Query("locale")
			if locale == "" {
				locale = defaultLocale
			}
			payload, err := binding.Widgets(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, payload)
		},
	})

	prefPath := joinPath(basePath, "api/dashboard/preferences")
	configAlias := joinPath(basePath, "api/dashboard/config")
	registerPref := func(path string) {
		pathCopy := path
		routes = append(routes, RouteSpec{
			Method: "GET",
			Path:   pathCopy,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureDashboard); err != nil {
						return responder.WriteError(c, err)
					}
				}
				locale := c.Query("locale")
				if locale == "" {
					locale = defaultLocale
				}
				payload, err := binding.Preferences(c, locale)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		})

		routes = append(routes, RouteSpec{
			Method: "POST",
			Path:   pathCopy,
			Handler: func(c router.Context) error {
				if gates != nil {
					if err := gates.Require(FeatureDashboard); err != nil {
						return responder.WriteError(c, err)
					}
				}
				body, err := ctx.ParseBody(c)
				if err != nil {
					return responder.WriteError(c, err)
				}
				payload, err := binding.SavePreferences(c, body)
				if err != nil {
					return responder.WriteError(c, err)
				}
				return responder.WriteJSON(c, payload)
			},
		})
	}

	registerPref(prefPath)
	registerPref(configAlias)

	// TODO: make configurable
	routes = append(routes, RouteSpec{
		Method: "GET",
		Path:   joinPath(basePath, "api/dashboard/debug"),
		Handler: func(c router.Context) error {
			if gates != nil {
				if err := gates.Require(FeatureDashboard); err != nil {
					return responder.WriteError(c, err)
				}
			}
			locale := c.Query("locale")
			if locale == "" {
				locale = defaultLocale
			}
			payload, err := binding.Diagnostics(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, payload)
		},
	})

	return applyRoutes(ctx, routes)
}
