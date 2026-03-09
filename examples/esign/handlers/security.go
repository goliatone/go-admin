package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-admin/quickstart"
	auth "github.com/goliatone/go-auth"
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
	authorizer            coreadmin.Authorizer
	adminRouteAuth        router.MiddlewareFunc
	tokenValidator        SignerTokenValidator
	signerSession         SignerSessionService
	signerProfile         SignerProfileService
	signerSavedSignatures SignerSavedSignatureService
	signerAssets          SignerAssetContractService
	agreementDelivery     AgreementDeliveryService
	agreementAuthoring    AgreementAuthoringService
	drafts                DraftWorkflowService
	objectStore           SignerObjectStore
	agreements            AgreementStatsService
	auditEvents           stores.AuditEventStore
	google                GoogleIntegrationService
	googleImportRuns      stores.GoogleImportRunStore
	googleImportEnqueue   GoogleImportEnqueueFunc
	integration           IntegrationFoundationService
	pdfPolicy             PDFPolicyService
	googleEnabled         bool
	documentUpload        router.HandlerFunc
	permissions           Permissions
	defaultScope          stores.Scope
	scopeResolver         ScopeResolver
	actorScope            ActorScopeResolver
	transportGuard        TransportGuard
	rateLimiter           RequestRateLimiter
	rateLimitRuleResolver RateLimitRuleResolver
	requestTrustPolicy    quickstart.RequestTrustPolicy
	securityLogEvent      SecurityLogEvent
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

// SignerProfileService handles token-scoped signer profile persistence.
type SignerProfileService interface {
	Get(ctx context.Context, scope stores.Scope, subject, key string) (*services.SignerProfile, error)
	Save(ctx context.Context, scope stores.Scope, subject, key string, patch services.SignerProfilePatch) (services.SignerProfile, error)
	Clear(ctx context.Context, scope stores.Scope, subject, key string) error
}

// SignerSavedSignatureService handles token-scoped signer saved-signature library APIs.
type SignerSavedSignatureService interface {
	ListSavedSignatures(ctx context.Context, scope stores.Scope, subject, signatureType string) ([]services.SavedSignerSignature, error)
	SaveSignature(ctx context.Context, scope stores.Scope, subject string, input services.SaveSignerSignatureInput) (services.SavedSignerSignature, error)
	DeleteSavedSignature(ctx context.Context, scope stores.Scope, subject, signatureID string) error
}

// SignerAssetContractService resolves token-scoped signer asset contract metadata.
type SignerAssetContractService interface {
	Resolve(ctx context.Context, scope stores.Scope, token stores.SigningTokenRecord) (services.SignerAssetContract, error)
}

// AgreementDeliveryService resolves agreement-level artifact delivery metadata for admin downloads.
type AgreementDeliveryService interface {
	AgreementDeliveryDetail(ctx context.Context, scope stores.Scope, agreementID string) (services.AgreementDeliveryDetail, error)
}

// AgreementAuthoringService captures v2 draft authoring APIs and send-readiness checks.
type AgreementAuthoringService interface {
	ListParticipants(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.ParticipantRecord, error)
	UpsertParticipantDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.ParticipantDraftPatch, expectedVersion int64) (stores.ParticipantRecord, error)
	DeleteParticipantDraft(ctx context.Context, scope stores.Scope, agreementID, participantID string) error

	ListFieldDefinitions(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldDefinitionRecord, error)
	UpsertFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldDefinitionDraftPatch) (stores.FieldDefinitionRecord, error)
	DeleteFieldDefinitionDraft(ctx context.Context, scope stores.Scope, agreementID, fieldDefinitionID string) error

	ListFieldInstances(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.FieldInstanceRecord, error)
	UpsertFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID string, patch stores.FieldInstanceDraftPatch) (stores.FieldInstanceRecord, error)
	DeleteFieldInstanceDraft(ctx context.Context, scope stores.Scope, agreementID, fieldInstanceID string) error

	RunAutoPlacement(ctx context.Context, scope stores.Scope, agreementID string, input services.AutoPlacementRunInput) (services.AutoPlacementRunResult, error)
	ListPlacementRuns(ctx context.Context, scope stores.Scope, agreementID string) ([]stores.PlacementRunRecord, error)
	GetPlacementRun(ctx context.Context, scope stores.Scope, agreementID, placementRunID string) (stores.PlacementRunRecord, error)
	ApplyPlacementRun(ctx context.Context, scope stores.Scope, agreementID, placementRunID string, input services.ApplyPlacementRunInput) (services.ApplyPlacementRunResult, error)

	ValidateBeforeSend(ctx context.Context, scope stores.Scope, agreementID string) (services.AgreementValidationResult, error)
}

// DraftWorkflowService captures wizard draft lifecycle persistence and send conversion.
type DraftWorkflowService interface {
	Create(ctx context.Context, scope stores.Scope, input services.DraftCreateInput) (stores.DraftRecord, bool, error)
	List(ctx context.Context, scope stores.Scope, input services.DraftListInput) ([]stores.DraftRecord, string, int, error)
	Get(ctx context.Context, scope stores.Scope, id, createdByUserID string) (stores.DraftRecord, error)
	Update(ctx context.Context, scope stores.Scope, id string, input services.DraftUpdateInput) (stores.DraftRecord, error)
	Delete(ctx context.Context, scope stores.Scope, id, createdByUserID string) error
	Send(ctx context.Context, scope stores.Scope, id string, input services.DraftSendInput) (services.DraftSendResult, error)
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
	ListAccounts(ctx context.Context, scope stores.Scope, baseUserID string) ([]services.GoogleAccountInfo, error)
	SearchFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	BrowseFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	ImportDocument(ctx context.Context, scope stores.Scope, input services.GoogleImportInput) (services.GoogleImportResult, error)
}

// IntegrationFoundationService captures provider-agnostic integration mapping/sync/conflict operations.
type IntegrationFoundationService interface {
	ValidateAndCompileMapping(ctx context.Context, scope stores.Scope, input services.MappingCompileInput) (services.MappingCompileResult, error)
	ListMappingSpecs(ctx context.Context, scope stores.Scope, provider string) ([]stores.MappingSpecRecord, error)
	GetMappingSpec(ctx context.Context, scope stores.Scope, id string) (stores.MappingSpecRecord, error)
	PublishMappingSpec(ctx context.Context, scope stores.Scope, id string, expectedVersion int64) (stores.MappingSpecRecord, error)

	StartSyncRun(ctx context.Context, scope stores.Scope, input services.StartSyncRunInput) (stores.IntegrationSyncRunRecord, bool, error)
	SaveCheckpoint(ctx context.Context, scope stores.Scope, input services.SaveCheckpointInput) (stores.IntegrationCheckpointRecord, error)
	ResumeSyncRun(ctx context.Context, scope stores.Scope, runID, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error)
	CompleteSyncRun(ctx context.Context, scope stores.Scope, runID, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error)
	FailSyncRun(ctx context.Context, scope stores.Scope, runID, lastError, idempotencyKey string) (stores.IntegrationSyncRunRecord, bool, error)
	ListSyncRuns(ctx context.Context, scope stores.Scope, provider string) ([]stores.IntegrationSyncRunRecord, error)
	GetSyncRun(ctx context.Context, scope stores.Scope, runID string) (stores.IntegrationSyncRunRecord, error)
	SyncRunDiagnostics(ctx context.Context, scope stores.Scope, runID string) (services.SyncRunDiagnostics, error)

	DetectConflict(ctx context.Context, scope stores.Scope, input services.DetectConflictInput) (stores.IntegrationConflictRecord, bool, error)
	ResolveConflict(ctx context.Context, scope stores.Scope, input services.ResolveConflictInput) (stores.IntegrationConflictRecord, bool, error)
	ListConflicts(ctx context.Context, scope stores.Scope, runID, status string) ([]stores.IntegrationConflictRecord, error)
	GetConflict(ctx context.Context, scope stores.Scope, conflictID string) (stores.IntegrationConflictRecord, error)

	ApplyInbound(ctx context.Context, scope stores.Scope, input services.InboundApplyInput) (services.InboundApplyResult, error)
	EmitOutboundChange(ctx context.Context, scope stores.Scope, input services.OutboundChangeInput) (stores.IntegrationChangeEventRecord, bool, error)
}

// PDFPolicyService resolves the effective PDF policy used by runtime operations.
type PDFPolicyService interface {
	Policy(ctx context.Context, scope stores.Scope) services.PDFPolicy
}

// GoogleImportEnqueueFunc enqueues async Google Drive import jobs.
type GoogleImportEnqueueFunc func(ctx context.Context, msg jobs.GoogleDriveImportMsg) error

// GoogleRuntimeConfig captures Google integration + async import runtime wiring.
type GoogleRuntimeConfig struct {
	Enabled       bool
	Integration   GoogleIntegrationService
	ImportRuns    stores.GoogleImportRunStore
	ImportEnqueue GoogleImportEnqueueFunc
}

// Validate returns an error when Google runtime wiring is incomplete.
func (cfg GoogleRuntimeConfig) Validate() error {
	if cfg.Enabled && cfg.Integration == nil {
		return fmt.Errorf("google runtime requires integration service when enabled")
	}
	hasRuns := cfg.ImportRuns != nil
	hasEnqueue := cfg.ImportEnqueue != nil
	if hasRuns != hasEnqueue {
		return fmt.Errorf("google runtime requires import run store and enqueue function together")
	}
	if (hasRuns || hasEnqueue) && cfg.Integration == nil {
		return fmt.Errorf("google runtime requires integration service when async imports are configured")
	}
	return nil
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
	Check(operationKey, key string, rule RateLimitRule) RateLimitDecision
}

// RateLimitRuleResolver resolves an operation rule override for a request.
type RateLimitRuleResolver func(c router.Context, operation string) RateLimitRule

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

// WithAdminRouteMiddleware prepends middleware to admin-only e-sign endpoints.
func WithAdminRouteMiddleware(mw router.MiddlewareFunc) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.adminRouteAuth = mw
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

// WithSignerProfileService configures signer profile persistence APIs.
func WithSignerProfileService(service SignerProfileService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.signerProfile = service
	}
}

// WithSignerSavedSignatureService configures signer saved-signature library APIs.
func WithSignerSavedSignatureService(service SignerSavedSignatureService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.signerSavedSignatures = service
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

// WithAgreementAuthoringService configures participant/field authoring and send-readiness APIs.
func WithAgreementAuthoringService(service AgreementAuthoringService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.agreementAuthoring = service
	}
}

// WithDraftWorkflowService configures wizard draft persistence and send-conversion APIs.
func WithDraftWorkflowService(service DraftWorkflowService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.drafts = service
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

// WithGoogleRuntime configures Google integration + async import runtime as a single unit.
func WithGoogleRuntime(runtime GoogleRuntimeConfig) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.googleEnabled = runtime.Enabled
		cfg.google = runtime.Integration
		cfg.googleImportRuns = runtime.ImportRuns
		cfg.googleImportEnqueue = runtime.ImportEnqueue
	}
}

// WithGoogleImportRunStore configures async import-run persistence.
func WithGoogleImportRunStore(store stores.GoogleImportRunStore) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.googleImportRuns = store
	}
}

// WithGoogleImportEnqueue configures async Google import job enqueue behavior.
func WithGoogleImportEnqueue(fn GoogleImportEnqueueFunc) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.googleImportEnqueue = fn
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

// WithIntegrationFoundationService configures provider-agnostic integration foundation backend service.
func WithIntegrationFoundationService(service IntegrationFoundationService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.integration = service
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

// WithPDFPolicyService configures diagnostics access to resolved PDF policy values.
func WithPDFPolicyService(service PDFPolicyService) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.pdfPolicy = service
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

// WithRateLimitRuleResolver configures request-scoped rule overrides (for example from user options).
func WithRateLimitRuleResolver(resolver RateLimitRuleResolver) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil || resolver == nil {
			return
		}
		cfg.rateLimitRuleResolver = resolver
	}
}

// WithTrustForwardedClientIP allows forwarded IP headers to influence request IP resolution.
// Deprecated: use WithRequestTrustPolicy to constrain trusted proxy CIDRs.
func WithTrustForwardedClientIP(enabled bool) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		if !enabled {
			cfg.requestTrustPolicy = quickstart.RequestTrustPolicy{}
			return
		}
		cfg.requestTrustPolicy = quickstart.RequestTrustPolicy{
			TrustForwardedHeaders: true,
			TrustedProxyCIDRs:     quickstart.InsecureAnyTrustedProxyCIDRs(),
		}
	}
}

// WithRequestTrustPolicy applies CIDR-gated forwarded-header trust policy.
func WithRequestTrustPolicy(policy quickstart.RequestTrustPolicy) RegisterOption {
	return func(cfg *registerConfig) {
		if cfg == nil {
			return
		}
		cfg.requestTrustPolicy = policy
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

func buildRegisterConfig(options []RegisterOption) (registerConfig, error) {
	cfg := defaultRegisterConfig()
	for _, opt := range options {
		if opt == nil {
			continue
		}
		opt(&cfg)
	}
	if err := cfg.validate(); err != nil {
		return registerConfig{}, err
	}
	return cfg, nil
}

func (cfg registerConfig) validate() error {
	if err := cfg.googleRuntimeConfig().Validate(); err != nil {
		return err
	}
	return nil
}

func (cfg registerConfig) googleRuntimeConfig() GoogleRuntimeConfig {
	return GoogleRuntimeConfig{
		Enabled:       cfg.googleEnabled,
		Integration:   cfg.google,
		ImportRuns:    cfg.googleImportRuns,
		ImportEnqueue: cfg.googleImportEnqueue,
	}
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
				"ip":         resolveAuditRequestIP(c, cfg),
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
	actorScopeSource := "actor"
	if actorScope.TenantID == "" && actorScope.OrgID == "" {
		actorScope = stores.Scope{
			TenantID: stableString(cfg.defaultScope.TenantID),
			OrgID:    stableString(cfg.defaultScope.OrgID),
		}
		actorScopeSource = "default_scope"
		if actorScope.TenantID == "" && actorScope.OrgID == "" {
			return nil
		}
	}
	if !scopeConflict(actorScope, requestScope) {
		return nil
	}
	cfg.logSecurityEvent("scope.boundary.denied", map[string]any{
		"scope_source":      actorScopeSource,
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
				"scope_source":      actorScopeSource,
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
			"ip":         resolveAuditRequestIP(c, cfg),
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
	key := services.ResolveAuditIPAddress(quickstart.ResolveRequestIP(c, quickstart.RequestIPOptions{
		TrustForwardedHeaders: cfg.requestTrustPolicy.TrustForwardedHeaders,
		TrustedProxyCIDRs:     cfg.requestTrustPolicy.TrustedProxyCIDRs,
	}))
	if key == "" {
		key = "unknown"
	}
	rule := RateLimitRule{}
	if cfg.rateLimitRuleResolver != nil {
		rule = cfg.rateLimitRuleResolver(c, op)
	}
	decision := cfg.rateLimiter.Check(op, key, rule)
	if decision.Allowed {
		return nil
	}
	retryAfterSeconds := ceilDurationSeconds(decision.RetryAfter)
	if retryAfterSeconds <= 0 {
		retryAfterSeconds = 1
	}
	c.SetHeader("Retry-After", strconv.Itoa(retryAfterSeconds))
	if decision.Limit > 0 {
		c.SetHeader("X-RateLimit-Limit", strconv.Itoa(decision.Limit))
		c.SetHeader("X-RateLimit-Remaining", strconv.Itoa(decision.Remaining))
	}
	if !decision.ResetAt.IsZero() {
		c.SetHeader("X-RateLimit-Reset", strconv.FormatInt(decision.ResetAt.UTC().Unix(), 10))
	}
	details := map[string]any{
		"operation":           op,
		"limit":               decision.Limit,
		"remaining":           decision.Remaining,
		"retry_after_seconds": retryAfterSeconds,
		"window_seconds":      ceilDurationSeconds(decision.Window),
	}
	if !decision.ResetAt.IsZero() {
		details["reset_at"] = decision.ResetAt.UTC().Format(time.RFC3339)
	}
	cfg.logSecurityEvent("request.rate_limited", map[string]any{
		"operation":           op,
		"key":                 key,
		"path":                c.Path(),
		"method":              c.Method(),
		"limit":               decision.Limit,
		"remaining":           decision.Remaining,
		"retry_after_seconds": retryAfterSeconds,
		"reset_at":            details["reset_at"],
	})
	_ = writeAPIError(c,
		goerrors.New("rate limit exceeded", goerrors.CategoryRateLimit).
			WithCode(http.StatusTooManyRequests).
			WithTextCode(string(services.ErrorCodeRateLimited)).
			WithMetadata(details),
		http.StatusTooManyRequests,
		string(services.ErrorCodeRateLimited),
		"rate limit exceeded",
		details,
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
			"ip":         resolveAuditRequestIP(c, cfg),
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

	response := map[string]any{"error": payload}
	if requestID := resolveAPIRequestID(c, coded); requestID != "" {
		response["request_id"] = requestID
	}
	return c.Status(status).JSON(status, response)
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

func resolveAPIRequestID(c router.Context, coded *goerrors.Error) string {
	if coded != nil && strings.TrimSpace(coded.RequestID) != "" {
		return stableString(coded.RequestID)
	}
	if c == nil {
		return ""
	}
	if requestID := stableString(c.Header("X-Request-ID")); requestID != "" {
		return requestID
	}
	if correlationID := stableString(c.Header("X-Correlation-ID")); correlationID != "" {
		return correlationID
	}
	return apiCorrelationID(c, "request")
}

func resolveAuditRequestIP(c router.Context, cfg registerConfig) string {
	if c == nil {
		return ""
	}
	resolved := services.ResolveAuditIPAddress(quickstart.ResolveRequestIP(c, quickstart.RequestIPOptions{
		TrustForwardedHeaders: cfg.requestTrustPolicy.TrustForwardedHeaders,
		TrustedProxyCIDRs:     append([]string{}, cfg.requestTrustPolicy.TrustedProxyCIDRs...),
	}))
	if resolved != "" && !strings.EqualFold(resolved, "unknown") {
		return resolved
	}
	direct := services.ResolveAuditIPAddress(c.IP())
	if direct != "" {
		return direct
	}
	return resolved
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
	tenantID := stableString(c.Query("tenant_id"))
	if tenantID == "" {
		tenantID = stableString(c.Header("X-Tenant-ID"))
	}
	if tenantID != "" {
		scope.TenantID = tenantID
	}
	orgID := stableString(c.Query("org_id"))
	if orgID == "" {
		orgID = stableString(c.Header("X-Org-ID"))
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
	fromActor := func(tenantID, orgID string, metadata map[string]any) stores.Scope {
		scope := stores.Scope{
			TenantID: stableString(tenantID),
			OrgID:    stableString(orgID),
		}
		if scope.TenantID == "" {
			scope.TenantID = metadataString(metadata, "tenant_id", "tenant", "default_tenant", "default_tenant_id")
		}
		if scope.OrgID == "" {
			scope.OrgID = metadataString(metadata, "organization_id", "org_id", "org", "default_org_id")
		}
		return scope
	}
	if actor, ok := auth.ActorFromRouterContext(c); ok && actor != nil {
		scope := fromActor(actor.TenantID, actor.OrganizationID, actor.Metadata)
		if scope.TenantID != "" || scope.OrgID != "" {
			return scope
		}
	}
	if actor, ok := auth.ActorFromContext(c.Context()); ok && actor != nil {
		scope := fromActor(actor.TenantID, actor.OrganizationID, actor.Metadata)
		if scope.TenantID != "" || scope.OrgID != "" {
			return scope
		}
	}
	if claims, ok := auth.GetClaims(c.Context()); ok && claims != nil {
		return stores.Scope{
			TenantID: metadataString(claimsMetadata(claims), "tenant_id", "tenant", "default_tenant", "default_tenant_id"),
			OrgID:    metadataString(claimsMetadata(claims), "organization_id", "org_id", "org", "default_org_id"),
		}
	}
	if claims, ok := auth.GetRouterClaims(c, ""); ok && claims != nil {
		return stores.Scope{
			TenantID: metadataString(claimsMetadata(claims), "tenant_id", "tenant", "default_tenant", "default_tenant_id"),
			OrgID:    metadataString(claimsMetadata(claims), "organization_id", "org_id", "org", "default_org_id"),
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

func ceilDurationSeconds(value time.Duration) int {
	if value <= 0 {
		return 0
	}
	seconds := int(value / time.Second)
	if value%time.Second != 0 {
		seconds++
	}
	if seconds < 1 {
		seconds = 1
	}
	return seconds
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

func stableString(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return strings.Clone(value)
}
