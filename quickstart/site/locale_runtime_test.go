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

	if got := contract["translation_group_id"]; got != "tg-news-1" {
		t.Fatalf("expected translation_group_id preserved, got %v", got)
	}
	items, ok := contract["items"].([]map[string]any)
	if !ok || len(items) != 3 {
		t.Fatalf("expected switcher items for all supported locales, got %#v", contract["items"])
	}
	if items[0]["locale"] != "en" || items[0]["url"] != "/news/welcome?preview_token=preview-123" || items[0]["active"] != true {
		t.Fatalf("expected resolved locale item to be active with preserved query, got %+v", items[0])
	}
	if items[1]["locale"] != "es" || items[1]["url"] != "/es/noticias/bienvenida?preview_token=preview-123" {
		t.Fatalf("expected localized es url, got %+v", items[1])
	}
	if items[2]["locale"] != "fr" || items[2]["available"] != false {
		t.Fatalf("expected unavailable fr locale item, got %+v", items[2])
	}
}

func adminConfig(locale string) admin.Config {
	return admin.Config{DefaultLocale: locale}
}
