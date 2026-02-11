package quickstart

import (
	"context"
	"io"
	"log"
	"log/slog"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
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
func (r *debugRouter) ValidateRoutes() []error          { return nil }
func (r *debugRouter) PrintRoutes()                     {}
func (r *debugRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

func TestWithDebugConfigSetsFeatureDefaults(t *testing.T) {
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
	gate := buildFeatureGate(cfg, DefaultAdminFeatures(), nil)
	assertFeatureEnabled(t, gate, "debug")
	assertFeatureEnabled(t, gate, "custom.debug")
}

func TestWithDebugFromEnvMapping(t *testing.T) {
	t.Setenv("ADMIN_DEBUG", "true")
	t.Setenv("ADMIN_DEBUG_ALLOWED_IPS", "1.1.1.1, 2.2.2.2")
	t.Setenv("ADMIN_DEBUG_ALLOWED_ORIGINS", "https://one.example, https://two.example")
	t.Setenv("ADMIN_DEBUG_APP_ID", "app-1")
	t.Setenv("ADMIN_DEBUG_APP_NAME", "Admin Service")
	t.Setenv("ADMIN_DEBUG_ENVIRONMENT", "staging")
	t.Setenv("ADMIN_DEBUG_REMOTE", "true")
	t.Setenv("ADMIN_DEBUG_TOKEN_TTL", "15m")
	t.Setenv("ADMIN_DEBUG_SESSION_TRACKING", "true")
	t.Setenv("ADMIN_DEBUG_SESSION_GLOBAL_PANELS", "false")
	t.Setenv("ADMIN_DEBUG_SESSION_COOKIE", "debug_session_cookie")
	t.Setenv("ADMIN_DEBUG_SESSION_EXPIRY", "45m")
	t.Setenv("ADMIN_DEBUG_SQL", "false")
	t.Setenv("ADMIN_DEBUG_LOGS", "true")
	t.Setenv("ADMIN_DEBUG_JS_ERRORS", "false")
	t.Setenv("ADMIN_DEBUG_REQUEST_BODY", "true")
	t.Setenv("ADMIN_DEBUG_TOOLBAR", "false")
	t.Setenv("ADMIN_DEBUG_TOOLBAR_PANELS", "requests,sql")
	t.Setenv("ADMIN_DEBUG_LAYOUT", "admin")
	t.Setenv("ADMIN_DEBUG_REPL", "true")
	t.Setenv("ADMIN_DEBUG_REPL_READONLY", "false")

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
	if cfg.Debug.CaptureJSErrors {
		t.Fatalf("expected js error capture disabled")
	}
	if !cfg.Debug.CaptureRequestBody {
		t.Fatalf("expected request body capture enabled")
	}
	if cfg.Debug.ToolbarMode {
		t.Fatalf("expected toolbar disabled")
	}
	if cfg.Debug.LayoutMode != admin.DebugLayoutAdmin {
		t.Fatalf("expected layout mode admin, got %v", cfg.Debug.LayoutMode)
	}
	if !cfg.Debug.Repl.Enabled {
		t.Fatalf("expected repl enabled")
	}
	if !cfg.Debug.Repl.AppEnabled || !cfg.Debug.Repl.ShellEnabled {
		t.Fatalf("expected repl app/shell enabled")
	}
	if cfg.Debug.Repl.ReadOnlyEnabled() {
		t.Fatalf("expected repl read-only disabled")
	}
	if len(cfg.Debug.AllowedIPs) != 2 {
		t.Fatalf("expected allowed IPs parsed, got %v", cfg.Debug.AllowedIPs)
	}
	if len(cfg.Debug.AllowedOrigins) != 2 {
		t.Fatalf("expected allowed origins parsed, got %v", cfg.Debug.AllowedOrigins)
	}
	if cfg.Debug.AppID != "app-1" {
		t.Fatalf("expected app id, got %q", cfg.Debug.AppID)
	}
	if cfg.Debug.AppName != "Admin Service" {
		t.Fatalf("expected app name, got %q", cfg.Debug.AppName)
	}
	if cfg.Debug.Environment != "staging" {
		t.Fatalf("expected environment, got %q", cfg.Debug.Environment)
	}
	if !cfg.Debug.RemoteEnabled {
		t.Fatalf("expected remote enabled")
	}
	if cfg.Debug.TokenTTL != 15*time.Minute {
		t.Fatalf("expected token ttl 15m, got %v", cfg.Debug.TokenTTL)
	}
	if !cfg.Debug.SessionTracking {
		t.Fatalf("expected session tracking enabled")
	}
	if cfg.Debug.SessionIncludeGlobalPanelsEnabled() {
		t.Fatalf("expected session global panels disabled")
	}
	if cfg.Debug.SessionCookieName != "debug_session_cookie" {
		t.Fatalf("expected session cookie name, got %q", cfg.Debug.SessionCookieName)
	}
	if cfg.Debug.SessionInactivityExpiry != 45*time.Minute {
		t.Fatalf("expected session expiry 45m, got %v", cfg.Debug.SessionInactivityExpiry)
	}
	if len(cfg.Debug.ToolbarPanels) != 2 {
		t.Fatalf("expected toolbar panels parsed, got %v", cfg.Debug.ToolbarPanels)
	}
	gate := buildFeatureGate(cfg, DefaultAdminFeatures(), nil)
	assertFeatureEnabled(t, gate, "debug")
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

func TestAttachDebugMiddlewareRegistersBeforeCollectorReady(t *testing.T) {
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

	// Do not register/debug-initialize module yet; middleware should still be attached.
	AttachDebugMiddleware(r, cfg, adm)

	if r.useCalls == 0 {
		t.Fatalf("expected middleware registration before collector is initialized")
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

func TestAttachDebugLogHandlerAvoidsDefaultDelegateRecursion(t *testing.T) {
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

	AttachDebugLogHandler(cfg, adm)

	done := make(chan struct{})
	go func() {
		log.Printf("debug log handler recursion probe")
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(1 * time.Second):
		t.Fatalf("log.Printf blocked after attaching debug slog handler")
	}
}

func TestAttachDebugLogHandlerInstallsBridgeIdempotently(t *testing.T) {
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
	AttachDebugLogHandler(cfg, adm)

	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:     "dup",
		Label:  "First",
		Target: admin.PanelTabTarget{Type: "panel", Panel: "first"},
	}); err != nil {
		t.Fatalf("register first tab: %v", err)
	}
	if err := adm.RegisterPanelTab("users", admin.PanelTab{
		ID:     "dup",
		Label:  "Second",
		Target: admin.PanelTabTarget{Type: "panel", Panel: "second"},
	}); err != nil {
		t.Fatalf("register duplicate tab: %v", err)
	}

	collector := adm.Debug()
	if collector == nil {
		t.Fatalf("expected debug collector")
	}
	snapshot := collector.Snapshot()
	entries, ok := snapshot[admin.DebugPanelLogs].([]admin.LogEntry)
	if !ok {
		t.Fatalf("expected debug logs snapshot, got %#v", snapshot[admin.DebugPanelLogs])
	}
	if got := countDebugLogEntriesByMessage(entries, "panel tab collision"); got != 1 {
		t.Fatalf("expected exactly one panel tab collision log, got %d", got)
	}
}

func countDebugLogEntriesByMessage(entries []admin.LogEntry, message string) int {
	count := 0
	for _, entry := range entries {
		if entry.Message == message {
			count++
		}
	}
	return count
}

func assertFeatureEnabled(t *testing.T, gate fggate.FeatureGate, feature string) {
	t.Helper()
	enabled, err := gate.Enabled(context.Background(), feature, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	if err != nil || !enabled {
		t.Fatalf("expected feature %s enabled, err=%v", feature, err)
	}
}
