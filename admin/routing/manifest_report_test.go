package routing

import (
	"errors"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestNormalizeManifestSortsEntriesAndFillsMethodMetadata(t *testing.T) {
	manifest := NormalizeManifest(Manifest{
		Entries: []ManifestEntry{
			{
				Owner:     "module:zeta",
				Surface:   SurfaceAPI,
				RouteKey:  "zeta.index",
				RouteName: "admin.api.zeta.index",
				Path:      "/admin/api/zeta",
				GroupPath: "admin.api",
			},
			{
				Owner:     "module:alpha",
				Surface:   SurfaceUI,
				RouteKey:  "alpha.home",
				RouteName: "admin.alpha.home",
				Method:    "get",
				Path:      "/admin/alpha",
				GroupPath: "admin",
			},
		},
	})

	if len(manifest.Entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(manifest.Entries))
	}
	if manifest.Entries[0].Owner != "module:alpha" {
		t.Fatalf("expected alpha to sort first, got %+v", manifest.Entries)
	}
	if manifest.Entries[0].Method != "GET" {
		t.Fatalf("expected GET method normalization, got %q", manifest.Entries[0].Method)
	}
	if manifest.Entries[1].Method != ManifestMethodUnknown {
		t.Fatalf("expected unknown method placeholder, got %q", manifest.Entries[1].Method)
	}
}

func TestDiffManifestsClassifiesAddedRemovedAndChangedEntries(t *testing.T) {
	before := Manifest{
		Entries: []ManifestEntry{
			{
				Owner:     "module:alpha",
				Surface:   SurfaceAPI,
				RouteKey:  "alpha.index",
				RouteName: "admin.api.alpha.index",
				Method:    "GET",
				Path:      "/admin/api/alpha",
				GroupPath: "admin.api",
			},
			{
				Owner:     "module:beta",
				Surface:   SurfaceUI,
				RouteKey:  "beta.home",
				RouteName: "admin.beta.home",
				Method:    ManifestMethodUnknown,
				Path:      "/admin/beta",
				GroupPath: "admin",
			},
		},
	}
	after := Manifest{
		Entries: []ManifestEntry{
			{
				Owner:     "module:alpha",
				Surface:   SurfaceAPI,
				RouteKey:  "alpha.index",
				RouteName: "admin.api.alpha.index",
				Method:    "GET",
				Path:      "/admin/api/alpha/v2",
				GroupPath: "admin.api",
			},
			{
				Owner:     "module:gamma",
				Surface:   SurfacePublicAPI,
				RouteKey:  "gamma.feed",
				RouteName: "public.api.v1.gamma.feed",
				Method:    "POST",
				Path:      "/api/v1/gamma/feed",
				GroupPath: "public.api.v1",
			},
		},
	}

	diff := DiffManifests(before, after)
	if !diff.HasChanges() {
		t.Fatalf("expected manifest diff to report changes")
	}
	if len(diff.Changed) != 1 || diff.Changed[0].Key != "module:alpha|api|alpha.index" {
		t.Fatalf("expected one changed alpha entry, got %+v", diff.Changed)
	}
	if len(diff.Removed) != 1 || diff.Removed[0].Key != "module:beta|ui|beta.home" {
		t.Fatalf("expected one removed beta entry, got %+v", diff.Removed)
	}
	if len(diff.Added) != 1 || diff.Added[0].Key != "module:gamma|public_api|gamma.feed" {
		t.Fatalf("expected one added gamma entry, got %+v", diff.Added)
	}
}

func TestBuildStartupReportAggregatesCountsConflictsAndWarnings(t *testing.T) {
	report := BuildStartupReport(
		RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
		[]ResolvedModule{
			{Slug: "zeta", APIMountBase: "/admin/api/zeta"},
			{Slug: "alpha", UIMountBase: "/admin/alpha"},
		},
		Manifest{
			Entries: []ManifestEntry{
				{Owner: "host", Surface: SurfaceUI, RouteKey: "dashboard", RouteName: "admin.dashboard", Method: "GET", Path: "/admin", GroupPath: "admin"},
				{Owner: "module:alpha", Surface: SurfaceUI, RouteKey: "alpha.home", RouteName: "admin.alpha.home", Path: "/admin/alpha", GroupPath: "admin"},
			},
		},
		[]Conflict{
			{Kind: ConflictKindPathConflict, Module: "alpha", Message: "duplicate path"},
		},
		[]string{"router warning", "adapter warning"},
	)

	if report.RouteSummary.TotalRoutes != 2 {
		t.Fatalf("expected total routes 2, got %d", report.RouteSummary.TotalRoutes)
	}
	if report.RouteSummary.HostRoutes != 1 {
		t.Fatalf("expected host routes 1, got %d", report.RouteSummary.HostRoutes)
	}
	if report.RouteSummary.ModuleRoutes != 1 {
		t.Fatalf("expected module routes 1, got %d", report.RouteSummary.ModuleRoutes)
	}
	if report.Modules[0].Slug != "alpha" || report.Modules[1].Slug != "zeta" {
		t.Fatalf("expected modules sorted alphabetically, got %+v", report.Modules)
	}
	if report.RouteSummary.Modules[0] != "alpha" || report.RouteSummary.Modules[1] != "zeta" {
		t.Fatalf("expected module names sorted alphabetically, got %+v", report.RouteSummary.Modules)
	}
	if len(report.Conflicts) != 1 || report.Conflicts[0].Kind != ConflictKindPathConflict {
		t.Fatalf("expected aggregated conflict, got %+v", report.Conflicts)
	}
	if len(report.Warnings) != 2 || report.Warnings[0] != "adapter warning" {
		t.Fatalf("expected sorted warnings, got %+v", report.Warnings)
	}
}

func TestFormatStartupReportProducesReadableOutput(t *testing.T) {
	output := FormatStartupReport(StartupReport{
		EffectiveRoots: RootsConfig{
			AdminRoot: "/admin",
			APIRoot:   "/admin/api",
		},
		Modules: []ResolvedModule{
			{Slug: "translations", UIMountBase: "/admin/translations", APIMountBase: "/admin/api/translations"},
		},
		RouteSummary: RouteSummary{
			TotalRoutes:  3,
			HostRoutes:   1,
			ModuleRoutes: 2,
		},
		Conflicts: []Conflict{
			{Kind: ConflictKindOwnershipViolation, Message: "ui mount cannot claim root"},
		},
		Warnings: []string{"using local preflight checks"},
	})

	for _, fragment := range []string{
		"routing report",
		"roots: admin=/admin api=/admin/api public_api=-",
		"modules:",
		"translations ui=/admin/translations api=/admin/api/translations",
		"ownership_violation: ui mount cannot claim root",
		"using local preflight checks",
	} {
		if !strings.Contains(output, fragment) {
			t.Fatalf("expected report output to contain %q, got:\n%s", fragment, output)
		}
	}
}

func TestBuildAdapterWarningsAndCapabilities(t *testing.T) {
	urls := capabilityURLKitAdapter{
		URLKitCapabilities: URLKitCapabilities{
			NativeStrictMutations: true,
			NativeManifest:        true,
		},
	}
	routerAdapter := capabilityRouterAdapter{
		RouterCapabilities: RouterCapabilities{
			NativeRouteNamePolicy: true,
			NativeOwnershipChecks: true,
			NativeManifest:        true,
		},
	}

	if caps := DetectURLKitCapabilities(urls); !caps.NativeStrictMutations || !caps.NativeManifest {
		t.Fatalf("expected urlkit capabilities to be detected, got %+v", caps)
	}
	if caps := DetectRouterCapabilities(routerAdapter); !caps.NativeManifest || !caps.NativeOwnershipChecks {
		t.Fatalf("expected router capabilities to be detected, got %+v", caps)
	}

	warnings := BuildAdapterWarnings(urls, routerAdapter)
	if len(warnings) != 0 {
		t.Fatalf("expected no warnings when native capabilities are advertised, got %+v", warnings)
	}
}

func TestValidatorSkipsLocalChecksWhenNativeCapabilitiesAreAdvertised(t *testing.T) {
	validator := NewValidator(RootsConfig{})
	err := validator.PreflightURLKit([]ManifestEntry{
		{
			Owner:     "module:translations",
			Surface:   SurfaceUI,
			RouteKey:  "translations.dashboard",
			RouteName: "admin.translations.dashboard",
			Path:      "/admin/translations/dashboard",
			GroupPath: "admin",
		},
	}, capabilityURLKitAdapter{
		stubURLKitAdapter: stubURLKitAdapter{
			templates: map[string]string{
				"admin|translations.dashboard": "/admin/translations/dashboard",
			},
		},
		URLKitCapabilities: URLKitCapabilities{
			NativeStrictMutations: true,
		},
	})
	if err != nil {
		t.Fatalf("expected native urlkit capabilities to skip local preflight: %v", err)
	}

	err = validator.ReconcileRouter(Manifest{
		Entries: []ManifestEntry{
			{
				Owner:     "module:translations",
				Surface:   SurfaceAPI,
				RouteKey:  "translations.queue",
				RouteName: "admin.api.translations.queue",
				Path:      "/admin/api/translations/queue",
				GroupPath: "admin.api",
			},
		},
	}, capabilityRouterAdapter{
		stubRouterAdapter: stubRouterAdapter{
			routes: []router.RouteDefinition{
				{Name: "admin.api.translations.queue", Method: router.GET, Path: "/wrong"},
			},
			validateErr: []error{errors.New("runtime conflict")},
		},
		RouterCapabilities: RouterCapabilities{
			NativeManifest: true,
		},
	})
	if err != nil {
		t.Fatalf("expected native router manifest capabilities to skip local reconciliation: %v", err)
	}
}

type capabilityURLKitAdapter struct {
	stubURLKitAdapter
	URLKitCapabilities
}

func (a capabilityURLKitAdapter) RoutingURLKitCapabilities() URLKitCapabilities {
	return a.URLKitCapabilities
}

type capabilityRouterAdapter struct {
	stubRouterAdapter
	RouterCapabilities
}

func (a capabilityRouterAdapter) RoutingRouterCapabilities() RouterCapabilities {
	return a.RouterCapabilities
}
