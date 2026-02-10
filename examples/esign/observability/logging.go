package observability

import (
	"context"
	"log/slog"
	"strings"
	"time"
)

var defaultLogger = slog.Default()

// SetLogger overrides the default structured logger for e-sign telemetry.
func SetLogger(logger *slog.Logger) {
	if logger == nil {
		return
	}
	defaultLogger = logger
}

// LogOperation records a structured operation log with canonical observability fields.
func LogOperation(
	ctx context.Context,
	level slog.Level,
	component, operation, outcome, correlationID string,
	duration time.Duration,
	err error,
	fields map[string]any,
) {
	if defaultLogger == nil {
		return
	}
	attrs := []any{
		"event", "esign." + strings.TrimSpace(component) + "." + strings.TrimSpace(operation),
		"component", strings.TrimSpace(component),
		"operation", strings.TrimSpace(operation),
		"outcome", strings.TrimSpace(outcome),
		"correlation_id", strings.TrimSpace(correlationID),
		"duration_ms", duration.Milliseconds(),
	}
	if err != nil {
		attrs = append(attrs, "error", err.Error())
	}
	for key, value := range fields {
		if strings.TrimSpace(key) == "" {
			continue
		}
		attrs = append(attrs, key, value)
	}
	defaultLogger.Log(ctx, level, "e-sign operation", attrs...)
}
