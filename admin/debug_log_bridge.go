package admin

import (
	"context"
	"log/slog"
	"strings"
	"time"
)

// AttachDebugLogBridge wraps the admin DI logger/provider so application logs
// are captured by the debug collector in addition to any slog capture path.
func (a *Admin) AttachDebugLogBridge() {
	if a == nil || a.debugCollector == nil {
		return
	}

	a.logger = withDebugCollectorLogger("admin", a.logger, a.debugCollector)
	a.loggerProvider = withDebugCollectorLoggerProvider(a.loggerProvider, a.debugCollector)

	if a.registry != nil {
		a.registry.WithLogger(resolveNamedLogger("admin.registry", a.loggerProvider, a.logger))
	}
	if a.dashboard != nil {
		a.dashboard.WithLogger(resolveNamedLogger("admin.dashboard", a.loggerProvider, a.logger))
	}
}

type debugCollectorLoggerProvider struct {
	next      LoggerProvider
	collector *DebugCollector
}

func (p *debugCollectorLoggerProvider) GetLogger(name string) Logger {
	if p == nil || p.next == nil {
		return nil
	}
	return withDebugCollectorLogger(name, p.next.GetLogger(name), p.collector)
}

func withDebugCollectorLoggerProvider(provider LoggerProvider, collector *DebugCollector) LoggerProvider {
	if provider == nil || collector == nil {
		return provider
	}
	if wrapped, ok := provider.(*debugCollectorLoggerProvider); ok && wrapped.collector == collector {
		return provider
	}
	return &debugCollectorLoggerProvider{next: provider, collector: collector}
}

type debugCollectorLogger struct {
	next      Logger
	collector *DebugCollector
	name      string
	ctx       context.Context
	fields    map[string]any
}

func withDebugCollectorLogger(name string, logger Logger, collector *DebugCollector) Logger {
	logger = ensureLogger(logger)
	if collector == nil {
		return logger
	}

	normalized := debugCollectorLoggerName(name)
	if wrapped, ok := logger.(*debugCollectorLogger); ok && wrapped.collector == collector {
		if wrapped.name == normalized {
			return wrapped
		}
		return &debugCollectorLogger{
			next:      wrapped.next,
			collector: wrapped.collector,
			name:      normalized,
			ctx:       wrapped.ctx,
			fields:    cloneAnyMap(wrapped.fields),
		}
	}

	return &debugCollectorLogger{
		next:      logger,
		collector: collector,
		name:      normalized,
	}
}

func debugCollectorLoggerName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "admin"
	}
	return name
}

func (l *debugCollectorLogger) Trace(msg string, args ...any) {
	l.capture("TRACE", msg, args)
	l.next.Trace(msg, args...)
}

func (l *debugCollectorLogger) Debug(msg string, args ...any) {
	l.capture("DEBUG", msg, args)
	l.next.Debug(msg, args...)
}

func (l *debugCollectorLogger) Info(msg string, args ...any) {
	l.capture("INFO", msg, args)
	l.next.Info(msg, args...)
}

func (l *debugCollectorLogger) Warn(msg string, args ...any) {
	l.capture("WARN", msg, args)
	l.next.Warn(msg, args...)
}

func (l *debugCollectorLogger) Error(msg string, args ...any) {
	l.capture("ERROR", msg, args)
	l.next.Error(msg, args...)
}

func (l *debugCollectorLogger) Fatal(msg string, args ...any) {
	l.capture("FATAL", msg, args)
	l.next.Fatal(msg, args...)
}

func (l *debugCollectorLogger) WithContext(ctx context.Context) Logger {
	if l == nil {
		return ensureLogger(nil)
	}
	next := l.next
	if next != nil {
		next = next.WithContext(ctx)
	}
	return &debugCollectorLogger{
		next:      ensureLogger(next),
		collector: l.collector,
		name:      l.name,
		ctx:       ctx,
		fields:    cloneAnyMap(l.fields),
	}
}

func (l *debugCollectorLogger) WithFields(fields map[string]any) Logger {
	if l == nil {
		return ensureLogger(nil)
	}
	next := l.next
	if withFields, ok := next.(FieldsLogger); ok {
		next = withFields.WithFields(fields)
	}
	return &debugCollectorLogger{
		next:      ensureLogger(next),
		collector: l.collector,
		name:      l.name,
		ctx:       l.ctx,
		fields:    mergeDebugCollectorFields(l.fields, fields),
	}
}

func (l *debugCollectorLogger) capture(level, msg string, args []any) {
	if l == nil || l.collector == nil {
		return
	}
	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Message:   strings.TrimSpace(msg),
		Fields:    debugCollectorLogFields(l.name, l.fields, args),
		Source:    l.name,
	}
	session := debugSessionContextFromContext(l.ctx)
	entry.SessionID = session.SessionID
	entry.UserID = session.UserID
	l.collector.CaptureLog(entry)
}

func debugCollectorLogFields(loggerName string, base map[string]any, args []any) map[string]any {
	fields := cloneAnyMap(base)
	if fields == nil {
		fields = map[string]any{}
	}
	if strings.TrimSpace(loggerName) != "" {
		fields["logger"] = loggerName
	}
	for i := 0; i < len(args); i++ {
		if attr, ok := args[i].(slog.Attr); ok {
			debugAddSlogAttr(fields, nil, attr)
			continue
		}
		key, ok := args[i].(string)
		key = strings.TrimSpace(key)
		if !ok || key == "" {
			continue
		}
		if i+1 >= len(args) {
			fields[key] = true
			continue
		}
		fields[key] = args[i+1]
		i++
	}
	if len(fields) == 0 {
		return nil
	}
	return fields
}

func mergeDebugCollectorFields(base, extra map[string]any) map[string]any {
	if len(base) == 0 && len(extra) == 0 {
		return nil
	}
	out := cloneAnyMap(base)
	if out == nil {
		out = map[string]any{}
	}
	for key, value := range extra {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
