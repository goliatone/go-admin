package boot

import router "github.com/goliatone/go-router"

type dashboardPreferencesPermissioner interface {
	RequirePreferencesPermission(router.Context, string) error
	RequirePreferencesUpdatePermission(router.Context, string) error
}

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
	routes := dashboardRoutes(ctx, binding, responder)
	return applyRoutes(ctx, routes)
}

func dashboardRoutes(ctx BootCtx, binding DashboardBinding, responder Responder) []RouteSpec {
	routes := []RouteSpec{
		dashboardWidgetsRoute(ctx, binding, responder),
		dashboardDiagnosticsRoute(ctx, binding, responder),
	}
	if binding.HasRenderer() {
		routes = append(routes, dashboardHTMLRoute(ctx, binding, responder))
	}
	routes = append(routes, dashboardPreferenceRoutes(ctx, binding, responder)...)
	return routes
}

func dashboardHTMLRoute(ctx BootCtx, binding DashboardBinding, responder Responder) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminUIGroup(), "dashboard.page"),
		Handler: func(c router.Context) error {
			locale, ok := dashboardLocale(ctx, responder, c)
			if !ok {
				return nil
			}
			html, err := binding.RenderHTML(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteHTML(c, html)
		},
	}
}

func dashboardWidgetsRoute(ctx BootCtx, binding DashboardBinding, responder Responder) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "dashboard"),
		Handler: func(c router.Context) error {
			locale, ok := dashboardLocale(ctx, responder, c)
			if !ok {
				return nil
			}
			payload, err := binding.Widgets(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, payload)
		},
	}
}

func dashboardPreferenceRoutes(ctx BootCtx, binding DashboardBinding, responder Responder) []RouteSpec {
	paths := []string{
		routePath(ctx, ctx.AdminAPIGroup(), "dashboard.preferences"),
		routePath(ctx, ctx.AdminAPIGroup(), "dashboard.config"),
	}
	routes := make([]RouteSpec, 0, len(paths)*2)
	for _, path := range paths {
		if path == "" {
			continue
		}
		routes = append(routes, dashboardPreferencesGetRoute(ctx, binding, responder, path))
		routes = append(routes, dashboardPreferencesPostRoute(ctx, binding, responder, path))
	}
	return routes
}

func dashboardPreferencesGetRoute(ctx BootCtx, binding DashboardBinding, responder Responder, path string) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   path,
		Handler: func(c router.Context) error {
			locale, ok := dashboardLocale(ctx, responder, c)
			if !ok {
				return nil
			}
			if guard, ok := binding.(dashboardPreferencesPermissioner); ok {
				if err := guard.RequirePreferencesPermission(c, locale); err != nil {
					return responder.WriteError(c, err)
				}
			}
			payload, err := binding.Preferences(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, payload)
		},
	}
}

func dashboardPreferencesPostRoute(ctx BootCtx, binding DashboardBinding, responder Responder, path string) RouteSpec {
	return RouteSpec{
		Method: "POST",
		Path:   path,
		Handler: func(c router.Context) error {
			locale, ok := dashboardLocale(ctx, responder, c)
			if !ok {
				return nil
			}
			if guard, ok := binding.(dashboardPreferencesPermissioner); ok {
				if err := guard.RequirePreferencesUpdatePermission(c, locale); err != nil {
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
	}
}

func dashboardDiagnosticsRoute(ctx BootCtx, binding DashboardBinding, responder Responder) RouteSpec {
	return RouteSpec{
		Method: "GET",
		Path:   routePath(ctx, ctx.AdminAPIGroup(), "dashboard.debug"),
		Handler: func(c router.Context) error {
			locale, ok := dashboardLocale(ctx, responder, c)
			if !ok {
				return nil
			}
			payload, err := binding.Diagnostics(c, locale)
			if err != nil {
				return responder.WriteError(c, err)
			}
			return responder.WriteJSON(c, payload)
		},
	}
}

func dashboardLocale(ctx BootCtx, responder Responder, c router.Context) (string, bool) {
	if gates := ctx.Gates(); gates != nil {
		if err := gates.Require(FeatureDashboard); err != nil {
			if responder != nil {
				_ = responder.WriteError(c, err)
			}
			return "", false
		}
	}
	locale := c.Query("locale")
	if locale == "" {
		locale = ctx.DefaultLocale()
	}
	return locale, true
}
