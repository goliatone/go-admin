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
		BasePath:          "/admin",
		DefaultLocale:     "en",
		NavMenuCode:       "admin.main",
		SidebarHideSearch: true,
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
