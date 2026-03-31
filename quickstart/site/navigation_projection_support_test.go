package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationMenuItemActiveMatchSemantics(t *testing.T) {
	cases := []struct {
		name     string
		active   string
		href     string
		mode     string
		pattern  string
		expected bool
	}{
		{name: "exact hit", active: "/products", href: "/products", mode: "exact", expected: true},
		{name: "exact miss", active: "/products/123", href: "/products", mode: "exact", expected: false},
		{name: "prefix hit child", active: "/products/123", href: "/products", mode: "prefix", expected: true},
		{name: "prefix miss", active: "/docs/intro", href: "/products", mode: "prefix", expected: false},
		{name: "pattern wildcard", active: "/docs/getting-started", href: "/docs", mode: "pattern", pattern: "/docs/*", expected: true},
		{name: "pattern miss", active: "/blog/post", href: "/docs", mode: "pattern", pattern: "/docs/*", expected: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := menuItemActive(tc.active, tc.href, tc.mode, tc.pattern); got != tc.expected {
				t.Fatalf("expected %v, got %v", tc.expected, got)
			}
		})
	}
}

func TestNavigationMenuItemActiveForRequestPathStripsLocalePrefix(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolvedSiteConfig{
			DefaultLocale:    "en",
			SupportedLocales: []string{"en", "es"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: ResolvedSiteFeatures{
				EnableI18N: true,
			},
		},
	}
	if !runtime.menuItemActiveForRequestPath("/es/about/team", "/about/team", "exact", "") {
		t.Fatalf("expected locale-aware active matching to strip locale prefix")
	}
}

func TestNavigationLocalizeMenuHrefDoesNotDoublePrefixAlreadyLocalized(t *testing.T) {
	runtime := &navigationRuntime{
		siteCfg: ResolvedSiteConfig{
			DefaultLocale:    "en",
			SupportedLocales: []string{"en", "es"},
			LocalePrefixMode: LocalePrefixNonDefault,
			Features: ResolvedSiteFeatures{
				EnableI18N: true,
			},
		},
	}
	if got := runtime.localizeMenuHref("/es/about/team", "es"); got != "/es/about/team" {
		t.Fatalf("expected already localized href to remain unchanged, got %q", got)
	}
}

func TestNavigationDedupeKeyForMenuItemUsesTargetBeforeURLFallback(t *testing.T) {
	item := admin.MenuItem{
		ID: "fallback-id",
		Target: map[string]any{
			"key": "primary-target-key",
			"url": "/shared-path",
		},
	}
	if got := dedupeKeyForMenuItem(item, menuDedupByTarget); got != "target:primary-target-key" {
		t.Fatalf("expected target-based dedupe key, got %q", got)
	}
	if got := dedupeKeyForMenuItem(item, menuDedupByURL); got != "url:/shared-path" {
		t.Fatalf("expected url-based dedupe key, got %q", got)
	}
}

func TestNavigationContributionInfoFromTargetUsesMetadataFallback(t *testing.T) {
	target := map[string]any{
		"metadata": map[string]any{
			"contribution":        "widget",
			"contribution_origin": "metadata-origin",
		},
	}
	contribution, origin := contributionInfoFromTarget(target)
	if !contribution {
		t.Fatalf("expected metadata contribution fallback to mark item as contribution")
	}
	if origin != "metadata-origin" {
		t.Fatalf("expected metadata contribution origin, got %q", origin)
	}
}

func TestNavigationNormalizeNavigationPathPreservesAbsoluteURLsAndNormalizesLocalPaths(t *testing.T) {
	if got := normalizeNavigationPath(" https://example.com/docs "); got != "https://example.com/docs" {
		t.Fatalf("expected absolute URL to remain unchanged, got %q", got)
	}
	if got := normalizeNavigationPath("docs/getting-started/"); got != "/docs/getting-started" {
		t.Fatalf("expected local path normalization, got %q", got)
	}
}
