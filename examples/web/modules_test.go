package main

import (
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
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

func TestExampleModulesExposeRouteContracts(t *testing.T) {
	t.Run("dashboard", func(t *testing.T) {
		provider, ok := any(&dashboardModule{}).(coreadmin.RouteContractProvider)
		if !ok {
			t.Fatalf("expected dashboardModule to implement coreadmin.RouteContractProvider")
		}
		contract := provider.RouteContract()
		if contract.Slug != "dashboard" {
			t.Fatalf("expected dashboard slug, got %q", contract.Slug)
		}
		if got := contract.UIRoutes[dashboardModuleRouteKey]; got != "/dashboard" {
			t.Fatalf("expected dashboard route /dashboard, got %q", got)
		}
	})

	t.Run("media", func(t *testing.T) {
		provider, ok := any(&mediaModule{}).(coreadmin.RouteContractProvider)
		if !ok {
			t.Fatalf("expected mediaModule to implement coreadmin.RouteContractProvider")
		}
		contract := provider.RouteContract()
		if contract.Slug != "media" {
			t.Fatalf("expected media slug, got %q", contract.Slug)
		}
		if got := contract.UIRoutes[mediaModuleRouteKey]; got != "/media" {
			t.Fatalf("expected media route /media, got %q", got)
		}
	})
}
