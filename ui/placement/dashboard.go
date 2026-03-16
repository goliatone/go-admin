package placement

// DashboardPlacementKey identifies a built-in dashboard area slot.
type DashboardPlacementKey string

const (
	DashboardPlacementMain    DashboardPlacementKey = "main"
	DashboardPlacementSidebar DashboardPlacementKey = "sidebar"
	DashboardPlacementFooter  DashboardPlacementKey = "footer"
)

const (
	DashboardAreaCodeMain    = "admin.dashboard.main"
	DashboardAreaCodeSidebar = "admin.dashboard.sidebar"
	DashboardAreaCodeFooter  = "admin.dashboard.footer"
)

// DashboardAreaCodeForPlacement resolves a built-in dashboard placement to its canonical area code.
func DashboardAreaCodeForPlacement(placement DashboardPlacementKey, fallback string) string {
	switch placement {
	case DashboardPlacementMain:
		return DashboardAreaCodeMain
	case DashboardPlacementSidebar:
		return DashboardAreaCodeSidebar
	case DashboardPlacementFooter:
		return DashboardAreaCodeFooter
	default:
		if fallback != "" {
			return fallback
		}
		return DashboardAreaCodeMain
	}
}

// PreferredDashboardAreaCodes returns the built-in area order used when rendering layouts.
func PreferredDashboardAreaCodes() []string {
	return []string{
		DashboardAreaCodeForPlacement(DashboardPlacementMain, ""),
		DashboardAreaCodeForPlacement(DashboardPlacementSidebar, ""),
		DashboardAreaCodeForPlacement(DashboardPlacementFooter, ""),
	}
}
