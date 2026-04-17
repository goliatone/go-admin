package site

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveNavigationMenuForLocationReturnsEmptyContractWhenReadsFail(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation: "site.main",
				FallbackMenuCode: "site_primary",
			},
		}),
		menuSvc: siteNavigationErrorMenuStub{err: errors.New("menu unavailable")},
	}

	resolved := resolveNavigationMenuForLocation(
		runtime,
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
		t.Fatalf("expected source empty, got %+v", resolved)
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

func TestNavigationResolvedMenuPayloadBuildsProjectedContract(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			SupportedLocales: []string{"en", "es"},
			Navigation: SiteNavigationConfig{
				MainMenuLocation:         "site.main",
				FallbackMenuCode:         "site_primary",
				ContributionLocalePolicy: ContributionLocalePolicyFallback,
				EnableGeneratedFallback:  true,
			},
			Features: SiteFeatures{
				EnableI18N: new(true),
			},
		}),
		authorizer: siteAuthorizerStub{
			allowed: map[string]bool{
				"nav.secret": false,
			},
		},
	}

	menu := &admin.Menu{
		Code:     "site_primary",
		Location: "site.main",
		Items: []admin.MenuItem{
			{ID: "secret", Label: "Secret", Permissions: []string{"nav.secret"}, Target: map[string]any{"url": "/secret"}},
			{ID: "public", Label: "Public", Position: new(1), Target: map[string]any{"url": "/home"}},
		},
	}

	resolved := navigationResolvedMenuPayload(
		runtime,
		context.Background(),
		RequestState{Locale: "es"},
		"site.main",
		"/es/home",
		navigationReadOptions{
			Locale:                   "es",
			IncludeDrafts:            true,
			PreviewToken:             "preview-token",
			ViewProfile:              "compact",
			DedupPolicy:              menuDedupByTarget,
			ContributionLocalePolicy: ContributionLocalePolicyFallback,
		},
		true,
		menu,
		"location",
	)

	if got := stringsTrimSpace(anyString(resolved["location"])); got != "site.main" {
		t.Fatalf("expected location site.main, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["code"])); got != "site_primary" {
		t.Fatalf("expected code site_primary, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["source"])); got != "location" {
		t.Fatalf("expected source location, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["active_path"])); got != "/es/home" {
		t.Fatalf("expected active path /es/home, got %+v", resolved)
	}
	if !anyBool(resolved["include_drafts"]) || !anyBool(resolved["include_preview"]) || !anyBool(resolved["include_debug"]) || !anyBool(resolved["include_fallback"]) {
		t.Fatalf("expected flags to be preserved, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["requested_locale"])); got != "es" || stringsTrimSpace(anyString(resolved["resolved_locale"])) != "es" {
		t.Fatalf("expected requested and resolved locale es, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["view_profile"])); got != "compact" {
		t.Fatalf("expected view profile compact, got %+v", resolved)
	}
	if got := stringsTrimSpace(anyString(resolved["include_dedup_mode"])); got != menuDedupByTarget {
		t.Fatalf("expected dedup mode by_target, got %+v", resolved)
	}
	items := menuItemsFromContext(t, resolved["items"])
	if len(items) != 1 || menuItemLabel(items[0]) != "Public" {
		t.Fatalf("expected filtered/projected public menu item, got %+v", items)
	}
}

func TestResolveNavigationMenuForLocationLocalizesKeyOnlyLabelsAndPreservesKeys(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
			Navigation: SiteNavigationConfig{
				MainMenuLocation: "site.main",
			},
		}),
		menuSvc: &siteNavigationMenuStub{
			byLocation: map[string]*admin.Menu{
				"site.main": {
					Code:     "site_primary",
					Location: "site.main",
					Items: []admin.MenuItem{
						{ID: "home", LabelKey: "menu.home", Target: map[string]any{"url": "/"}},
					},
				},
			},
		},
		translator: siteNavigationTranslatorStub{
			values: map[string]string{
				"es:menu.home": "Inicio",
			},
		},
	}

	resolved := resolveNavigationMenuForLocation(
		runtime,
		context.Background(),
		RequestState{Locale: "es"},
		"site.main",
		"/es",
		navigationReadOptions{Locale: "es"},
		false,
	)

	items := menuItemsFromContext(t, resolved["items"])
	if len(items) != 1 {
		t.Fatalf("expected one localized item, got %+v", resolved)
	}
	if got := menuItemLabel(items[0]); got != "Inicio" {
		t.Fatalf("expected translated label Inicio, got %+v", items[0])
	}
	if got := stringsTrimSpace(anyString(items[0]["label_key"])); got != "menu.home" {
		t.Fatalf("expected label_key to be preserved, got %+v", items[0])
	}
}

type siteNavigationTranslatorStub struct {
	values map[string]string
}

func (s siteNavigationTranslatorStub) Translate(locale, key string, args ...any) (string, error) {
	if value, ok := s.values[locale+":"+key]; ok {
		return value, nil
	}
	return key, nil
}
