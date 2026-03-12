package routing

import (
	"errors"
	"fmt"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
)

func TestPlannerConflictPolicyModesStillFailFast(t *testing.T) {
	policies := []ConflictPolicy{
		ConflictPolicyError,
		ConflictPolicyWarn,
		ConflictPolicyReplace,
	}

	for _, policy := range policies {
		t.Run(string(policy), func(t *testing.T) {
			planner := mustPlanner(t, Config{
				ConflictPolicy: policy,
				Roots: RootsConfig{
					AdminRoot: "/admin",
					APIRoot:   "/admin/api",
				},
			})

			if err := planner.RegisterModule(ModuleContract{
				Slug: "alpha",
				UIRoutes: map[string]string{
					"alpha.index": "/shared",
				},
				Mount: ModuleMountOverride{
					UIBase: "/admin",
				},
			}); err != nil {
				t.Fatalf("register alpha: %v", err)
			}

			err := planner.RegisterModule(ModuleContract{
				Slug: "beta",
				UIRoutes: map[string]string{
					"beta.index": "/shared",
				},
				Mount: ModuleMountOverride{
					UIBase: "/admin",
				},
			})
			if err == nil {
				t.Fatalf("expected strict fail-fast conflict under policy %q", policy)
			}

			var conflictErr *ConflictError
			if !errors.As(err, &conflictErr) {
				t.Fatalf("expected conflict error under policy %q, got %T", policy, err)
			}
		})
	}
}

func TestPlannerValidationTypicalModuleCountMeetsStartupBudget(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping startup budget check in short mode")
	}

	planner := mustPlanner(t, Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
	})

	start := time.Now()
	for _, contract := range typicalPhase9Contracts(12) {
		if err := planner.RegisterModule(contract); err != nil {
			t.Fatalf("register module %q: %v", contract.Slug, err)
		}
	}
	if err := planner.Validate(); err != nil {
		t.Fatalf("validate planner: %v", err)
	}
	elapsed := time.Since(start)
	if elapsed > 20*time.Millisecond {
		t.Fatalf("expected planner startup validation under 20ms for typical module count, got %s", elapsed)
	}
}

func BenchmarkPlannerValidationTypicalModuleCount(b *testing.B) {
	contracts := typicalPhase9Contracts(12)
	cfg := Config{
		Roots: RootsConfig{
			AdminRoot:     "/admin",
			APIRoot:       "/admin/api",
			PublicAPIRoot: "/api/v1",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		planner := mustPlannerForBenchmark(b, cfg)
		for _, contract := range contracts {
			if err := planner.RegisterModule(contract); err != nil {
				b.Fatalf("register module %q: %v", contract.Slug, err)
			}
		}
		if err := planner.Validate(); err != nil {
			b.Fatalf("validate planner: %v", err)
		}
	}
}

func TestReleaseAuditAdapterHooksRemainAvailableForUpstreamStrictFeatures(t *testing.T) {
	urls := phase9URLKitCapabilityAdapter{
		URLKitCapabilities: URLKitCapabilities{
			NativeStrictMutations: true,
			NativeManifest:        true,
		},
	}
	routerAdapter := phase9RouterCapabilityAdapter{
		RouterCapabilities: RouterCapabilities{
			NativeRouteNamePolicy: true,
			NativeOwnershipChecks: true,
			NativeManifest:        true,
		},
	}

	if _, ok := any(urls).(URLKitCapabilityProvider); !ok {
		t.Fatalf("expected urlkit audit adapter to satisfy URLKitCapabilityProvider")
	}
	if _, ok := any(routerAdapter).(RouterCapabilityProvider); !ok {
		t.Fatalf("expected router audit adapter to satisfy RouterCapabilityProvider")
	}

	if caps := DetectURLKitCapabilities(urls); !caps.NativeStrictMutations || !caps.NativeManifest {
		t.Fatalf("expected urlkit capabilities detected for release audit, got %+v", caps)
	}
	if caps := DetectRouterCapabilities(routerAdapter); !caps.NativeRouteNamePolicy || !caps.NativeOwnershipChecks || !caps.NativeManifest {
		t.Fatalf("expected router capabilities detected for release audit, got %+v", caps)
	}
	if warnings := BuildAdapterWarnings(urls, routerAdapter); len(warnings) != 0 {
		t.Fatalf("expected no release-audit warnings when native hooks are advertised, got %+v", warnings)
	}
}

func TestReleaseAuditWarnsWhenNativeCapabilityHooksAreNotAdvertised(t *testing.T) {
	warnings := BuildAdapterWarnings(stubURLKitAdapter{}, stubRouterAdapter{
		routes: []router.RouteDefinition{
			{Name: "admin.alpha.index", Method: router.GET, Path: "/admin/alpha"},
		},
	})
	if len(warnings) != 5 {
		t.Fatalf("expected fallback warnings for missing native hooks, got %+v", warnings)
	}
}

func typicalPhase9Contracts(count int) []ModuleContract {
	contracts := make([]ModuleContract, 0, count)
	for i := 0; i < count; i++ {
		slug := fmt.Sprintf("module_%02d", i)
		contract := ModuleContract{
			Slug: slug,
			UIRoutes: map[string]string{
				slug + ".index": "/",
				slug + ".page":  "/page",
			},
			APIRoutes: map[string]string{
				slug + ".index": "/",
				slug + ".item":  "/items/:id",
			},
		}
		if i%3 == 0 {
			contract.PublicAPIRoutes = map[string]string{
				slug + ".feed": "/feed",
			}
		}
		contracts = append(contracts, contract)
	}
	return contracts
}

func mustPlannerForBenchmark(b *testing.B, cfg Config) Planner {
	b.Helper()
	planner, err := NewPlanner(cfg, nil)
	if err != nil {
		b.Fatalf("new planner: %v", err)
	}
	return planner
}

type phase9URLKitCapabilityAdapter struct {
	stubURLKitAdapter
	URLKitCapabilities
}

func (a phase9URLKitCapabilityAdapter) RoutingURLKitCapabilities() URLKitCapabilities {
	return a.URLKitCapabilities
}

type phase9RouterCapabilityAdapter struct {
	stubRouterAdapter
	RouterCapabilities
}

func (a phase9RouterCapabilityAdapter) RoutingRouterCapabilities() RouterCapabilities {
	return a.RouterCapabilities
}
