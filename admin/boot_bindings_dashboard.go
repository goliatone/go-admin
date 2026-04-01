package admin

import (
	"github.com/goliatone/go-admin/admin/internal/boot"
	"github.com/goliatone/go-command/dispatcher"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	dashapi "github.com/goliatone/go-dashboard/components/dashboard/httpapi"
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
	if err := d.admin.ensureDashboard(ctx.Context); err != nil {
		return "", err
	}
	if d.admin.dash == nil || d.admin.dash.runtime == nil {
		return "", nil
	}
	basePath := d.admin.config.BasePath
	if basePath == "" {
		basePath = "/"
	}
	viewCtx := buildAdminLayoutViewContext(d.admin, c, router.ViewContext{
		"title":           d.admin.config.Title,
		"base_path":       basePath,
		"asset_base_path": basePath,
	}, "dashboard")
	metadata := map[string]any{}
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
			metadata[key] = value
		}
	}
	renderCtx := withDashboardPayloadMetadata(ctx.Context, metadata)
	html, err := dashapi.RenderHTML(renderCtx, d.admin.dash.runtime.Controller, dashcmp.ViewerContext{
		UserID: ctx.UserID,
		Locale: ctx.Locale,
	})
	if err != nil {
		return "", err
	}
	return string(html), nil
}

func (d *dashboardBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	ctx := d.admin.adminContextFromRequest(c, locale)
	if err := d.admin.ensureDashboard(ctx.Context); err != nil {
		return nil, err
	}
	if d.admin.dash == nil || d.admin.dash.runtime == nil {
		return nil, nil
	}
	payload, err := dashapi.Layout(ctx.Context, d.admin.dash.runtime.Controller, dashcmp.ViewerContext{
		UserID: ctx.UserID,
		Locale: ctx.Locale,
	})
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"widgets": dashboardWidgetsFromLayoutPayload(payload),
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
	if err := d.admin.ensureDashboard(adminCtx.Context); err != nil {
		return nil, err
	}
	if d.admin.dash == nil || d.admin.dash.runtime == nil {
		return nil, nil
	}
	if adminCtx.UserID == "" {
		return nil, requiredFieldDomainError("viewer user id", map[string]any{"scope": "dashboard_preferences"})
	}
	if layout, ok := body["layout"]; ok && !dashboardOverridesPayload(body) {
		instances := expandDashboardLayout(layout)
		if len(instances) == 0 {
			return nil, validationDomainError("layout must be an array or valid preferences object", map[string]any{
				"field": "layout",
			})
		}
		d.admin.dashboard.SetUserLayoutWithContext(adminCtx, instances)
		return map[string]any{"layout": instances}, nil
	}

	input, err := dashapi.PreferencesInputFromMap(body, dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: adminCtx.Locale,
	})
	if err != nil {
		return nil, validationDomainError("layout must be an array or valid preferences object", map[string]any{
			"field": "layout",
		})
	}
	reply, err := dashapi.Preferences(adminCtx.Context, d.admin.dash.runtime.API, input)
	if err != nil {
		return nil, err
	}
	if payload, ok := reply.Payload.(map[string]string); ok {
		return map[string]any{"status": payload["status"]}, nil
	}
	return map[string]any{"status": "saved"}, nil
}

func dashboardOverridesPayload(body map[string]any) bool {
	if len(body) == 0 {
		return false
	}
	if _, ok := body["area_order"]; ok {
		return true
	}
	if _, ok := body["layout_rows"]; ok {
		return true
	}
	if _, ok := body["hidden_widget_ids"]; ok {
		return true
	}
	if _, ok := body["viewer"]; ok {
		return true
	}
	return false
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

func dashboardWidgetsFromLayoutPayload(payload map[string]any) []map[string]any {
	areas := orderedDashboardAreasPayload(payload["ordered_areas"])
	if len(areas) == 0 {
		areas = orderedDashboardAreasPayload(payload["areas"])
	}
	out := make([]map[string]any, 0)
	for _, area := range areas {
		areaCode := toString(area["code"])
		for _, widget := range dashboardAreaWidgets(area["widgets"]) {
			out = append(out, map[string]any{
				"definition": toString(widget["definition"]),
				"area":       defaultString(toString(widget["area"]), areaCode),
				"config":     extractMap(widget["config"]),
				"data":       extractMap(widget["data"]),
			})
		}
	}
	return out
}

func dashboardAreaWidgets(raw any) []map[string]any {
	switch typed := raw.(type) {
	case []map[string]any:
		return typed
	case []any:
		out := make([]map[string]any, 0, len(typed))
		for _, item := range typed {
			if mapped, ok := item.(map[string]any); ok {
				out = append(out, mapped)
			}
		}
		return out
	default:
		return nil
	}
}

func defaultString(primary, fallback string) string {
	if primary != "" {
		return primary
	}
	return fallback
}
