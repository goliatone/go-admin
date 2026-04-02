package admin

import (
	"crypto/sha256"
	"errors"
	"strings"

	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

func adminBrowserCSRFProtector(admin *Admin) BrowserCSRFProtector {
	if admin == nil {
		return nil
	}
	protector, _ := admin.authenticator.(BrowserCSRFProtector)
	return protector
}

func adminRequestUsesCookies(c router.Context) bool {
	if c == nil {
		return false
	}
	return strings.TrimSpace(c.Header("Cookie")) != ""
}

func adminMethodRequiresCSRF(method string) bool {
	switch strings.ToUpper(strings.TrimSpace(method)) {
	case "GET", "HEAD", "OPTIONS", "TRACE":
		return false
	default:
		return true
	}
}

func adminUsesCookieAuth(c router.Context, cfg auth.Config) bool {
	if c == nil || cfg == nil {
		return false
	}
	cookieName := adminAuthCookieName(cfg)
	if cookieName == "" {
		return false
	}
	return strings.TrimSpace(c.Cookies(cookieName)) != ""
}

func adminAuthCookieName(cfg auth.Config) string {
	if cfg == nil {
		return ""
	}
	for part := range strings.SplitSeq(cfg.GetTokenLookup(), ",") {
		part = strings.TrimSpace(part)
		if after, ok := strings.CutPrefix(part, "cookie:"); ok {
			return strings.TrimSpace(after)
		}
	}
	return ""
}

func validateAdminBrowserCSRF(c router.Context, cfg auth.Config) error {
	if c == nil || cfg == nil {
		return errors.New("csrf configuration unavailable")
	}
	middleware := csrfmw.New(csrfmw.Config{
		SecureKey:          adminCSRFSecureKey(cfg),
		SessionKeyResolver: adminCSRFSessionKeyResolver,
		ErrorHandler: func(_ router.Context, err error) error {
			return err
		},
		SuccessHandler: func(router.Context) error { return nil },
	})
	return middleware(func(router.Context) error { return nil })(c)
}

func adminCSRFSecureKey(cfg auth.Config) []byte {
	if cfg == nil {
		return nil
	}
	sum := sha256.Sum256([]byte("go-auth-browser-csrf:" + cfg.GetSigningKey() + ":" + cfg.GetContextKey()))
	return sum[:]
}

func adminCSRFSessionKeyResolver(c router.Context) (string, bool) {
	if c == nil {
		return "", false
	}
	if sessionID := strings.TrimSpace(c.GetString("session_id", "")); sessionID != "" {
		return "csrf_" + sessionID, true
	}
	if userID := strings.TrimSpace(c.GetString("user_id", "")); userID != "" {
		return "csrf_user_" + userID, true
	}
	if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
		if tokenIDer, ok := claims.(interface{ TokenID() string }); ok {
			if tokenID := strings.TrimSpace(tokenIDer.TokenID()); tokenID != "" {
				return "csrf_session_" + tokenID, true
			}
		}
		if userID := strings.TrimSpace(claims.UserID()); userID != "" {
			return "csrf_user_" + userID, true
		}
	}
	if actor, ok := auth.ActorFromContext(c.Context()); ok && actor != nil {
		if actorID := strings.TrimSpace(actor.ActorID); actorID != "" {
			return "csrf_user_" + actorID, true
		}
	}
	return "", false
}

func newAdminBrowserCSRFError(err error) error {
	meta := map[string]any{}
	if err != nil {
		if reason := strings.TrimSpace(err.Error()); reason != "" {
			meta["reason"] = reason
		}
	}
	return NewDomainError(TextCodeAdminCSRFInvalid, "CSRF token is missing or invalid.", meta)
}

func enforceAdminAPIBrowserCSRF(c router.Context, cfg auth.Config) error {
	if c == nil || cfg == nil {
		return nil
	}
	if !adminMethodRequiresCSRF(c.Method()) || !adminUsesCookieAuth(c, cfg) {
		return nil
	}
	if err := validateAdminBrowserCSRF(c, cfg); err != nil {
		return newAdminBrowserCSRFError(err)
	}
	return nil
}
