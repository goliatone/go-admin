package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveSitePublicPath(t *testing.T) {
	tests := []struct {
		name      string
		basePath  string
		mode      LocalePrefixMode
		canonical string
		locale    string
		want      string
	}{
		{name: "root default", canonical: "/", locale: "en", want: "/"},
		{name: "root non-default", canonical: "/", locale: "bo", want: "/bo"},
		{name: "default always", mode: LocalePrefixAlways, canonical: "/", locale: "en", want: "/en"},
		{name: "base root", basePath: "/site", canonical: "/", locale: "en", want: "/site"},
		{name: "base non-default root", basePath: "/site", canonical: "/", locale: "bo", want: "/site/bo"},
		{name: "base default always", basePath: "/site", mode: LocalePrefixAlways, canonical: "/", locale: "en", want: "/site/en"},
		{name: "nested canonical", basePath: "/site", canonical: "/archive/items", locale: "bo", want: "/site/bo/archive/items"},
		{name: "already target localized", basePath: "/site", canonical: "/bo/archive", locale: "bo", want: "/site/bo/archive"},
		{name: "replace existing locale", basePath: "/site", canonical: "/en/archive", locale: "bo", want: "/site/bo/archive"},
		{name: "unsafe becomes root", basePath: "/site", canonical: "https://example.com/phish", locale: "bo", want: "/site/bo"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
				BasePath:         tc.basePath,
				DefaultLocale:    "en",
				SupportedLocales: []string{"en", "bo"},
				LocalePrefixMode: tc.mode,
			})
			if got := ResolveSitePublicPath(cfg, tc.canonical, tc.locale); got != tc.want {
				t.Fatalf("ResolveSitePublicPath() = %q, want %q", got, tc.want)
			}
		})
	}
}

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
