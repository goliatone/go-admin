package observability

import (
	"context"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	glog "github.com/goliatone/go-logger/glog"
)

// Logger is the go-logger compatible contract used by e-sign observability logging.
type Logger = glog.Logger

// LoggerProvider resolves named loggers.
type LoggerProvider = glog.LoggerProvider

// LoggerOption customizes how operation logging is wired.
type LoggerOption func(*loggerOptions)

type loggerOptions struct {
	provider LoggerProvider
	logger   Logger
}

// WithLogger injects the logger used to emit observability operation logs.
func WithLogger(logger Logger) LoggerOption {
	return func(opts *loggerOptions) {
		if opts == nil {
			return
		}
		opts.logger = logger
	}
}

// WithLoggerProvider injects the provider used to resolve named loggers.
func WithLoggerProvider(provider LoggerProvider) LoggerOption {
	return func(opts *loggerOptions) {
		if opts == nil {
			return
		}
		opts.provider = provider
	}
}

// OperationLogger emits canonical structured operation logs for e-sign flows.
type OperationLogger struct {
	logger Logger
}

// NewOperationLogger builds an operation logger from DI-style options.
func NewOperationLogger(opts ...LoggerOption) *OperationLogger {
	config := loggerOptions{logger: glog.Nop()}
	for _, opt := range opts {
		if opt != nil {
			opt(&config)
		}
	}
	return &OperationLogger{
		logger: glog.Ensure(config.logger),
	}
}

var defaultOperationLoggerState = struct {
	mu     sync.RWMutex
	logger *OperationLogger
}{
	logger: NewOperationLogger(),
}

var defaultNamedLoggerState = struct {
	mu       sync.RWMutex
	provider LoggerProvider
	logger   Logger
}{
	provider: glog.ProviderFromLogger(glog.Nop()),
	logger:   glog.Nop(),
}

// ConfigureLogging updates package-level logging behavior using options.
func ConfigureLogging(opts ...LoggerOption) {
	config := loggerOptions{logger: glog.Nop()}
	for _, opt := range opts {
		if opt != nil {
			opt(&config)
		}
	}

	provider, logger := glog.Resolve("esign", config.provider, config.logger)

	defaultOperationLoggerState.mu.Lock()
	defaultOperationLoggerState.logger = NewOperationLogger(WithLogger(logger))
	defaultOperationLoggerState.mu.Unlock()

	defaultNamedLoggerState.mu.Lock()
	defaultNamedLoggerState.provider = provider
	defaultNamedLoggerState.logger = logger
	defaultNamedLoggerState.mu.Unlock()
}

// SetLogger is a convenience wrapper around ConfigureLogging(WithLogger(...)).
func SetLogger(logger Logger) {
	ConfigureLogging(WithLogger(logger))
}

// ResetLogging resets observability operation logging to no-op defaults.
func ResetLogging() {
	ConfigureLogging()
}

func defaultOperationLogger() *OperationLogger {
	defaultOperationLoggerState.mu.RLock()
	logger := defaultOperationLoggerState.logger
	defaultOperationLoggerState.mu.RUnlock()
	if logger == nil {
		return NewOperationLogger()
	}
	return logger
}

// NamedLogger resolves a named logger from the configured e-sign logging provider.
func NamedLogger(name string) Logger {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "esign"
	}

	defaultNamedLoggerState.mu.RLock()
	provider := defaultNamedLoggerState.provider
	logger := defaultNamedLoggerState.logger
	defaultNamedLoggerState.mu.RUnlock()

	if provider != nil {
		if resolved := provider.GetLogger(name); resolved != nil {
			return resolved
		}
	}

	return glog.Ensure(logger)
}

func withContextLogger(logger Logger, ctx context.Context) Logger {
	if logger == nil {
		return glog.Ensure(nil)
	}
	if ctx == nil {
		ctx = context.Background()
	}
	withCtx := logger.WithContext(ctx)
	if withCtx == nil {
		return logger
	}
	return withCtx
}

func logWithSlogLevel(logger Logger, level slog.Level, msg string, args ...any) {
	switch {
	case level >= slog.LevelError:
		logger.Error(msg, args...)
	case level >= slog.LevelWarn:
		logger.Warn(msg, args...)
	case level >= slog.LevelInfo:
		logger.Info(msg, args...)
	case level <= slog.LevelDebug-4:
		logger.Trace(msg, args...)
	default:
		logger.Debug(msg, args...)
	}
}

// LogOperation records a structured operation log with canonical observability fields.
func (l *OperationLogger) LogOperation(
	ctx context.Context,
	level slog.Level,
	component, operation, outcome, correlationID string,
	duration time.Duration,
	err error,
	fields map[string]any,
) {
	if l == nil {
		return
	}
	logger := withContextLogger(glog.Ensure(l.logger), ctx)
	component = strings.TrimSpace(component)
	operation = strings.TrimSpace(operation)
	outcome = strings.TrimSpace(outcome)
	correlationID = strings.TrimSpace(correlationID)

	attrs := []any{
		"event", "esign." + component + "." + operation,
		"component", component,
		"operation", operation,
		"outcome", outcome,
		"correlation_id", correlationID,
		"duration_ms", duration.Milliseconds(),
	}
	if err != nil {
		attrs = append(attrs, "error", err.Error())
	}
	type fieldAttr struct {
		key   string
		value any
	}
	fieldAttrs := make([]fieldAttr, 0, len(fields))
	for key, value := range fields {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		fieldAttrs = append(fieldAttrs, fieldAttr{key: trimmedKey, value: value})
	}
	sort.Slice(fieldAttrs, func(i, j int) bool {
		return fieldAttrs[i].key < fieldAttrs[j].key
	})
	for _, field := range fieldAttrs {
		attrs = append(attrs, field.key, field.value)
	}
	logWithSlogLevel(logger, level, "e-sign operation", attrs...)
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
	defaultOperationLogger().LogOperation(
		ctx,
		level,
		component,
		operation,
		outcome,
		correlationID,
		duration,
		err,
		fields,
	)
}
