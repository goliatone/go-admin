package site

import (
	"context"

	router "github.com/goliatone/go-router"
)

// RequestStateFromContext reads request state from context.
func RequestStateFromContext(ctx context.Context) (RequestState, bool) {
	if ctx == nil {
		return RequestState{}, false
	}
	state, ok := ctx.Value(requestStateContextKey).(RequestState)
	if !ok {
		return RequestState{}, false
	}
	return state, true
}

// RequestStateFromRequest reads request state from request locals/context.
func RequestStateFromRequest(c router.Context) (RequestState, bool) {
	if c == nil {
		return RequestState{}, false
	}
	if raw := c.Locals(requestStateLocalsKey); raw != nil {
		if typed, ok := raw.(RequestState); ok {
			return typed, true
		}
	}
	return RequestStateFromContext(c.Context())
}

// RequestContext returns the request context when available and falls back to a
// background context for detached helpers and tests.
func RequestContext(c router.Context) context.Context {
	if c == nil {
		return context.Background()
	}
	requestCtx := c.Context()
	if requestCtx == nil {
		return context.Background()
	}
	return requestCtx
}
