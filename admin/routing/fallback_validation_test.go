package routing

import (
	"strings"
	"testing"
)

func TestPlannerRegistersHostRoutesAndFallbacksInManifestAndReport(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
	})

	if err := planner.RegisterHostRoutes(
		ManifestEntry{
			Owner:     "host:system",
			Surface:   SurfaceSystem,
			Domain:    RouteDomainSystem,
			RouteKey:  "host.app_info",
			RouteName: "host.app_info",
			Method:    "GET",
			Path:      "/.well-known/app-info",
		},
		ManifestEntry{
			Owner:     "host:internal_ops",
			Surface:   SurfaceInternalOps,
			Domain:    RouteDomainInternalOps,
			RouteKey:  "host.healthz",
			RouteName: "host.healthz",
			Method:    "GET",
			Path:      "/healthz",
		},
	); err != nil {
		t.Fatalf("register host routes: %v", err)
	}

	if err := planner.RegisterFallback(FallbackEntry{
		Owner:               "host:public_site",
		Surface:             SurfacePublicSite,
		Domain:              RouteDomainPublicSite,
		Mode:                FallbackModeExplicitPathsOnly,
		AllowRoot:           true,
		AllowedMethods:      []string{"HEAD", "GET"},
		AllowedExactPaths:   []string{"/search"},
		AllowedPathPrefixes: []string{"/posts"},
		ReservedPrefixes:    []string{"/.well-known", "/admin", "/api/v1", "/assets", "/static", "/healthz"},
	}); err != nil {
		t.Fatalf("register fallback: %v", err)
	}

	manifest := planner.Manifest()
	if len(manifest.Entries) != 2 {
		t.Fatalf("expected 2 host entries in manifest, got %+v", manifest.Entries)
	}
	if len(manifest.Fallbacks) != 1 {
		t.Fatalf("expected one fallback entry in manifest, got %+v", manifest.Fallbacks)
	}
	if got := manifest.Fallbacks[0].AllowedMethods; len(got) != 2 || got[0] != "GET" || got[1] != "HEAD" {
		t.Fatalf("expected normalized fallback methods, got %+v", manifest.Fallbacks[0])
	}

	report := planner.Report()
	if report.RouteSummary.HostRoutes != 2 {
		t.Fatalf("expected 2 host routes in report, got %+v", report.RouteSummary)
	}
	if report.RouteSummary.FallbackRoutes != 1 {
		t.Fatalf("expected 1 fallback in report summary, got %+v", report.RouteSummary)
	}
	if len(report.Fallbacks) != 1 || report.Fallbacks[0].Mode != FallbackModeExplicitPathsOnly {
		t.Fatalf("expected explicit-path fallback in report, got %+v", report.Fallbacks)
	}
}

func TestPlannerRejectsFallbackReservedPrefixOverlap(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
	})

	err := planner.RegisterFallback(FallbackEntry{
		Owner:             "host:public_site",
		Surface:           SurfacePublicSite,
		Domain:            RouteDomainPublicSite,
		Mode:              FallbackModeExplicitPathsOnly,
		AllowedMethods:    []string{"GET", "HEAD"},
		AllowedExactPaths: []string{"/admin/reports"},
		ReservedPrefixes:  []string{"/admin", "/static"},
	})
	if err == nil {
		t.Fatalf("expected reserved-prefix overlap to fail")
	}
	if !strings.Contains(err.Error(), "reserved prefix") {
		t.Fatalf("expected reserved-prefix error, got %v", err)
	}
}

func TestPlannerRejectsFallbackShadowingHostAndModuleRoutes(t *testing.T) {
	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot: "/control",
			APIRoot:   "/control/api",
		},
	})

	if err := planner.RegisterHostRoutes(
		ManifestEntry{
			Owner:     "host:static",
			Surface:   SurfaceStatic,
			Domain:    RouteDomainStatic,
			RouteKey:  "host.static",
			RouteName: "host.static",
			Method:    "GET",
			Path:      "/files/logo.svg",
		},
		ManifestEntry{
			Owner:     "host:system",
			Surface:   SurfaceSystem,
			Domain:    RouteDomainSystem,
			RouteKey:  "host.status",
			RouteName: "host.status",
			Method:    "GET",
			Path:      "/statusz",
		},
	); err != nil {
		t.Fatalf("register host routes: %v", err)
	}
	if err := planner.RegisterModule(ModuleContract{
		Slug: "reports",
		UIRoutes: map[string]string{
			"reports.index": "/dashboard",
		},
	}); err != nil {
		t.Fatalf("register module: %v", err)
	}

	err := planner.RegisterFallback(FallbackEntry{
		Owner:            "host:public_site",
		Surface:          SurfacePublicSite,
		Domain:           RouteDomainPublicSite,
		Mode:             FallbackModePublicContentOnly,
		AllowRoot:        true,
		AllowedMethods:   []string{"GET", "HEAD"},
		ReservedPrefixes: []string{"/admin", "/api", "/assets", "/static", "/.well-known"},
	})
	if err == nil {
		t.Fatalf("expected fallback shadowing to fail")
	}
	if !strings.Contains(err.Error(), "shadow") {
		t.Fatalf("expected shadowing error, got %v", err)
	}
}
