package admin

import (
	"net/http"
	"strings"
	"time"

	"crypto/rand"
	"encoding/hex"

	router "github.com/goliatone/go-router"
)

const (
	debugNonceCookieName   = "__dbg_nonce"
	debugNonceBytes        = 16    // 16 bytes = 32 hex chars
	debugNonceCookieMaxAge = 86400 // 24 hours
)

// debugGenerateNonce returns a cryptographically random hex-encoded nonce.
func debugGenerateNonce() string {
	b := make([]byte, debugNonceBytes)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

// debugEnsureJSErrorNonce reads the existing nonce cookie or generates a new
// one. It returns the nonce value and sets the cookie on the response when
// a new nonce is created.
func debugEnsureJSErrorNonce(c router.Context, cookiePath string, cfg DebugConfig) string {
	if c == nil {
		return ""
	}
	existing := strings.TrimSpace(c.Cookies(debugNonceCookieName))
	if existing != "" {
		return existing
	}
	nonce := debugGenerateNonce()
	if nonce == "" {
		return ""
	}
	secure := debugIsSecureRequest(c, cfg)
	sameSite := router.CookieSameSiteStrictMode
	if !secure {
		sameSite = router.CookieSameSiteLaxMode
	}
	cookie := router.FirstPartySessionCookie(debugNonceCookieName, nonce)
	cookie.Path = cookiePath
	cookie.Secure = secure
	cookie.SameSite = sameSite
	cookie.MaxAge = debugNonceCookieMaxAge
	cookie.Expires = time.Now().Add(time.Duration(debugNonceCookieMaxAge) * time.Second)
	cookie.SessionOnly = false
	c.Cookie(&cookie)
	return nonce
}

// debugIsSecureRequest returns true when the request was made over HTTPS.
// Forwarded-header trust is delegated to SecureRequestResolver when configured.
func debugIsSecureRequest(c router.Context, cfg DebugConfig) bool {
	if c == nil {
		return false
	}
	if cfg.SecureRequestResolver != nil {
		return cfg.SecureRequestResolver(c)
	}
	if httpCtx, ok := c.(interface{ Request() *http.Request }); ok {
		if req := httpCtx.Request(); req != nil && req.TLS != nil {
			return true
		}
	}
	return false
}

// debugValidateNonce checks that the body nonce matches the cookie nonce.
func debugValidateNonce(cookieNonce, bodyNonce string) bool {
	cookieNonce = strings.TrimSpace(cookieNonce)
	bodyNonce = strings.TrimSpace(bodyNonce)
	if cookieNonce == "" || bodyNonce == "" {
		return false
	}
	return cookieNonce == bodyNonce
}
