package dashboard

// AreaPlacement identifies a built-in dashboard area slot.
type AreaPlacement string

const (
	PlacementMain    AreaPlacement = "main"
	PlacementSidebar AreaPlacement = "sidebar"
	PlacementFooter  AreaPlacement = "footer"
)

const (
	AreaCodeMain    = "admin.dashboard.main"
	AreaCodeSidebar = "admin.dashboard.sidebar"
	AreaCodeFooter  = "admin.dashboard.footer"
)

// AreaCodeForPlacement resolves a built-in dashboard placement to its canonical area code.
func AreaCodeForPlacement(placement AreaPlacement, fallback string) string {
	switch placement {
	case PlacementMain:
		return AreaCodeMain
	case PlacementSidebar:
		return AreaCodeSidebar
	case PlacementFooter:
		return AreaCodeFooter
	default:
		if fallback != "" {
			return fallback
		}
		return AreaCodeMain
	}
}

// PreferredAreaCodes returns the built-in area order used when rendering layouts.
func PreferredAreaCodes() []string {
	return []string{
		AreaCodeForPlacement(PlacementMain, ""),
		AreaCodeForPlacement(PlacementSidebar, ""),
		AreaCodeForPlacement(PlacementFooter, ""),
	}
}

// DefaultAreaDefinitions returns the built-in dashboard area definitions.
func DefaultAreaDefinitions() []WidgetAreaDefinition {
	return []WidgetAreaDefinition{
		{
			Code:  AreaCodeForPlacement(PlacementMain, ""),
			Name:  "Main Dashboard Area",
			Scope: "global",
		},
		{
			Code:  AreaCodeForPlacement(PlacementSidebar, ""),
			Name:  "Dashboard Sidebar",
			Scope: "global",
		},
		{
			Code:  AreaCodeForPlacement(PlacementFooter, ""),
			Name:  "Dashboard Footer",
			Scope: "global",
		},
	}
}
