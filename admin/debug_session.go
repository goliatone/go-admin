package admin

import (
	"context"
	"strings"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/google/uuid"
)

type debugSessionContext struct {
	SessionID string
	UserID    string
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
	if sessionID == "" || userID == "" {
		if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
			if sessionID == "" {
				if resolved, ok := sessionIDFromClaims(claims); ok {
					sessionID = resolved
				}
			}
			if userID == "" {
				userID = strings.TrimSpace(claims.UserID())
				if userID == "" {
					userID = strings.TrimSpace(claims.Subject())
				}
			}
		}
	}
	if sessionID == "" || userID == "" {
		if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
			if sessionID == "" {
				if resolved, ok := sessionIDFromClaims(claims); ok {
					sessionID = resolved
				}
			}
			if userID == "" {
				userID = strings.TrimSpace(claims.UserID())
				if userID == "" {
					userID = strings.TrimSpace(claims.Subject())
				}
			}
		}
	}

	cookieName := debugSessionCookieName(cfg)
	shouldSetCookie := cfg.SessionTracking || sessionID == ""
	cookieSession := ""
	if cookieName != "" && shouldSetCookie {
		cookieSession = strings.TrimSpace(c.Cookies(cookieName))
		if cookieSession == "" {
			cookieSession = uuid.NewString()
		}
		if cookieSession != "" {
			debugSetSessionCookie(c, cookieName, cookieSession, cfg.SessionInactivityExpiry)
		}
	}
	if sessionID == "" {
		sessionID = cookieSession
	}
	return debugSessionContext{
		SessionID: sessionID,
		UserID:    userID,
	}
}

func debugSessionCookieName(cfg DebugConfig) string {
	return strings.TrimSpace(cfg.SessionCookieName)
}

func debugSetSessionCookie(c router.Context, name, value string, ttl time.Duration) {
	if c == nil || strings.TrimSpace(name) == "" || strings.TrimSpace(value) == "" {
		return
	}
	cookie := &router.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HTTPOnly: true,
		Secure:   debugIsSecureRequest(c),
		SameSite: "Lax",
	}
	if ttl > 0 {
		cookie.MaxAge = int(ttl.Seconds())
		cookie.Expires = time.Now().Add(ttl)
	} else {
		cookie.SessionOnly = true
	}
	c.Cookie(cookie)
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
	if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
		if carrier, ok := claims.(interface{ Username() string }); ok {
			if name := strings.TrimSpace(carrier.Username()); name != "" {
				return name
			}
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
			if name := debugSessionUsernameFromMetadata(carrier.ClaimsMetadata()); name != "" {
				return name
			}
		}
	}
	if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
		if carrier, ok := claims.(interface{ Username() string }); ok {
			if name := strings.TrimSpace(carrier.Username()); name != "" {
				return name
			}
		}
		if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
			if name := debugSessionUsernameFromMetadata(carrier.ClaimsMetadata()); name != "" {
				return name
			}
		}
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
