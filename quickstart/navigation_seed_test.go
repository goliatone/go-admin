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

func TestSeedNavigationReconcileForwardsAllowDestructive(t *testing.T) {
	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()

	err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "admin.main",
		Locale:   "en",
		Items: []admin.MenuItem{
			{
				ID:     "legacy.queue",
				Label:  "Legacy Queue",
				Locale: "en",
				Target: map[string]any{
					"type": "url",
					"path": "/admin/translations/queue",
					"key":  "translation_queue",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("seed legacy navigation: %v", err)
	}

	var report NavigationReconcileReport
	err = SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:             menuSvc,
		MenuCode:            "admin.main",
		Locale:              "en",
		Reconcile:           true,
		AllowDestructive:    true,
		Reportf:             func(r NavigationReconcileReport) { report = r },
		AutoCreateParents:   false,
		CapabilityOmissions: nil,
		Items: []admin.MenuItem{
			{
				ID:     "translations.queue",
				Label:  "Queue",
				Locale: "en",
				Target: map[string]any{
					"type": "url",
					"path": "/admin/translations/queue",
					"key":  "translation_queue",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("reconcile navigation: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	items := flattenReconcileMenuItems(menu.Items)
	if hasMenuItemID(items, "admin_main.legacy.queue") {
		t.Fatalf("expected destructive reconcile to remove legacy row; report=%#v", report)
	}
	if !hasMenuItemID(items, "admin_main.translations.queue") {
		t.Fatalf("expected destructive reconcile to create canonical row; items=%#v report=%#v", items, report)
	}
	if !containsStringWithSuffix(report.DestructiveCandidates, "legacy.queue") {
		t.Fatalf("expected legacy row destructive candidate, got %#v", report.DestructiveCandidates)
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

func hasMenuItemID(items []admin.MenuItem, id string) bool {
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(item.ID), strings.TrimSpace(id)) {
			return true
		}
	}
	return false
}
