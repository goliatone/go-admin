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

func TestLocalePathSupportLocalizedPublicPathForStoredPath(t *testing.T) {
	if got := localizedPublicPathForStoredPath("/about", "bo", "en", LocalePrefixNonDefault, []string{"en", "bo", "zh"}); got != "/bo/about" {
		t.Fatalf("expected canonical path /about to localize to /bo/about, got %q", got)
	}
	if got := localizedPublicPathForStoredPath("/bo/about", "bo", "en", LocalePrefixNonDefault, []string{"en", "bo", "zh"}); got != "/bo/about" {
		t.Fatalf("expected legacy localized detail /bo/about to stay /bo/about, got %q", got)
	}
	if got := localizedPublicPathForStoredPath("/en/about", "en", "en", LocalePrefixNonDefault, []string{"en", "bo", "zh"}); got != "/about" {
		t.Fatalf("expected default-locale prefixed path /en/about to normalize to /about, got %q", got)
	}
	if got := localizedPublicPathForStoredPath("/bo", "en", "en", LocalePrefixNonDefault, []string{"en", "bo", "zh"}); got != "/bo" {
		t.Fatalf("expected canonical locale-like slug /bo for en to remain /bo, got %q", got)
	}
	if got := localizedPublicPathForStoredPath("/bo", "bo", "en", LocalePrefixNonDefault, []string{"en", "bo", "zh"}); got != "/bo" {
		t.Fatalf("expected locale-like slug /bo for bo to remain /bo, got %q", got)
	}
}

func TestLocalePathSupportLocalizedPublicPathDiagnostics(t *testing.T) {
	events := []LocalePathBridgeDiagnostic{}
	restore := SetLocalePathBridgeDiagnosticSink(func(diag LocalePathBridgeDiagnostic) {
		events = append(events, diag)
	})
	defer restore()

	if got := localizedPublicPathForStoredPath("/fr/about", "fr", "en", LocalePrefixNonDefault, []string{"en", "fr"}); got != "/fr/about" {
		t.Fatalf("expected legacy localized path to stay /fr/about, got %q", got)
	}
	if got := localizedPublicPathForStoredPath("/about", "fr", "en", LocalePrefixNonDefault, []string{"en", "fr"}); got != "/fr/about" {
		t.Fatalf("expected canonical path to localize without diagnostics, got %q", got)
	}
	if len(events) != 1 {
		t.Fatalf("expected one bridge diagnostic, got %+v", events)
	}
	if events[0].StoredPath != "/fr/about" || events[0].TargetLocale != "fr" {
		t.Fatalf("unexpected diagnostic payload: %+v", events[0])
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
