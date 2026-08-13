package quickstart

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const (
	AuthUIBrowserCSRFCookieName       = "go_admin_pre_auth_csrf"
	AuthUIBrowserCSRFSecureCookieName = "__Host-" + AuthUIBrowserCSRFCookieName
	authUIBrowserCSRFCookieName       = AuthUIBrowserCSRFCookieName
	authUIBrowserCSRFLocalKey         = "go_admin_pre_auth_csrf_session"
	authUIBrowserCSRFNonceBytes       = 32
	AuthUIBrowserCSRFInvalidCode      = "AUTH_UI_CSRF_INVALID"
)

var authUIBrowserCSRFRandRead = rand.Read

// AuthUIBrowserProtectionOption customizes the reusable public Auth UI browser
// protection boundary.
type AuthUIBrowserProtectionOption func(*authUIBrowserProtectionOptions)

type authUIBrowserProtectionOptions struct {
	secureKey           []byte
	cookie              router.Cookie
	secureRequest       func(router.Context) bool
	origin              router.OriginProtectionConfig
	cookieExplicitlySet bool
}

// AuthUIBrowserProtection binds public Auth UI CSRF tokens to an opaque
// pre-authentication browser cookie and enforces same-origin unsafe requests.
// Reuse one instance across Auth UI, registration UI, and onboarding routes.
type AuthUIBrowserProtection struct {
	secureKey     []byte
	cookie        router.Cookie
	secureRequest func(router.Context) bool
	origin        router.OriginProtectionConfig
	useHostPrefix bool
}

// WithAuthUIBrowserProtectionSecureKey sets a stable signing key. Multi-instance
// deployments must share this key (or cfg.PreviewSecret) across instances.
func WithAuthUIBrowserProtectionSecureKey(key []byte) AuthUIBrowserProtectionOption {
	return func(opts *authUIBrowserProtectionOptions) {
		if opts != nil && len(key) > 0 {
			opts.secureKey = append([]byte(nil), key...)
		}
	}
}

// WithAuthUIBrowserProtectionCookie overrides the pre-auth browser cookie.
// The cookie remains host-only and HTTP-only; Domain values are rejected.
func WithAuthUIBrowserProtectionCookie(cookie router.Cookie) AuthUIBrowserProtectionOption {
	return func(opts *authUIBrowserProtectionOptions) {
		if opts != nil {
			opts.cookie = cookie
			opts.cookieExplicitlySet = true
		}
	}
}

// WithAuthUIBrowserProtectionSecureRequestResolver controls whether the
// pre-auth cookie is marked Secure for the current request.
func WithAuthUIBrowserProtectionSecureRequestResolver(resolver func(router.Context) bool) AuthUIBrowserProtectionOption {
	return func(opts *authUIBrowserProtectionOptions) {
		if opts != nil && resolver != nil {
			opts.secureRequest = resolver
		}
	}
}

// WithAuthUIBrowserProtectionOriginConfig overrides same-origin enforcement.
func WithAuthUIBrowserProtectionOriginConfig(config router.OriginProtectionConfig) AuthUIBrowserProtectionOption {
	return func(opts *authUIBrowserProtectionOptions) {
		if opts != nil {
			opts.origin = config
		}
	}
}

// NewAuthUIBrowserProtection constructs a browser-bound, stateless CSRF
// boundary suitable for public login, registration, and password-reset flows.
func NewAuthUIBrowserProtection(cfg admin.Config, options ...AuthUIBrowserProtectionOption) (*AuthUIBrowserProtection, error) {
	resolved := resolveAuthUIBrowserProtectionOptions(options)
	secureKey, err := resolveAuthUICSRFSecureKey(authUIOptions{csrfSecureKey: resolved.secureKey}, cfg)
	if err != nil {
		return nil, err
	}
	cookie, err := resolveAuthUIBrowserCSRFCookie(resolved)
	if err != nil {
		return nil, err
	}
	return &AuthUIBrowserProtection{
		secureKey:     secureKey,
		cookie:        cookie,
		secureRequest: resolveAuthUIBrowserSecureRequest(cfg, resolved),
		origin:        resolved.origin,
		useHostPrefix: !resolved.cookieExplicitlySet,
	}, nil
}

func resolveAuthUIBrowserProtectionOptions(options []AuthUIBrowserProtectionOption) authUIBrowserProtectionOptions {
	resolved := authUIBrowserProtectionOptions{}
	for _, option := range options {
		if option != nil {
			option(&resolved)
		}
	}
	return resolved
}

func resolveAuthUIBrowserCSRFCookie(options authUIBrowserProtectionOptions) (router.Cookie, error) {
	cookie := options.cookie
	if !options.cookieExplicitlySet {
		cookie = router.FirstPartySessionCookie(authUIBrowserCSRFCookieName, "")
		// Auth UI route options may place login, registration, or onboarding
		// outside cfg.BasePath. A host-only root path keeps one browser binding
		// available to every explicitly configured public auth surface.
		cookie.Path = "/"
	}
	cookie.Name = strings.TrimSpace(cookie.Name)
	if cookie.Name == "" {
		cookie.Name = authUIBrowserCSRFCookieName
	}
	if strings.TrimSpace(cookie.Path) == "" {
		cookie.Path = "/"
	}
	if strings.TrimSpace(cookie.Domain) != "" {
		return router.Cookie{}, fmt.Errorf("auth ui csrf cookie must be host-only")
	}
	cookie.HTTPOnly = true
	if strings.HasPrefix(cookie.Name, "__Host-") && (!cookie.Secure || cookie.Path != "/") {
		return router.Cookie{}, fmt.Errorf("auth ui csrf __Host- cookie must be Secure with Path=/")
	}
	if strings.HasPrefix(cookie.Name, "__Secure-") && !cookie.Secure {
		return router.Cookie{}, fmt.Errorf("auth ui csrf __Secure- cookie must be Secure")
	}
	if strings.TrimSpace(cookie.SameSite) == "" {
		cookie.SameSite = router.CookieSameSiteLaxMode
	}
	if err := router.ValidateCookie(cookie); err != nil {
		return router.Cookie{}, fmt.Errorf("invalid auth ui csrf cookie: %w", err)
	}
	return cookie, nil
}

func resolveAuthUIBrowserSecureRequest(cfg admin.Config, options authUIBrowserProtectionOptions) func(router.Context) bool {
	if options.secureRequest != nil {
		return options.secureRequest
	}
	if cfg.Debug.SecureRequestResolver != nil {
		return cfg.Debug.SecureRequestResolver
	}
	return authUIBrowserRequestIsSecure
}

// HTMLMiddleware returns browser CSRF middleware with caller-owned recovery
// behavior for token failures and a controlled forbidden origin response.
func (p *AuthUIBrowserProtection) HTMLMiddleware(errorHandler router.ErrorHandler) router.MiddlewareFunc {
	if errorHandler == nil {
		errorHandler = authUIBrowserCSRFHTMLFailure
	}
	return p.middleware(errorHandler, authUIBrowserCSRFOriginFailure)
}

// APIMiddleware returns browser CSRF middleware whose failures flow through the
// host API error presenter as structured, controlled errors.
func (p *AuthUIBrowserProtection) APIMiddleware() router.MiddlewareFunc {
	return p.middleware(authUIBrowserCSRFAPIFailure, authUIBrowserCSRFAPIFailure)
}

// WrapAPI applies the public browser CSRF API boundary directly to a handler.
func (p *AuthUIBrowserProtection) WrapAPI(handler router.HandlerFunc) router.HandlerFunc {
	if handler == nil {
		return nil
	}
	return p.APIMiddleware()(handler)
}

func (p *AuthUIBrowserProtection) middleware(csrfErrorHandler, originErrorHandler router.ErrorHandler) router.MiddlewareFunc {
	if p == nil {
		return func(next router.HandlerFunc) router.HandlerFunc { return next }
	}
	originConfig := p.origin
	originConfig.ErrorHandler = originErrorHandler
	originMiddleware := router.OriginProtection(originConfig)

	return func(next router.HandlerFunc) router.HandlerFunc {
		csrfMiddleware := csrfmw.New(csrfmw.Config{
			SecureKey:          append([]byte(nil), p.secureKey...),
			SessionKeyResolver: p.sessionKey,
			ErrorHandler:       csrfErrorHandler,
			SuccessHandler:     next,
		})
		return originMiddleware(p.ensureBrowserSession(csrfMiddleware(next)))
	}
}

func (p *AuthUIBrowserProtection) ensureBrowserSession(next router.HandlerFunc) router.HandlerFunc {
	return func(c router.Context) error {
		if c == nil {
			return authUIBrowserCSRFInternalFailure(nil)
		}
		cookie := p.cookieForRequest(c)
		nonce := strings.TrimSpace(c.Cookies(cookie.Name))
		if !validAuthUIBrowserCSRFNonce(nonce) {
			var err error
			nonce, err = generateAuthUIBrowserCSRFNonce()
			if err != nil {
				return authUIBrowserCSRFInternalFailure(err)
			}
			cookie.Value = nonce
			c.Cookie(&cookie)
		}
		c.Locals(authUIBrowserCSRFLocalKey, nonce)
		return next(c)
	}
}

func (p *AuthUIBrowserProtection) sessionKey(c router.Context) (string, bool) {
	if c == nil {
		return "", false
	}
	nonce, ok := c.Locals(authUIBrowserCSRFLocalKey).(string)
	if !ok {
		nonce = ""
	}
	nonce = strings.TrimSpace(nonce)
	if !validAuthUIBrowserCSRFNonce(nonce) {
		nonce = strings.TrimSpace(c.Cookies(p.cookieForRequest(c).Name))
	}
	if !validAuthUIBrowserCSRFNonce(nonce) {
		return "", false
	}
	// The dependency's stateless token wire format uses ':' as a field
	// delimiter, so session keys must not contain that character.
	return "pre_auth_" + nonce, true
}

func (p *AuthUIBrowserProtection) cookieForRequest(c router.Context) router.Cookie {
	cookie := p.cookie
	secure := cookie.Secure || (p.secureRequest != nil && p.secureRequest(c))
	if secure {
		cookie.Secure = true
		if p.useHostPrefix {
			cookie.Name = AuthUIBrowserCSRFSecureCookieName
			cookie.Path = "/"
			cookie.Domain = ""
		}
	}
	return cookie
}

func generateAuthUIBrowserCSRFNonce() (string, error) {
	value := make([]byte, authUIBrowserCSRFNonceBytes)
	if _, err := authUIBrowserCSRFRandRead(value); err != nil {
		return "", fmt.Errorf("generate pre-auth csrf browser nonce: %w", err)
	}
	return hex.EncodeToString(value), nil
}

func validAuthUIBrowserCSRFNonce(value string) bool {
	if len(value) != authUIBrowserCSRFNonceBytes*2 {
		return false
	}
	decoded, err := hex.DecodeString(value)
	return err == nil && len(decoded) == authUIBrowserCSRFNonceBytes
}

func authUIBrowserRequestIsSecure(c router.Context) bool {
	httpContext, ok := c.(router.HTTPContext)
	if !ok || httpContext.Request() == nil {
		return false
	}
	request := httpContext.Request()
	return request.TLS != nil || (request.URL != nil && strings.EqualFold(request.URL.Scheme, "https"))
}

func isAuthUIBrowserCSRFValidationFailure(err error) bool {
	return errors.Is(err, csrfmw.ErrTokenExpired) ||
		errors.Is(err, csrfmw.ErrTokenMismatch) ||
		errors.Is(err, csrfmw.ErrTokenMissing)
}

func authUIBrowserCSRFHTMLFailure(_ router.Context, err error) error {
	if isAuthUIBrowserCSRFValidationFailure(err) {
		return goerrors.New("The form expired. Refresh the page and try again.", goerrors.CategoryValidation).
			WithCode(http.StatusForbidden).
			WithTextCode(AuthUIBrowserCSRFInvalidCode)
	}
	return authUIBrowserCSRFInternalFailure(err)
}

func authUIBrowserCSRFOriginFailure(_ router.Context, _ error) error {
	return goerrors.New("The request could not be verified.", goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode(AuthUIBrowserCSRFInvalidCode)
}

func authUIBrowserCSRFAPIFailure(_ router.Context, err error) error {
	if isAuthUIBrowserCSRFValidationFailure(err) || errors.Is(err, router.ErrOriginProtectionRejected) {
		return goerrors.New("The form expired or could not be verified. Refresh the page and try again.", goerrors.CategoryValidation).
			WithCode(http.StatusForbidden).
			WithTextCode(AuthUIBrowserCSRFInvalidCode)
	}
	return authUIBrowserCSRFInternalFailure(err)
}

func authUIBrowserCSRFInternalFailure(err error) error {
	if err != nil {
		return goerrors.Wrap(err, goerrors.CategoryInternal, "Browser request protection is temporarily unavailable.").
			WithCode(http.StatusInternalServerError).
			WithTextCode("CSRF_PROTECTION_UNAVAILABLE")
	}
	return goerrors.New("Browser request protection is temporarily unavailable.", goerrors.CategoryInternal).
		WithCode(http.StatusInternalServerError).
		WithTextCode("CSRF_PROTECTION_UNAVAILABLE")
}
