package admin

import (
	"context"
	"maps"
	"sync"
)

type actionResponseContextKey struct{}

// ActionResponse captures structured panel action output and an optional HTTP status override.
type ActionResponse struct {
	StatusCode int            `json:"status_code"`
	Data       map[string]any `json:"data"`
}

// ActionResponseCollector stores the latest action response emitted during a command-backed panel action.
type ActionResponseCollector struct {
	mu     sync.RWMutex
	value  ActionResponse
	stored bool
}

// ContextWithActionResponseCollector injects a collector into context for command handlers.
func ContextWithActionResponseCollector(ctx context.Context, collector *ActionResponseCollector) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if collector == nil {
		return ctx
	}
	return context.WithValue(ctx, actionResponseContextKey{}, collector)
}

// ActionResponseCollectorFromContext resolves a collector from context when present.
func ActionResponseCollectorFromContext(ctx context.Context) *ActionResponseCollector {
	if ctx == nil {
		return nil
	}
	collector, _ := ctx.Value(actionResponseContextKey{}).(*ActionResponseCollector)
	return collector
}

// Store writes the latest action response.
func (c *ActionResponseCollector) Store(response ActionResponse) {
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value = ActionResponse{
		StatusCode: response.StatusCode,
		Data:       cloneActionResponseMap(response.Data),
	}
	c.stored = true
}

// Load returns a cloned stored action response when present.
func (c *ActionResponseCollector) Load() (ActionResponse, bool) {
	if c == nil {
		return ActionResponse{}, false
	}
	c.mu.RLock()
	defer c.mu.RUnlock()
	if !c.stored {
		return ActionResponse{}, false
	}
	return ActionResponse{
		StatusCode: c.value.StatusCode,
		Data:       cloneActionResponseMap(c.value.Data),
	}, true
}

func cloneActionResponseMap(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	return out
}
