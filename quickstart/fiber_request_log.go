package quickstart

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// logFiberRequest keeps both native backends on the same debug log contract.
func logFiberRequest(ctx context.Context, started time.Time, status int, err error, method, path, remoteIP, userAgent string) {
	level := slog.LevelInfo
	if err != nil || status >= http.StatusInternalServerError {
		level = slog.LevelError
	} else if status >= http.StatusBadRequest {
		level = slog.LevelWarn
	}
	if ctx == nil {
		ctx = context.Background()
	}
	attrs := []any{
		"method", method,
		"path", path,
		"status", status,
		"duration_ms", time.Since(started).Milliseconds(),
		"remote_ip", remoteIP,
	}
	if userAgent = strings.TrimSpace(userAgent); userAgent != "" {
		attrs = append(attrs, "user_agent", userAgent)
	}
	if err != nil {
		attrs = append(attrs, "error", err.Error())
	}
	slog.Log(ctx, level, "fiber request", attrs...)
}
