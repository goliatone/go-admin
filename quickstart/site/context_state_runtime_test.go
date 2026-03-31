package site

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestRequestStateFromContextHandlesNilInvalidAndStoredState(t *testing.T) {
	if _, ok := RequestStateFromContext(nil); ok {
		t.Fatalf("expected nil context lookup to fail")
	}

	if _, ok := RequestStateFromContext(context.Background()); ok {
		t.Fatalf("expected missing request state lookup to fail")
	}

	invalidCtx := context.WithValue(context.Background(), requestStateContextKey, "nope")
	if _, ok := RequestStateFromContext(invalidCtx); ok {
		t.Fatalf("expected invalid request state payload lookup to fail")
	}

	expected := RequestState{Locale: "es", ContentChannel: "preview"}
	storedCtx := context.WithValue(context.Background(), requestStateContextKey, expected)
	got, ok := RequestStateFromContext(storedCtx)
	if !ok {
		t.Fatalf("expected stored request state lookup to succeed")
	}
	if got.Locale != expected.Locale || got.ContentChannel != expected.ContentChannel {
		t.Fatalf("expected stored request state preserved, got %+v", got)
	}
}

func TestRequestStateFromRequestPrefersLocalsAndFallsBackToContext(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.LocalsMock[requestStateLocalsKey] = RequestState{Locale: "fr", ContentChannel: "staging"}
	ctx.On("Context").Return(context.WithValue(context.Background(), requestStateContextKey, RequestState{Locale: "es"}))

	got, ok := RequestStateFromRequest(ctx)
	if !ok {
		t.Fatalf("expected locals request state lookup to succeed")
	}
	if got.Locale != "fr" || got.ContentChannel != "staging" {
		t.Fatalf("expected locals request state to win, got %+v", got)
	}

	ctx = router.NewMockContext()
	expected := RequestState{Locale: "es", ContentChannel: "preview"}
	ctx.On("Context").Return(context.WithValue(context.Background(), requestStateContextKey, expected))

	got, ok = RequestStateFromRequest(ctx)
	if !ok {
		t.Fatalf("expected context request state lookup to succeed")
	}
	if got.Locale != expected.Locale || got.ContentChannel != expected.ContentChannel {
		t.Fatalf("expected context request state preserved, got %+v", got)
	}

	if _, ok := RequestStateFromRequest(nil); ok {
		t.Fatalf("expected nil request lookup to fail")
	}
}

func TestContextStateRuntimeRequestContextUsesRequestContextAndFallsBackToBackground(t *testing.T) {
	expected := context.WithValue(context.Background(), contextKey("trace"), "request")

	ctx := router.NewMockContext()
	ctx.On("Context").Return(expected)

	if got := RequestContext(ctx); got != expected {
		t.Fatalf("expected request context passthrough, got %v", got)
	}

	nilCtx := router.NewMockContext()
	nilCtx.On("Context").Return(nil)

	if got := RequestContext(nilCtx); got == nil {
		t.Fatalf("expected background context fallback for nil request context")
	}
	if got := RequestContext(nil); got == nil {
		t.Fatalf("expected background context fallback for nil router context")
	}
}
