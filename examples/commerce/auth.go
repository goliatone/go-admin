package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/commerce/stores"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
)

func setupAuth(adm *admin.Admin, dataStores *stores.CommerceStores) map[string]string {
	cfg := commerceAuthConfig{signingKey: "commerce-demo-secret"}
	provider := &commerceIdentityProvider{users: dataStores.Users}

	auther := auth.NewAuthenticator(provider, cfg)
	tokenService := auther.TokenService()
	routeAuth, err := auth.NewHTTPAuthenticator(auther, cfg)
	if err != nil {
		log.Fatalf("failed to initialize go-auth HTTP authenticator: %v", err)
	}

	authenticator := admin.NewGoAuthAuthenticator(routeAuth, cfg, admin.WithAuthErrorHandler(func(c router.Context, err error) error {
		raw := strings.TrimSpace(c.Header("Authorization"))
		raw = strings.TrimPrefix(raw, "Bearer ")
		if raw != "" {
			if claims, valErr := tokenService.Validate(raw); valErr == nil {
				ctxWithClaims := auth.WithClaimsContext(c.Context(), claims)
				if actor := auth.ActorContextFromClaims(claims); actor != nil {
					ctxWithClaims = auth.WithActorContext(ctxWithClaims, actor)
				}
				c.SetContext(ctxWithClaims)
				return c.Next()
			} else {
				log.Printf("commerce auth validation failed: %v", valErr)
			}
		}
		return err
	}))

	adm.WithAuth(authenticator, &admin.AuthConfig{
		LoginPath:    "/admin/login",
		LogoutPath:   "/admin/logout",
		RedirectPath: "/admin",
	})
	adm.WithAuthorizer(admin.NewGoAuthAuthorizer(admin.GoAuthAuthorizerConfig{
		DefaultResource: "admin",
	}))

	tokens := generateCommerceTokens(context.Background(), auther.TokenService(), provider)
	logDemoCommerceTokens(tokens)
	return tokens
}

type commerceIdentityProvider struct {
	users *admin.MemoryRepository
}

func (p *commerceIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	return p.lookup(ctx, identifier)
}

func (p *commerceIdentityProvider) FindIdentityByIdentifier(ctx context.Context, identifier string) (auth.Identity, error) {
	return p.lookup(ctx, identifier)
}

func (p *commerceIdentityProvider) lookup(ctx context.Context, identifier string) (auth.Identity, error) {
	if p == nil || p.users == nil {
		return nil, auth.ErrIdentityNotFound
	}
	records, _, err := p.users.List(ctx, admin.ListOptions{PerPage: 50})
	if err != nil {
		return nil, err
	}
	target := strings.ToLower(strings.TrimSpace(identifier))
	for _, rec := range records {
		name := strings.ToLower(toString(rec["name"]))
		email := strings.ToLower(toString(rec["email"]))
		if target != "" && target != name && target != email {
			continue
		}
		return commerceIdentity{
			id:    toString(rec["id"]),
			name:  toString(rec["name"]),
			email: toString(rec["email"]),
			role:  string(auth.RoleAdmin),
		}, nil
	}
	return nil, auth.ErrIdentityNotFound
}

type commerceIdentity struct {
	id    string
	name  string
	email string
	role  string
}

func (i commerceIdentity) ID() string       { return i.id }
func (i commerceIdentity) Username() string { return i.name }
func (i commerceIdentity) Email() string    { return i.email }
func (i commerceIdentity) Role() string     { return i.role }

type commerceAuthConfig struct {
	signingKey string
}

func (c commerceAuthConfig) GetSigningKey() string           { return c.signingKey }
func (c commerceAuthConfig) GetSigningMethod() string        { return "HS256" }
func (c commerceAuthConfig) GetContextKey() string           { return "commerce_user" }
func (c commerceAuthConfig) GetTokenExpiration() int         { return 72 }
func (c commerceAuthConfig) GetExtendedTokenDuration() int   { return 168 }
func (c commerceAuthConfig) GetTokenLookup() string          { return "header:Authorization" }
func (c commerceAuthConfig) GetAuthScheme() string           { return "Bearer" }
func (c commerceAuthConfig) GetIssuer() string               { return "go-admin-commerce" }
func (c commerceAuthConfig) GetAudience() []string           { return []string{"go-admin"} }
func (c commerceAuthConfig) GetRejectedRouteKey() string     { return "commerce_reject" }
func (c commerceAuthConfig) GetRejectedRouteDefault() string { return "/admin/login" }

func logDemoCommerceTokens(tokens map[string]string) {
	if len(tokens) == 0 {
		return
	}
	log.Println("commerce demo tokens (Authorization: Bearer <token>):")
	for user, token := range tokens {
		log.Printf("  - %s: %s", user, token)
	}
}

func generateCommerceTokens(ctx context.Context, ts auth.TokenService, provider *commerceIdentityProvider) map[string]string {
	out := map[string]string{}
	if ts == nil || provider == nil || provider.users == nil {
		return out
	}
	records, _, err := provider.users.List(ctx, admin.ListOptions{PerPage: 50})
	if err != nil {
		return out
	}
	for _, rec := range records {
		identity := commerceIdentity{
			id:    toString(rec["id"]),
			name:  toString(rec["name"]),
			email: toString(rec["email"]),
			role:  string(auth.RoleAdmin),
		}
		token, err := ts.Generate(identity, nil)
		if err != nil {
			continue
		}
		out[identity.Username()] = token
	}
	return out
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
