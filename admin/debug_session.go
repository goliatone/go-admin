package admin

import (
	"context"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
)

type debugSessionContext struct {
	SessionID string `json:"session_id"`
	UserID    string `json:"user_id"`
}

type debugSessionContextKey struct{}

var debugSessionKey = &debugSessionContextKey{}

func withDebugSessionContext(ctx context.Context, sessionID, userID string) context.Context {
	if ctx == nil {
		return ctx
	}
	sessionID = strings.TrimSpace(sessionID)
	userID = strings.TrimSpace(userID)
	if sessionID == "" && userID == "" {
		return ctx
	}
	return context.WithValue(ctx, debugSessionKey, debugSessionContext{
		SessionID: sessionID,
		UserID:    userID,
	})
}

func debugSessionContextFromContext(ctx context.Context) debugSessionContext {
	if ctx == nil {
		return debugSessionContext{}
	}
	if stored, ok := ctx.Value(debugSessionKey).(debugSessionContext); ok {
		sessionID := strings.TrimSpace(stored.SessionID)
		userID := strings.TrimSpace(stored.UserID)
		if sessionID == "" {
			if resolved, ok := sessionIDFromContext(ctx); ok {
				sessionID = resolved
			}
		}
		if userID == "" {
			userID = userIDFromContext(ctx)
		}
		return debugSessionContext{
			SessionID: sessionID,
			UserID:    userID,
		}
	}

	sessionID, _ := sessionIDFromContext(ctx)
	return debugSessionContext{
		SessionID: sessionID,
		UserID:    userIDFromContext(ctx),
	}
}

func debugSessionContextFromRequest(c router.Context, cfg DebugConfig) debugSessionContext {
	if c == nil {
		return debugSessionContext{}
	}
	meta := debugSessionContextFromContext(c.Context())
	sessionID := strings.TrimSpace(meta.SessionID)
	userID := strings.TrimSpace(meta.UserID)
	sessionID, userID = debugSessionIDsFromClaims(sessionID, userID, debugClaimsFromContext(c.Context()))
	sessionID, userID = debugSessionIDsFromClaims(sessionID, userID, debugClaimsFromRouter(c))
	cookieSession := resolveDebugCookieSession(c, cfg, sessionID == "")
	if sessionID == "" {
		sessionID = cookieSession
	}
	return debugSessionContext{
		SessionID: sessionID,
		UserID:    userID,
	}
}

func debugClaimsFromContext(ctx context.Context) auth.AuthClaims {
	claims, ok := auth.GetClaims(ctx)
	if !ok {
		return nil
	}
	return claims
}

func debugClaimsFromRouter(c router.Context) auth.AuthClaims {
	claims, ok := auth.GetRouterClaims(c, "")
	if !ok {
		return nil
	}
	return claims
}

func debugSessionIDsFromClaims(sessionID, userID string, claims auth.AuthClaims) (string, string) {
	if claims == nil {
		return sessionID, userID
	}
	if sessionID == "" {
		if resolved, ok := sessionIDFromClaims(claims); ok {
			sessionID = resolved
		}
	}
	if userID == "" {
		userID = strings.TrimSpace(primitives.FirstNonEmptyRaw(claims.UserID(), claims.Subject()))
	}
	return sessionID, userID
}

func resolveDebugCookieSession(c router.Context, cfg DebugConfig, missingSession bool) string {
	cookieName := debugSessionCookieName(cfg)
	if cookieName == "" || (!cfg.SessionTracking && !missingSession) {
		return ""
	}
	cookieSession := strings.TrimSpace(c.Cookies(cookieName))
	if cookieSession == "" {
		cookieSession = uuid.NewString()
	}
	if cookieSession != "" {
		debugSetSessionCookie(c, cookieName, cookieSession, cfg.SessionInactivityExpiry, cfg)
	}
	return cookieSession
}

func debugSessionCookieName(cfg DebugConfig) string {
	return strings.TrimSpace(cfg.SessionCookieName)
}

func debugSetSessionCookie(c router.Context, name, value string, ttl time.Duration, cfg DebugConfig) {
	if c == nil || strings.TrimSpace(name) == "" || strings.TrimSpace(value) == "" {
		return
	}
	cookie := router.FirstPartySessionCookie(name, value)
	cookie.Secure = debugIsSecureRequest(c, cfg)
	if ttl > 0 {
		cookie.MaxAge = int(ttl.Seconds())
		cookie.Expires = time.Now().Add(ttl)
		cookie.SessionOnly = false
	} else {
		cookie.SessionOnly = true
	}
	c.Cookie(&cookie)
}

func debugSessionUsernameFromRequest(c router.Context) string {
	if c == nil {
		return ""
	}
	if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
		if name := debugSessionUsernameFromMetadata(actor.Metadata); name != "" {
			return name
		}
	}
	for _, claims := range []auth.AuthClaims{debugClaimsFromContext(c.Context()), debugClaimsFromRouter(c)} {
		if name := debugSessionUsernameFromClaims(claims); name != "" {
			return name
		}
	}
	return ""
}

func debugSessionUsernameFromClaims(claims auth.AuthClaims) string {
	if claims == nil {
		return ""
	}
	if carrier, ok := claims.(interface{ Username() string }); ok {
		if name := strings.TrimSpace(carrier.Username()); name != "" {
			return name
		}
	}
	if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
		return debugSessionUsernameFromMetadata(carrier.ClaimsMetadata())
	}
	return ""
}

func debugSessionUsernameFromMetadata(metadata map[string]any) string {
	if len(metadata) == 0 {
		return ""
	}
	if name := strings.TrimSpace(toString(metadata["username"])); name != "" {
		return name
	}
	if name := strings.TrimSpace(toString(metadata["user"])); name != "" {
		return name
	}
	if name := strings.TrimSpace(toString(metadata["name"])); name != "" {
		return name
	}
	if name := strings.TrimSpace(toString(metadata["display_name"])); name != "" {
		return name
	}
	return ""
}
