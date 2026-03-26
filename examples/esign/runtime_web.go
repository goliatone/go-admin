package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"net/url"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/internal/primitives"
	"github.com/goliatone/go-admin/internal/templateview"
	"github.com/goliatone/go-admin/pkg/client"
	syncdata "github.com/goliatone/go-admin/pkg/go-sync/data"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-masker"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-router/eventstream"
	"github.com/goliatone/go-router/ssefiber"
	"github.com/goliatone/go-uploader"
	urlkit "github.com/goliatone/go-urlkit"
)

const (
	defaultESignDemoAdminID       = "63eb32ab-64f5-4ddf-b5a0-5f9a8db9f8ea"
	defaultESignDemoAdminEmail    = "admin@example.com"
	defaultESignDemoAdminPassword = "admin.pwd"
	defaultESignDemoAdminRole     = "admin"
	defaultESignAuthSigningKey    = "esign-demo-secret"
	defaultESignAuthContextKey    = "esign_admin_user"
	esignUploadFormField          = "file"
	signerFlowModeUnified         = "unified"
	publicSignBasePath            = "/sign"
	publicReviewBasePath          = "/review"
)

var (
	eSignDemoResourceRoles = map[string]string{
		"admin":                  string(auth.RoleAdmin),
		"admin.activity":         string(auth.RoleAdmin),
		"admin.content":          string(auth.RoleAdmin),
		"admin.dashboard":        string(auth.RoleAdmin),
		"esign":                  string(auth.RoleAdmin),
		"admin.esign":            string(auth.RoleAdmin),
		"admin.esign_agreements": string(auth.RoleAdmin),
		"admin.esign_documents":  string(auth.RoleAdmin),
		"services":               string(auth.RoleAdmin),
		"admin.services":         string(auth.RoleAdmin),
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
		permissions.AdminESignReminders,
		"admin.services.view",
		"admin.services.connect",
		"admin.services.edit",
		"admin.services.revoke",
		"admin.services.reconsent",
		"admin.services.activity.view",
		"admin.services.webhooks",
		"admin.activity.view",
		"admin.content.view",
		"admin.dashboard.view",
		"admin.notifications.view",
		"admin.settings.view",
	}
	allowedESignUploadMimeTypes = map[string]bool{
		"application/pdf": true,
	}
	allowedESignUploadExtensions = map[string]bool{
		".pdf": true,
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
func (i eSignDemoIdentity) String() string {
	return fmt.Sprintf(
		"eSignDemoIdentity{id:%q,email:%q,role:%q,password:%q}",
		strings.TrimSpace(i.id),
		strings.TrimSpace(i.email),
		strings.TrimSpace(i.role),
		i.maskedPassword(),
	)
}
func (i eSignDemoIdentity) GoString() string {
	return i.String()
}

func (i eSignDemoIdentity) maskedPassword() string {
	raw := strings.TrimSpace(i.password)
	if raw == "" {
		return ""
	}
	masked, err := masker.Default.String("filled32", raw)
	if err != nil {
		return "********************************"
	}
	return strings.TrimSpace(masked)
}

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
	adminCfg   coreadmin.Config
}

type eSignAuthBundle struct {
	Authenticator      *coreadmin.GoAuthAuthenticator
	RouteAuthenticator *auth.RouteAuthenticator
	Authorizer         coreadmin.Authorizer
	Auther             *auth.Auther
	CookieName         string
	AdminConfig        coreadmin.AuthConfig
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
func (c eSignAuthConfig) AdminConfig() coreadmin.Config {
	return c.adminCfg
}
func (c eSignAuthConfig) GetRejectedRouteDefault() string {
	basePath := strings.TrimSpace(c.basePath)
	if basePath == "" {
		basePath = "/admin"
	}
	return path.Join(basePath, "login")
}

type eSignAuthSeedFile struct {
	Auth appcfg.AuthConfig `json:"auth"`
}

func resolveESignAuthSeedPath(seedPath, configPath string) string {
	seedPath = strings.TrimSpace(seedPath)
	if seedPath == "" {
		return ""
	}
	if filepath.IsAbs(seedPath) {
		return filepath.Clean(seedPath)
	}
	configPath = strings.TrimSpace(configPath)
	if configPath != "" {
		baseDir := filepath.Dir(configPath)
		if strings.TrimSpace(baseDir) != "" {
			return filepath.Clean(filepath.Join(baseDir, seedPath))
		}
	}
	return filepath.Clean(seedPath)
}

func hasAuthSeed(config appcfg.AuthConfig) bool {
	return strings.TrimSpace(config.AdminID) != "" ||
		strings.TrimSpace(config.AdminEmail) != "" ||
		strings.TrimSpace(config.AdminRole) != "" ||
		strings.TrimSpace(config.AdminPassword) != "" ||
		strings.TrimSpace(config.SigningKey) != "" ||
		strings.TrimSpace(config.ContextKey) != ""
}

func loadESignAuthSeed(runtimeCfg appcfg.Config) (appcfg.AuthConfig, error) {
	seedPath := resolveESignAuthSeedPath(runtimeCfg.Auth.SeedFile, runtimeCfg.ConfigPath)
	if seedPath == "" {
		return appcfg.AuthConfig{}, nil
	}
	payload, err := primitives.ReadTrustedFile(seedPath)
	if err != nil {
		return appcfg.AuthConfig{}, fmt.Errorf("read auth seed file %q: %w", seedPath, err)
	}
	seed := eSignAuthSeedFile{}
	if err := json.Unmarshal(payload, &seed); err != nil {
		return appcfg.AuthConfig{}, fmt.Errorf("decode auth seed file %q: %w", seedPath, err)
	}
	if hasAuthSeed(seed.Auth) {
		return seed.Auth, nil
	}
	flatAuth := appcfg.AuthConfig{}
	if err := json.Unmarshal(payload, &flatAuth); err != nil {
		return appcfg.AuthConfig{}, fmt.Errorf("decode auth seed file auth payload %q: %w", seedPath, err)
	}
	return flatAuth, nil
}

func newESignAuthBundle(cfg coreadmin.Config) (eSignAuthBundle, error) {
	basePath := strings.TrimSpace(cfg.BasePath)
	if basePath == "" {
		basePath = "/admin"
	}
	runtimeCfg := appcfg.Active()
	seedAuth, err := loadESignAuthSeed(runtimeCfg)
	if err != nil {
		return eSignAuthBundle{}, err
	}
	identity := eSignDemoIdentity{
		id: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.AdminID),
			strings.TrimSpace(seedAuth.AdminID),
			defaultESignDemoAdminID,
		),
		email: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.AdminEmail),
			strings.TrimSpace(seedAuth.AdminEmail),
			defaultESignDemoAdminEmail,
		),
		role: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.AdminRole),
			strings.TrimSpace(seedAuth.AdminRole),
			defaultESignDemoAdminRole,
		),
		password: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.AdminPassword),
			strings.TrimSpace(seedAuth.AdminPassword),
			defaultESignDemoAdminPassword,
		),
	}
	authCfg := eSignAuthConfig{
		basePath: basePath,
		adminCfg: coreadmin.Config{BasePath: basePath},
		signingKey: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.SigningKey),
			strings.TrimSpace(seedAuth.SigningKey),
			defaultESignAuthSigningKey,
		),
		contextKey: firstNonEmptyValue(
			strings.TrimSpace(runtimeCfg.Auth.ContextKey),
			strings.TrimSpace(seedAuth.ContextKey),
			defaultESignAuthContextKey,
		),
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
			return nil
		}))
	routeAuth, err := auth.NewHTTPAuthenticator(
		auther,
		authCfg,
		auth.WithAuthCookieTemplate(router.FirstPartySessionCookie("", "")),
		auth.WithRedirectCookieTemplate(router.Cookie{Path: "/", HTTPOnly: true, SameSite: router.CookieSameSiteLaxMode}),
	)
	if err != nil {
		return eSignAuthBundle{}, err
	}

	authn := coreadmin.NewGoAuthAuthenticator(
		routeAuth,
		authCfg,
		coreadmin.WithAuthErrorHandler(makeESignAuthErrorHandler(authCfg)),
	)
	adminAuthCfg := coreadmin.AuthConfig{
		LoginPath:    path.Join(basePath, "login"),
		LogoutPath:   path.Join(basePath, "logout"),
		RedirectPath: basePath,
	}
	authorizer := coreadmin.NewGoAuthAuthorizer(coreadmin.GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(context.Context) ([]string, error) {
			return append([]string{}, provider.permissions...), nil
		},
	})
	return eSignAuthBundle{
		Authenticator:      authn,
		RouteAuthenticator: routeAuth,
		Authorizer:         authorizer,
		Auther:             auther,
		CookieName:         authCfg.GetContextKey(),
		AdminConfig:        adminAuthCfg,
	}, nil
}

func (b eSignAuthBundle) Apply(adm *coreadmin.Admin) error {
	if adm == nil {
		return fmt.Errorf("admin is required")
	}
	adm.WithAuth(b.Authenticator, &b.AdminConfig)
	adm.WithAuthorizer(b.Authorizer)
	return nil
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
	quickstart.WithRequestTrustPolicy(appcfg.ActiveRequestTrustPolicy())(cfg)
	if cfg.Debug.LayoutMode == "" {
		cfg.Debug.LayoutMode = coreadmin.DebugLayoutAdmin
	}
	defaultLabels := map[string]string{
		"cms.widget_instance.save":       "Saved widget",
		"cms.widget_instance.delete":     "Deleted widget",
		"cms.widget_definition.register": "Registered widget definition",
		"cms.widget_definition.delete":   "Deleted widget definition",
		"dashboard.layout.save":          "Saved dashboard layout",
	}
	if cfg.ActivityActionLabels == nil {
		cfg.ActivityActionLabels = map[string]string{}
	}
	for key, value := range defaultLabels {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := cfg.ActivityActionLabels[key]; exists {
			continue
		}
		cfg.ActivityActionLabels[key] = value
	}
}

func configureESignContentPanelRoutes(adm *coreadmin.Admin, basePath string) error {
	if adm == nil {
		return nil
	}
	manager, ok := adm.URLs().(*urlkit.RouteManager)
	if !ok || manager == nil {
		return nil
	}
	basePath = normalizeESignBasePath(basePath)
	_, _, err := manager.AddRoutes("admin", map[string]string{
		"esign_documents":     path.Join(basePath, "content", "documents"),
		"esign_documents.id":  path.Join(basePath, "content", "documents", ":id"),
		"esign_agreements":    path.Join(basePath, "content", "agreements"),
		"esign_agreements.id": path.Join(basePath, "content", "agreements", ":id"),
	})
	return err
}

func newESignViewEngine(cfg coreadmin.Config, adm *coreadmin.Admin) (fiber.Views, error) {
	if err := validateESignTemplateOwnership(); err != nil {
		return nil, err
	}
	if err := validateESignRuntimeAssetContracts(); err != nil {
		return nil, err
	}
	templateOpts := eSignTemplateFuncOptions(cfg, adm)
	return quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewTemplateFuncs(quickstart.DefaultTemplateFuncs(templateOpts...)),
		quickstart.WithViewTemplatesFS(eSignTemplatesFS),
		quickstart.WithViewDebug(cfg.Debug.Enabled),
	)
}

func eSignTemplateFuncOptions(cfg coreadmin.Config, adm *coreadmin.Admin) []quickstart.TemplateFuncOption {
	templateOpts := []quickstart.TemplateFuncOption{
		quickstart.WithTemplateBasePath(cfg.BasePath),
	}
	if adm == nil {
		return templateOpts
	}
	return append(templateOpts,
		quickstart.WithTemplateURLResolver(adm.URLs()),
		quickstart.WithTemplateFeatureGate(adm.FeatureGate()),
	)
}

func registerESignWebRoutes(
	r router.Router[*fiber.App],
	cfg coreadmin.Config,
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	routeAuth *auth.RouteAuthenticator,
	auther *auth.Auther,
	cookieName string,
	routes handlers.RouteSet,
	esignModule *modules.ESignModule,
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
	if routeAuth == nil {
		return fmt.Errorf("route authenticator is required")
	}
	if auther == nil {
		return fmt.Errorf("auther is required")
	}
	cookieName = strings.TrimSpace(cookieName)
	if cookieName == "" {
		return fmt.Errorf("auth cookie name is required")
	}
	basePath := strings.TrimSpace(adm.BasePath())
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.BasePath)
	}
	if basePath == "" {
		basePath = "/admin"
	}
	if err := configureESignContentPanelRoutes(adm, basePath); err != nil {
		return err
	}
	contentEntryViewContext := quickstart.DefaultAdminUIViewContextBuilder(adm, cfg)
	googleEnabled := featureEnabledInSystemScope(adm.FeatureGate(), "esign_google")
	registerESignSyncClientAssets(r, basePath)

	r.Get("/", func(c router.Context) error {
		return c.Redirect(basePath, http.StatusFound)
	})

	if err := quickstart.RegisterAdminUIRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.WithUIDashboardRoute(false),
	); err != nil {
		return err
	}
	if err := quickstart.RegisterSettingsUIRoutes(r, cfg, adm, authn); err != nil {
		return err
	}
	if err := quickstart.RegisterContentEntryUIRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.WithContentEntryUIViewContext(func(ctx router.ViewContext, panelName string, c router.Context) router.ViewContext {
			if contentEntryViewContext != nil {
				ctx = contentEntryViewContext(ctx, panelName, c)
			}
			return withESignContentEntryViewContext(ctx, panelName, c, esignModule, googleEnabled)
		}),
		quickstart.WithContentEntryUIEditGuard(func(c router.Context, panelName string, record map[string]any) (bool, error) {
			return guardESignAgreementEditRoute(c, panelName, record, basePath)
		}),
		quickstart.WithContentEntryUITemplateFS(client.FS(), eSignTemplatesFS),
	); err != nil {
		return err
	}
	registerESignDocumentUploadRoute(r, authn, routes, esignModule)
	registerESignLegacyUIAliasRoutes(r, authn, basePath)
	if err := quickstart.RegisterAuthUIRoutes(
		r,
		cfg,
		routeAuth,
		quickstart.WithAuthUICookie(router.FirstPartySessionCookie(cookieName, "")),
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

	landingPath := basePath
	legacyLandingPath := strings.TrimSpace(routes.AdminLegacyHome)
	if legacyLandingPath == "" {
		legacyLandingPath = path.Join(basePath, "esign")
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
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				stats := map[string]int{
					"draft":           0,
					"pending":         0,
					"completed":       0,
					"action_required": 0,
					"total":           0,
				}
				recentAgreements := []map[string]any{}
				if esignModule != nil {
					scope := resolveESignUploadScope(c, esignModule.DefaultScope())
					if liveStats, liveRecent, err := esignModule.LandingOverview(c.Context(), scope, 5); err == nil {
						stats = liveStats
						recentAgreements = liveRecent
					}
				}
				viewCtx := router.ViewContext{
					"api_base_path":     apiBasePath,
					"stats":             stats,
					"recent_agreements": recentAgreements,
				}
				viewCtx = withESignPageConfig(viewCtx, buildESignAdminLandingPageConfig(basePath, apiBasePath, googleEnabled))
				return viewCtx, nil
			},
		},
	); err != nil {
		return err
	}
	if legacyLandingPath != "" && legacyLandingPath != landingPath {
		r.Get(legacyLandingPath, authn.WrapHandler(func(c router.Context) error {
			return redirectPathAlias(c, legacyLandingPath, landingPath)
		}))
	}
	if err := registerESignSourceManagementUIRoutes(r, cfg, adm, authn, esignModule); err != nil {
		return err
	}
	if err := registerESignGoogleIntegrationUIRoutes(r, cfg, adm, authn, routes, esignModule); err != nil {
		return err
	}
	if err := registerESignSenderAgreementViewerWebRoutes(r, adm, authn, routes, basePath, esignModule); err != nil {
		return err
	}

	// Register public signer web routes (no auth required)
	tokenSvc := esignModule.TokenService()
	if tokenSvc != nil {
		signerAPIBasePath := path.Join(routes.PublicAPIBase, "esign", "signing")
		if strings.TrimSpace(signerAPIBasePath) == "" {
			signerAPIBasePath = "/api/v1/esign/signing"
		}
		signerCfg := SignerWebRouteConfig{
			TokenValidator:       tokenSvc,
			PublicTokenValidator: esignModule.PublicReviewTokenResolver(),
			SigningService:       esignModule.SigningService(),
			PublicReviewSession:  esignModule.SigningService(),
			AssetContractService: esignModule.SignerAssetContractService(),
			DefaultScope:         esignModule.DefaultScope(),
			APIBasePath:          signerAPIBasePath,
			AssetBasePath:        basePath,
		}
		if err := registerESignPublicSignerWebRoutes(r, signerCfg); err != nil {
			return err
		}
	}

	return nil
}

func registerESignAgreementEventsRoute(
	r router.Router[*fiber.App],
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	esignModule *modules.ESignModule,
	stream eventstream.Stream,
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
	if stream == nil {
		return nil
	}
	defaultScope := stores.Scope{}
	if esignModule != nil {
		defaultScope = esignModule.DefaultScope()
	}
	sseHandler := ssefiber.Handler(
		ssefiber.WithStream(stream),
		ssefiber.WithScopeResolver(func(c router.Context) (eventstream.Scope, error) {
			scope := resolveESignUploadScope(c, defaultScope)
			streamScope := eventstream.Scope{}
			if tenantID := strings.TrimSpace(scope.TenantID); tenantID != "" {
				streamScope["tenant_id"] = tenantID
			}
			if orgID := strings.TrimSpace(scope.OrgID); orgID != "" {
				streamScope["org_id"] = orgID
			}
			return streamScope, nil
		}),
	)
	eventsPath := path.Join(strings.TrimSpace(adm.AdminAPIBasePath()), "esign", "events")
	r.Get(eventsPath, authn.WrapHandler(func(c router.Context) error {
		if !coreadmin.CanAll(adm.Authorizer(), c.Context(), "esign", permissions.AdminESignView) {
			return c.Status(http.StatusForbidden).JSON(http.StatusForbidden, map[string]any{
				"error": map[string]any{
					"code":       string(services.ErrorCodeScopeDenied),
					"message":    "permission denied",
					"permission": permissions.AdminESignView,
				},
			})
		}
		if err := enforceESignUploadScopeBoundary(c, defaultScope); err != nil {
			return c.Status(http.StatusForbidden).JSON(http.StatusForbidden, map[string]any{
				"error": map[string]any{
					"code":    string(services.ErrorCodeScopeDenied),
					"message": "scope denied",
				},
			})
		}
		return sseHandler(c)
	}))
	return nil
}

func registerESignSyncClientAssets(r router.Router[*fiber.App], basePath string) {
	if r == nil {
		return
	}
	r.Static(path.Join(normalizeESignBasePath(basePath), "sync-client", "sync-core"), ".", router.Static{
		FS:   syncdata.ClientSyncCoreFS(),
		Root: ".",
	})
}

func registerESignGoogleIntegrationUIRoutes(
	r router.Router[*fiber.App],
	cfg coreadmin.Config,
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	routes handlers.RouteSet,
	esignModule *modules.ESignModule,
) error {
	if r == nil || adm == nil {
		return nil
	}

	basePath := strings.TrimSpace(adm.BasePath())
	if basePath == "" {
		basePath = strings.TrimSpace(cfg.BasePath)
	}
	if basePath == "" {
		basePath = "/admin"
	}

	landingPath := basePath
	documentsPath := path.Join(basePath, "content", "esign_documents")
	googleIntegrationPath := path.Join(basePath, "esign", "integrations", "google")
	googleCallbackPath := path.Join(googleIntegrationPath, "callback")
	googleDrivePickerPath := path.Join(googleIntegrationPath, "drive")
	apiBasePath := strings.TrimSpace(adm.AdminAPIBasePath())
	googleEnabled := featureEnabledInSystemScope(adm.FeatureGate(), "esign_google")
	if !googleEnabled {
		return nil
	}

	if err := quickstart.RegisterAdminPageRoutes(
		r,
		cfg,
		adm,
		authn,
		quickstart.AdminPageSpec{
			Path:       googleIntegrationPath,
			Template:   "resources/esign-integrations/google",
			Title:      "Google Drive Integration",
			Active:     "esign",
			Permission: permissions.AdminESignSettings,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				userID := resolveESignAdminUserID(c)
				accountID := resolveGoogleAccountID(c)
				redirectURI := resolveGoogleOAuthRedirectURI(c, googleCallbackPath)
				viewCtx := router.ViewContext{
					"api_base_path":       apiBasePath,
					"google_enabled":      googleEnabled,
					"google_client_id":    strings.TrimSpace(appcfg.Active().Google.ClientID),
					"google_redirect_uri": redirectURI,
					"google_account_id":   accountID,
					"user_id":             userID,
					"routes": map[string]any{
						"esign_settings":      landingPath,
						"esign_documents":     documentsPath,
						"esign_google_picker": googleDrivePickerPath,
					},
				}
				pageCfg := buildESignGoogleIntegrationPageConfig(
					eSignPageGoogleIntegration,
					basePath,
					apiBasePath,
					userID,
					accountID,
					redirectURI,
					strings.TrimSpace(appcfg.Active().Google.ClientID),
					googleEnabled,
					viewContextRoutes(viewCtx),
				)
				viewCtx = withESignPageConfig(
					viewCtx,
					pageCfg,
				)
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       googleDrivePickerPath,
			Template:   "resources/esign-integrations/google-drive-picker",
			Title:      "Import from Google Drive",
			Active:     "esign",
			Permission: permissions.AdminESignCreate,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				userID := resolveESignAdminUserID(c)
				accountID := resolveGoogleAccountID(c)
				scope := stores.Scope{TenantID: "tenant-bootstrap", OrgID: "org-bootstrap"}
				if esignModule != nil {
					scope = resolveESignUploadScope(c, esignModule.DefaultScope())
				}
				scopedUserID := services.ComposeGoogleScopedUserID(userID, accountID)
				googleConnected := esignModule != nil && esignModule.GoogleConnected(c.Context(), scope, scopedUserID)
				viewCtx := router.ViewContext{
					"api_base_path":     apiBasePath,
					"google_account_id": accountID,
					"user_id":           userID,
					"google_connected":  googleConnected,
					"routes": map[string]any{
						"esign_settings":  landingPath,
						"esign_documents": documentsPath,
					},
				}
				pageCfg := buildESignGoogleIntegrationPageConfig(
					eSignPageGoogleDrivePicker,
					basePath,
					apiBasePath,
					userID,
					accountID,
					"",
					"",
					googleEnabled,
					viewContextRoutes(viewCtx),
				)
				viewCtx = withESignPageConfig(
					viewCtx,
					pageCfg,
				)
				return viewCtx, nil
			},
		},
	); err != nil {
		return err
	}

	// OAuth callback must be reachable from Google redirect even when auth cookies
	// are absent (e.g. localhost vs 127.0.0.1 callback host mismatch).
	r.Get(googleCallbackPath, func(c router.Context) error {
		userID := resolveESignAdminUserID(c)
		accountID := resolveGoogleAccountID(c)
		pageCfg := buildESignGoogleIntegrationPageConfig(
			eSignPageGoogleCallback,
			basePath,
			apiBasePath,
			userID,
			accountID,
			"",
			"",
			googleEnabled,
			map[string]string{},
		)
		viewCtx := withESignPageConfig(
			router.ViewContext{
				"base_path":         basePath,
				"api_base_path":     apiBasePath,
				"google_account_id": accountID,
				"google_enabled":    googleEnabled,
			},
			pageCfg,
		)
		return templateview.RenderTemplateView(c, "resources/esign-integrations/google-callback", viewCtx)
	})

	return nil
}

func registerESignDocumentUploadRoute(
	r router.Router[*fiber.App],
	authn coreadmin.HandlerAuthenticator,
	routes handlers.RouteSet,
	esignModule *modules.ESignModule,
) {
	if r == nil || authn == nil || esignModule == nil {
		return
	}
	uploadHandler := quickstart.NewUploadHandler(quickstart.UploadHandlerConfig{
		BasePath:            routes.AdminBasePath,
		DiskAssetsDir:       resolveESignDiskAssetsDir(),
		FormField:           esignUploadFormField,
		MaxFileSize:         esignModule.MaxSourcePDFBytes(),
		AllowedMimeTypes:    cloneStringBoolMap(allowedESignUploadMimeTypes),
		AllowedImageFormats: cloneStringBoolMap(allowedESignUploadExtensions),
		Manager:             esignModule.UploadManager(),
		Authorize: func(ctx context.Context) error {
			if auth.Can(ctx, "admin.esign", "create") || auth.Can(ctx, "esign", "create") {
				return nil
			}
			return goerrors.New("forbidden", goerrors.CategoryAuthz).
				WithCode(goerrors.CodeForbidden).
				WithTextCode("FORBIDDEN")
		},
		ResolveUploadSubdir: func(c router.Context) string {
			scope := resolveESignUploadScope(c, esignModule.DefaultScope())
			return path.Join("tenant", scope.TenantID, "org", scope.OrgID, "docs")
		},
		Response: func(publicURL string, meta *uploader.FileMeta) any {
			objectKey := ""
			originalName := ""
			if meta != nil {
				objectKey = strings.TrimSpace(meta.Name)
				originalName = strings.TrimSpace(meta.OriginalName)
			}
			return map[string]any{
				"url":                  publicURL,
				"object_key":           objectKey,
				"original_name":        originalName,
				"source_original_name": originalName,
			}
		},
	})
	securedUploadHandler := func(c router.Context) error {
		transportGuard := handlers.TLSTransportGuard{
			AllowLocalInsecure: true,
			RequestTrustPolicy: appcfg.ActiveRequestTrustPolicy(),
		}
		if err := transportGuard.Ensure(c); err != nil {
			return c.Status(http.StatusUpgradeRequired).JSON(http.StatusUpgradeRequired, map[string]any{
				"error": map[string]any{
					"code":    string(services.ErrorCodeTransportSecurity),
					"message": "tls transport required",
				},
			})
		}
		if err := enforceESignUploadScopeBoundary(c, esignModule.DefaultScope()); err != nil {
			return c.Status(http.StatusForbidden).JSON(http.StatusForbidden, map[string]any{
				"error": map[string]any{
					"code":    string(services.ErrorCodeScopeDenied),
					"message": "scope denied",
				},
			})
		}
		return uploadHandler(c)
	}
	r.Post(routes.AdminDocumentsUpload, authn.WrapHandler(securedUploadHandler))
}

func resolveESignUploadScope(c router.Context, fallback stores.Scope) stores.Scope {
	scope := resolveESignActorScope(c)
	scope.TenantID = firstNonEmptyValue(strings.TrimSpace(scope.TenantID), strings.TrimSpace(fallback.TenantID))
	scope.OrgID = firstNonEmptyValue(strings.TrimSpace(scope.OrgID), strings.TrimSpace(fallback.OrgID))
	return scope
}

func resolveESignActorScope(c router.Context) stores.Scope {
	if c == nil {
		return stores.Scope{}
	}
	metadataScope := func(metadata map[string]any) stores.Scope {
		return stores.Scope{
			TenantID: metadataString(metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id"),
			OrgID:    metadataString(metadata, "organization_id", "org_id", "org", "default_org_id"),
		}
	}
	if actor, ok := auth.ActorFromContext(c.Context()); ok && actor != nil {
		scope := stores.Scope{
			TenantID: strings.TrimSpace(actor.TenantID),
			OrgID:    strings.TrimSpace(actor.OrganizationID),
		}
		if scope.TenantID == "" {
			scope.TenantID = metadataString(actor.Metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id")
		}
		if scope.OrgID == "" {
			scope.OrgID = metadataString(actor.Metadata, "organization_id", "org_id", "org", "default_org_id")
		}
		if scope.TenantID != "" || scope.OrgID != "" {
			return scope
		}
	}
	if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
		scope := metadataScope(claimsMetadata(claims))
		if scope.TenantID != "" || scope.OrgID != "" {
			return scope
		}
	}
	if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
		scope := metadataScope(claimsMetadata(claims))
		if scope.TenantID != "" || scope.OrgID != "" {
			return scope
		}
	}
	return stores.Scope{}
}

func claimsMetadata(claims auth.AuthClaims) map[string]any {
	if claims == nil {
		return nil
	}
	if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok {
		return carrier.ClaimsMetadata()
	}
	return nil
}

func enforceESignUploadScopeBoundary(c router.Context, fallback stores.Scope) error {
	if c == nil {
		return nil
	}
	requestScope := resolveESignUploadScope(c, fallback)
	actorScope := resolveESignActorScope(c)
	if strings.TrimSpace(actorScope.TenantID) == "" && strings.TrimSpace(actorScope.OrgID) == "" {
		actorScope = fallback
	}
	if scopeConflicts(actorScope, requestScope) {
		return fmt.Errorf("scope denied")
	}
	return nil
}

func scopeConflicts(actor, request stores.Scope) bool {
	actorTenantID := strings.TrimSpace(actor.TenantID)
	requestTenantID := strings.TrimSpace(request.TenantID)
	if actorTenantID != "" && requestTenantID != "" && actorTenantID != requestTenantID {
		return true
	}
	actorOrgID := strings.TrimSpace(actor.OrgID)
	requestOrgID := strings.TrimSpace(request.OrgID)
	return actorOrgID != "" && requestOrgID != "" && actorOrgID != requestOrgID
}

func metadataString(metadata map[string]any, keys ...string) string {
	for _, key := range keys {
		if metadata == nil {
			return ""
		}
		raw, ok := metadata[key]
		if !ok || raw == nil {
			continue
		}
		switch value := raw.(type) {
		case string:
			if trimmed := strings.TrimSpace(value); trimmed != "" {
				return trimmed
			}
		case []byte:
			if trimmed := strings.TrimSpace(string(value)); trimmed != "" {
				return trimmed
			}
		default:
			if trimmed := strings.TrimSpace(fmt.Sprint(value)); trimmed != "" && trimmed != "<nil>" {
				return trimmed
			}
		}
	}
	return ""
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
		path.Join(basePath, "dashboard"):                  basePath,
		path.Join(basePath, "esign", "agreements"):        canonicalESignContentListPath(basePath, "esign_agreements"),
		path.Join(basePath, "esign", "agreements", "new"): path.Join(canonicalESignContentListPath(basePath, "esign_agreements"), "new"),
		path.Join(basePath, "esign", "documents"):         canonicalESignContentListPath(basePath, "esign_documents"),
		path.Join(basePath, "esign", "documents", "new"):  path.Join(canonicalESignContentListPath(basePath, "esign_documents"), "new"),
		path.Join(basePath, "esign", "users"):             path.Join(basePath, "users"),
		path.Join(basePath, "esign", "roles"):             path.Join(basePath, "roles"),
		path.Join(basePath, "esign", "profile"):           path.Join(basePath, "profile"),
		path.Join(basePath, "esign", "activity"):          path.Join(basePath, "activity"),
	}

	for fromPath, toPath := range aliases {
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

func resolveESignAdminUserID(c router.Context) string {
	if c != nil {
		if actor, ok := auth.ActorFromContext(c.Context()); ok && actor != nil {
			if subject := strings.TrimSpace(actor.Subject); subject != "" {
				return subject
			}
			if actorID := strings.TrimSpace(actor.ActorID); actorID != "" {
				return actorID
			}
		}
		if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
			if userID := firstNonEmptyValue(strings.TrimSpace(claims.UserID()), strings.TrimSpace(claims.Subject())); userID != "" {
				return userID
			}
		}
		if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
			if userID := firstNonEmptyValue(strings.TrimSpace(claims.UserID()), strings.TrimSpace(claims.Subject())); userID != "" {
				return userID
			}
		}
	}
	return ""
}

func resolveGoogleAccountID(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query("account_id"))
}

func withESignContentEntryViewContext(
	ctx router.ViewContext,
	panelName string,
	c router.Context,
	esignModule *modules.ESignModule,
	googleEnabled bool,
) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	panelName = strings.TrimSpace(panelName)
	if panelName == "" {
		return ctx
	}

	userID := resolveESignAdminUserID(c)
	ctx["user_id"] = userID
	ctx = withESignCanonicalContentEntryContext(ctx, panelName, c)

	switch panelName {
	case "esign_documents":
		accountID := resolveGoogleAccountID(c)
		ctx["google_account_id"] = accountID
		ctx["google_enabled"] = googleEnabled
		googleConnected := false
		if googleEnabled && esignModule != nil && c != nil && strings.TrimSpace(userID) != "" {
			scope := resolveESignUploadScope(c, esignModule.DefaultScope())
			scopedUserID := services.ComposeGoogleScopedUserID(userID, accountID)
			googleConnected = esignModule.GoogleConnected(c.Context(), scope, scopedUserID)
			if !googleConnected && accountID != "" {
				googleConnected = esignModule.GoogleConnected(c.Context(), scope, services.ComposeGoogleScopedUserID(userID, ""))
			}
		}
		ctx["google_connected"] = googleConnected
		pageCfg := buildESignDocumentIngestionPageConfig(
			viewContextString(ctx, "base_path", "/admin"),
			viewContextString(ctx, "api_base_path", "/admin/api/v1"),
			userID,
			googleEnabled,
			googleConnected,
			viewContextRoutes(ctx),
		)
		if pageCfg.Context == nil {
			pageCfg.Context = map[string]any{}
		}
		pageCfg.Context["google_account_id"] = accountID
		return withESignPageConfig(
			ctx,
			pageCfg,
		)
	case "esign_agreements":
		if resourceItem, ok := ctx["resource_item"].(map[string]any); ok && resourceItem != nil {
			agreementID := strings.TrimSpace(rawToString(resourceItem["id"]))
			if agreementID != "" {
				basePath := viewContextString(ctx, "base_path", "/admin")
				mode := agreementDetailSenderViewMode(resourceItem)
				resourceItem["sender_view"] = map[string]any{
					"url":     path.Join(normalizeESignBasePath(basePath), "esign", "agreements", agreementID, "view"),
					"mode":    mode,
					"enabled": true,
					"label":   "Open Document",
				}
			}
		}
		identity := coreadmin.ResolveAuthenticatedRequestIdentity(c, coreadmin.AuthenticatedRequestScopeDefaults{})
		routes := viewContextRoutes(ctx)
		storageScope := buildESignAgreementFormStorageScope(
			identity.ActorID,
			identity.TenantID,
			identity.OrgID,
			firstNonEmptyValue(routes["create"], routes["index"], viewContextString(ctx, "base_path", "/admin")),
		)
		ctx["agreement_form_storage_scope"] = storageScope
		pageCfg := buildESignAgreementFormPageConfig(
			viewContextString(ctx, "base_path", "/admin"),
			viewContextString(ctx, "api_base_path", "/admin/api/v1"),
			routes,
			storageScope,
		)
		return withESignPageConfig(ctx, enrichESignAgreementFormPageConfig(pageCfg, ctx))
	default:
		return ctx
	}
}

func agreementDetailSenderViewMode(record map[string]any) string {
	if record == nil {
		return "read_only"
	}
	status := strings.ToLower(strings.TrimSpace(rawToString(record["status"])))
	switch status {
	case stores.AgreementStatusCompleted:
		return "complete"
	case stores.AgreementStatusSent, stores.AgreementStatusInProgress:
		return "sign"
	}
	reviewStatus := strings.ToLower(strings.TrimSpace(rawToString(record["review_status"])))
	if review, ok := record["review"].(map[string]any); ok {
		if value := strings.ToLower(strings.TrimSpace(rawToString(review["status"]))); value != "" {
			reviewStatus = value
		}
	}
	if reviewStatus != "" && reviewStatus != stores.AgreementReviewStatusNone {
		return "review"
	}
	return "read_only"
}

func guardESignAgreementEditRoute(c router.Context, panelName string, record map[string]any, basePath string) (bool, error) {
	if c == nil || !strings.EqualFold(strings.TrimSpace(panelName), "esign_agreements") {
		return false, nil
	}
	status := strings.ToLower(strings.TrimSpace(rawToString(record["status"])))
	if status == "" || status == stores.AgreementStatusDraft {
		return false, nil
	}
	agreementID := strings.TrimSpace(rawToString(record["id"]))
	if agreementID == "" {
		return false, nil
	}
	target := path.Join(canonicalESignContentListPath(basePath, panelName), agreementID)
	if rawQuery := rawQueryFromURL(c.OriginalURL()); rawQuery != "" {
		target += "?" + rawQuery
	}
	return true, c.Redirect(target, http.StatusFound)
}

func canonicalESignContentRouteSlug(panelName string) string {
	switch strings.TrimSpace(panelName) {
	case "esign_documents":
		return "documents"
	case "esign_agreements":
		return "agreements"
	default:
		return ""
	}
}

func canonicalESignContentListPath(basePath, panelName string) string {
	slug := canonicalESignContentRouteSlug(panelName)
	if slug == "" {
		return ""
	}
	return path.Join(normalizeESignBasePath(basePath), "content", slug)
}

func canonicalESignContentLabel(panelName string) string {
	switch strings.TrimSpace(panelName) {
	case "esign_documents":
		return "Documents"
	case "esign_agreements":
		return "Agreements"
	default:
		return ""
	}
}

func withESignCanonicalContentEntryContext(ctx router.ViewContext, panelName string, c router.Context) router.ViewContext {
	label := canonicalESignContentLabel(panelName)
	indexPath := canonicalESignContentListPath(viewContextString(ctx, "base_path", "/admin"), panelName)
	if label == "" || indexPath == "" {
		return ctx
	}

	routes := viewContextRoutes(ctx)
	routes["index"] = indexPath
	routes["create"] = indexPath
	routes["new"] = path.Join(indexPath, "new")

	record := rawToMap(ctx["resource_item"])
	recordID := strings.TrimSpace(rawToString(record["id"]))
	if recordID != "" {
		routes["show"] = path.Join(indexPath, recordID)
		routes["edit"] = path.Join(indexPath, recordID, "edit")
		routes["delete"] = path.Join(indexPath, recordID, "delete")
	}
	ctx["routes"] = routes
	ctx["resource_label"] = label

	if contentType, ok := ctx["content_type"].(map[string]any); ok && contentType != nil {
		contentType["name"] = label
		contentType["slug"] = canonicalESignContentRouteSlug(panelName)
		ctx["content_type"] = contentType
	}
	if record != nil {
		record["actions"] = map[string]string{
			"edit":   routes["edit"],
			"delete": routes["delete"],
		}
		ctx["resource_item"] = record
	}

	home := quickstart.Breadcrumb("Home", normalizeESignBasePath(viewContextString(ctx, "base_path", "/admin")))
	if recordID != "" && !rawToBool(ctx["is_edit"]) && !strings.HasSuffix(strings.TrimSpace(c.Path()), "/new") {
		recordLabel := firstNonEmptyValue(
			strings.TrimSpace(rawToString(record["title"])),
			strings.TrimSpace(rawToString(record["name"])),
			recordID,
		)
		if recordLabel != "" && !strings.EqualFold(recordLabel, label) {
			return quickstart.WithBreadcrumbOverride(
				ctx,
				home,
				quickstart.Breadcrumb(label, indexPath),
				quickstart.CurrentBreadcrumb(recordLabel),
			)
		}
	}

	return quickstart.WithBreadcrumbOverride(
		ctx,
		home,
		quickstart.CurrentBreadcrumb(label),
	)
}

func resolveGoogleOAuthRedirectURI(c router.Context, callbackPath string) string {
	if configured := strings.TrimSpace(appcfg.Active().Google.OAuthRedirectURI); configured != "" {
		return configured
	}
	callbackPath = strings.TrimSpace(callbackPath)
	if callbackPath == "" {
		return ""
	}
	if parsed, err := url.Parse(callbackPath); err == nil && parsed != nil && parsed.IsAbs() {
		return strings.TrimSpace(parsed.String())
	}
	origin := resolveRequestOrigin(c)
	if origin == "" {
		return callbackPath
	}
	base, baseErr := url.Parse(origin)
	relative, relativeErr := url.Parse(callbackPath)
	if baseErr != nil || relativeErr != nil || base == nil || relative == nil {
		return callbackPath
	}
	return strings.TrimSpace(base.ResolveReference(relative).String())
}

func resolveRequestOrigin(c router.Context) string {
	return quickstart.ResolveRequestOrigin(c, appcfg.ActiveRequestTrustPolicy())
}

func featureEnabledInSystemScope(gate fggate.FeatureGate, feature string) bool {
	if gate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	enabled, err := gate.Enabled(context.Background(), strings.TrimSpace(feature), fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	return err == nil && enabled
}

func cloneStringBoolMap(input map[string]bool) map[string]bool {
	if len(input) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(input))
	maps.Copy(out, input)
	return out
}

// SignerWebRouteConfig holds dependencies for public signer web routes.
type SignerWebRouteConfig struct {
	TokenValidator       handlers.SignerTokenValidator       `json:"token_validator"`
	PublicTokenValidator handlers.PublicReviewTokenValidator `json:"public_token_validator"`
	SigningService       handlers.SignerSessionService       `json:"signing_service"`
	PublicReviewSession  handlers.PublicReviewSessionService `json:"public_review_session"`
	AssetContractService handlers.SignerAssetContractService `json:"asset_contract_service"`
	DefaultScope         stores.Scope                        `json:"default_scope"`
	APIBasePath          string                              `json:"api_base_path"`
	AssetBasePath        string                              `json:"asset_base_path"`
}

// registerESignPublicSignerWebRoutes registers HTML routes for the public signer flow.
// These routes serve HTML pages backed by signer APIs (session, fields, complete, declined, error).
func registerESignPublicSignerWebRoutes(
	r router.Router[*fiber.App],
	signerCfg SignerWebRouteConfig,
) error {
	if r == nil {
		return fmt.Errorf("router is required")
	}

	apiBasePath := strings.TrimSpace(signerCfg.APIBasePath)
	if apiBasePath == "" {
		apiBasePath = "/api/v1/esign/signing"
	}

	// GET /sign/:token - Public signer entrypoint.
	r.Get(publicSignBasePath+"/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// GET /review/:token - Public review entrypoint.
	r.Get(publicReviewBasePath+"/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// Legacy aliases preserved for compatibility; valid tokens redirect to the canonical path.
	r.Get("/esign/sign/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/review/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// Legacy unified review aliases.
	r.Get(publicSignBasePath+"/:token/review", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/sign/:token/review", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// GET /sign/:token/complete - Submission complete confirmation
	r.Get("/sign/:token/complete", func(c router.Context) error {
		return renderSignerCompletePage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/sign/:token/complete", func(c router.Context) error {
		return renderSignerCompletePage(c, signerCfg, apiBasePath)
	})

	// GET /sign/:token/declined - Decline confirmation
	r.Get("/sign/:token/declined", func(c router.Context) error {
		return renderSignerDeclinedPage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/sign/:token/declined", func(c router.Context) error {
		return renderSignerDeclinedPage(c, signerCfg, apiBasePath)
	})

	return nil
}

func registerESignSenderAgreementViewerWebRoutes(
	r router.Router[*fiber.App],
	adm *coreadmin.Admin,
	authn coreadmin.HandlerAuthenticator,
	routes handlers.RouteSet,
	basePath string,
	esignModule *modules.ESignModule,
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
	if esignModule == nil {
		return nil
	}

	apiBasePath := strings.TrimSpace(routes.AdminAPIBase)
	if apiBasePath == "" {
		apiBasePath = path.Join(strings.TrimSpace(adm.AdminAPIBasePath()), "esign")
	}
	assetBasePath := strings.TrimSpace(basePath)
	if assetBasePath == "" {
		assetBasePath = "/admin"
	}
	viewerCfg := SignerWebRouteConfig{
		AssetBasePath: assetBasePath,
	}

	r.Get(routes.AdminAgreementView, authn.WrapHandler(func(c router.Context) error {
		applySignerSecurityHeaders(c, true)
		policy := services.ResolveSenderViewerPolicy()
		if !policy.CanOpenSenderViewer(adm.Authorizer(), c.Context()) {
			return renderSignerErrorPage(c, viewerCfg, apiBasePath, "VIEWER_FORBIDDEN", "Viewer Unavailable", "You do not have permission to open this agreement viewer.")
		}
		if err := enforceESignUploadScopeBoundary(c, esignModule.DefaultScope()); err != nil {
			return renderSignerErrorPage(c, viewerCfg, apiBasePath, "VIEWER_SCOPE_DENIED", "Viewer Unavailable", "This agreement viewer is not available in the current scope.")
		}
		agreementID := strings.TrimSpace(c.Param("agreement_id"))
		if agreementID == "" {
			return renderSignerErrorPage(c, viewerCfg, apiBasePath, "INVALID_AGREEMENT", "Agreement Not Found", "The agreement viewer link is missing an agreement id.")
		}
		scope := resolveESignUploadScope(c, esignModule.DefaultScope())
		canComment := policy.CanWriteSenderComments(adm.Authorizer(), c.Context())
		session, err := esignModule.AgreementViewService().GetSenderSession(c.Context(), scope, agreementID, services.AgreementViewActor{
			ActorID:    resolveESignAdminUserID(c),
			CanComment: canComment,
		})
		if err != nil {
			var coded *goerrors.Error
			if errors.As(err, &coded) && strings.TrimSpace(coded.TextCode) == string(services.ErrorCodePDFUnsupported) {
				return renderSignerErrorPage(c, viewerCfg, apiBasePath, "PDF_UNSUPPORTED", "Document Requires Remediation", "This document cannot be displayed online due to PDF compatibility restrictions.")
			}
			return renderSignerErrorPage(c, viewerCfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load this agreement viewer right now.")
		}
		if !canRenderUnifiedSession(session) {
			return renderSignerErrorPage(c, viewerCfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load this agreement viewer right now.")
		}
		resourceBasePath := strings.Replace(routes.AdminAgreementViewerSession, ":agreement_id", url.PathEscape(agreementID), 1)
		viewCtx := withESignPageConfig(
			buildSignerReviewViewContext("", apiBasePath, path.Join(normalizeESignBasePath(assetBasePath), "esign", "agreements"), resourceBasePath, session),
			buildESignSignerPageConfig(eSignPageSignerReview, assetBasePath, apiBasePath, ""),
		)
		return templateview.RenderTemplateView(c, "esign-signer/review", signerTemplateViewContext(viewerCfg, apiBasePath, viewCtx))
	}))

	return nil
}

func renderSignerReviewPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	startedAt := time.Now()
	applySignerSecurityHeaders(c, true)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	publicToken, err := validatePublicReviewToken(c.Context(), cfg, token)
	if err != nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return handleSignerTokenError(c, cfg, apiBasePath, err, token)
	}
	if redirected := redirectToCanonicalSignerRoute(c, token, publicToken); redirected {
		return nil
	}

	if cfg.PublicReviewSession == nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}
	session, err := cfg.PublicReviewSession.GetReviewSession(c.Context(), cfg.DefaultScope, publicToken)
	if err != nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		observability.ObserveSignerLinkOpen(c.Context(), false)
		var coded *goerrors.Error
		if errors.As(err, &coded) && strings.TrimSpace(coded.TextCode) == string(services.ErrorCodePDFUnsupported) {
			return renderSignerErrorPage(c, cfg, apiBasePath, "PDF_UNSUPPORTED", "Document Requires Remediation", "This document cannot be signed online due to PDF compatibility restrictions. Please contact the sender.")
		}
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}
	if !canRenderUnifiedSession(session) {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}

	observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), true)
	observability.ObserveSignerLinkOpen(c.Context(), true)
	resourceBasePath := strings.TrimRight(strings.TrimSpace(apiBasePath), "/") + "/session/" + url.PathEscape(token)
	viewCtx := withESignPageConfig(
		buildSignerReviewViewContext(token, apiBasePath, canonicalSignerBasePath(publicToken), resourceBasePath, session),
		buildESignSignerPageConfig(eSignPageSignerReview, cfg.AssetBasePath, apiBasePath, token),
	)
	return templateview.RenderTemplateView(c, "esign-signer/review", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func canonicalSignerBasePath(token services.PublicReviewToken) string {
	if strings.EqualFold(strings.TrimSpace(token.Kind), services.PublicReviewTokenKindReview) {
		return publicReviewBasePath
	}
	return publicSignBasePath
}

func canonicalSignerRoutePath(rawToken string, token services.PublicReviewToken) string {
	return canonicalSignerBasePath(token) + "/" + url.PathEscape(strings.TrimSpace(rawToken))
}

func redirectToCanonicalSignerRoute(c router.Context, rawToken string, token services.PublicReviewToken) bool {
	if c == nil {
		return false
	}
	target := canonicalSignerRoutePath(rawToken, token)
	if strings.TrimSpace(c.Path()) == target {
		return false
	}
	if rawQuery := rawQueryFromURL(c.OriginalURL()); rawQuery != "" {
		target += "?" + rawQuery
	}
	_ = c.Redirect(target, http.StatusFound)
	return true
}

func canRenderUnifiedSession(session services.SignerSessionContext) bool {
	if strings.TrimSpace(session.DocumentName) == "" {
		return false
	}
	if session.PageCount <= 0 {
		return false
	}
	for _, field := range session.Fields {
		if field.Page <= 0 || field.Width <= 0 || field.Height <= 0 {
			return false
		}
	}
	return true
}

func renderSignerCompletePage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	applySignerSecurityHeaders(c, false)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err != nil {
		// For complete page, some token errors are expected (e.g., token revoked after completion)
		// Show a generic completion message
		viewCtx := router.ViewContext{
			"token":         token,
			"api_base_path": apiBasePath,
			"agreement": map[string]any{
				"title":     "Document",
				"completed": true,
			},
			"signed_at": time.Now().Format("January 2, 2006"),
		}
		viewCtx = withESignPageConfig(
			viewCtx,
			buildESignSignerPageConfig(eSignPageSignerComplete, cfg.AssetBasePath, apiBasePath, token),
		)
		return templateview.RenderTemplateView(c, "esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
	}

	session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
	if err != nil {
		// Still show completion page even if session fails
		viewCtx := router.ViewContext{
			"token":         token,
			"api_base_path": apiBasePath,
			"agreement": map[string]any{
				"title":     "Document",
				"completed": true,
			},
			"signed_at": time.Now().Format("January 2, 2006"),
		}
		viewCtx = withESignPageConfig(
			viewCtx,
			buildESignSignerPageConfig(eSignPageSignerComplete, cfg.AssetBasePath, apiBasePath, token),
		)
		return templateview.RenderTemplateView(c, "esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
	}

	viewCtx := router.ViewContext{
		"token":         token,
		"api_base_path": apiBasePath,
		"agreement": map[string]any{
			"title":     "Agreement",
			"status":    session.AgreementStatus,
			"completed": session.AgreementStatus == stores.AgreementStatusCompleted,
		},
		"session":   sessionToViewContext(session),
		"signed_at": time.Now().Format("January 2, 2006"),
	}

	if cfg.AssetContractService != nil {
		if contract, err := cfg.AssetContractService.Resolve(c.Context(), cfg.DefaultScope, tokenRecord); err == nil {
			assetBaseURL := path.Join(strings.TrimSpace(apiBasePath), "assets", url.PathEscape(token))
			assetURLs := map[string]string{}
			if contract.SourceDocumentAvailable {
				assetURLs["source_url"] = assetBaseURL + "?asset=source"
			}
			if contract.ExecutedArtifactAvailable {
				assetURLs["executed_url"] = assetBaseURL + "?asset=executed"
			}
			if contract.CertificateAvailable {
				assetURLs["certificate_url"] = assetBaseURL + "?asset=certificate"
			}
			if len(assetURLs) > 0 {
				viewCtx["artifact_urls"] = assetURLs
				downloadURL := firstNonEmptyValue(strings.TrimSpace(assetURLs["executed_url"]), "")
				if downloadURL == "" {
					downloadURL = firstNonEmptyValue(strings.TrimSpace(assetURLs["certificate_url"]), "")
				}
				if downloadURL == "" {
					downloadURL = firstNonEmptyValue(strings.TrimSpace(assetURLs["source_url"]), "")
				}
				if downloadURL != "" {
					viewCtx["download_url"] = downloadURL
				}
			}
		}
	}
	viewCtx = withESignPageConfig(
		viewCtx,
		buildESignSignerPageConfig(eSignPageSignerComplete, cfg.AssetBasePath, apiBasePath, token),
	)
	return templateview.RenderTemplateView(c, "esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func renderSignerDeclinedPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	applySignerSecurityHeaders(c, false)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	declineReason := strings.TrimSpace(c.Query("reason"))

	viewCtx := router.ViewContext{
		"token":          token,
		"api_base_path":  apiBasePath,
		"decline_reason": declineReason,
		"agreement": map[string]any{
			"title":        "Document",
			"sender_email": "",
		},
	}

	// Try to load session for additional context, but don't fail if unavailable
	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err == nil {
		session, sessionErr := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
		if sessionErr == nil {
			viewCtx["agreement"] = map[string]any{
				"title":        "Agreement",
				"sender_email": "",
			}
			viewCtx["session"] = sessionToViewContext(session)
		}
	}
	viewCtx = withESignPageConfig(
		viewCtx,
		buildESignSignerPageConfig(eSignPageSignerDeclined, cfg.AssetBasePath, apiBasePath, token),
	)

	return templateview.RenderTemplateView(c, "esign-signer/declined", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func renderSignerErrorPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath, errorCode, errorTitle, errorMessage string) error {
	applySignerSecurityHeaders(c, false)
	viewCtx := router.ViewContext{
		"api_base_path": apiBasePath,
		"error_code":    errorCode,
		"error_title":   errorTitle,
		"error_message": errorMessage,
	}
	viewCtx = withESignPageConfig(
		viewCtx,
		buildESignSignerPageConfig(eSignPageSignerError, cfg.AssetBasePath, apiBasePath, ""),
	)
	return templateview.RenderTemplateView(c, "esign-signer/error", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func applySignerSecurityHeaders(c router.Context, unified bool) {
	if c == nil {
		return
	}
	c.SetHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate, private")
	c.SetHeader("Pragma", "no-cache")
	c.SetHeader("X-Content-Type-Options", "nosniff")
	c.SetHeader("Referrer-Policy", "no-referrer")
	if unified {
		c.SetHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data: https://cdn.jsdelivr.net; object-src 'none'; frame-ancestors 'none'; base-uri 'self'")
	}
}

func validateSignerToken(ctx context.Context, cfg SignerWebRouteConfig, token string) (stores.SigningTokenRecord, error) {
	if cfg.TokenValidator == nil {
		return stores.SigningTokenRecord{}, fmt.Errorf("token validator not configured")
	}
	return cfg.TokenValidator.Validate(ctx, cfg.DefaultScope, token)
}

func validatePublicReviewToken(ctx context.Context, cfg SignerWebRouteConfig, token string) (services.PublicReviewToken, error) {
	if cfg.PublicTokenValidator != nil {
		return cfg.PublicTokenValidator.Validate(ctx, cfg.DefaultScope, token)
	}
	signingToken, err := validateSignerToken(ctx, cfg, token)
	if err != nil {
		return services.PublicReviewToken{}, err
	}
	return services.PublicReviewTokenFromSigning(signingToken), nil
}

func handleSignerTokenError(c router.Context, cfg SignerWebRouteConfig, apiBasePath string, err error, token string) error {
	observability.ObserveSignerLinkOpen(c.Context(), false)
	errMsg := strings.ToLower(err.Error())

	if strings.Contains(errMsg, "expired") {
		return renderSignerErrorPage(c, cfg, apiBasePath, "TOKEN_EXPIRED", "Link Expired", "This signing link has expired.")
	}
	if strings.Contains(errMsg, "revoked") || strings.Contains(errMsg, "invalidated") {
		return renderSignerErrorPage(c, cfg, apiBasePath, "TOKEN_REVOKED", "Link No Longer Valid", "This signing link has been revoked.")
	}
	if strings.Contains(errMsg, "not found") || strings.Contains(errMsg, "invalid") {
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "This signing link is invalid or doesn't exist.")
	}

	return renderSignerErrorPage(c, cfg, apiBasePath, "TOKEN_ERROR", "Unable to Verify Link", "We couldn't verify your signing link. Please contact the sender.")
}

func signerTemplateViewContext(cfg SignerWebRouteConfig, apiBasePath string, viewCtx router.ViewContext) router.ViewContext {
	basePath := strings.TrimSpace(cfg.AssetBasePath)
	if basePath == "" {
		basePath = "/admin"
	}
	return quickstart.WithPathViewContext(viewCtx, coreadmin.Config{}, quickstart.PathViewContextConfig{
		BasePath:      basePath,
		APIBasePath:   strings.TrimSpace(apiBasePath),
		AssetBasePath: basePath,
	})
}

func buildSignerReviewViewContext(token, apiBasePath, signerBasePath, resourceBasePath string, session services.SignerSessionContext) router.ViewContext {
	fieldsJSON := "[]"
	if len(session.Fields) > 0 {
		if encoded, err := encodeFieldsJSON(session.Fields); err == nil {
			fieldsJSON = encoded
		}
	}

	// Encode viewer pages for coordinate transform system (Task 19.FE.2)
	viewerPagesJSON := "[]"
	if len(session.Viewer.Pages) > 0 {
		if encoded, err := encodeViewerPagesJSON(session.Viewer.Pages); err == nil {
			viewerPagesJSON = encoded
		}
	}
	reviewJSON := "null"
	if session.Review != nil {
		if encoded, err := json.Marshal(session.Review); err == nil {
			reviewJSON = string(encoded)
		}
	}

	sessionCtx := sessionToViewContext(session)
	sessionCtx["fields_json"] = fieldsJSON
	sessionCtx["review_json"] = reviewJSON
	sessionCtx["viewer"] = session.Viewer

	// Build viewer context with pages_json for frontend
	viewerCtx := map[string]any{
		"coordinate_space":      firstNonEmptyValue(session.Viewer.CoordinateSpace, "pdf"),
		"contract_version":      firstNonEmptyValue(session.Viewer.ContractVersion, "1.0"),
		"unit":                  firstNonEmptyValue(session.Viewer.Unit, "pt"),
		"origin":                firstNonEmptyValue(session.Viewer.Origin, "top-left"),
		"y_axis_direction":      firstNonEmptyValue(session.Viewer.YAxisDirection, "down"),
		"pages_json":            viewerPagesJSON,
		"compatibility_tier":    firstNonEmptyValue(session.Viewer.CompatibilityTier, session.Viewer.Compatibility),
		"compatibility_reason":  firstNonEmptyValue(session.Viewer.CompatibilityReason, session.Viewer.Reason),
		"compatibility_message": signerViewerCompatibilityMessage(session.Viewer.CompatibilityTier, session.Viewer.CompatibilityReason, session.Viewer.Reason),
	}

	runtimeCfg := appcfg.Active()
	profileTTLDays := runtimeCfg.Signer.ProfileTTLDays
	if profileTTLDays < 1 || profileTTLDays > 365 {
		profileTTLDays = 90
	}
	reviewAPIPath := strings.TrimRight(strings.TrimSpace(resourceBasePath), "/") + "/review"
	assetContractPath := strings.TrimRight(strings.TrimSpace(resourceBasePath), "/") + "/assets"
	telemetryPath := ""
	if strings.TrimSpace(token) != "" {
		assetContractPath = strings.TrimRight(strings.TrimSpace(apiBasePath), "/") + "/assets/" + url.PathEscape(token)
		telemetryPath = strings.TrimRight(strings.TrimSpace(apiBasePath), "/") + "/telemetry/" + url.PathEscape(token)
	}
	return router.ViewContext{
		"token":                           token,
		"api_base_path":                   apiBasePath,
		"signer_base_path":                signerBasePath,
		"resource_base_path":              resourceBasePath,
		"review_api_path":                 reviewAPIPath,
		"asset_contract_path":             assetContractPath,
		"telemetry_path":                  telemetryPath,
		"flow_mode":                       signerFlowModeUnified,
		"profile_mode":                    resolveSignerProfileMode(),
		"profile_ttl_days":                profileTTLDays,
		"profile_persist_drawn_signature": runtimeCfg.Signer.ProfilePersistDrawnSignature,
		"profile_endpoint_base_path":      apiBasePath,
		"session":                         sessionCtx,
		"viewer":                          viewerCtx,
		"agreement": map[string]any{
			"title":         "Agreement",
			"status":        session.AgreementStatus,
			"page_count":    maxInt(session.PageCount, 1),
			"document_name": firstNonEmptyValue(session.DocumentName, "Document.pdf"),
		},
	}
}

func signerViewerCompatibilityMessage(tier, reason, fallbackReason string) string {
	tier = strings.ToLower(strings.TrimSpace(firstNonEmptyValue(tier, "")))
	reason = strings.ToLower(strings.TrimSpace(firstNonEmptyValue(reason, fallbackReason)))
	if tier != "limited" {
		return ""
	}
	switch reason {
	case "preview_fallback_forced":
		return "Preview is running in safe mode due to compatibility safeguards. You can continue signing."
	case "source_import_failed", "source_not_pdf":
		return "This PDF preview is degraded due to source compatibility. You can continue signing."
	case "normalized_unavailable", "source_unavailable":
		return "A fallback preview is being used because the source document is temporarily unavailable."
	case "original_fallback_disallowed", "preview_fallback_disabled":
		return "Preview compatibility is degraded. Contact the sender if document rendering appears incorrect."
	default:
		return "This signing session is using a degraded preview mode for compatibility."
	}
}

func resolveSignerProfileMode() string {
	mode := strings.ToLower(strings.TrimSpace(appcfg.Active().Signer.ProfileMode))
	switch mode {
	case "hybrid", "remote_only", "local_only":
		return mode
	default:
		return "hybrid"
	}
}

func sessionToViewContext(session services.SignerSessionContext) router.ViewContext {
	fields := make([]map[string]any, 0, len(session.Fields))
	for _, f := range session.Fields {
		field := map[string]any{
			"id":                  f.ID,
			"field_instance_id":   firstNonEmptyValue(f.FieldInstanceID, f.ID),
			"field_definition_id": strings.TrimSpace(f.FieldDefinitionID),
			"recipient_id":        f.RecipientID,
			"type":                f.Type,
			"page":                f.Page,
			"pos_x":               f.PosX,
			"pos_y":               f.PosY,
			"width":               f.Width,
			"height":              f.Height,
			"page_width":          f.PageWidth,
			"page_height":         f.PageHeight,
			"page_rotation":       f.PageRotation,
			"required":            f.Required,
			"value_text":          f.ValueText,
		}
		if f.ValueBool != nil {
			field["value_bool"] = *f.ValueBool
		}
		if strings.TrimSpace(f.Label) != "" {
			field["label"] = strings.TrimSpace(f.Label)
		}
		if f.TabIndex > 0 {
			field["tab_index"] = f.TabIndex
		}
		fields = append(fields, field)
	}

	// Encode stage-related arrays as JSON for frontend (Task 24.FE.1)
	activeRecipientIDsJSON := "[]"
	waitingForRecipientIDsJSON := "[]"
	if len(session.ActiveRecipientIDs) > 0 {
		if encoded, err := json.Marshal(session.ActiveRecipientIDs); err == nil {
			activeRecipientIDsJSON = string(encoded)
		}
	}
	if len(session.WaitingForRecipientIDs) > 0 {
		if encoded, err := json.Marshal(session.WaitingForRecipientIDs); err == nil {
			waitingForRecipientIDsJSON = string(encoded)
		}
	}

	return router.ViewContext{
		"session_kind":                   session.SessionKind,
		"ui_mode":                        session.UIMode,
		"default_tab":                    session.DefaultTab,
		"viewer_mode":                    session.ViewerMode,
		"viewer_banner":                  session.ViewerBanner,
		"agreement_id":                   session.AgreementID,
		"agreement_status":               session.AgreementStatus,
		"document_name":                  firstNonEmptyValue(session.DocumentName, "Document.pdf"),
		"page_count":                     maxInt(session.PageCount, 1),
		"viewer":                         session.Viewer,
		"recipient_id":                   session.RecipientID,
		"recipient_email":                session.RecipientEmail,
		"recipient_name":                 session.RecipientName,
		"recipient_order":                session.RecipientOrder,
		"recipient_role":                 session.RecipientRole,
		"recipient_stage":                session.RecipientStage,
		"active_stage":                   session.ActiveStage,
		"state":                          session.State,
		"can_sign":                       session.CanSign,
		"has_consented":                  false,
		"fields":                         fields,
		"active_recipient":               session.ActiveRecipientID,
		"active_recipient_ids":           session.ActiveRecipientIDs,
		"active_recipient_ids_json":      activeRecipientIDsJSON,
		"waiting_recipient":              session.WaitingForRecipient,
		"waiting_for_recipient_ids":      session.WaitingForRecipientIDs,
		"waiting_for_recipient_ids_json": waitingForRecipientIDsJSON,
		"review_markers_visible":         session.ReviewMarkersVisible,
		"review_markers_interactive":     session.ReviewMarkersInteractive,
		"review":                         session.Review,
	}
}

func encodeFieldsJSON(fields []services.SignerSessionField) (string, error) {
	type fieldJSON struct {
		ID                string  `json:"id"`
		FieldInstanceID   string  `json:"field_instance_id"`
		FieldDefinitionID string  `json:"field_definition_id,omitempty"`
		RecipientID       string  `json:"recipient_id"`
		Type              string  `json:"type"`
		Page              int     `json:"page"`
		PosX              float64 `json:"pos_x"`
		PosY              float64 `json:"pos_y"`
		Width             float64 `json:"width"`
		Height            float64 `json:"height"`
		PageWidth         float64 `json:"page_width,omitempty"`
		PageHeight        float64 `json:"page_height,omitempty"`
		PageRotation      int     `json:"page_rotation"`
		Required          bool    `json:"required"`
		Label             string  `json:"label,omitempty"`
		TabIndex          int     `json:"tab_index,omitempty"`
		ValueText         string  `json:"value_text,omitempty"`
		ValueBool         *bool   `json:"value_bool,omitempty"`
	}
	out := make([]fieldJSON, 0, len(fields))
	for _, f := range fields {
		out = append(out, fieldJSON{
			ID:                f.ID,
			FieldInstanceID:   firstNonEmptyValue(f.FieldInstanceID, f.ID),
			FieldDefinitionID: strings.TrimSpace(f.FieldDefinitionID),
			RecipientID:       f.RecipientID,
			Type:              f.Type,
			Page:              f.Page,
			PosX:              f.PosX,
			PosY:              f.PosY,
			Width:             f.Width,
			Height:            f.Height,
			PageWidth:         f.PageWidth,
			PageHeight:        f.PageHeight,
			PageRotation:      f.PageRotation,
			Required:          f.Required,
			Label:             strings.TrimSpace(f.Label),
			TabIndex:          f.TabIndex,
			ValueText:         f.ValueText,
			ValueBool:         f.ValueBool,
		})
	}
	encoded, err := json.Marshal(out)
	if err != nil {
		return "[]", err
	}
	return string(encoded), nil
}

// encodeViewerPagesJSON encodes viewer page metadata for coordinate transforms (Task 19.FE.2)
func encodeViewerPagesJSON(pages []services.SignerSessionViewerPage) (string, error) {
	type pageJSON struct {
		Page     int     `json:"page"`
		Width    float64 `json:"width"`
		Height   float64 `json:"height"`
		Rotation int     `json:"rotation"`
	}
	out := make([]pageJSON, 0, len(pages))
	for _, p := range pages {
		out = append(out, pageJSON{
			Page:     p.Page,
			Width:    p.Width,
			Height:   p.Height,
			Rotation: p.Rotation,
		})
	}
	encoded, err := json.Marshal(out)
	if err != nil {
		return "[]", err
	}
	return string(encoded), nil
}

func maxInt(value, min int) int {
	if value < min {
		return min
	}
	return value
}

func firstNonEmptyValue(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
