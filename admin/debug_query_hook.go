package admin

import (
	"context"
	"time"

	repository "github.com/goliatone/go-repository-bun"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

const debugQueryHookKey = "admin.debug.sql"

// DebugQueryHook captures Bun query events and forwards them to the debug collector.
type DebugQueryHook struct {
	Collector         *DebugCollector
	CollectorProvider func() *DebugCollector
}

// NewDebugQueryHook builds a query hook bound to a specific collector.
func NewDebugQueryHook(collector *DebugCollector) *DebugQueryHook {
	return &DebugQueryHook{Collector: collector}
}

// NewDebugQueryHookProvider builds a query hook that resolves the collector at runtime.
func NewDebugQueryHookProvider(provider func() *DebugCollector) *DebugQueryHook {
	return &DebugQueryHook{CollectorProvider: provider}
}

// BeforeQuery preserves the context; Bun requires the hook contract.
func (h *DebugQueryHook) BeforeQuery(ctx context.Context, event *bun.QueryEvent) context.Context {
	return ctx
}

// AfterQuery captures query details after execution.
func (h *DebugQueryHook) AfterQuery(ctx context.Context, event *bun.QueryEvent) {
	collector := h.debugCollector()
	if collector == nil || event == nil {
		return
	}

	entry := SQLEntry{
		ID:        uuid.NewString(),
		Timestamp: time.Now(),
		Query:     event.Query,
		Args:      event.QueryArgs,
		Duration:  time.Since(event.StartTime),
	}
	if event.Err != nil {
		entry.Error = event.Err.Error()
	}
	if event.Result != nil {
		if rows, err := event.Result.RowsAffected(); err == nil {
			entry.RowCount = int(rows)
		}
	}

	collector.CaptureSQL(entry)
}

// QueryHookKey provides a stable identity for hook deduplication.
func (h *DebugQueryHook) QueryHookKey() string {
	return debugQueryHookKey
}

func (h *DebugQueryHook) debugCollector() *DebugCollector {
	if h == nil {
		return nil
	}
	if h.CollectorProvider != nil {
		return h.CollectorProvider()
	}
	return h.Collector
}

// DebugQueryHookOptions returns repository options for wiring SQL capture hooks.
func (a *Admin) DebugQueryHookOptions() []repository.Option {
	if a == nil {
		return nil
	}
	cfg := normalizeDebugConfig(a.config.Debug, a.config.BasePath)
	if !debugConfigEnabled(cfg) || !cfg.CaptureSQL || !debugSQLPanelEnabled(cfg) {
		return nil
	}

	hook := NewDebugQueryHookProvider(a.Debug)
	opts := []repository.Option{repository.WithQueryHooks(hook)}
	if cfg.StrictQueryHooks {
		opts = append(opts, repository.WithQueryHookErrorHandler(repository.PanicQueryHookErrorHandler))
	}
	return opts
}

func debugSQLPanelEnabled(cfg DebugConfig) bool {
	for _, panel := range cfg.Panels {
		if panel == "sql" {
			return true
		}
	}
	return false
}
