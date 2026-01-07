package quickstart

import (
	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
)

// WithGoAuth wires go-auth adapters into the admin instance.
func WithGoAuth(adm *admin.Admin, routeAuth *auth.RouteAuthenticator, cfg auth.Config, authz admin.GoAuthAuthorizerConfig, authCfg *admin.AuthConfig, opts ...admin.GoAuthAuthenticatorOption) (*admin.GoAuthAuthenticator, *admin.GoAuthAuthorizer) {
	if adm == nil {
		return nil, nil
	}
	authenticator := admin.NewGoAuthAuthenticator(routeAuth, cfg, opts...)
	adm.WithAuth(authenticator, authCfg)
	authorizer := admin.NewGoAuthAuthorizer(authz)
	adm.WithAuthorizer(authorizer)
	return authenticator, authorizer
}
