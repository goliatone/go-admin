package admin

import (
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestDashboardPageAreaByCodePrefersAreaCodeAndFallsBackToSlot(t *testing.T) {
	page := dashcmp.Page{
		Areas: []dashcmp.PageArea{
			{Slot: "main", Code: "admin.dashboard.main"},
			{Slot: "profile", Code: "admin.users.detail.profile"},
		},
	}

	area, ok := DashboardPageAreaByCode(page, "admin.users.detail.profile")
	if !ok {
		t.Fatalf("expected area lookup by code to succeed")
	}
	if area.Code != "admin.users.detail.profile" {
		t.Fatalf("expected profile code, got %+v", area)
	}

	area, ok = DashboardPageAreaByCode(page, "main")
	if !ok {
		t.Fatalf("expected area lookup by slot fallback to succeed")
	}
	if area.Code != "admin.dashboard.main" {
		t.Fatalf("expected main area code, got %+v", area)
	}
}

func TestDashboardPageWidgetsForAreaCodeReturnsTypedFrames(t *testing.T) {
	page := dashcmp.Page{
		Areas: []dashcmp.PageArea{
			{
				Slot: "profile",
				Code: "admin.users.detail.profile",
				Widgets: []dashcmp.WidgetFrame{
					{ID: "w1", Definition: WidgetUserProfileOverview, Area: "admin.users.detail.profile", Span: 12},
				},
			},
		},
	}

	widgets := DashboardPageWidgetsForAreaCode(page, "admin.users.detail.profile")
	if len(widgets) != 1 {
		t.Fatalf("expected one widget frame, got %+v", widgets)
	}
	if widgets[0].Definition != WidgetUserProfileOverview {
		t.Fatalf("expected profile widget definition, got %+v", widgets[0])
	}

	widgets[0].Definition = "mutated"
	again := DashboardPageWidgetsForAreaCode(page, "admin.users.detail.profile")
	if again[0].Definition != WidgetUserProfileOverview {
		t.Fatalf("expected helper to return copied frames, got %+v", again[0])
	}
}
