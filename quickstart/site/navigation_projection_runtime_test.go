package site

import (
	"context"
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

func TestNavigationProjectMenuItemsIsDeterministic(t *testing.T) {
	runtime := &navigationRuntime{}
	items := []admin.MenuItem{
		{
			ID:       "c",
			Label:    "C",
			Position: intPtr(3),
			Target:   map[string]any{"url": "/c"},
		},
		{
			ID:       "a",
			Label:    "A",
			Position: intPtr(1),
			Target:   map[string]any{"url": "/a"},
		},
		{
			ID:       "b",
			Label:    "B",
			Position: intPtr(2),
			Target:   map[string]any{"url": "/b"},
		},
	}

	first := runtime.projectMenuItems(items, "/a", "en", menuDedupByURL, false)
	second := runtime.projectMenuItems(items, "/a", "en", menuDedupByURL, false)
	if len(first) != len(second) || len(first) != 3 {
		t.Fatalf("expected deterministic list length, got first=%d second=%d", len(first), len(second))
	}
	for i := range first {
		if anyString(first[i]["id"]) != anyString(second[i]["id"]) {
			t.Fatalf("expected deterministic ordering, got first=%+v second=%+v", first, second)
		}
	}
	if anyString(first[0]["label"]) != "A" || anyString(first[1]["label"]) != "B" || anyString(first[2]["label"]) != "C" {
		t.Fatalf("expected position-based order A/B/C, got %+v", first)
	}
}

func TestNavigationProjectMenuItemsDedupesByURL(t *testing.T) {
	runtime := &navigationRuntime{}
	items := []admin.MenuItem{
		{ID: "home-primary", Label: "Home", Position: intPtr(1), Target: map[string]any{"url": "/home"}},
		{ID: "home-secondary", Label: "Home Copy", Position: intPtr(2), Target: map[string]any{"url": "/home"}},
		{ID: "about", Label: "About", Position: intPtr(3), Target: map[string]any{"url": "/about"}},
	}

	projected := runtime.projectMenuItems(items, "/home", "en", menuDedupByURL, false)
	if len(projected) != 2 {
		t.Fatalf("expected URL dedupe to keep two items, got %+v", projected)
	}
	if got := stringsTrimSpace(anyString(projected[0]["id"])); got != "home-primary" {
		t.Fatalf("expected first deduped item home-primary, got %q", got)
	}
	if got := stringsTrimSpace(anyString(projected[1]["id"])); got != "about" {
		t.Fatalf("expected second deduped item about, got %q", got)
	}
}

func TestNavigationProjectMenuItemDebugPreservesContributionOrigin(t *testing.T) {
	runtime := &navigationRuntime{}
	projected := runtime.projectMenuItem(admin.MenuItem{
		ID:    "contribution",
		Label: "Contributed",
		Target: map[string]any{
			"url":                 "/contributed",
			"contribution":        true,
			"contribution_origin": "override",
		},
	}, "/elsewhere", "en", menuDedupByURL, true)

	if !targetBool(projected, "contribution") {
		t.Fatalf("expected projected contribution flag, got %+v", projected)
	}
	if got := stringsTrimSpace(anyString(projected["contribution_origin"])); got != "override" {
		t.Fatalf("expected contribution origin override, got %q", got)
	}
	debug := nestedMapFromAny(projected["debug"])
	if got := stringsTrimSpace(anyString(debug["contribution_origin"])); got != "override" {
		t.Fatalf("expected debug contribution origin override, got %+v", debug)
	}
}

func TestNavigationFilterMenuItemsDropsUnauthorizedEmptyGroupsAndSeparators(t *testing.T) {
	runtime := &navigationRuntime{
		authorizer: siteAuthorizerStub{
			allowed: map[string]bool{
				"nav.secret": false,
			},
		},
	}
	items := []admin.MenuItem{
		{ID: "sep-leading", Type: "separator"},
		{ID: "group-empty", Type: "group", Label: "Empty", Children: []admin.MenuItem{}},
		{ID: "collapse-empty", Label: "Collapsed", Collapsible: true},
		{ID: "public", Label: "Public", Target: map[string]any{"url": "/public"}},
		{ID: "sep-middle", Type: "separator"},
		{ID: "secret", Label: "Secret", Permissions: []string{"nav.secret"}, Target: map[string]any{"url": "/secret"}},
		{ID: "sep-trailing", Type: "separator"},
	}

	filtered := runtime.filterMenuItems(context.Background(), items)
	if len(filtered) != 1 {
		t.Fatalf("expected only one visible item after filtering, got %+v", filtered)
	}
	if filtered[0].ID != "public" {
		t.Fatalf("expected public item to remain, got %+v", filtered[0])
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
