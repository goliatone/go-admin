package quickstart

import (
	"context"
	"reflect"
	"testing"
	"unsafe"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
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
