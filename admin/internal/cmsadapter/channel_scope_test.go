package cmsadapter

import (
	"context"
	"testing"
)

func TestNormalizeChannelTreatsBlankAsDefault(t *testing.T) {
	if got := NormalizeChannel(" Preview "); got != "preview" {
		t.Fatalf("expected preview, got %q", got)
	}
	if got := NormalizeChannel("   "); got != DefaultChannelKey {
		t.Fatalf("expected default channel key, got %q", got)
	}
}

func TestChannelsMatchUsesNormalizedDefaultSemantics(t *testing.T) {
	if !ChannelsMatch("", "default") {
		t.Fatalf("expected blank record channel to match default")
	}
	if !ChannelsMatch(" Preview ", "preview") {
		t.Fatalf("expected normalized preview channels to match")
	}
	if ChannelsMatch("preview", "staging") {
		t.Fatalf("expected preview and staging not to match")
	}
}

func TestResolveContextChannelPrefersResolversInOrder(t *testing.T) {
	type ctxKey string
	contentKey := ctxKey("content")
	environmentKey := ctxKey("environment")
	ctx := context.WithValue(context.Background(), environmentKey, "staging")
	ctx = context.WithValue(ctx, contentKey, "preview")

	got := ResolveContextChannel("", ctx,
		func(ctx context.Context) string {
			value, _ := ctx.Value(contentKey).(string)
			return value
		},
		func(ctx context.Context) string {
			value, _ := ctx.Value(environmentKey).(string)
			return value
		},
	)
	if got != "preview" {
		t.Fatalf("expected preview, got %q", got)
	}
}
