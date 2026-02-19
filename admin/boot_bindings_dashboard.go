package admin

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-command/dispatcher"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashboardrouter "github.com/goliatone/go-dashboard/components/dashboard/gorouter"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

type dashboardBinding struct {
	admin *Admin
}

func newDashboardBinding(a *Admin) boot.DashboardBinding {
	if a == nil || a.dashboard == nil {
		return nil
	}
	return &dashboardBinding{admin: a}
}

func (d *dashboardBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dashboard != nil && d.admin.dashboard.HasRenderer()
}

func (d *dashboardBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return "", nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	ctx.RenderMode = DashboardRenderModeSSR
	ctx.Context = WithDashboardRenderMode(ctx.Context, ctx.RenderMode)
	theme := d.admin.resolveTheme(ctx.Context)
	basePath := d.admin.config.BasePath
	if basePath == "" {
		basePath = "/"
	}
	layout, err := d.admin.dashboard.RenderLayout(ctx, theme, basePath)
	if err != nil {
		return "", err
	}
	viewCtx := buildAdminLayoutViewContext(d.admin, c, router.ViewContext{
		"title":           d.admin.config.Title,
		"base_path":       basePath,
		"asset_base_path": basePath,
	}, "dashboard")
	if layout.Metadata == nil {
		layout.Metadata = map[string]any{}
	}
	for _, key := range []string{
		"title",
		"base_path",
		"asset_base_path",
		"api_base_path",
		"body_classes",
		"nav_items",
		"nav_utility_items",
		"session_user",
		"theme",
		"translation_capabilities",
		"users_import_available",
		"users_import_enabled",
		"nav_debug",
		"nav_items_json",
	} {
		if value, ok := viewCtx[key]; ok && value != nil {
			layout.Metadata[key] = value
		}
	}
	return d.admin.dashboard.renderer.Render("dashboard_ssr.html", layout)
}

func (d *dashboardBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	ctx.RenderMode = DashboardRenderModeClient
	ctx.Context = WithDashboardRenderMode(ctx.Context, ctx.RenderMode)
	widgets, err := d.admin.dashboard.Resolve(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"widgets": widgets,
		"theme":   d.admin.themePayload(ctx.Context),
	}, nil
}

func (d *dashboardBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	layout := d.admin.dashboard.resolvedInstances(adminCtx)
	areas := d.admin.dashboard.Areas()
	if len(areas) == 0 && d.admin.widgetSvc != nil {
		areas = d.admin.widgetSvc.Areas()
	}
	return map[string]any{
		"providers": d.admin.dashboard.Providers(),
		"layout":    layout,
		"areas":     areas,
	}, nil
}

func (d *dashboardBinding) SavePreferences(c router.Context, body map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, d.admin.config.DefaultLocale)

	if adminCtx.UserID != "" && d.admin.preferences != nil {
		overrides := expandDashboardOverrides(body)
		if _, err := d.admin.preferences.SaveDashboardOverrides(adminCtx.Context, adminCtx.UserID, overrides); err != nil {
			return nil, err
		}
	}

	if _, ok := body["layout_rows"]; ok {
		type widgetSlot struct {
			ID    string `json:"id"`
			Width int    `json:"width"`
		}
		type widgetLayoutRow struct {
			Widgets []widgetSlot `json:"widgets"`
		}
		rows := map[string][]widgetLayoutRow{}
		if rawRows, ok := body["layout_rows"].(map[string]any); ok {
			for area, areaRows := range rawRows {
				parsedRows := []widgetLayoutRow{}
				if rawAreaRows, ok := areaRows.([]any); ok {
					for _, r := range rawAreaRows {
						if rowMap, ok := r.(map[string]any); ok {
							wSlots := []widgetSlot{}
							if rawWidgets, ok := rowMap["widgets"].([]any); ok {
								for _, w := range rawWidgets {
									if wMap, ok := w.(map[string]any); ok {
										wSlots = append(wSlots, widgetSlot{
											ID:    toString(wMap["id"]),
											Width: atoiDefault(toString(wMap["width"]), 12),
										})
									}
								}
							}
							parsedRows = append(parsedRows, widgetLayoutRow{Widgets: wSlots})
						}
					}
				}
				rows[area] = parsedRows
			}
		}

		hiddenIDs := []string{}
		if rawHidden, ok := body["hidden_widget_ids"].([]any); ok {
			for _, id := range rawHidden {
				hiddenIDs = append(hiddenIDs, toString(id))
			}
		}

		currentLayout := d.admin.dashboard.resolvedInstances(adminCtx)
		byID := map[string]DashboardWidgetInstance{}
		for _, inst := range currentLayout {
			byID[inst.ID] = inst
		}

		newLayout := []DashboardWidgetInstance{}
		seenIDs := map[string]bool{}

		for areaCode, areaRows := range rows {
			for _, row := range areaRows {
				for _, slot := range row.Widgets {
					if inst, ok := byID[slot.ID]; ok {
						inst.AreaCode = areaCode
						inst.Span = slot.Width
						inst.Position = len(newLayout)
						inst.Hidden = false
						newLayout = append(newLayout, inst)
						seenIDs[slot.ID] = true
					}
				}
			}
		}

		for _, id := range hiddenIDs {
			if inst, ok := byID[id]; ok {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
				seenIDs[id] = true
			}
		}

		for _, inst := range currentLayout {
			if !seenIDs[inst.ID] {
				inst.Hidden = true
				inst.Position = len(newLayout)
				newLayout = append(newLayout, inst)
			}
		}

		if len(newLayout) > 0 {
			d.admin.dashboard.SetUserLayoutWithContext(adminCtx, newLayout)
		}
		return map[string]any{"status": "ok", "layout": newLayout}, nil
	}

	rawLayout, ok := body["layout"].([]any)
	if !ok {
		return nil, validationDomainError("layout must be an array or valid preferences object", map[string]any{
			"field": "layout",
		})
	}
	layout := []DashboardWidgetInstance{}
	for _, item := range rawLayout {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		layout = append(layout, DashboardWidgetInstance{
			DefinitionCode: toString(obj["definition"]),
			AreaCode:       toString(obj["area"]),
			Config:         extractMap(obj["config"]),
			Position:       atoiDefault(toString(obj["position"]), 0),
			Span:           atoiDefault(toString(obj["span"]), 0),
			Hidden:         toBool(obj["hidden"]),
			Locale:         toString(obj["locale"]),
		})
	}
	if len(layout) > 0 {
		d.admin.dashboard.SetUserLayoutWithContext(adminCtx, layout)
	}
	return map[string]any{"layout": layout}, nil
}

func (d *dashboardBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

type dashboardGoBinding struct {
	admin *Admin
}

func (d *dashboardGoBinding) Enabled() bool {
	return d.admin != nil && featureEnabled(d.admin.featureGate, FeatureDashboard)
}

func (d *dashboardGoBinding) HasRenderer() bool {
	return d.admin != nil && d.admin.dash != nil && d.admin.dash.controller != nil
}

func (d *dashboardGoBinding) RenderHTML(c router.Context, locale string) (string, error) {
	if d.admin == nil || d.admin.dash == nil || d.admin.dash.controller == nil {
		return "", nil
	}
	viewer := d.viewer(c, locale)
	renderCtx := WithDashboardRenderMode(c.Context(), DashboardRenderModeSSR)
	var buf strings.Builder
	if err := d.admin.dash.controller.RenderTemplate(renderCtx, viewer, &buf); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func (d *dashboardGoBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	adminCtx.RenderMode = DashboardRenderModeClient
	adminCtx.Context = WithDashboardRenderMode(adminCtx.Context, adminCtx.RenderMode)
	widgets, err := d.admin.dashboard.Resolve(adminCtx)
	if err != nil {
		return nil, err
	}
	payload := map[string]any{
		"widgets": widgets,
		"locale":  locale,
	}
	if base := d.admin.config.BasePath; base != "" {
		payload["base_path"] = base
	}
	if theme := d.admin.themePayload(adminCtx.Context); theme != nil {
		payload["theme"] = theme
	}
	return payload, nil
}

func (d *dashboardGoBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	return d.Widgets(c, locale)
}

func (d *dashboardGoBinding) SavePreferences(c router.Context, _ map[string]any) (map[string]any, error) {
	if d.admin == nil || d.admin.dash == nil {
		return nil, nil
	}
	viewer := d.viewer(c, d.admin.config.DefaultLocale)
	if viewer.UserID == "" {
		return map[string]any{"status": "skipped"}, nil
	}
	if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, dashcmp.LayoutOverrides{}); err != nil {
		return nil, err
	}
	return map[string]any{"status": "ok"}, nil
}

func (d *dashboardGoBinding) RequirePreferencesPermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesPermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RequirePreferencesUpdatePermission(c router.Context, locale string) error {
	if d.admin == nil {
		return nil
	}
	if locale == "" {
		locale = d.admin.config.DefaultLocale
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return d.admin.requirePermission(adminCtx, d.admin.config.DashboardPreferencesUpdatePermission, preferencesModuleID)
}

func (d *dashboardGoBinding) RegisterGoDashboardRoutes() error {
	if d.admin == nil || d.admin.dash == nil || d.admin.router == nil {
		return nil
	}
	defaultLocale := d.admin.config.DefaultLocale
	viewerResolver := func(c router.Context) dashcmp.ViewerContext {
		locale := strings.TrimSpace(c.Query("locale"))
		if locale == "" {
			locale = defaultLocale
		}
		adminCtx := d.admin.adminContextFromRequest(c, locale)
		if c != nil {
			c.SetContext(adminCtx.Context)
		}
		return dashcmp.ViewerContext{
			UserID: adminCtx.UserID,
			Locale: locale,
		}
	}
	basePath := adminBasePath(d.admin.config)
	routes := dashboardrouter.RouteConfig{
		HTML:        relativeRoutePath(basePath, adminRoutePath(d.admin, "dashboard.page")),
		Layout:      relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard")),
		Widgets:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets")),
		WidgetID:    relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widget")),
		Reorder:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.reorder")),
		Refresh:     relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.widgets.refresh")),
		Preferences: relativeRoutePath(basePath, adminAPIRoutePath(d.admin, "dashboard.preferences")),
	}

	registered, err := registerDashboardRoutesByRouterType(d.admin.router, dashboardRouteRegistrars{
		HTTP: func(rt router.Router[*httprouter.Router]) error {
			return dashboardrouter.Register(dashboardrouter.Config[*httprouter.Router]{
				Router:         rt,
				Controller:     d.admin.dash.controller,
				API:            d.admin.dash.executor,
				Broadcast:      d.admin.dash.broadcast,
				ViewerResolver: viewerResolver,
				BasePath:       basePath,
				Routes:         routes,
			})
		},
		Fiber: func(rt router.Router[*fiber.App]) error {
			return dashboardrouter.Register(dashboardrouter.Config[*fiber.App]{
				Router:         rt,
				Controller:     d.admin.dash.controller,
				API:            d.admin.dash.executor,
				Broadcast:      d.admin.dash.broadcast,
				ViewerResolver: viewerResolver,
				BasePath:       basePath,
				Routes:         routes,
			})
		},
	})
	if err != nil {
		return err
	}
	if registered {
		return nil
	}
	if rt, ok := d.admin.router.(AdminRouter); ok {
		dashboardPath := adminAPIRoutePath(d.admin, "dashboard")
		prefsPath := adminAPIRoutePath(d.admin, "dashboard.preferences")
		configPath := adminAPIRoutePath(d.admin, "dashboard.config")
		getLocale := func(c router.Context) string {
			locale := strings.TrimSpace(c.Query("locale"))
			if locale == "" {
				locale = defaultLocale
			}
			return locale
		}
		rt.Get(dashboardPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(prefsPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		rt.Get(configPath, func(c router.Context) error {
			payload, err := d.Widgets(c, getLocale(c))
			if err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, payload)
		})
		savePrefs := func(c router.Context) error {
			locale := getLocale(c)
			adminCtx := d.admin.adminContextFromRequest(c, locale)
			viewer := dashcmp.ViewerContext{UserID: adminCtx.UserID, Locale: adminCtx.Locale}
			if viewer.UserID == "" {
				return writeError(c, ErrForbidden)
			}
			raw, err := d.admin.ParseBody(c)
			if err != nil {
				return writeError(c, err)
			}
			adminOverrides := expandDashboardOverrides(raw)
			if adminOverrides.Locale == "" {
				adminOverrides.Locale = locale
			}
			overrides := dashcmp.LayoutOverrides{
				Locale:        adminOverrides.Locale,
				AreaOrder:     cloneStringSliceMap(adminOverrides.AreaOrder),
				AreaRows:      convertDashboardRows(adminOverrides.AreaRows),
				HiddenWidgets: cloneHiddenWidgetMap(adminOverrides.HiddenWidgets),
			}
			if err := d.admin.dash.service.SavePreferences(c.Context(), viewer, overrides); err != nil {
				return writeError(c, err)
			}
			return writeJSON(c, map[string]any{"status": "ok"})
		}
		rt.Post(prefsPath, savePrefs)
		rt.Post(configPath, savePrefs)
		return nil
	}
	return serviceUnavailableDomainError("router does not support go-dashboard routes", map[string]any{"component": "boot_bindings"})
}

func (d *dashboardGoBinding) viewer(c router.Context, locale string) dashcmp.ViewerContext {
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	return dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: locale,
	}
}

func (d *dashboardBinding) Diagnostics(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	msg := DashboardDiagnosticsMsg{Locale: locale}
	report, err := dispatcher.Query[DashboardDiagnosticsMsg, DashboardDiagnosticsReport](ctx.Context, msg)
	if err != nil {
		// Fallback to direct diagnostics when the command bus/query registry isn't available.
		if fallback, ferr := (&dashboardDiagnosticsQuery{admin: d.admin}).Query(ctx.Context, msg); ferr == nil {
			report = fallback
		} else {
			return nil, err
		}
	}
	return map[string]any{
		"locale":             report.Locale,
		"areas":              report.Areas,
		"providers":          report.Providers,
		"definitions":        report.Definitions,
		"instances":          report.Instances,
		"instances_by_area":  report.InstancesByArea,
		"resolved_by_area":   report.ResolvedByArea,
		"resolve_errors":     report.ResolveErrors,
		"widget_service":     report.WidgetService,
		"has_widget_service": report.HasWidgetService,
	}, nil
}
