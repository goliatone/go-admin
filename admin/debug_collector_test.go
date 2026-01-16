package admin

import (
	"context"
	"testing"
	"time"

	router "github.com/goliatone/go-router"
)

func TestDebugCollectorSnapshot(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels: []string{
			DebugPanelTemplate,
			DebugPanelSession,
			DebugPanelRequests,
			DebugPanelSQL,
			DebugPanelLogs,
			DebugPanelCustom,
			DebugPanelConfig,
			DebugPanelRoutes,
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
	if snapshot[DebugPanelTemplate] == nil {
		t.Fatalf("expected template snapshot")
	}
	if snapshot[DebugPanelSession] == nil {
		t.Fatalf("expected session snapshot")
	}
	requests, ok := snapshot[DebugPanelRequests].([]RequestEntry)
	if !ok || len(requests) != 1 || requests[0].Method != "GET" {
		t.Fatalf("expected request snapshot, got %+v", snapshot[DebugPanelRequests])
	}
	sqlEntries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(sqlEntries) != 1 || sqlEntries[0].Query != "SELECT 1" {
		t.Fatalf("expected sql snapshot, got %+v", snapshot[DebugPanelSQL])
	}
	logEntries, ok := snapshot[DebugPanelLogs].([]LogEntry)
	if !ok || len(logEntries) != 1 || logEntries[0].Message != "hello" {
		t.Fatalf("expected log snapshot, got %+v", snapshot[DebugPanelLogs])
	}
	custom, ok := snapshot[DebugPanelCustom].(map[string]any)
	if !ok || custom == nil {
		t.Fatalf("expected custom snapshot, got %+v", snapshot[DebugPanelCustom])
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
	config, ok := snapshot[DebugPanelConfig].(map[string]any)
	if !ok || config["admin"] == nil {
		t.Fatalf("expected config snapshot, got %+v", snapshot[DebugPanelConfig])
	}
	routes, ok := snapshot[DebugPanelRoutes].([]RouteEntry)
	if !ok || len(routes) != 1 || routes[0].Path != "/test" {
		t.Fatalf("expected routes snapshot, got %+v", snapshot[DebugPanelRoutes])
	}
}

func TestDebugCollectorRedaction(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels: []string{
			DebugPanelTemplate,
			DebugPanelSession,
			DebugPanelRequests,
			DebugPanelSQL,
			DebugPanelLogs,
			DebugPanelCustom,
			DebugPanelConfig,
		},
	}
	collector := NewDebugCollector(cfg)

	templateInput := router.ViewContext{
		"password": "secret",
		"nested": map[string]any{
			"api_key": "key",
		},
	}
	sessionInput := map[string]any{
		"auth": map[string]any{
			"token": "token",
		},
	}
	requestHeaders := map[string]string{
		"Authorization": "Bearer secret",
		"X-Test":        "ok",
	}
	requestQuery := map[string]string{
		"token": "secret",
	}
	sqlArgs := []any{
		map[string]any{"password": "secret"},
	}
	logFields := map[string]any{
		"token": "secret",
		"nested": map[string]any{
			"secret": "value",
		},
	}
	configInput := map[string]any{
		"auth": map[string]any{
			"jwt": "secret",
		},
	}

	collector.CaptureTemplateData(templateInput)
	collector.CaptureSession(sessionInput)
	collector.CaptureRequest(RequestEntry{
		ID:       "req-1",
		Method:   "GET",
		Path:     "/test",
		Status:   200,
		Duration: time.Millisecond,
		Headers:  requestHeaders,
		Query:    requestQuery,
	})
	collector.CaptureSQL(SQLEntry{
		ID:    "sql-1",
		Query: "SELECT *",
		Args:  sqlArgs,
	})
	collector.CaptureLog(LogEntry{
		Level:   "INFO",
		Message: "hello",
		Fields:  logFields,
	})
	collector.Set("api_key", "secret")
	collector.Log("custom", "message", "jwt", "secret", "ok", "value")
	collector.CaptureConfigSnapshot(configInput)

	snapshot := collector.Snapshot()
	expectedTemplate := mustMaskAnyMap(t, cfg, map[string]any(templateInput))
	template, ok := snapshot[DebugPanelTemplate].(map[string]any)
	if !ok || template["password"] != expectedTemplate["password"] {
		t.Fatalf("expected template password redacted, got %+v", snapshot[DebugPanelTemplate])
	}
	expectedTemplateNested, _ := expectedTemplate["nested"].(map[string]any)
	nested, ok := template["nested"].(map[string]any)
	if !ok || nested["api_key"] != expectedTemplateNested["api_key"] {
		t.Fatalf("expected nested api_key redacted, got %+v", template["nested"])
	}
	expectedSession := mustMaskAnyMap(t, cfg, sessionInput)
	session, ok := snapshot[DebugPanelSession].(map[string]any)
	if !ok {
		t.Fatalf("expected session snapshot")
	}
	expectedSessionAuth, _ := expectedSession["auth"].(map[string]any)
	sessionAuth, ok := session["auth"].(map[string]any)
	if !ok || sessionAuth["token"] != expectedSessionAuth["token"] {
		t.Fatalf("expected session token redacted, got %+v", session["auth"])
	}
	requests, ok := snapshot[DebugPanelRequests].([]RequestEntry)
	if !ok || len(requests) != 1 {
		t.Fatalf("expected request snapshot, got %+v", snapshot[DebugPanelRequests])
	}
	expectedHeaders := mustMaskStringMap(t, cfg, normalizeHeaderMap(requestHeaders))
	if requests[0].Headers["Authorization"] != expectedHeaders["Authorization"] {
		t.Fatalf("expected authorization redacted, got %+v", requests[0].Headers)
	}
	expectedQuery := mustMaskStringMap(t, cfg, requestQuery)
	if requests[0].Query["token"] != expectedQuery["token"] {
		t.Fatalf("expected query token redacted, got %+v", requests[0].Query)
	}
	sqlEntries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(sqlEntries) != 1 {
		t.Fatalf("expected sql snapshot, got %+v", snapshot[DebugPanelSQL])
	}
	if len(sqlEntries[0].Args) != 1 {
		t.Fatalf("expected sql args preserved, got %+v", sqlEntries[0].Args)
	}
	expectedArgs := mustMaskSlice(t, cfg, sqlArgs)
	expectedArgMap, _ := expectedArgs[0].(map[string]any)
	sqlArgMap, ok := sqlEntries[0].Args[0].(map[string]any)
	if !ok || sqlArgMap["password"] != expectedArgMap["password"] {
		t.Fatalf("expected sql args redacted, got %+v", sqlEntries[0].Args)
	}
	logEntries, ok := snapshot[DebugPanelLogs].([]LogEntry)
	if !ok || len(logEntries) != 1 {
		t.Fatalf("expected log snapshot, got %+v", snapshot[DebugPanelLogs])
	}
	expectedLogFields := mustMaskAnyMap(t, cfg, logFields)
	if logEntries[0].Fields["token"] != expectedLogFields["token"] {
		t.Fatalf("expected log fields redacted, got %+v", logEntries[0].Fields)
	}
	expectedLogNested, _ := expectedLogFields["nested"].(map[string]any)
	logNested, ok := logEntries[0].Fields["nested"].(map[string]any)
	if !ok || logNested["secret"] != expectedLogNested["secret"] {
		t.Fatalf("expected nested log field redacted, got %+v", logEntries[0].Fields)
	}
	custom, ok := snapshot[DebugPanelCustom].(map[string]any)
	if !ok || custom == nil {
		t.Fatalf("expected custom snapshot")
	}
	expectedCustomValue := mustMaskAnyMap(t, cfg, map[string]any{"api_key": "secret"})["api_key"]
	customData, ok := custom["data"].(map[string]any)
	if !ok || customData["api_key"] != expectedCustomValue {
		t.Fatalf("expected custom api_key redacted, got %+v", customData)
	}
	customLogs, ok := custom["logs"].([]CustomLogEntry)
	if !ok || len(customLogs) != 1 {
		t.Fatalf("expected custom logs, got %+v", custom["logs"])
	}
	expectedCustomFields := mustMaskAnyMap(t, cfg, map[string]any{"jwt": "secret", "ok": "value"})
	if customLogs[0].Fields["jwt"] != expectedCustomFields["jwt"] {
		t.Fatalf("expected custom log jwt redacted, got %+v", customLogs[0].Fields)
	}
	expectedConfig := mustMaskAnyMap(t, cfg, configInput)
	config, ok := snapshot[DebugPanelConfig].(map[string]any)
	if !ok || config == nil {
		t.Fatalf("expected config snapshot")
	}
	expectedConfigAuth, _ := expectedConfig["auth"].(map[string]any)
	configAuth, ok := config["auth"].(map[string]any)
	if !ok || configAuth["jwt"] != expectedConfigAuth["jwt"] {
		t.Fatalf("expected config jwt redacted, got %+v", config["auth"])
	}
}

func mustMaskAnyMap(t *testing.T, cfg DebugConfig, value map[string]any) map[string]any {
	t.Helper()
	masked, err := debugMasker(cfg).Mask(value)
	if err != nil {
		t.Fatalf("expected mask to succeed: %v", err)
	}
	typed, ok := masked.(map[string]any)
	if !ok {
		t.Fatalf("expected masked map, got %T", masked)
	}
	return typed
}

func mustMaskStringMap(t *testing.T, cfg DebugConfig, value map[string]string) map[string]string {
	t.Helper()
	masked, err := debugMasker(cfg).Mask(value)
	if err != nil {
		t.Fatalf("expected mask to succeed: %v", err)
	}
	typed, ok := masked.(map[string]string)
	if !ok {
		t.Fatalf("expected masked string map, got %T", masked)
	}
	return typed
}

func mustMaskSlice(t *testing.T, cfg DebugConfig, value []any) []any {
	t.Helper()
	masked, err := debugMasker(cfg).Mask(value)
	if err != nil {
		t.Fatalf("expected mask to succeed: %v", err)
	}
	typed, ok := masked.([]any)
	if !ok {
		t.Fatalf("expected masked slice, got %T", masked)
	}
	return typed
}

type testDebugPanel struct {
	id string
}

func (p testDebugPanel) ID() string    { return p.id }
func (p testDebugPanel) Label() string { return "Test Panel" }
func (p testDebugPanel) Icon() string  { return "test" }
func (p testDebugPanel) Collect(_ context.Context) map[string]any {
	return map[string]any{"origin": "collect"}
}

func TestDebugCollectorPublishPanelSnapshot(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{"activity"},
	}
	collector := NewDebugCollector(cfg)
	collector.RegisterPanel(testDebugPanel{id: "activity"})

	collector.PublishPanel("activity", map[string]any{
		"token": "secret",
		"count": 3,
	})

	snapshot := collector.Snapshot()
	panel, ok := snapshot["activity"].(map[string]any)
	if !ok {
		t.Fatalf("expected activity snapshot, got %+v", snapshot["activity"])
	}
	expected := mustMaskAnyMap(t, cfg, map[string]any{
		"token": "secret",
		"count": 3,
	})
	if panel["token"] != expected["token"] {
		t.Fatalf("expected token masked, got %+v", panel["token"])
	}
	if panel["count"] != expected["count"] {
		t.Fatalf("expected count preserved, got %+v", panel["count"])
	}
}

func TestDebugCollectorPublishPanelStreaming(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{"activity"},
	}
	collector := NewDebugCollector(cfg)
	events := collector.Subscribe("client-1")
	if events == nil {
		t.Fatalf("expected subscription channel")
	}

	payload := map[string]any{"status": "ok"}
	collector.PublishPanel("activity", payload)

	select {
	case event := <-events:
		if event.Type != "activity" {
			t.Fatalf("expected activity event type, got %+v", event.Type)
		}
		eventPayload, ok := event.Payload.(map[string]any)
		if !ok || eventPayload["status"] != "ok" {
			t.Fatalf("expected activity payload, got %+v", event.Payload)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatalf("expected activity event")
	}
}
