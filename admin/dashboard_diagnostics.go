package admin

import (
	"context"
	"fmt"
	"strings"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
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
	Locale           string                 `json:"locale"`
	Areas            []WidgetAreaDefinition `json:"areas"`
	Providers        int                    `json:"providers"`
	Definitions      int                    `json:"definitions"`
	Instances        int                    `json:"instances"`
	InstancesByArea  map[string]int         `json:"instances_by_area"`
	ResolvedByArea   map[string]int         `json:"resolved_by_area"`
	ResolveErrors    map[string]string      `json:"resolve_errors,omitempty"`
	WidgetService    string                 `json:"widget_service,omitempty"`
	HasWidgetService bool                   `json:"has_widget_service"`
}

type dashboardDiagnosticsQuery struct {
	admin *Admin
}

func (q *dashboardDiagnosticsQuery) Query(ctx context.Context, msg DashboardDiagnosticsMsg) (DashboardDiagnosticsReport, error) {
	if q == nil || q.admin == nil {
		return DashboardDiagnosticsReport{}, fmt.Errorf("dashboard diagnostics: admin not configured")
	}
	locale := strings.TrimSpace(msg.Locale)
	areaFilter := strings.TrimSpace(msg.Area)

	report := DashboardDiagnosticsReport{
		Locale:          locale,
		InstancesByArea: map[string]int{},
		ResolvedByArea:  map[string]int{},
		ResolveErrors:   map[string]string{},
	}

	if q.admin.widgetSvc != nil {
		report.HasWidgetService = true
		report.WidgetService = fmt.Sprintf("%T", q.admin.widgetSvc)
		report.Definitions = len(q.admin.widgetSvc.Definitions())
		if instances, err := q.admin.widgetSvc.ListInstances(ctx, WidgetInstanceFilter{}); err == nil {
			report.Instances = len(instances)
			for _, inst := range instances {
				area := strings.TrimSpace(inst.Area)
				if area == "" {
					area = "unassigned"
				}
				report.InstancesByArea[area]++
			}
		}
	}

	if q.admin.dashboard != nil {
		report.Providers = len(q.admin.dashboard.Providers())
		report.Areas = q.admin.dashboard.Areas()
	}
	if len(report.Areas) == 0 && q.admin.widgetSvc != nil {
		report.Areas = q.admin.widgetSvc.Areas()
	}

	if areaFilter != "" {
		filtered := []WidgetAreaDefinition{}
		for _, area := range report.Areas {
			if strings.EqualFold(area.Code, areaFilter) {
				filtered = append(filtered, area)
				break
			}
		}
		report.Areas = filtered
	}

	store := dashinternal.NewCMSWidgetStore(q.admin.widgetServiceAdapter())
	for _, area := range report.Areas {
		if store == nil {
			report.ResolveErrors[area.Code] = "widget store not configured"
			continue
		}
		resolved, err := store.ResolveArea(ctx, dashcmp.ResolveAreaInput{
			AreaCode: area.Code,
			Locale:   locale,
		})
		if err != nil {
			report.ResolveErrors[area.Code] = err.Error()
			continue
		}
		report.ResolvedByArea[area.Code] = len(resolved.Widgets)
	}

	if len(report.ResolveErrors) == 0 {
		report.ResolveErrors = nil
	}

	return report, nil
}
