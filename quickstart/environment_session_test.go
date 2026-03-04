package quickstart

import (
	"context"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

func TestUpdateChannelSetsCookieAndResolve(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	handlers := newContentTypeBuilderHandlers(nil, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.On("Body").Return([]byte(`{"channel":"staging"}`))
	ctx.On("Cookie", mock.Anything).Return().Once()
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.UpdateChannel(ctx); err != nil {
		t.Fatalf("update channel: %v", err)
	}
	if got := ctx.Cookies(channelCookieName); got != "staging" {
		t.Fatalf("expected cookie %q=staging, got %q", channelCookieName, got)
	}

	ctx.QueriesM["channel"] = "staging"
	if channel := resolveContentChannel(ctx); channel != "staging" {
		t.Fatalf("expected resolveContentChannel to use explicit query channel, got %q", channel)
	}
}

func TestResolveContentChannelFallsBackToCookie(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.CookiesM[channelCookieName] = "preview"

	if channel := resolveContentChannel(ctx); channel != "preview" {
		t.Fatalf("expected cookie fallback channel, got %q", channel)
	}
}

func TestResolveContentChannelPrefersQueryOverCookie(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.CookiesM[channelCookieName] = "preview"
	ctx.QueriesM["channel"] = "staging"

	if channel := resolveContentChannel(ctx); channel != "staging" {
		t.Fatalf("expected query channel precedence, got %q", channel)
	}
}

func TestResolveContentChannelPrefersDollarChannelOverLegacyQuery(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM[admin.ContentChannelScopeQueryParam] = "preview"
	ctx.QueriesM["channel"] = "staging"

	if channel := resolveContentChannel(ctx); channel != "preview" {
		t.Fatalf("expected $channel to have highest precedence, got %q", channel)
	}
}

func TestUpdateChannelAcceptsLegacyEnvironmentPayload(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	handlers := newContentTypeBuilderHandlers(nil, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.On("Body").Return([]byte(`{"environment":"preview"}`))
	ctx.On("Cookie", mock.Anything).Return().Once()
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.UpdateChannel(ctx); err != nil {
		t.Fatalf("update channel: %v", err)
	}
	if got := ctx.Cookies(channelCookieName); got != "preview" {
		t.Fatalf("expected legacy payload fallback to set preview, got %q", got)
	}
}

func TestResolveContentChannelFallsBackToLegacyEnvReaders(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["env"] = "legacy-query"
	ctx.QueriesM["environment"] = "legacy-environment"
	ctx.HeadersM["X-Admin-Environment"] = "legacy-admin-header"
	ctx.HeadersM["X-Environment"] = "legacy-header"
	ctx.CookiesM["admin_env"] = "legacy-cookie"

	if channel := resolveContentChannel(ctx); channel != "legacy-query" {
		t.Fatalf("expected legacy env query fallback, got %q", channel)
	}
}

func TestUpdateChannelRejectsInvalidChannelValue(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	handlers := newContentTypeBuilderHandlers(nil, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.On("Body").Return([]byte(`{"channel":"bad value"}`))

	if err := handlers.UpdateChannel(ctx); err == nil {
		t.Fatalf("expected invalid channel value to fail")
	}
}
