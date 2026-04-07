package admin

import (
	"context"
	"encoding/json"
	"sort"
	"strings"

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
	page, _, err := d.resolveAdminDashboardPage(c, locale)
	if err != nil {
		return "", err
	}
	if d.admin == nil || d.admin.dashboard == nil || d.admin.dashboard.renderer == nil {
		return "", nil
	}
	return d.admin.dashboard.renderer.RenderPage(dashboardSSRTemplateName, page)
}

func (d *dashboardBinding) Widgets(c router.Context, locale string) (map[string]any, error) {
	page, adminCtx, err := d.resolveAdminDashboardPage(c, locale)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"dashboard": page.Dashboard,
		"chrome":    page.Chrome,
		"widgets":   dashboardWidgetsFromPage(page.Dashboard),
		"theme":     cloneNestedStringMap(d.admin.themePayload(adminCtx.Context)),
	}, nil
}

func (d *dashboardBinding) Preferences(c router.Context, locale string) (map[string]any, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return nil, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	if err := d.admin.ensureDashboard(adminCtx.Context); err != nil {
		return nil, err
	}
	if d.admin.dash == nil || d.admin.dash.runtime == nil {
		return nil, nil
	}
	viewer := dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: adminCtx.Locale,
	}
	overrides := dashboardLayoutOverridesToTyped(d.admin.PreferencesService().DashboardOverrides(adminCtx.Context, adminCtx.UserID), viewer.Locale)
	registry, _ := d.admin.dashboard.providerSnapshot()
	return dashboardPreferencesPayload(viewer, overrides, registry.Catalog()), nil
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

	// Keep legacy {"layout":[...]} parsing only at this HTTP boundary until
	// callers are fully migrated to the typed preference transport.
	input, err := dashapi.PreferencesInputFromMapCompatible(body, dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: adminCtx.Locale,
	})
	if err != nil {
		return nil, validationDomainError("layout must be an array or valid preferences object", map[string]any{
			"field": "layout",
		})
	}
	input.AreaOrder = normalizeDashboardAreaOrderInput(input.AreaOrder, input.LayoutRows)
	reply, err := dashapi.Preferences(adminCtx.Context, d.admin.dash.runtime.API, input)
	if err != nil {
		return nil, err
	}
	// Preserve legacy persisted layout data only when an old layout-only body is sent.
	if legacy := legacyDashboardLayoutFromBody(body); len(legacy) > 0 {
		d.admin.dashboard.SetUserLayoutWithContext(adminCtx, legacy)
	}
	if payload, ok := reply.Payload.(map[string]string); ok {
		return map[string]any{"status": payload["status"]}, nil
	}
	return map[string]any{"status": "saved"}, nil
}

func adminChromeStateFromViewContext(view router.ViewContext) AdminChromeState {
	state := AdminChromeState{}
	if title := strings.TrimSpace(toString(view["title"])); title != "" {
		state.Title = title
	}
	if basePath := strings.TrimSpace(toString(view["base_path"])); basePath != "" {
		state.BasePath = basePath
	}
	if assetBasePath := strings.TrimSpace(toString(view["asset_base_path"])); assetBasePath != "" {
		state.AssetBasePath = assetBasePath
	}
	if apiBasePath := strings.TrimSpace(toString(view["api_base_path"])); apiBasePath != "" {
		state.APIBasePath = apiBasePath
	}
	if bodyClasses := strings.TrimSpace(toString(view["body_classes"])); bodyClasses != "" {
		state.BodyClasses = bodyClasses
	}
	state.NavItems = anySliceFromValue(view["nav_items"])
	state.NavUtilityItems = anySliceFromValue(view["nav_utility_items"])
	if sessionUser := extractMap(view["session_user"]); len(sessionUser) > 0 {
		state.SessionUser = cloneAny(sessionUser)
	}
	if theme, ok := view["theme"].(map[string]map[string]string); ok && len(theme) > 0 {
		state.Theme = cloneNestedStringMap(theme)
	}
	if capabilities := extractMap(view["translation_capabilities"]); len(capabilities) > 0 {
		state.TranslationCapabilities = cloneAny(capabilities)
	}
	if available, ok := view["users_import_available"].(bool); ok {
		state.UsersImportAvailable = available
	}
	if enabled, ok := view["users_import_enabled"].(bool); ok {
		state.UsersImportEnabled = enabled
	}
	if navDebug, ok := view["nav_debug"].(bool); ok {
		state.NavDebug = navDebug
	}
	if navItemsJSON := strings.TrimSpace(toString(view["nav_items_json"])); navItemsJSON != "" {
		state.NavItemsJSON = navItemsJSON
	}
	return state
}

func anySliceFromValue(value any) []any {
	switch typed := value.(type) {
	case nil:
		return nil
	case []any:
		return append([]any{}, typed...)
	case []map[string]any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, cloneAny(item))
		}
		return out
	default:
		return nil
	}
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
	if err := d.admin.ensureDashboard(ctx.Context); err != nil {
		return nil, err
	}
	queryCtx := d.dashboardPageContext(ctx, c)
	msg := DashboardDiagnosticsMsg{Locale: locale}
	report, err := dispatcher.Query[DashboardDiagnosticsMsg, DashboardDiagnosticsReport](queryCtx, msg)
	if err != nil {
		if fallback, ferr := (&dashboardDiagnosticsQuery{admin: d.admin}).Query(queryCtx, msg); ferr == nil {
			report = fallback
		} else {
			return nil, err
		}
	}
	return dashboardDiagnosticsPayload(report), nil
}

func (d *dashboardBinding) resolveAdminDashboardPage(c router.Context, locale string) (AdminDashboardPage, AdminContext, error) {
	if d.admin == nil || d.admin.dashboard == nil {
		return AdminDashboardPage{}, AdminContext{}, nil
	}
	adminCtx := d.admin.adminContextFromRequest(c, locale)
	if err := d.admin.ensureDashboard(adminCtx.Context); err != nil {
		return AdminDashboardPage{}, AdminContext{}, err
	}
	if d.admin.dash == nil || d.admin.dash.runtime == nil {
		return AdminDashboardPage{}, AdminContext{}, nil
	}
	page, err := dashapi.Page(d.dashboardPageContext(adminCtx, c), d.admin.dash.runtime.Controller, dashcmp.ViewerContext{
		UserID: adminCtx.UserID,
		Locale: adminCtx.Locale,
	})
	if err != nil {
		return AdminDashboardPage{}, AdminContext{}, err
	}
	return ComposeAdminDashboardPage(page), adminCtx, nil
}

func (d *dashboardBinding) dashboardPageContext(adminCtx AdminContext, c router.Context) context.Context {
	return withAdminDashboardChrome(adminCtx.Context, adminChromeStateFromViewContext(d.dashboardPageViewContext(c)))
}

func (d *dashboardBinding) dashboardPageViewContext(c router.Context) router.ViewContext {
	basePath := "/"
	if d.admin != nil && strings.TrimSpace(d.admin.config.BasePath) != "" {
		basePath = d.admin.config.BasePath
	}
	return buildAdminLayoutViewContext(d.admin, c, router.ViewContext{
		"title":           d.admin.config.Title,
		"base_path":       basePath,
		"asset_base_path": basePath,
	}, "dashboard")
}

func dashboardWidgetsFromPage(page dashcmp.Page) []map[string]any {
	out := make([]map[string]any, 0)
	for _, area := range page.Areas {
		areaCode := area.Code
		if areaCode == "" {
			areaCode = area.Slot
		}
		for _, widget := range area.Widgets {
			out = append(out, map[string]any{
				"id":         widget.ID,
				"definition": widget.Definition,
				"name":       widget.Name,
				"template":   widget.Template,
				"area":       defaultDashboardAreaCode(widget.Area, areaCode),
				"span":       widget.Span,
				"hidden":     widget.Hidden,
				"config":     cloneAny(widget.Config),
				"data":       cloneDashboardWidgetData(widget.Data),
				"metadata":   dashboardWidgetMetadata(widget),
			})
		}
	}
	return out
}

func defaultDashboardAreaCode(primary, fallback string) string {
	if strings.TrimSpace(primary) != "" {
		return primary
	}
	return fallback
}

func dashboardWidgetMetadata(widget dashcmp.WidgetFrame) map[string]any {
	metadata := dashboardWidgetExtensions(widget.Meta.Extensions)
	if widget.Meta.Layout == nil {
		return metadata
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["layout"] = map[string]any{
		"row":     widget.Meta.Layout.Row,
		"column":  widget.Meta.Layout.Column,
		"width":   widget.Meta.Layout.Width,
		"columns": widget.Meta.Layout.Columns,
	}
	return metadata
}

func dashboardWidgetExtensions(extensions map[string]json.RawMessage) map[string]any {
	if len(extensions) == 0 {
		return nil
	}
	out := make(map[string]any, len(extensions))
	for key, raw := range extensions {
		if len(raw) == 0 {
			continue
		}
		var value any
		if err := json.Unmarshal(raw, &value); err != nil {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func cloneDashboardWidgetData(data any) any {
	switch typed := data.(type) {
	case nil:
		return nil
	case map[string]any:
		return cloneAny(typed)
	case dashcmp.WidgetData:
		return cloneAny(map[string]any(typed))
	default:
		return data
	}
}

func dashboardPreferencesPayload(viewer dashcmp.ViewerContext, overrides dashcmp.LayoutOverrides, catalog dashcmp.CatalogSnapshot) map[string]any {
	return map[string]any{
		"viewer":            dashboardViewerPayload(viewer),
		"area_order":        dashboardAreaOrderPayload(overrides.AreaOrder, overrides.AreaRows),
		"layout_rows":       dashboardLayoutRowsPayload(overrides.AreaRows),
		"hidden_widget_ids": dashboardHiddenWidgetIDs(overrides.HiddenWidgets),
		"catalog":           catalog,
		"areas":             catalog.Areas,
		"definitions":       catalog.Definitions,
		"providers":         catalog.Providers,
	}
}

func dashboardLayoutOverridesToTyped(overrides DashboardLayoutOverrides, fallbackLocale string) dashcmp.LayoutOverrides {
	typed := dashcmp.LayoutOverrides{
		Locale:        overrides.Locale,
		AreaOrder:     cloneDashboardStringSliceMap(overrides.AreaOrder),
		AreaRows:      map[string][]dashcmp.LayoutRow{},
		HiddenWidgets: map[string]bool{},
	}
	if typed.Locale == "" {
		typed.Locale = fallbackLocale
	}
	for area, rows := range overrides.AreaRows {
		converted := make([]dashcmp.LayoutRow, 0, len(rows))
		for _, row := range rows {
			if len(row.Widgets) == 0 {
				continue
			}
			slots := make([]dashcmp.WidgetSlot, 0, len(row.Widgets))
			for _, slot := range row.Widgets {
				if strings.TrimSpace(slot.ID) == "" {
					continue
				}
				slots = append(slots, dashcmp.WidgetSlot{
					ID:    slot.ID,
					Width: slot.Width,
				})
			}
			if len(slots) > 0 {
				converted = append(converted, dashcmp.LayoutRow{Widgets: slots})
			}
		}
		if len(converted) > 0 {
			typed.AreaRows[area] = converted
		}
	}
	for id, hidden := range overrides.HiddenWidgets {
		if strings.TrimSpace(id) == "" || !hidden {
			continue
		}
		typed.HiddenWidgets[id] = true
	}
	return typed
}

func dashboardViewerPayload(viewer dashcmp.ViewerContext) map[string]any {
	payload := map[string]any{
		"user_id": viewer.UserID,
		"locale":  viewer.Locale,
	}
	if len(viewer.Roles) > 0 {
		payload["roles"] = append([]string{}, viewer.Roles...)
	}
	return payload
}

func normalizeDashboardAreaOrderInput(areaOrder map[string][]string, rows map[string][]dashcmp.LayoutRowInput) map[string][]string {
	normalized := cloneDashboardStringSliceMap(areaOrder)
	for area, areaRows := range rows {
		if len(normalized[area]) > 0 {
			continue
		}
		ordered := make([]string, 0)
		seen := map[string]struct{}{}
		for _, row := range areaRows {
			for _, widget := range row.Widgets {
				id := strings.TrimSpace(widget.ID)
				if id == "" {
					continue
				}
				if _, ok := seen[id]; ok {
					continue
				}
				seen[id] = struct{}{}
				ordered = append(ordered, id)
			}
		}
		if len(ordered) > 0 {
			normalized[area] = ordered
		}
	}
	return normalized
}

func dashboardAreaOrderPayload(areaOrder map[string][]string, rows map[string][]dashcmp.LayoutRow) map[string][]string {
	normalized := cloneDashboardStringSliceMap(areaOrder)
	for area, areaRows := range rows {
		if len(normalized[area]) > 0 {
			continue
		}
		ordered := make([]string, 0)
		seen := map[string]struct{}{}
		for _, row := range areaRows {
			for _, widget := range row.Widgets {
				id := strings.TrimSpace(widget.ID)
				if id == "" {
					continue
				}
				if _, ok := seen[id]; ok {
					continue
				}
				seen[id] = struct{}{}
				ordered = append(ordered, id)
			}
		}
		if len(ordered) > 0 {
			normalized[area] = ordered
		}
	}
	return normalized
}

func cloneDashboardStringSliceMap(in map[string][]string) map[string][]string {
	if len(in) == 0 {
		return map[string][]string{}
	}
	out := make(map[string][]string, len(in))
	for key, value := range in {
		copied := make([]string, len(value))
		copy(copied, value)
		out[key] = copied
	}
	return out
}

func dashboardLayoutRowsPayload(rows map[string][]dashcmp.LayoutRow) map[string]any {
	if len(rows) == 0 {
		return map[string]any{}
	}
	payload := make(map[string]any, len(rows))
	for area, areaRows := range rows {
		serialized := make([]map[string]any, 0, len(areaRows))
		for _, row := range areaRows {
			if len(row.Widgets) == 0 {
				continue
			}
			widgets := make([]map[string]any, 0, len(row.Widgets))
			for _, slot := range row.Widgets {
				if strings.TrimSpace(slot.ID) == "" {
					continue
				}
				widget := map[string]any{"id": slot.ID}
				if slot.Width > 0 {
					widget["width"] = slot.Width
				}
				widgets = append(widgets, widget)
			}
			if len(widgets) > 0 {
				serialized = append(serialized, map[string]any{"widgets": widgets})
			}
		}
		if len(serialized) > 0 {
			payload[area] = serialized
		}
	}
	return payload
}

func dashboardHiddenWidgetIDs(hidden map[string]bool) []string {
	if len(hidden) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(hidden))
	for id, isHidden := range hidden {
		if strings.TrimSpace(id) == "" || !isHidden {
			continue
		}
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

func legacyDashboardLayoutFromBody(body map[string]any) []DashboardWidgetInstance {
	if hasCanonicalDashboardPreferencesPayload(body) {
		return nil
	}
	layout, ok := body["layout"]
	if !ok {
		return nil
	}
	return expandDashboardLayout(layout)
}

func hasCanonicalDashboardPreferencesPayload(body map[string]any) bool {
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

func dashboardDiagnosticsPayload(report DashboardDiagnosticsReport) map[string]any {
	payload := map[string]any{
		"locale":             report.Locale,
		"viewer":             dashboardViewerPayload(report.Diagnostics.Viewer),
		"preferences":        dashboardPreferencesPayload(report.Diagnostics.Viewer, report.Diagnostics.Preferences, report.Catalog),
		"theme":              report.Diagnostics.Theme,
		"layout":             report.Diagnostics.Layout,
		"catalog":            report.Catalog,
		"areas":              report.Catalog.Areas,
		"providers":          report.Providers,
		"definitions":        report.Definitions,
		"instances":          report.Instances,
		"instances_by_area":  cloneDashboardIntMap(report.InstancesByArea),
		"resolved_by_area":   cloneDashboardIntMap(report.InstancesByArea),
		"widget_service":     report.WidgetService,
		"has_widget_service": report.HasWidgetService,
	}
	if report.Page != nil {
		payload["page"] = *report.Page
	}
	return payload
}

func cloneDashboardIntMap(in map[string]int) map[string]int {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]int, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}
