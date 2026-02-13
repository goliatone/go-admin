package admin

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	debugregistry "github.com/goliatone/go-admin/debug"
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

func TestDebugCollectorSnapshotWithContextUsesRequestContext(t *testing.T) {
	type ctxKey string

	const (
		panelID      = "test_context_snapshot_panel"
		contextKey   = ctxKey("request-id")
		contextValue = "req-123"
	)

	debugregistry.UnregisterPanel(panelID)
	defer debugregistry.UnregisterPanel(panelID)
	if err := debugregistry.RegisterPanel(panelID, debugregistry.PanelConfig{
		SnapshotKey: panelID,
		Snapshot: func(ctx context.Context) any {
			if ctx == nil {
				return map[string]any{"request_id": ""}
			}
			return map[string]any{"request_id": toString(ctx.Value(contextKey))}
		},
	}); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	collector := NewDebugCollector(DebugConfig{
		Panels: []string{panelID},
	})
	snapshot := collector.SnapshotWithContext(context.WithValue(context.Background(), contextKey, contextValue))
	panelData, ok := snapshot[panelID].(map[string]any)
	if !ok {
		t.Fatalf("expected panel payload map, got %T", snapshot[panelID])
	}
	if got := toString(panelData["request_id"]); got != contextValue {
		t.Fatalf("expected request context value %q, got %q", contextValue, got)
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

func TestDebugCollectorSessionSnapshotFiltersEntries(t *testing.T) {
	cfg := DebugConfig{
		CaptureSQL:  true,
		CaptureLogs: true,
		Panels: []string{
			DebugPanelTemplate,
			DebugPanelRequests,
			DebugPanelSQL,
			DebugPanelLogs,
			DebugPanelConfig,
			DebugPanelRoutes,
		},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureTemplateData(router.ViewContext{"user": "alice"})
	collector.CaptureConfigSnapshot(map[string]any{"admin": map[string]any{"title": "Admin"}})
	collector.CaptureRoutes([]RouteEntry{{Method: "GET", Path: "/test"}})

	collector.CaptureRequest(RequestEntry{
		ID:        "req-1",
		SessionID: "session-1",
		Method:    "GET",
		Path:      "/one",
	})
	collector.CaptureRequest(RequestEntry{
		ID:        "req-2",
		SessionID: "session-2",
		Method:    "GET",
		Path:      "/two",
	})
	collector.CaptureSQL(SQLEntry{
		ID:        "sql-1",
		SessionID: "session-1",
		Query:     "SELECT 1",
		Duration:  time.Millisecond,
	})
	collector.CaptureSQL(SQLEntry{
		ID:        "sql-2",
		SessionID: "session-2",
		Query:     "SELECT 2",
		Duration:  time.Millisecond,
	})
	collector.CaptureLog(LogEntry{
		SessionID: "session-1",
		Message:   "hello",
	})
	collector.CaptureLog(LogEntry{
		SessionID: "session-2",
		Message:   "world",
	})

	snapshot := collector.SessionSnapshot("session-1", DebugSessionSnapshotOptions{IncludeGlobalPanels: true})
	requests, ok := snapshot[DebugPanelRequests].([]RequestEntry)
	if !ok || len(requests) != 1 || requests[0].Path != "/one" {
		t.Fatalf("expected session requests filtered, got %+v", snapshot[DebugPanelRequests])
	}
	sqlEntries, ok := snapshot[DebugPanelSQL].([]SQLEntry)
	if !ok || len(sqlEntries) != 1 || sqlEntries[0].Query != "SELECT 1" {
		t.Fatalf("expected session sql filtered, got %+v", snapshot[DebugPanelSQL])
	}
	logEntries, ok := snapshot[DebugPanelLogs].([]LogEntry)
	if !ok || len(logEntries) != 1 || logEntries[0].Message != "hello" {
		t.Fatalf("expected session logs filtered, got %+v", snapshot[DebugPanelLogs])
	}
	if snapshot[DebugPanelTemplate] == nil {
		t.Fatalf("expected global template panel included")
	}
	if snapshot[DebugPanelConfig] == nil {
		t.Fatalf("expected global config panel included")
	}
	if snapshot[DebugPanelRoutes] == nil {
		t.Fatalf("expected global routes panel included")
	}

	snapshot = collector.SessionSnapshot("session-1", DebugSessionSnapshotOptions{})
	if _, ok := snapshot[DebugPanelTemplate]; ok {
		t.Fatalf("expected global panels excluded by default")
	}
	if _, ok := snapshot[DebugPanelConfig]; ok {
		t.Fatalf("expected global config excluded by default")
	}
	if _, ok := snapshot[DebugPanelRoutes]; ok {
		t.Fatalf("expected global routes excluded by default")
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

func TestDebugCollectorRequestBodyMasking(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelRequests},
	}
	collector := NewDebugCollector(cfg)

	requestBody := `{"password":"secret","nested":{"token":"token"}}`
	responseBody := `{"token":"secret"}`
	entry := RequestEntry{
		ID:          "req-1",
		Method:      "POST",
		Path:        "/test",
		Status:      200,
		Duration:    time.Millisecond,
		ContentType: "application/json",
		RequestBody: requestBody,
		ResponseHeaders: map[string]string{
			"Content-Type": "application/json",
			"Set-Cookie":   "secret",
		},
		ResponseBody: responseBody,
	}

	collector.CaptureRequest(entry)

	requests := collector.requestLog.Values()
	if len(requests) != 1 {
		t.Fatalf("expected request snapshot, got %d", len(requests))
	}
	masked := requests[0]

	var requestPayload map[string]any
	if err := json.Unmarshal([]byte(requestBody), &requestPayload); err != nil {
		t.Fatalf("expected request body to unmarshal: %v", err)
	}
	expectedRequest := debugMaskMap(cfg, requestPayload)
	expectedRequestJSON, err := json.Marshal(expectedRequest)
	if err != nil {
		t.Fatalf("expected request body to marshal: %v", err)
	}
	if masked.RequestBody != string(expectedRequestJSON) {
		t.Fatalf("expected masked request body, got %q", masked.RequestBody)
	}

	var responsePayload map[string]any
	if err := json.Unmarshal([]byte(responseBody), &responsePayload); err != nil {
		t.Fatalf("expected response body to unmarshal: %v", err)
	}
	expectedResponse := debugMaskMap(cfg, responsePayload)
	expectedResponseJSON, err := json.Marshal(expectedResponse)
	if err != nil {
		t.Fatalf("expected response body to marshal: %v", err)
	}
	if masked.ResponseBody != string(expectedResponseJSON) {
		t.Fatalf("expected masked response body, got %q", masked.ResponseBody)
	}

	expectedHeaders := debugMaskStringMap(cfg, normalizeHeaderMap(entry.ResponseHeaders))
	if masked.ResponseHeaders["Set-Cookie"] != expectedHeaders["Set-Cookie"] {
		t.Fatalf("expected masked response headers, got %q", masked.ResponseHeaders["Set-Cookie"])
	}
}

func TestDebugCollectorJSErrorSnapshotAndClear(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelJSErrors},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-1",
		Type:    "uncaught",
		Message: "ReferenceError: foo is not defined",
		Source:  "app.js",
		Line:    42,
		Column:  12,
		Stack:   "ReferenceError: foo is not defined\n    at app.js:42:12",
		URL:     "http://localhost:8080/admin",
	})
	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-2",
		Type:    "unhandled_rejection",
		Message: "fetch failed",
	})

	snapshot := collector.Snapshot()
	entries, ok := snapshot[DebugPanelJSErrors].([]JSErrorEntry)
	if !ok {
		t.Fatalf("expected jserrors snapshot, got %T", snapshot[DebugPanelJSErrors])
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 jserror entries, got %d", len(entries))
	}
	if entries[0].Message != "ReferenceError: foo is not defined" {
		t.Fatalf("expected first error message preserved, got %q", entries[0].Message)
	}
	if entries[1].Type != "unhandled_rejection" {
		t.Fatalf("expected second error type, got %q", entries[1].Type)
	}

	// ClearPanel
	if !collector.ClearPanel(DebugPanelJSErrors) {
		t.Fatalf("expected ClearPanel to succeed")
	}
	snapshot = collector.Snapshot()
	entriesAfter, ok := snapshot[DebugPanelJSErrors].([]JSErrorEntry)
	if !ok {
		t.Fatalf("expected jserrors snapshot after clear, got %T", snapshot[DebugPanelJSErrors])
	}
	if len(entriesAfter) != 0 {
		t.Fatalf("expected 0 entries after clear, got %d", len(entriesAfter))
	}
}

func TestDebugCollectorJSErrorStreaming(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelJSErrors},
	}
	collector := NewDebugCollector(cfg)
	events := collector.Subscribe("client-jse")
	if events == nil {
		t.Fatalf("expected subscription channel")
	}

	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-stream",
		Type:    "console_error",
		Message: "test error",
	})

	select {
	case event := <-events:
		if event.Type != "jserror" {
			t.Fatalf("expected jserror event type, got %q", event.Type)
		}
		payload, ok := event.Payload.(JSErrorEntry)
		if !ok {
			t.Fatalf("expected JSErrorEntry payload, got %T", event.Payload)
		}
		if payload.Message != "test error" {
			t.Fatalf("expected message 'test error', got %q", payload.Message)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatalf("expected jserror event")
	}
}

func TestDebugCollectorJSErrorMasking(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelJSErrors},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-mask",
		Type:    "uncaught",
		Message: "failed at http://example.com/api?apikey=abc123&name=test",
		Stack:   "Error\n    at http://example.com/api?secret=xyz789",
		URL:     "http://localhost:8080/page?session=tok456&q=hello",
		Extra:   map[string]any{"jwt": "secret-token"},
	})

	entries := collector.jsErrorLog.Values()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	masked := entries[0]

	// URL query params with sensitive field names should be masked
	if masked.Message == "failed at http://example.com/api?apikey=abc123&name=test" {
		t.Fatalf("expected message apikey to be masked, got %q", masked.Message)
	}
	if masked.Stack == "Error\n    at http://example.com/api?secret=xyz789" {
		t.Fatalf("expected stack secret to be masked, got %q", masked.Stack)
	}
	if masked.URL == "http://localhost:8080/page?session=tok456&q=hello" {
		t.Fatalf("expected URL session to be masked, got %q", masked.URL)
	}

	// Extra map should be masked via debugMaskMap
	expectedExtra := mustMaskAnyMap(t, cfg, map[string]any{"jwt": "secret-token"})
	if masked.Extra["jwt"] != expectedExtra["jwt"] {
		t.Fatalf("expected extra jwt masked, got %v", masked.Extra["jwt"])
	}
}

func TestDebugCollectorClearIncludesJSErrors(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelJSErrors},
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-clear",
		Type:    "uncaught",
		Message: "test",
	})

	if len(collector.jsErrorLog.Values()) != 1 {
		t.Fatalf("expected 1 entry before clear")
	}

	collector.Clear()

	if len(collector.jsErrorLog.Values()) != 0 {
		t.Fatalf("expected 0 entries after Clear(), got %d", len(collector.jsErrorLog.Values()))
	}
}

func TestDebugCollectorJSErrorDisabledPanel(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelRequests}, // jserrors not in list
	}
	collector := NewDebugCollector(cfg)

	collector.CaptureJSError(JSErrorEntry{
		ID:      "jse-disabled",
		Type:    "uncaught",
		Message: "should be ignored",
	})

	if len(collector.jsErrorLog.Values()) != 0 {
		t.Fatalf("expected jserror to be ignored when panel disabled, got %d", len(collector.jsErrorLog.Values()))
	}
	snapshot := collector.Snapshot()
	if snapshot[DebugPanelJSErrors] != nil {
		t.Fatalf("expected jserrors absent from snapshot when panel disabled")
	}
}
