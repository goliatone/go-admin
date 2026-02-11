package main

import (
	"context"
	"embed"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

const (
	defaultESignDemoAdminID       = "63eb32ab-64f5-4ddf-b5a0-5f9a8db9f8ea"
	defaultESignDemoAdminEmail    = "admin@example.com"
	defaultESignDemoAdminPassword = "admin.pwd"
	defaultESignDemoAdminRole     = "admin"
	defaultESignAuthSigningKey    = "esign-demo-secret"
	defaultESignAuthContextKey    = "esign_admin_user"
)

var (
	eSignDemoResourceRoles = map[string]string{
		"admin":                  string(auth.RoleAdmin),
		"admin.activity":         string(auth.RoleAdmin),
		"admin.content":          string(auth.RoleAdmin),
		"admin.dashboard":        string(auth.RoleAdmin),
		"admin.esign":            string(auth.RoleAdmin),
		"admin.esign_agreements": string(auth.RoleAdmin),
		"admin.esign_documents":  string(auth.RoleAdmin),
		"admin.notifications":    string(auth.RoleAdmin),
		"admin.settings":         string(auth.RoleAdmin),
	}
	eSignDemoPermissions = []string{
		permissions.AdminESignView,
		permissions.AdminESignCreate,
		permissions.AdminESignEdit,
		permissions.AdminESignSend,
		permissions.AdminESignVoid,
		permissions.AdminESignDownload,
		permissions.AdminESignSettings,
		"admin.activity.view",
		"admin.content.view",
		"admin.dashboard.view",
		"admin.notifications.view",
		"admin.settings.view",
	}
)

//go:embed templates/**
var eSignTemplatesFS embed.FS

type eSignDemoIdentity struct {
	id       string
	email    string
	role     string
	password string
}

func (i eSignDemoIdentity) ID() string       { return i.id }
func (i eSignDemoIdentity) Username() string { return i.email }
func (i eSignDemoIdentity) Email() string    { return i.email }
func (i eSignDemoIdentity) Role() string     { return i.role }

type eSignDemoIdentityProvider struct {
	identity    eSignDemoIdentity
	permissions []string
	roles       map[string]string
}

func newESignDemoIdentityProvider(identity eSignDemoIdentity) *eSignDemoIdentityProvider {
	return &eSignDemoIdentityProvider{
		identity:    identity,
		permissions: dedupePermissionList(eSignDemoPermissions),
		roles:       cloneResourceRoles(eSignDemoResourceRoles),
	}
}

func (p *eSignDemoIdentityProvider) VerifyIdentity(_ context.Context, identifier, password string) (auth.Identity, error) {
	if p == nil {
		return nil, auth.ErrIdentityNotFound
	}
	if !p.matches(identifier) {
		return nil, auth.ErrIdentityNotFound
	}
	if strings.TrimSpace(password) != p.identity.password {
		return nil, auth.ErrMismatchedHashAndPassword
	}
	return p.identity, nil
}

func (p *eSignDemoIdentityProvider) FindIdentityByIdentifier(_ context.Context, identifier string) (auth.Identity, error) {
	if p == nil || !p.matches(identifier) {
		return nil, auth.ErrIdentityNotFound
	}
	return p.identity, nil
}

func (p *eSignDemoIdentityProvider) FindResourceRoles(_ context.Context, identity auth.Identity) (map[string]string, error) {
	if p == nil || identity == nil {
		return map[string]string{}, nil
	}
	return cloneResourceRoles(p.roles), nil
}

func (p *eSignDemoIdentityProvider) matches(identifier string) bool {
	identifier = strings.ToLower(strings.TrimSpace(identifier))
	if identifier == "" {
		return false
	}
	if identifier == strings.ToLower(strings.TrimSpace(p.identity.id)) {
		return true
	}
	email := strings.ToLower(strings.TrimSpace(p.identity.email))
	return identifier == email
}

type eSignAuthConfig struct {
	basePath   string
	signingKey string
	contextKey string
}

func (c eSignAuthConfig) GetSigningKey() string         { return c.signingKey }
func (c eSignAuthConfig) GetSigningMethod() string      { return "HS256" }
func (c eSignAuthConfig) GetContextKey() string         { return c.contextKey }
func (c eSignAuthConfig) GetTokenExpiration() int       { return 72 }
func (c eSignAuthConfig) GetExtendedTokenDuration() int { return 168 }
func (c eSignAuthConfig) GetTokenLookup() string {
	return fmt.Sprintf("header:Authorization,cookie:%s", c.contextKey)
}
func (c eSignAuthConfig) GetAuthScheme() string       { return "Bearer" }
func (c eSignAuthConfig) GetIssuer() string           { return "go-admin-esign" }
func (c eSignAuthConfig) GetAudience() []string       { return []string{"go-admin"} }
func (c eSignAuthConfig) GetRejectedRouteKey() string { return "admin_reject" }
func (c eSignAuthConfig) GetRejectedRouteDefault() string {
	basePath := strings.TrimSpace(c.basePath)
	if basePath == "" {
		basePath = "/admin"
	}
	return path.Join(basePath, "login")
}

func configureESignAuth(adm *coreadmin.Admin, cfg coreadmin.Config) (*coreadmin.GoAuthAuthenticator, *auth.Auther, string, error) {
	if adm == nil {
		return nil, nil, "", fmt.Errorf("admin is required")
	}

	basePath := strings.TrimSpace(cfg.BasePath)
	if basePath == "" {
		basePath = "/admin"
	}
	identity := eSignDemoIdentity{
		id:       firstNonEmptyEnv("ESIGN_ADMIN_ID", defaultESignDemoAdminID),
		email:    firstNonEmptyEnv("ESIGN_ADMIN_EMAIL", defaultESignDemoAdminEmail),
		role:     firstNonEmptyEnv("ESIGN_ADMIN_ROLE", defaultESignDemoAdminRole),
		password: firstNonEmptyEnv("ESIGN_ADMIN_PASSWORD", defaultESignDemoAdminPassword),
	}
	authCfg := eSignAuthConfig{
		basePath:   basePath,
		signingKey: firstNonEmptyEnv("ESIGN_AUTH_SIGNING_KEY", defaultESignAuthSigningKey),
		contextKey: firstNonEmptyEnv("ESIGN_AUTH_CONTEXT_KEY", defaultESignAuthContextKey),
	}

	provider := newESignDemoIdentityProvider(identity)
	auther := auth.NewAuthenticator(provider, authCfg)
	auther.WithResourceRoleProvider(provider).
		WithClaimsDecorator(auth.ClaimsDecoratorFunc(func(_ context.Context, identity auth.Identity, claims *auth.JWTClaims) error {
			if identity == nil || claims == nil {
				return nil
			}
			if claims.Metadata == nil {
				claims.Metadata = map[string]any{}
			}
			claims.Metadata["email"] = identity.Email()
			claims.Metadata["role"] = identity.Role()
			claims.Metadata["permissions"] = append([]string{}, provider.permissions...)
			return nil
		}))
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		return nil, nil, "", err
	}

	authn := coreadmin.NewGoAuthAuthenticator(
		routeAuth,
		authCfg,
		coreadmin.WithAuthErrorHandler(makeESignAuthErrorHandler(authCfg)),
	)
	adm.WithAuth(authn, &coreadmin.AuthConfig{
		LoginPath:    path.Join(basePath, "login"),
		LogoutPath:   path.Join(basePath, "logout"),
		RedirectPath: basePath,
	})
	adm.WithAuthorizer(coreadmin.NewGoAuthAuthorizer(coreadmin.GoAuthAuthorizerConfig{
		DefaultResource: "admin",
	}))
	return authn, auther, authCfg.GetContextKey(), nil
}

func makeESignAuthErrorHandler(cfg eSignAuthConfig) func(router.Context, error) error {
	return func(c router.Context, err error) error {
		if c == nil {
			return err
		}
		if err == nil {
			err = goerrors.New("unauthorized", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized)
		}
		lowerMsg := strings.ToLower(strings.TrimSpace(err.Error()))
		presenter := coreadmin.DefaultErrorPresenter()
		mapped, _ := presenter.Present(err)
		if mapped == nil ||
			strings.Contains(lowerMsg, "missing or malformed jwt") ||
			strings.Contains(lowerMsg, "missing or malformed token") {
			mapped = goerrors.New("missing or malformed token", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized).
				WithTextCode("MISSING_TOKEN")
		}
		if mapped == nil {
			mapped = goerrors.New("unauthorized", goerrors.CategoryAuth).
				WithCode(goerrors.CodeUnauthorized)
		}
		mapped = coreadmin.AttachErrorContext(err, mapped)
		if mapped.Timestamp.IsZero() {
			mapped.Timestamp = time.Now()
		}

		status := mapped.Code
		if status == 0 {
			status = goerrors.CodeUnauthorized
		}
		if strings.Contains(c.Path(), "/api/") || strings.Contains(c.Path(), "/crud/") {
			c.Status(status)
			return c.JSON(status, mapped.ToErrorResponse(presenter.IncludeStackTrace(), mapped.StackTrace))
		}
		loginPath := strings.TrimSpace(cfg.GetRejectedRouteDefault())
		if loginPath == "" {
			loginPath = "/admin/login"
		}
		return c.Redirect(loginPath, http.StatusFound)
	}
}

func applyESignRuntimeDefaults(cfg *coreadmin.Config) {
	if cfg == nil {
		return
	}
	if cfg.Debug.LayoutMode == "" {
		cfg.Debug.LayoutMode = coreadmin.DebugLayoutAdmin
	}
}

func newESignViewEngine(cfg coreadmin.Config, adm *coreadmin.Admin) (fiber.Views, error) {
	templateOpts := []quickstart.TemplateFuncOption{
		quickstart.WithTemplateBasePath(cfg.BasePath),
	}
	if adm != nil {
		templateOpts = append(templateOpts,
			quickstart.WithTemplateURLResolver(adm.URLs()),
			quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
		)
	}
	return quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(templateOpts...)),
		quickstart.WithViewTemplatesFS(eSignTemplatesFS),
	)
}

func registerESignWebRoutes(
	r router.Router[*fiber.App],
	cfg coreadmin.Config,
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	auther *auth.Auther,
	cookieName string,
	routes handlers.RouteSet,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}
	if adm == nil {
		return fmt.Errorf("admin is required")
	}
	if authn == nil {
		return fmt.Errorf("authenticator is required")
	}
	if auther == nil {
		return fmt.Errorf("auther is required")
	}
	basePath := strings.TrimSpace(adm.BasePath())
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.BasePath)
	}
	if basePath == "" {
		basePath = "/admin"
	}

	r.Get("/", func(c router.Context) error {
		return c.Redirect(basePath, http.StatusFound)
	})

	if err := quickstart.RegisterAdminUIRoutes(r, cfg, adm, authn); err != nil {
		return err
	}
	if err := quickstart.RegisterSettingsUIRoutes(r, cfg, adm, authn); err != nil {
		return err
	}
	if err := quickstart.RegisterContentEntryUIRoutes(r, cfg, adm, authn); err != nil {
		return err
	}
	registerESignLegacyUIAliasRoutes(r, authn, basePath)
	if err := quickstart.RegisterAuthUIRoutes(
		r,
		cfg,
		auther,
		cookieName,
		quickstart.WithAuthUITitles("Login", "Password Reset"),
		quickstart.WithAuthUITemplates("login-esign", "password_reset"),
		quickstart.WithAuthUIFeatureGate(adm.FeatureGate()),
	); err != nil {
		return err
	}
	if err := quickstart.RegisterRegistrationUIRoutes(
		r,
		cfg,
		quickstart.WithRegistrationUIFeatureGate(adm.FeatureGate()),
	); err != nil {
		return err
	}

	landingPath := strings.TrimSpace(routes.AdminHome)
	if landingPath == "" {
		landingPath = path.Join(basePath, "esign")
	}
	apiBasePath := strings.TrimSpace(adm.AdminAPIBasePath())
	if err := quickstart.RegisterAdminPageRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.AdminPageSpec{
			Path:       landingPath,
			Template:   "esign-admin/landing",
			Title:      "E-Sign",
			Active:     "esign",
			Feature:    "esign",
			Permission: permissions.AdminESignView,
			BuildContext: func(_ router.Context) (router.ViewContext, error) {
				return router.ViewContext{
					"api_base_path": apiBasePath,
					"stats": map[string]int{
						"draft":           0,
						"pending":         0,
						"completed":       0,
						"action_required": 0,
					},
					"recent_agreements": []map[string]any{},
				}, nil
			},
		},
	); err != nil {
		return err
	}

	return nil
}

func registerESignLegacyUIAliasRoutes(
	r router.Router[*fiber.App],
	authn coreadmin.HandlerAuthenticator,
	basePath string,
) {
	if r == nil {
		return
	}
	wrap := func(handler router.HandlerFunc) router.HandlerFunc {
		if authn != nil {
			return authn.WrapHandler(handler)
		}
		return handler
	}

	aliases := map[string]string{
		path.Join(basePath, "esign", "agreements"):        path.Join(basePath, "content", "esign_agreements"),
		path.Join(basePath, "esign", "agreements", "new"): path.Join(basePath, "content", "esign_agreements", "new"),
		path.Join(basePath, "esign", "documents"):         path.Join(basePath, "content", "esign_documents"),
		path.Join(basePath, "esign", "documents", "new"):  path.Join(basePath, "content", "esign_documents", "new"),
		path.Join(basePath, "esign", "users"):             path.Join(basePath, "users"),
		path.Join(basePath, "esign", "roles"):             path.Join(basePath, "roles"),
		path.Join(basePath, "esign", "profile"):           path.Join(basePath, "profile"),
		path.Join(basePath, "esign", "activity"):          path.Join(basePath, "activity"),
	}

	for fromPath, toPath := range aliases {
		fromPath := fromPath
		toPath := toPath
		handler := wrap(func(c router.Context) error {
			return redirectPathAlias(c, fromPath, toPath)
		})
		r.Get(fromPath, handler)
		r.Get(fromPath+"/*path", handler)
	}
}

func redirectPathAlias(c router.Context, fromPath, toPath string) error {
	if c == nil {
		return coreadmin.ErrNotFound
	}
	target := strings.TrimSpace(toPath)
	if target == "" {
		return coreadmin.ErrNotFound
	}
	suffix := strings.TrimPrefix(c.Path(), strings.TrimSpace(fromPath))
	if suffix != "" && !strings.HasPrefix(suffix, "/") {
		suffix = "/" + suffix
	}
	if suffix != "" {
		target += suffix
	}
	if rawQuery := rawQueryFromURL(c.OriginalURL()); rawQuery != "" {
		if strings.Contains(target, "?") {
			target += "&" + rawQuery
		} else {
			target += "?" + rawQuery
		}
	}
	return c.Redirect(target, http.StatusFound)
}

func rawQueryFromURL(raw string) string {
	if raw == "" {
		return ""
	}
	if parsed, err := url.Parse(raw); err == nil {
		return parsed.RawQuery
	}
	if idx := strings.Index(raw, "?"); idx >= 0 && idx+1 < len(raw) {
		return raw[idx+1:]
	}
	return ""
}

func cloneResourceRoles(input map[string]string) map[string]string {
	out := map[string]string{}
	for key, value := range input {
		trimmedKey := strings.TrimSpace(key)
		trimmedValue := strings.TrimSpace(value)
		if trimmedKey == "" || trimmedValue == "" {
			continue
		}
		out[trimmedKey] = trimmedValue
	}
	return out
}

func dedupePermissionList(input []string) []string {
	if len(input) == 0 {
		return nil
	}
	seen := map[string]string{}
	for _, item := range input {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		lower := strings.ToLower(trimmed)
		if _, ok := seen[lower]; ok {
			continue
		}
		seen[lower] = trimmed
	}
	out := make([]string, 0, len(seen))
	for _, value := range seen {
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func firstNonEmptyEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return strings.TrimSpace(fallback)
}
