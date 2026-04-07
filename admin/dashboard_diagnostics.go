package admin

import (
	"context"
	"fmt"
	"strings"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

const dashboardDiagnosticsCommandName = "admin.dashboard.diagnostics"

// DashboardDiagnosticsMsg requests dashboard diagnostics for a locale/area.
type DashboardDiagnosticsMsg struct {
	Locale string `json:"locale,omitempty"`
	Area   string `json:"area,omitempty"`
}

// Type identifies the dashboard diagnostics query.
func (DashboardDiagnosticsMsg) Type() string { return dashboardDiagnosticsCommandName }

// DashboardDiagnosticsReport captures resolved dashboard state for troubleshooting.
type DashboardDiagnosticsReport struct {
	Locale           string                       `json:"locale"`
	Diagnostics      dashcmp.DashboardDiagnostics `json:"diagnostics"`
	Catalog          dashcmp.CatalogSnapshot      `json:"catalog"`
	Page             *AdminDashboardPage          `json:"page,omitempty"`
	Providers        int                          `json:"providers"`
	Definitions      int                          `json:"definitions"`
	Instances        int                          `json:"instances"`
	InstancesByArea  map[string]int               `json:"instances_by_area"`
	WidgetService    string                       `json:"widget_service,omitempty"`
	HasWidgetService bool                         `json:"has_widget_service"`
}

type dashboardDiagnosticsQuery struct {
	admin *Admin
}

func (q *dashboardDiagnosticsQuery) Query(ctx context.Context, msg DashboardDiagnosticsMsg) (DashboardDiagnosticsReport, error) {
	if q == nil || q.admin == nil {
		return DashboardDiagnosticsReport{}, serviceNotConfiguredDomainError("admin", map[string]any{"component": "dashboard_diagnostics"})
	}

	locale := strings.TrimSpace(msg.Locale)
	areaFilter := strings.TrimSpace(msg.Area)
	report := DashboardDiagnosticsReport{
		Locale:          locale,
		InstancesByArea: map[string]int{},
	}

	if q.admin.widgetSvc != nil {
		report.HasWidgetService = true
		report.WidgetService = fmt.Sprintf("%T", q.admin.widgetSvc)
	}

	if err := q.admin.ensureDashboard(ctx); err != nil {
		return DashboardDiagnosticsReport{}, err
	}
	if q.admin.dash == nil || q.admin.dash.runtime == nil {
		return report, nil
	}

	viewer := dashcmp.ViewerContext{
		UserID: actorFromContext(ctx),
		Locale: locale,
	}
	diagnostics, err := q.admin.dash.runtime.Controller.Diagnostics(ctx, viewer)
	if err != nil {
		return DashboardDiagnosticsReport{}, err
	}
	if areaFilter != "" {
		diagnostics = filterDashboardDiagnosticsArea(diagnostics, areaFilter)
	}

	report.Diagnostics = diagnostics
	if diagnostics.Page != nil {
		composed := ComposeAdminDashboardPage(*diagnostics.Page)
		report.Page = &composed
	}

	registry, _ := q.admin.dashboard.providerSnapshot()
	report.Catalog = registry.Catalog()
	report.Providers = len(report.Catalog.Providers)
	report.Definitions = len(report.Catalog.Definitions)
	for _, area := range diagnostics.Layout.Areas {
		report.InstancesByArea[area.Code] = len(area.Widgets)
		report.Instances += len(area.Widgets)
	}

	return report, nil
}

func filterDashboardDiagnosticsArea(diagnostics dashcmp.DashboardDiagnostics, areaCode string) dashcmp.DashboardDiagnostics {
	filter := strings.TrimSpace(areaCode)
	if filter == "" {
		return diagnostics
	}

	layoutAreas := make([]dashcmp.AreaDiagnostics, 0, len(diagnostics.Layout.Areas))
	for _, area := range diagnostics.Layout.Areas {
		if strings.EqualFold(area.Code, filter) {
			layoutAreas = append(layoutAreas, area)
			break
		}
	}
	diagnostics.Layout.Areas = layoutAreas

	if diagnostics.Page != nil {
		page := *diagnostics.Page
		filteredAreas := make([]dashcmp.PageArea, 0, len(page.Areas))
		for _, area := range page.Areas {
			if strings.EqualFold(area.Code, filter) || strings.EqualFold(area.Slot, filter) {
				filteredAreas = append(filteredAreas, area)
			}
		}
		page.Areas = filteredAreas
		diagnostics.Page = &page
	}

	return diagnostics
}
