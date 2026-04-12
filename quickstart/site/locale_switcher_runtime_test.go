package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestLocaleSwitcherRuntimeBuildLocaleSwitcherContractPreservesTranslationIdentity(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/news/welcome",
		"es",
		"en",
		"tg-news-1",
		[]string{"en", "es"},
		map[string]string{
			"en": "/news/welcome",
			"es": "/noticias/bienvenida",
		},
		map[string]string{"preview_token": "preview-123"},
	)

	if got := contract["family_id"]; got != "tg-news-1" {
		t.Fatalf("expected family_id preserved, got %v", got)
	}
	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/news/welcome?locale=en&preview_token=preview-123" || items[0]["active"] != true {
		t.Fatalf("expected resolved locale item to be active with preserved query, got %+v", items[0])
	}
	if items[1]["locale"] != "es" || items[1]["url"] != "/es/noticias/bienvenida?preview_token=preview-123" {
		t.Fatalf("expected localized es url, got %+v", items[1])
	}
	if items[2]["locale"] != "fr" || items[2]["available"] != false {
		t.Fatalf("expected unavailable fr locale item, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeAvoidsDoubleLocalePrefix(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/es/about",
		"es",
		"es",
		"tg-about-1",
		[]string{"en", "es", "fr"},
		map[string]string{
			"en": "/about",
			"es": "/es/sobre-nosotros",
			"fr": "/fr/a-propos",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/about?locale=en" {
		t.Fatalf("expected en path /about, got %+v", items[0])
	}
	if items[1]["locale"] != "es" || items[1]["url"] != "/es/sobre-nosotros" {
		t.Fatalf("expected es path /es/sobre-nosotros without double prefix, got %+v", items[1])
	}
	if items[2]["locale"] != "fr" || items[2]["url"] != "/fr/a-propos" {
		t.Fatalf("expected fr path /fr/a-propos without mixed prefix, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeAvoidsDoubleLocalePrefixForLocalizedRoots(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "bo", "zh"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/bo",
		"bo",
		"bo",
		"tg-home-1",
		[]string{"en", "bo", "zh"},
		map[string]string{
			"en": "/",
			"bo": "/bo",
			"zh": "/zh",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/?locale=en" {
		t.Fatalf("expected en root URL /?locale=en, got %+v", items[0])
	}
	if items[1]["locale"] != "bo" || items[1]["url"] != "/bo" {
		t.Fatalf("expected bo root URL /bo without double prefix, got %+v", items[1])
	}
	if items[2]["locale"] != "zh" || items[2]["url"] != "/zh" {
		t.Fatalf("expected zh root URL /zh without double prefix, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimePreservesCanonicalPathsThatLookLikeLocaleCodes(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "bo", "zh"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/bo",
		"en",
		"en",
		"tg-bo-1",
		[]string{"en", "bo", "zh"},
		map[string]string{
			"en": "/bo",
			"bo": "/bo",
			"zh": "/bo",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/bo?locale=en" {
		t.Fatalf("expected en canonical locale-like slug URL /bo?locale=en, got %+v", items[0])
	}
	if items[1]["locale"] != "bo" || items[1]["url"] != "/bo" {
		t.Fatalf("expected bo canonical locale-like slug URL /bo, got %+v", items[1])
	}
	if items[2]["locale"] != "zh" || items[2]["url"] != "/zh/bo" {
		t.Fatalf("expected zh canonical locale-like slug URL /zh/bo, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeSanitizesUnsafeLocalizedPaths(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/about",
		"en",
		"en",
		"tg-about-1",
		[]string{"en", "es"},
		map[string]string{
			"en": "/about",
			"es": "https://example.com/phish",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["url"] != "/about?locale=en" {
		t.Fatalf("expected safe en path /about, got %+v", items[0])
	}
	if items[1]["url"] != "/es/about" {
		t.Fatalf("expected unsafe es path to fallback to localized current path, got %+v", items[1])
	}
}

func TestLocaleSwitcherRuntimeQueryAndDefaultLocalePolicy(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	if !localeSwitcherRequiresExplicitDefaultLocale(cfg, "en") {
		t.Fatalf("expected default locale to require explicit query under non-default prefix mode")
	}
	if localeSwitcherRequiresExplicitDefaultLocale(cfg, "es") {
		t.Fatalf("expected non-default locale not to require explicit query")
	}
	got := localeSwitcherQuery(map[string]string{"locale": "es", "preview_token": " abc "}, cfg, "en")
	if got["locale"] != "en" || got["preview_token"] != "abc" {
		t.Fatalf("expected locale switcher query to normalize explicit default locale, got %+v", got)
	}
}

func TestLocaleSwitcherRuntimeUsesDefaultLocalePathAsInheritedFallback(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/sobre-nosotros",
		"es",
		"es",
		"tg-about-1",
		[]string{"en", "es", "fr"},
		map[string]string{
			"en": "/about",
			"es": "/sobre-nosotros",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[2]["locale"] != "fr" || items[2]["url"] != "/fr/about" {
		t.Fatalf("expected inherited fr fallback url /fr/about, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeCanonicalizesLocalizedCurrentPathFallback(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "bo", "zh"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/zh/contact",
		"zh",
		"zh",
		"tg-contact-1",
		[]string{"en", "bo", "zh"},
		nil,
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/contact?locale=en" {
		t.Fatalf("expected en fallback URL /contact?locale=en, got %+v", items[0])
	}
	if items[1]["locale"] != "bo" || items[1]["url"] != "/bo/contact" {
		t.Fatalf("expected bo fallback URL /bo/contact, got %+v", items[1])
	}
	if items[2]["locale"] != "zh" || items[2]["url"] != "/zh/contact" {
		t.Fatalf("expected zh fallback URL /zh/contact without double prefix, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeCanonicalizesStickyRequestedLocaleFallback(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "fr", "zh"},
		LocalePrefixMode: LocalePrefixNonDefault,
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/fr/contact",
		"fr",
		"en",
		"tg-contact-1",
		[]string{"en", "fr"},
		nil,
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/contact?locale=en" {
		t.Fatalf("expected en fallback URL /contact?locale=en, got %+v", items[0])
	}
	if items[1]["locale"] != "fr" || items[1]["url"] != "/fr/contact" {
		t.Fatalf("expected fr fallback URL /fr/contact, got %+v", items[1])
	}
	if items[2]["locale"] != "zh" || items[2]["url"] != "/zh/contact" {
		t.Fatalf("expected zh fallback URL /zh/contact, got %+v", items[2])
	}
}

func TestLocaleSwitcherRuntimeStrictLocalizedPathsDoesNotSynthesizeFallbackURL(t *testing.T) {
	cfg := ResolveSiteConfig(adminConfig("en"), SiteConfig{
		SupportedLocales: []string{"en", "es", "fr"},
		LocalePrefixMode: LocalePrefixNonDefault,
		Features: SiteFeatures{
			StrictLocalizedPaths: new(true),
		},
	})
	contract := BuildLocaleSwitcherContract(
		cfg,
		"/sobre-nosotros",
		"es",
		"es",
		"tg-about-1",
		[]string{"en", "es", "fr"},
		map[string]string{
			"en": "/about",
			"es": "/sobre-nosotros",
		},
		nil,
	)

	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[2]["locale"] != "fr" || items[2]["url"] != "" {
		t.Fatalf("expected strict localized paths to avoid synthesized fr url, got %+v", items[2])
	}
}

func adminConfig(locale string) admin.Config {
	return admin.Config{DefaultLocale: locale}
}
