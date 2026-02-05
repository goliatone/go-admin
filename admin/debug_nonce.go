package admin

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

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
func debugEnsureJSErrorNonce(c router.Context, cookiePath string) string {
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
	secure := debugIsSecureRequest(c)
	sameSite := "Strict"
	if !secure {
		sameSite = "Lax"
	}
	c.Cookie(&router.Cookie{
		Name:     debugNonceCookieName,
		Value:    nonce,
		Path:     cookiePath,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		MaxAge:   debugNonceCookieMaxAge,
		Expires:  time.Now().Add(time.Duration(debugNonceCookieMaxAge) * time.Second),
	})
	return nonce
}

// debugIsSecureRequest returns true when the request was made over HTTPS.
// It checks the underlying TLS connection and the X-Forwarded-Proto header
// for reverse-proxy setups.
func debugIsSecureRequest(c router.Context) bool {
	if c == nil {
		return false
	}
	if proto := strings.ToLower(strings.TrimSpace(c.Header("X-Forwarded-Proto"))); proto == "https" {
		return true
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
