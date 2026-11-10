package rpccontract

import (
	"context"
	auth "github.com/goliatone/go-auth"
)

type authConfig struct{ key string }

func (c authConfig) GetSigningKey() string       { return c.key }
func (authConfig) GetSigningMethod() string      { return "HS256" }
func (authConfig) GetContextKey() string         { return "user" }
func (authConfig) GetTokenExpiration() int       { return 24 }
func (authConfig) GetExtendedTokenDuration() int { return 48 }
func (authConfig) GetTokenLookup() string        { return "header:Authorization" }
func (authConfig) GetAuthScheme() string         { return "Bearer" }
func (authConfig) GetIssuer() string             { return "quickstart-tests" }
func (authConfig) GetAudience() []string         { return []string{"quickstart"} }
func (authConfig) GetRejectedRouteKey() string   { return "redirect" }
func (authConfig) GetRejectedRouteDefault() string {
	return "/"
}

type identity string

func (i identity) ID() string              { return string(i) }
func (i identity) Username() string        { return string(i) }
func (i identity) Email() string           { return string(i) + "@example.invalid" }
func (i identity) Role() string            { return "member" }
func (i identity) Status() auth.UserStatus { return auth.UserStatusActive }

type identityProvider struct{}

func (identityProvider) VerifyIdentity(context.Context, string, string) (auth.Identity, error) {
	return nil, auth.ErrIdentityNotFound
}
func (identityProvider) FindIdentityByIdentifier(_ context.Context, id string) (auth.Identity, error) {
	if id == "operator" || id == "denied" {
		return identity(id), nil
	}
	return nil, auth.ErrIdentityNotFound
}

type policy struct{}

func (policy) Can(ctx context.Context, action, resource string) bool {
	actor, ok := auth.ActorFromContext(ctx)
	return ok && actor != nil && actor.ActorID == "operator"
}
func (policy) ResolvedPermissions(ctx context.Context) []string {
	if !(policy{}).Can(ctx, "", "") {
		return nil
	}
	return []string{"admin.commands.dispatch", "resources.write"}
}
