package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-command/dispatcher"
	router "github.com/goliatone/go-router"
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
