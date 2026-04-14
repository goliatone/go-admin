package site

import (
	"slices"
	"testing"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestSiteFallbackPolicyDefaultsExposeTypedModesAndReservedPrefixes(t *testing.T) {
	if DefaultSiteFallbackMode != SiteFallbackModePublicContentOnly {
		t.Fatalf("expected default fallback mode public_content_only, got %q", DefaultSiteFallbackMode)
	}

	policy := DefaultSiteFallbackPolicy()
	if policy.Mode != SiteFallbackModePublicContentOnly {
		t.Fatalf("expected default policy mode public_content_only, got %q", policy.Mode)
	}
	if !policy.AllowRoot {
		t.Fatalf("expected default policy to allow root")
	}
	if len(policy.AllowedMethods) != 2 || policy.AllowedMethods[0] != router.GET || policy.AllowedMethods[1] != router.HEAD {
		t.Fatalf("expected default allowed methods GET/HEAD, got %v", policy.AllowedMethods)
	}
	if got := policy.ReservedPrefixes; len(got) != 5 || got[0] != DefaultReservedPrefixAdmin || got[4] != DefaultReservedPrefixWellKnown {
		t.Fatalf("expected default reserved prefixes, got %v", got)
	}
}

func TestNormalizeSiteFallbackPolicyCompactsMethodsAndPathsDeterministically(t *testing.T) {
	policy := NormalizeSiteFallbackPolicy(SiteFallbackPolicy{
		Mode:           SiteFallbackMode(" EXPLICIT_PATHS_ONLY "),
		AllowedMethods: []router.HTTPMethod{router.HEAD, router.GET, router.POST, router.GET},
		AllowedExactPaths: []string{
			"search",
			"/search",
			" /landing ",
		},
		AllowedPathPrefixes: []string{
			"/blog/",
			"docs",
			"/docs",
		},
		ReservedPrefixes: []string{
			"/api",
			" /admin ",
			"/api",
		},
	})

	if policy.Mode != SiteFallbackModeExplicitPathsOnly {
		t.Fatalf("expected explicit_paths_only mode, got %q", policy.Mode)
	}
	if got := policy.AllowedMethods; len(got) != 3 || got[0] != router.GET || got[1] != router.HEAD || got[2] != router.POST {
		t.Fatalf("expected deterministic allowed methods [GET HEAD POST], got %v", got)
	}
	if got := policy.AllowedExactPaths; len(got) != 2 || got[0] != "/landing" || got[1] != "/search" {
		t.Fatalf("expected deterministic allowed exact paths, got %v", got)
	}
	if got := policy.AllowedPathPrefixes; len(got) != 2 || got[0] != "/blog" || got[1] != "/docs" {
		t.Fatalf("expected deterministic allowed path prefixes, got %v", got)
	}
	if got := policy.ReservedPrefixes; len(got) != 2 || got[0] != "/admin" || got[1] != "/api" {
		t.Fatalf("expected deterministic reserved prefixes, got %v", got)
	}
}

func TestResolveSiteFallbackPolicyDefaultsZeroValueAndRejectsMagicModes(t *testing.T) {
	policy := ResolveSiteFallbackPolicy(SiteFallbackPolicy{})
	if policy.Mode != SiteFallbackModePublicContentOnly || !policy.AllowRoot {
		t.Fatalf("expected zero-value policy to resolve to default policy, got %+v", policy)
	}

	policy = NormalizeSiteFallbackPolicy(SiteFallbackPolicy{Mode: SiteFallbackMode("custom")})
	if policy.Mode != SiteFallbackMode("custom") {
		t.Fatalf("expected unknown mode to be preserved for validation, got %q", policy.Mode)
	}
	if err := ValidateSiteFallbackPolicy(policy); err == nil {
		t.Fatalf("expected unknown mode to fail validation")
	}

	policy = NormalizeSiteFallbackPolicy(SiteFallbackPolicy{
		Mode:           SiteFallbackModePublicContentOnly,
		AllowedMethods: []router.HTTPMethod{router.GET, router.HTTPMethod("POST")},
	})
	if got := policy.AllowedMethods; len(got) != 2 || got[0] != router.GET || got[1] != router.HTTPMethod("POST") {
		t.Fatalf("expected unsupported methods to remain visible for validation, got %v", got)
	}
	if err := ValidateSiteFallbackPolicy(policy); err == nil {
		t.Fatalf("expected unsupported method to fail validation")
	}
}

func TestExplicitPathsOnlyNeverTreatsRootPrefixAsGenericCatchAll(t *testing.T) {
	policy := NormalizeSiteFallbackPolicy(SiteFallbackPolicy{
		Mode:                SiteFallbackModeExplicitPathsOnly,
		AllowRoot:           false,
		AllowedPathPrefixes: []string{"/", "/docs"},
	})

	if siteFallbackAllowsPath(policy, "/") {
		t.Fatalf("expected root to remain disabled when allow_root=false")
	}
	if siteFallbackAllowsPath(policy, "/blog/post") {
		t.Fatalf("expected root prefix to be ignored as an accidental catch-all")
	}
	if !siteFallbackAllowsPath(policy, "/docs/getting-started") {
		t.Fatalf("expected explicit prefix to allow nested docs path")
	}
}

func TestSiteReservedPrefixesAndSearchEndpointFollowAdminConfigRoots(t *testing.T) {
	cfg := admin.Config{
		BasePath: "/admin",
		URLs: admin.URLConfig{
			Admin: admin.URLNamespaceConfig{
				BasePath: "/control",
			},
			Public: admin.URLNamespaceConfig{
				BasePath:   "/public",
				APIPrefix:  "content",
				APIVersion: "v3",
			},
		},
	}

	got := SiteReservedPrefixesForAdminConfig(cfg)
	want := []string{
		"/.well-known",
		"/admin/assets",
		"/admin/formgen",
		"/admin/runtime",
		"/assets",
		"/control",
		"/dashboard/assets/echarts",
		"/public/content",
		"/public/content/v3",
		"/runtime",
		"/static",
	}
	slices.Sort(want)
	if len(got) != len(want) {
		t.Fatalf("expected reserved prefixes %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected reserved prefixes %v, got %v", want, got)
		}
	}

	if got := DefaultSiteSearchEndpointForAdminConfig(cfg); got != "/public/content/v3/site/search" {
		t.Fatalf("expected config-derived search endpoint, got %q", got)
	}
}
