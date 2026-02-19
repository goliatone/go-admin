package main

import (
	"context"
	"embed"
	"encoding/json"
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
	"github.com/goliatone/go-admin/examples/esign/modules"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/internal/templateview"
	"github.com/goliatone/go-admin/pkg/client"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
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
		ResolvePermissions: func(context.Context) ([]string, error) {
			return append([]string{}, provider.permissions...), nil
		},
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
	if err := validateESignTemplateOwnership(); err != nil {
		return nil, err
	}
	if err := validateESignRuntimeAssetContracts(); err != nil {
		return nil, err
	}
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
		quickstart.WithViewDebug(cfg.Debug.Enabled),
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
	contentEntryViewContext := quickstart.DefaultAdminUIViewContextBuilder(adm, cfg)
	googleEnabled := featureEnabledInSystemScope(adm.FeatureGate(), "esign_google")

	r.Get("/", func(c router.Context) error {
		return c.Redirect(basePath, http.StatusFound)
	})

	if err := quickstart.RegisterAdminUIRoutes(r, cfg, adm, authn); err != nil {
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
			return withESignDocumentIngestionViewContext(ctx, panelName, c, esignModule, googleEnabled)
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
				viewCtx := router.ViewContext{
					"api_base_path": apiBasePath,
					"stats": map[string]int{
						"draft":           0,
						"pending":         0,
						"completed":       0,
						"action_required": 0,
					},
					"recent_agreements": []map[string]any{},
				}
				viewCtx = withESignPageConfig(viewCtx, buildESignAdminLandingPageConfig(basePath, apiBasePath, googleEnabled))
				return viewCtx, nil
			},
		},
	); err != nil {
		return err
	}
	if err := registerESignGoogleIntegrationUIRoutes(r, cfg, adm, authn, routes, esignModule); err != nil {
		return err
	}

	// Register public signer web routes (no auth required)
	tokenSvc := esignModule.TokenService()
	if tokenSvc != nil {
		signerCfg := SignerWebRouteConfig{
			TokenValidator:       tokenSvc,
			SigningService:       esignModule.SigningService(),
			AssetContractService: esignModule.SignerAssetContractService(),
			DefaultScope:         esignModule.DefaultScope(),
			APIBasePath:          "/api/v1/esign/signing",
			AssetBasePath:        basePath,
		}
		if err := registerESignPublicSignerWebRoutes(r, signerCfg); err != nil {
			return err
		}
	}

	return nil
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

	landingPath := strings.TrimSpace(routes.AdminHome)
	if landingPath == "" {
		landingPath = path.Join(basePath, "esign")
	}
	documentsPath := path.Join(basePath, "content", "esign_documents")
	googleIntegrationPath := path.Join(basePath, "esign", "integrations", "google")
	googleCallbackPath := path.Join(googleIntegrationPath, "callback")
	googleDrivePickerPath := path.Join(googleIntegrationPath, "drive")
	apiBasePath := strings.TrimSpace(adm.AdminAPIBasePath())
	googleEnabled := featureEnabledInSystemScope(adm.FeatureGate(), "esign_google")
	if !googleEnabled {
		return nil
	}

	return quickstart.RegisterAdminPageRoutes(
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
					"google_client_id":    strings.TrimSpace(os.Getenv("ESIGN_GOOGLE_CLIENT_ID")),
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
					googleEnabled,
					viewContextRoutes(viewCtx),
				)
				if pageCfg.Context == nil {
					pageCfg.Context = map[string]any{}
				}
				pageCfg.Context["google_account_id"] = accountID
				viewCtx = withESignPageConfig(
					viewCtx,
					pageCfg,
				)
				return viewCtx, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       googleCallbackPath,
			Template:   "resources/esign-integrations/google-callback",
			Title:      "Google Authorization",
			Active:     "esign",
			Permission: permissions.AdminESignSettings,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				userID := resolveESignAdminUserID(c)
				accountID := resolveGoogleAccountID(c)
				pageCfg := buildESignGoogleIntegrationPageConfig(
					eSignPageGoogleCallback,
					basePath,
					apiBasePath,
					userID,
					googleEnabled,
					map[string]string{},
				)
				if pageCfg.Context == nil {
					pageCfg.Context = map[string]any{}
				}
				pageCfg.Context["google_account_id"] = accountID
				viewCtx := withESignPageConfig(
					router.ViewContext{
						"google_account_id": accountID,
					},
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
					googleEnabled,
					viewContextRoutes(viewCtx),
				)
				if pageCfg.Context == nil {
					pageCfg.Context = map[string]any{}
				}
				pageCfg.Context["google_account_id"] = accountID
				viewCtx = withESignPageConfig(
					viewCtx,
					pageCfg,
				)
				return viewCtx, nil
			},
		},
	)
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
			if meta != nil {
				objectKey = strings.TrimSpace(meta.Name)
			}
			return map[string]any{
				"url":        publicURL,
				"object_key": objectKey,
			}
		},
	})
	r.Post(routes.AdminDocumentsUpload, authn.WrapHandler(uploadHandler))
}

func resolveESignUploadScope(c router.Context, fallback stores.Scope) stores.Scope {
	scope := fallback
	if c == nil {
		return scope
	}
	tenantID := strings.TrimSpace(c.Query("tenant_id"))
	if tenantID == "" {
		tenantID = strings.TrimSpace(c.Header("X-Tenant-ID"))
	}
	if tenantID != "" {
		scope.TenantID = tenantID
	}
	orgID := strings.TrimSpace(c.Query("org_id"))
	if orgID == "" {
		orgID = strings.TrimSpace(c.Header("X-Org-ID"))
	}
	if orgID != "" {
		scope.OrgID = orgID
	}
	return scope
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
		if userID := strings.TrimSpace(c.Query("user_id")); userID != "" {
			return userID
		}
		if userID := strings.TrimSpace(c.Header("X-User-ID")); userID != "" {
			return userID
		}
	}
	return firstNonEmptyEnv("ESIGN_ADMIN_ID", defaultESignDemoAdminID)
}

func resolveGoogleAccountID(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Query("account_id"))
}

func withESignDocumentIngestionViewContext(
	ctx router.ViewContext,
	panelName string,
	c router.Context,
	esignModule *modules.ESignModule,
	googleEnabled bool,
) router.ViewContext {
	if ctx == nil {
		ctx = router.ViewContext{}
	}
	if strings.TrimSpace(panelName) != "esign_documents" {
		return ctx
	}
	userID := resolveESignAdminUserID(c)
	accountID := resolveGoogleAccountID(c)
	ctx["user_id"] = userID
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
	ctx = withESignPageConfig(
		ctx,
		pageCfg,
	)
	return ctx
}

func resolveGoogleOAuthRedirectURI(c router.Context, callbackPath string) string {
	if configured := strings.TrimSpace(os.Getenv(services.EnvGoogleOAuthRedirectURI)); configured != "" {
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
	if c == nil {
		return ""
	}
	scheme := firstCSVValue(c.Header("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = firstCSVValue(c.Header("X-Forwarded-Scheme"))
	}
	host := firstCSVValue(c.Header("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(c.Header("Host"))
	}
	if httpCtx, ok := c.(router.HTTPContext); ok && httpCtx != nil {
		request := httpCtx.Request()
		if request != nil {
			if host == "" {
				host = strings.TrimSpace(request.Host)
			}
			if scheme == "" && request.URL != nil {
				scheme = strings.TrimSpace(request.URL.Scheme)
			}
			if scheme == "" && request.TLS != nil {
				scheme = "https"
			}
		}
	}
	if scheme == "" {
		if strings.EqualFold(strings.TrimSpace(c.Header("X-Forwarded-SSL")), "on") {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}
	if host == "" {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(scheme)) + "://" + strings.TrimSpace(host)
}

func firstCSVValue(raw string) string {
	parts := strings.Split(strings.TrimSpace(raw), ",")
	if len(parts) == 0 {
		return ""
	}
	return strings.TrimSpace(parts[0])
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
	for key, value := range input {
		out[key] = value
	}
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

// SignerWebRouteConfig holds dependencies for public signer web routes.
type SignerWebRouteConfig struct {
	TokenValidator       handlers.SignerTokenValidator
	SigningService       handlers.SignerSessionService
	AssetContractService handlers.SignerAssetContractService
	DefaultScope         stores.Scope
	APIBasePath          string
	AssetBasePath        string
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

	// GET /sign/:token - Unified signer entrypoint.
	r.Get("/sign/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// Alias: /esign/sign/:token (template compatibility).
	r.Get("/esign/sign/:token", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// GET /sign/:token/review - Unified signer page
	r.Get("/sign/:token/review", func(c router.Context) error {
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

func renderSignerReviewPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	startedAt := time.Now()
	applySignerSecurityHeaders(c, true)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err != nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return handleSignerTokenError(c, cfg, apiBasePath, err, token)
	}

	session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
	if err != nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}
	if !canRenderUnifiedSession(session) {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}

	observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), true)
	observability.ObserveSignerLinkOpen(c.Context(), true)
	viewCtx := withESignPageConfig(
		buildSignerReviewViewContext(token, apiBasePath, session),
		buildESignSignerPageConfig(eSignPageSignerReview, cfg.AssetBasePath, apiBasePath, token),
	)
	return templateview.RenderTemplateView(c, "esign-signer/review", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func canRenderUnifiedSession(session services.SignerSessionContext) bool {
	if strings.TrimSpace(session.DocumentName) == "" {
		return false
	}
	if session.PageCount <= 0 {
		return false
	}
	if len(session.Fields) == 0 {
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

func buildSignerReviewViewContext(token, apiBasePath string, session services.SignerSessionContext) router.ViewContext {
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

	sessionCtx := sessionToViewContext(session)
	sessionCtx["fields_json"] = fieldsJSON
	sessionCtx["viewer"] = session.Viewer

	// Build viewer context with pages_json for frontend
	viewerCtx := map[string]any{
		"coordinate_space": firstNonEmptyValue(session.Viewer.CoordinateSpace, "pdf"),
		"contract_version": firstNonEmptyValue(session.Viewer.ContractVersion, "1.0"),
		"unit":             firstNonEmptyValue(session.Viewer.Unit, "pt"),
		"origin":           firstNonEmptyValue(session.Viewer.Origin, "top-left"),
		"y_axis_direction": firstNonEmptyValue(session.Viewer.YAxisDirection, "down"),
		"pages_json":       viewerPagesJSON,
	}

	return router.ViewContext{
		"token":         token,
		"api_base_path": apiBasePath,
		"flow_mode":     signerFlowModeUnified,
		"session":       sessionCtx,
		"viewer":        viewerCtx,
		"agreement": map[string]any{
			"title":         "Agreement",
			"status":        session.AgreementStatus,
			"page_count":    maxInt(session.PageCount, 1),
			"document_name": firstNonEmptyValue(session.DocumentName, "Document.pdf"),
		},
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
		"has_consented":                  false,
		"fields":                         fields,
		"active_recipient":               session.ActiveRecipientID,
		"active_recipient_ids":           session.ActiveRecipientIDs,
		"active_recipient_ids_json":      activeRecipientIDsJSON,
		"waiting_recipient":              session.WaitingForRecipient,
		"waiting_for_recipient_ids":      session.WaitingForRecipientIDs,
		"waiting_for_recipient_ids_json": waitingForRecipientIDsJSON,
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

func firstNonEmptyValue(value, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed != "" {
		return trimmed
	}
	return strings.TrimSpace(fallback)
}
