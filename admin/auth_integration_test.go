package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin/routing"
	auth "github.com/goliatone/go-auth"
	csrfmw "github.com/goliatone/go-auth/middleware/csrf"
	router "github.com/goliatone/go-router"
)

func TestGoAuthAuthenticatorWrapHandlerInjectsActor(t *testing.T) {
	cfg := testAuthConfig{signingKey: "test-secret"}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	tokenService := auther.TokenService()
	authenticator := NewGoAuthAuthenticator(routeAuth, cfg, WithAuthErrorHandler(func(c router.Context, err error) error {
		raw := strings.TrimSpace(c.Header("Authorization"))
		raw = strings.TrimPrefix(raw, "Bearer ")
		if claims, valErr := tokenService.Validate(raw); valErr == nil {
			ctxWithClaims := auth.WithClaimsContext(c.Context(), claims)
			if actor := auth.ActorContextFromClaims(claims); actor != nil {
				ctxWithClaims = auth.WithActorContext(ctxWithClaims, actor)
			}
			c.SetContext(ctxWithClaims)
			return c.Next()
		}
		return err
	}))
	token, err := tokenService.Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/protected", authenticator.WrapHandler(func(c router.Context) error {
		actor, ok := auth.ActorFromRouterContext(c)
		if !ok || actor == nil {
			t.Fatalf("expected actor on context")
		}
		if actor.ActorID != "user-123" {
			t.Fatalf("expected actor id user-123, got %s", actor.ActorID)
		}
		return c.JSON(200, map[string]string{"status": "ok"})
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("expected 200 from protected route, got %d", res.Code)
	}
}

func TestGoAuthAuthorizerMapsPermissions(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
		Resources: map[string]string{
			"settings":            string(auth.RoleMember),
			"admin.notifications": string(auth.RoleAdmin),
			"jobs":                string(auth.RoleAdmin),
			"users":               string(auth.RoleAdmin),
		},
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{DefaultResource: "admin"})

	if !authz.Can(ctx, "admin.settings.view", "") {
		t.Fatalf("expected settings view to be allowed via resource roles")
	}
	if authz.Can(ctx, "admin.settings.delete", "settings") {
		t.Fatalf("expected delete to be denied for member role")
	}
	if !authz.Can(ctx, "admin.notifications.update", "") {
		t.Fatalf("expected notifications update to map to edit and be allowed")
	}
	if !authz.Can(ctx, "admin.jobs.trigger", "jobs") {
		t.Fatalf("expected jobs trigger to map to edit and be allowed")
	}
	if !authz.Can(ctx, "admin.users.import", "users") {
		t.Fatalf("expected users import to map to create and be allowed")
	}
}

func TestGoAuthAuthorizerAllowsCustomPermissionFromResolver(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{"admin.translations.export"}, nil
		},
	})

	if !authz.Can(ctx, "admin.translations.export", "translations") {
		t.Fatalf("expected export permission from resolver to be allowed")
	}
}

func TestGoAuthAuthorizerResolvedPermissionsUsesRequestCache(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = WithResolvedPermissionsCache(ctx)
	resolveCalls := 0
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			resolveCalls++
			return []string{"admin.translations.export"}, nil
		},
	})

	if !authz.Can(ctx, "admin.translations.export", "translations") {
		t.Fatalf("expected first custom permission check to be allowed")
	}
	if !authz.Can(ctx, "admin.translations.export", "translations") {
		t.Fatalf("expected second custom permission check to be allowed")
	}
	if resolveCalls != 1 {
		t.Fatalf("expected resolver to run once with request cache, got %d", resolveCalls)
	}
}

func TestGoAuthAuthorizerWarnsWhenResolverMissingForCustomPermissions(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	logger := &captureAdminLogger{}
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		Logger:          logger,
	})

	if authz.Can(ctx, "admin.translations.export", "translations") {
		t.Fatalf("expected export permission to be denied without resolver")
	}
	if authz.Can(ctx, "admin.translations.assign", "translations") {
		t.Fatalf("expected assign permission to be denied without resolver")
	}
	if got := logger.count("warn", "auth permission resolver not configured; custom permissions will be denied"); got != 1 {
		t.Fatalf("expected one startup warning, got %d", got)
	}
	if got := logger.count("warn", "auth custom permission check without resolver; denying"); got != 1 {
		t.Fatalf("expected one runtime warning, got %d", got)
	}
}

func TestGoAuthAuthorizerStrictModePanicsWithoutResolver(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatalf("expected constructor panic in strict resolver mode")
		}
	}()
	_ = NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		StrictResolver:  true,
	})
}

func TestGoAuthAuthorizerBatchChecks(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{
				"admin.translations.export",
				"admin.translations.assign",
			}, nil
		},
	})
	if !authz.CanAll(ctx, "translations", "admin.translations.export", "admin.translations.assign") {
		t.Fatalf("expected CanAll to allow when all permissions exist")
	}
	if authz.CanAll(ctx, "translations", "admin.translations.export", "admin.translations.approve") {
		t.Fatalf("expected CanAll to deny when one permission is missing")
	}
	if !authz.CanAny(ctx, "translations", "admin.translations.approve", "admin.translations.assign") {
		t.Fatalf("expected CanAny to allow when one permission exists")
	}
}

func TestGoAuthAuthorizerBatchChecksIgnoreEmptyPermissions(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{"admin.translations.export"}, nil
		},
	})
	if authz.CanAny(ctx, "translations", "", " ", "\t") {
		t.Fatalf("expected CanAny to deny when only empty permissions are provided")
	}
	if !authz.CanAny(ctx, "translations", "", "admin.translations.export", " ") {
		t.Fatalf("expected CanAny to ignore empties and allow valid permission")
	}
	if !authz.CanAll(ctx, "translations", "", " ", "\t") {
		t.Fatalf("expected CanAll to treat empty permission set as vacuously true")
	}
}

func TestGoAuthAuthorizerResolverMetrics(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	ctx = WithResolvedPermissionsCache(ctx)
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return []string{"admin.translations.export"}, nil
		},
	})
	_ = authz.Can(ctx, "admin.translations.export", "translations")
	_ = authz.Can(ctx, "admin.translations.export", "translations")
	metrics := authz.PermissionResolverMetrics()
	if metrics.Calls < 2 {
		t.Fatalf("expected at least two resolver calls, got %+v", metrics)
	}
	if metrics.ResolverRuns != 1 {
		t.Fatalf("expected one resolver run with request cache, got %+v", metrics)
	}
	if metrics.CacheHits == 0 {
		t.Fatalf("expected cache hit metrics, got %+v", metrics)
	}
}

func TestGoAuthAuthenticatorWrapHandlerSeedsResolvedPermissionsCache(t *testing.T) {
	cfg := testAuthConfig{signingKey: "test-secret"}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	tokenService := auther.TokenService()
	authenticator := NewGoAuthAuthenticator(routeAuth, cfg, WithAuthErrorHandler(func(c router.Context, err error) error {
		raw := strings.TrimSpace(c.Header("Authorization"))
		raw = strings.TrimPrefix(raw, "Bearer ")
		if claims, valErr := tokenService.Validate(raw); valErr == nil {
			ctxWithClaims := auth.WithClaimsContext(c.Context(), claims)
			if actor := auth.ActorContextFromClaims(claims); actor != nil {
				ctxWithClaims = auth.WithActorContext(ctxWithClaims, actor)
			}
			c.SetContext(ctxWithClaims)
			return c.Next()
		}
		return err
	}))
	resolveCalls := 0
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			resolveCalls++
			return []string{"admin.translations.export"}, nil
		},
	})
	token, err := tokenService.Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/cached", authenticator.WrapHandler(func(c router.Context) error {
		if !authz.Can(c.Context(), "admin.translations.export", "translations") {
			t.Fatalf("expected export permission to be allowed")
		}
		if !authz.Can(c.Context(), "admin.translations.export", "translations") {
			t.Fatalf("expected repeated export permission check to be allowed")
		}
		return c.JSON(200, map[string]string{"status": "ok"})
	}))

	req := httptest.NewRequest("GET", "/cached", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatalf("expected 200 from protected route, got %d", res.Code)
	}
	if resolveCalls != 1 {
		t.Fatalf("expected resolver to run once per request context, got %d", resolveCalls)
	}
}

func TestGoAuthAuthenticatorSplitsBrowserAndAPIRoutes(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret"}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	authenticator := NewGoAuthAuthenticator(routeAuth, cfg)

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/admin/preferences", authenticator.WrapHandler(func(c router.Context) error {
		token, _ := c.Locals(csrfmw.DefaultContextKey).(string)
		if strings.TrimSpace(token) == "" {
			t.Fatalf("expected csrf token in browser route context")
		}
		return c.SendString(token)
	}))
	server.Router().Post("/admin/preferences", authenticator.WrapHandler(func(c router.Context) error {
		return c.SendStatus(http.StatusOK)
	}))
	server.Router().Post("/admin/api/dashboard/config", authenticator.WrapHandler(func(c router.Context) error {
		return c.SendStatus(http.StatusOK)
	}))

	browserReq := httptest.NewRequest(http.MethodGet, "http://example.com/admin/preferences", nil)
	browserReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	browserRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(browserRes, browserReq)
	if browserRes.Code != http.StatusOK {
		t.Fatalf("expected browser route status 200, got %d", browserRes.Code)
	}
	browserToken := strings.TrimSpace(browserRes.Body.String())
	if browserToken == "" {
		t.Fatalf("expected browser route to render csrf token")
	}
	if headerToken := strings.TrimSpace(browserRes.Header().Get(csrfmw.DefaultHeaderName)); headerToken == "" {
		t.Fatalf("expected browser route to emit %s header", csrfmw.DefaultHeaderName)
	} else if headerToken != browserToken {
		t.Fatalf("expected browser route header token to match rendered token")
	}

	browserPostReq := httptest.NewRequest(http.MethodPost, "http://example.com/admin/preferences", strings.NewReader("theme=dark"))
	browserPostReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	browserPostReq.Header.Set("Origin", "http://example.com")
	browserPostReq.Header.Set(csrfmw.DefaultHeaderName, browserToken)
	browserPostReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	browserPostRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(browserPostRes, browserPostReq)
	if browserPostRes.Code != http.StatusOK {
		t.Fatalf("expected browser post status 200, got %d body=%s", browserPostRes.Code, browserPostRes.Body.String())
	}

	apiReq := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/dashboard/config", strings.NewReader(`{}`))
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Origin", "http://example.com")
	apiReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	apiRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(apiRes, apiReq)
	if apiRes.Code != http.StatusBadRequest {
		t.Fatalf("expected api route without csrf status 400, got %d body=%s", apiRes.Code, apiRes.Body.String())
	}
	apiErrPayload := map[string]any{}
	if err := json.Unmarshal(apiRes.Body.Bytes(), &apiErrPayload); err != nil {
		t.Fatalf("decode api csrf error: %v", err)
	}
	apiErrBody, ok := apiErrPayload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected api error body, got %#v", apiErrPayload)
	}
	if got := strings.TrimSpace(toString(apiErrBody["text_code"])); got != TextCodeAdminCSRFInvalid {
		t.Fatalf("expected api csrf error text_code %q, got %q", TextCodeAdminCSRFInvalid, got)
	}

	apiPostReq := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/dashboard/config", strings.NewReader(`{}`))
	apiPostReq.Header.Set("Content-Type", "application/json")
	apiPostReq.Header.Set("Origin", "http://example.com")
	apiPostReq.Header.Set(csrfmw.DefaultHeaderName, browserToken)
	apiPostReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	apiPostRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(apiPostRes, apiPostReq)
	if apiPostRes.Code != http.StatusOK {
		t.Fatalf("expected api route with csrf status 200, got %d body=%s", apiPostRes.Code, apiPostRes.Body.String())
	}

	bearerReq := httptest.NewRequest(http.MethodPost, "http://example.com/admin/api/dashboard/config", strings.NewReader(`{}`))
	bearerReq.Header.Set("Content-Type", "application/json")
	bearerReq.Header.Set("Authorization", "Bearer "+token)
	bearerRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(bearerRes, bearerReq)
	if bearerRes.Code != http.StatusOK {
		t.Fatalf("expected bearer api route status 200, got %d body=%s", bearerRes.Code, bearerRes.Body.String())
	}
}

func TestGoAuthAuthenticatorUsesConfiguredAdminAPIRoot(t *testing.T) {
	cfg := cookieTestAuthConfig{
		signingKey: "test-secret",
		adminCfg: Config{
			BasePath: "/admin",
			Routing: routing.Config{
				Roots: routing.RootsConfig{
					AdminRoot: "/admin",
					APIRoot:   "/admin/internal/v2",
				},
			},
		},
	}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	authenticator := NewGoAuthAuthenticator(routeAuth, cfg)

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/admin/preferences", authenticator.WrapHandler(func(c router.Context) error {
		token, _ := c.Locals(csrfmw.DefaultContextKey).(string)
		if strings.TrimSpace(token) == "" {
			t.Fatalf("expected csrf token in browser route context")
		}
		return c.SendString(token)
	}))
	server.Router().Post("/admin/internal/v2/dashboard/config", authenticator.WrapHandler(func(c router.Context) error {
		return c.SendStatus(http.StatusOK)
	}))

	tokenReq := httptest.NewRequest(http.MethodGet, "http://example.com/admin/preferences", nil)
	tokenReq.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	tokenRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(tokenRes, tokenReq)
	if tokenRes.Code != http.StatusOK {
		t.Fatalf("expected browser token route status 200, got %d body=%s", tokenRes.Code, tokenRes.Body.String())
	}
	csrfToken := strings.TrimSpace(tokenRes.Body.String())
	if csrfToken == "" {
		t.Fatalf("expected csrf token from browser route")
	}

	req := httptest.NewRequest(http.MethodPost, "http://example.com/admin/internal/v2/dashboard/config", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "http://example.com")
	req.Header.Set(csrfmw.DefaultHeaderName, csrfToken)
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected configured admin api route status 200, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestGoAuthAuthenticatorWrapHandlerRendersBrowserHTML(t *testing.T) {
	cfg := cookieTestAuthConfig{signingKey: "test-secret"}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	authenticator := NewGoAuthAuthenticator(routeAuth, cfg)

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/admin/activity", authenticator.WrapHandler(func(c router.Context) error {
		token, _ := c.Locals(csrfmw.DefaultContextKey).(string)
		if strings.TrimSpace(token) == "" {
			t.Fatalf("expected csrf token in browser route context")
		}
		c.Set("Content-Type", "text/html; charset=utf-8")
		return c.SendString("<!doctype html><html><body><main>activity-page</main></body></html>")
	}))

	req := httptest.NewRequest(http.MethodGet, "http://example.com/admin/activity", nil)
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected browser html route status 200, got %d body=%s", res.Code, res.Body.String())
	}
	body := res.Body.String()
	if !strings.Contains(strings.ToLower(body), "<html") {
		t.Fatalf("expected browser html route to render html, got %q", body)
	}
	if !strings.Contains(body, "activity-page") {
		t.Fatalf("expected browser html route body to include page content, got %q", body)
	}
	if headerToken := strings.TrimSpace(res.Header().Get(csrfmw.DefaultHeaderName)); headerToken == "" {
		t.Fatalf("expected browser html route to emit %s header", csrfmw.DefaultHeaderName)
	}
}

func TestGoAuthAuthorizerDebugLogging(t *testing.T) {
	claims := &auth.JWTClaims{
		UID:      "actor-1",
		UserRole: string(auth.RoleAdmin),
	}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	debugLogger := &captureAdminLogger{}
	authz := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		Debug:           true,
		Logger:          debugLogger,
	})
	_ = authz.Can(ctx, "admin.settings.view", "")
	if got := debugLogger.count("debug", "auth decision"); got == 0 {
		t.Fatalf("expected debug logger to be called when debug enabled")
	}

	offLogger := &captureAdminLogger{}
	authzOff := NewGoAuthAuthorizer(GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		Debug:           false,
		Logger:          offLogger,
	})
	_ = authzOff.Can(ctx, "admin.settings.view", "")
	if got := offLogger.count("debug", "auth decision"); got != 0 {
		t.Fatalf("expected no debug logging when debug disabled")
	}
}

func TestJobsAndNotificationsRoutesRequirePermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureJobs, FeatureCommands, FeatureNotifications)})
	adm.WithAuthorizer(denyAllAuthz{})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	jobReq := httptest.NewRequest("GET", "/admin/api/jobs", nil)
	jobRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(jobRes, jobReq)
	if jobRes.Code != 403 {
		t.Fatalf("expected jobs route to enforce permissions, got %d", jobRes.Code)
	}

	payload := `{"ids":["n1"],"read":true}`
	notifReq := httptest.NewRequest("POST", "/admin/api/notifications/read", strings.NewReader(payload))
	notifReq.Header.Set("Content-Type", "application/json")
	notifRes := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(notifRes, notifReq)
	if notifRes.Code != 403 {
		t.Fatalf("expected notifications mark route to enforce permissions, got %d", notifRes.Code)
	}
}

type testAuthConfig struct {
	signingKey string
}

func (t testAuthConfig) GetSigningKey() string         { return t.signingKey }
func (t testAuthConfig) GetSigningMethod() string      { return "HS256" }
func (t testAuthConfig) GetContextKey() string         { return "user" }
func (t testAuthConfig) GetTokenExpiration() int       { return 24 }
func (t testAuthConfig) GetExtendedTokenDuration() int { return 24 }
func (t testAuthConfig) GetTokenLookup() string        { return "header:Authorization" }
func (t testAuthConfig) GetAuthScheme() string         { return "Bearer" }
func (t testAuthConfig) GetIssuer() string             { return "go-admin-tests" }
func (t testAuthConfig) GetAudience() []string         { return []string{"go-admin"} }
func (t testAuthConfig) GetRejectedRouteKey() string   { return "redirect" }
func (t testAuthConfig) GetRejectedRouteDefault() string {
	return "/login"
}

type cookieTestAuthConfig struct {
	signingKey string
	adminCfg   Config
}

func (t cookieTestAuthConfig) GetSigningKey() string         { return t.signingKey }
func (t cookieTestAuthConfig) GetSigningMethod() string      { return "HS256" }
func (t cookieTestAuthConfig) GetContextKey() string         { return "user" }
func (t cookieTestAuthConfig) GetTokenExpiration() int       { return 24 }
func (t cookieTestAuthConfig) GetExtendedTokenDuration() int { return 24 }
func (t cookieTestAuthConfig) GetTokenLookup() string        { return "header:Authorization,cookie:user" }
func (t cookieTestAuthConfig) GetAuthScheme() string         { return "Bearer" }
func (t cookieTestAuthConfig) GetIssuer() string             { return "go-admin-tests" }
func (t cookieTestAuthConfig) GetAudience() []string         { return []string{"go-admin"} }
func (t cookieTestAuthConfig) GetRejectedRouteKey() string   { return "redirect" }
func (t cookieTestAuthConfig) GetRejectedRouteDefault() string {
	return "/login"
}
func (t cookieTestAuthConfig) AdminConfig() Config { return t.adminCfg }

type stubIdentityProvider struct {
	identity auth.Identity
}

func (s *stubIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	if s.identity == nil {
		return nil, auth.ErrIdentityNotFound
	}
	return s.identity, nil
}

func (s *stubIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	return s.VerifyIdentity(ctx, identifier, "")
}

type testIdentity struct {
	id       string
	username string
	email    string
	role     string
}

func (i testIdentity) ID() string       { return i.id }
func (i testIdentity) Username() string { return i.username }
func (i testIdentity) Email() string    { return i.email }
func (i testIdentity) Role() string     { return i.role }

type denyAllAuthz struct{}

func (denyAllAuthz) Can(ctx context.Context, action string, resource string) bool {
	return false
}
