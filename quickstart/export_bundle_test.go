package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-router"
)

type recordedRoute struct {
	method string
	path   string
}

type recordingRouter struct {
	routes []recordedRoute
}

func (r *recordingRouter) record(method, path string) {
	r.routes = append(r.routes, recordedRoute{method: method, path: path})
}

func (r *recordingRouter) has(method, path string) bool {
	for _, route := range r.routes {
		if route.method == method && route.path == path {
			return true
		}
	}
	return false
}

func (r *recordingRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.record("GET", path)
	return nil
}

func (r *recordingRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.record("POST", path)
	return nil
}

func (r *recordingRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.record("PUT", path)
	return nil
}

func (r *recordingRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.record("DELETE", path)
	return nil
}

func TestExportBundleWiresRegistryAndRoutes(t *testing.T) {
	bundle := NewExportBundle()
	if bundle == nil {
		t.Fatalf("expected export bundle")
	}
	if bundle.Runner == nil {
		t.Fatalf("expected export runner")
	}
	if bundle.Registry == nil {
		t.Fatalf("expected export registry adapter")
	}
	if bundle.Registrar == nil {
		t.Fatalf("expected export registrar adapter")
	}
	if bundle.Metadata == nil {
		t.Fatalf("expected export metadata adapter")
	}

	recorder := &recordingRouter{}
	if err := bundle.Registrar.RegisterExportRoutes(recorder, admin.ExportRouteOptions{BasePath: "/admin"}); err != nil {
		t.Fatalf("register routes: %v", err)
	}

	base := "/admin/exports"
	if !recorder.has("POST", base) {
		t.Fatalf("expected export POST route for %s", base)
	}
	if !recorder.has("GET", base+"/:id") {
		t.Fatalf("expected export status route for %s/:id", base)
	}
	if !recorder.has("GET", base+"/:id/download") {
		t.Fatalf("expected export download route")
	}
	if !recorder.has("DELETE", base+"/:id") {
		t.Fatalf("expected export delete route")
	}
}
