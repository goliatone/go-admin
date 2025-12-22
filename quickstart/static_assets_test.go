package quickstart

import (
	"io/fs"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type staticCall struct {
	prefix string
	root   string
	config router.Static
}

type stubRouter struct {
	staticCalls []staticCall
}

func (s *stubRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = method, path, handler
	_ = middlewares
	return nil
}
func (s *stubRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return s
}
func (s *stubRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return s
}
func (s *stubRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(s)
	}
	_ = path
	return s
}
func (s *stubRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return s
}
func (s *stubRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (s *stubRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	call := staticCall{prefix: prefix, root: root}
	if len(config) > 0 {
		call.config = config[0]
	}
	s.staticCalls = append(s.staticCalls, call)
	return s
}
func (s *stubRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}
func (s *stubRouter) Routes() []router.RouteDefinition { return nil }
func (s *stubRouter) PrintRoutes()                     {}
func (s *stubRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return s
}

func findStaticCall(calls []staticCall, prefix string) (staticCall, bool) {
	for _, call := range calls {
		if call.prefix == prefix {
			return call, true
		}
	}
	return staticCall{}, false
}

func TestNewStaticAssetsPrefersDiskAssets(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	diskFS := fstest.MapFS{
		"app.js": {Data: []byte("disk")},
	}
	embeddedFS := fstest.MapFS{
		"app.js": {Data: []byte("embedded")},
	}

	NewStaticAssets(r, cfg, embeddedFS, WithDiskAssetsFS(diskFS))

	call, ok := findStaticCall(r.staticCalls, "/admin/assets")
	if !ok {
		t.Fatalf("expected assets mount")
	}
	if call.config.FS == nil {
		t.Fatalf("expected static FS configured")
	}
	data, err := fs.ReadFile(call.config.FS, "app.js")
	if err != nil {
		t.Fatalf("read static asset: %v", err)
	}
	if string(data) != "disk" {
		t.Fatalf("expected disk asset override, got %q", string(data))
	}
}

func TestNewStaticAssetsMountsExpectedRoutes(t *testing.T) {
	r := &stubRouter{}
	cfg := admin.Config{BasePath: "/admin"}
	assetsFS := fstest.MapFS{
		"app.js": {Data: []byte("assets")},
	}

	NewStaticAssets(r, cfg, assetsFS)

	expected := map[string]bool{
		"/admin/assets":             false,
		"/runtime":                  false,
		"/admin/formgen":            false,
		"/dashboard/assets/echarts": false,
	}

	for _, call := range r.staticCalls {
		if _, ok := expected[call.prefix]; ok {
			expected[call.prefix] = true
		}
	}

	for prefix, found := range expected {
		if !found {
			t.Fatalf("expected static mount for %s", prefix)
		}
	}
}
