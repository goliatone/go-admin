package quickstart

import uiplacement "github.com/goliatone/go-admin/ui/placement"

// ResolveDashboardArea resolves a quickstart dashboard placement to a concrete area code.
func ResolveDashboardArea(placements PlacementConfig, placement uiplacement.DashboardPlacementKey, fallback string) string {
	return placements.DashboardAreaFor(placement, fallback)
}
