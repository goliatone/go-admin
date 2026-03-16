package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
)

func TestResolveDashboardAreaResolvesSharedDashboardPlacements(t *testing.T) {
	placements := DefaultPlacements(admin.Config{NavMenuCode: "admin.main"})
	if got := ResolveDashboardArea(placements, uiplacement.DashboardPlacementMain, ""); got != uiplacement.DashboardAreaCodeMain {
		t.Fatalf("expected main area %q, got %q", uiplacement.DashboardAreaCodeMain, got)
	}
	if got := ResolveDashboardArea(placements, uiplacement.DashboardPlacementSidebar, ""); got != uiplacement.DashboardAreaCodeSidebar {
		t.Fatalf("expected sidebar area %q, got %q", uiplacement.DashboardAreaCodeSidebar, got)
	}
	if got := ResolveDashboardArea(placements, uiplacement.DashboardPlacementFooter, ""); got != uiplacement.DashboardAreaCodeFooter {
		t.Fatalf("expected footer area %q, got %q", uiplacement.DashboardAreaCodeFooter, got)
	}
}

func TestResolveDashboardAreaUsesConfigOverrides(t *testing.T) {
	placements := PlacementConfig{
		Dashboards: map[uiplacement.DashboardPlacementKey]DashboardPlacementSpec{
			uiplacement.DashboardPlacementMain: {
				AreaCode: "admin.dashboard.custom-main",
			},
		},
	}
	if got := ResolveDashboardArea(placements, uiplacement.DashboardPlacementMain, uiplacement.DashboardAreaCodeMain); got != "admin.dashboard.custom-main" {
		t.Fatalf("expected overridden main area, got %q", got)
	}
}
