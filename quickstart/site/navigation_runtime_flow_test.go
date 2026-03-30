package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestNavigationResolveReadOptionsIncludesPreviewDraftsAndPolicies(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				ContributionLocalePolicy: ContributionLocalePolicyFallback,
			},
			Features: SiteFeatures{
				EnableMenuDraftPreview: boolPtr(true),
			},
		}),
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["include_contributions"] = "false"
	ctx.QueriesM["dedupe_policy"] = menuDedupByTarget
	ctx.QueriesM["contribution_locale_policy"] = ContributionLocalePolicyStrict
	ctx.QueriesM["view_profile"] = "compact"

	state := RequestState{
		Locale:              "es",
		IsPreview:           true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		PreviewToken:        "preview-token",
		PreviewEntityType:   "menu",
	}

	opts := runtime.resolveReadOptions(ctx, state)
	if opts.Locale != "es" {
		t.Fatalf("expected locale es, got %+v", opts)
	}
	if opts.IncludeContributions {
		t.Fatalf("expected include_contributions false, got %+v", opts)
	}
	if !opts.IncludeDrafts || opts.PreviewToken != "preview-token" {
		t.Fatalf("expected menu preview token to enable drafts, got %+v", opts)
	}
	if opts.ViewProfile != "compact" {
		t.Fatalf("expected view profile compact, got %+v", opts)
	}
	if opts.DedupPolicy != menuDedupByTarget {
		t.Fatalf("expected dedup policy %q, got %+v", menuDedupByTarget, opts)
	}
	if opts.ContributionLocalePolicy != ContributionLocalePolicyStrict {
		t.Fatalf("expected contribution locale policy strict, got %+v", opts)
	}
}

func TestNavigationResolveMenuForLocationReturnsEmptyContractWhenReadsFail(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation: "site.main",
				FallbackMenuCode: "site_primary",
			},
		}),
		menuSvc: siteNavigationErrorMenuStub{err: errors.New("menu unavailable")},
	}

	resolved := runtime.resolveMenuForLocation(
		context.Background(),
		RequestState{Locale: "es"},
		"site.main",
		"/es/home",
		navigationReadOptions{
			Locale:        "es",
			ViewProfile:   "compact",
			DedupPolicy:   menuDedupByURL,
			PreviewToken:  "preview-token",
			IncludeDrafts: true,
		},
		true,
	)

	if got := stringsTrimSpace(anyString(resolved["source"])); got != "empty" {
		t.Fatalf("expected source error, got %+v", resolved)
	}
	if stringsTrimSpace(anyString(resolved["error"])) != "" {
		t.Fatalf("expected empty contract without inline error string, got %+v", resolved)
	}
	if len(menuItemsFromContext(t, resolved["items"])) != 0 {
		t.Fatalf("expected empty menu items contract, got %+v", resolved)
	}
	if !anyBool(resolved["include_debug"]) || !anyBool(resolved["include_drafts"]) || !anyBool(resolved["include_preview"]) {
		t.Fatalf("expected debug/draft/preview flags in empty contract, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["include_dedup_mode"])); got != menuDedupByURL {
		t.Fatalf("expected dedup mode by_url, got %+v", resolved)
	}
}

func TestNavigationContextBuildsMainFooterAndLegacyContracts(t *testing.T) {
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
						{ID: "home", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home"}},
					},
				},
				"site.footer": {
					Code:     "footer_code",
					Location: "site.footer",
					Items: []admin.MenuItem{
						{ID: "legal", Label: "Legal", Position: intPtr(1), Target: map[string]any{"url": "/legal"}},
					},
				},
			},
		},
	}

	ctx := router.NewMockContext()
	ctx.QueriesM["nav_debug"] = "true"
	ctx.On("Context").Return(context.Background())

	payload := runtime.context(ctx, RequestState{Locale: "en"}, "/home")
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

func TestNavigationContextNilRuntimeReturnsEmptyContracts(t *testing.T) {
	var runtime *navigationRuntime

	payload := runtime.context(nil, RequestState{}, "/es/home")
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

type siteNavigationErrorMenuStub struct {
	err error
}

func (s siteNavigationErrorMenuStub) CreateMenu(context.Context, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) AddMenuItem(context.Context, string, admin.MenuItem) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) UpdateMenuItem(context.Context, string, admin.MenuItem) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) DeleteMenuItem(context.Context, string, string) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) ReorderMenu(context.Context, string, []string) error {
	return s.err
}

func (s siteNavigationErrorMenuStub) Menu(context.Context, string, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) MenuByLocation(context.Context, string, string) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) MenuByLocationWithOptions(context.Context, string, string, admin.SiteMenuReadOptions) (*admin.Menu, error) {
	return nil, s.err
}

func (s siteNavigationErrorMenuStub) MenuByCodeWithOptions(context.Context, string, string, admin.SiteMenuReadOptions) (*admin.Menu, error) {
	return nil, s.err
}
