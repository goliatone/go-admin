package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestBuildAdminLayoutViewContextIncludesUtilityNavItems(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureSettings, FeatureCMS)})

	ctx := context.Background()
	if _, err := adm.MenuService().CreateMenu(ctx, defaultSidebarUtilityMenuCode); err != nil {
		t.Fatalf("create utility menu: %v", err)
	}
	if err := adm.MenuService().AddMenuItem(ctx, defaultSidebarUtilityMenuCode, MenuItem{
		ID:       "utility.settings",
		Label:    "Settings",
		Icon:     "settings",
		Locale:   cfg.DefaultLocale,
		Position: new(10),
		Target: map[string]any{
			"type": "url",
			"path": "/admin/settings",
			"key":  "settings",
		},
	}); err != nil {
		t.Fatalf("seed utility settings item: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	view := buildAdminLayoutViewContext(adm, nil, nil, "preferences")
	utilityItems, ok := view["nav_utility_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_utility_items slice, got %T", view["nav_utility_items"])
	}
	if len(utilityItems) == 0 {
		t.Fatalf("expected at least one utility nav item")
	}
	found := false
	for _, item := range utilityItems {
		if item["label"] == "Settings" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected utility nav label Settings, got %+v", utilityItems)
	}
}

func TestBuildAdminLayoutViewContextIncludesShellConfiguration(t *testing.T) {
	cfg := Config{
		BasePath:                     "/admin",
		DefaultLocale:                "en",
		NavMenuCode:                  "admin.main",
		SidebarHideSearch:            true,
		SidebarCollapsePlacement:     SidebarCollapsePlacementFooter,
		SidebarUseInitialsAvatar:     true,
		SidebarHidePresence:          true,
		SidebarHideUserMenuIndicator: true,
		SidebarCompactFooter:         true,
		ExternalAssets: ExternalAssetConfig{
			IconoirCSS:    " https://assets.example/iconoir.css ",
			DataTablesCSS: " https://assets.example/datatables.css ",
			EChartsJS:     " https://assets.example/echarts.js ",
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	view := buildAdminLayoutViewContext(adm, nil, nil, "")

	if hide, ok := view["sidebar_hide_search"].(bool); !ok || !hide {
		t.Fatalf("expected sidebar_hide_search=true, got %#v", view["sidebar_hide_search"])
	}
	if got := view["sidebar_collapse_placement"]; got != "footer" {
		t.Fatalf("expected footer collapse placement, got %#v", got)
	}
	for _, key := range []string{
		"sidebar_compact_footer",
		"sidebar_hide_presence",
		"sidebar_hide_user_menu_indicator",
	} {
		if enabled, ok := view[key].(bool); !ok || !enabled {
			t.Fatalf("expected %s=true, got %#v", key, view[key])
		}
	}
	sessionUser, ok := view["session_user"].(map[string]any)
	if !ok || sessionUser["avatar_url"] != "" {
		t.Fatalf("expected initials avatar session projection, got %#v", view["session_user"])
	}
	externalAssets, ok := view["external_assets"].(map[string]string)
	if !ok {
		t.Fatalf("expected external_assets map, got %T", view["external_assets"])
	}
	if externalAssets["iconoir_css"] != "https://assets.example/iconoir.css" ||
		externalAssets["datatables_css"] != "https://assets.example/datatables.css" ||
		externalAssets["echarts_js"] != "https://assets.example/echarts.js" {
		t.Fatalf("unexpected external assets: %+v", externalAssets)
	}
}

func TestNormalizeSidebarCollapsePlacementPreservesLegacyHeaderDefault(t *testing.T) {
	for _, input := range []SidebarCollapsePlacement{"", "unknown", " HEADER "} {
		if got := NormalizeSidebarCollapsePlacement(input); got != SidebarCollapsePlacementHeader {
			t.Fatalf("NormalizeSidebarCollapsePlacement(%q) = %q", input, got)
		}
	}
	if got := NormalizeSidebarCollapsePlacement(" FOOTER "); got != SidebarCollapsePlacementFooter {
		t.Fatalf("footer placement = %q", got)
	}
}
