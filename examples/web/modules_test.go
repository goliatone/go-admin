package main

import (
	"testing"

	"github.com/goliatone/go-admin/examples/web/setup"
)

func TestDashboardModuleMenuItemsUsesSSRPath(t *testing.T) {
	module := &dashboardModule{
		menuCode:   setup.NavigationMenuCode,
		defaultLoc: "en",
		basePath:   "/admin",
		parentID:   setup.NavigationGroupMain,
	}

	items := module.MenuItems("en")
	if len(items) != 1 {
		t.Fatalf("expected 1 menu item, got %d", len(items))
	}

	targetPath, _ := items[0].Target["path"].(string)
	if targetPath != "/admin/dashboard" {
		t.Fatalf("expected dashboard path /admin/dashboard, got %q", targetPath)
	}
}
