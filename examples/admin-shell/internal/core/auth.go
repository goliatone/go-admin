package core

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"path"
	"strings"

	"github.com/goliatone/go-admin/examples/admin-shell/internal/config"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	"github.com/goliatone/go-router"
)

// DemoCredential represents a seeded login identity for the app shell.
type DemoCredential struct {
	ID       string
	Username string
	Email    string
	Password string
	Role     string
}

// DemoIdentity is the seeded identity used by the shell.
type DemoIdentity struct {
	id       string
	username string
	email    string
	role     string
}

func (i DemoIdentity) ID() string       { return i.id }
func (i DemoIdentity) Username() string { return i.username }
func (i DemoIdentity) Email() string    { return i.email }
func (i DemoIdentity) Role() string     { return i.role }

type demoIdentityProvider struct {
	credentials []DemoCredential
}

func (p *demoIdentityProvider) VerifyIdentity(ctx context.Context, identifier, password string) (auth.Identity, error) {
	credential, err := p.findCredential(identifier)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(password) != strings.TrimSpace(credential.Password) {
		return nil, auth.ErrMismatchedHashAndPassword
	}
	return identityFromCredential(credential), nil
}

func (p *demoIdentityProvider) FindIdentityByIdentifier(_ context.Context, identifier string) (auth.Identity, error) {
	credential, err := p.findCredential(identifier)
	if err != nil {
		return nil, err
	}
	return identityFromCredential(credential), nil
}

func (p *demoIdentityProvider) findCredential(identifier string) (DemoCredential, error) {
	if p == nil || len(p.credentials) == 0 {
		return DemoCredential{}, auth.ErrIdentityNotFound
	}
	target := strings.ToLower(strings.TrimSpace(identifier))
	if target == "" {
		return DemoCredential{}, auth.ErrIdentityNotFound
	}
	for _, credential := range p.credentials {
		if strings.EqualFold(target, credential.ID) ||
			strings.EqualFold(target, credential.Username) ||
			strings.EqualFold(target, credential.Email) {
			return credential, nil
		}
	}
	return DemoCredential{}, auth.ErrIdentityNotFound
}

type authRuntimeConfig struct {
	signingKey           string
	contextKey           string
	issuer               string
	audience             []string
	rejectedRouteDefault string
}

func (c authRuntimeConfig) GetSigningKey() string         { return c.signingKey }
func (c authRuntimeConfig) GetSigningMethod() string      { return "HS256" }
func (c authRuntimeConfig) GetContextKey() string         { return c.contextKey }
func (c authRuntimeConfig) GetTokenExpiration() int       { return 24 }
func (c authRuntimeConfig) GetExtendedTokenDuration() int { return 72 }
func (c authRuntimeConfig) GetTokenLookup() string {
	// Support both API bearer tokens and cookie-based login sessions.
	return fmt.Sprintf("header:Authorization,cookie:%s", c.GetContextKey())
}
func (c authRuntimeConfig) GetAuthScheme() string           { return "Bearer" }
func (c authRuntimeConfig) GetIssuer() string               { return c.issuer }
func (c authRuntimeConfig) GetAudience() []string           { return c.audience }
func (c authRuntimeConfig) GetRejectedRouteKey() string     { return "admin_shell_reject" }
func (c authRuntimeConfig) GetRejectedRouteDefault() string { return c.rejectedRouteDefault }

func setupAuth(adm *admin.Admin, cfg *config.AppConfig, logger *slog.Logger) (*auth.Auther, *auth.RouteAuthenticator, *admin.GoAuthAuthenticator, []DemoCredential, DemoIdentity, string, string, error) {
	if adm == nil {
		return nil, nil, nil, nil, DemoIdentity{}, "", "", fmt.Errorf("admin instance is required")
	}
	if cfg == nil {
		return nil, nil, nil, nil, DemoIdentity{}, "", "", fmt.Errorf("config is required")
	}

	credentials := seedDemoCredentials(cfg)
	if len(credentials) == 0 {
		return nil, nil, nil, nil, DemoIdentity{}, "", "", fmt.Errorf("no demo credentials configured")
	}
	primaryCredential := resolvePrimaryCredential(credentials)
	demoIdentity := identityFromCredential(primaryCredential)
	provider := &demoIdentityProvider{
		credentials: credentials,
	}

	authCfg := authRuntimeConfig{
		signingKey:           strings.TrimSpace(cfg.Auth.SigningKey),
		contextKey:           "admin_shell_user",
		issuer:               strings.TrimSpace(cfg.Name),
		audience:             []string{"go-admin"},
		rejectedRouteDefault: path.Join(cfg.Admin.BasePath, "login"),
	}
	if authCfg.issuer == "" {
		authCfg.issuer = "go-admin-shell"
	}

	auther := auth.NewAuthenticator(provider, authCfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		return nil, nil, nil, nil, DemoIdentity{}, "", "", err
	}

	loginPath := path.Join(cfg.Admin.BasePath, "login")
	goAuth, _ := quickstart.WithGoAuth(
		adm,
		routeAuth,
		authCfg,
		admin.GoAuthAuthorizerConfig{DefaultResource: "admin"},
		&admin.AuthConfig{
			LoginPath:    loginPath,
			LogoutPath:   path.Join(cfg.Admin.BasePath, "logout"),
			RedirectPath: cfg.Admin.BasePath,
		},
		admin.WithAuthErrorHandler(makeAuthErrorHandler(loginPath)),
	)

	demoToken := ""
	if tokenService := auther.TokenService(); tokenService != nil {
		token, tokenErr := tokenService.Generate(demoIdentity, nil)
		if tokenErr != nil {
			if logger != nil {
				logger.Warn("failed to mint demo token", "error", tokenErr)
			}
		} else {
			demoToken = token
		}
	}

	return auther, routeAuth, goAuth, credentials, demoIdentity, demoToken, authCfg.GetContextKey(), nil
}

func makeAuthErrorHandler(loginPath string) func(router.Context, error) error {
	return func(c router.Context, _ error) error {
		if strings.Contains(c.Path(), "/api/") || strings.Contains(c.Path(), "/crud/") {
			return c.JSON(http.StatusUnauthorized, map[string]any{
				"error": "unauthorized",
			})
		}
		if strings.TrimSpace(loginPath) == "" {
			loginPath = "/login"
		}
		return c.Redirect(loginPath, http.StatusFound)
	}
}

func seedDemoCredentials(cfg *config.AppConfig) []DemoCredential {
	seed := []DemoCredential{
		{Username: "superadmin", Email: "superadmin@example.com", Password: "superadmin.pwd", Role: string(auth.RoleOwner)},
		{Username: "admin", Email: "admin@example.com", Password: "admin.pwd", Role: string(auth.RoleAdmin)},
		{Username: "jane.smith", Email: "jane@example.com", Password: "jane.smith.pwd", Role: string(auth.RoleMember)},
		{Username: "translator", Email: "translator@example.com", Password: "translator.pwd", Role: string(auth.RoleMember)},
		{Username: "john.doe", Email: "john@example.com", Password: "john.doe.pwd", Role: string(auth.RoleMember)},
		{Username: "viewer", Email: "viewer@example.com", Password: "viewer.pwd", Role: string(auth.RoleGuest)},
	}

	// Optional override for the "admin" style demo account via app config.
	if cfg != nil {
		overrideUsername := strings.TrimSpace(cfg.Auth.DemoUsername)
		overrideEmail := strings.TrimSpace(cfg.Auth.DemoEmail)
		overridePassword := strings.TrimSpace(cfg.Auth.DemoPassword)
		if overrideUsername != "" {
			replaced := false
			for i := range seed {
				if strings.EqualFold(seed[i].Username, overrideUsername) {
					if overrideEmail != "" {
						seed[i].Email = overrideEmail
					}
					if overridePassword != "" {
						seed[i].Password = overridePassword
					}
					replaced = true
					break
				}
			}
			if !replaced {
				seed = append(seed, DemoCredential{
					Username: overrideUsername,
					Email:    fallbackString(overrideEmail, overrideUsername+"@example.com"),
					Password: fallbackString(overridePassword, overrideUsername+".pwd"),
					Role:     string(auth.RoleAdmin),
				})
			}
		}
	}

	for i := range seed {
		seed[i].Username = strings.TrimSpace(seed[i].Username)
		seed[i].Email = strings.TrimSpace(seed[i].Email)
		seed[i].Password = strings.TrimSpace(seed[i].Password)
		seed[i].Role = strings.TrimSpace(seed[i].Role)
		if seed[i].Username == "" {
			continue
		}
		if seed[i].ID == "" {
			seed[i].ID = "demo-" + strings.ToLower(seed[i].Username)
		}
		if seed[i].Email == "" {
			seed[i].Email = strings.ToLower(seed[i].Username) + "@example.com"
		}
		if seed[i].Password == "" {
			seed[i].Password = strings.ToLower(seed[i].Username) + ".pwd"
		}
		if seed[i].Role == "" {
			seed[i].Role = string(auth.RoleGuest)
		}
	}

	return seed
}

func resolvePrimaryCredential(credentials []DemoCredential) DemoCredential {
	for _, credential := range credentials {
		if strings.EqualFold(strings.TrimSpace(credential.Username), "admin") {
			return credential
		}
	}
	return credentials[0]
}

func identityFromCredential(credential DemoCredential) DemoIdentity {
	return DemoIdentity{
		id:       strings.TrimSpace(credential.ID),
		username: strings.TrimSpace(credential.Username),
		email:    strings.TrimSpace(credential.Email),
		role:     strings.TrimSpace(credential.Role),
	}
}

func fallbackString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value != "" {
		return value
	}
	return strings.TrimSpace(fallback)
}
