package routing

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFallbackManifestAndReportSnapshots(t *testing.T) {
	cases := []struct {
		name     string
		fallback *FallbackEntry
	}{
		{
			name:     "no_fallback",
			fallback: nil,
		},
		{
			name: "public_content_only",
			fallback: &FallbackEntry{
				Owner:            "host:public_site",
				Surface:          SurfacePublicSite,
				Domain:           RouteDomainPublicSite,
				Mode:             FallbackModePublicContentOnly,
				AllowRoot:        true,
				AllowedMethods:   []string{"GET", "HEAD"},
				ReservedPrefixes: []string{"/.well-known", "/admin", "/api/v1", "/assets", "/healthz", "/static"},
			},
		},
		{
			name: "explicit_paths_only",
			fallback: &FallbackEntry{
				Owner:               "host:public_site",
				Surface:             SurfacePublicSite,
				Domain:              RouteDomainPublicSite,
				Mode:                FallbackModeExplicitPathsOnly,
				AllowRoot:           true,
				AllowedMethods:      []string{"HEAD", "GET"},
				AllowedExactPaths:   []string{"/search"},
				AllowedPathPrefixes: []string{"/posts"},
				ReservedPrefixes:    []string{"/.well-known", "/admin", "/api/v1", "/assets", "/healthz", "/static"},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
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
				ManifestEntry{
					Owner:     "host:static",
					Surface:   SurfaceStatic,
					Domain:    RouteDomainStatic,
					RouteKey:  "host.static",
					RouteName: "host.static",
					Method:    "GET",
					Path:      "/static/*",
				},
			); err != nil {
				t.Fatalf("register host routes: %v", err)
			}
			if tc.fallback != nil {
				if err := planner.RegisterFallback(*tc.fallback); err != nil {
					t.Fatalf("register fallback: %v", err)
				}
			}

			payload := map[string]any{
				"manifest": planner.Manifest(),
				"report":   planner.Report(),
			}
			assertFallbackSnapshot(t, filepath.Join("testdata", "fallback_"+tc.name+"_snapshot.json"), payload)
		})
	}
}

func assertFallbackSnapshot(t *testing.T, snapshotPath string, payload map[string]any) {
	t.Helper()
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal fallback snapshot: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	got := strings.TrimSpace(string(data))
	expected := strings.TrimSpace(string(want))
	if got != expected {
		t.Fatalf("fallback snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", expected, got)
	}
}
