package site

import "testing"

func TestLocalePathSupportLocalizedPathRespectsPrefixModes(t *testing.T) {
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

func TestLocalePathSupportStripSupportedLocalePrefix(t *testing.T) {
	path, locale := StripSupportedLocalePrefix("/es/about", []string{"en", "es"})
	if path != "/about" || locale != "es" {
		t.Fatalf("expected /about + es, got %q + %q", path, locale)
	}
	path, locale = StripSupportedLocalePrefix("/about", []string{"en", "es"})
	if path != "/about" || locale != "" {
		t.Fatalf("expected unchanged path with empty locale, got %q + %q", path, locale)
	}
}

func TestLocalePathSupportLocalizedPathWithQueryAndNormalization(t *testing.T) {
	if got := LocalizedPathWithQuery("/about", "es", "en", LocalePrefixNonDefault, map[string]string{"preview_token": "abc", "": "skip"}); got != "/es/about?preview_token=abc" {
		t.Fatalf("expected localized path with query, got %q", got)
	}
	if got := normalizeLocalePath(" about/?draft=1 "); got != "/about" {
		t.Fatalf("expected normalized path /about, got %q", got)
	}
	if got := normalizeLocalePath("https://example.com/about"); got != "/" {
		t.Fatalf("expected external path to normalize to root, got %q", got)
	}
}

func TestLocalePathSupportUnsafeLocalizedPathDetection(t *testing.T) {
	if !localePathUnsafe("https://example.com/phish") {
		t.Fatalf("expected external path to be unsafe")
	}
	if !localePathUnsafe("/../../etc/passwd") {
		t.Fatalf("expected traversal path to be unsafe")
	}
	if localePathUnsafe("/es/about") {
		t.Fatalf("expected normal localized path to remain safe")
	}
}
