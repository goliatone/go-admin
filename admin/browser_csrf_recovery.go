package admin

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const (
	BrowserCSRFErrorQueryKey      = "csrf_error"
	BrowserCSRFFormExpiredCode    = "form_expired"
	BrowserCSRFErrorMessageLocal  = "csrf_error_message"
	BrowserCSRFFormExpiredMessage = "The form expired. Please review your changes and try again."
)

func (a *GoAuthAuthenticator) resolveBrowserProtectionConfig() auth.BrowserProtectionConfig {
	config := auth.BrowserProtectionConfig{}
	if a != nil && a.browserProtection != nil {
		config = *a.browserProtection
	}
	if config.CSRF.ErrorHandler == nil {
		config.CSRF.ErrorHandler = a.handleBrowserCSRFFailure
	}
	if config.Origin.ErrorHandler == nil {
		config.Origin.ErrorHandler = handleBrowserOriginFailure
	}
	return config
}

func (a *GoAuthAuthenticator) handleBrowserCSRFFailure(c router.Context, err error) error {
	if isRecoverableBrowserCSRFFailure(err) {
		target := browserCSRFRecoveryTarget(c, a.browserCSRFRecoveryFallback())
		return c.Redirect(target, http.StatusSeeOther)
	}
	return browserCSRFInternalError(err)
}

func handleBrowserOriginFailure(_ router.Context, _ error) error {
	return goerrors.New("The request could not be verified.", goerrors.CategoryAuthz).
		WithCode(http.StatusForbidden).
		WithTextCode(TextCodeAdminCSRFInvalid)
}

func isRecoverableBrowserCSRFFailure(err error) bool {
	return errors.Is(err, csrfmw.ErrTokenMissing) ||
		errors.Is(err, csrfmw.ErrTokenMismatch) ||
		errors.Is(err, csrfmw.ErrTokenExpired)
}

func browserCSRFInternalError(err error) error {
	const message = "Browser request protection is temporarily unavailable."
	if err != nil {
		return goerrors.Wrap(err, goerrors.CategoryInternal, message).
			WithCode(http.StatusInternalServerError).
			WithTextCode("CSRF_PROTECTION_UNAVAILABLE")
	}
	return goerrors.New(message, goerrors.CategoryInternal).
		WithCode(http.StatusInternalServerError).
		WithTextCode("CSRF_PROTECTION_UNAVAILABLE")
}

func (a *GoAuthAuthenticator) browserCSRFRecoveryFallback() string {
	if a != nil {
		for _, root := range a.browserRoots {
			if normalized := normalizeBasePath(root); normalized != "" {
				return normalized
			}
		}
	}
	return "/"
}

func browserCSRFRecoveryTarget(c router.Context, fallback string) string {
	if strings.TrimSpace(fallback) == "" {
		fallback = "/"
	}
	target := fallback
	if c != nil {
		target = router.ResolveRedirectBackTarget(c, fallback)
	}
	parsed, err := url.Parse(target)
	if err != nil || parsed == nil || parsed.IsAbs() || parsed.Host != "" {
		parsed = &url.URL{Path: fallback}
	}
	if parsed == nil {
		parsed = &url.URL{Path: "/"}
	}
	query := parsed.Query()
	query.Set(BrowserCSRFErrorQueryKey, BrowserCSRFFormExpiredCode)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func applyBrowserCSRFRecoveryContext(c router.Context) {
	if c == nil {
		return
	}
	if strings.EqualFold(strings.TrimSpace(c.Query(BrowserCSRFErrorQueryKey)), BrowserCSRFFormExpiredCode) {
		c.Locals(BrowserCSRFErrorMessageLocal, BrowserCSRFFormExpiredMessage)
	}
}
