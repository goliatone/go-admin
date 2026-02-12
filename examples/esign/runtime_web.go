package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log/slog"
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
	envSignerFlowMode             = "ESIGN_SIGNER_FLOW_MODE"
	envSignerUnifiedKillSwitch    = "ESIGN_SIGNER_UNIFIED_KILL_SWITCH"
	envSignerUnifiedTargetTenants = "ESIGN_SIGNER_UNIFIED_TARGET_TENANTS"
	envSignerUnifiedTargetOrgs    = "ESIGN_SIGNER_UNIFIED_TARGET_ORGS"
	envSignerUnifiedTargetUsers   = "ESIGN_SIGNER_UNIFIED_TARGET_USERS"
	signerFlowModeLegacy          = "legacy"
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
			DefaultFlowMode:      firstNonEmptyEnv(envSignerFlowMode, signerFlowModeLegacy),
			RolloutPolicy:        resolveSignerFlowRolloutPolicyFromEnv(),
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
				return router.ViewContext{
					"api_base_path":    apiBasePath,
					"google_enabled":   googleEnabled,
					"google_client_id": strings.TrimSpace(os.Getenv("ESIGN_GOOGLE_CLIENT_ID")),
					"user_id":          userID,
					"routes": map[string]any{
						"esign_settings":      landingPath,
						"esign_documents":     documentsPath,
						"esign_google_picker": googleDrivePickerPath,
					},
				}, nil
			},
		},
		quickstart.AdminPageSpec{
			Path:       googleCallbackPath,
			Template:   "resources/esign-integrations/google-callback",
			Title:      "Google Authorization",
			Active:     "esign",
			Permission: permissions.AdminESignSettings,
		},
		quickstart.AdminPageSpec{
			Path:       googleDrivePickerPath,
			Template:   "resources/esign-integrations/google-drive-picker",
			Title:      "Import from Google Drive",
			Active:     "esign",
			Permission: permissions.AdminESignCreate,
			BuildContext: func(c router.Context) (router.ViewContext, error) {
				userID := resolveESignAdminUserID(c)
				scope := stores.Scope{TenantID: "tenant-bootstrap", OrgID: "org-bootstrap"}
				if esignModule != nil {
					scope = resolveESignUploadScope(c, esignModule.DefaultScope())
				}
				googleConnected := esignModule != nil && esignModule.GoogleConnected(c.Context(), scope, userID)
				return router.ViewContext{
					"api_base_path":    apiBasePath,
					"user_id":          userID,
					"google_connected": googleConnected,
					"routes": map[string]any{
						"esign_settings":  landingPath,
						"esign_documents": documentsPath,
					},
				}, nil
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
	DefaultFlowMode      string
	RolloutPolicy        SignerFlowRolloutPolicy
}

// SignerFlowRolloutPolicy controls scoped unified-flow rollout and emergency fallback behavior.
type SignerFlowRolloutPolicy struct {
	KillSwitch bool
	Tenants    map[string]bool
	Orgs       map[string]bool
	Users      map[string]bool
}

func resolveSignerFlowRolloutPolicyFromEnv() SignerFlowRolloutPolicy {
	return SignerFlowRolloutPolicy{
		KillSwitch: envBool(envSignerUnifiedKillSwitch, false),
		Tenants:    parseCSVSet(os.Getenv(envSignerUnifiedTargetTenants)),
		Orgs:       parseCSVSet(os.Getenv(envSignerUnifiedTargetOrgs)),
		Users:      parseCSVSet(os.Getenv(envSignerUnifiedTargetUsers)),
	}
}

func parseCSVSet(raw string) map[string]bool {
	out := map[string]bool{}
	for _, part := range strings.Split(raw, ",") {
		value := strings.ToLower(strings.TrimSpace(part))
		if value == "" {
			continue
		}
		out[value] = true
	}
	return out
}

const (
	signerFlowReasonDefaultMode        = "default_mode"
	signerFlowReasonKillSwitch         = "kill_switch"
	signerFlowReasonRolloutScopeDenied = "rollout_scope_denied"
	signerFlowReasonReviewBootFallback = "review_boot_fallback"
	signerFlowReasonQueryOverride      = "query_override"
)

type signerFlowResolution struct {
	Mode   string
	Reason string
	Inputs map[string]any
}

func (p SignerFlowRolloutPolicy) hasTargets() bool {
	return len(p.Tenants) > 0 || len(p.Orgs) > 0 || len(p.Users) > 0
}

func (p SignerFlowRolloutPolicy) allowsUnified(token stores.SigningTokenRecord) bool {
	if p.KillSwitch {
		return false
	}
	if !p.hasTargets() {
		return true
	}
	tenantID := strings.ToLower(strings.TrimSpace(token.TenantID))
	orgID := strings.ToLower(strings.TrimSpace(token.OrgID))
	userID := strings.ToLower(strings.TrimSpace(token.RecipientID))
	return p.Tenants[tenantID] || p.Orgs[orgID] || p.Users[userID]
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

	// GET /sign/:token - Main session/consent entrypoint
	r.Get("/sign/:token", func(c router.Context) error {
		return renderSignerEntryPoint(c, signerCfg, apiBasePath, "/sign")
	})

	// Alias: /esign/sign/:token (for template URL pattern compatibility)
	r.Get("/esign/sign/:token", func(c router.Context) error {
		return renderSignerEntryPoint(c, signerCfg, apiBasePath, "/esign/sign")
	})

	// GET /sign/:token/review - Unified signer page
	r.Get("/sign/:token/review", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/sign/:token/review", func(c router.Context) error {
		return renderSignerReviewPage(c, signerCfg, apiBasePath)
	})

	// GET /sign/:token/fields - Field completion page
	r.Get("/sign/:token/fields", func(c router.Context) error {
		return renderSignerFieldsPage(c, signerCfg, apiBasePath)
	})
	r.Get("/esign/sign/:token/fields", func(c router.Context) error {
		return renderSignerFieldsPage(c, signerCfg, apiBasePath)
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

	// GET /api/v1/esign/signing/flow-diagnostics/:token - Debug-safe flow-resolution diagnostics.
	r.Get(path.Join(apiBasePath, "flow-diagnostics", ":token"), func(c router.Context) error {
		return renderSignerFlowDiagnostics(c, signerCfg)
	})

	return nil
}

func renderSignerEntryPoint(c router.Context, cfg SignerWebRouteConfig, apiBasePath, entryBasePath string) error {
	resolution := resolveSignerFlowResolution(c, cfg)
	if resolution.Mode == signerFlowModeUnified {
		token := strings.TrimSpace(c.Param("token"))
		if token == "" {
			observability.ObserveSignerLinkOpen(c.Context(), false)
			return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
		}
		if cfg.RolloutPolicy.hasTargets() {
			tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
			if err != nil {
				return handleSignerTokenError(c, cfg, apiBasePath, err, token)
			}
			if !cfg.RolloutPolicy.allowsUnified(tokenRecord) {
				resolution.Mode = signerFlowModeLegacy
				resolution.Reason = signerFlowReasonRolloutScopeDenied
				resolution.Inputs["rollout_scope_allowed"] = false
				enrichFlowResolutionTokenInputs(&resolution, tokenRecord)
				logSignerFlowResolution(c.Context(), resolution)
				session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
				if err != nil {
					observability.ObserveSignerLinkOpen(c.Context(), false)
					return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
				}
				observability.ObserveSignerLinkOpen(c.Context(), true)
				viewCtx := buildSignerSessionViewContext(token, apiBasePath, session, nil)
				return c.Render("esign-signer/session", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
			}
			resolution.Inputs["rollout_scope_allowed"] = true
			enrichFlowResolutionTokenInputs(&resolution, tokenRecord)
		}
		redirectPath := strings.TrimSpace(entryBasePath)
		if redirectPath == "" {
			redirectPath = "/sign"
		}
		return c.Redirect(appendFlowQuery(path.Join(redirectPath, token, "review"), signerFlowModeUnified), http.StatusFound)
	}
	logSignerFlowResolution(c.Context(), resolution)
	return renderSignerSessionPage(c, cfg, apiBasePath)
}

func resolveSignerFlowMode(c router.Context, cfg SignerWebRouteConfig) string {
	return resolveSignerFlowResolution(c, cfg).Mode
}

func resolveSignerFlowResolution(c router.Context, cfg SignerWebRouteConfig) signerFlowResolution {
	defaultMode := normalizeSignerFlowMode(cfg.DefaultFlowMode)
	if defaultMode == "" {
		defaultMode = normalizeSignerFlowMode(firstNonEmptyEnv(envSignerFlowMode, signerFlowModeLegacy))
	}
	if defaultMode == "" {
		defaultMode = signerFlowModeLegacy
	}
	resolution := signerFlowResolution{
		Mode:   defaultMode,
		Reason: signerFlowReasonDefaultMode,
		Inputs: map[string]any{
			"default_mode":            defaultMode,
			"kill_switch":             cfg.RolloutPolicy.KillSwitch,
			"rollout_has_targets":     cfg.RolloutPolicy.hasTargets(),
			"rollout_target_tenants":  len(cfg.RolloutPolicy.Tenants),
			"rollout_target_orgs":     len(cfg.RolloutPolicy.Orgs),
			"rollout_target_users":    len(cfg.RolloutPolicy.Users),
			"query_override":          "",
			"review_boot_fallback":    false,
			"rollout_scope_allowed":   nil,
			"token_validation_result": "",
		},
	}
	if cfg.RolloutPolicy.KillSwitch {
		resolution.Mode = signerFlowModeLegacy
		resolution.Reason = signerFlowReasonKillSwitch
		return resolution
	}
	if c == nil {
		return resolution
	}
	if requested := normalizeSignerFlowMode(c.Query("flow")); requested != "" {
		resolution.Mode = requested
		resolution.Reason = signerFlowReasonQueryOverride
		resolution.Inputs["query_override"] = requested
		return resolution
	}
	// Safe fallback path for unified boot failures redirecting back from /review.
	referer := strings.ToLower(strings.TrimSpace(c.Header("Referer")))
	if resolution.Mode == signerFlowModeUnified && strings.Contains(referer, "/sign/") && strings.Contains(referer, "/review") {
		resolution.Mode = signerFlowModeLegacy
		resolution.Reason = signerFlowReasonReviewBootFallback
		resolution.Inputs["review_boot_fallback"] = true
	}
	return resolution
}

func enrichFlowResolutionTokenInputs(resolution *signerFlowResolution, token stores.SigningTokenRecord) {
	if resolution == nil {
		return
	}
	if resolution.Inputs == nil {
		resolution.Inputs = map[string]any{}
	}
	resolution.Inputs["token_validation_result"] = "valid"
	resolution.Inputs["token_scope_tenant"] = strings.TrimSpace(token.TenantID)
	resolution.Inputs["token_scope_org"] = strings.TrimSpace(token.OrgID)
	resolution.Inputs["agreement_id"] = strings.TrimSpace(token.AgreementID)
	resolution.Inputs["recipient_id"] = strings.TrimSpace(token.RecipientID)
}

func classifyTokenValidationResult(err error) string {
	if err == nil {
		return "valid"
	}
	msg := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(msg, "expired"):
		return "expired"
	case strings.Contains(msg, "revoked"), strings.Contains(msg, "invalidated"):
		return "revoked"
	case strings.Contains(msg, "scope"):
		return "scope_denied"
	default:
		return "invalid"
	}
}

func logSignerFlowResolution(ctx context.Context, resolution signerFlowResolution) {
	fields := map[string]any{
		"reason":               strings.TrimSpace(resolution.Reason),
		"resolved_mode":        strings.TrimSpace(resolution.Mode),
		"default_mode":         resolution.Inputs["default_mode"],
		"kill_switch":          resolution.Inputs["kill_switch"],
		"query_override":       resolution.Inputs["query_override"],
		"review_boot_fallback": resolution.Inputs["review_boot_fallback"],
		"rollout_has_targets":  resolution.Inputs["rollout_has_targets"],
	}
	for _, key := range []string{"rollout_target_tenants", "rollout_target_orgs", "rollout_target_users", "rollout_scope_allowed", "token_scope_tenant", "token_scope_org", "agreement_id", "recipient_id"} {
		if value, ok := resolution.Inputs[key]; ok {
			fields[key] = value
		}
	}
	level := slog.LevelInfo
	if strings.TrimSpace(resolution.Mode) == signerFlowModeLegacy {
		level = slog.LevelWarn
	}
	correlationID := observability.ResolveCorrelationID("signer_flow_resolver", strings.TrimSpace(resolution.Reason), strings.TrimSpace(resolution.Mode))
	observability.LogOperation(ctx, level, "web", "signer_flow_resolver", strings.TrimSpace(resolution.Mode), correlationID, 0, nil, fields)
}

func normalizeSignerFlowMode(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case signerFlowModeLegacy:
		return signerFlowModeLegacy
	case signerFlowModeUnified:
		return signerFlowModeUnified
	default:
		return ""
	}
}

func appendFlowQuery(rawPath, flow string) string {
	trimmedPath := strings.TrimSpace(rawPath)
	mode := normalizeSignerFlowMode(flow)
	if trimmedPath == "" || mode == "" {
		return trimmedPath
	}
	separator := "?"
	if strings.Contains(trimmedPath, "?") {
		separator = "&"
	}
	return trimmedPath + separator + "flow=" + mode
}

func renderSignerFlowDiagnostics(c router.Context, cfg SignerWebRouteConfig) error {
	if c == nil {
		return nil
	}
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		return c.Status(http.StatusBadRequest).JSON(http.StatusBadRequest, map[string]any{
			"error": map[string]any{
				"code":    string(services.ErrorCodeMissingRequiredFields),
				"message": "token is required",
			},
		})
	}

	resolution := resolveSignerFlowResolution(c, cfg)
	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err != nil {
		resolution.Inputs["token_validation_result"] = classifyTokenValidationResult(err)
	} else {
		enrichFlowResolutionTokenInputs(&resolution, tokenRecord)
		if resolution.Mode == signerFlowModeUnified && cfg.RolloutPolicy.hasTargets() {
			allowed := cfg.RolloutPolicy.allowsUnified(tokenRecord)
			resolution.Inputs["rollout_scope_allowed"] = allowed
			if !allowed {
				resolution.Mode = signerFlowModeLegacy
				resolution.Reason = signerFlowReasonRolloutScopeDenied
			}
		}
	}

	return c.JSON(http.StatusOK, map[string]any{
		"status": "ok",
		"decision": map[string]any{
			"mode":   strings.TrimSpace(resolution.Mode),
			"reason": strings.TrimSpace(resolution.Reason),
		},
		"inputs": resolution.Inputs,
	})
}

func renderSignerSessionPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	applySignerSecurityHeaders(c, false)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err != nil {
		return handleSignerTokenError(c, cfg, apiBasePath, err, token)
	}

	session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
	if err != nil {
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}

	observability.ObserveSignerLinkOpen(c.Context(), true)
	viewCtx := buildSignerSessionViewContext(token, apiBasePath, session, nil)
	return c.Render("esign-signer/session", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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
	if !cfg.RolloutPolicy.allowsUnified(tokenRecord) {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return c.Redirect(appendFlowQuery(path.Join("/sign", token), signerFlowModeLegacy), http.StatusFound)
	}

	session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
	if err != nil {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		observability.ObserveSignerLinkOpen(c.Context(), false)
		return c.Redirect(appendFlowQuery(path.Join("/sign", token), signerFlowModeLegacy), http.StatusFound)
	}
	if !canRenderUnifiedSession(session) {
		observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), false)
		return c.Redirect(appendFlowQuery(path.Join("/sign", token), signerFlowModeLegacy), http.StatusFound)
	}

	observability.ObserveUnifiedViewerLoad(c.Context(), time.Since(startedAt), true)
	observability.ObserveSignerLinkOpen(c.Context(), true)
	viewCtx := buildSignerReviewViewContext(token, apiBasePath, session)
	return c.Render("esign-signer/review", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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

func renderSignerFieldsPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath string) error {
	applySignerSecurityHeaders(c, false)
	token := strings.TrimSpace(c.Param("token"))
	if token == "" {
		return renderSignerErrorPage(c, cfg, apiBasePath, "INVALID_TOKEN", "Invalid Link", "The signing link is missing or invalid.")
	}

	tokenRecord, err := validateSignerToken(c.Context(), cfg, token)
	if err != nil {
		return handleSignerTokenError(c, cfg, apiBasePath, err, token)
	}

	session, err := cfg.SigningService.GetSession(c.Context(), cfg.DefaultScope, tokenRecord)
	if err != nil {
		return renderSignerErrorPage(c, cfg, apiBasePath, "SESSION_ERROR", "Unable to Load Session", "We couldn't load your signing session. Please try again or contact the sender.")
	}

	// Redirect to session page if not in active state
	if session.State != services.SignerSessionStateActive {
		return c.Redirect(appendFlowQuery("/sign/"+token, signerFlowModeLegacy), http.StatusFound)
	}

	viewCtx := buildSignerFieldsViewContext(token, apiBasePath, session)
	return c.Render("esign-signer/fields", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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
		return c.Render("esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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
		return c.Render("esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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
	return c.Render("esign-signer/complete", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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

	return c.Render("esign-signer/declined", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
}

func renderSignerErrorPage(c router.Context, cfg SignerWebRouteConfig, apiBasePath, errorCode, errorTitle, errorMessage string) error {
	applySignerSecurityHeaders(c, false)
	viewCtx := router.ViewContext{
		"api_base_path": apiBasePath,
		"error_code":    errorCode,
		"error_title":   errorTitle,
		"error_message": errorMessage,
	}
	return c.Render("esign-signer/error", signerTemplateViewContext(cfg, apiBasePath, viewCtx))
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

func buildSignerSessionViewContext(token, apiBasePath string, session services.SignerSessionContext, agreement map[string]any) router.ViewContext {
	if agreement == nil {
		pageCount := session.PageCount
		if pageCount <= 0 {
			pageCount = 1
		}
		documentName := strings.TrimSpace(session.DocumentName)
		if documentName == "" {
			documentName = "Document.pdf"
		}
		agreement = map[string]any{
			"title":         "Agreement",
			"status":        session.AgreementStatus,
			"page_count":    pageCount,
			"document_name": documentName,
			"sender_email":  "",
			"total_signers": 1,
		}
	}

	return router.ViewContext{
		"token":         token,
		"api_base_path": apiBasePath,
		"session":       sessionToViewContext(session),
		"agreement":     agreement,
	}
}

func buildSignerFieldsViewContext(token, apiBasePath string, session services.SignerSessionContext) router.ViewContext {
	fieldsJSON := "[]"
	if len(session.Fields) > 0 {
		if encoded, err := encodeFieldsJSON(session.Fields); err == nil {
			fieldsJSON = encoded
		}
	}

	sessionCtx := sessionToViewContext(session)
	sessionCtx["fields_json"] = fieldsJSON

	return router.ViewContext{
		"token":         token,
		"api_base_path": apiBasePath,
		"session":       sessionCtx,
		"agreement": map[string]any{
			"title":         "Agreement",
			"status":        session.AgreementStatus,
			"page_count":    maxInt(session.PageCount, 1),
			"document_name": firstNonEmptyValue(session.DocumentName, "Document.pdf"),
		},
	}
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
		"token":            token,
		"api_base_path":    apiBasePath,
		"flow_mode":        signerFlowModeUnified,
		"legacy_base_path": "/sign",
		"session":          sessionCtx,
		"viewer":           viewerCtx,
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
			"id":            f.ID,
			"recipient_id":  f.RecipientID,
			"type":          f.Type,
			"page":          f.Page,
			"pos_x":         f.PosX,
			"pos_y":         f.PosY,
			"width":         f.Width,
			"height":        f.Height,
			"page_width":    f.PageWidth,
			"page_height":   f.PageHeight,
			"page_rotation": f.PageRotation,
			"required":      f.Required,
			"value_text":    f.ValueText,
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

	return router.ViewContext{
		"agreement_id":      session.AgreementID,
		"agreement_status":  session.AgreementStatus,
		"document_name":     firstNonEmptyValue(session.DocumentName, "Document.pdf"),
		"page_count":        maxInt(session.PageCount, 1),
		"viewer":            session.Viewer,
		"recipient_id":      session.RecipientID,
		"recipient_email":   session.RecipientEmail,
		"recipient_name":    session.RecipientName,
		"recipient_order":   session.RecipientOrder,
		"recipient_role":    session.RecipientRole,
		"state":             session.State,
		"has_consented":     false,
		"fields":            fields,
		"active_recipient":  session.ActiveRecipientID,
		"waiting_recipient": session.WaitingForRecipient,
	}
}

func encodeFieldsJSON(fields []services.SignerSessionField) (string, error) {
	type fieldJSON struct {
		ID           string  `json:"id"`
		RecipientID  string  `json:"recipient_id"`
		Type         string  `json:"type"`
		Page         int     `json:"page"`
		PosX         float64 `json:"pos_x"`
		PosY         float64 `json:"pos_y"`
		Width        float64 `json:"width"`
		Height       float64 `json:"height"`
		PageWidth    float64 `json:"page_width,omitempty"`
		PageHeight   float64 `json:"page_height,omitempty"`
		PageRotation int     `json:"page_rotation"`
		Required     bool    `json:"required"`
		Label        string  `json:"label,omitempty"`
		TabIndex     int     `json:"tab_index,omitempty"`
		ValueText    string  `json:"value_text,omitempty"`
		ValueBool    *bool   `json:"value_bool,omitempty"`
	}
	out := make([]fieldJSON, 0, len(fields))
	for _, f := range fields {
		out = append(out, fieldJSON{
			ID:           f.ID,
			RecipientID:  f.RecipientID,
			Type:         f.Type,
			Page:         f.Page,
			PosX:         f.PosX,
			PosY:         f.PosY,
			Width:        f.Width,
			Height:       f.Height,
			PageWidth:    f.PageWidth,
			PageHeight:   f.PageHeight,
			PageRotation: f.PageRotation,
			Required:     f.Required,
			Label:        strings.TrimSpace(f.Label),
			TabIndex:     f.TabIndex,
			ValueText:    f.ValueText,
			ValueBool:    f.ValueBool,
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
