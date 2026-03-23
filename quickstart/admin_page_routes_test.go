package quickstart

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type adminPageRecordingRouter struct {
	routes []recordedRoute
}

func (r *adminPageRecordingRouter) record(method, path string) {
	r.routes = append(r.routes, recordedRoute{method: method, path: path})
}

func (r *adminPageRecordingRouter) has(method, path string) bool {
	for _, route := range r.routes {
		if route.method == method && route.path == path {
			return true
		}
	}
	return false
}

func (r *adminPageRecordingRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.record(string(method), path)
	return nil
}

func (r *adminPageRecordingRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *adminPageRecordingRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *adminPageRecordingRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	_ = path
	if cb != nil {
		cb(r)
	}
	return r
}

func (r *adminPageRecordingRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *adminPageRecordingRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("GET", path)
	return nil
}

func (r *adminPageRecordingRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("POST", path)
	return nil
}

func (r *adminPageRecordingRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("PUT", path)
	return nil
}

func (r *adminPageRecordingRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("DELETE", path)
	return nil
}

func (r *adminPageRecordingRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("PATCH", path)
	return nil
}

func (r *adminPageRecordingRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = handler, mw
	r.record("HEAD", path)
	return nil
}

func (r *adminPageRecordingRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _ = prefix, root
	_ = config
	return r
}

func (r *adminPageRecordingRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *adminPageRecordingRouter) Routes() []router.RouteDefinition { return nil }
func (r *adminPageRecordingRouter) ValidateRoutes() []error          { return nil }
func (r *adminPageRecordingRouter) PrintRoutes()                     {}

func (r *adminPageRecordingRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestRegisterAdminPageRoutesRegistersGetAndHead(t *testing.T) {
	recorder := &adminPageRecordingRouter{}
	cfg := admin.Config{BasePath: "/admin"}

	err := RegisterAdminPageRoutes[*fiber.App](
		recorder,
		cfg,
		nil,
		nil,
		AdminPageSpec{
			Path:     "/admin/esign/sources",
			Template: "resources/esign-source-management/runtime",
			Title:    "Source Browser",
		},
	)
	if err != nil {
		t.Fatalf("register admin page routes: %v", err)
	}

	if !recorder.has("GET", "/admin/esign/sources") {
		t.Fatalf("expected GET route for /admin/esign/sources")
	}
	if !recorder.has("HEAD", "/admin/esign/sources") {
		t.Fatalf("expected HEAD route for /admin/esign/sources")
	}
}
