package dashboard

import uiplacement "github.com/goliatone/go-admin/ui/placement"

// DefaultAreaDefinitions returns the built-in dashboard area definitions.
func DefaultAreaDefinitions() []WidgetAreaDefinition {
	return []WidgetAreaDefinition{
		{
			Code:  uiplacement.DashboardAreaCodeForPlacement(uiplacement.DashboardPlacementMain, ""),
			Name:  "Main Dashboard Area",
			Scope: "global",
		},
		{
			Code:  uiplacement.DashboardAreaCodeForPlacement(uiplacement.DashboardPlacementSidebar, ""),
			Name:  "Dashboard Sidebar",
			Scope: "global",
		},
		{
			Code:  uiplacement.DashboardAreaCodeForPlacement(uiplacement.DashboardPlacementFooter, ""),
			Name:  "Dashboard Footer",
			Scope: "global",
		},
	}
}
