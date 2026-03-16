package placement

import "testing"

func TestDashboardAreaCodeForPlacementUsesCanonicalCodes(t *testing.T) {
	if got := DashboardAreaCodeForPlacement(DashboardPlacementMain, ""); got != DashboardAreaCodeMain {
		t.Fatalf("expected main placement to resolve to %q, got %q", DashboardAreaCodeMain, got)
	}
	if got := DashboardAreaCodeForPlacement(DashboardPlacementSidebar, ""); got != DashboardAreaCodeSidebar {
		t.Fatalf("expected sidebar placement to resolve to %q, got %q", DashboardAreaCodeSidebar, got)
	}
	if got := DashboardAreaCodeForPlacement(DashboardPlacementFooter, ""); got != DashboardAreaCodeFooter {
		t.Fatalf("expected footer placement to resolve to %q, got %q", DashboardAreaCodeFooter, got)
	}
	if got := DashboardAreaCodeForPlacement(DashboardPlacementKey("custom"), "admin.custom"); got != "admin.custom" {
		t.Fatalf("expected fallback area for unknown placement, got %q", got)
	}
}

func TestPreferredDashboardAreaCodesPreserveCanonicalOrder(t *testing.T) {
	preferred := PreferredDashboardAreaCodes()
	expected := []string{DashboardAreaCodeMain, DashboardAreaCodeSidebar, DashboardAreaCodeFooter}
	if len(preferred) != len(expected) {
		t.Fatalf("expected %d preferred areas, got %d", len(expected), len(preferred))
	}
	for idx, code := range preferred {
		if code != expected[idx] {
			t.Fatalf("expected preferred area %d to be %q, got %q", idx, expected[idx], code)
		}
	}
}
