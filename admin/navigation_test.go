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

	nav := NewNavigation(menuSvc, allowAll{})
	items := nav.Resolve(ctx, "en")
	if len(items) != 1 || items[0].Label != "Dashboard" {
		t.Fatalf("unexpected nav items: %+v", items)
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
		DefaultLocale:  "en",
		EnableSettings: true,
	}
	adm := New(cfg)
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

	nav.authorizer = denyAll{}
	secureFiltered := nav.Resolve(ctx, "en")
	for _, item := range secureFiltered {
		if item.Label == "Secure" {
			t.Fatalf("permissioned item should be filtered")
		}
	}
}
