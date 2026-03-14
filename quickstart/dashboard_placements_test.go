package quickstart

import "testing"

func TestDefaultDashboardAreaResolvesQuickstartPlacements(t *testing.T) {
	if got := DefaultDashboardArea(DashboardPlacementMain); got != "admin.dashboard.main" {
		t.Fatalf("expected main area admin.dashboard.main, got %q", got)
	}
	if got := DefaultDashboardArea(DashboardPlacementSidebar); got != "admin.dashboard.sidebar" {
		t.Fatalf("expected sidebar area admin.dashboard.sidebar, got %q", got)
	}
	if got := DefaultDashboardArea(DashboardPlacementFooter); got != "admin.dashboard.footer" {
		t.Fatalf("expected footer area admin.dashboard.footer, got %q", got)
	}
}
