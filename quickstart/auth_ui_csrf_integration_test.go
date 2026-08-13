package quickstart

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

var authUICSRFFieldPattern = regexp.MustCompile(`name="_token" value="([^"]+)"`)

func newAuthUICSRFTestServer(t *testing.T, cfg admin.Config) (router.Server[*fiber.App], router.Router[*fiber.App]) {
	t.Helper()
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("create test admin: %v", err)
	}
	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath(cfg.BasePath))),
	)
	if err != nil {
		t.Fatalf("create Auth UI views: %v", err)
	}
	server := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{
			Views:        views,
			ErrorHandler: NewFiberErrorHandler(adm, cfg, false),
		})
	})
	return server, server.Router()
}

func authUICSRFTokenFromResponse(t *testing.T, response *http.Response) string {
	t.Helper()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read Auth UI response: %v", err)
	}
	match := authUICSRFFieldPattern.FindSubmatch(body)
	if len(match) != 2 {
		t.Fatalf("expected CSRF field in response body: %s", body)
	}
	return string(match[1])
}

func authUICSRFCookieFromResponse(t *testing.T, response *http.Response) *http.Cookie {
	t.Helper()
	for _, cookie := range response.Cookies() {
		if cookie.Name == authUIBrowserCSRFCookieName {
			return cookie
		}
	}
	t.Fatalf("expected %s cookie", authUIBrowserCSRFCookieName)
	return nil
}

func TestAuthUIBrowserCSRFIsBoundToIssuingClientAndOrigin(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	server, routes := newAuthUICSRFTestServer(t, cfg)
	provider := &countingAuthUIIdentityProvider{}
	auther := auth.NewAuthenticator(provider, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("create HTTP authenticator: %v", err)
	}
	protection, err := NewAuthUIBrowserProtection(
		cfg,
		WithAuthUIBrowserProtectionSecureKey([]byte("01234567890123456789012345678901")),
	)
	if err != nil {
		t.Fatalf("create browser protection: %v", err)
	}
	if registerErr := RegisterAuthUIRoutes(routes, cfg, routeAuth, WithAuthUIBrowserProtection(protection)); registerErr != nil {
		t.Fatalf("register Auth UI routes: %v", registerErr)
	}

	getResponse, err := server.WrappedRouter().Test(
		newAuthUITestRequest(http.MethodGet, "http://example.test/admin/login", nil),
		-1,
	)
	if err != nil {
		t.Fatalf("get login page: %v", err)
	}
	defer closeAuthUITestResponse(t, getResponse)
	if getResponse.StatusCode != http.StatusOK {
		t.Fatalf("expected login page, got %d", getResponse.StatusCode)
	}
	issuedToken := authUICSRFTokenFromResponse(t, getResponse)
	issuedCookie := authUICSRFCookieFromResponse(t, getResponse)
	if !issuedCookie.HttpOnly || issuedCookie.Path != "/" || issuedCookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("unexpected pre-auth cookie security attributes: %#v", issuedCookie)
	}

	form := url.Values{
		csrfmw.DefaultFormFieldName: {issuedToken},
		"identifier":                {"admin@example.test"},
		"password":                  {"password"},
	}
	sameClientRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/login", strings.NewReader(form.Encode()))
	sameClientRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	sameClientRequest.Header.Set("Origin", "http://example.test")
	sameClientRequest.AddCookie(issuedCookie)
	sameClientResponse, err := server.WrappedRouter().Test(sameClientRequest, -1)
	if err != nil {
		t.Fatalf("submit same-client login: %v", err)
	}
	defer closeAuthUITestResponse(t, sameClientResponse)
	if sameClientResponse.StatusCode != http.StatusFound {
		t.Fatalf("expected same-client login success, got %d", sameClientResponse.StatusCode)
	}
	if provider.verifyCalls != 1 {
		t.Fatalf("expected one authentication call, got %d", provider.verifyCalls)
	}

	otherClientRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/login", strings.NewReader(form.Encode()))
	otherClientRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	otherClientRequest.Header.Set("Origin", "http://example.test")
	otherClientResponse, err := server.WrappedRouter().Test(otherClientRequest, -1)
	if err != nil {
		t.Fatalf("submit cross-client login: %v", err)
	}
	defer closeAuthUITestResponse(t, otherClientResponse)
	if otherClientResponse.StatusCode != http.StatusSeeOther {
		t.Fatalf("expected cross-client token rejection, got %d", otherClientResponse.StatusCode)
	}
	if provider.verifyCalls != 1 {
		t.Fatalf("cross-client token reached authentication; calls=%d", provider.verifyCalls)
	}

	crossOriginRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/login", strings.NewReader(form.Encode()))
	crossOriginRequest.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	crossOriginRequest.Header.Set("Origin", "https://attacker.example")
	crossOriginRequest.AddCookie(issuedCookie)
	crossOriginResponse, err := server.WrappedRouter().Test(crossOriginRequest, -1)
	if err != nil {
		t.Fatalf("submit cross-origin login: %v", err)
	}
	defer closeAuthUITestResponse(t, crossOriginResponse)
	if crossOriginResponse.StatusCode != http.StatusForbidden {
		body := readAuthUITestResponseBody(t, crossOriginResponse)
		t.Fatalf("expected cross-origin rejection, got %d body=%s", crossOriginResponse.StatusCode, body)
	}
	if provider.verifyCalls != 1 {
		t.Fatalf("cross-origin request reached authentication; calls=%d", provider.verifyCalls)
	}
}

func TestAuthUIBrowserCSRFSecureRequestsUseHostPrefixedCookie(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	server, routes := newAuthUICSRFTestServer(t, cfg)
	protection, err := NewAuthUIBrowserProtection(
		cfg,
		WithAuthUIBrowserProtectionSecureKey([]byte("01234567890123456789012345678901")),
		WithAuthUIBrowserProtectionSecureRequestResolver(func(router.Context) bool { return true }),
	)
	if err != nil {
		t.Fatalf("create browser protection: %v", err)
	}
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("create HTTP authenticator: %v", err)
	}
	if registerErr := RegisterAuthUIRoutes(routes, cfg, routeAuth, WithAuthUIBrowserProtection(protection)); registerErr != nil {
		t.Fatalf("register Auth UI routes: %v", registerErr)
	}

	response, err := server.WrappedRouter().Test(newAuthUITestRequest(http.MethodGet, "http://example.test/admin/login", nil), -1)
	if err != nil {
		t.Fatalf("get secure login page: %v", err)
	}
	defer closeAuthUITestResponse(t, response)
	for _, cookie := range response.Cookies() {
		if cookie.Name != AuthUIBrowserCSRFSecureCookieName {
			continue
		}
		if !cookie.Secure || !cookie.HttpOnly || cookie.Path != "/" || cookie.Domain != "" {
			t.Fatalf("unexpected __Host- cookie attributes: %#v", cookie)
		}
		return
	}
	t.Fatalf("expected secure host-prefixed cookie %q", AuthUIBrowserCSRFSecureCookieName)
}

func TestRegistrationAndPasswordResetUseSharedBrowserCSRFProtection(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	server, routes := newAuthUICSRFTestServer(t, cfg)
	protection, err := NewAuthUIBrowserProtection(
		cfg,
		WithAuthUIBrowserProtectionSecureKey([]byte("01234567890123456789012345678901")),
	)
	if err != nil {
		t.Fatalf("create browser protection: %v", err)
	}
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("create HTTP authenticator: %v", err)
	}
	if registerErr := RegisterAuthUIRoutes(
		routes,
		cfg,
		routeAuth,
		WithAuthUIBrowserProtection(protection),
		WithAuthUIPasswordResetEnabled(func(admin.Config) bool { return true }),
	); registerErr != nil {
		t.Fatalf("register Auth UI routes: %v", registerErr)
	}
	if registerErr := RegisterRegistrationUIRoutes(
		routes,
		cfg,
		WithRegistrationUIBrowserProtection(protection),
		WithRegistrationUIEnabled(func(admin.Config) bool { return true }),
	); registerErr != nil {
		t.Fatalf("register registration UI routes: %v", registerErr)
	}

	registerCalls := 0
	registerConfirmCalls := 0
	resetCalls := 0
	resetConfirmCalls := 0
	if registerErr := RegisterOnboardingRoutes(
		routes,
		cfg,
		OnboardingHandlers{
			SelfRegister: func(c router.Context) error {
				registerCalls++
				return c.JSON(http.StatusOK, map[string]any{"ok": true})
			},
			ConfirmRegistration: func(c router.Context) error {
				registerConfirmCalls++
				return c.JSON(http.StatusOK, map[string]any{"ok": true})
			},
			RequestPasswordReset: func(c router.Context) error {
				resetCalls++
				return c.JSON(http.StatusOK, map[string]any{"ok": true})
			},
			ConfirmPasswordReset: func(c router.Context) error {
				resetConfirmCalls++
				return c.JSON(http.StatusOK, map[string]any{"ok": true})
			},
		},
		WithOnboardingBrowserProtection(protection),
	); registerErr != nil {
		t.Fatalf("register onboarding routes: %v", registerErr)
	}

	registerPage, err := server.WrappedRouter().Test(newAuthUITestRequest(http.MethodGet, "http://example.test/admin/register", nil), -1)
	if err != nil {
		t.Fatalf("get registration page: %v", err)
	}
	defer closeAuthUITestResponse(t, registerPage)
	registerToken := authUICSRFTokenFromResponse(t, registerPage)
	browserCookie := authUICSRFCookieFromResponse(t, registerPage)

	registerRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/register", strings.NewReader(`{"email":"user@example.test"}`))
	registerRequest.Header.Set("Content-Type", "application/json")
	registerRequest.Header.Set("Accept", "application/json")
	registerRequest.Header.Set("Origin", "http://example.test")
	registerRequest.Header.Set(csrfmw.DefaultHeaderName, registerToken)
	registerRequest.AddCookie(browserCookie)
	registerResponse, err := server.WrappedRouter().Test(registerRequest, -1)
	if err != nil {
		t.Fatalf("submit registration: %v", err)
	}
	defer closeAuthUITestResponse(t, registerResponse)
	if registerResponse.StatusCode != http.StatusOK || registerCalls != 1 {
		t.Fatalf("expected protected registration handler once, status=%d calls=%d", registerResponse.StatusCode, registerCalls)
	}
	registerConfirmRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/register/confirm", strings.NewReader(`{"token":"registration-token","password":"password"}`))
	registerConfirmRequest.Header.Set("Content-Type", "application/json")
	registerConfirmRequest.Header.Set("Accept", "application/json")
	registerConfirmRequest.Header.Set("Origin", "http://example.test")
	registerConfirmRequest.Header.Set(csrfmw.DefaultHeaderName, registerToken)
	registerConfirmRequest.AddCookie(browserCookie)
	registerConfirmResponse, err := server.WrappedRouter().Test(registerConfirmRequest, -1)
	if err != nil {
		t.Fatalf("submit registration confirmation: %v", err)
	}
	defer closeAuthUITestResponse(t, registerConfirmResponse)
	if registerConfirmResponse.StatusCode != http.StatusOK || registerConfirmCalls != 1 {
		t.Fatalf("expected protected registration confirmation once, status=%d calls=%d", registerConfirmResponse.StatusCode, registerConfirmCalls)
	}

	resetPageRequest := newAuthUITestRequest(http.MethodGet, "http://example.test/admin/password-reset", nil)
	resetPageRequest.AddCookie(browserCookie)
	resetPage, err := server.WrappedRouter().Test(resetPageRequest, -1)
	if err != nil {
		t.Fatalf("get password-reset page: %v", err)
	}
	defer closeAuthUITestResponse(t, resetPage)
	resetToken := authUICSRFTokenFromResponse(t, resetPage)

	resetRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/password/reset/request", strings.NewReader(`{"identifier":"user@example.test"}`))
	resetRequest.Header.Set("Content-Type", "application/json")
	resetRequest.Header.Set("Accept", "application/json")
	resetRequest.Header.Set("Origin", "http://example.test")
	resetRequest.Header.Set(csrfmw.DefaultHeaderName, resetToken)
	resetRequest.AddCookie(browserCookie)
	resetResponse, err := server.WrappedRouter().Test(resetRequest, -1)
	if err != nil {
		t.Fatalf("submit password reset: %v", err)
	}
	defer closeAuthUITestResponse(t, resetResponse)
	if resetResponse.StatusCode != http.StatusOK || resetCalls != 1 {
		t.Fatalf("expected protected reset handler once, status=%d calls=%d", resetResponse.StatusCode, resetCalls)
	}

	resetConfirmPageRequest := newAuthUITestRequest(http.MethodGet, "http://example.test/admin/password-reset/confirm", nil)
	resetConfirmPageRequest.AddCookie(browserCookie)
	resetConfirmPage, err := server.WrappedRouter().Test(resetConfirmPageRequest, -1)
	if err != nil {
		t.Fatalf("get password-reset confirmation page: %v", err)
	}
	defer closeAuthUITestResponse(t, resetConfirmPage)
	resetConfirmToken := authUICSRFTokenFromResponse(t, resetConfirmPage)
	resetConfirmRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/password/reset/confirm", strings.NewReader(`{"token":"reset-token","password":"password"}`))
	resetConfirmRequest.Header.Set("Content-Type", "application/json")
	resetConfirmRequest.Header.Set("Accept", "application/json")
	resetConfirmRequest.Header.Set("Origin", "http://example.test")
	resetConfirmRequest.Header.Set(csrfmw.DefaultHeaderName, resetConfirmToken)
	resetConfirmRequest.AddCookie(browserCookie)
	resetConfirmResponse, err := server.WrappedRouter().Test(resetConfirmRequest, -1)
	if err != nil {
		t.Fatalf("submit password-reset confirmation: %v", err)
	}
	defer closeAuthUITestResponse(t, resetConfirmResponse)
	if resetConfirmResponse.StatusCode != http.StatusOK || resetConfirmCalls != 1 {
		t.Fatalf("expected protected reset confirmation once, status=%d calls=%d", resetConfirmResponse.StatusCode, resetConfirmCalls)
	}

	missingTokenRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/register", strings.NewReader(`{"email":"user@example.test"}`))
	missingTokenRequest.Header.Set("Content-Type", "application/json")
	missingTokenRequest.Header.Set("Accept", "application/json")
	missingTokenRequest.Header.Set("Origin", "http://example.test")
	missingTokenRequest.AddCookie(browserCookie)
	missingTokenResponse, err := server.WrappedRouter().Test(missingTokenRequest, -1)
	if err != nil {
		t.Fatalf("submit registration without token: %v", err)
	}
	defer closeAuthUITestResponse(t, missingTokenResponse)
	missingBody := readAuthUITestResponseBody(t, missingTokenResponse)
	if missingTokenResponse.StatusCode != http.StatusForbidden || registerCalls != 1 {
		t.Fatalf("expected missing-token rejection before handler, status=%d calls=%d body=%s", missingTokenResponse.StatusCode, registerCalls, missingBody)
	}
	if strings.Contains(string(missingBody), csrfmw.ErrTokenMissing.Error()) {
		t.Fatalf("structured error exposed dependency detail: %s", missingBody)
	}

	crossOriginRequest := newAuthUITestRequest(http.MethodPost, "http://example.test/admin/api/onboarding/password/reset/request", strings.NewReader(`{"identifier":"user@example.test"}`))
	crossOriginRequest.Header.Set("Content-Type", "application/json")
	crossOriginRequest.Header.Set("Accept", "application/json")
	crossOriginRequest.Header.Set("Origin", "https://attacker.example")
	crossOriginRequest.Header.Set(csrfmw.DefaultHeaderName, resetToken)
	crossOriginRequest.AddCookie(browserCookie)
	crossOriginResponse, err := server.WrappedRouter().Test(crossOriginRequest, -1)
	if err != nil {
		t.Fatalf("submit cross-origin password reset: %v", err)
	}
	defer closeAuthUITestResponse(t, crossOriginResponse)
	if crossOriginResponse.StatusCode != http.StatusForbidden || resetCalls != 1 {
		t.Fatalf("expected cross-origin rejection before handler, status=%d calls=%d", crossOriginResponse.StatusCode, resetCalls)
	}
}

func TestAuthUIBrowserCSRFRuntimeFailureReturnsGenericServerError(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	server, routes := newAuthUICSRFTestServer(t, cfg)
	protection, err := NewAuthUIBrowserProtection(
		cfg,
		WithAuthUIBrowserProtectionSecureKey([]byte("01234567890123456789012345678901")),
	)
	if err != nil {
		t.Fatalf("create browser protection: %v", err)
	}
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("create HTTP authenticator: %v", err)
	}
	if registerErr := RegisterAuthUIRoutes(routes, cfg, routeAuth, WithAuthUIBrowserProtection(protection)); registerErr != nil {
		t.Fatalf("register Auth UI routes: %v", registerErr)
	}

	originalRandRead := authUIBrowserCSRFRandRead
	authUIBrowserCSRFRandRead = func([]byte) (int, error) { return 0, errors.New("entropy unavailable: internal detail") }
	t.Cleanup(func() { authUIBrowserCSRFRandRead = originalRandRead })

	response, err := server.WrappedRouter().Test(
		httptest.NewRequestWithContext(context.Background(), http.MethodGet, "http://example.test/admin/login", nil),
		-1,
	)
	if err != nil {
		t.Fatalf("get login page with entropy failure: %v", err)
	}
	defer closeAuthUITestResponse(t, response)
	body := readAuthUITestResponseBody(t, response)
	if response.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected generic server failure, got %d body=%s", response.StatusCode, body)
	}
	if strings.Contains(string(body), "entropy unavailable") {
		t.Fatalf("server response exposed runtime detail: %s", body)
	}
}

func newAuthUITestRequest(method, target string, body io.Reader) *http.Request {
	return httptest.NewRequestWithContext(context.Background(), method, target, body)
}

func readAuthUITestResponseBody(t *testing.T, response *http.Response) []byte {
	t.Helper()
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read Auth UI response body: %v", err)
	}
	return body
}

func closeAuthUITestResponse(t *testing.T, response *http.Response) {
	t.Helper()
	if err := response.Body.Close(); err != nil {
		t.Errorf("close Auth UI response body: %v", err)
	}
}
