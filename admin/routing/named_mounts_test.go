package routing

import (
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestPlannerResolvesHostAuthorizedNamedMounts(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Roots = RootsConfig{
		AdminRoot:           "/admin",
		APIRoot:             "/admin/api",
		PublicAPIRoot:       "/api/v1",
		ProtectedAppRoot:    "/app",
		ProtectedAppAPIRoot: "/app/api",
	}
	cfg.Modules = map[string]ModuleConfig{
		"multi_mount": {
			Mounts: map[string]NamedMountOverride{
				"admin":      {Surface: SurfaceUI, Base: "/admin/extensions/multi"},
				"options":    {Surface: SurfacePublicSite, Base: "/options"},
				"standalone": {Surface: SurfacePublicSite, Base: "/my-module"},
			},
		},
	}
	planner, err := NewPlanner(cfg, nil)
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}
	contract := ModuleContract{
		Slug: "multi_mount",
		Mounts: map[string]NamedMountContract{
			"admin":      {Routes: map[string]string{"multi_mount.admin": "/"}},
			"options":    {Routes: map[string]string{"multi_mount.options": "/"}},
			"standalone": {Routes: map[string]string{"multi_mount.standalone": "/"}},
		},
	}
	if err := planner.RegisterModule(contract); err != nil {
		t.Fatalf("register module: %v", err)
	}

	resolved, ok := planner.ResolvedModule("multi_mount")
	if !ok {
		t.Fatal("resolved module missing")
	}
	for name, want := range map[string]string{
		"admin": "/admin/extensions/multi", "options": "/options", "standalone": "/my-module",
	} {
		if got := resolved.Mounts[name].Base; got != want {
			t.Fatalf("mount %s base = %q, want %q", name, got, want)
		}
	}
	ctx := BuildModuleContext(contract, resolved)
	if got := ctx.MountRoutePath("standalone", "multi_mount.standalone"); got != "/my-module" {
		t.Fatalf("standalone route = %q", got)
	}
	if got := planner.Report().RouteSummary.ModuleRoutes; got != 3 {
		t.Fatalf("module routes = %d, want 3", got)
	}
	reportText := FormatStartupReport(planner.Report())
	for _, fragment := range []string{
		"mount=admin surface=ui base=/admin/extensions/multi",
		"mount=options surface=public_site base=/options",
		"mount=standalone surface=public_site base=/my-module",
	} {
		if !strings.Contains(reportText, fragment) {
			t.Fatalf("routing report missing %q:\n%s", fragment, reportText)
		}
	}
}

func TestPlannerCanonicalizesNamedMountNames(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Roots = RootsConfig{AdminRoot: "/admin", APIRoot: "/admin/api", PublicAPIRoot: "/api/v1"}
	cfg.Modules = map[string]ModuleConfig{
		"multi_mount": {Mounts: map[string]NamedMountOverride{
			" Options ": {Surface: SurfacePublicSite, Base: "/options"},
		}},
	}
	planner, err := NewPlanner(cfg, nil)
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}
	if err := planner.RegisterModule(ModuleContract{
		Slug: "multi_mount",
		Mounts: map[string]NamedMountContract{
			"/OPTIONS/": {RouteDeclarations: map[string]RouteDeclaration{
				"multi_mount.options": {Method: router.GET, Path: "/"},
			}},
		},
	}); err != nil {
		t.Fatalf("register module: %v", err)
	}
	resolved, ok := planner.ResolvedModule("multi_mount")
	if !ok || resolved.Mounts["options"].Base != "/options" {
		t.Fatalf("canonical mount missing: %+v", resolved.Mounts)
	}
	ctx := BuildModuleContext(ModuleContract{
		Slug: "multi_mount",
		Mounts: map[string]NamedMountContract{
			"/OPTIONS/": {RouteDeclarations: map[string]RouteDeclaration{
				"multi_mount.options": {Method: router.GET, Path: "/"},
			}},
		},
	}, resolved)
	if got := ctx.MountRoutePath(" Options ", "multi_mount.options"); got != "/options" {
		t.Fatalf("canonical mount route path = %q, want /options", got)
	}
}

func TestPlannerRejectsNormalizedNamedMountCollisions(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Modules = map[string]ModuleConfig{
		"multi_mount": {Mounts: map[string]NamedMountOverride{
			"options":   {Surface: SurfacePublicSite, Base: "/options"},
			"/OPTIONS/": {Surface: SurfacePublicSite, Base: "/other"},
		}},
	}
	if _, err := NewPlanner(cfg, nil); err == nil {
		t.Fatal("expected normalized config mount collision")
	}
}

func TestNormalizeConfigNormalizesValidNamedMountsWithoutHidingCollisions(t *testing.T) {
	valid := NormalizeConfig(Config{Modules: map[string]ModuleConfig{
		"multi_mount": {Mounts: map[string]NamedMountOverride{
			" /OPTIONS/ ": {Surface: "PUBLIC_SITE", Base: "options/"},
		}},
	}}, RootDerivationInput{})
	if _, ok := valid.Modules["multi_mount"].Mounts["options"]; !ok {
		t.Fatalf("valid named mount was not normalized: %#v", valid.Modules["multi_mount"].Mounts)
	}

	colliding := NormalizeConfig(Config{Modules: map[string]ModuleConfig{
		"multi_mount": {Mounts: map[string]NamedMountOverride{
			"options":   {Surface: SurfacePublicSite, Base: "/options"},
			"/OPTIONS/": {Surface: SurfacePublicSite, Base: "/other"},
		}},
	}}, RootDerivationInput{})
	if len(colliding.Modules["multi_mount"].Mounts) != 2 {
		t.Fatalf("normalization hid a colliding named mount: %#v", colliding.Modules["multi_mount"].Mounts)
	}
	if _, err := NewPlanner(colliding, nil); err == nil {
		t.Fatal("expected planner to reject the preserved normalized collision")
	}
}

func TestPlannerRejectsPublicSiteMountUnderReservedSurface(t *testing.T) {
	for _, base := range []string{"/", "/admin/module", "/api/v1/module", "/.well-known/module", "/static/module"} {
		t.Run(strings.ReplaceAll(base, "/", "_"), func(t *testing.T) {
			cfg := DefaultConfig()
			cfg.Roots = RootsConfig{AdminRoot: "/admin", APIRoot: "/admin/api", PublicAPIRoot: "/api/v1"}
			cfg.Modules = map[string]ModuleConfig{
				"multi_mount": {Mounts: map[string]NamedMountOverride{
					"public": {Surface: SurfacePublicSite, Base: base},
				}},
			}
			planner, err := NewPlanner(cfg, nil)
			if err != nil {
				t.Fatalf("new planner: %v", err)
			}
			err = planner.RegisterModule(ModuleContract{
				Slug: "multi_mount",
				Mounts: map[string]NamedMountContract{
					"public": {RouteDeclarations: map[string]RouteDeclaration{
						"multi_mount.public": {Method: router.GET, Path: "/"},
					}},
				},
			})
			if err == nil {
				t.Fatalf("expected public-site base %q to be rejected", base)
			}
		})
	}
}

func TestPlannerRejectsNamedMountWithoutHostAuthorization(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Roots = RootsConfig{AdminRoot: "/admin", APIRoot: "/admin/api", PublicAPIRoot: "/api/v1"}
	planner, err := NewPlanner(cfg, nil)
	if err != nil {
		t.Fatalf("new planner: %v", err)
	}
	err = planner.RegisterModule(ModuleContract{
		Slug: "multi_mount",
		Mounts: map[string]NamedMountContract{
			"standalone": {Routes: map[string]string{"multi_mount.standalone": "/"}},
		},
	})
	if err == nil {
		t.Fatal("expected missing host authorization error")
	}
}
