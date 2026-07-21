package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	glog "github.com/goliatone/go-logger/glog"
)

type debugRecordingHandler struct {
	mu      *sync.Mutex
	records *[]slog.Record
	attrs   []slog.Attr
	groups  []string
	err     error
}

func newDebugRecordingHandler(records *[]slog.Record) *debugRecordingHandler {
	return &debugRecordingHandler{mu: &sync.Mutex{}, records: records}
}

func (h *debugRecordingHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h *debugRecordingHandler) Handle(_ context.Context, record slog.Record) error {
	h.mu.Lock()
	*h.records = append(*h.records, record.Clone())
	h.mu.Unlock()
	return h.err
}

func (h *debugRecordingHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	clone := *h
	clone.attrs = append(append([]slog.Attr(nil), h.attrs...), attrs...)
	return &clone
}

func (h *debugRecordingHandler) WithGroup(name string) slog.Handler {
	clone := *h
	clone.groups = append(append([]string(nil), h.groups...), name)
	return &clone
}

func newLogTestCollector(maxEntries int) *DebugCollector {
	return NewDebugCollector(DebugConfig{
		CaptureLogs:   true,
		MaxLogEntries: maxEntries,
		Panels:        []string{DebugPanelLogs},
	})
}

func capturedLogs(t *testing.T, collector *DebugCollector) []LogEntry {
	t.Helper()
	logs, ok := collector.Snapshot()[DebugPanelLogs].([]LogEntry)
	if !ok {
		t.Fatalf("logs snapshot type = %T", collector.Snapshot()[DebugPanelLogs])
	}
	return logs
}

func TestDebugLogHandlerProviderLifecycleAndDelegate(t *testing.T) {
	var current *DebugCollector
	delegateRecords := []slog.Record{}
	delegate := newDebugRecordingHandler(&delegateRecords)
	handler := NewDebugLogHandlerProvider(func() *DebugCollector { return current }, delegate)

	if !handler.Enabled(context.Background(), slog.LevelInfo) {
		t.Fatal("delegate should keep handler enabled before collector setup")
	}
	record := slog.NewRecord(time.Now(), slog.LevelInfo, "startup", 0)
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("startup handle: %v", err)
	}

	first := newLogTestCollector(10)
	current = first
	record = slog.NewRecord(time.Now(), slog.LevelInfo, "first", 0)
	record.Add("phase", "ready")
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("first collector handle: %v", err)
	}

	second := newLogTestCollector(10)
	current = second
	if err := handler.Handle(context.Background(), slog.NewRecord(time.Now(), slog.LevelWarn, "second", 0)); err != nil {
		t.Fatalf("replacement collector handle: %v", err)
	}
	current = nil
	if err := handler.Handle(context.Background(), slog.NewRecord(time.Now(), slog.LevelInfo, "shutdown", 0)); err != nil {
		t.Fatalf("shutdown handle: %v", err)
	}

	if got := len(delegateRecords); got != 4 {
		t.Fatalf("delegate records = %d, want 4", got)
	}
	if logs := capturedLogs(t, first); len(logs) != 1 || logs[0].Message != "first" {
		t.Fatalf("first collector logs = %+v", logs)
	}
	if logs := capturedLogs(t, second); len(logs) != 1 || logs[0].Message != "second" {
		t.Fatalf("second collector logs = %+v", logs)
	}
}

func TestDebugLogHandlerStaticConstructorCompatibility(t *testing.T) {
	collector := newLogTestCollector(10)
	delegateRecords := []slog.Record{}
	handler := NewDebugLogHandler(collector, newDebugRecordingHandler(&delegateRecords))
	if err := handler.Handle(context.Background(), slog.NewRecord(time.Now(), slog.LevelInfo, "static", 0)); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if logs := capturedLogs(t, collector); len(logs) != 1 || logs[0].Message != "static" {
		t.Fatalf("static collector logs = %#v", logs)
	}
	if len(delegateRecords) != 1 || delegateRecords[0].Message != "static" {
		t.Fatalf("static delegate records = %#v", delegateRecords)
	}
}

func TestDebugLogHandlerProviderPanicStillForwardsDelegateError(t *testing.T) {
	delegateErr := errors.New("delegate failed")
	delegateRecords := []slog.Record{}
	delegate := newDebugRecordingHandler(&delegateRecords)
	delegate.err = delegateErr
	handler := NewDebugLogHandlerProvider(func() *DebugCollector {
		panic("collector unavailable")
	}, delegate, WithDebugLogContextResolver(func(context.Context) DebugLogContext {
		panic("context unavailable")
	}))

	err := handler.Handle(context.Background(), slog.NewRecord(time.Now(), slog.LevelInfo, "safe", 0))
	if !errors.Is(err, delegateErr) {
		t.Fatalf("handle error = %v, want delegate error", err)
	}
	if len(delegateRecords) != 1 {
		t.Fatalf("delegate records = %d, want 1", len(delegateRecords))
	}
}

func TestDebugLogHandlerPreservesWithAttrsAndWithGroupSemantics(t *testing.T) {
	collector := newLogTestCollector(10)
	handler := NewDebugLogHandlerProvider(func() *DebugCollector { return collector }, nil)
	handlerWithState := handler.
		WithAttrs([]slog.Attr{slog.String("outside", "root")}).
		WithGroup("request").
		WithAttrs([]slog.Attr{slog.String("inside", "group")})
	record := slog.NewRecord(time.Now(), slog.LevelInfo, "grouped", 0)
	record.Add("record", "value")
	if err := handlerWithState.Handle(context.Background(), record); err != nil {
		t.Fatalf("handle: %v", err)
	}

	fields := capturedLogs(t, collector)[0].Fields
	if fields["outside"] != "root" {
		t.Fatalf("outside attr moved into group: %+v", fields)
	}
	request, ok := fields["request"].(map[string]any)
	if !ok || request["inside"] != "group" || request["record"] != "value" {
		t.Fatalf("group attrs = %+v", fields["request"])
	}
}

func TestDebugLogHandlerCapturesCanonicalEnrichedRecord(t *testing.T) {
	collector := newLogTestCollector(10)
	ctx := withDebugSessionContext(context.Background(), "session-1", "user-1")
	logger := glog.NewLogger(
		glog.WithWriter(io.Discard),
		glog.WithContext(ctx),
		glog.WithHandlerWrapper(func(next slog.Handler) slog.Handler {
			return NewDebugLogHandlerProvider(
				func() *DebugCollector { return collector },
				next,
				WithDebugLogContextResolver(func(context.Context) DebugLogContext {
					return DebugLogContext{RequestID: "req-1", TraceID: "trace-1", SpanID: "span-1"}
				}),
			)
		}),
	)

	logger.GetLogger("search").Error(
		"readiness refresh failed",
		"health", slog.GroupValue(
			slog.String("provider", "typesense"),
			slog.Any("indexes", []any{"archive_media", "site_content"}),
		),
		"error", errors.New("indexes are not ready"),
		"root_error", "indexes are not ready: archive_media, site_content",
		"text_code", "SEARCH_INDEXES_NOT_READY",
		"causes", []string{"archive_media", "site_content"},
	)

	logs := capturedLogs(t, collector)
	if len(logs) != 1 {
		t.Fatalf("logs = %d, want 1", len(logs))
	}
	entry := logs[0]
	if entry.ID == "" || entry.Logger != "search" || entry.Source == "" || entry.Caller == nil {
		t.Fatalf("missing identity metadata: %+v", entry)
	}
	if !strings.Contains(entry.Caller.Function, "TestDebugLogHandlerCapturesCanonicalEnrichedRecord") {
		t.Fatalf("caller = %+v", entry.Caller)
	}
	if entry.SessionID != "session-1" || entry.UserID != "user-1" || entry.RequestID != "req-1" || entry.TraceID != "trace-1" || entry.SpanID != "span-1" {
		t.Fatalf("correlation metadata = %+v", entry)
	}
	if entry.Fields["error"] != "indexes are not ready" || entry.Fields["stack"] == "" {
		t.Fatalf("enriched fields = %+v", entry.Fields)
	}
	if entry.Fields["root_error"] == "" || entry.Fields["text_code"] != "SEARCH_INDEXES_NOT_READY" || entry.Fields["causes"] == nil {
		t.Fatalf("error diagnostics = %+v", entry.Fields)
	}
	health, ok := entry.Fields["health"].(map[string]any)
	if !ok || health["provider"] != "typesense" {
		t.Fatalf("health fields = %+v", entry.Fields["health"])
	}
	if _, err := json.Marshal(entry); err != nil {
		t.Fatalf("entry is not JSON-safe: %v", err)
	}
}

type debugPanicLogValuer struct{}

func (debugPanicLogValuer) LogValue() slog.Value { panic("valuer exploded") }

type debugUnsupportedValue struct {
	Secret string
}

type debugUnsupportedMapKey struct {
	Secret string
}

func TestDebugLogNormalizationBoundsCyclesAndUnsupportedValues(t *testing.T) {
	collector := newLogTestCollector(10)
	cycle := map[string]any{}
	cycle["self"] = cycle
	handler := NewDebugLogHandlerProvider(
		func() *DebugCollector { return collector },
		nil,
		WithDebugLogLimits(DebugLogLimits{
			MaxDepth:           3,
			MaxCollectionItems: 5,
			MaxStringBytes:     24,
			MaxStackBytes:      32,
			MaxEventBytes:      256,
		}),
	)
	record := slog.NewRecord(time.Now(), slog.LevelError, strings.Repeat("message", 10), 0)
	record.AddAttrs(
		slog.Any("cycle", cycle),
		slog.Any("many", []int{1, 2, 3, 4, 5, 6}),
		slog.Any("valuer", debugPanicLogValuer{}),
		slog.Any("unsupported", debugUnsupportedValue{Secret: "must-not-serialize"}),
		slog.String("stack", strings.Repeat("stack", 20)),
	)
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("handle: %v", err)
	}

	entry := capturedLogs(t, collector)[0]
	if !strings.Contains(entry.Message, "truncated") {
		t.Fatalf("message was not truncated: %q", entry.Message)
	}
	cycleField, ok := entry.Fields["cycle"].(map[string]any)
	if !ok || cycleField["self"] != debugLogCycle {
		t.Fatalf("cycle field = %#v", entry.Fields["cycle"])
	}
	many, ok := entry.Fields["many"].([]any)
	if !ok || len(many) != 6 || many[5] != debugLogTruncated {
		t.Fatalf("collection limit = %#v", entry.Fields["many"])
	}
	if value := strings.ToLower(toString(entry.Fields["unsupported"])); !strings.Contains(value, "unsuppor") || strings.Contains(value, "must-not-serialize") {
		t.Fatalf("unsupported field leaked internals: %#v", entry.Fields["unsupported"])
	}
	if _, err := json.Marshal(entry); err != nil {
		t.Fatalf("normalized entry is not JSON-safe: %v", err)
	}
}

func TestDebugLogNormalizationBoundsSlogGroupsAndAttributeCount(t *testing.T) {
	collector := newLogTestCollector(10)
	handler := NewDebugLogHandlerProvider(
		func() *DebugCollector { return collector },
		nil,
		WithDebugLogLimits(DebugLogLimits{
			MaxDepth:           2,
			MaxCollectionItems: 2,
			MaxStringBytes:     128,
			MaxEventBytes:      1024,
		}),
	)
	deep := handler.WithGroup("one").WithGroup("two").WithGroup("three")
	deepRecord := slog.NewRecord(time.Now(), slog.LevelInfo, "deep", 0)
	deepRecord.Add("value", true)
	if err := deep.Handle(context.Background(), deepRecord); err != nil {
		t.Fatalf("deep handle: %v", err)
	}
	record := slog.NewRecord(time.Now(), slog.LevelInfo, "many attrs", 0)
	record.Add("alpha", 1, "beta", 2, "gamma", 3)
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("attribute handle: %v", err)
	}

	logs := capturedLogs(t, collector)
	one, ok := logs[0].Fields["one"].(map[string]any)
	if !ok {
		t.Fatalf("first group = %#v", logs[0].Fields)
	}
	two, ok := one["two"].(map[string]any)
	if !ok || two["_debug_truncated"] != true {
		t.Fatalf("deep group bound = %#v", logs[0].Fields)
	}
	if logs[1].Fields["_debug_truncated"] != true || len(logs[1].Fields) != 3 {
		t.Fatalf("attribute count bound = %#v", logs[1].Fields)
	}
}

func TestDebugLogNormalizationDoesNotExposeUnsupportedMapKeyInternals(t *testing.T) {
	collector := newLogTestCollector(10)
	handler := NewDebugLogHandlerProvider(func() *DebugCollector { return collector }, nil)
	record := slog.NewRecord(time.Now(), slog.LevelInfo, "map keys", 0)
	record.Add("values", map[debugUnsupportedMapKey]string{{Secret: "must-not-leak"}: "safe"})
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("handle: %v", err)
	}

	encoded, err := json.Marshal(capturedLogs(t, collector)[0])
	if err != nil {
		t.Fatalf("marshal entry: %v", err)
	}
	if strings.Contains(string(encoded), "must-not-leak") || !strings.Contains(string(encoded), "unsupported key") {
		t.Fatalf("unsafe map key representation: %s", encoded)
	}
}

func TestDebugLogNormalizationConvertsNonFiniteNumbersToJSONSafeMarkers(t *testing.T) {
	collector := newLogTestCollector(10)
	handler := NewDebugLogHandlerProvider(func() *DebugCollector { return collector }, nil)
	record := slog.NewRecord(time.Now(), slog.LevelInfo, "numbers", 0)
	record.Add("nan", math.NaN(), "positive_infinity", math.Inf(1))
	if err := handler.Handle(context.Background(), record); err != nil {
		t.Fatalf("handle: %v", err)
	}

	entry := capturedLogs(t, collector)[0]
	if !strings.Contains(toString(entry.Fields["nan"]), "non-finite") || !strings.Contains(toString(entry.Fields["positive_infinity"]), "non-finite") {
		t.Fatalf("non-finite fields = %#v", entry.Fields)
	}
	if _, err := json.Marshal(entry); err != nil {
		t.Fatalf("entry is not JSON-safe: %v", err)
	}
}

func TestDebugCollectorLogIDsAndRecursiveMasking(t *testing.T) {
	collector := NewDebugCollector(DebugConfig{
		CaptureLogs:     true,
		MaxLogEntries:   2,
		MaskPlaceholder: "***",
		Panels:          []string{DebugPanelLogs},
	})
	collector.CaptureLog(LogEntry{
		Message: "failed token=top-secret",
		Fields: map[string]any{
			"nested": map[string]any{
				"password": "super-secret",
				"message":  "authorization: Bearer abcdefghijklmnop",
			},
		},
	})
	collector.CaptureLog(LogEntry{Message: "second"})
	collector.CaptureLog(LogEntry{Message: "third"})

	logs := capturedLogs(t, collector)
	if len(logs) != 2 || logs[0].Message != "second" || logs[1].Message != "third" {
		t.Fatalf("bounded logs = %+v", logs)
	}
	if logs[0].ID == "" || logs[1].ID == "" || logs[0].ID == logs[1].ID {
		t.Fatalf("unstable log IDs = %+v", logs)
	}

	maskedCollector := newLogTestCollector(10)
	maskedCollector.CaptureLog(LogEntry{
		Message: "failed token=top-secret",
		Fields: map[string]any{
			"nested": map[string]any{
				"password": "super-secret",
				"message":  "authorization: Bearer abcdefghijklmnop",
			},
		},
	})
	masked := capturedLogs(t, maskedCollector)[0]
	encoded, err := json.Marshal(masked)
	if err != nil {
		t.Fatalf("marshal masked entry: %v", err)
	}
	text := string(encoded)
	for _, secret := range []string{"top-secret", "super-secret", "abcdefghijklmnop"} {
		if strings.Contains(text, secret) {
			t.Fatalf("secret %q remained in %s", secret, text)
		}
	}
}

func TestDebugCollectorLogSnapshotAndLiveEventMatch(t *testing.T) {
	collector := newLogTestCollector(10)
	events := collector.Subscribe("transport-equivalence")
	defer collector.Unsubscribe("transport-equivalence")

	collector.CaptureLog(LogEntry{
		ID:        "log-transport-1",
		Level:     "ERROR",
		Message:   "provider health failed",
		Logger:    "search",
		Caller:    &LogCaller{Function: "monitor", File: "monitor.go", Line: 42},
		RequestID: "request-1",
		TraceID:   "trace-1",
		Fields: map[string]any{
			"error":    errors.New("indexes are not ready"),
			"health":   map[string]any{"indexes": []string{"archive_media", "site_content"}},
			"password": "must-not-cross-transport",
		},
	})

	var live LogEntry
	select {
	case event := <-events:
		if event.Type != "log" {
			t.Fatalf("event type = %q", event.Type)
		}
		var ok bool
		live, ok = event.Payload.(LogEntry)
		if !ok {
			t.Fatalf("live payload type = %T", event.Payload)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for live log event")
	}

	snapshot := capturedLogs(t, collector)
	if len(snapshot) != 1 || !reflect.DeepEqual(snapshot[0], live) {
		t.Fatalf("snapshot/live mismatch\nsnapshot: %#v\nlive: %#v", snapshot, live)
	}
	encoded, err := json.Marshal(live)
	if err != nil {
		t.Fatalf("live payload is not JSON-safe: %v", err)
	}
	if strings.Contains(string(encoded), "must-not-cross-transport") {
		t.Fatalf("live payload leaked a masked secret: %s", encoded)
	}
}

func TestDebugCollectorCustomProducerUsesSharedEventBudget(t *testing.T) {
	collector := newLogTestCollector(10)
	fields := make(map[string]any, 24)
	for i := range 24 {
		fields[fmt.Sprintf("field_%02d", i)] = strings.Repeat("x", debugLogDefaultMaxStringBytes)
	}
	collector.CaptureLog(LogEntry{
		Message: strings.Repeat("m", debugLogDefaultMaxStringBytes),
		Fields:  fields,
	})

	entry := capturedLogs(t, collector)[0]
	if entry.Fields["_debug_truncated"] != true {
		t.Fatalf("expected shared event budget marker: %#v", entry.Fields)
	}
	encoded, err := json.Marshal(entry)
	if err != nil {
		t.Fatalf("marshal bounded entry: %v", err)
	}
	if len(encoded) > debugLogDefaultMaxEventBytes+32*1024 {
		t.Fatalf("bounded event grew unexpectedly: %d bytes", len(encoded))
	}
}
