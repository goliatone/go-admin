package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestWithContentChannelMaintainsEnvironmentCompatibility(t *testing.T) {
	ctx := WithContentChannel(context.Background(), "preview")

	if got := ContentChannelFromContext(ctx); got != "preview" {
		t.Fatalf("expected content channel preview, got %q", got)
	}
	if got := EnvironmentFromContext(ctx); got != "preview" {
		t.Fatalf("expected environment compatibility preview, got %q", got)
	}
}

func TestNewAdminContextFromRouterPrefersChannelQuery(t *testing.T) {
	mockCtx := router.NewMockContext()
	mockCtx.QueriesM["channel"] = "public"
	mockCtx.QueriesM["content_channel"] = "staging"
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("IP").Return("127.0.0.1")

	adminCtx := newAdminContextFromRouter(mockCtx, "en")
	if adminCtx.Channel != "public" {
		t.Fatalf("expected channel public, got %q", adminCtx.Channel)
	}
	if adminCtx.Environment != "public" {
		t.Fatalf("expected environment compatibility to follow channel public, got %q", adminCtx.Environment)
	}
	if got := ContentChannelFromContext(adminCtx.Context); got != "public" {
		t.Fatalf("expected context channel public, got %q", got)
	}
	if got := EnvironmentFromContext(adminCtx.Context); got != "public" {
		t.Fatalf("expected context environment public, got %q", got)
	}
}

func TestNewAdminContextFromRouterPrefersDollarChannelQuery(t *testing.T) {
	mockCtx := router.NewMockContext()
	mockCtx.QueriesM[ContentChannelScopeQueryParam] = "preview"
	mockCtx.QueriesM["channel"] = "public"
	mockCtx.On("Context").Return(context.Background())
	mockCtx.On("IP").Return("127.0.0.1")

	adminCtx := newAdminContextFromRouter(mockCtx, "en")
	if adminCtx.Channel != "preview" {
		t.Fatalf("expected $channel to win, got %q", adminCtx.Channel)
	}
	if adminCtx.Environment != "preview" {
		t.Fatalf("expected environment compatibility to follow $channel preview, got %q", adminCtx.Environment)
	}
}
