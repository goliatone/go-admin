package admin

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"runtime"
	"strings"
	"testing"

	glog "github.com/goliatone/go-logger/glog"
)

func testLoggerWithHandler(handler slog.Handler) Logger {
	if handler == nil {
		handler = slog.NewTextHandler(io.Discard, nil)
	}
	return glog.NewLogger(
		glog.WithWriter(io.Discard),
		glog.WithHandlerWrapper(func(slog.Handler) slog.Handler {
			return handler
		}),
		glog.WithFatalBehavior(glog.FatalBehaviorLogOnly),
	)
}

type orderedCaptureHandler struct {
	next    slog.Handler
	name    string
	order   *[]string
	records *[]slog.Record
}

func (h *orderedCaptureHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.next.Enabled(ctx, level)
}

func (h *orderedCaptureHandler) Handle(ctx context.Context, record slog.Record) error {
	*h.order = append(*h.order, h.name)
	if h.records != nil {
		*h.records = append(*h.records, record.Clone())
	}
	return h.next.Handle(ctx, record)
}

func (h *orderedCaptureHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &orderedCaptureHandler{
		next:    h.next.WithAttrs(attrs),
		name:    h.name,
		order:   h.order,
		records: h.records,
	}
}

func (h *orderedCaptureHandler) WithGroup(name string) slog.Handler {
	return &orderedCaptureHandler{
		next:    h.next.WithGroup(name),
		name:    h.name,
		order:   h.order,
		records: h.records,
	}
}

//go:noinline
func logThroughAdminAdapter(logger glog.Logger) {
	logger.Error("adapter failed", errors.New("boom"))
}

func TestReleasedLoggerCallerSkipAndWrapperComposition(t *testing.T) {
	order := []string{}
	records := []slog.Record{}
	logger := glog.NewLogger(
		glog.WithWriter(io.Discard),
		glog.WithCallerSkip(1),
		glog.WithHandlerWrapper(func(next slog.Handler) slog.Handler {
			return &orderedCaptureHandler{next: next, name: "first", order: &order, records: &records}
		}),
		glog.WithHandlerWrapper(func(next slog.Handler) slog.Handler {
			return &orderedCaptureHandler{next: next, name: "second", order: &order}
		}),
	)

	logThroughAdminAdapter(logger)

	if got, want := strings.Join(order, ","), "second,first"; got != want {
		t.Fatalf("wrapper order = %q, want %q", got, want)
	}
	if len(records) != 1 {
		t.Fatalf("captured records = %d, want 1", len(records))
	}
	frame, _ := runtime.CallersFrames([]uintptr{records[0].PC}).Next()
	if !strings.Contains(frame.Function, "TestReleasedLoggerCallerSkipAndWrapperComposition") {
		t.Fatalf("record caller = %q, want test call site", frame.Function)
	}
	var stack string
	records[0].Attrs(func(attr slog.Attr) bool {
		if attr.Key == "stack" {
			stack, _ = attr.Value.Any().(string)
		}
		return true
	})
	if !strings.Contains(stack, "TestReleasedLoggerCallerSkipAndWrapperComposition") || strings.Contains(stack, "logThroughAdminAdapter") {
		t.Fatalf("stack does not start at application call site: %q", stack)
	}
}
