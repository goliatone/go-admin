package quickstart

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type captureRouter struct {
	getHandlers          map[string]router.HandlerFunc
	postHandlers         map[string]router.HandlerFunc
	getMiddlewares       map[string][]router.MiddlewareFunc
	postMiddlewares      map[string][]router.MiddlewareFunc
	getMiddlewareCounts  map[string]int
	postMiddlewareCounts map[string]int
}

func newCaptureRouter() *captureRouter {
	return &captureRouter{
		getHandlers:          map[string]router.HandlerFunc{},
		postHandlers:         map[string]router.HandlerFunc{},
		getMiddlewares:       map[string][]router.MiddlewareFunc{},
		postMiddlewares:      map[string][]router.MiddlewareFunc{},
		getMiddlewareCounts:  map[string]int{},
		postMiddlewareCounts: map[string]int{},
	}
}

func (r *captureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, middlewares ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, middlewares...)
	case router.POST:
		return r.Post(path, handler, middlewares...)
	case router.PUT:
		return r.Put(path, handler, middlewares...)
	case router.DELETE:
		return r.Delete(path, handler, middlewares...)
	case router.PATCH:
		return r.Patch(path, handler, middlewares...)
	case router.HEAD:
		return r.Head(path, handler, middlewares...)
	default:
		return nil
	}
}

func (r *captureRouter) Group(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *captureRouter) Mount(prefix string) router.Router[*fiber.App] {
	_ = prefix
	return r
}

func (r *captureRouter) WithGroup(path string, cb func(r router.Router[*fiber.App])) router.Router[*fiber.App] {
	if cb != nil {
		cb(r)
	}
	_ = path
	return r
}

func (r *captureRouter) Use(m ...router.MiddlewareFunc) router.Router[*fiber.App] {
	_ = m
	return r
}

func (r *captureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.getHandlers[path] = handler
	r.getMiddlewares[path] = append([]router.MiddlewareFunc(nil), mw...)
	r.getMiddlewareCounts[path] = len(mw)
	return nil
}

func (r *captureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	r.postHandlers[path] = handler
	r.postMiddlewares[path] = append([]router.MiddlewareFunc(nil), mw...)
	r.postMiddlewareCounts[path] = len(mw)
	return nil
}

func (r *captureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	_, _ = path, handler
	_ = mw
	return nil
}

func (r *captureRouter) Static(prefix, root string, config ...router.Static) router.Router[*fiber.App] {
	_, _ = prefix, root
	_ = config
	return r
}

func (r *captureRouter) WebSocket(path string, config router.WebSocketConfig, handler func(router.WebSocketContext) error) router.RouteInfo {
	_, _, _ = path, config, handler
	return nil
}

func (r *captureRouter) Routes() []router.RouteDefinition { return nil }
func (r *captureRouter) ValidateRoutes() []error          { return nil }
func (r *captureRouter) PrintRoutes()                     {}
func (r *captureRouter) WithLogger(logger router.Logger) router.Router[*fiber.App] {
	_ = logger
	return r
}

type stubIdentityProvider struct{}

func (stubIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	_, _ = ctx, password
	return stubIdentity{identifier: identifier}, nil
}

func (stubIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	_, _ = ctx, identifier
	return stubIdentity{identifier: identifier}, nil
}

type stubIdentity struct {
	identifier string
}

func (s stubIdentity) ID() string       { return s.identifier }
func (s stubIdentity) Username() string { return s.identifier }
func (s stubIdentity) Email() string    { return s.identifier + "@example.test" }
func (s stubIdentity) Role() string     { return string(auth.RoleAdmin) }

func resetAuthUICSRFKeyForTest(t *testing.T) {
	t.Helper()
	defaultAuthUICSRFKeyMu.Lock()
	defaultAuthUICSRFKey = nil
	defaultAuthUICSRFKeyMu.Unlock()
}

func TestAuthUIRoutesRespectPasswordResetGate(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	gate := stubFeatureGate{
		flags: map[string]bool{
			"users.password_reset": false,
			"users.signup":         true,
		},
	}
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err = RegisterAuthUIRoutes(r, cfg, routeAuth, WithAuthUIFeatureGate(gate)); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}
	handler := r.getHandlers["/admin/password-reset"]
	if handler == nil {
		t.Fatalf("expected password reset route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	err = handler(ctx)
	if err == nil {
		t.Fatalf("expected password reset disabled error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr.TextCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED error, got %v", err)
	}

	gate.flags["users.password_reset"] = true
	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	var rendered any
	ctx.On("Render", "password_reset", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("password reset handler error: %v", err)
	}
	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %v", rendered)
	}
	if !featureSnapshotFlag(viewCtx["feature_snapshot"], "users.password_reset") {
		t.Fatalf("expected feature snapshot to include users.password_reset true, got %v", viewCtx["feature_snapshot"])
	}
}

func TestAuthUIRoutesRegisterCSRFMiddlewareInRouterChain(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(r, cfg, routeAuth); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}
	if got := r.getMiddlewareCounts["/admin/login"]; got != 1 {
		t.Fatalf("expected login GET to register one middleware, got %d", got)
	}
	if got := r.postMiddlewareCounts["/admin/login"]; got != 1 {
		t.Fatalf("expected login POST to register one middleware, got %d", got)
	}
	if got := r.postMiddlewareCounts["/admin/logout"]; got != 1 {
		t.Fatalf("expected logout POST to register one middleware, got %d", got)
	}
}

func TestAuthUIRoutesAllowLogoutMiddlewareOverride(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	calls := 0
	logoutMiddleware := func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			calls++
			return next(c)
		}
	}

	if err := RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUILogoutMiddleware(logoutMiddleware),
		WithAuthUILogoutGET(true),
	); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	postMiddlewares := r.postMiddlewares["/admin/logout"]
	if len(postMiddlewares) != 1 {
		t.Fatalf("expected logout POST to register override middleware, got %d", len(postMiddlewares))
	}
	if err := postMiddlewares[0](func(router.Context) error { return nil })(router.NewMockContext()); err != nil {
		t.Fatalf("logout POST middleware returned error: %v", err)
	}
	if calls != 1 {
		t.Fatalf("expected logout POST middleware to run once, got %d", calls)
	}
	getMiddlewares := r.getMiddlewares["/admin/logout"]
	if len(getMiddlewares) != 1 {
		t.Fatalf("expected logout GET to register override middleware, got %d", len(getMiddlewares))
	}
	if err := getMiddlewares[0](func(router.Context) error { return nil })(router.NewMockContext()); err != nil {
		t.Fatalf("logout GET middleware returned error: %v", err)
	}
	if calls != 2 {
		t.Fatalf("expected logout GET middleware to run, got %d total calls", calls)
	}
	if got := r.postMiddlewareCounts["/admin/login"]; got != 1 {
		t.Fatalf("expected login POST to keep standalone CSRF middleware, got %d", got)
	}
}

func TestAuthUIRoutesIgnoreTypedNilLogoutAuthenticator(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	var authn *admin.GoAuthAuthenticator
	if err := RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUILogoutAuthenticator(authn),
		WithAuthUILogoutGET(true),
	); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	if got := r.postMiddlewareCounts["/admin/logout"]; got != 1 {
		t.Fatalf("expected logout POST to keep default CSRF middleware, got %d", got)
	}
	if got := r.getMiddlewareCounts["/admin/logout"]; got != 0 {
		t.Fatalf("expected logout GET to keep default compatibility behavior, got %d middlewares", got)
	}
}

func TestAuthUIRoutesLogoutAuthenticatorAcceptsAdminBrowserCSRF(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	authCfg := cookieStubAuthConfig{adminCfg: cfg}
	identity := protectedAppTestIdentity{
		id:       "admin-1",
		username: "admin",
		email:    "admin@example.test",
		role:     string(auth.RoleAdmin),
	}
	auther := auth.NewAuthenticator(protectedAppStubIdentityProvider{identity: identity}, authCfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}
	goAuth := admin.NewGoAuthAuthenticator(routeAuth, authCfg)

	server, ok := router.NewHTTPServer().(*router.HTTPServer)
	if !ok {
		t.Fatalf("expected router.NewHTTPServer to return *router.HTTPServer")
	}
	r := server.Router()
	r.Get("/admin/page", func(c router.Context) error {
		token, ok := c.Locals(csrfmw.DefaultContextKey).(string)
		if !ok {
			t.Fatalf("expected CSRF token local to be a string")
		}
		return c.SendString(token)
	}, goAuth.WrapHandler)

	err = RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUILogoutAuthenticator(goAuth),
		WithAuthUILogoutGET(true),
	)
	if err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	sessionToken, err := auther.TokenService().Generate(identity, nil)
	if err != nil {
		t.Fatalf("generate session token: %v", err)
	}

	getReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "http://example.com/admin/page", nil)
	getReq.Host = "example.com"
	getReq.AddCookie(&http.Cookie{Name: "user", Value: sessionToken})
	getResp := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getResp, getReq)
	if getResp.Code != http.StatusOK {
		t.Fatalf("expected admin page to render, got %d body=%s", getResp.Code, getResp.Body.String())
	}
	csrfToken := strings.TrimSpace(getResp.Body.String())
	if csrfToken == "" {
		t.Fatal("expected admin browser route to emit CSRF token")
	}

	missingReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "http://example.com/admin/logout", nil)
	missingReq.Host = "example.com"
	missingReq.Header.Set("Origin", "http://example.com")
	missingReq.AddCookie(&http.Cookie{Name: "user", Value: sessionToken})
	missingResp := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(missingResp, missingReq)
	if missingResp.Code == http.StatusFound {
		t.Fatalf("expected logout POST without CSRF token to fail, got redirect")
	}

	form := url.Values{}
	form.Set(csrfmw.DefaultFormFieldName, csrfToken)
	postReq := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "http://example.com/admin/logout", strings.NewReader(form.Encode()))
	postReq.Host = "example.com"
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	postReq.Header.Set("Origin", "http://example.com")
	postReq.AddCookie(&http.Cookie{Name: "user", Value: sessionToken})
	postResp := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(postResp, postReq)
	if postResp.Code != http.StatusFound {
		t.Fatalf("expected logout POST with admin CSRF token to redirect, got %d body=%s", postResp.Code, postResp.Body.String())
	}
	if location := postResp.Header().Get("Location"); location != "/admin/login" {
		t.Fatalf("expected logout redirect to /admin/login, got %q", location)
	}

	getLogoutReq := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "http://example.com/admin/logout", nil)
	getLogoutReq.Host = "example.com"
	getLogoutReq.AddCookie(&http.Cookie{Name: "user", Value: sessionToken})
	getLogoutResp := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(getLogoutResp, getLogoutReq)
	if getLogoutResp.Code != http.StatusFound {
		t.Fatalf("expected wrapped logout GET to redirect, got %d body=%s", getLogoutResp.Code, getLogoutResp.Body.String())
	}
}

func TestAuthUIRoutesFailWhenCSRFSecureKeyEntropyUnavailable(t *testing.T) {
	resetAuthUICSRFKeyForTest(t)
	originalRandRead := authUIRandRead
	authUIRandRead = func(_ []byte) (int, error) {
		return 0, errors.New("entropy unavailable")
	}
	t.Cleanup(func() {
		authUIRandRead = originalRandRead
		resetAuthUICSRFKeyForTest(t)
	})

	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	err = RegisterAuthUIRoutes(r, cfg, routeAuth)
	if err == nil {
		t.Fatal("expected csrf secure key generation failure")
	}
	if got := err.Error(); got != "generate auth ui csrf secure key: entropy unavailable" {
		t.Fatalf("unexpected error %q", got)
	}
}

func TestAuthUIRoutesAllowExplicitCSRFSecureKeyWhenEntropyUnavailable(t *testing.T) {
	resetAuthUICSRFKeyForTest(t)
	originalRandRead := authUIRandRead
	authUIRandRead = func(_ []byte) (int, error) {
		return 0, errors.New("entropy unavailable")
	}
	t.Cleanup(func() {
		authUIRandRead = originalRandRead
		resetAuthUICSRFKeyForTest(t)
	})

	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(r, cfg, routeAuth, WithAuthUICSRFSecureKey([]byte("01234567890123456789012345678901"))); err != nil {
		t.Fatalf("register auth routes with explicit csrf key: %v", err)
	}
}

func TestAuthUIRoutesAllowPreviewSecretWhenEntropyUnavailable(t *testing.T) {
	resetAuthUICSRFKeyForTest(t)
	originalRandRead := authUIRandRead
	authUIRandRead = func(_ []byte) (int, error) {
		return 0, errors.New("entropy unavailable")
	}
	t.Cleanup(func() {
		authUIRandRead = originalRandRead
		resetAuthUICSRFKeyForTest(t)
	})

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.PreviewSecret = "preview-secret"
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(r, cfg, routeAuth); err != nil {
		t.Fatalf("register auth routes with preview secret: %v", err)
	}
}

func TestAuthUIRoutesLoginRedirectResolverOverridesStaticRedirect(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUILoginRedirect("/admin"),
		WithAuthUILoginRedirectResolver(func(_ router.Context, fallback string) string {
			if fallback != "/admin" {
				t.Fatalf("unexpected fallback %q", fallback)
			}
			return "https://sim.example.test/workspace"
		}),
	); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	handler := r.postHandlers["/admin/login"]
	if handler == nil {
		t.Fatalf("expected login POST route")
	}

	ctx := router.NewMockContext()
	ctx.On("Bind", mock.AnythingOfType("*quickstart.loginPayload")).Run(func(args mock.Arguments) {
		payload, ok := args.Get(0).(*loginPayload)
		if !ok || payload == nil {
			t.Fatalf("expected loginPayload pointer, got %T", args.Get(0))
		}
		payload.Identifier = "triage.admin"
		payload.Password = "password"
	}).Return(nil)
	ctx.On("Context").Return(context.Background())
	ctx.On("Cookie", mock.AnythingOfType("*router.Cookie")).Return()
	ctx.On("Redirect", "https://sim.example.test/workspace", []int{fiber.StatusFound}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("login handler error: %v", err)
	}

	ctx.AssertExpectations(t)
}

func TestAuthUIRoutesLogoutUsesRouteAuthenticatorCookieTemplate(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(
		auther,
		stubAuthConfig{},
		auth.WithAuthCookieTemplate(router.Cookie{
			Path:     "/",
			Domain:   ".example.test",
			HTTPOnly: true,
			Secure:   true,
			SameSite: router.CookieSameSiteLaxMode,
		}),
	)
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(r, cfg, routeAuth); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	handler := r.postHandlers["/admin/logout"]
	if handler == nil {
		t.Fatalf("expected logout POST route")
	}

	ctx := router.NewMockContext()
	ctx.On("Cookie", mock.MatchedBy(func(c *router.Cookie) bool {
		return c.Name == "user" &&
			c.Value == "" &&
			c.Path == "/" &&
			c.Domain == ".example.test" &&
			c.HTTPOnly &&
			c.Secure &&
			c.SameSite == router.CookieSameSiteLaxMode
	})).Return()
	ctx.On("Redirect", "/admin/login", []int{fiber.StatusFound}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("logout handler error: %v", err)
	}

	ctx.AssertExpectations(t)
}

func TestAuthUIRoutesSupportLegacyLogoutGETAndSeeOtherRedirects(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(
		auther,
		stubAuthConfig{},
		auth.WithAuthCookieTemplate(router.Cookie{
			Path:     "/",
			Domain:   ".example.test",
			HTTPOnly: true,
			Secure:   true,
			SameSite: router.CookieSameSiteLaxMode,
		}),
	)
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUILogoutGET(true),
		WithAuthUILoginRedirectStatus(fiber.StatusSeeOther),
		WithAuthUILogoutRedirectStatus(fiber.StatusSeeOther),
		WithAuthUILogoutRedirect("/admin"),
	); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	loginHandler := r.postHandlers["/admin/login"]
	if loginHandler == nil {
		t.Fatalf("expected login POST route")
	}
	logoutHandler := r.getHandlers["/admin/logout"]
	if logoutHandler == nil {
		t.Fatalf("expected logout GET route")
	}

	loginCtx := router.NewMockContext()
	loginCtx.On("Bind", mock.AnythingOfType("*quickstart.loginPayload")).Run(func(args mock.Arguments) {
		payload, ok := args.Get(0).(*loginPayload)
		if !ok {
			t.Fatalf("expected login payload argument")
		}
		payload.Identifier = "triage.admin"
		payload.Password = "password"
	}).Return(nil)
	loginCtx.On("Context").Return(context.Background())
	loginCtx.On("Cookie", mock.AnythingOfType("*router.Cookie")).Return()
	loginCtx.On("Redirect", "/admin", []int{fiber.StatusSeeOther}).Return(nil)

	if err := loginHandler(loginCtx); err != nil {
		t.Fatalf("login handler error: %v", err)
	}

	logoutCtx := router.NewMockContext()
	logoutCtx.On("Cookie", mock.MatchedBy(func(c *router.Cookie) bool {
		return c.Name == "user" &&
			c.Value == "" &&
			c.Path == "/" &&
			c.Domain == ".example.test" &&
			c.HTTPOnly &&
			c.Secure &&
			c.SameSite == router.CookieSameSiteLaxMode
	})).Return()
	logoutCtx.On("Redirect", "/admin", []int{fiber.StatusSeeOther}).Return(nil)

	if err := logoutHandler(logoutCtx); err != nil {
		t.Fatalf("logout GET handler error: %v", err)
	}

	loginCtx.AssertExpectations(t)
	logoutCtx.AssertExpectations(t)
}

func TestAuthUIRoutesIncludeAdminThemePayload(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.Theme = "archive-admin"
	cfg.ThemeVariant = "light"
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}
	selector, _, err := NewThemeSelector(
		"archive-admin",
		"light",
		map[string]string{"primary": "#c1121f"},
		WithThemeAssets("/admin/assets", map[string]string{
			"logo":    "logo.png",
			"icon":    "icon.png",
			"favicon": "favicon.ico",
		}),
	)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAdminTheme(selector)

	if err := RegisterAuthUIRoutes(r, cfg, routeAuth, WithAuthUIAdminTheme(adm)); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	handler := r.getHandlers["/admin/login"]
	if handler == nil {
		t.Fatalf("expected login GET route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Query", "theme").Return("")
	ctx.On("Query", "variant").Return("")
	var rendered any
	ctx.On("Render", "login", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("login handler error: %v", err)
	}

	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %T", rendered)
	}
	theme, ok := viewCtx["theme"].(map[string]map[string]string)
	if !ok {
		t.Fatalf("expected theme payload, got %T", viewCtx["theme"])
	}
	if got := theme["selection"]["name"]; got != "archive-admin" {
		t.Fatalf("expected theme selection name archive-admin, got %q", got)
	}
	if got := theme["selection"]["variant"]; got != "light" {
		t.Fatalf("expected theme selection variant light, got %q", got)
	}
	if got := theme["tokens"]["primary"]; got != "#c1121f" {
		t.Fatalf("expected theme token primary #c1121f, got %q", got)
	}
	if got := theme["css_vars"]["--primary"]; got != "#c1121f" {
		t.Fatalf("expected theme css var --primary #c1121f, got %q", got)
	}
	if got := theme["assets"]["logo"]; got != "/admin/assets/logo.png" {
		t.Fatalf("expected themed logo asset, got %q", got)
	}
	if got := theme["assets"]["icon"]; got != "/admin/assets/icon.png" {
		t.Fatalf("expected themed icon asset, got %q", got)
	}
}

func TestAuthUIRoutesThemeAssetsRemainSupportedWithoutAdminTheme(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	r := newCaptureRouter()
	auther := auth.NewAuthenticator(stubIdentityProvider{}, stubAuthConfig{})
	routeAuth, err := auth.NewHTTPAuthenticator(auther, stubAuthConfig{})
	if err != nil {
		t.Fatalf("new http authenticator: %v", err)
	}

	if err := RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		WithAuthUIThemeAssets("/admin/assets", map[string]string{"logo": "logo.png", "icon": "icon.png"}),
	); err != nil {
		t.Fatalf("register auth routes: %v", err)
	}

	handler := r.getHandlers["/admin/login"]
	if handler == nil {
		t.Fatalf("expected login GET route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	var rendered any
	ctx.On("Render", "login", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("login handler error: %v", err)
	}

	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %T", rendered)
	}
	theme, ok := viewCtx["theme"].(map[string]map[string]string)
	if !ok {
		t.Fatalf("expected theme payload, got %T", viewCtx["theme"])
	}
	if got := theme["assets"]["logo"]; got != "/admin/assets/logo.png" {
		t.Fatalf("expected asset-only logo path, got %q", got)
	}
	if got := theme["assets"]["icon"]; got != "/admin/assets/icon.png" {
		t.Fatalf("expected asset-only icon path, got %q", got)
	}
}

func TestRegistrationUIRoutesRespectUsersSignupGate(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	gate := stubFeatureGate{
		flags: map[string]bool{
			"users.signup":         false,
			"users.password_reset": true,
		},
	}
	r := newCaptureRouter()

	if err := RegisterRegistrationUIRoutes(r, cfg, WithRegistrationUIFeatureGate(gate)); err != nil {
		t.Fatalf("register registration routes: %v", err)
	}
	handler := r.getHandlers["/admin/register"]
	if handler == nil {
		t.Fatalf("expected register route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	err := handler(ctx)
	if err == nil {
		t.Fatalf("expected registration disabled error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) || typedErr.TextCode != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED error, got %v", err)
	}

	gate.flags["users.signup"] = true
	ctx = router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	var rendered any
	ctx.On("Render", "register", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)
	if err := handler(ctx); err != nil {
		t.Fatalf("register handler error: %v", err)
	}
	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %v", rendered)
	}
	if !featureSnapshotFlag(viewCtx["feature_snapshot"], "users.signup") {
		t.Fatalf("expected feature snapshot to include users.signup true, got %v", viewCtx["feature_snapshot"])
	}
}

func TestRegistrationUIRoutesIncludeAdminThemePayload(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.Theme = "archive-admin"
	cfg.ThemeVariant = "light"
	r := newCaptureRouter()
	selector, _, err := NewThemeSelector(
		"archive-admin",
		"light",
		map[string]string{"primary": "#0f766e"},
		WithThemeAssets("/admin/assets", map[string]string{
			"logo": "logo.png",
			"icon": "icon.png",
		}),
	)
	if err != nil {
		t.Fatalf("new theme selector: %v", err)
	}
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAdminTheme(selector)

	if err := RegisterRegistrationUIRoutes(
		r,
		cfg,
		WithRegistrationUIAdminTheme(adm),
		WithRegistrationUIEnabled(func(admin.Config) bool { return true }),
	); err != nil {
		t.Fatalf("register registration routes: %v", err)
	}

	handler := r.getHandlers["/admin/register"]
	if handler == nil {
		t.Fatalf("expected register route")
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Query", "theme").Return("")
	ctx.On("Query", "variant").Return("")
	var rendered any
	ctx.On("Render", "register", mock.Anything).Run(func(args mock.Arguments) {
		rendered = args.Get(1)
	}).Return(nil)

	if err := handler(ctx); err != nil {
		t.Fatalf("register handler error: %v", err)
	}

	viewCtx, ok := rendered.(router.ViewContext)
	if !ok {
		t.Fatalf("expected view context, got %T", rendered)
	}
	theme, ok := viewCtx["theme"].(map[string]map[string]string)
	if !ok {
		t.Fatalf("expected theme payload, got %T", viewCtx["theme"])
	}
	if got := theme["selection"]["name"]; got != "archive-admin" {
		t.Fatalf("expected theme selection name archive-admin, got %q", got)
	}
	if got := theme["selection"]["variant"]; got != "light" {
		t.Fatalf("expected theme selection variant light, got %q", got)
	}
	if got := theme["assets"]["icon"]; got != "/admin/assets/icon.png" {
		t.Fatalf("expected themed icon asset, got %q", got)
	}
}

func featureSnapshotFlag(snapshot any, key string) bool {
	if key == "" {
		return false
	}
	if typed, ok := snapshot.(map[string]bool); ok {
		return typed[key]
	}
	if typed, ok := snapshot.(map[string]any); ok {
		if value, ok := typed[key].(bool); ok {
			return value
		}
	}
	return false
}
