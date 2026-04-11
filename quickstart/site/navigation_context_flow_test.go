package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestResolveNavigationContextBuildsMainFooterAndLegacyContracts(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation:   "site.main",
				FooterMenuLocation: "site.footer",
				FallbackMenuCode:   "site_primary",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byLocation: map[string]*admin.Menu{
				"site.main": {
					Code:     "main_code",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "home", Label: "Home", Position: new(1), Target: map[string]any{"url": "/home"}},
					},
				},
				"site.footer": {
					Code:     "footer_code",
					Location: "site.footer",
					Items: []admin.MenuItem{
						{ID: "legal", Label: "Legal", Position: new(1), Target: map[string]any{"url": "/legal"}},
					},
				},
			},
		},
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["nav_debug"] = "true"
	ctx.On("Context").Return(context.Background())

	payload := resolveNavigationContext(runtime, ctx, RequestState{Locale: "en"}, "/home")
	mainMenu := nestedMapFromAny(payload["main_menu"])
	footerMenu := nestedMapFromAny(payload["footer_menu"])
	mainItems := menuItemsFromContext(t, payload["main_menu_items"])
	footerItems := menuItemsFromContext(t, payload["footer_menu_items"])
	legacyItems := menuItemsFromContext(t, payload["nav_items"])
	helpers := nestedMapFromAny(payload["navigation_helpers"])

	if !anyBool(payload["navigation_debug"]) {
		t.Fatalf("expected navigation_debug true, got %+v", payload)
	}
	if stringsTrimSpace(anyString(mainMenu["code"])) != "main_code" || stringsTrimSpace(anyString(footerMenu["code"])) != "footer_code" {
		t.Fatalf("expected resolved main/footer menu codes, got main=%+v footer=%+v", mainMenu, footerMenu)
	}
	if len(mainItems) != 1 || menuItemLabel(mainItems[0]) != "Home" {
		t.Fatalf("expected one main item Home, got %+v", mainItems)
	}
	if len(footerItems) != 1 || menuItemLabel(footerItems[0]) != "Legal" {
		t.Fatalf("expected one footer item Legal, got %+v", footerItems)
	}
	if len(legacyItems) != len(mainItems) || menuItemLabel(legacyItems[0]) != menuItemLabel(mainItems[0]) {
		t.Fatalf("expected legacy nav_items contract to mirror main menu items, got legacy=%+v main=%+v", legacyItems, mainItems)
	}
	if stringsTrimSpace(anyString(nestedMapFromAny(helpers["main"])["location"])) != "site.main" {
		t.Fatalf("expected helper main location site.main, got %+v", helpers)
	}
}

func TestResolveNavigationContextNilRuntimeReturnsEmptyContracts(t *testing.T) {
	var runtime *navigationRuntime

	payload := resolveNavigationContext(runtime, nil, RequestState{}, "/es/home")
	mainMenu := nestedMapFromAny(payload["main_menu"])
	footerMenu := nestedMapFromAny(payload["footer_menu"])

	if stringsTrimSpace(anyString(mainMenu["location"])) != DefaultMainMenuLocation {
		t.Fatalf("expected default main menu location, got %+v", mainMenu)
	}
	if stringsTrimSpace(anyString(footerMenu["location"])) != DefaultFooterMenuLocation {
		t.Fatalf("expected default footer menu location, got %+v", footerMenu)
	}
	if len(menuItemsFromContext(t, payload["main_menu_items"])) != 0 || len(menuItemsFromContext(t, payload["footer_menu_items"])) != 0 {
		t.Fatalf("expected empty item contracts, got %+v", payload)
	}
	if anyBool(payload["navigation_debug"]) {
		t.Fatalf("expected navigation_debug false for nil runtime, got %+v", payload)
	}
}

func TestNavigationContextPayloadBuildsHelpersAndLegacyItems(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation:   "site.main",
				FooterMenuLocation: "site.footer",
				FallbackMenuCode:   "site_primary",
			},
		}),
	}

	main := map[string]any{
		"location": "site.main",
		"code":     "main_code",
		"items": []map[string]any{
			{"id": "home", "label": "Home"},
		},
	}
	footer := map[string]any{
		"location": "site.footer",
		"code":     "footer_code",
		"items": []map[string]any{
			{"id": "legal", "label": "Legal"},
		},
	}

	payload := navigationContextPayload(runtime, "/home", true, main, footer)
	helpers := nestedMapFromAny(payload["navigation_helpers"])
	mainItems := menuItemsFromContext(t, payload["main_menu_items"])
	footerItems := menuItemsFromContext(t, payload["footer_menu_items"])
	legacyItems := menuItemsFromContext(t, payload["nav_items"])

	if !anyBool(payload["navigation_debug"]) {
		t.Fatalf("expected navigation_debug true, got %+v", payload)
	}
	if len(mainItems) != 1 || len(footerItems) != 1 || len(legacyItems) != 1 {
		t.Fatalf("expected one main/footer/legacy item, got payload=%+v", payload)
	}
	if menuItemLabel(legacyItems[0]) != menuItemLabel(mainItems[0]) {
		t.Fatalf("expected nav_items to mirror main items, got legacy=%+v main=%+v", legacyItems, mainItems)
	}
	if stringsTrimSpace(anyString(nestedMapFromAny(helpers["main"])["active"])) != "/home" {
		t.Fatalf("expected helper main active path /home, got %+v", helpers)
	}
	if stringsTrimSpace(anyString(nestedMapFromAny(helpers["footer"])["location"])) != "site.footer" {
		t.Fatalf("expected helper footer location site.footer, got %+v", helpers)
	}
}
