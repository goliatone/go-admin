package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestNavigationResolve(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{
		Label:       "Dashboard",
		Target:      map[string]any{"type": "route", "name": "admin.dashboard"},
		Locale:      "en",
		Permissions: []string{"nav.view"},
	})

	nav := NewNavigation(menuSvc, allowAllNav{})
	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Dashboard" {
		t.Fatalf("unexpected nav items: %+v", items)
	}
}

func TestNavigationResolveMenuCode(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "Main", Locale: "en"})
	_, _ = menuSvc.CreateMenu(ctx, "admin.reports")
	_ = menuSvc.AddMenuItem(ctx, "admin.reports", MenuItem{Label: "Reports", Locale: "en"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	nav.SetDefaultMenuCode("admin.main")

	mainItems := nav.Resolve(ctx, "en")
	if len(mainItems) != 1 || mainItems[0].Label != "Main" {
		t.Fatalf("unexpected main items: %+v", mainItems)
	}

	reportItems := nav.ResolveMenu(ctx, "admin.reports", "en")
	if len(reportItems) != 1 || reportItems[0].Label != "Reports" {
		t.Fatalf("unexpected report items: %+v", reportItems)
	}
}

func TestNavigationResolvesMenuLocaleFromCMS(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "Dashboard", Locale: "en"})
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "Inicio", Locale: "es"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	en := nav.Resolve(ctx, "en")
	if len(en) != 1 || en[0].Label != "Dashboard" {
		t.Fatalf("expected english menu item, got %+v", en)
	}
	es := nav.Resolve(ctx, "es")
	if len(es) != 1 || es[0].Label != "Inicio" {
		t.Fatalf("expected spanish menu item, got %+v", es)
	}
}

func TestNavigationFallbackWhenCMSDisabled(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")
	_ = menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "CMS Item", Locale: "en"})

	nav := NewNavigation(menuSvc, allowAllNav{})
	nav.UseCMS(false)
	nav.AddFallback(NavigationItem{Label: "Fallback Item", Locale: "en"})

	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Fallback Item" {
		t.Fatalf("expected fallback navigation, got %+v", items)
	}
}

func TestAdminNavigationUsesFallbackWithoutCMSFeature(t *testing.T) {
	cfg := Config{
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	ctx := context.Background()

	_, _ = adm.menuSvc.CreateMenu(ctx, "admin.main")
	_ = adm.menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "CMS Item", Locale: "en"})

	if err := adm.addMenuItems(ctx, []MenuItem{{Label: "Fallback Item", Locale: "en"}}); err != nil {
		t.Fatalf("add menu items failed: %v", err)
	}

	items := adm.nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Fallback Item" {
		t.Fatalf("expected fallback navigation when CMS is disabled, got %+v", items)
	}
}

type denySettingsNav struct{}

func (denySettingsNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	if action == "admin.settings.view" && resource == "navigation" {
		return false
	}
	return true
}

func TestSettingsNavigationPermissionFilters(t *testing.T) {
	cfg := Config{
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureSettings)})
	adm.WithAuthorizer(denySettingsNav{})

	if err := adm.Initialize(router.NewHTTPServer().Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	items := adm.nav.Resolve(context.Background(), "en")
	for _, item := range items {
		if item.Label == "Settings" {
			t.Fatalf("expected settings item to be filtered by permissions")
		}
	}
}

func TestNavigationFallbackLocaleAndPermissions(t *testing.T) {
	nav := NewNavigation(nil, allowAll{})
	nav.AddItem(NavigationItem{Label: "Home", Locale: "en"})
	nav.AddItem(NavigationItem{Label: "Inicio", Locale: "es"})
	nav.AddItem(NavigationItem{Label: "Secure", Permissions: []string{"nav.secure"}})

	ctx := context.Background()
	en := nav.Resolve(ctx, "en")
	if len(en) != 2 || en[0].Label != "Home" {
		t.Fatalf("expected english items, got %+v", en)
	}
	es := nav.Resolve(ctx, "es")
	if len(es) != 2 || es[0].Label != "Inicio" {
		t.Fatalf("expected spanish item first, got %+v", es)
	}

	nav.SetAuthorizer(denyAllNav{})
	secureFiltered := nav.Resolve(ctx, "en")
	for _, item := range secureFiltered {
		if item.Label == "Secure" {
			t.Fatalf("permissioned item should be filtered")
		}
	}
}

type allowAllNav struct{}

func (allowAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

type denyAllNav struct{}

func (denyAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return false
}
