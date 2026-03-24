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
