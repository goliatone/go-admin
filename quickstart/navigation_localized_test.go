package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestSeedLocalizedNavigationAppliesLocalizedTranslations(t *testing.T) {
	ctx := context.Background()
	menuSvc := &localizedMenuServiceStub{}

	err := SeedLocalizedNavigation(ctx, SeedLocalizedNavigationOptions{
		MenuSvc:       menuSvc,
		MenuCode:      "site.main",
		DefaultLocale: "en",
		Items: []LocalizedSeedMenuItem{
			{
				Item: admin.MenuItem{
					ID:     "about",
					Type:   admin.MenuItemTypeItem,
					Target: map[string]any{"type": "url", "path": "/about"},
				},
				Translations: []LocalizedMenuItemTranslation{
					{Locale: "en", Label: "About", URLOverride: "/about"},
					{Locale: "es", Label: "Sobre Nosotros", URLOverride: "/sobre-nosotros"},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("seed localized navigation: %v", err)
	}

	if len(menuSvc.added) != 1 {
		t.Fatalf("expected one canonical add, got %d", len(menuSvc.added))
	}
	if got := strings.TrimSpace(menuSvc.added[0].ID); got != "site_main.about" {
		t.Fatalf("expected canonical item path site_main.about, got %q", got)
	}

	if len(menuSvc.updated) != 2 {
		t.Fatalf("expected translation updates for en+es, got %d", len(menuSvc.updated))
	}
	var esUpdate admin.MenuItem
	foundES := false
	for _, update := range menuSvc.updated {
		if strings.EqualFold(update.Locale, "es") {
			esUpdate = update
			foundES = true
			break
		}
	}
	if !foundES {
		t.Fatalf("expected es translation update in %+v", menuSvc.updated)
	}
	if strings.TrimSpace(esUpdate.Label) != "Sobre Nosotros" {
		t.Fatalf("expected es label Sobre Nosotros, got %q", esUpdate.Label)
	}
	if esUpdate.URLOverride == nil || strings.TrimSpace(*esUpdate.URLOverride) != "/sobre-nosotros" {
		t.Fatalf("expected es URL override /sobre-nosotros, got %+v", esUpdate.URLOverride)
	}
}

func TestMigrateLegacyLocalizedMenuItemsMovesTranslationsAndDeletesSuffixNodes(t *testing.T) {
	ctx := context.Background()
	menuSvc := &localizedMenuServiceStub{
		menusByLocale: map[string]*admin.Menu{
			"es": {
				Code: "site_main",
				Items: []admin.MenuItem{
					{ID: "site_main.about", Label: "About", Target: map[string]any{"type": "url", "path": "/about"}},
					{ID: "site_main.about.es", Label: "Sobre Nosotros", Target: map[string]any{"type": "url", "path": "/sobre-nosotros"}},
				},
			},
		},
	}

	report, err := MigrateLegacyLocalizedMenuItems(ctx, LegacyLocalizedMenuMigrationOptions{
		MenuSvc:  menuSvc,
		MenuCode: "site.main",
		Locales:  []string{"en", "es"},
	})
	if err != nil {
		t.Fatalf("migrate legacy localized menu items: %v", err)
	}
	if report.MigratedTranslations != 1 {
		t.Fatalf("expected one migrated translation, got %+v", report)
	}
	if report.DeletedLegacyItems != 1 {
		t.Fatalf("expected one deleted legacy item, got %+v", report)
	}

	if len(menuSvc.updated) == 0 {
		t.Fatalf("expected translated update call")
	}
	update := menuSvc.updated[0]
	if strings.TrimSpace(update.ID) != "site_main.about" {
		t.Fatalf("expected base path update site_main.about, got %q", update.ID)
	}
	if !strings.EqualFold(strings.TrimSpace(update.Locale), "es") {
		t.Fatalf("expected es locale update, got %q", update.Locale)
	}
	if strings.TrimSpace(update.Label) != "Sobre Nosotros" {
		t.Fatalf("expected localized label migration, got %q", update.Label)
	}
	if update.URLOverride == nil || strings.TrimSpace(*update.URLOverride) != "/sobre-nosotros" {
		t.Fatalf("expected URL override migration, got %+v", update.URLOverride)
	}

	if len(menuSvc.deleted) == 0 || strings.TrimSpace(menuSvc.deleted[0]) != "site_main.about.es" {
		t.Fatalf("expected deletion of legacy suffix node, got %+v", menuSvc.deleted)
	}
}

type localizedMenuServiceStub struct {
	added         []admin.MenuItem
	updated       []admin.MenuItem
	deleted       []string
	menusByLocale map[string]*admin.Menu
}

func (s *localizedMenuServiceStub) CreateMenu(context.Context, string) (*admin.Menu, error) {
	return &admin.Menu{}, nil
}

func (s *localizedMenuServiceStub) AddMenuItem(_ context.Context, _ string, item admin.MenuItem) error {
	s.added = append(s.added, item)
	return nil
}

func (s *localizedMenuServiceStub) UpdateMenuItem(_ context.Context, _ string, item admin.MenuItem) error {
	s.updated = append(s.updated, item)
	return nil
}

func (s *localizedMenuServiceStub) DeleteMenuItem(_ context.Context, _ string, id string) error {
	s.deleted = append(s.deleted, id)
	return nil
}

func (s *localizedMenuServiceStub) ReorderMenu(context.Context, string, []string) error { return nil }

func (s *localizedMenuServiceStub) Menu(_ context.Context, _ string, locale string) (*admin.Menu, error) {
	if menu := s.menusByLocale[strings.ToLower(strings.TrimSpace(locale))]; menu != nil {
		return menu, nil
	}
	return &admin.Menu{}, nil
}

func (s *localizedMenuServiceStub) MenuByLocation(ctx context.Context, location, locale string) (*admin.Menu, error) {
	return s.Menu(ctx, location, locale)
}
