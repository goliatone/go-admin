package routing

import "testing"

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
