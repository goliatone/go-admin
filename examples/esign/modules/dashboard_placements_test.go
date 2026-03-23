package modules

import (
	"context"
	"testing"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
	router "github.com/goliatone/go-router"
)

func TestESignModuleHonorsCustomDashboardPlacements(t *testing.T) {
	cfg := quickstart.NewAdminConfig("/admin", "E-Sign Test", "en")
	adm, _, err := quickstart.NewAdmin(
		cfg,
		quickstart.AdapterHooks{},
		quickstart.WithAdminContext(context.Background()),
		quickstart.WithFeatureDefaults(map[string]bool{"esign": true}),
		quickstart.WithRPCTransport(quickstart.RPCTransportConfig{Enabled: false}),
	)
	if err != nil {
		t.Fatalf("quickstart.NewAdmin: %v", err)
	}

	customPlacements := quickstart.DefaultPlacements(coreadmin.Config{NavMenuCode: cfg.NavMenuCode})
	customPlacements.Dashboards[uiplacement.DashboardPlacementMain] = quickstart.DashboardPlacementSpec{
		AreaCode: "admin.dashboard.esign-main",
	}
	customPlacements.Dashboards[uiplacement.DashboardPlacementSidebar] = quickstart.DashboardPlacementSpec{
		AreaCode: "admin.dashboard.esign-sidebar",
	}

	module := NewESignModule(cfg.BasePath, cfg.DefaultLocale, cfg.NavMenuCode).
		WithStore(stores.NewInMemoryStore()).
		WithPlacements(customPlacements)
	t.Cleanup(module.Close)
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("RegisterModule: %v", err)
	}
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("Initialize: %v", err)
	}

	providers := adm.Dashboard().Providers()
	if got := dashboardProviderArea(providers, "esign.widget.agreement_stats"); got != "admin.dashboard.esign-main" {
		t.Fatalf("expected agreement stats widget to use custom main area, got %q", got)
	}
	if got := dashboardProviderArea(providers, "esign.widget.delivery_health"); got != "admin.dashboard.esign-sidebar" {
		t.Fatalf("expected delivery health widget to use custom sidebar area, got %q", got)
	}
}

func dashboardProviderArea(providers []coreadmin.DashboardProviderSpec, code string) string {
	for _, provider := range providers {
		if provider.Code == code {
			return provider.DefaultArea
		}
	}
	return ""
}
