package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-uploader"
)

const (
	esignAuthzResource = "esign"
)

var errResponseHandled = errors.New("response handled")

// Permissions captures the e-sign admin permission set.
type Permissions struct {
	AdminView     string
	AdminCreate   string
	AdminEdit     string
	AdminSend     string
	AdminVoid     string
	AdminDownload string
	AdminSettings string
}

// DefaultPermissions is the canonical admin permission matrix for e-sign endpoints.
var DefaultPermissions = Permissions{
	AdminView:     permissions.AdminESignView,
	AdminCreate:   permissions.AdminESignCreate,
	AdminEdit:     permissions.AdminESignEdit,
	AdminSend:     permissions.AdminESignSend,
	AdminVoid:     permissions.AdminESignVoid,
	AdminDownload: permissions.AdminESignDownload,
	AdminSettings: permissions.AdminESignSettings,
}

type registerConfig struct {
	authorizer        coreadmin.Authorizer
	tokenValidator    SignerTokenValidator
	signerSession     SignerSessionService
	signerAssets      SignerAssetContractService
	agreementDelivery AgreementDeliveryService
	objectStore       SignerObjectStore
	agreements        AgreementStatsService
	auditEvents       stores.AuditEventStore
	google            GoogleIntegrationService
	googleEnabled     bool
	documentUpload    router.HandlerFunc
	permissions       Permissions
	defaultScope      stores.Scope
	scopeResolver     ScopeResolver
	actorScope        ActorScopeResolver
	transportGuard    TransportGuard
	rateLimiter       RequestRateLimiter
	securityLogEvent  SecurityLogEvent
}

func defaultRegisterConfig() registerConfig {
	return registerConfig{
		permissions:   DefaultPermissions,
		scopeResolver: defaultScopeResolver,
		actorScope:    defaultActorScopeResolver,
	}
}

// SignerTokenValidator validates signer tokens against scope constraints.
type SignerTokenValidator interface {
	Validate(ctx context.Context, scope stores.Scope, rawToken string) (stores.SigningTokenRecord, error)
}

// SignerSessionService handles signer session and field-value lifecycle operations.
type SignerSessionService interface {
	GetSession(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (services.SignerSessionContext, error)
	CaptureConsent(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerConsentInput) (services.SignerConsentResult, error)
	UpsertFieldValue(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerFieldValueInput) (stores.FieldValueRecord, error)
	IssueSignatureUpload(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerSignatureUploadInput) (services.SignerSignatureUploadContract, error)
	ConfirmSignatureUpload(ctx context.Context, scope stores.Scope, input services.SignerSignatureUploadCommitInput) (services.SignerSignatureUploadCommitResult, error)
	AttachSignatureArtifact(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerSignatureInput) (services.SignerSignatureResult, error)
	Submit(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerSubmitInput) (services.SignerSubmitResult, error)
	Decline(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord, input services.SignerDeclineInput) (services.SignerDeclineResult, error)
}

// SignerAssetContractService resolves token-scoped signer asset contract metadata.
type SignerAssetContractService interface {
	Resolve(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (services.SignerAssetContract, error)
}

// AgreementDeliveryService resolves agreement-level artifact delivery metadata for admin downloads.
type AgreementDeliveryService interface {
	AgreementDeliveryDetail(ctx context.Context, scope stores.Scope, agreementID string) (services.AgreementDeliveryDetail, error)
}

// SignerObjectStore resolves and persists signer-facing asset/signature blobs by object key.
type SignerObjectStore interface {
	GetFile(ctx context.Context, path string) ([]byte, error)
	UploadFile(ctx context.Context, path string, content []byte, opts ...uploader.UploadOption) (string, error)
}

// AgreementStatsService captures agreement listing operations needed for admin summary cards.
type AgreementStatsService interface {
	ListAgreements(ctx context.Context, scope stores.Scope, query stores.AgreementQuery) ([]stores.AgreementRecord, error)
}

// GoogleIntegrationService captures Google OAuth/Drive/import backend operations.
type GoogleIntegrationService interface {
	Connect(ctx context.Context, scope stores.Scope, input services.GoogleConnectInput) (services.GoogleOAuthStatus, error)
	Disconnect(ctx context.Context, scope stores.Scope, userID string) error
	RotateCredentialEncryption(ctx context.Context, scope stores.Scope, userID string) (services.GoogleOAuthStatus, error)
	Status(ctx context.Context, scope stores.Scope, userID string) (services.GoogleOAuthStatus, error)
	SearchFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	BrowseFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	ImportDocument(ctx context.Context, scope stores.Scope, input services.GoogleImportInput) (services.GoogleImportResult, error)
}

// ScopeResolver resolves tenant/org scope from request context.
type ScopeResolver func(c router.Context, fallback stores.Scope) stores.Scope

// ActorScopeResolver resolves authenticated actor scope from request context.
type ActorScopeResolver func(c router.Context) stores.Scope

// TransportGuard validates transport-level security requirements.
type TransportGuard interface {
	Ensure(c router.Context) error
}

// RequestRateLimiter checks whether a request can proceed.
type RequestRateLimiter interface {
	Allow(operationKey, key string) bool
}

// SecurityLogEvent records security-relevant events.
type SecurityLogEvent func(event string, fields map[string]any)

// RegisterOption customizes route registration behavior.
type RegisterOption func(*registerConfig)

// WithAuthorizer configures request-level admin authorization checks.
func WithAuthorizer(authz coreadmin.Authorizer) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.authorizer = authz
	}
}

// WithPermissions overrides the default e-sign permission matrix.
func WithPermissions(permissions Permissions) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.permissions = permissions
	}
}

// WithSignerTokenValidator enables signer token validation on signer endpoints.
func WithSignerTokenValidator(validator SignerTokenValidator) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.tokenValidator = validator
	}
}

// WithSignerSessionService configures signer session context retrieval.
func WithSignerSessionService(service SignerSessionService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.signerSession = service
	}
}

// WithSignerAssetContractService configures token-scoped asset contract resolution for signer links.
func WithSignerAssetContractService(service SignerAssetContractService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.signerAssets = service
	}
}

// WithAgreementDeliveryService configures agreement-level artifact delivery resolution for admin artifact downloads.
func WithAgreementDeliveryService(service AgreementDeliveryService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.agreementDelivery = service
	}
}

// WithSignerObjectStore configures signer binary asset/signature object I/O.
func WithSignerObjectStore(store SignerObjectStore) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.objectStore = store
	}
}

// WithAgreementStatsService configures agreement list access for summary statistics endpoints.
func WithAgreementStatsService(service AgreementStatsService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.agreements = service
	}
}

// WithAuditEventStore configures append-only audit event persistence for signer asset access.
func WithAuditEventStore(store stores.AuditEventStore) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.auditEvents = store
	}
}

// WithGoogleIntegrationService configures Google OAuth/Drive/import backend service.
func WithGoogleIntegrationService(service GoogleIntegrationService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.google = service
	}
}

// WithGoogleIntegrationEnabled toggles Google integration route registration.
func WithGoogleIntegrationEnabled(enabled bool) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.googleEnabled = enabled
	}
}

// WithDocumentUploadHandler configures the admin document upload endpoint handler.
func WithDocumentUploadHandler(handler router.HandlerFunc) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.documentUpload = handler
	}
}

// WithDefaultScope sets a fallback scope when request scope fields are not provided.
func WithDefaultScope(scope stores.Scope) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.defaultScope = scope
	}
}

// WithScopeResolver overrides request scope resolution behavior.
func WithScopeResolver(resolver ScopeResolver) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil || resolver == nil {
			return
		}
		cfg.scopeResolver = resolver
	}
}

// WithActorScopeResolver overrides actor scope extraction used for boundary checks.
func WithActorScopeResolver(resolver ActorScopeResolver) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil || resolver == nil {
			return
		}
		cfg.actorScope = resolver
	}
}

// WithTransportGuard enforces transport-level security checks.
func WithTransportGuard(guard TransportGuard) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.transportGuard = guard
	}
}

// WithRequestRateLimiter applies request rate limiting to security-sensitive endpoints.
func WithRequestRateLimiter(limiter RequestRateLimiter) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.rateLimiter = limiter
	}
}

// WithSecurityLogEvent captures redacted security events from authz/token checks.
func WithSecurityLogEvent(handler SecurityLogEvent) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.securityLogEvent = handler
	}
}

func buildRegisterConfig(options []RegisterOption) registerConfig {
	cfg := defaultRegisterConfig()
	for _, opt := range options {
		if opt == nil {
			continue
		}
		opt(&cfg)
	}
	return cfg
}

func requireAdminPermission(cfg registerConfig, permission string) router.MiddlewareFunc {
	required := strings.TrimSpace(permission)
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			if required == "" || cfg.authorizer == nil || authorizerAllows(c, cfg.authorizer, required) {
				if err := enforceScopeBoundary(c, cfg); err != nil {
					return asHandlerError(err)
				}
				return next(c)
			}
			cfg.logSecurityEvent("admin.authz.denied", map[string]any{
				"permission": required,
				"path":       c.Path(),
				"method":     c.Method(),
				"ip":         c.IP(),
			})
			return writeAPIError(c, goerrors.New("permission denied", goerrors.CategoryAuthz).
				WithCode(http.StatusForbidden).
				WithTextCode(string(services.ErrorCodeScopeDenied)).
				WithMetadata(map[string]any{"permission": required, "resource": esignAuthzResource}), http.StatusForbidden, string(services.ErrorCodeScopeDenied), "permission denied", nil)
		}
	}
}

func authorizerAllows(c router.Context, authorizer coreadmin.Authorizer, permission string) bool {
	if authorizer == nil || c == nil {
		return false
	}
	permission = strings.TrimSpace(permission)
	if permission == "" {
		return true
	}
	if authorizer.Can(c.Context(), permission, esignAuthzResource) {
		return true
	}
	parts := strings.Split(permission, ".")
	if len(parts) < 2 {
		return false
	}
	action := strings.TrimSpace(parts[len(parts)-1])
	resource := strings.TrimSpace(strings.Join(parts[:len(parts)-1], "."))
	if action == "" || resource == "" {
		return false
	}
	return authorizer.Can(c.Context(), action, resource)
}

func enforceScopeBoundary(c router.Context, cfg registerConfig) error {
	requestScope := cfg.resolveScope(c)
	actorScope := cfg.resolveActorScope(c)
	if actorScope.TenantID == "" && actorScope.OrgID == "" {
		return nil
	}
	if !scopeConflict(actorScope, requestScope) {
		return nil
	}
	cfg.logSecurityEvent("scope.boundary.denied", map[string]any{
		"actor_tenant_id":   actorScope.TenantID,
		"actor_org_id":      actorScope.OrgID,
		"request_tenant_id": requestScope.TenantID,
		"request_org_id":    requestScope.OrgID,
		"path":              c.Path(),
		"method":            c.Method(),
	})
	_ = writeAPIError(c,
		goerrors.New("scope boundary denied", goerrors.CategoryAuthz).
			WithCode(http.StatusForbidden).
			WithTextCode(string(services.ErrorCodeScopeDenied)).
			WithMetadata(map[string]any{
				"actor_tenant_id":   actorScope.TenantID,
				"actor_org_id":      actorScope.OrgID,
				"request_tenant_id": requestScope.TenantID,
				"request_org_id":    requestScope.OrgID,
			}),
		http.StatusForbidden,
		string(services.ErrorCodeScopeDenied),
		"scope denied",
		nil,
	)
	return errResponseHandled
}

func scopeConflict(actor, request stores.Scope) bool {
	if actor.TenantID != "" && request.TenantID != "" && actor.TenantID != request.TenantID {
		return true
	}
	if actor.OrgID != "" && request.OrgID != "" && actor.OrgID != request.OrgID {
		return true
	}
	return false
}

func validateSignerToken(c router.Context, cfg registerConfig, rawToken string) error {
	_, err := resolveSignerToken(c, cfg, rawToken)
	return err
}

func resolveSignerToken(c router.Context, cfg registerConfig, rawToken string) (stores.SigningTokenRecord, error) {
	if cfg.tokenValidator == nil {
		return stores.SigningTokenRecord{}, nil
	}
	scope := cfg.resolveScope(c)
	token, err := cfg.tokenValidator.Validate(c.Context(), scope, rawToken)
	if err != nil {
		observability.ObserveTokenValidationFailure(c.Context(), textCode(err))
		cfg.logSecurityEvent("signer.token.rejected", map[string]any{
			"path":       c.Path(),
			"method":     c.Method(),
			"ip":         c.IP(),
			"token_code": textCode(err),
		})
		_ = writeAPIError(c, err, http.StatusUnauthorized, string(services.ErrorCodeTokenInvalid), "invalid token", nil)
		return stores.SigningTokenRecord{}, errResponseHandled
	}
	return token, nil
}

func enforceRateLimit(c router.Context, cfg registerConfig, operation string) error {
	if cfg.rateLimiter == nil {
		return nil
	}
	op := strings.TrimSpace(operation)
	if op == "" {
		op = ResolveOperationForPath(c.Method(), c.Path())
	}
	if op == "" {
		return nil
	}
	key := strings.TrimSpace(c.Header("X-Forwarded-For"))
	if key == "" {
		key = strings.TrimSpace(c.IP())
	}
	if key == "" {
		key = "unknown"
	}
	if cfg.rateLimiter.Allow(op, key) {
		return nil
	}
	cfg.logSecurityEvent("request.rate_limited", map[string]any{
		"operation": op,
		"key":       key,
		"path":      c.Path(),
		"method":    c.Method(),
	})
	_ = writeAPIError(c,
		goerrors.New("rate limit exceeded", goerrors.CategoryRateLimit).
			WithCode(http.StatusTooManyRequests).
			WithTextCode(string(services.ErrorCodeRateLimited)).
			WithMetadata(map[string]any{"operation": op}),
		http.StatusTooManyRequests,
		string(services.ErrorCodeRateLimited),
		"rate limit exceeded",
		map[string]any{"operation": op},
	)
	return errResponseHandled
}

func enforceTransportSecurity(c router.Context, cfg registerConfig) error {
	if cfg.transportGuard == nil {
		return nil
	}
	if err := cfg.transportGuard.Ensure(c); err != nil {
		cfg.logSecurityEvent("transport.security.denied", map[string]any{
			"path":       c.Path(),
			"method":     c.Method(),
			"ip":         c.IP(),
			"error_code": textCode(err),
		})
		_ = writeAPIError(c, err, http.StatusUpgradeRequired, string(services.ErrorCodeTransportSecurity), "tls transport required", nil)
		return errResponseHandled
	}
	return nil
}

func asHandlerError(err error) error {
	if errors.Is(err, errResponseHandled) {
		return nil
	}
	return err
}

func writeAPIError(c router.Context, err error, fallbackStatus int, fallbackCode, fallbackMessage string, fallbackDetails map[string]any) error {
	status := fallbackStatus
	code := strings.TrimSpace(fallbackCode)
	message := strings.TrimSpace(fallbackMessage)
	if status <= 0 {
		status = http.StatusBadRequest
	}
	if message == "" {
		message = "request failed"
	}
	details := map[string]any{}
	for key, value := range fallbackDetails {
		details[key] = value
	}

	var coded *goerrors.Error
	if errors.As(err, &coded) {
		if coded.Code > 0 {
			status = coded.Code
		}
		if strings.TrimSpace(coded.TextCode) != "" {
			code = strings.TrimSpace(coded.TextCode)
		}
		if strings.TrimSpace(coded.Message) != "" {
			message = strings.TrimSpace(coded.Message)
		}
		for key, value := range coded.Metadata {
			details[key] = value
		}
	}

	payload := map[string]any{
		"code":    code,
		"message": message,
	}
	if len(details) > 0 {
		payload["details"] = details
	}

	return c.Status(status).JSON(status, map[string]any{"error": payload})
}

func textCode(err error) string {
	if err == nil {
		return ""
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.TrimSpace(coded.TextCode)
	}
	return ""
}

func (cfg registerConfig) resolveScope(c router.Context) stores.Scope {
	if cfg.scopeResolver != nil {
		return cfg.scopeResolver(c, cfg.defaultScope)
	}
	return defaultScopeResolver(c, cfg.defaultScope)
}

func (cfg registerConfig) resolveActorScope(c router.Context) stores.Scope {
	if cfg.actorScope != nil {
		return cfg.actorScope(c)
	}
	return defaultActorScopeResolver(c)
}

func (cfg registerConfig) logSecurityEvent(event string, fields map[string]any) {
	if cfg.securityLogEvent == nil || strings.TrimSpace(event) == "" {
		return
	}
	if fields == nil {
		fields = map[string]any{}
	}
	cfg.securityLogEvent(event, RedactSecurityFields(fields))
}

func defaultScopeResolver(c router.Context, fallback stores.Scope) stores.Scope {
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

func defaultActorScopeResolver(c router.Context) stores.Scope {
	if c == nil {
		return stores.Scope{}
	}
	return stores.Scope{
		TenantID: strings.TrimSpace(c.Header("X-Actor-Tenant-ID")),
		OrgID:    strings.TrimSpace(c.Header("X-Actor-Org-ID")),
	}
}
