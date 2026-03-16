package setup

import (
	"testing"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
)

func TestSetupDashboardHonorsCustomPlacements(t *testing.T) {
	adm, err := admin.New(admin.Config{BasePath: "/admin", DefaultLocale: "en"}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	customPlacements := quickstart.DefaultPlacements(admin.Config{NavMenuCode: "admin.main"})
	customPlacements.Dashboards[uiplacement.DashboardPlacementMain] = quickstart.DashboardPlacementSpec{
		AreaCode: "admin.dashboard.custom-main",
	}
	customPlacements.Dashboards[uiplacement.DashboardPlacementSidebar] = quickstart.DashboardPlacementSpec{
		AreaCode: "admin.dashboard.custom-sidebar",
	}

	SetupDashboard(adm, &stores.DataStores{}, "/admin", customPlacements)

	providers := adm.Dashboard().Providers()
	if got := providerArea(providers, admin.WidgetContentStats); got != "admin.dashboard.custom-main" {
		t.Fatalf("expected content stats widget to use custom main area, got %q", got)
	}
	if got := providerArea(providers, admin.WidgetSystemHealth); got != "admin.dashboard.custom-sidebar" {
		t.Fatalf("expected system health widget to use custom sidebar area, got %q", got)
	}
	if got := providerArea(providers, admin.WidgetPieChart); got != "admin.dashboard.custom-sidebar" {
		t.Fatalf("expected pie chart widget to use custom sidebar area, got %q", got)
	}
}

func providerArea(providers []admin.DashboardProviderSpec, code string) string {
	for _, provider := range providers {
		if provider.Code == code {
			return provider.DefaultArea
		}
	}
	return ""
}
