package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationResolveRawMenuPrefersLocationMenuWhenItemsExist(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				FallbackMenuCode: "site_primary",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byLocation: map[string]*admin.Menu{
				"site.main": {
					Code:     "site_main",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "home", Label: "Home", Target: map[string]any{"url": "/home"}},
					},
				},
			},
			byCode: map[string]*admin.Menu{
				"site_primary": {
					Code:     "site_primary",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "fallback", Label: "Fallback", Target: map[string]any{"url": "/fallback"}},
					},
				},
			},
		},
	}

	menu, source, err := runtime.resolveRawMenu(context.Background(), RequestState{}, "site.main", navigationReadOptions{Locale: "en"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if source != "location" {
		t.Fatalf("expected source location, got %q", source)
	}
	if menu == nil || menu.Code != "site_main" || len(menu.Items) != 1 {
		t.Fatalf("expected location menu, got %+v", menu)
	}
}

func TestNavigationResolveRawMenuFallsBackToCodeAndHydratesLocation(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				FallbackMenuCode: "site_primary",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byCode: map[string]*admin.Menu{
				"site_primary": {
					Code:  "site_primary",
					Items: []admin.MenuItem{{ID: "home", Label: "Home", Target: map[string]any{"url": "/home"}}},
				},
			},
		},
	}

	menu, source, err := runtime.resolveRawMenu(context.Background(), RequestState{}, "site.main", navigationReadOptions{Locale: "en"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if source != "code" {
		t.Fatalf("expected source code, got %q", source)
	}
	if menu == nil || menu.Location != "site.main" {
		t.Fatalf("expected fallback menu location to hydrate request location, got %+v", menu)
	}
}

func TestNavigationResolveRawMenuReturnsEmptyMenuAndLastErrorWhenNoFallbackMatches(t *testing.T) {
	expectedErr := errors.New("menu unavailable")
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				FallbackMenuCode: "site_primary",
			},
		}),
		menuSvc: siteNavigationErrorMenuStub{err: expectedErr},
	}

	menu, source, err := runtime.resolveRawMenu(context.Background(), RequestState{}, "site.main", navigationReadOptions{Locale: "en"})
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected last error %v, got %v", expectedErr, err)
	}
	if source != "empty" {
		t.Fatalf("expected source empty, got %q", source)
	}
	if menu == nil || menu.Code != "site_primary" || menu.Location != "site.main" || len(menu.Items) != 0 {
		t.Fatalf("expected empty fallback contract, got %+v", menu)
	}
}

func TestNavigationMenuByLocationUsesOptionsAwareService(t *testing.T) {
	menuSvc := &siteNavigationMenuStub{
		byLocation: map[string]*admin.Menu{
			"site.main": {
				Code:     "site_main",
				Location: "site.main",
				Items:    []admin.MenuItem{{ID: "home", Label: "Home"}},
			},
		},
	}
	runtime := &navigationRuntime{menuSvc: menuSvc}
	opts := navigationReadOptions{
		Locale:               "es",
		IncludeContributions: true,
		IncludeDrafts:        true,
		PreviewToken:         "preview-token",
		ViewProfile:          "compact",
	}

	menu, err := runtime.menuByLocation(context.Background(), "site.main", opts)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if menu == nil || menu.Code != "site_main" {
		t.Fatalf("expected menu from location read, got %+v", menu)
	}
	if menuSvc.lastLocationOpts.Locale != "es" || !menuSvc.lastLocationOpts.IncludeContributions || !menuSvc.lastLocationOpts.IncludeDrafts || menuSvc.lastLocationOpts.PreviewToken != "preview-token" || menuSvc.lastLocationOpts.ViewProfile != "compact" {
		t.Fatalf("expected location options to be forwarded, got %+v", menuSvc.lastLocationOpts)
	}
}

func TestNavigationMenuByCodeUsesOptionsAwareService(t *testing.T) {
	menuSvc := &siteNavigationMenuStub{
		byCode: map[string]*admin.Menu{
			"site_primary": {
				Code:     "site_primary",
				Location: "site.main",
				Items:    []admin.MenuItem{{ID: "home", Label: "Home"}},
			},
		},
	}
	runtime := &navigationRuntime{menuSvc: menuSvc}
	opts := navigationReadOptions{
		Locale:        "es",
		IncludeDrafts: true,
		PreviewToken:  "preview-token",
		ViewProfile:   "compact",
	}

	menu, err := runtime.menuByCode(context.Background(), "site_primary", opts)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if menu == nil || menu.Code != "site_primary" {
		t.Fatalf("expected menu from code read, got %+v", menu)
	}
	if menuSvc.lastCodeOpts.Locale != "es" || !menuSvc.lastCodeOpts.IncludeDrafts || menuSvc.lastCodeOpts.PreviewToken != "preview-token" || menuSvc.lastCodeOpts.ViewProfile != "compact" {
		t.Fatalf("expected code options to be forwarded, got %+v", menuSvc.lastCodeOpts)
	}
}

func TestNavigationMenuByLocationUsesInMemoryMenuServiceDirectMenuPath(t *testing.T) {
	menuSvc := admin.NewInMemoryMenuService()
	if _, err := menuSvc.CreateMenu(context.Background(), "site_main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := menuSvc.AddMenuItem(context.Background(), "site_main", admin.MenuItem{
		ID:    "home",
		Label: "Home",
		Target: map[string]any{
			"url": "/home",
		},
	}); err != nil {
		t.Fatalf("add menu item: %v", err)
	}
	runtime := &navigationRuntime{menuSvc: menuSvc}

	menu, err := runtime.menuByLocation(context.Background(), "site_main", navigationReadOptions{Locale: "en"})
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if menu == nil || menu.Code != "site_main" || len(menu.Items) != 1 {
		t.Fatalf("expected in-memory menu read to route through direct menu path, got %+v", menu)
	}
}
