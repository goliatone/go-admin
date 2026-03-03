package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSeedNavigationUsesCMSMenuServiceContract(t *testing.T) {
	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()

	err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "admin.main",
		Locale:   "en",
		Items: []admin.MenuItem{
			{
				ID:     "dashboard",
				Label:  "Dashboard",
				Locale: "en",
				Target: map[string]any{"slug": "dashboard"},
			},
		},
	})
	if err != nil {
		t.Fatalf("seed navigation: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil || len(menu.Items) != 1 {
		t.Fatalf("expected one seeded menu item, got %+v", menu)
	}
	if menu.Items[0].Label != "Dashboard" {
		t.Fatalf("expected seeded label Dashboard, got %q", menu.Items[0].Label)
	}
}

func TestSeedNavigationResetUsesMenuResetterWhenAvailable(t *testing.T) {
	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()

	err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "admin.main",
		Locale:   "en",
		Items: []admin.MenuItem{
			{ID: "dashboard", Label: "Dashboard", Locale: "en", Target: map[string]any{"slug": "dashboard"}},
			{ID: "content", Label: "Content", Locale: "en", Target: map[string]any{"slug": "content"}},
		},
	})
	if err != nil {
		t.Fatalf("seed navigation first pass: %v", err)
	}

	err = SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "admin.main",
		Locale:   "en",
		Reset:    true,
		Items: []admin.MenuItem{
			{ID: "dashboard", Label: "Dashboard", Locale: "en", Target: map[string]any{"slug": "dashboard"}},
		},
	})
	if err != nil {
		t.Fatalf("seed navigation second pass with reset: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil || len(menu.Items) != 1 {
		t.Fatalf("expected reset menu to contain one item, got %+v", menu)
	}
}

func TestSeedNavigationRejectsLocaleSuffixInMenuID(t *testing.T) {
	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()

	err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "site.main",
		Locale:   "es",
		Items: []admin.MenuItem{
			{
				ID:     "about.es",
				Label:  "Sobre Nosotros",
				Locale: "es",
				Target: map[string]any{"type": "url", "path": "/sobre-nosotros"},
			},
		},
	})
	if err == nil {
		t.Fatalf("expected locale-suffix menu id validation error")
	}
	if got := err.Error(); got == "" || !strings.Contains(got, "must not encode locale suffix") {
		t.Fatalf("unexpected validation error: %v", err)
	}
}
