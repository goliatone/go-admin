package setup

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

// SetupAuth wires go-auth middleware and authorizer with the admin orchestrator.
// It returns the admin authenticator adapter, the underlying RouteAuthenticator,
// the Auther, and the context key used for the auth cookie.
func SetupAuth(adm *admin.Admin, dataStores *stores.DataStores) (*admin.GoAuthAuthenticator, *auth.RouteAuthenticator, *auth.Auther, string) {
	cfg := demoAuthConfig{signingKey: "web-demo-secret"}
	provider := &demoIdentityProvider{users: dataStores.Users}

	auther := auth.NewAuthenticator(provider, cfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		log.Fatalf("failed to initialize go-auth HTTP authenticator: %v", err)
	}

	goAuth := admin.NewGoAuthAuthenticator(
		routeAuth,
		cfg,
		admin.WithAuthErrorHandler(makeAuthErrorHandler(cfg)),
	)

	adm.WithAuth(goAuth, &admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	})
	adm.WithAuthorizer(admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{
		DefaultResource: "admin",
	}))

	logDemoTokens(context.Background(), auther.TokenService(), provider)

	return goAuth, routeAuth, auther, cfg.GetContextKey()
}

type demoIdentityProvider struct {
	users *stores.UserStore
}

func (p *demoIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	identity, err := p.lookup(ctx, identifier)
	if err != nil {
		return nil, err
	}

	expected := fmt.Sprintf("%s.pwd", identity.Username())
	if strings.TrimSpace(password) != expected {
		return nil, auth.ErrMismatchedHashAndPassword
	}

	return identity, nil
}

func (p *demoIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	return p.lookup(ctx, identifier)
}

func (p *demoIdentityProvider) lookup(ctx context.Context, identifier string) (auth.Identity, error) {
	if p == nil || p.users == nil {
		log.Printf("DEBUG: demoIdentityProvider.lookup - provider or users is nil")
		return nil, auth.ErrIdentityNotFound
	}
	records, _, err := p.users.List(ctx, admin.ListOptions{PerPage: 50})
	if err != nil {
		log.Printf("DEBUG: demoIdentityProvider.lookup - error listing users: %v", err)
		return nil, err
	}
	target := strings.ToLower(strings.TrimSpace(identifier))
	log.Printf("DEBUG: demoIdentityProvider.lookup - searching for identifier: %q among %d users", target, len(records))
	for _, rec := range records {
		id := strings.ToLower(toString(rec["id"]))
		username := strings.ToLower(toString(rec["username"]))
		email := strings.ToLower(toString(rec["email"]))
		log.Printf("DEBUG: comparing target=%q with id=%q, username=%q, email=%q", target, id, username, email)
		if target != "" && target != id && target != username && target != email {
			continue
		}
		log.Printf("DEBUG: found matching user: %s", username)
		return p.identityFromRecord(rec), nil
	}
	log.Printf("DEBUG: demoIdentityProvider.lookup - no matching user found for: %q", target)
	return nil, auth.ErrIdentityNotFound
}

func (p *demoIdentityProvider) identities(ctx context.Context) []auth.Identity {
	if p == nil || p.users == nil {
		return nil
	}
	records, _, err := p.users.List(ctx, admin.ListOptions{PerPage: 50})
	if err != nil {
		return nil
	}
	out := make([]auth.Identity, 0, len(records))
	for _, rec := range records {
		out = append(out, p.identityFromRecord(rec))
	}
	return out
}

func (p *demoIdentityProvider) identityFromRecord(rec map[string]any) auth.Identity {
	return userIdentity{
		id:       toString(rec["id"]),
		username: toString(rec["username"]),
		email:    toString(rec["email"]),
		role:     string(mapToAuthRole(toString(rec["role"]))),
	}
}

type userIdentity struct {
	id       string
	username string
	email    string
	role     string
}

func (i userIdentity) ID() string       { return i.id }
func (i userIdentity) Username() string { return i.username }
func (i userIdentity) Email() string    { return i.email }
func (i userIdentity) Role() string     { return i.role }

type demoAuthConfig struct {
	signingKey string
}

func (d demoAuthConfig) GetSigningKey() string         { return d.signingKey }
func (d demoAuthConfig) GetSigningMethod() string      { return "HS256" }
func (d demoAuthConfig) GetContextKey() string         { return "admin_user" }
func (d demoAuthConfig) GetTokenExpiration() int       { return 72 }
func (d demoAuthConfig) GetExtendedTokenDuration() int { return 168 }
func (d demoAuthConfig) GetTokenLookup() string {
	// Accept both Authorization header and the login-set cookie for convenience.
	return fmt.Sprintf("header:Authorization,cookie:%s", d.GetContextKey())
}
func (d demoAuthConfig) GetAuthScheme() string           { return "Bearer" }
func (d demoAuthConfig) GetIssuer() string               { return "go-admin-web" }
func (d demoAuthConfig) GetAudience() []string           { return []string{"go-admin"} }
func (d demoAuthConfig) GetRejectedRouteKey() string     { return "admin_reject" }
func (d demoAuthConfig) GetRejectedRouteDefault() string { return "/admin/login" }

func mapToAuthRole(role string) auth.UserRole {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin":
		return auth.RoleAdmin
	case "editor":
		return auth.RoleMember
	default:
		return auth.RoleGuest
	}
}

func logDemoTokens(ctx context.Context, ts auth.TokenService, provider *demoIdentityProvider) {
	if ts == nil || provider == nil {
		return
	}
	identities := provider.identities(ctx)
	if len(identities) == 0 {
		return
	}
	log.Println("demo Authorization tokens (use Authorization: Bearer <token>):")
	for _, identity := range identities {
		token, err := ts.Generate(identity, nil)
		if err != nil {
			log.Printf("  - %s token error: %v", identity.Username(), err)
			continue
		}
		log.Printf("  - %s (%s): %s", identity.Username(), identity.Role(), token)
	}
}

func toString(val any) string {
	if val == nil {
		return ""
	}
	switch v := val.(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}

func makeAuthErrorHandler(cfg demoAuthConfig) func(router.Context, error) error {
	return func(c router.Context, err error) error {
		lowerMsg := strings.ToLower(err.Error())

		mapped := goerrors.MapToError(err, goerrors.DefaultErrorMappers())

		// Normalize missing/malformed token to 401
		if mapped == nil ||
			strings.Contains(lowerMsg, "missing or malformed jwt") ||
			strings.Contains(lowerMsg, "missing or malformed token") {
			mapped = goerrors.New("missing or malformed token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("MISSING_TOKEN")
		}

		if mapped == nil {
			mapped = goerrors.New("unauthorized", goerrors.CategoryAuth).WithCode(goerrors.CodeUnauthorized)
		}

		status := mapped.Code
		if status == 0 {
			status = goerrors.CodeUnauthorized
		}

		// API routes: return JSON so fetch requests don’t turn into template errors
		if strings.Contains(c.Path(), "/api/") {
			c.Status(status)
			return c.JSON(status, mapped.ToErrorResponse(false, nil))
		}

		// HTML routes: redirect to the configured login path
		loginPath := cfg.GetRejectedRouteDefault()
		if strings.TrimSpace(loginPath) == "" {
			loginPath = "/login"
		}
		return c.Redirect(loginPath, http.StatusFound)
	}
}
