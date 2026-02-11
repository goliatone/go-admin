package observability

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"
)

type capturedObservabilityLogEntry struct {
	level string
	msg   string
	args  []any
}

type captureObservabilityLogger struct {
	entries          []capturedObservabilityLogEntry
	withContextCalls int
}

func (l *captureObservabilityLogger) record(level, msg string, args ...any) {
	if l == nil {
		return
	}
	l.entries = append(l.entries, capturedObservabilityLogEntry{
		level: level,
		msg:   msg,
		args:  append([]any(nil), args...),
	})
}

func (l *captureObservabilityLogger) Trace(msg string, args ...any) { l.record("trace", msg, args...) }
func (l *captureObservabilityLogger) Debug(msg string, args ...any) { l.record("debug", msg, args...) }
func (l *captureObservabilityLogger) Info(msg string, args ...any)  { l.record("info", msg, args...) }
func (l *captureObservabilityLogger) Warn(msg string, args ...any)  { l.record("warn", msg, args...) }
func (l *captureObservabilityLogger) Error(msg string, args ...any) { l.record("error", msg, args...) }
func (l *captureObservabilityLogger) Fatal(msg string, args ...any) { l.record("fatal", msg, args...) }
func (l *captureObservabilityLogger) WithContext(context.Context) Logger {
	l.withContextCalls++
	return l
}

func TestConfigureLoggingInjectsLoggerAndLogsOperationFields(t *testing.T) {
	t.Cleanup(ResetLogging)
	logger := &captureObservabilityLogger{}
	ConfigureLogging(WithLogger(logger))

	duration := 225 * time.Millisecond
	logErr := errors.New("dispatch failed")
	LogOperation(context.Background(), slog.LevelWarn, "job", "email_send", "error", "corr-42", duration, logErr, map[string]any{
		"job_name":      "jobs.esign.email_send_signing_request",
		"recipient_id":  "recipient-1",
		"  ":            "ignored",
		"agreement_id":  "agreement-1",
		"attempt_count": 2,
	})

	if len(logger.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(logger.entries))
	}
	entry := logger.entries[0]
	if entry.level != "warn" {
		t.Fatalf("expected warn level, got %q", entry.level)
	}
	if entry.msg != "e-sign operation" {
		t.Fatalf("expected e-sign operation message, got %q", entry.msg)
	}
	if logger.withContextCalls == 0 {
		t.Fatalf("expected WithContext to be used")
	}

	attrs := attrsMap(entry.args)
	if got := attrs["event"]; got != "esign.job.email_send" {
		t.Fatalf("expected event esign.job.email_send, got %v", got)
	}
	if got := attrs["component"]; got != "job" {
		t.Fatalf("expected component=job, got %v", got)
	}
	if got := attrs["operation"]; got != "email_send" {
		t.Fatalf("expected operation=email_send, got %v", got)
	}
	if got := attrs["outcome"]; got != "error" {
		t.Fatalf("expected outcome=error, got %v", got)
	}
	if got := attrs["correlation_id"]; got != "corr-42" {
		t.Fatalf("expected correlation_id=corr-42, got %v", got)
	}
	if got := attrs["duration_ms"]; got != duration.Milliseconds() {
		t.Fatalf("expected duration_ms=%d, got %v", duration.Milliseconds(), got)
	}
	if got := attrs["error"]; got != "dispatch failed" {
		t.Fatalf("expected error payload, got %v", got)
	}
	if got := attrs["agreement_id"]; got != "agreement-1" {
		t.Fatalf("expected agreement_id field, got %v", got)
	}
	if got := attrs["job_name"]; got != "jobs.esign.email_send_signing_request" {
		t.Fatalf("expected job_name field, got %v", got)
	}
	if _, ok := attrs["  "]; ok {
		t.Fatalf("did not expect blank field key in attrs: %+v", attrs)
	}
}

func TestOperationLoggerMapsSlogLevels(t *testing.T) {
	logger := &captureObservabilityLogger{}
	operationLogger := NewOperationLogger(WithLogger(logger))

	operationLogger.LogOperation(context.Background(), slog.Level(-8), "job", "trace_op", "ok", "corr-trace", 0, nil, nil)
	operationLogger.LogOperation(context.Background(), slog.LevelDebug, "job", "debug_op", "ok", "corr-debug", 0, nil, nil)
	operationLogger.LogOperation(context.Background(), slog.LevelInfo, "job", "info_op", "ok", "corr-info", 0, nil, nil)
	operationLogger.LogOperation(context.Background(), slog.LevelWarn, "job", "warn_op", "ok", "corr-warn", 0, nil, nil)
	operationLogger.LogOperation(context.Background(), slog.LevelError, "job", "error_op", "ok", "corr-error", 0, nil, nil)

	gotLevels := []string{}
	for _, entry := range logger.entries {
		gotLevels = append(gotLevels, entry.level)
	}
	wantLevels := []string{"trace", "debug", "info", "warn", "error"}
	if len(gotLevels) != len(wantLevels) {
		t.Fatalf("expected %d log entries, got %d (%v)", len(wantLevels), len(gotLevels), gotLevels)
	}
	for idx := range wantLevels {
		if gotLevels[idx] != wantLevels[idx] {
			t.Fatalf("expected level %s at index %d, got %s", wantLevels[idx], idx, gotLevels[idx])
		}
	}
}

func attrsMap(args []any) map[string]any {
	attrs := map[string]any{}
	for idx := 0; idx+1 < len(args); idx += 2 {
		key, ok := args[idx].(string)
		if !ok {
			continue
		}
		attrs[key] = args[idx+1]
	}
	return attrs
}
