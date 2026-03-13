package observability

import (
	"context"
	"log/slog"
	"time"
)

// Metrics captures stable sync-kernel counters and timings.
type Metrics interface {
	ObserveRead(ctx context.Context, duration time.Duration, success bool, attrs map[string]string)
	ObserveMutation(ctx context.Context, duration time.Duration, success bool, attrs map[string]string)
	IncrementConflict(ctx context.Context, attrs map[string]string)
	IncrementReplay(ctx context.Context, attrs map[string]string)
	IncrementRetry(ctx context.Context, attrs map[string]string)
}

// Logger captures structured sync-kernel logs.
type Logger interface {
	Log(ctx context.Context, level slog.Level, msg string, args ...any)
}

// NopMetrics drops all emitted metrics.
type NopMetrics struct{}

func (NopMetrics) ObserveRead(context.Context, time.Duration, bool, map[string]string) {}

func (NopMetrics) ObserveMutation(context.Context, time.Duration, bool, map[string]string) {}

func (NopMetrics) IncrementConflict(context.Context, map[string]string) {}

func (NopMetrics) IncrementReplay(context.Context, map[string]string) {}

func (NopMetrics) IncrementRetry(context.Context, map[string]string) {}

// NopLogger drops all emitted logs.
type NopLogger struct{}

func (NopLogger) Log(context.Context, slog.Level, string, ...any) {}
