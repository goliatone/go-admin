package quickstart

import (
	"context"
	"fmt"
	"log/slog"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
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
