package admin

import (
	"context"
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
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

func TestDashboardPagePreservesCustomAreasAndControllerDecorationAfterInitialize(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Admin",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	adm.WithAuthorizer(allowAll{})
	adm.Dashboard().RegisterArea(WidgetAreaDefinition{
		Code: "admin.users.detail.profile",
		Name: "User Profile",
	})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if err := adm.ensureDashboard(context.Background()); err != nil {
		t.Fatalf("ensure dashboard: %v", err)
	}
	if adm.Dashboard().components == nil || !adm.Dashboard().components.hostConfigured {
		t.Fatalf("expected initialized dashboard runtime to be host-configured")
	}

	ctx := AdminContext{
		Context: withAdminDashboardChrome(context.Background(), AdminChromeState{
			Title:    "User Detail",
			BasePath: "/admin",
		}),
		UserID: "user-1",
		Locale: "en",
	}

	page, err := adm.Dashboard().Page(ctx)
	if err != nil {
		t.Fatalf("resolve page: %v", err)
	}

	if _, ok := DashboardPageAreaByCode(page, "admin.users.detail.profile"); !ok {
		t.Fatalf("expected custom profile area to remain available after initialize, got %+v", page.Areas)
	}

	composed := ComposeAdminDashboardPage(page)
	if composed.Title() != "User Detail" {
		t.Fatalf("expected controller decoration title to round-trip, got %q", composed.Title())
	}
	if composed.Chrome.BasePath != "/admin" {
		t.Fatalf("expected controller decoration chrome base path, got %+v", composed.Chrome)
	}
}

func TestAdminDashboardPageChromeNormalizationPrecedence(t *testing.T) {
	tests := []struct {
		name string
		page AdminDashboardPage
		want string
	}{
		{name: "typed page", page: AdminDashboardPage{Dashboard: dashcmp.Page{Title: "Dashboard page"}, Chrome: AdminChromeState{
			Page:       AdminPageChrome{Header: AdminPageHeader{Title: "Typed"}},
			PageHeader: AdminPageHeader{Title: "Legacy header"}, Title: "Legacy title",
		}}, want: "Typed"},
		{name: "legacy header", page: AdminDashboardPage{Dashboard: dashcmp.Page{Title: "Dashboard page"}, Chrome: AdminChromeState{
			PageHeader: AdminPageHeader{Title: "Legacy header"}, Title: "Legacy title",
		}}, want: "Legacy header"},
		{name: "legacy title", page: AdminDashboardPage{Dashboard: dashcmp.Page{Title: "Dashboard page"}, Chrome: AdminChromeState{
			Title: "Legacy title",
		}}, want: "Legacy title"},
		{name: "dashboard page", page: AdminDashboardPage{Dashboard: dashcmp.Page{Title: "Dashboard page"}}, want: "Dashboard page"},
		{name: "default", page: AdminDashboardPage{}, want: "Dashboard"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := test.page.PageChrome().Header.Title; got != test.want {
				t.Fatalf("expected title %q, got %q", test.want, got)
			}
		})
	}
}

func TestAdminDashboardPageChromeNormalizesRemainingLegacyFields(t *testing.T) {
	page := AdminDashboardPage{Chrome: AdminChromeState{
		Page: AdminPageChrome{Header: AdminPageHeader{Title: "Typed"}},
		PageHeader: AdminPageHeader{
			Pretitle: "Workspace", Subtitle: "Current activity",
			Breadcrumbs:     []AdminPageHeaderBreadcrumb{{Label: "Dashboard", Current: true}},
			HideBreadcrumbs: true,
		},
		Active: "dashboard", BodyClasses: "dashboard-page",
	}}
	chrome := page.PageChrome()
	if chrome.Header.Pretitle != "Workspace" || chrome.Header.Subtitle != "Current activity" ||
		len(chrome.Header.Breadcrumbs) != 1 || !chrome.Header.HideBreadcrumbs ||
		chrome.Active != "dashboard" || chrome.BodyClasses != "dashboard-page" {
		t.Fatalf("legacy presentation fields did not normalize through Page: %+v", chrome)
	}
}
