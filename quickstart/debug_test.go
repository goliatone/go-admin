package quickstart

import (
	"io"
	"log/slog"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

type debugRouter struct {
	useCalls    int
	middlewares []router.MiddlewareFunc
}

func (r *debugRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	_, _, _ = method, path, handler
	_ = middlewares
	return nil
}
func (r *debugRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}
func (r *debugRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}
func (r *debugRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(r)
	}
	_ = path
	return r
}
func (r *debugRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	r.useCalls += len(m)
	r.middlewares = append(r.middlewares, m...)
	return r
}
func (r *debugRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}
func (r *debugRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _ = prefix, root
	_ = config
	return r
}
func (r *debugRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}
func (r *debugRouter) Routes() []router.RouteDefinition { return nil }
func (r *debugRouter) PrintRoutes()                     {}
func (r *debugRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestWithDebugConfigSetsFeatureFlags(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{
			Enabled:    true,
			FeatureKey: "custom.debug",
		}),
	)

	if !cfg.Debug.Enabled {
		t.Fatalf("expected debug enabled")
	}
	if !cfg.FeatureFlags["debug"] {
		t.Fatalf("expected debug flag enabled")
	}
	if !cfg.FeatureFlags["custom.debug"] {
		t.Fatalf("expected custom debug flag enabled")
	}
}

func TestWithDebugFromEnvMapping(t *testing.T) {
	t.Setenv("ADMIN_DEBUG", "true")
	t.Setenv("ADMIN_DEBUG_ALLOWED_IPS", "1.1.1.1, 2.2.2.2")
	t.Setenv("ADMIN_DEBUG_SQL", "false")
	t.Setenv("ADMIN_DEBUG_LOGS", "true")
	t.Setenv("ADMIN_DEBUG_TOOLBAR", "false")
	t.Setenv("ADMIN_DEBUG_TOOLBAR_PANELS", "requests,sql")

	cfg := NewAdminConfig("/admin", "Admin", "en", WithDebugFromEnv())

	if !cfg.Debug.Enabled {
		t.Fatalf("expected debug enabled")
	}
	if cfg.Debug.CaptureSQL {
		t.Fatalf("expected SQL capture disabled")
	}
	if !cfg.Debug.CaptureLogs {
		t.Fatalf("expected log capture enabled")
	}
	if cfg.Debug.ToolbarMode {
		t.Fatalf("expected toolbar disabled")
	}
	if len(cfg.Debug.AllowedIPs) != 2 {
		t.Fatalf("expected allowed IPs parsed, got %v", cfg.Debug.AllowedIPs)
	}
	if len(cfg.Debug.ToolbarPanels) != 2 {
		t.Fatalf("expected toolbar panels parsed, got %v", cfg.Debug.ToolbarPanels)
	}
	if !cfg.FeatureFlags["debug"] {
		t.Fatalf("expected debug feature flag enabled")
	}
}

func TestAttachDebugMiddlewareNoopWhenDisabled(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: false}),
	)
	r := &debugRouter{}
	adm, err := admin.New(cfg, admin.Dependencies{Router: r})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}

	AttachDebugMiddleware(r, cfg, adm)

	if r.useCalls != 0 {
		t.Fatalf("expected no middleware registrations, got %d", r.useCalls)
	}
}

func TestAttachDebugMiddlewareRegistersWhenEnabled(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: true}),
	)
	r := &debugRouter{}
	adm, err := admin.New(cfg, admin.Dependencies{Router: r})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	mod := admin.NewDebugModule(cfg.Debug)
	if err := mod.Register(admin.ModuleContext{Admin: adm}); err != nil {
		t.Fatalf("debug module register error: %v", err)
	}

	AttachDebugMiddleware(r, cfg, adm)

	if r.useCalls == 0 {
		t.Fatalf("expected middleware registration")
	}
}

func TestAttachDebugLogHandlerWiresSlog(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: true, CaptureLogs: true}),
	)
	r := &debugRouter{}
	adm, err := admin.New(cfg, admin.Dependencies{Router: r})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	mod := admin.NewDebugModule(cfg.Debug)
	if err := mod.Register(admin.ModuleContext{Admin: adm}); err != nil {
		t.Fatalf("debug module register error: %v", err)
	}

	previous := slog.Default()
	t.Cleanup(func() {
		slog.SetDefault(previous)
	})
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))

	AttachDebugLogHandler(cfg, adm)

	if _, ok := slog.Default().Handler().(*admin.DebugLogHandler); !ok {
		t.Fatalf("expected debug log handler installed")
	}
}
