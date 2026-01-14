package admin

import (
	"testing"
	"time"

	router "github.com/goliatone/go-router"
)

func TestDebugCollectorSnapshot(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels: []string{
			"template",
			"session",
			"requests",
			"sql",
			"logs",
			"custom",
			"config",
			"routes",
		},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureTemplateData(router.ViewContext{"user": "alice"})
	collector.CaptureSession(map[string]any{"user_id": "user-1"})
	collector.CaptureRequest(RequestEntry{
		ID:       "req-1",
		Method:   "GET",
		Path:     "/test",
		Status:   200,
		Duration: time.Millisecond,
		Headers:  map[string]string{"X-Test": "1"},
		Query:    map[string]string{"q": "ok"},
	})
	collector.CaptureSQL(SQLEntry{
		ID:       "sql-1",
		Query:    "SELECT 1",
		Args:     []any{1},
		Duration: time.Millisecond,
		RowCount: 1,
	})
	collector.CaptureLog(LogEntry{
		Level:   "INFO",
		Message: "hello",
		Fields:  map[string]any{"foo": "bar"},
	})
	collector.Set("custom.foo", "bar")
	collector.Log("custom", "message", "extra", "value")
	collector.CaptureConfigSnapshot(map[string]any{"admin": map[string]any{"title": "Admin"}})
	collector.CaptureRoutes([]RouteEntry{{Method: "GET", Path: "/test"}})

	snapshot := collector.Snapshot()
	if snapshot["template"] == nil {
		t.Fatalf("expected template snapshot")
	}
	if snapshot["session"] == nil {
		t.Fatalf("expected session snapshot")
	}
	requests, ok := snapshot["requests"].([]RequestEntry)
	if !ok || len(requests) != 1 || requests[0].Method != "GET" {
		t.Fatalf("expected request snapshot, got %+v", snapshot["requests"])
	}
	sqlEntries, ok := snapshot["sql"].([]SQLEntry)
	if !ok || len(sqlEntries) != 1 || sqlEntries[0].Query != "SELECT 1" {
		t.Fatalf("expected sql snapshot, got %+v", snapshot["sql"])
	}
	logEntries, ok := snapshot["logs"].([]LogEntry)
	if !ok || len(logEntries) != 1 || logEntries[0].Message != "hello" {
		t.Fatalf("expected log snapshot, got %+v", snapshot["logs"])
	}
	custom, ok := snapshot["custom"].(map[string]any)
	if !ok || custom == nil {
		t.Fatalf("expected custom snapshot, got %+v", snapshot["custom"])
	}
	customData, ok := custom["data"].(map[string]any)
	if !ok || customData == nil {
		t.Fatalf("expected custom data, got %+v", custom["data"])
	}
	nested, ok := customData["custom"].(map[string]any)
	if !ok || nested["foo"] != "bar" {
		t.Fatalf("expected nested custom data, got %+v", customData)
	}
	customLogs, ok := custom["logs"].([]CustomLogEntry)
	if !ok || len(customLogs) != 1 || customLogs[0].Category != "custom" {
		t.Fatalf("expected custom logs, got %+v", custom["logs"])
	}
	config, ok := snapshot["config"].(map[string]any)
	if !ok || config["admin"] == nil {
		t.Fatalf("expected config snapshot, got %+v", snapshot["config"])
	}
	routes, ok := snapshot["routes"].([]RouteEntry)
	if !ok || len(routes) != 1 || routes[0].Path != "/test" {
		t.Fatalf("expected routes snapshot, got %+v", snapshot["routes"])
	}
}

func TestDebugCollectorRedaction(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels: []string{
			"template",
			"session",
			"requests",
			"sql",
			"logs",
			"custom",
			"config",
		},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureTemplateData(router.ViewContext{
		"password": "secret",
		"nested": map[string]any{
			"api_key": "key",
		},
	})
	collector.CaptureSession(map[string]any{
		"auth": map[string]any{
			"token": "token",
		},
	})
	collector.CaptureRequest(RequestEntry{
		ID:       "req-1",
		Method:   "GET",
		Path:     "/test",
		Status:   200,
		Duration: time.Millisecond,
		Headers: map[string]string{
			"Authorization": "Bearer secret",
			"X-Test":        "ok",
		},
		Query: map[string]string{
			"token": "secret",
		},
	})
	collector.CaptureSQL(SQLEntry{
		ID:    "sql-1",
		Query: "SELECT *",
		Args: []any{
			map[string]any{"password": "secret"},
		},
	})
	collector.CaptureLog(LogEntry{
		Level:   "INFO",
		Message: "hello",
		Fields: map[string]any{
			"token": "secret",
			"nested": map[string]any{
				"secret": "value",
			},
		},
	})
	collector.Set("api_key", "secret")
	collector.Log("custom", "message", "jwt", "secret", "ok", "value")
	collector.CaptureConfigSnapshot(map[string]any{
		"auth": map[string]any{
			"jwt": "secret",
		},
	})

	snapshot := collector.Snapshot()
	template, ok := snapshot["template"].(map[string]any)
	if !ok || template["password"] != "[REDACTED]" {
		t.Fatalf("expected template password redacted, got %+v", snapshot["template"])
	}
	nested, ok := template["nested"].(map[string]any)
	if !ok || nested["api_key"] != "[REDACTED]" {
		t.Fatalf("expected nested api_key redacted, got %+v", template["nested"])
	}
	session, ok := snapshot["session"].(map[string]any)
	if !ok {
		t.Fatalf("expected session snapshot")
	}
	sessionAuth, ok := session["auth"].(map[string]any)
	if !ok || sessionAuth["token"] != "[REDACTED]" {
		t.Fatalf("expected session token redacted, got %+v", session["auth"])
	}
	requests, ok := snapshot["requests"].([]RequestEntry)
	if !ok || len(requests) != 1 {
		t.Fatalf("expected request snapshot, got %+v", snapshot["requests"])
	}
	if requests[0].Headers["Authorization"] != "[REDACTED]" {
		t.Fatalf("expected authorization redacted, got %+v", requests[0].Headers)
	}
	if requests[0].Query["token"] != "[REDACTED]" {
		t.Fatalf("expected query token redacted, got %+v", requests[0].Query)
	}
	sqlEntries, ok := snapshot["sql"].([]SQLEntry)
	if !ok || len(sqlEntries) != 1 {
		t.Fatalf("expected sql snapshot, got %+v", snapshot["sql"])
	}
	if len(sqlEntries[0].Args) != 1 {
		t.Fatalf("expected sql args preserved, got %+v", sqlEntries[0].Args)
	}
	sqlArgMap, ok := sqlEntries[0].Args[0].(map[string]any)
	if !ok || sqlArgMap["password"] != "[REDACTED]" {
		t.Fatalf("expected sql args redacted, got %+v", sqlEntries[0].Args)
	}
	logEntries, ok := snapshot["logs"].([]LogEntry)
	if !ok || len(logEntries) != 1 {
		t.Fatalf("expected log snapshot, got %+v", snapshot["logs"])
	}
	if logEntries[0].Fields["token"] != "[REDACTED]" {
		t.Fatalf("expected log fields redacted, got %+v", logEntries[0].Fields)
	}
	logNested, ok := logEntries[0].Fields["nested"].(map[string]any)
	if !ok || logNested["secret"] != "[REDACTED]" {
		t.Fatalf("expected nested log field redacted, got %+v", logEntries[0].Fields)
	}
	custom, ok := snapshot["custom"].(map[string]any)
	if !ok || custom == nil {
		t.Fatalf("expected custom snapshot")
	}
	customData, ok := custom["data"].(map[string]any)
	if !ok || customData["api_key"] != "[REDACTED]" {
		t.Fatalf("expected custom api_key redacted, got %+v", customData)
	}
	customLogs, ok := custom["logs"].([]CustomLogEntry)
	if !ok || len(customLogs) != 1 {
		t.Fatalf("expected custom logs, got %+v", custom["logs"])
	}
	if customLogs[0].Fields["jwt"] != "[REDACTED]" {
		t.Fatalf("expected custom log jwt redacted, got %+v", customLogs[0].Fields)
	}
	config, ok := snapshot["config"].(map[string]any)
	if !ok || config == nil {
		t.Fatalf("expected config snapshot")
	}
	configAuth, ok := config["auth"].(map[string]any)
	if !ok || configAuth["jwt"] != "[REDACTED]" {
		t.Fatalf("expected config jwt redacted, got %+v", config["auth"])
	}
}
