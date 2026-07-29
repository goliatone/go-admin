package core

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/admin-shell/config"
	goerrors "github.com/goliatone/go-errors"
	"github.com/goliatone/go-logger/glog"
)

// RootLogger owns the shared application logger and deployment identity.
// Existing named children inherit root-level policy changes.
type RootLogger struct {
	*glog.BaseLogger
	identity *loggingIdentity
}

// NewRootLogger creates the process logger with safe bootstrap defaults.
func NewRootLogger(w io.Writer) *RootLogger {
	identity := &loggingIdentity{}
	identity.set(map[string]any{"service": "go-admin-shell"})

	options := []glog.Option{
		glog.WithName("admin-shell"),
		glog.WithLevel(glog.Info),
		glog.WithLoggerTypeJSON(),
		glog.WithAddSource(false),
		glog.WithRichErrorHandler(goerrors.ToSlogAttributes),
		glog.WithHandlerWrapper(func(handler slog.Handler) slog.Handler {
			return &identityHandler{
				next:     handler,
				identity: identity,
			}
		}),
	}
	if w != nil {
		options = append(options, glog.WithWriter(w))
	}
	return &RootLogger{
		BaseLogger: glog.NewLogger(options...),
		identity:   identity,
	}
}

// Configure applies validated logging policy and deployment identity to the
// existing root. Children created during bootstrap inherit these changes.
func (l *RootLogger) Configure(cfg *config.AppConfig) {
	if l == nil || l.BaseLogger == nil {
		return
	}

	level := glog.Info
	loggerType := glog.LoggerTypeJSON
	identity := map[string]any{"service": "go-admin-shell"}
	if cfg != nil {
		level = configuredLogLevel(cfg.Logging.Level)
		loggerType = configuredLoggerType(cfg.Logging.Format)
		identity["environment"] = cfg.Env
		identity["app_id"] = cfg.Deployment.AppID
		identity["app_version"] = cfg.Deployment.AppVersion
	}
	l.identity.set(identity)
	l.WithLevel(level)
	l.WithLoggerType(loggerType)
}

func configuredLogLevel(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "trace":
		return glog.Trace
	case "debug":
		return glog.Debug
	case "warn", "warning":
		return glog.Warn
	case "error":
		return glog.Error
	default:
		return glog.Info
	}
}

func configuredLoggerType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "console", "text":
		return glog.LoggerTypeConsole
	case "pretty":
		return glog.LoggerTypePretty
	default:
		return glog.LoggerTypeJSON
	}
}

// LogStartupConfig emits only non-secret startup configuration.
func LogStartupConfig(logger glog.Logger, cfg *config.AppConfig, phase string) {
	if logger == nil || cfg == nil {
		return
	}
	logger.Info("application startup",
		"phase", strings.TrimSpace(phase),
		"address", cfg.Server.Address,
		"admin_base_path", cfg.Admin.BasePath,
		"locale", cfg.Admin.DefaultLocale,
		"feature_profile", cfg.Features.Profile,
		"demo_auth_enabled", cfg.Auth.DemoEnabled,
	)
}

type loggingIdentity struct {
	mu    sync.RWMutex
	attrs []slog.Attr
}

func (i *loggingIdentity) set(fields map[string]any) {
	if i == nil {
		return
	}
	keys := []string{"service", "environment", "app_id", "app_version"}
	attrs := make([]slog.Attr, 0, len(keys))
	for _, key := range keys {
		value, ok := fields[key]
		if !ok {
			continue
		}
		attrs = append(attrs, slog.Any(key, value))
	}
	i.mu.Lock()
	i.attrs = attrs
	i.mu.Unlock()
}

func (i *loggingIdentity) snapshot() []slog.Attr {
	if i == nil {
		return nil
	}
	i.mu.RLock()
	defer i.mu.RUnlock()
	return append([]slog.Attr(nil), i.attrs...)
}

type identityHandler struct {
	next     slog.Handler
	identity *loggingIdentity
}

func (h *identityHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h != nil && h.next != nil && h.next.Enabled(ctx, level)
}

func (h *identityHandler) Handle(ctx context.Context, record slog.Record) error {
	if h == nil || h.next == nil {
		return nil
	}
	cloned := record.Clone()
	cloned.AddAttrs(h.identity.snapshot()...)
	return h.next.Handle(ctx, cloned)
}

func (h *identityHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	if h == nil || h.next == nil {
		return h
	}
	return &identityHandler{
		next:     h.next.WithAttrs(attrs),
		identity: h.identity,
	}
}

func (h *identityHandler) WithGroup(name string) slog.Handler {
	if h == nil || h.next == nil {
		return h
	}
	return &identityHandler{
		next:     h.next.WithGroup(name),
		identity: h.identity,
	}
}

// routerLogger preserves go-router's mixed printf and structured logging
// contract while forwarding records to a named glog child.
type routerLogger struct {
	logger               glog.Logger
	logRouteRegistration bool
}

func newRouterLogger(logger glog.Logger, logRouteRegistration bool) routerLogger {
	return routerLogger{
		logger:               glog.Ensure(logger),
		logRouteRegistration: logRouteRegistration,
	}
}

func (l routerLogger) Debug(message string, args ...any) {
	if !l.shouldLog(message) {
		return
	}
	message, args = normalizeRouterLog(message, args)
	l.logger.Debug(message, args...)
}

func (l routerLogger) Info(message string, args ...any) {
	if !l.shouldLog(message) {
		return
	}
	message, args = normalizeRouterLog(message, args)
	l.logger.Info(message, args...)
}

func (l routerLogger) Warn(message string, args ...any) {
	if !l.shouldLog(message) {
		return
	}
	message, args = normalizeRouterLog(message, args)
	l.logger.Warn(message, args...)
}

func (l routerLogger) Error(message string, args ...any) {
	if !l.shouldLog(message) {
		return
	}
	message, args = normalizeRouterLog(message, args)
	l.logger.Error(message, args...)
}

func (l routerLogger) shouldLog(message string) bool {
	if l.logRouteRegistration {
		return true
	}
	switch strings.TrimSpace(message) {
	case "registering route", "registering websocket route":
		return false
	default:
		return true
	}
}

func normalizeRouterLog(message string, args []any) (string, []any) {
	args = flattenRouterLogArgs(args)
	if len(args) == 0 || isStructuredLogArgs(args) || !hasPrintfDirective(message) {
		return message, args
	}
	return fmt.Sprintf(message, args...), routerErrorAttrs(args)
}

func flattenRouterLogArgs(args []any) []any {
	if len(args) != 1 {
		return args
	}
	switch fields := args[0].(type) {
	case []any:
		return fields
	case glog.ArgsList:
		return []any(fields)
	default:
		return args
	}
}

func isStructuredLogArgs(args []any) bool {
	if len(args) == 0 {
		return false
	}
	allAttrs := true
	for _, arg := range args {
		if _, ok := arg.(slog.Attr); !ok {
			allAttrs = false
			break
		}
	}
	if allAttrs {
		return true
	}
	if len(args)%2 != 0 {
		return false
	}
	for idx := 0; idx < len(args); idx += 2 {
		if _, ok := args[idx].(string); !ok {
			return false
		}
	}
	return true
}

func hasPrintfDirective(message string) bool {
	const verbs = "vTtbcdoOqxXUeEfgGsxp"
	for idx := 0; idx < len(message); idx++ {
		if message[idx] != '%' || idx+1 >= len(message) {
			continue
		}
		if message[idx+1] == '%' {
			idx++
			continue
		}
		for cursor := idx + 1; cursor < len(message); cursor++ {
			current := message[cursor]
			if strings.ContainsRune(verbs, rune(current)) {
				return true
			}
			if current == '%' || current == ' ' || current == '\t' ||
				current == '\n' || current == '\r' {
				break
			}
		}
	}
	return false
}

func routerErrorAttrs(args []any) []any {
	var attrs []any
	for _, arg := range args {
		err, ok := arg.(error)
		if !ok || err == nil {
			continue
		}
		key := "error"
		if len(attrs) > 0 {
			key = fmt.Sprintf("error_%d", len(attrs)/2+1)
		}
		attrs = append(attrs, key, err)
	}
	return attrs
}

// newFiberAccessLogger replaces Fiber's independent text logger with a
// request-safe structured child of the command-owned provider.
func newFiberAccessLogger(logger glog.Logger) fiber.Handler {
	logger = glog.Ensure(logger)
	return func(ctx *fiber.Ctx) error {
		startedAt := time.Now()
		err := ctx.Next()
		status := ctx.Response().StatusCode()
		if err != nil {
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) && fiberErr.Code > 0 {
				status = fiberErr.Code
			} else if status < fiber.StatusBadRequest {
				status = fiber.StatusInternalServerError
			}
		}
		fields := []any{
			"method", ctx.Method(),
			"path", ctx.Path(),
			"status", status,
			"duration_ms", time.Since(startedAt).Milliseconds(),
			"remote_ip", ctx.IP(),
		}
		if err != nil {
			fields = append(fields, "error", err)
		}
		switch {
		case err != nil || status >= fiber.StatusInternalServerError:
			logger.Error("http request", fields...)
		case status >= fiber.StatusBadRequest:
			logger.Warn("http request", fields...)
		default:
			logger.Info("http request", fields...)
		}
		return err
	}
}
