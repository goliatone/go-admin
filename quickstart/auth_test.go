package quickstart

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"unsafe"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

type stubAuthConfig struct{}

func (stubAuthConfig) GetSigningKey() string         { return "secret" }
func (stubAuthConfig) GetSigningMethod() string      { return "HS256" }
func (stubAuthConfig) GetContextKey() string         { return "user" }
func (stubAuthConfig) GetTokenExpiration() int       { return 24 }
func (stubAuthConfig) GetExtendedTokenDuration() int { return 48 }
func (stubAuthConfig) GetTokenLookup() string        { return "header:Authorization" }
func (stubAuthConfig) GetAuthScheme() string         { return "Bearer" }
func (stubAuthConfig) GetIssuer() string             { return "quickstart-tests" }
func (stubAuthConfig) GetAudience() []string         { return []string{"quickstart"} }
func (stubAuthConfig) GetRejectedRouteKey() string   { return "redirect" }
func (stubAuthConfig) GetRejectedRouteDefault() string {
	return "/"
}

type stubAuther struct{}

func (stubAuther) Login(ctx context.Context, identifier, password string) (string, error) {
	_, _, _ = ctx, identifier, password
	return "", nil
}
func (stubAuther) Impersonate(ctx context.Context, identifier string) (string, error) {
	_, _ = ctx, identifier
	return "", nil
}
func (stubAuther) SessionFromToken(token string) (auth.Session, error) {
	_ = token
	return nil, nil
}
func (stubAuther) IdentityFromSession(ctx context.Context, session auth.Session) (auth.Identity, error) {
	_, _ = ctx, session
	return nil, nil
}
func (stubAuther) TokenService() auth.TokenService { return nil }

func TestWithGoAuthWiresAdapters(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	routeAuth, err := auth.NewHTTPAuthenticator(stubAuther{}, stubAuthConfig{})
	if err != nil {
		t.Fatalf("NewHTTPAuthenticator error: %v", err)
	}
	authCfg := &admin.AuthConfig{
		LoginPath:    "/login",
		LogoutPath:   "/logout",
		RedirectPath: "/admin",
	}

	authn, authz := WithGoAuth(adm, routeAuth, stubAuthConfig{}, admin.GoAuthAuthorizerConfig{DefaultResource: "admin"}, authCfg)
	if authn == nil {
		t.Fatalf("expected authenticator")
	}
	if authz == nil {
		t.Fatalf("expected authorizer")
	}
	if got := getAuthConfig(adm); got != authCfg {
		t.Fatalf("expected auth config set, got %#v", got)
	}
}

func TestWithProtectedAppAuthBuildsProtectedSurfaceAuthenticator(t *testing.T) {
	cfg := stubAuthConfigWithAdmin{
		stubAuthConfig: stubAuthConfig{},
		adminCfg: admin.Config{
			BasePath: "/admin",
			Routing: routing.Config{
				ProtectedAppEnabled: true,
				Roots: routing.RootsConfig{
					ProtectedAppRoot:    "/app",
					ProtectedAppAPIRoot: "/app/api",
				},
			},
		},
	}
	routeAuth, err := auth.NewHTTPAuthenticator(stubAuther{}, cfg)
	if err != nil {
		t.Fatalf("NewHTTPAuthenticator error: %v", err)
	}

	authn := WithProtectedAppAuth(routeAuth, cfg)
	if authn == nil {
		t.Fatalf("expected protected app authenticator")
	}
}

func TestWithProtectedAppAuthBuildsSessionUserFromProtectedRouteContext(t *testing.T) {
	cfg := cookieStubAuthConfig{
		stubAuthConfig: stubAuthConfig{},
		adminCfg: admin.Config{
			BasePath: "/admin",
			Routing: routing.Config{
				ProtectedAppEnabled: true,
				Roots: routing.RootsConfig{
					ProtectedAppRoot:    "/app",
					ProtectedAppAPIRoot: "/app/api",
				},
			},
		},
	}
	provider := protectedAppStubIdentityProvider{identity: protectedAppTestIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		t.Fatalf("NewHTTPAuthenticator error: %v", err)
	}
	authn := WithProtectedAppAuth(routeAuth, cfg)
	if authn == nil {
		t.Fatalf("expected protected app authenticator")
	}

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Get("/app/profile", authn.WrapHandler(func(c router.Context) error {
		session := BuildSessionUser(c.Context())
		if !session.IsAuthenticated {
			t.Fatalf("expected protected-app session to be authenticated")
		}
		if session.ID != "user-123" {
			t.Fatalf("expected protected-app session id user-123, got %q", session.ID)
		}
		if session.Role != string(auth.RoleAdmin) {
			t.Fatalf("expected protected-app session role %q, got %q", auth.RoleAdmin, session.Role)
		}
		return c.JSON(http.StatusOK, map[string]any{
			"id":   session.ID,
			"role": session.Role,
		})
	}))

	req := httptest.NewRequest(http.MethodGet, "http://example.com/app/profile", nil)
	req.AddCookie(&http.Cookie{Name: cfg.GetContextKey(), Value: token})
	res := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected protected app browser route status 200, got %d body=%s", res.Code, res.Body.String())
	}
	body := strings.TrimSpace(res.Body.String())
	if !strings.Contains(body, `"id":"user-123"`) {
		t.Fatalf("expected protected-app session payload to include user id, got %s", body)
	}
	if !strings.Contains(body, `"role":"admin"`) {
		t.Fatalf("expected protected-app session payload to include role, got %s", body)
	}
}

type stubAuthConfigWithAdmin struct {
	stubAuthConfig
	adminCfg admin.Config
}

func (s stubAuthConfigWithAdmin) AdminConfig() admin.Config {
	return s.adminCfg
}

type cookieStubAuthConfig struct {
	stubAuthConfig
	adminCfg admin.Config
}

func (c cookieStubAuthConfig) GetTokenLookup() string {
	return "header:Authorization,cookie:user"
}

func (c cookieStubAuthConfig) AdminConfig() admin.Config {
	return c.adminCfg
}

type protectedAppStubIdentityProvider struct {
	identity auth.Identity
}

func (s protectedAppStubIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	_, _, _ = ctx, identifier, password
	if s.identity == nil {
		return nil, auth.ErrIdentityNotFound
	}
	return s.identity, nil
}

func (s protectedAppStubIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	return s.VerifyIdentity(ctx, identifier, "")
}

type protectedAppTestIdentity struct {
	id       string
	username string
	email    string
	role     string
}

func (i protectedAppTestIdentity) ID() string       { return i.id }
func (i protectedAppTestIdentity) Username() string { return i.username }
func (i protectedAppTestIdentity) Email() string    { return i.email }
func (i protectedAppTestIdentity) Role() string     { return i.role }

func getAuthConfig(adm *admin.Admin) *admin.AuthConfig {
	if adm == nil {
		return nil
	}
	v := reflect.ValueOf(adm).Elem()
	cfg := v.FieldByName("config")
	if !cfg.IsValid() {
		return nil
	}
	authCfg := cfg.FieldByName("AuthConfig")
	if !authCfg.IsValid() {
		return nil
	}
	authCfg = reflect.NewAt(authCfg.Type(), unsafe.Pointer(authCfg.UnsafeAddr())).Elem()
	out, _ := authCfg.Interface().(*admin.AuthConfig)
	return out
}
