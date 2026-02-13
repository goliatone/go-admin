package quickstart

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	gorouter "github.com/goliatone/go-router"
)

type capturedSlogRecord struct {
	level slog.Level
	msg   string
	attrs map[string]any
}

type captureSlogHandler struct {
	mu      sync.Mutex
	records []capturedSlogRecord
}

func (h *captureSlogHandler) Enabled(context.Context, slog.Level) bool {
	return true
}

func (h *captureSlogHandler) Handle(_ context.Context, r slog.Record) error {
	attrs := map[string]any{}
	r.Attrs(func(attr slog.Attr) bool {
		attrs[attr.Key] = attr.Value.Any()
		return true
	})
	h.mu.Lock()
	h.records = append(h.records, capturedSlogRecord{
		level: r.Level,
		msg:   r.Message,
		attrs: attrs,
	})
	h.mu.Unlock()
	return nil
}

func (h *captureSlogHandler) WithAttrs([]slog.Attr) slog.Handler {
	return h
}

func (h *captureSlogHandler) WithGroup(string) slog.Handler {
	return h
}

func (h *captureSlogHandler) snapshot() []capturedSlogRecord {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]capturedSlogRecord, len(h.records))
	copy(out, h.records)
	return out
}

func TestDebugFiberSlogMiddlewareGuardedByConfig(t *testing.T) {
	cfg := admin.Config{}
	if mw := debugFiberSlogMiddleware(cfg); mw != nil {
		t.Fatalf("expected nil middleware when debug disabled")
	}

	cfg.Debug.Enabled = true
	if mw := debugFiberSlogMiddleware(cfg); mw != nil {
		t.Fatalf("expected nil middleware when capture logs disabled")
	}

	cfg.Debug.CaptureLogs = true
	if mw := debugFiberSlogMiddleware(cfg); mw == nil {
		t.Fatalf("expected middleware when debug logging is enabled")
	}
}

func TestDebugFiberSlogMiddlewareEmitsLevelByResponse(t *testing.T) {
	capture := &captureSlogHandler{}
	previous := slog.Default()
	t.Cleanup(func() {
		slog.SetDefault(previous)
	})
	slog.SetDefault(slog.New(capture))

	cfg := admin.Config{
		Debug: admin.DebugConfig{
			Enabled:     true,
			CaptureLogs: true,
		},
	}

	app := fiber.New()
	app.Use(debugFiberSlogMiddleware(cfg))
	app.Get("/ok", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	app.Get("/warn", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusBadRequest)
	})
	app.Get("/err", func(c *fiber.Ctx) error {
		return fiber.NewError(fiber.StatusInternalServerError, "boom")
	})

	okReq := httptest.NewRequest("GET", "/ok", nil)
	okReq.Header.Set("User-Agent", "quickstart-test")
	okResp, err := app.Test(okReq, -1)
	if err != nil {
		t.Fatalf("ok request failed: %v", err)
	}
	if okResp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200 got %d", okResp.StatusCode)
	}

	warnResp, err := app.Test(httptest.NewRequest("GET", "/warn", nil), -1)
	if err != nil {
		t.Fatalf("warn request failed: %v", err)
	}
	if warnResp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400 got %d", warnResp.StatusCode)
	}

	errResp, err := app.Test(httptest.NewRequest("GET", "/err", nil), -1)
	if err != nil {
		t.Fatalf("error request failed: %v", err)
	}
	if errResp.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("expected 500 got %d", errResp.StatusCode)
	}

	records := capture.snapshot()
	if len(records) != 3 {
		t.Fatalf("expected 3 request logs, got %d", len(records))
	}
	if records[0].level != slog.LevelInfo {
		t.Fatalf("expected info level for 200, got %v", records[0].level)
	}
	if records[1].level != slog.LevelWarn {
		t.Fatalf("expected warn level for 400, got %v", records[1].level)
	}
	if records[2].level != slog.LevelError {
		t.Fatalf("expected error level for 500, got %v", records[2].level)
	}
	if records[0].msg != "fiber request" || records[1].msg != "fiber request" || records[2].msg != "fiber request" {
		t.Fatalf("expected uniform log message 'fiber request', got %#v", records)
	}
	if status := fmt.Sprint(records[0].attrs["status"]); status != "200" {
		t.Fatalf("expected status attr 200, got %#v", records[0].attrs["status"])
	}
	if status := fmt.Sprint(records[1].attrs["status"]); status != "400" {
		t.Fatalf("expected status attr 400, got %#v", records[1].attrs["status"])
	}
	if status := fmt.Sprint(records[2].attrs["status"]); status != "500" {
		t.Fatalf("expected status attr 500, got %#v", records[2].attrs["status"])
	}
	if ua, _ := records[0].attrs["user_agent"].(string); ua != "quickstart-test" {
		t.Fatalf("expected user_agent attr captured, got %#v", records[0].attrs["user_agent"])
	}
	if _, ok := records[2].attrs["error"]; !ok {
		t.Fatalf("expected error attr for failed request")
	}
}

func TestNewFiberServerRouteConflictDefaultsPreferStaticInDev(t *testing.T) {
	server, r := NewFiberServer(nil, admin.Config{}, nil, true)
	r.Get("/route-conflict/:action", func(c gorouter.Context) error {
		return c.SendString("param:" + c.Param("action"))
	})

	didPanic := false
	func() {
		defer func() {
			didPanic = recover() != nil
		}()
		r.Get("/route-conflict/static", func(c gorouter.Context) error {
			return c.SendString("static")
		})
	}()
	if didPanic {
		t.Fatalf("expected no panic for static+param siblings when prefer_static is default")
	}

	app := server.WrappedRouter()
	respStatic, err := app.Test(httptest.NewRequest(http.MethodGet, "/route-conflict/static", nil), -1)
	if err != nil {
		t.Fatalf("static request failed: %v", err)
	}
	staticBody, err := io.ReadAll(respStatic.Body)
	respStatic.Body.Close()
	if err != nil {
		t.Fatalf("reading static response failed: %v", err)
	}
	if got := string(staticBody); got != "static" {
		t.Fatalf("expected static route to win, got %q", got)
	}

	respParam, err := app.Test(httptest.NewRequest(http.MethodGet, "/route-conflict/dynamic", nil), -1)
	if err != nil {
		t.Fatalf("param request failed: %v", err)
	}
	paramBody, err := io.ReadAll(respParam.Body)
	respParam.Body.Close()
	if err != nil {
		t.Fatalf("reading param response failed: %v", err)
	}
	if got := string(paramBody); got != "param:dynamic" {
		t.Fatalf("expected param route for non-static value, got %q", got)
	}
}

func TestNewFiberServerRouteConflictPanicsInDevWhenPathModeStrict(t *testing.T) {
	t.Setenv("ADMIN_ROUTE_PATH_CONFLICT_MODE", "strict")
	_, r := NewFiberServer(nil, admin.Config{}, nil, true)
	r.Get("/route-conflict-strict/:action", func(c gorouter.Context) error {
		return c.SendStatus(fiber.StatusOK)
	})

	didPanic := false
	func() {
		defer func() {
			didPanic = recover() != nil
		}()
		r.Get("/route-conflict-strict/static", func(c gorouter.Context) error {
			return c.SendStatus(fiber.StatusOK)
		})
	}()

	if !didPanic {
		t.Fatalf("expected route conflict panic in strict path mode")
	}
}

func TestNewFiberServerRouteConflictDoesNotPanicInProductionDefaults(t *testing.T) {
	_, r := NewFiberServer(nil, admin.Config{}, nil, false)
	r.Get("/route-conflict-prod/:action", func(c gorouter.Context) error {
		return c.SendStatus(fiber.StatusOK)
	})

	didPanic := false
	func() {
		defer func() {
			didPanic = recover() != nil
		}()
		r.Get("/route-conflict-prod/static", func(c gorouter.Context) error {
			return c.SendStatus(fiber.StatusOK)
		})
	}()

	if didPanic {
		t.Fatalf("expected production defaults to keep running on route conflicts")
	}
}

func TestNewFiberServerRouteConflictPolicyCanBeOverridden(t *testing.T) {
	_, r := NewFiberServer(nil, admin.Config{}, nil, true, WithFiberAdapterConfig(func(cfg *gorouter.FiberAdapterConfig) {
		if cfg == nil {
			return
		}
		policy := gorouter.HTTPRouterConflictLogAndContinue
		cfg.ConflictPolicy = &policy
		cfg.StrictRoutes = false
	}))
	r.Get("/route-conflict-override/:action", func(c gorouter.Context) error {
		return c.SendStatus(fiber.StatusOK)
	})

	didPanic := false
	func() {
		defer func() {
			didPanic = recover() != nil
		}()
		r.Get("/route-conflict-override/static", func(c gorouter.Context) error {
			return c.SendStatus(fiber.StatusOK)
		})
	}()

	if didPanic {
		t.Fatalf("expected explicit conflict policy override to prevent panic")
	}
}

func TestDefaultFiberAdapterConfigPathConflictModeDefaultsPreferStatic(t *testing.T) {
	cfg := defaultFiberAdapterConfig(admin.Config{}, true)
	if cfg.PathConflictMode != gorouter.PathConflictModePreferStatic {
		t.Fatalf("expected default path conflict mode prefer_static, got %q", cfg.PathConflictMode)
	}
}

func TestDefaultFiberAdapterConfigPathConflictModeCanBeOverriddenFromEnv(t *testing.T) {
	t.Setenv("ADMIN_ROUTE_PATH_CONFLICT_MODE", "strict")
	cfg := defaultFiberAdapterConfig(admin.Config{}, true)
	if cfg.PathConflictMode != gorouter.PathConflictModeStrict {
		t.Fatalf("expected strict path conflict mode from env, got %q", cfg.PathConflictMode)
	}

	t.Setenv("ADMIN_ROUTE_PATH_CONFLICT_MODE", "prefer-static")
	cfg = defaultFiberAdapterConfig(admin.Config{}, true)
	if cfg.PathConflictMode != gorouter.PathConflictModePreferStatic {
		t.Fatalf("expected prefer_static path conflict mode from env alias, got %q", cfg.PathConflictMode)
	}

	t.Setenv("ADMIN_ROUTE_PATH_CONFLICT_MODE", "invalid")
	cfg = defaultFiberAdapterConfig(admin.Config{}, true)
	if cfg.PathConflictMode != gorouter.PathConflictModePreferStatic {
		t.Fatalf("expected invalid env values to fallback to prefer_static, got %q", cfg.PathConflictMode)
	}
}

func TestDebugLogCaptureIncludesFiberRequestsAndDILogs(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: true, CaptureLogs: true}),
	)
	adm, err := admin.New(cfg, admin.Dependencies{Router: &debugRouter{}})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	if err := admin.NewDebugModule(cfg.Debug).Register(admin.ModuleContext{Admin: adm}); err != nil {
		t.Fatalf("debug module register error: %v", err)
	}

	previous := slog.Default()
	t.Cleanup(func() {
		slog.SetDefault(previous)
	})
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
	AttachDebugLogHandler(cfg, adm)

	app := fiber.New()
	app.Use(debugFiberSlogMiddleware(cfg))
	app.Get("/ok", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	resp, err := app.Test(httptest.NewRequest("GET", "/ok", nil), -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200 got %d", resp.StatusCode)
	}

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
	adm.NamedLogger("module.esign.service").Info(
		"module service log",
		"module", "esign",
		"service", "agreement",
	)

	collector := adm.Debug()
	if collector == nil {
		t.Fatalf("expected debug collector")
	}
	snapshot := collector.Snapshot()
	logs, ok := snapshot[admin.DebugPanelLogs].([]admin.LogEntry)
	if !ok {
		t.Fatalf("expected debug logs snapshot, got %#v", snapshot[admin.DebugPanelLogs])
	}
	if got := countDebugLogEntriesByMessage(logs, "fiber request"); got == 0 {
		t.Fatalf("expected at least one fiber request log entry")
	}
	if got := countDebugLogEntriesByMessage(logs, "panel tab collision"); got == 0 {
		t.Fatalf("expected at least one app DI log entry")
	}
	if got := countDebugLogEntriesByMessage(logs, "module service log"); got == 0 {
		t.Fatalf("expected at least one module/service DI log entry")
	}
}
