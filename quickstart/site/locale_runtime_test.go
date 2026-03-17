package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestLocalizedPathRespectsPrefixModes(t *testing.T) {
	if got := LocalizedPath("/about", "en", "en", LocalePrefixNonDefault); got != "/about" {
		t.Fatalf("expected default locale to remain unprefixed, got %q", got)
	}
	if got := LocalizedPath("/about", "es", "en", LocalePrefixNonDefault); got != "/es/about" {
		t.Fatalf("expected non-default locale prefix, got %q", got)
	}
	if got := LocalizedPath("/about", "en", "en", LocalePrefixAlways); got != "/en/about" {
		t.Fatalf("expected always-prefixed path, got %q", got)
	}
}

func TestStripSupportedLocalePrefix(t *testing.T) {
	path, locale := StripSupportedLocalePrefix("/es/about", []string{"en", "es"})
	if path != "/about" || locale != "es" {
		t.Fatalf("expected /about + es, got %q + %q", path, locale)
	}
	path, locale = StripSupportedLocalePrefix("/about", []string{"en", "es"})
	if path != "/about" || locale != "" {
		t.Fatalf("expected unchanged path with empty locale, got %q + %q", path, locale)
	}
}

func TestBuildLocaleSwitcherContractPreservesTranslationIdentity(t *testing.T) {
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

func TestBuildLocaleSwitcherContractAvoidsDoubleLocalePrefix(t *testing.T) {
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

func TestBuildLocaleSwitcherContractSanitizesUnsafeLocalizedPaths(t *testing.T) {
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

func adminConfig(locale string) admin.Config {
	return admin.Config{DefaultLocale: locale}
}
