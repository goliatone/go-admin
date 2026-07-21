package quickstart

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	adminrouting "github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

type namedMountRuntimeModule struct{}

func (namedMountRuntimeModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "multi.mount"}
}

func (namedMountRuntimeModule) RouteContract() adminrouting.ModuleContract {
	return adminrouting.ModuleContract{
		Slug: "multi_mount",
		Mounts: map[string]adminrouting.NamedMountContract{
			"admin": {RouteDeclarations: map[string]adminrouting.RouteDeclaration{
				"multi_mount.admin": {Method: router.GET, Path: "/"},
			}},
			"options": {RouteDeclarations: map[string]adminrouting.RouteDeclaration{
				"multi_mount.options": {Method: router.GET, Path: "/"},
			}},
			"standalone": {RouteDeclarations: map[string]adminrouting.RouteDeclaration{
				"multi_mount.standalone": {Method: router.GET, Path: "/"},
			}},
		},
	}
}

type missingNamedMountRuntimeModule struct{}

func (missingNamedMountRuntimeModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: "missing.mount"}
}

func (missingNamedMountRuntimeModule) RouteContract() adminrouting.ModuleContract {
	return adminrouting.ModuleContract{
		Slug: "missing_mount",
		Mounts: map[string]adminrouting.NamedMountContract{
			"options": {RouteDeclarations: map[string]adminrouting.RouteDeclaration{
				"missing_mount.options": {Method: router.GET, Path: "/"},
			}},
		},
	}
}

func (missingNamedMountRuntimeModule) Register(admin.ModuleContext) error { return nil }

func TestDoctorReportsTypedModuleRouteMissingFromMountedTable(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithRoutingConfig(adminrouting.Config{
		Modules: map[string]adminrouting.ModuleConfig{
			"missing_mount": {Mounts: map[string]adminrouting.NamedMountOverride{
				"options": {Surface: adminrouting.SurfacePublicSite, Base: "/options"},
			}},
		},
	}))
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	if err := adm.RegisterModule(missingNamedMountRuntimeModule{}); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server := router.NewFiberAdapter()
	host := NewHostRouter(server.Router(), cfg)
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	server.Init()

	output := quickstartDoctorRoutingCheck().Run(context.Background(), adm)
	for _, finding := range output.Findings {
		if finding.Code == "quickstart.routing.route_missing" && finding.Metadata["path"] == "/options" {
			return
		}
	}
	t.Fatalf("expected typed missing route finding, got %+v", output.Findings)
}

func (namedMountRuntimeModule) Register(ctx admin.ModuleContext) error {
	for _, name := range []string{"admin", "options", "standalone"} {
		mountRouter, ok := ctx.MountRouter(name)
		if !ok {
			return fmt.Errorf("mount router %q missing", name)
		}
		path := ctx.Routing.MountRoutePath(name, "multi_mount."+name)
		mountName := name
		mountRouter.Get(path, func(c router.Context) error { return c.SendString(mountName) })
	}
	return nil
}

func TestNamedModuleMountsRegisterAcrossHostSurfaces(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en", WithRoutingConfig(adminrouting.Config{
		Modules: map[string]adminrouting.ModuleConfig{
			"multi_mount": {Mounts: map[string]adminrouting.NamedMountOverride{
				"admin":      {Surface: adminrouting.SurfaceUI, Base: "/admin/extensions/multi"},
				"options":    {Surface: adminrouting.SurfacePublicSite, Base: "/options"},
				"standalone": {Surface: adminrouting.SurfacePublicSite, Base: "/my-module"},
			}},
		},
	}))
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	if err := adm.RegisterModule(namedMountRuntimeModule{}); err != nil {
		t.Fatalf("register module: %v", err)
	}
	server := router.NewFiberAdapter()
	host := NewHostRouter(server.Router(), cfg)
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatalf("initialize: %#v report=%+v", err, adm.RoutingReport())
	}

	app := server.WrappedRouter()
	for path, want := range map[string]string{
		"/admin/extensions/multi": "admin",
		"/options":                "options",
		"/my-module":              "standalone",
	} {
		response, err := app.Test(httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
		if err != nil {
			t.Fatalf("GET %s: %v", path, err)
		}
		body, readErr := io.ReadAll(response.Body)
		if closeErr := response.Body.Close(); closeErr != nil {
			t.Fatalf("close GET %s response: %v", path, closeErr)
		}
		if readErr != nil {
			t.Fatalf("read GET %s response: %v", path, readErr)
		}
		if response.StatusCode != http.StatusOK || string(body) != want {
			t.Fatalf("GET %s = %d %q, want 200 %q", path, response.StatusCode, body, want)
		}
	}
}

func TestDoctorReportsPhysicalRouteShadowing(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{PreserveRegistrationOrder: true})
	r := server.Router()
	r.Get("/admin/*", func(c router.Context) error { return c.SendStatus(http.StatusNotFound) })
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}
	server.Init()

	output := quickstartDoctorRoutingCheck().Run(context.Background(), adm)
	for _, finding := range output.Findings {
		if finding.Code == "quickstart.routing.route_shadowed" {
			return
		}
	}
	t.Fatalf("expected runtime shadow finding, got %+v", output.Findings)
}
