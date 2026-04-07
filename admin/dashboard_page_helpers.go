package admin

import (
	"strings"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

// DashboardPageAreaByCode resolves an area by canonical area code first and
// falls back to slot matching when callers only know the page slot.
func DashboardPageAreaByCode(page dashcmp.Page, areaCode string) (dashcmp.PageArea, bool) {
	needle := strings.TrimSpace(areaCode)
	if needle == "" {
		return dashcmp.PageArea{}, false
	}
	for _, area := range page.Areas {
		if strings.EqualFold(area.Code, needle) {
			return area, true
		}
	}
	for _, area := range page.Areas {
		if strings.EqualFold(area.Slot, needle) {
			return area, true
		}
	}
	return dashcmp.PageArea{}, false
}

// DashboardPageWidgetsForAreaCode returns a copy of the widget frames rendered
// for a canonical area code.
func DashboardPageWidgetsForAreaCode(page dashcmp.Page, areaCode string) []dashcmp.WidgetFrame {
	area, ok := DashboardPageAreaByCode(page, areaCode)
	if !ok || len(area.Widgets) == 0 {
		return nil
	}
	out := make([]dashcmp.WidgetFrame, len(area.Widgets))
	copy(out, area.Widgets)
	return out
}
