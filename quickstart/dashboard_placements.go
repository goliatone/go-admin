package quickstart

import "github.com/goliatone/go-admin/admin"

const (
	defaultDashboardAreaMain    = "admin.dashboard.main"
	defaultDashboardAreaSidebar = "admin.dashboard.sidebar"
	defaultDashboardAreaFooter  = "admin.dashboard.footer"
)

// ResolveDashboardArea resolves a quickstart dashboard placement to a concrete area code.
func ResolveDashboardArea(placements PlacementConfig, placement PlacementKey, fallback string) string {
	return placements.DashboardAreaFor(placement, fallback)
}

// DefaultDashboardArea resolves a quickstart dashboard placement using quickstart defaults.
func DefaultDashboardArea(placement PlacementKey) string {
	return ResolveDashboardArea(DefaultPlacements(admin.Config{}), placement, defaultDashboardAreaMain)
}
