package main

import (
	"context"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
	router "github.com/goliatone/go-router"
)

func TestCommerceModuleHonorsCustomDashboardPlacements(t *testing.T) {
	dataStores, err := stores.Seed(context.Background())
	if err != nil {
		t.Fatalf("seed stores: %v", err)
	}

	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{FeatureGate: featureGateFromDefaults(map[string]bool{
		"dashboard": true,
		"search":    true,
		"cms":       true,
		"commands":  true,
		"jobs":      true,
	})})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	customPlacements := quickstart.DefaultPlacements(admin.Config{NavMenuCode: cfg.NavMenuCode})
	customPlacements.Dashboards[uiplacement.DashboardPlacementMain] = quickstart.DashboardPlacementSpec{
		AreaCode: "admin.dashboard.commerce-main",
	}

	mod := &commerceModule{
		stores:        dataStores,
		basePath:      cfg.BasePath,
		menuCode:      cfg.NavMenuCode,
		defaultLocale: cfg.DefaultLocale,
		placements:    customPlacements,
	}
	if err := adm.RegisterModule(mod); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New()
	})
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize admin: %v", err)
	}

	providers := adm.Dashboard().Providers()
	if got := providerArea(providers, "commerce.widget.sales_overview"); got != "admin.dashboard.commerce-main" {
		t.Fatalf("expected commerce sales widget to use custom main area, got %q", got)
	}
}

func providerArea(providers []admin.DashboardProviderSpec, code string) string {
	for _, provider := range providers {
		if provider.Code == code {
			return provider.DefaultArea
		}
	}
	return ""
}
