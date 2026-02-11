package admin

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/julienschmidt/httprouter"
)

func TestDebugRequestMiddlewareTagsSessionFromToken(t *testing.T) {
	cfg := DebugConfig{
		Panels: []string{DebugPanelRequests},
	}
	collector := NewDebugCollector(cfg)

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)

	claims := &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{ID: "session-123", Subject: "user-42"},
		UID:              "user-42",
	}
	ctx.Locals("user", claims)

	handler := func(c router.Context) error {
		return nil
	}

	if err := DebugRequestMiddleware(collector)(handler)(ctx); err != nil {
		t.Fatalf("expected handler to succeed: %v", err)
	}

	entries := collector.requestLog.Values()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	entry := entries[0]
	if entry.SessionID != "session-123" {
		t.Fatalf("expected session_id to be tagged, got %q", entry.SessionID)
	}
	if entry.UserID != "user-42" {
		t.Fatalf("expected user_id to be tagged, got %q", entry.UserID)
	}
}

func TestDebugSessionContextFromRequestCookieFallback(t *testing.T) {
	cfg := normalizeDebugConfig(DebugConfig{}, "/admin")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)

	session := debugSessionContextFromRequest(ctx, cfg)
	if session.SessionID == "" {
		t.Fatalf("expected session_id to be set from cookie fallback")
	}

	var found *http.Cookie
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == cfg.SessionCookieName {
			found = cookie
			break
		}
	}
	if found == nil {
		t.Fatalf("expected session cookie %q to be set", cfg.SessionCookieName)
	}
	if found.Value != session.SessionID {
		t.Fatalf("expected session cookie value to match session_id, got %q", found.Value)
	}
}

func TestDebugSessionContextFromRequestReadsStandardClaimsContext(t *testing.T) {
	cfg := normalizeDebugConfig(DebugConfig{}, "/admin")
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	ctx := router.NewHTTPRouterContext(rec, req, httprouter.Params{}, nil)

	claims := &auth.JWTClaims{
		RegisteredClaims: jwt.RegisteredClaims{ID: "session-ctx", Subject: "user-subject"},
		UID:              "user-ctx",
	}
	ctx.SetContext(auth.WithClaimsContext(ctx.Context(), claims))

	session := debugSessionContextFromRequest(ctx, cfg)
	if session.SessionID != "session-ctx" {
		t.Fatalf("expected session_id from standard context claims, got %q", session.SessionID)
	}
	if session.UserID != "user-ctx" {
		t.Fatalf("expected user_id from standard context claims, got %q", session.UserID)
	}
}
