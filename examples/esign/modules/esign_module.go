package modules

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"maps"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/admin/routing"
	"github.com/goliatone/go-admin/examples/esign/commands"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/release"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	esignsync "github.com/goliatone/go-admin/examples/esign/sync"
	servicesmodule "github.com/goliatone/go-admin/modules/services"
	synccore "github.com/goliatone/go-admin/pkg/go-sync/core"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
	"github.com/goliatone/go-admin/quickstart"
	fggate "github.com/goliatone/go-featuregate/gate"
	jobqueue "github.com/goliatone/go-job/queue"
	"github.com/goliatone/go-uploader"
)

const moduleID = "esign"

const (
	esignDocumentUploadMaxSize = 25 * 1024 * 1024
)

var (
	defaultPDFRemediationExecutableAllowlist = []string{"gs"}
	resolveV2SourceManagementRepoRoot        = release.DefaultRepoRoot
	validateV2SourceManagementRuntime        = release.ValidateV2SourceManagementStartup

	allowedESignDocumentMimeTypes = map[string]bool{
		"application/pdf": true,
	}
	allowedESignDocumentExtensions = map[string]bool{
		".pdf": true,
	}
)

type eSignStore interface {
	stores.Store
}

type scopedAsyncTrigger interface {
	NotifyScope(scope stores.Scope)
	Close()
}

type googleIntegrationService interface {
	Connect(ctx context.Context, scope stores.Scope, input services.GoogleConnectInput) (services.GoogleOAuthStatus, error)
	Disconnect(ctx context.Context, scope stores.Scope, userID string) error
	RotateCredentialEncryption(ctx context.Context, scope stores.Scope, userID string) (services.GoogleOAuthStatus, error)
	Status(ctx context.Context, scope stores.Scope, userID string) (services.GoogleOAuthStatus, error)
	ListAccounts(ctx context.Context, scope stores.Scope, baseUserID string) ([]services.GoogleAccountInfo, error)
	SearchFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	BrowseFiles(ctx context.Context, scope stores.Scope, input services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error)
	ImportDocument(ctx context.Context, scope stores.Scope, input services.GoogleImportInput) (services.GoogleImportResult, error)
	ProviderHealth(ctx context.Context) services.GoogleProviderHealthStatus
}

// ESignModule registers routes, panels, commands, settings, and activity projection for e-sign.
type ESignModule struct {
	basePath      string
	defaultLocale string
	menuCode      string
	routes        handlers.RouteSet
	placements    quickstart.PlacementConfig

	defaultScope  stores.Scope
	settings      RuntimeSettings
	googleEnabled bool
	uploadDir     string

	store                eSignStore
	services             *servicesmodule.Module
	documents            services.DocumentService
	tokens               stores.TokenService
	reviewTokens         stores.ReviewSessionTokenService
	publicSignerSessions stores.PublicSignerSessionTokenService
	publicReviewTokens   services.PublicReviewTokenResolver
	publicSessionAuth    services.PublicSignerSessionAuthService
	agreements           services.AgreementService
	reminders            services.AgreementReminderService
	drafts               services.DraftService
	draftSync            synccore.SyncService
	draftSyncBootstrap   *esignsync.AgreementDraftBootstrapper
	signing              services.SigningService
	signerProfiles       services.SignerProfileService
	savedSignatures      services.SignerSavedSignatureService
	artifacts            services.ArtifactPipelineService
	google               googleIntegrationService
	durableJobs          *jobs.DurableJobRuntime
	sourceReadModels     services.SourceReadModelService
	sourceDiagnostics    services.LineageDiagnosticsService
	reconciliation       services.SourceReconciliationService
	emailOutbox          scopedAsyncTrigger
	signingWorkflows     scopedAsyncTrigger
	integrations         services.IntegrationFoundationService
	activityMap          *AuditActivityProjector
	agreementEvents      commands.AgreementEventPublisher
	uploadProvider       uploader.Uploader
	uploadManager        *uploader.Manager
	remediationStatus    jobqueue.DispatchStatusReader
}

func NewESignModule(basePath, defaultLocale, menuCode string) *ESignModule {
	return &ESignModule{
		basePath:      strings.TrimSpace(basePath),
		defaultLocale: strings.TrimSpace(defaultLocale),
		menuCode:      strings.TrimSpace(menuCode),
		defaultScope:  defaultModuleScope,
		uploadDir:     resolveESignModuleDiskAssetsDir(),
	}
}

// WithUploadDir overrides the disk assets directory used for e-sign document uploads.
func (m *ESignModule) WithUploadDir(dir string) *ESignModule {
	if m == nil {
		return nil
	}
	m.uploadDir = strings.TrimSpace(dir)
	m.uploadManager = nil
	return m
}

func (m *ESignModule) WithUploadProvider(provider uploader.Uploader) *ESignModule {
	if m == nil {
		return nil
	}
	m.uploadProvider = provider
	m.uploadManager = nil
	return m
}

func (m *ESignModule) WithUploadManager(manager *uploader.Manager) *ESignModule {
	if m == nil {
		return nil
	}
	m.uploadManager = manager
	return m
}

// WithPlacements overrides the placement config used when registering dashboard providers.
func (m *ESignModule) WithPlacements(placements quickstart.PlacementConfig) *ESignModule {
	if m == nil {
		return nil
	}
	m.placements = placements
	return m
}

func (m *ESignModule) dashboardPlacements() quickstart.PlacementConfig {
	if m == nil {
		return quickstart.PlacementConfig{}
	}
	if len(m.placements.Menus) > 0 || len(m.placements.Dashboards) > 0 {
		return m.placements
	}
	return quickstart.DefaultPlacements(coreadmin.Config{
		NavMenuCode: strings.TrimSpace(m.menuCode),
	})
}

// WithServicesModule injects the shared go-admin services module runtime.
func (m *ESignModule) WithServicesModule(module *servicesmodule.Module) *ESignModule {
	if m == nil {
		return nil
	}
	m.services = module
	return m
}

func (m *ESignModule) WithAgreementEventPublisher(publisher commands.AgreementEventPublisher) *ESignModule {
	if m == nil {
		return nil
	}
	m.agreementEvents = publisher
	return m
}

// WithStore injects a pre-bootstrapped store implementation.
func (m *ESignModule) WithStore(store stores.Store) *ESignModule {
	if m == nil {
		return nil
	}
	m.store = store
	return m
}

// WithRemediationDispatchStatusReader injects queue-backed remediation dispatch status lookup.
func (m *ESignModule) WithRemediationDispatchStatusReader(reader jobqueue.DispatchStatusReader) *ESignModule {
	if m == nil {
		return nil
	}
	m.remediationStatus = reader
	return m
}

// UploadManager returns the shared uploader manager used by e-sign document persistence.
func (m *ESignModule) UploadManager() *uploader.Manager {
	return m.documentUploadManager()
}

// DefaultScope returns the fallback scope used when request scope is missing.
func (m *ESignModule) DefaultScope() stores.Scope {
	if m == nil {
		return defaultModuleScope
	}
	return m.defaultScope
}

// SourceReadModelService returns the backend-owned source-management read models.
func (m *ESignModule) SourceReadModelService() services.SourceReadModelService {
	if m == nil {
		return nil
	}
	return m.sourceReadModels
}

// MaxSourcePDFBytes returns the configured max source PDF size.
func (m *ESignModule) MaxSourcePDFBytes() int64 {
	if m == nil || m.settings.MaxSourcePDFBytes <= 0 {
		return esignDocumentUploadMaxSize
	}
	return m.settings.MaxSourcePDFBytes
}

// GoogleIntegrationEnabled returns true when Google integration service is active.
func (m *ESignModule) GoogleIntegrationEnabled() bool {
	return m != nil && m.googleEnabled
}

// Close releases background resources owned by the module runtime.
func (m *ESignModule) Close() {
	if m == nil {
		return
	}
	if m.durableJobs != nil {
		m.durableJobs.Close()
		m.durableJobs = nil
	}
	if m.emailOutbox != nil {
		m.emailOutbox.Close()
		m.emailOutbox = nil
	}
	if m.signingWorkflows != nil {
		m.signingWorkflows.Close()
		m.signingWorkflows = nil
	}
}

// GoogleConnected reports whether the given user has an active Google integration connection in scope.
func (m *ESignModule) GoogleConnected(ctx context.Context, scope stores.Scope, userID string) bool {
	if m == nil || !m.googleEnabled {
		return false
	}
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return false
	}
	status, err := m.google.Status(ctx, scope, userID)
	if err != nil {
		return false
	}
	return status.Connected
}

// SigningService returns the signing service for signer session operations.
func (m *ESignModule) SigningService() services.SigningService {
	if m == nil {
		return services.SigningService{}
	}
	return m.signing
}

// TokenService returns the token service for signing token validation.
func (m *ESignModule) TokenService() *stores.TokenService {
	if m == nil {
		return nil
	}
	return &m.tokens
}

func (m *ESignModule) PublicReviewTokenResolver() *services.PublicReviewTokenResolver {
	if m == nil {
		return nil
	}
	return &m.publicReviewTokens
}

// SignerAssetContractService returns token-scoped asset contract resolution used by signer web/runtime paths.
func (m *ESignModule) SignerAssetContractService() services.SignerAssetContractService {
	if m == nil || m.store == nil {
		return services.SignerAssetContractService{}
	}
	return services.NewSignerAssetContractService(m.store,
		services.WithSignerAssetObjectStore(m.documentUploadManager()),
	)
}

// AgreementViewService returns sender-authenticated agreement viewer composition used by admin routes.
func (m *ESignModule) AgreementViewService() services.AgreementViewService {
	if m == nil || m.store == nil {
		return services.AgreementViewService{}
	}
	return services.NewAgreementViewService(m.signing, m.store,
		services.WithSignerAssetObjectStore(m.documentUploadManager()),
	)
}

func (m *ESignModule) Manifest() coreadmin.ModuleManifest {
	return coreadmin.ModuleManifest{
		ID:             moduleID,
		NameKey:        "modules.esign.name",
		DescriptionKey: "modules.esign.description",
		FeatureFlags:   []string{"esign"},
	}
}

func (m *ESignModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug:            moduleID,
		RouteNamePrefix: moduleID,
		UIRoutes:        esignUIRoutes(),
		APIRoutes:       esignAPIRoutes(),
		PublicAPIRoutes: esignPublicAPIRoutes(),
	}
}

func esignUIRoutes() map[string]string {
	return map[string]string{
		"esign.index":  "/",
		"esign.status": "/status",
	}
}

func esignAPIRoutes() map[string]string {
	return map[string]string{
		"esign.status":                             "/status",
		"esign.drafts":                             "/drafts",
		"esign.drafts.id":                          "/drafts/:draft_id",
		"esign.drafts.send":                        "/drafts/:draft_id/send",
		"esign.agreements.stats":                   "/agreements/stats",
		"esign.agreements.participants":            "/agreements/:agreement_id/participants",
		"esign.agreements.participants.id":         "/agreements/:agreement_id/participants/:participant_id",
		"esign.agreements.field_definitions":       "/agreements/:agreement_id/field-definitions",
		"esign.agreements.field_definitions.id":    "/agreements/:agreement_id/field-definitions/:field_definition_id",
		"esign.agreements.field_instances":         "/agreements/:agreement_id/field-instances",
		"esign.agreements.field_instances.id":      "/agreements/:agreement_id/field-instances/:field_instance_id",
		"esign.agreements.send_readiness":          "/agreements/:agreement_id/send-readiness",
		"esign.agreements.auto_place":              "/agreements/:agreement_id/auto-place",
		"esign.agreements.placement_runs":          "/agreements/:agreement_id/placement-runs",
		"esign.agreements.placement_runs.id":       "/agreements/:agreement_id/placement-runs/:placement_run_id",
		"esign.agreements.placement_runs.apply":    "/agreements/:agreement_id/placement-runs/:placement_run_id/apply",
		"esign.smoke.recipient_links":              "/smoke/recipient-links",
		"esign.documents.upload":                   "/documents/upload",
		"esign.documents.remediate":                "/documents/:document_id/remediate",
		"esign.dispatches.id":                      "/dispatches/:dispatch_id",
		"esign.integrations.google.connect":        "/integrations/google/connect",
		"esign.integrations.google.disconnect":     "/integrations/google/disconnect",
		"esign.integrations.google.rotate":         "/integrations/google/rotate-credentials",
		"esign.integrations.google.status":         "/integrations/google/status",
		"esign.integrations.google.accounts":       "/integrations/google/accounts",
		"esign.google_drive.search":                "/google-drive/search",
		"esign.google_drive.browse":                "/google-drive/browse",
		"esign.google_drive.import":                "/google-drive/import",
		"esign.google_drive.imports":               "/google-drive/imports",
		"esign.google_drive.imports.id":            "/google-drive/imports/:import_run_id",
		"esign.integrations.mappings":              "/integrations/mappings",
		"esign.integrations.mappings.id":           "/integrations/mappings/:mapping_id",
		"esign.integrations.mappings.publish":      "/integrations/mappings/:mapping_id/publish",
		"esign.integrations.sync_runs":             "/integrations/sync-runs",
		"esign.integrations.sync_runs.id":          "/integrations/sync-runs/:run_id",
		"esign.integrations.sync_runs.checkpoints": "/integrations/sync-runs/:run_id/checkpoints",
		"esign.integrations.sync_runs.resume":      "/integrations/sync-runs/:run_id/resume",
		"esign.integrations.sync_runs.complete":    "/integrations/sync-runs/:run_id/complete",
		"esign.integrations.sync_runs.fail":        "/integrations/sync-runs/:run_id/fail",
		"esign.integrations.conflicts":             "/integrations/conflicts",
		"esign.integrations.conflicts.id":          "/integrations/conflicts/:conflict_id",
		"esign.integrations.conflicts.resolve":     "/integrations/conflicts/:conflict_id/resolve",
		"esign.integrations.diagnostics":           "/integrations/diagnostics",
		"esign.integrations.inbound":               "/integrations/inbound",
		"esign.integrations.outbound":              "/integrations/outbound",
	}
}

func esignPublicAPIRoutes() map[string]string {
	return map[string]string{
		"esign.signing.session":                     "/signing/session/:token",
		"esign.signing.bootstrap":                   "/signing/bootstrap/:token",
		"esign.signing.session.auth":                "/signing/session",
		"esign.signing.review.threads":              "/signing/session/:token/review/threads",
		"esign.signing.review.threads.auth":         "/signing/review/threads",
		"esign.signing.review.threads.replies":      "/signing/session/:token/review/threads/:thread_id/replies",
		"esign.signing.review.threads.replies.auth": "/signing/review/threads/:thread_id/replies",
		"esign.signing.review.threads.resolve":      "/signing/session/:token/review/threads/:thread_id/resolve",
		"esign.signing.review.threads.resolve.auth": "/signing/review/threads/:thread_id/resolve",
		"esign.signing.review.threads.reopen":       "/signing/session/:token/review/threads/:thread_id/reopen",
		"esign.signing.review.threads.reopen.auth":  "/signing/review/threads/:thread_id/reopen",
		"esign.signing.review.approve":              "/signing/session/:token/review/approve",
		"esign.signing.review.approve.auth":         "/signing/review/approve",
		"esign.signing.review.request_changes":      "/signing/session/:token/review/request-changes",
		"esign.signing.review.request_changes.auth": "/signing/review/request-changes",
		"esign.signing.consent":                     "/signing/consent/:token",
		"esign.signing.consent.auth":                "/signing/consent",
		"esign.signing.field_values":                "/signing/field-values/:token",
		"esign.signing.field_values.auth":           "/signing/field-values",
		"esign.signing.field_values.signature":      "/signing/field-values/signature/:token",
		"esign.signing.field_values.signature.auth": "/signing/field-values/signature",
		"esign.signing.signature_upload":            "/signing/signature-upload/:token",
		"esign.signing.signature_upload.auth":       "/signing/signature-upload",
		"esign.signing.signature_upload.object":     "/signing/signature-upload/object",
		"esign.signing.telemetry":                   "/signing/telemetry/:token",
		"esign.signing.telemetry.auth":              "/signing/telemetry",
		"esign.signing.submit":                      "/signing/submit/:token",
		"esign.signing.submit.auth":                 "/signing/submit",
		"esign.signing.decline":                     "/signing/decline/:token",
		"esign.signing.decline.auth":                "/signing/decline",
		"esign.signing.assets":                      "/signing/assets/:token",
		"esign.signing.assets.auth":                 "/signing/assets",
		"esign.signing.profile":                     "/signing/profile/:token",
		"esign.signing.profile.auth":                "/signing/profile",
		"esign.signing.signatures":                  "/signing/signatures/:token",
		"esign.signing.signatures.auth":             "/signing/signatures",
		"esign.signing.signatures.id":               "/signing/signatures/:token/:id",
		"esign.signing.signatures.id.auth":          "/signing/signatures/:id",
	}
}

// ValidateStartup performs post-registration startup validation checks.
func (m *ESignModule) ValidateStartup(ctx context.Context) error {
	if m == nil {
		return fmt.Errorf("esign module: startup validator module is nil")
	}
	if err := m.validateGoogleRuntimeWiring(ctx, resolveESignStrictStartup()); err != nil {
		return err
	}
	return m.validateLineageRuntimeWiring(ctx)
}

type moduleRegisterRuntime struct {
	objectStore              *uploader.Manager
	pdfService               services.PDFService
	jobHandlerDeps           jobs.HandlerDependencies
	durableJobs              *jobs.DurableJobRuntime
	lineageStore             stores.LineageStore
	sourceReconciliation     services.SourceReconciliationService
	sourceSearch             services.SourceSearchService
	sourceCommentSync        services.SourceCommentSyncService
	lineageProcessingTrigger services.SourceLineageProcessingTrigger
	signingAgreementChanges  services.AgreementChangeNotifier
	emailWorkflow            jobs.AgreementWorkflow
	emailOutbox              scopedAsyncTrigger
	signingWorkflowOutbox    scopedAsyncTrigger
	notificationRecovery     services.AgreementNotificationRecoveryService
}

func (m *ESignModule) Register(ctx coreadmin.ModuleContext) error {
	if err := validateESignModuleContext(ctx); err != nil {
		return err
	}
	if err := m.prepareRegistration(ctx); err != nil {
		return err
	}
	runtime, err := m.buildRegisterRuntime(ctx)
	if err != nil {
		return err
	}
	if err := m.configureGoogleIntegration(runtime.jobHandlerDeps, runtime.durableJobs, runtime.lineageStore, runtime.sourceCommentSync, runtime.lineageProcessingTrigger); err != nil {
		return err
	}
	if err := m.validateGoogleRuntimeWiring(context.Background(), resolveESignStrictStartup()); err != nil {
		return err
	}
	return m.registerModuleRuntime(ctx, runtime)
}

func validateESignModuleContext(ctx coreadmin.ModuleContext) error {
	if ctx.Admin == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	if ctx.Router == nil && ctx.PublicRouter == nil {
		return fmt.Errorf("esign module: router is nil")
	}
	return nil
}

func (m *ESignModule) prepareRegistration(ctx coreadmin.ModuleContext) error {
	services.RegisterDomainErrorCodes()
	m.settings = registerRuntimeSettings(ctx.Admin.SettingsService())
	adminScopeDefaults := ctx.Admin.ScopeDefaults()
	if adminScopeDefaults.Enabled {
		tenantID := firstNonEmptyValue(strings.TrimSpace(adminScopeDefaults.TenantID), strings.TrimSpace(m.defaultScope.TenantID))
		orgID := firstNonEmptyValue(strings.TrimSpace(adminScopeDefaults.OrgID), strings.TrimSpace(m.defaultScope.OrgID))
		m.defaultScope = stores.Scope{TenantID: tenantID, OrgID: orgID}
	}
	if m.defaultScope.TenantID == "" || m.defaultScope.OrgID == "" {
		m.defaultScope = defaultModuleScope
	}
	if m.store == nil {
		runtimeCfg := appcfg.Active()
		return fmt.Errorf(
			"esign module: store injection is required (runtime.repository_dialect=%s)",
			strings.TrimSpace(runtimeCfg.Runtime.RepositoryDialect),
		)
	}
	m.googleEnabled = featureEnabled(ctx.Admin.FeatureGate(), "esign_google")
	return nil
}

func (m *ESignModule) buildRegisterRuntime(ctx coreadmin.ModuleContext) (moduleRegisterRuntime, error) {
	runtime := moduleRegisterRuntime{}
	runtime.objectStore, runtime.pdfService = m.buildDocumentRuntime(ctx.Admin)
	jobAgreementChanges, signingAgreementChanges := m.buildAgreementChangeNotifiers()
	runtime.signingAgreementChanges = signingAgreementChanges
	m.initializeCoreServices(runtime.objectStore, runtime.pdfService)
	runtime.jobHandlerDeps = m.buildJobHandlerDependencies(runtime.objectStore, runtime.pdfService, jobAgreementChanges)
	durableJobs, err := jobs.NewDurableJobRuntime(m.store, jobs.DefaultRetryPolicy())
	if err != nil {
		return runtime, fmt.Errorf("esign module: durable job runtime: %w", err)
	}
	durableJobs.RegisterScope(m.defaultScope)
	m.durableJobs = durableJobs
	runtime.durableJobs = durableJobs
	if err := m.initializeLineageRuntime(&runtime, runtime.objectStore); err != nil {
		return runtime, err
	}
	runtime.signingAgreementChanges = m.wrapSigningAgreementChanges(runtime.signingAgreementChanges, runtime.lineageStore, runtime.sourceSearch)
	if err := m.initializeWorkflowRuntime(ctx, &runtime); err != nil {
		return runtime, err
	}
	return runtime, nil
}

func (m *ESignModule) buildDocumentRuntime(admin *coreadmin.Admin) (*uploader.Manager, services.PDFService) {
	objectStore := m.documentUploadManager()
	pdfPolicyResolver := services.NewRuntimePDFPolicyResolver(admin.SettingsService())
	return objectStore, services.NewPDFService(services.WithPDFPolicyResolver(pdfPolicyResolver))
}

func (m *ESignModule) buildAgreementChangeNotifiers() (jobs.AgreementChangeNotifier, services.AgreementChangeNotifier) {
	if m.agreementEvents == nil {
		return nil, nil
	}
	jobAgreementChanges := func(ctx context.Context, scope stores.Scope, notification jobs.AgreementChangeNotification) error {
		return m.agreementEvents.PublishAgreementChanged(ctx, scope, commands.AgreementChangedEvent{
			AgreementID:   strings.TrimSpace(notification.AgreementID),
			CorrelationID: strings.TrimSpace(notification.CorrelationID),
			Sections:      append([]string{}, notification.Sections...),
			Status:        strings.TrimSpace(notification.Status),
			Message:       strings.TrimSpace(notification.Message),
			Metadata:      maps.Clone(notification.Metadata),
		})
	}
	signingAgreementChanges := func(ctx context.Context, scope stores.Scope, notification services.AgreementChangeNotification) error {
		return m.agreementEvents.PublishAgreementChanged(ctx, scope, commands.AgreementChangedEvent{
			AgreementID:   strings.TrimSpace(notification.AgreementID),
			CorrelationID: strings.TrimSpace(notification.CorrelationID),
			Sections:      append([]string{}, notification.Sections...),
			Status:        strings.TrimSpace(notification.Status),
			Message:       strings.TrimSpace(notification.Message),
			Metadata:      maps.Clone(notification.Metadata),
		})
	}
	return jobAgreementChanges, signingAgreementChanges
}

func (m *ESignModule) initializeCoreServices(objectStore *uploader.Manager, pdfService services.PDFService) {
	tokenTTL := time.Duration(m.settings.TokenTTLSeconds) * time.Second
	m.documents = services.NewDocumentService(
		m.store,
		services.WithDocumentObjectStore(objectStore),
		services.WithDocumentPDFService(pdfService),
	)
	m.tokens = stores.NewTokenService(m.store, stores.WithTokenTTL(tokenTTL))
	m.reviewTokens = stores.NewReviewSessionTokenService(m.store, stores.WithReviewSessionTokenTTL(tokenTTL))
	m.publicSignerSessions = stores.NewPublicSignerSessionTokenService(m.store)
	m.publicReviewTokens = services.NewPublicReviewTokenResolver(m.tokens, m.reviewTokens)
	m.publicSessionAuth = services.NewPublicSignerSessionAuthService(m.publicSignerSessions, m.store, m.store)
	artifactRenderer := services.NewReadableArtifactRenderer(
		m.store,
		m.store,
		objectStore,
		services.WithReadableArtifactRendererPDFService(pdfService),
	)
	m.artifacts = services.NewArtifactPipelineService(m.store,
		artifactRenderer,
		services.WithArtifactObjectStore(objectStore),
	)
}

func (m *ESignModule) buildJobHandlerDependencies(
	objectStore *uploader.Manager,
	pdfService services.PDFService,
	jobAgreementChanges jobs.AgreementChangeNotifier,
) jobs.HandlerDependencies {
	return jobs.HandlerDependencies{
		Agreements:       m.store,
		Effects:          m.store,
		Artifacts:        m.store,
		JobRuns:          m.store,
		GoogleImportRuns: m.store,
		EmailLogs:        m.store,
		Audits:           m.store,
		Documents:        m.store,
		ObjectStore:      objectStore,
		Tokens:           m.tokens,
		Pipeline:         m.artifacts,
		PDFService:       pdfService,
		EmailProvider:    jobs.EmailProviderFromEnv(),
		Transactions:     m.store,
		AgreementChanges: jobAgreementChanges,
	}
}

func (m *ESignModule) initializeLineageRuntime(runtime *moduleRegisterRuntime, objectStore *uploader.Manager) error {
	if resolved, ok := any(m.store).(stores.LineageStore); ok {
		runtime.lineageStore = resolved
	}
	if runtime.lineageStore == nil {
		return nil
	}
	searchService, err := services.NewGoSearchSourceSearchService(services.GoSearchSourceSearchConfig{
		Lineage: runtime.lineageStore,
	})
	if err != nil {
		return err
	}
	runtime.sourceSearch = searchService
	runtime.sourceCommentSync = services.NewDefaultSourceCommentSyncService(
		runtime.lineageStore,
		services.WithSourceCommentSyncSearchService(runtime.sourceSearch),
	)
	fingerprintService := services.NewDefaultSourceFingerprintService(runtime.lineageStore, objectStore)
	runtime.sourceReconciliation = services.NewDefaultSourceReconciliationService(
		runtime.lineageStore,
		services.WithSourceReconciliationSearchService(runtime.sourceSearch),
	)
	lineageJobDeps := runtime.jobHandlerDeps
	lineageJobDeps.Fingerprints = fingerprintService
	lineageJobDeps.Reconciliation = runtime.sourceReconciliation
	lineageHandlers := jobs.NewHandlers(lineageJobDeps)
	runtime.durableJobs.RegisterHandler(jobs.JobSourceLineageProcessing, lineageHandlers.HandleSourceLineageProcessingJob)
	runtime.lineageProcessingTrigger = jobs.NewDurableSourceLineageProcessingEnqueuer(runtime.durableJobs)
	return nil
}

func (m *ESignModule) wrapSigningAgreementChanges(
	base services.AgreementChangeNotifier,
	lineageStore stores.LineageStore,
	sourceSearch services.SourceSearchService,
) services.AgreementChangeNotifier {
	if sourceSearch == nil || lineageStore == nil {
		return base
	}
	agreementSearchRefresh := services.NewSourceSearchAgreementRefreshService(m.store, m.store, lineageStore, sourceSearch)
	return func(ctx context.Context, scope stores.Scope, notification services.AgreementChangeNotification) error {
		var firstErr error
		if base != nil {
			firstErr = base(ctx, scope, notification)
		}
		if refreshErr := agreementSearchRefresh.RefreshAgreement(ctx, scope, notification.AgreementID); firstErr == nil && refreshErr != nil {
			firstErr = refreshErr
		}
		return firstErr
	}
}

func (m *ESignModule) initializeWorkflowRuntime(ctx coreadmin.ModuleContext, runtime *moduleRegisterRuntime) error {
	jobHandlers := jobs.NewHandlers(runtime.jobHandlerDeps)
	runtime.emailWorkflow = jobs.NewAgreementWorkflow(jobHandlers)
	emailOutbox, err := m.newEmailOutboxTrigger(runtime.durableJobs, jobHandlers)
	if err != nil {
		return err
	}
	runtime.emailOutbox = emailOutbox
	m.emailOutbox = emailOutbox
	signingWorkflowOutbox, err := m.newSigningWorkflowOutboxTrigger(runtime.durableJobs, jobHandlers, runtime.emailWorkflow)
	if err != nil {
		return err
	}
	runtime.signingWorkflowOutbox = signingWorkflowOutbox
	m.signingWorkflows = signingWorkflowOutbox
	m.initializeDomainServices(ctx, runtime)
	draftSync, err := m.newDraftSyncService()
	if err != nil {
		return err
	}
	m.draftSync = draftSync
	m.draftSyncBootstrap = esignsync.NewAgreementDraftBootstrapper(m.drafts)
	m.integrations = services.NewIntegrationFoundationService(
		m.store,
		services.WithIntegrationAuditStore(m.store),
	)
	runtime.notificationRecovery = services.NewAgreementNotificationRecoveryService(
		m.store,
		m.tokens,
		services.WithAgreementNotificationRecoveryReviewTokens(m.reviewTokens),
		services.WithAgreementNotificationRecoveryDispatch(m.emailOutbox),
	)
	return nil
}

func (m *ESignModule) newEmailOutboxTrigger(durableJobs *jobs.DurableJobRuntime, jobHandlers jobs.Handlers) (scopedAsyncTrigger, error) {
	emailOutboxPublisher := jobs.NewEmailOutboxPublisher(jobHandlers)
	durableJobs.RegisterHandler(jobs.JobDrainEmailOutbox, func(ctx context.Context, scope stores.Scope, _ stores.JobRunRecord) error {
		return drainScopedOutbox(ctx, scope, m.store, emailOutboxPublisher, "esign-email-outbox", []string{
			services.NotificationOutboxTopicEmailSendSigningRequest,
		})
	})
	emailOutbox, err := jobs.NewDurableOutboxDrainTrigger(durableJobs, jobs.JobDrainEmailOutbox, 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("esign module: email outbox trigger: %w", err)
	}
	emailOutbox.NotifyScope(m.defaultScope)
	return emailOutbox, nil
}

func (m *ESignModule) newSigningWorkflowOutboxTrigger(
	durableJobs *jobs.DurableJobRuntime,
	jobHandlers jobs.Handlers,
	emailWorkflow jobs.AgreementWorkflow,
) (scopedAsyncTrigger, error) {
	signingWorkflowPublisher := jobs.NewSigningWorkflowOutboxPublisher(jobHandlers, emailWorkflow, emailWorkflow)
	durableJobs.RegisterHandler(jobs.JobDrainSigningWorkflowOutbox, func(ctx context.Context, scope stores.Scope, _ stores.JobRunRecord) error {
		return drainScopedOutbox(ctx, scope, m.store, signingWorkflowPublisher, "esign-signing-workflow-outbox", []string{
			services.SigningWorkflowOutboxTopicStageActivation,
			services.SigningWorkflowOutboxTopicCompletion,
		})
	})
	signingWorkflowOutbox, err := jobs.NewDurableOutboxDrainTrigger(durableJobs, jobs.JobDrainSigningWorkflowOutbox, 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("esign module: signing workflow outbox trigger: %w", err)
	}
	signingWorkflowOutbox.NotifyScope(m.defaultScope)
	return signingWorkflowOutbox, nil
}

func (m *ESignModule) initializeDomainServices(ctx coreadmin.ModuleContext, runtime *moduleRegisterRuntime) {
	reviewActorDirectory := newReviewActorDirectory(ctx.Admin)
	m.agreements = services.NewAgreementService(m.store,
		services.WithAgreementTokenService(m.tokens),
		services.WithAgreementReviewTokenService(m.reviewTokens),
		services.WithAgreementAuditStore(m.store),
		services.WithAgreementReminderStore(m.store),
		services.WithAgreementNotificationOutbox(m.store),
		services.WithAgreementNotificationDispatchTrigger(runtime.emailOutbox),
		services.WithAgreementEmailWorkflow(runtime.emailWorkflow),
		services.WithAgreementPlacementObjectStore(runtime.objectStore),
		services.WithAgreementPDFService(runtime.pdfService),
		services.WithAgreementReviewActorDirectory(reviewActorDirectory),
	)
	m.reminders = services.NewAgreementReminderService(
		m.store,
		m.agreements,
		services.WithAgreementReminderWorkerID("esign-agreement-reminder-sweep"),
	)
	m.drafts = services.NewDraftService(m.store,
		services.WithDraftAgreementService(m.agreements),
		services.WithDraftAuditStore(m.store),
	)
	signatureUploadTTL, signatureUploadSecret := resolveSignatureUploadSecurityPolicy()
	m.signing = services.NewSigningService(m.store,
		services.WithSigningAuditStore(m.store),
		services.WithSigningWorkflowOutbox(m.store),
		services.WithSigningWorkflowDispatchTrigger(runtime.signingWorkflowOutbox),
		services.WithSigningCompletionWorkflow(runtime.emailWorkflow),
		services.WithSigningStageWorkflow(runtime.emailWorkflow),
		services.WithSigningAgreementChangeNotifier(runtime.signingAgreementChanges),
		services.WithSignatureUploadConfig(signatureUploadTTL, signatureUploadSecret),
		services.WithSigningObjectStore(runtime.objectStore),
		services.WithSigningPDFService(runtime.pdfService),
		services.WithSigningReviewActorDirectory(reviewActorDirectory),
	)
	profileTTL, persistDrawnSignature := resolveSignerProfilePersistencePolicy()
	m.signerProfiles = services.NewSignerProfileService(
		m.store,
		services.WithSignerProfileTTL(profileTTL),
		services.WithSignerProfilePersistDrawnSignature(persistDrawnSignature),
	)
	m.savedSignatures = services.NewSignerSavedSignatureService(
		m.store,
		services.WithSignerSavedSignatureDefaultLimit(m.savedSignatureLimit()),
		services.WithSignerSavedSignatureObjectStore(runtime.objectStore),
		services.WithSignerSavedSignatureLimitResolver(m.savedSignatureLimitResolver(ctx.Admin.SettingsService())),
	)
}

func (m *ESignModule) newDraftSyncService() (synccore.SyncService, error) {
	syncObserver := observability.NewSyncKernelObserver()
	draftSync, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(m.drafts),
		esignsync.NewAgreementDraftIdempotencyStore(m.store),
		syncservice.WithMetrics(syncObserver),
		syncservice.WithLogger(syncObserver),
	)
	if err != nil {
		return nil, fmt.Errorf("esign module: agreement draft sync service: %w", err)
	}
	return draftSync, nil
}

func (m *ESignModule) savedSignatureLimit() int {
	savedSignatureLimit := int(m.settings.SavedSignaturesLimit)
	if savedSignatureLimit <= 0 {
		savedSignatureLimit = appcfg.Active().Signer.SavedSignaturesLimitPerType
	}
	if savedSignatureLimit <= 0 {
		savedSignatureLimit = 10
	}
	return savedSignatureLimit
}

func (m *ESignModule) savedSignatureLimitResolver(settingsService *coreadmin.SettingsService) func(context.Context, stores.Scope, string, string) int {
	return func(_ context.Context, _ stores.Scope, subject, _ string) int {
		if settingsService == nil {
			return 0
		}
		subject = strings.TrimSpace(subject)
		if subject == "" {
			return 0
		}
		resolved := settingsService.Resolve(settingSavedSignaturesLimit, subject)
		switch raw := resolved.Value.(type) {
		case int:
			return raw
		case int32:
			return int(raw)
		case int64:
			return int(raw)
		case float64:
			return int(raw)
		case string:
			trimmed := strings.TrimSpace(raw)
			if trimmed == "" {
				return 0
			}
			var parsed int
			if _, scanErr := fmt.Sscan(trimmed, &parsed); scanErr == nil {
				return parsed
			}
		}
		return 0
	}
}

func (m *ESignModule) registerModuleRuntime(ctx coreadmin.ModuleContext, runtime moduleRegisterRuntime) error {
	m.activityMap = NewAuditActivityProjector(ctx.Admin.ActivityFeed(), m.store)
	remediationService, err := m.buildRemediationService(ctx.Admin, runtime.objectStore, runtime.pdfService)
	if err != nil {
		return err
	}
	if err := m.registerCommandsAndPanels(ctx, runtime.notificationRecovery, remediationService); err != nil {
		return err
	}
	if err := m.registerHandlers(ctx, runtime, remediationService); err != nil {
		return err
	}
	return nil
}

func (m *ESignModule) buildRemediationService(
	admin *coreadmin.Admin,
	objectStore *uploader.Manager,
	pdfService services.PDFService,
) (commands.PDFRemediationCommandService, error) {
	remediationService, err := buildPDFRemediationCommandService(
		appcfg.Active(),
		m.store,
		objectStore,
		pdfService,
		admin.ActivityFeed(),
		m.activityMap,
	)
	if err != nil {
		return nil, fmt.Errorf("esign module: pdf remediation runtime: %w", err)
	}
	return remediationService, nil
}

func (m *ESignModule) registerCommandsAndPanels(
	ctx coreadmin.ModuleContext,
	notificationRecovery services.AgreementNotificationRecoveryService,
	remediationService commands.PDFRemediationCommandService,
) error {
	registerOptions := []commands.RegisterOption{
		commands.WithGuardedEffectRecoveryService(notificationRecovery),
	}
	if remediationService != nil {
		registerOptions = append(registerOptions, commands.WithPDFRemediationService(remediationService))
	}
	if m.agreementEvents != nil {
		registerOptions = append(registerOptions, commands.WithAgreementEventPublisher(m.agreementEvents))
	}
	if err := commands.Register(
		ctx.Admin.Commands(),
		m.agreements,
		m.tokens,
		m.drafts,
		m.reminders,
		strings.TrimSpace(appcfg.Active().Reminders.SweepCron),
		m.defaultScope,
		m.activityMap,
		registerOptions...,
	); err != nil {
		return err
	}
	if err := m.registerPanels(ctx.Admin); err != nil {
		return err
	}
	if err := m.registerPanelTabs(ctx.Admin); err != nil {
		return err
	}
	m.registerDashboardProviders(ctx.Admin)
	return ensureDefaultRoleMappings(ctx.Admin)
}

func (m *ESignModule) registerHandlers(
	ctx coreadmin.ModuleContext,
	runtime moduleRegisterRuntime,
	remediationService commands.PDFRemediationCommandService,
) error {
	m.routes = handlers.BuildRouteSet(ctx.Admin.URLs(), ctx.Admin.BasePath(), ctx.Admin.AdminAPIGroup())
	routeRouter := m.resolveRouteRouter(ctx)
	sourceReadModels, lineageDiagnostics, err := m.resolveHandlerReadModels(runtime)
	if err != nil {
		return err
	}
	googleRuntime := m.buildGoogleRuntime()
	remediationTrigger, remediationDispatchLookup := m.buildRemediationHandlerBindings(ctx, remediationService)
	return handlers.Register(
		routeRouter,
		m.routes,
		m.handlerRegisterOptions(ctx, runtime, sourceReadModels, lineageDiagnostics, googleRuntime, remediationTrigger, remediationDispatchLookup)...,
	)
}

func (m *ESignModule) resolveRouteRouter(ctx coreadmin.ModuleContext) coreadmin.AdminRouter {
	if ctx.PublicRouter != nil {
		return ctx.PublicRouter
	}
	return ctx.Router
}

func (m *ESignModule) resolveHandlerReadModels(runtime moduleRegisterRuntime) (services.SourceReadModelService, services.LineageDiagnosticsService, error) {
	sourceReadModels, lineageDiagnostics, err := m.resolveSourceManagementReadModels(runtime.sourceSearch)
	if err != nil {
		return nil, nil, err
	}
	m.sourceReadModels = sourceReadModels
	m.sourceDiagnostics = lineageDiagnostics
	m.reconciliation = runtime.sourceReconciliation
	return sourceReadModels, lineageDiagnostics, nil
}

func (m *ESignModule) buildGoogleRuntime() handlers.GoogleRuntimeConfig {
	googleRuntime := handlers.GoogleRuntimeConfig{
		Enabled:     m.googleEnabled,
		Integration: m.google,
	}
	if m.googleEnabled && m.durableJobs != nil {
		googleRuntime.ImportRuns = m.store
		googleRuntime.ImportJobs = m.store
		googleRuntime.ImportEnqueue = jobs.NewDurableGoogleDriveImportEnqueue(m.durableJobs)
	}
	return googleRuntime
}

func (m *ESignModule) buildRemediationHandlerBindings(
	ctx coreadmin.ModuleContext,
	remediationService commands.PDFRemediationCommandService,
) (handlers.RemediationTrigger, handlers.RemediationDispatchStatusLookup) {
	if remediationService == nil {
		return nil, nil
	}
	return newRemediationCommandTrigger(ctx.Admin.Commands(), m.defaultScope, m.store),
		newRemediationDispatchStatusLookup(m.store, m.store, m.remediationStatus)
}

func (m *ESignModule) handlerRegisterOptions(
	ctx coreadmin.ModuleContext,
	runtime moduleRegisterRuntime,
	sourceReadModels services.SourceReadModelService,
	lineageDiagnostics services.LineageDiagnosticsService,
	googleRuntime handlers.GoogleRuntimeConfig,
	remediationTrigger handlers.RemediationTrigger,
	remediationDispatchLookup handlers.RemediationDispatchStatusLookup,
) []handlers.RegisterOption {
	var preferenceStore coreadmin.PreferencesStore
	if prefs := ctx.Admin.PreferencesService(); prefs != nil {
		preferenceStore = prefs.Store()
	}
	rateLimitRules := resolveRateLimitRulesFromConfig()
	requestTrustPolicy := resolveRequestTrustPolicyFromConfig()
	return []handlers.RegisterOption{
		handlers.WithRequestRateLimiter(handlers.NewSlidingWindowRateLimiter(rateLimitRules)),
		handlers.WithRateLimitRuleResolver(handlers.NewScopedRateLimitRuleResolver(preferenceStore, m.defaultScope, rateLimitRules)),
		handlers.WithAuthorizer(ctx.Admin.Authorizer()),
		handlers.WithAdminRouteMiddleware(ctx.AuthMiddleware),
		handlers.WithPermissions(handlers.DefaultPermissions),
		handlers.WithSignerTokenValidator(m.tokens),
		handlers.WithPublicReviewTokenValidator(m.publicReviewTokens),
		handlers.WithPublicSignerSessionAuthService(m.publicSessionAuth),
		handlers.WithSignerSessionService(m.signing),
		handlers.WithSignerProfileService(m.signerProfiles),
		handlers.WithSignerSavedSignatureService(m.savedSignatures),
		handlers.WithSignerAssetContractService(
			services.NewSignerAssetContractService(m.store,
				services.WithSignerAssetObjectStore(runtime.objectStore),
			),
		),
		handlers.WithAgreementViewerService(
			services.NewAgreementViewService(m.signing, m.store,
				services.WithSignerAssetObjectStore(runtime.objectStore),
			),
		),
		handlers.WithAgreementDeliveryService(m.artifacts),
		handlers.WithAgreementAuthoringService(m.agreements),
		handlers.WithDraftWorkflowService(m.drafts),
		handlers.WithAgreementDraftSyncService(m.draftSync),
		handlers.WithAgreementDraftSyncBootstrap(m.draftSyncBootstrap),
		handlers.WithSignerObjectStore(runtime.objectStore),
		handlers.WithAgreementStatsService(m.store),
		handlers.WithAuditEventStore(m.store),
		handlers.WithGuardedEffectStore(m.store),
		handlers.WithGuardedEffectRecoveryService(runtime.notificationRecovery),
		handlers.WithPDFPolicyService(runtime.pdfService),
		handlers.WithRemediationTrigger(remediationTrigger),
		handlers.WithRemediationDispatchStatusLookup(remediationDispatchLookup),
		handlers.WithDefaultScope(m.defaultScope),
		handlers.WithTransportGuard(handlers.TLSTransportGuard{
			AllowLocalInsecure: true,
			RequestTrustPolicy: requestTrustPolicy,
		}),
		handlers.WithRequestTrustPolicy(requestTrustPolicy),
		handlers.WithSecurityLogEvent(func(event string, fields map[string]any) {
			correlationID := observability.ResolveCorrelationID(strings.TrimSpace(fmt.Sprint(fields["correlation_id"])), strings.TrimSpace(event), moduleID)
			observability.LogOperation(context.Background(), slog.LevelWarn, "api", "security_event", "warning", correlationID, 0, nil, map[string]any{
				"security_event": strings.TrimSpace(event),
				"fields":         fields,
			})
		}),
		handlers.WithGoogleRuntime(googleRuntime),
		handlers.WithSourceReadModelService(sourceReadModels),
		handlers.WithSourceReconciliationService(runtime.sourceReconciliation),
		handlers.WithLineageDiagnosticsService(lineageDiagnostics),
		handlers.WithIntegrationFoundationService(m.integrations),
	}
}

func (m *ESignModule) configureGoogleIntegration(
	jobHandlerDeps jobs.HandlerDependencies,
	durableJobs *jobs.DurableJobRuntime,
	lineageStore stores.LineageStore,
	sourceCommentSync services.SourceCommentSyncService,
	lineageProcessingTrigger services.SourceLineageProcessingTrigger,
) error {
	if !m.googleEnabled {
		return nil
	}
	googleProvider, providerMode, err := services.NewGoogleProviderFromEnv()
	if err != nil {
		return fmt.Errorf("esign module: google provider: %w", err)
	}
	googleIntegration, err := m.newGoogleIntegrationService(googleProvider, providerMode, lineageStore, sourceCommentSync, lineageProcessingTrigger)
	if err != nil {
		return err
	}
	m.google = googleIntegration
	googleImportJobDeps := jobHandlerDeps
	googleImportJobDeps.GoogleImporter = m.google
	durableJobs.RegisterHandler(jobs.JobGoogleDriveImport, jobs.NewHandlers(googleImportJobDeps).HandleGoogleDriveImportJob)
	return nil
}

func (m *ESignModule) newGoogleIntegrationService(
	googleProvider services.GoogleProvider,
	providerMode string,
	lineageStore stores.LineageStore,
	sourceCommentSync services.SourceCommentSyncService,
	lineageProcessingTrigger services.SourceLineageProcessingTrigger,
) (googleIntegrationService, error) {
	if m.services != nil {
		opts := make([]services.GoogleServicesIntegrationOption, 0, 4)
		if lineageStore != nil {
			opts = append(opts, services.WithGoogleServicesLineageStore(lineageStore))
		}
		if sourceCommentSync != nil {
			opts = append(opts, services.WithGoogleServicesSourceCommentSyncService(sourceCommentSync))
		}
		if lineageProcessingTrigger != nil {
			opts = append(opts, services.WithGoogleServicesLineageProcessingTrigger(lineageProcessingTrigger))
		}
		opts = append(opts, services.WithGoogleServicesPersistenceStore(m.store))
		return services.NewGoogleServicesIntegrationService(
			m.services,
			googleProvider,
			providerMode,
			m.documents,
			m.agreements,
			opts...,
		), nil
	}

	googleCipher, err := services.NewGoogleCredentialCipher(context.Background(), services.NewEnvGoogleCredentialKeyProvider())
	if err != nil {
		return nil, fmt.Errorf("esign module: google credential key provider: %w", err)
	}
	opts := []services.GoogleIntegrationOption{
		services.WithGoogleCipher(googleCipher),
		services.WithGoogleProviderMode(providerMode),
	}
	if lineageStore != nil {
		opts = append(opts, services.WithGoogleLineageStore(lineageStore))
	}
	if sourceCommentSync != nil {
		opts = append(opts, services.WithGoogleSourceCommentSyncService(sourceCommentSync))
	}
	if lineageProcessingTrigger != nil {
		opts = append(opts, services.WithGoogleLineageProcessingTrigger(lineageProcessingTrigger))
	}
	return services.NewGoogleIntegrationService(
		m.store,
		googleProvider,
		m.documents,
		m.agreements,
		opts...,
	), nil
}

func (m *ESignModule) resolveSourceManagementReadModels(
	sourceSearch services.SourceSearchService,
) (services.SourceReadModelService, services.LineageDiagnosticsService, error) {
	lineageStore, ok := any(m.store).(stores.LineageStore)
	if !ok {
		return nil, nil, nil
	}
	if sourceSearch == nil {
		searchService, err := services.NewGoSearchSourceSearchService(services.GoSearchSourceSearchConfig{
			Lineage: lineageStore,
		})
		if err != nil {
			return nil, nil, err
		}
		sourceSearch = searchService
	}
	sourceReadModels := services.NewDefaultSourceReadModelService(
		m.store,
		m.store,
		lineageStore,
		services.WithSourceReadModelImportRuns(m.store),
		services.WithSourceReadModelJobRuns(m.store),
		services.WithSourceReadModelSearchService(sourceSearch),
	)
	lineageDiagnostics := services.NewDefaultLineageDiagnosticsService(
		m.store,
		m.store,
		lineageStore,
		services.WithSourceReadModelImportRuns(m.store),
		services.WithSourceReadModelJobRuns(m.store),
	)
	return sourceReadModels, lineageDiagnostics, nil
}

func (m *ESignModule) registerPanels(adm *coreadmin.Admin) error {
	if adm == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	if err := m.registerDocumentPanel(adm); err != nil {
		return err
	}
	return m.registerAgreementPanel(adm)
}

func (m *ESignModule) registerDocumentPanel(adm *coreadmin.Admin) error {
	docRepo := newDocumentPanelRepository(
		m.store,
		m.store,
		m.documents,
		m.documentUploadManager(),
		m.defaultScope,
		m.settings,
	)
	docRepo.authorizer = adm.Authorizer()
	docBuilder := adm.Panel(esignDocumentsPanelID).
		WithRepository(docRepo).
		WithActionStateResolver(documentsActionStateResolver(m.basePath, m.store, m.defaultScope)).
		WithActionDefaults(coreadmin.PanelActionDefaultsModeNone).
		WithBreadcrumbs(coreadmin.PanelBreadcrumbConfig{
			ListLabel:           "Documents",
			RootLabel:           "Home",
			RootHref:            normalizeBasePath(m.basePath),
			ShowCurrentOnDetail: true,
			DetailLabelResolver: func(record map[string]any) string {
				return firstNonEmptyValue(strings.TrimSpace(toString(record["title"])), strings.TrimSpace(toString(record["id"])))
			},
		}).
		ListFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "page_count", Label: "Pages", Type: "number"},
			coreadmin.Field{Name: "size_bytes", Label: "Size", Type: "number"},
			coreadmin.Field{Name: "created_at", Label: "Uploaded", Type: "datetime"},
		).
		FormFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			coreadmin.Field{Name: "source_original_name", Label: "Original File Name", Type: "text", Required: true},
			coreadmin.Field{Name: "source_object_key", Label: "Source Object Key", Type: "text"},
			coreadmin.Field{Name: "pdf_base64", Label: "PDF (Base64)", Type: "textarea"},
		).
		DetailFields(
			coreadmin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "source_original_name", Label: "Original File Name", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "source_object_key", Label: "Source Object Key", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "normalized_object_key", Label: "Normalized Object Key", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "source_sha256", Label: "SHA256", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "pdf_compatibility_tier", Label: "PDF Compatibility", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "pdf_compatibility_reason", Label: "PDF Compatibility Reason", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "pdf_normalization_status", Label: "PDF Normalization", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "pdf_analyzed_at", Label: "PDF Analyzed At", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "pdf_policy_version", Label: "PDF Policy Version", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "size_bytes", Label: "Size", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "page_count", Label: "Pages", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "created_at", Label: "Uploaded", Type: "datetime", ReadOnly: true},
		).
		Filters(
			coreadmin.Filter{Name: "title", Label: "Title", Type: "text"},
		).
		Actions(
			coreadmin.Action{Name: "view", Label: "View", Type: "navigation", Scope: coreadmin.ActionScopeRow, Permission: permissions.AdminESignView},
			coreadmin.Action{Name: "delete", Label: "Delete", Variant: "danger", Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignEdit, Confirm: "Are you sure you want to delete this item?"},
		).
		BulkActions(
			coreadmin.Action{Name: "delete", Label: "Delete", Variant: "danger", Scope: coreadmin.ActionScopeBulk, Permission: permissions.AdminESignEdit, Confirm: "Delete {count} item(s)?"},
		).
		Subresources(
			coreadmin.PanelSubresource{Name: "source", Method: "GET", Permission: permissions.AdminESignView},
		).
		Permissions(coreadmin.PanelPermissions{
			View:   permissions.AdminESignView,
			Create: permissions.AdminESignCreate,
			Edit:   permissions.AdminESignEdit,
			Delete: permissions.AdminESignEdit,
		})

	if _, err := adm.RegisterPanel(esignDocumentsPanelID, docBuilder); err != nil {
		return err
	}
	return nil
}

func (m *ESignModule) registerAgreementPanel(adm *coreadmin.Admin) error {
	agreementRepo := newAgreementPanelRepository(m.store, m.store, m.agreements, m.artifacts, m.activityMap, m.documentUploadManager(), m.defaultScope, m.settings)
	agreementRepo.authorizer = adm.Authorizer()
	agreementRepo.users = adm.UserService()
	agreementRepo.profiles = adm.ProfileService()
	agreementBuilder := adm.Panel(esignAgreementsPanelID).
		WithRepository(agreementRepo).
		WithBreadcrumbs(m.agreementPanelBreadcrumbs()).
		ListFields(m.agreementPanelListFields()...).
		FormFields(m.agreementPanelFormFields()...).
		DetailFields(m.agreementPanelDetailFields()...).
		Filters(m.agreementPanelFilters()...).
		Actions(m.agreementPanelActions()...).
		BulkActions(m.agreementPanelBulkActions()...).
		Subresources(
			coreadmin.PanelSubresource{Name: "artifact", Method: "GET", Permission: permissions.AdminESignDownload},
		).
		Permissions(m.agreementPanelPermissions())

	_, err := adm.RegisterPanel(esignAgreementsPanelID, agreementBuilder)
	return err
}

func (m *ESignModule) agreementPanelBreadcrumbs() coreadmin.PanelBreadcrumbConfig {
	return coreadmin.PanelBreadcrumbConfig{
		ListLabel:           "Agreements",
		RootLabel:           "Home",
		RootHref:            normalizeBasePath(m.basePath),
		ShowCurrentOnDetail: true,
		DetailLabelResolver: func(record map[string]any) string {
			return firstNonEmptyValue(strings.TrimSpace(toString(record["title"])), strings.TrimSpace(toString(record["id"])))
		},
	}
}

func (m *ESignModule) agreementPanelListFields() []coreadmin.Field {
	return []coreadmin.Field{
		{Name: "title", Label: "Title", Type: "text"},
		{Name: "status", Label: "Status", Type: "select"},
		{Name: "workflow_kind", Label: "Workflow", Type: "text"},
		{Name: "reminder_status", Label: "Reminder", Type: "text"},
		{Name: "next_due_at", Label: "Next Reminder", Type: "datetime"},
		{Name: "recipient_count", Label: "Recipients", Type: "number"},
		{Name: "updated_at", Label: "Updated", Type: "datetime"},
	}
}

func (m *ESignModule) agreementPanelFormFields() []coreadmin.Field {
	return []coreadmin.Field{
		{Name: "document_id", Label: "Document", Type: "text", Required: true},
		{Name: "title", Label: "Title", Type: "text", Required: true},
		{Name: "message", Label: "Message", Type: "textarea"},
	}
}

func (m *ESignModule) agreementPanelDetailFields() []coreadmin.Field {
	return []coreadmin.Field{
		{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
		{Name: "document_id", Label: "Document", Type: "text", ReadOnly: true},
		{Name: "title", Label: "Title", Type: "text", ReadOnly: true},
		{Name: "status", Label: "Status", Type: "text", ReadOnly: true},
		{Name: "review_status", Label: "Review Status", Type: "text", ReadOnly: true},
		{Name: "review_gate", Label: "Review Gate", Type: "text", ReadOnly: true},
		{Name: "comments_enabled", Label: "Comments Enabled", Type: "boolean", ReadOnly: true},
		{Name: "workflow_kind", Label: "Workflow", Type: "text", ReadOnly: true},
		{Name: "root_agreement_id", Label: "Root Agreement", Type: "text", ReadOnly: true},
		{Name: "parent_agreement_id", Label: "Parent Agreement", Type: "text", ReadOnly: true},
		{Name: "parent_executed_sha256", Label: "Parent Executed SHA256", Type: "text", ReadOnly: true},
		{Name: "superseded_by_agreement_id", Label: "Superseded By", Type: "text", ReadOnly: true},
		{Name: "reminder_status", Label: "Reminder", Type: "text", ReadOnly: true},
		{Name: "next_due_at", Label: "Next Reminder", Type: "datetime", ReadOnly: true},
		{Name: "last_sent_at", Label: "Last Reminder Sent", Type: "datetime", ReadOnly: true},
		{Name: "reminder_count", Label: "Reminder Count", Type: "number", ReadOnly: true},
		{Name: "last_error_code", Label: "Reminder Error Code", Type: "text", ReadOnly: true},
		{Name: "paused", Label: "Reminders Paused", Type: "boolean", ReadOnly: true},
		{Name: "recipient_count", Label: "Recipients", Type: "number", ReadOnly: true},
		{Name: "sent_at", Label: "Sent", Type: "datetime", ReadOnly: true},
		{Name: "completed_at", Label: "Completed", Type: "datetime", ReadOnly: true},
		{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
	}
}

func (m *ESignModule) agreementPanelFilters() []coreadmin.Filter {
	return []coreadmin.Filter{
		{Name: "version_visibility", Label: "Versions", Type: "select", Options: []coreadmin.Option{
			{Value: "current", Label: "Current"},
			{Value: "all", Label: "All"},
			{Value: "previous", Label: "Previous"},
		}},
		{Name: "status", Label: "Status", Type: "select", Options: agreementStatusOptions()},
		{Name: "title", Label: "Title", Type: "text"},
		{Name: "document_id", Label: "Document ID", Type: "text"},
		{Name: "recipient_email", Label: "Recipient Email", Type: "text"},
	}
}

func agreementReviewPanelActions() []coreadmin.Action {
	return []coreadmin.Action{
		withAgreementActionGuard(coreadmin.Action{Name: "request_review", Label: "Request Review", CommandName: commands.CommandAgreementRequestReview, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, PayloadRequired: []string{"gate", "review_participants"}, PayloadSchema: agreementReviewActionPayloadSchema(true), Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "reopen_review", Label: "Reopen Review", CommandName: commands.CommandAgreementReopenReview, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, PayloadRequired: []string{"gate"}, PayloadSchema: agreementReviewActionPayloadSchema(false), Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "notify_reviewers", Label: "Notify Reviewers", CommandName: commands.CommandAgreementNotifyReviewers, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "pause_review_reminder", Label: "Pause Review Reminder", CommandName: commands.CommandAgreementReviewReminderPause, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "resume_review_reminder", Label: "Resume Review Reminder", CommandName: commands.CommandAgreementReviewReminderResume, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "send_review_reminder_now", Label: "Send Review Reminder Now", CommandName: commands.CommandAgreementReviewReminderSendNow, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "close_review", Label: "Close Review", CommandName: commands.CommandAgreementCloseReview, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "force_approve_review", Label: "Force Approve Review", CommandName: commands.CommandAgreementForceApproveReview, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, PayloadRequired: []string{"reason"}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "approve_review_participant_on_behalf", Label: "Approve On Behalf", CommandName: commands.CommandAgreementApproveReviewOnBehalf, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, PayloadRequired: []string{"participant_id", "reason"}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "create_comment_thread", Label: "Add Review Comment", CommandName: commands.CommandAgreementCreateCommentThread, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignView}, PayloadRequired: []string{"body"}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "reply_comment_thread", Label: "Reply To Review Comment", CommandName: commands.CommandAgreementReplyCommentThread, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignView}, PayloadRequired: []string{"thread_id", "body"}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "resolve_comment_thread", Label: "Resolve Review Comment", CommandName: commands.CommandAgreementResolveCommentThread, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignView}, PayloadRequired: []string{"thread_id"}, Idempotent: true, Overflow: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "reopen_comment_thread", Label: "Reopen Review Comment", CommandName: commands.CommandAgreementReopenCommentThread, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignView}, PayloadRequired: []string{"thread_id"}, Idempotent: true, Overflow: true}),
	}
}

func (m *ESignModule) agreementPanelActions() []coreadmin.Action {
	actions := []coreadmin.Action{
		withAgreementActionGuard(coreadmin.Action{Name: "edit", Label: "Edit", Type: "navigation", Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit}),
		withAgreementActionGuard(coreadmin.Action{Name: "delete", Label: "Delete", Variant: "danger", Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignVoid, Confirm: "Are you sure you want to delete this item?"}),
		withAgreementActionGuard(coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}}),
	}
	actions = append(actions, agreementReviewPanelActions()...)
	actions = append(actions,
		withAgreementActionGuard(coreadmin.Action{Name: "resend", Label: "Resend", CommandName: commands.CommandAgreementResend, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignSend, Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "request_correction", Label: "Request Correction", CommandName: commands.CommandAgreementRequestCorrection, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "request_amendment", Label: "Request Amendment", CommandName: commands.CommandAgreementRequestAmendment, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignEdit, PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend}, Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "resume_delivery", Label: "Resume Delivery", CommandName: commands.CommandAgreementDeliveryResume, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignSend, Idempotent: true}),
		withAgreementActionGuard(coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}}),
	)
	return actions
}

func (m *ESignModule) agreementPanelBulkActions() []coreadmin.Action {
	return []coreadmin.Action{
		withAgreementActionGuard(coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Scope: coreadmin.ActionScopeBulk, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}}),
		withAgreementActionGuard(coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Scope: coreadmin.ActionScopeBulk, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}}),
	}
}

func (m *ESignModule) agreementPanelPermissions() coreadmin.PanelPermissions {
	return coreadmin.PanelPermissions{
		View:   permissions.AdminESignView,
		Create: permissions.AdminESignCreate,
		Edit:   permissions.AdminESignEdit,
		Delete: permissions.AdminESignVoid,
	}
}

func (m *ESignModule) registerPanelTabs(adm *coreadmin.Admin) error {
	if adm == nil {
		return nil
	}
	return adm.RegisterPanelTab(esignAgreementsPanelID, coreadmin.PanelTab{
		ID:         "activity",
		Label:      "Activity",
		Permission: permissions.AdminESignView,
		Scope:      coreadmin.PanelTabScopeDetail,
		Target: coreadmin.PanelTabTarget{
			Type: "path",
			Path: path.Join(adm.BasePath(), "activity"),
		},
		Query: map[string]string{
			"object": "agreement",
		},
	})
}

func (m *ESignModule) MenuItems(locale string) []coreadmin.MenuItem {
	locale = m.resolveMenuLocale(locale)
	menuCode := m.resolveMenuCode()
	items := m.baseMenuItems(locale, menuCode)
	if m.GoogleIntegrationEnabled() {
		items = append(items, m.googleIntegrationMenuItem(locale, menuCode))
	}
	return items
}

func (m *ESignModule) resolveMenuLocale(locale string) string {
	if strings.TrimSpace(locale) == "" {
		locale = m.defaultLocale
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}
	return locale
}

func (m *ESignModule) resolveMenuCode() string {
	menuCode := strings.TrimSpace(m.menuCode)
	if menuCode == "" {
		menuCode = "admin_main"
	}
	return menuCode
}

func (m *ESignModule) baseMenuItems(locale, menuCode string) []coreadmin.MenuItem {
	documentsPath := canonicalESignPanelListPath(m.basePath, esignDocumentsPanelID)
	agreementsPath := canonicalESignPanelListPath(m.basePath, esignAgreementsPanelID)
	sourceBrowserPath := joinBasePath(m.basePath, path.Join("esign", "sources"))
	sourceSearchPath := joinBasePath(m.basePath, path.Join("esign", "source-search"))
	agreementsPos := 15
	documentsPos := 16
	sourceBrowserPos := 17
	sourceSearchPos := 18
	return []coreadmin.MenuItem{
		{
			ID:    "esign.agreements",
			Label: "Agreements",
			Icon:  "design-nib",
			Target: map[string]any{
				"type": "url",
				"path": agreementsPath,
				"key":  esignAgreementsPanelID,
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &agreementsPos,
		},
		{
			ID:    "esign.documents",
			Label: "Documents",
			Icon:  "page",
			Target: map[string]any{
				"type": "url",
				"path": documentsPath,
				"key":  esignDocumentsPanelID,
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &documentsPos,
		},
		{
			ID:    "esign.sources",
			Label: "Source Browser",
			Icon:  "git-branch",
			Target: map[string]any{
				"type": "url",
				"path": sourceBrowserPath,
				"key":  "esign_sources",
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &sourceBrowserPos,
		},
		{
			ID:    "esign.source_search",
			Label: "Source Search",
			Icon:  "search",
			Target: map[string]any{
				"type": "url",
				"path": sourceSearchPath,
				"key":  "esign_source_search",
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &sourceSearchPos,
		},
	}
}

func (m *ESignModule) googleIntegrationMenuItem(locale, menuCode string) coreadmin.MenuItem {
	integrationsPos := 19
	return coreadmin.MenuItem{
		ID:    "esign.integrations",
		Label: "Integrations",
		Icon:  "settings",
		Target: map[string]any{
			"type": "url",
			"path": joinBasePath(m.basePath, path.Join("esign", "integrations", "google")),
			"key":  "esign_integrations_google",
		},
		Permissions: []string{permissions.AdminESignSettings},
		Locale:      locale,
		Menu:        menuCode,
		Position:    &integrationsPos,
	}
}

func featureEnabled(gate fggate.FeatureGate, feature string) bool {
	if gate == nil || strings.TrimSpace(feature) == "" {
		return false
	}
	enabled, err := gate.Enabled(context.Background(), feature, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
	return err == nil && enabled
}

func agreementStatusOptions() []coreadmin.Option {
	return []coreadmin.Option{
		{Value: stores.AgreementStatusDraft, Label: "Draft"},
		{Value: stores.AgreementStatusSent, Label: "Sent"},
		{Value: stores.AgreementStatusInProgress, Label: "In Progress"},
		{Value: stores.AgreementStatusCompleted, Label: "Completed"},
		{Value: stores.AgreementStatusVoided, Label: "Voided"},
		{Value: stores.AgreementStatusDeclined, Label: "Declined"},
		{Value: stores.AgreementStatusExpired, Label: "Expired"},
	}
}

func joinBasePath(basePath, suffix string) string {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" {
		basePath = "/admin"
	}
	basePath = "/" + strings.Trim(basePath, "/")
	if strings.TrimSpace(suffix) == "" {
		return basePath
	}
	return path.Join(basePath, strings.TrimSpace(suffix))
}

func (m *ESignModule) documentUploadManager() *uploader.Manager {
	if m == nil {
		return nil
	}
	if m.uploadManager != nil {
		return m.uploadManager
	}
	maxUploadSize := int64(esignDocumentUploadMaxSize)
	if m.settings.MaxSourcePDFBytes > 0 {
		maxUploadSize = m.settings.MaxSourcePDFBytes
	}
	validator := uploader.NewValidator(
		uploader.WithUploadMaxFileSize(maxUploadSize),
		uploader.WithAllowedMimeTypes(cloneBoolMap(allowedESignDocumentMimeTypes)),
		uploader.WithAllowedImageFormats(cloneBoolMap(allowedESignDocumentExtensions)),
	)
	provider := m.uploadProvider
	if provider == nil {
		assetsDir := m.documentUploadDir()
		provider = uploader.NewFSProvider(assetsDir).WithURLPrefix(joinBasePath(m.basePath, "assets"))
	}
	m.uploadManager = uploader.NewManager(
		uploader.WithProvider(provider),
		uploader.WithValidator(validator),
	)
	return m.uploadManager
}

func (m *ESignModule) documentUploadDir() string {
	if m == nil {
		return resolveESignModuleDiskAssetsDir()
	}
	assetsDir := strings.TrimSpace(m.uploadDir)
	if assetsDir == "" {
		assetsDir = resolveESignModuleDiskAssetsDir()
	}
	if assetsDir == "" {
		assetsDir = path.Join("pkg", "client", "assets")
	}
	m.uploadDir = assetsDir
	return assetsDir
}

func resolveESignModuleDiskAssetsDir() string {
	candidates := []string{
		"assets",
		"pkg/client/assets",
		"../pkg/client/assets",
		"../../pkg/client/assets",
		"../../../pkg/client/assets",
	}
	const marker = "output.css"
	for _, candidate := range candidates {
		trimmed := strings.TrimSpace(candidate)
		if trimmed == "" {
			continue
		}
		if _, err := os.Stat(filepath.Join(trimmed, marker)); err == nil {
			return trimmed
		}
	}
	return ""
}

func cloneBoolMap(in map[string]bool) map[string]bool {
	if len(in) == 0 {
		return map[string]bool{}
	}
	out := make(map[string]bool, len(in))
	maps.Copy(out, in)
	return out
}

func resolveSignerProfilePersistencePolicy() (time.Duration, bool) {
	cfg := appcfg.Active()
	ttlDays := cfg.Signer.ProfileTTLDays
	if ttlDays <= 0 {
		ttlDays = 90
	}
	if ttlDays < 1 {
		ttlDays = 1
	}
	if ttlDays > 365 {
		ttlDays = 365
	}
	persistDrawn := cfg.Signer.ProfilePersistDrawnSignature
	return time.Duration(ttlDays) * 24 * time.Hour, persistDrawn
}

func resolveRequestTrustPolicyFromConfig() quickstart.RequestTrustPolicy {
	return appcfg.ActiveRequestTrustPolicy()
}

func resolveRateLimitRulesFromConfig() map[string]handlers.RateLimitRule {
	active := appcfg.Active().Network.RateLimit
	return map[string]handlers.RateLimitRule{
		handlers.OperationSignerSession: {
			MaxRequests: active.SignerSession.MaxRequests,
			Window:      time.Duration(active.SignerSession.WindowSeconds) * time.Second,
		},
		handlers.OperationSignerConsent: {
			MaxRequests: active.SignerConsent.MaxRequests,
			Window:      time.Duration(active.SignerConsent.WindowSeconds) * time.Second,
		},
		handlers.OperationSignerWrite: {
			MaxRequests: active.SignerWrite.MaxRequests,
			Window:      time.Duration(active.SignerWrite.WindowSeconds) * time.Second,
		},
		handlers.OperationSignerSubmit: {
			MaxRequests: active.SignerSubmit.MaxRequests,
			Window:      time.Duration(active.SignerSubmit.WindowSeconds) * time.Second,
		},
		handlers.OperationAdminResend: {
			MaxRequests: active.AdminResend.MaxRequests,
			Window:      time.Duration(active.AdminResend.WindowSeconds) * time.Second,
		},
	}
}

func resolveSignatureUploadSecurityPolicy() (time.Duration, string) {
	cfg := appcfg.Active()
	ttlSeconds := cfg.Signer.UploadTTLSeconds
	if ttlSeconds <= 0 {
		ttlSeconds = 300
	}
	if ttlSeconds < 60 {
		ttlSeconds = 60
	}
	if ttlSeconds > 900 {
		ttlSeconds = 900
	}
	secret := strings.TrimSpace(cfg.Signer.UploadSigningKey)
	if secret == "" {
		secret = deriveSignerUploadSigningKey(strings.TrimSpace(cfg.Auth.SigningKey))
	}
	return time.Duration(ttlSeconds) * time.Second, secret
}

func deriveSignerUploadSigningKey(authSigningKey string) string {
	authSigningKey = strings.TrimSpace(authSigningKey)
	if authSigningKey == "" {
		return ""
	}
	sum := sha256.Sum256([]byte("esign:signer-upload:v1:" + authSigningKey))
	return hex.EncodeToString(sum[:])
}

func buildPDFRemediationCommandService(
	cfg appcfg.Config,
	store stores.Store,
	objectStore *uploader.Manager,
	pdfService services.PDFService,
	activity coreadmin.ActivitySink,
	projector *AuditActivityProjector,
) (commands.PDFRemediationCommandService, error) {
	if !cfg.Signer.PDF.Remediation.Enabled {
		return nil, nil
	}

	remediation := cfg.Signer.PDF.Remediation
	command := remediation.Command
	template := services.PDFRemediationCommandTemplate{
		Bin:         strings.TrimSpace(command.Bin),
		Args:        append([]string{}, command.Args...),
		Timeout:     time.Duration(command.TimeoutMS) * time.Millisecond,
		MaxPDFBytes: command.MaxPdfBytes,
		MaxLogBytes: command.MaxLogBytes,
	}
	runner, err := services.NewExternalPDFRemediationRunner(template, defaultPDFRemediationExecutableAllowlist)
	if err != nil {
		return nil, err
	}

	opts := []services.PDFRemediationOption{
		services.WithPDFRemediationPDFService(pdfService),
		services.WithPDFRemediationLeaseTTL(time.Duration(remediation.LeaseTTLMS) * time.Millisecond),
	}
	if activity != nil {
		opts = append(opts, services.WithPDFRemediationActivitySink(activity))
	}
	if store != nil {
		opts = append(opts, services.WithPDFRemediationAuditStore(store))
	}
	if projector != nil {
		opts = append(opts, services.WithPDFRemediationActivityProjector(projector))
	}
	service := services.NewPDFRemediationService(store, objectStore, runner, opts...)
	return service, nil
}

func drainScopedOutbox(
	ctx context.Context,
	scope stores.Scope,
	store stores.OutboxStore,
	publisher stores.OutboxPublisher,
	consumer string,
	topics []string,
) error {
	scope = stores.Scope{
		TenantID: strings.TrimSpace(scope.TenantID),
		OrgID:    strings.TrimSpace(scope.OrgID),
	}
	if scope.TenantID == "" || scope.OrgID == "" {
		return nil
	}
	if store == nil || publisher == nil {
		return fmt.Errorf("outbox drain runtime is not configured")
	}
	for _, topic := range topics {
		topic = strings.TrimSpace(topic)
		if topic == "" {
			continue
		}
		for {
			result, err := stores.DispatchOutboxBatch(ctx, store, scope, publisher, stores.OutboxDispatchInput{
				Consumer:   strings.TrimSpace(consumer),
				Topic:      topic,
				Limit:      25,
				Now:        time.Now().UTC(),
				RetryDelay: jobs.DefaultRetryPolicy().BaseDelay,
			})
			if err != nil {
				return err
			}
			if result.Claimed == 0 {
				break
			}
		}
	}
	return nil
}

func (m *ESignModule) validateGoogleRuntimeWiring(ctx context.Context, strict bool) error {
	if m == nil || !m.googleEnabled {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if m.google == nil {
		return fmt.Errorf("esign module: google integration service is required when esign_google is enabled")
	}
	if m.durableJobs == nil {
		return fmt.Errorf("esign module: durable job runtime is required when esign_google is enabled")
	}
	health := m.google.ProviderHealth(ctx)
	if health.Healthy {
		return nil
	}
	if strict {
		return fmt.Errorf("esign module: google provider degraded at startup (mode=%s reason=%s)", strings.TrimSpace(health.Mode), strings.TrimSpace(health.Reason))
	}
	slog.Warn("esign module: google provider degraded at startup", "mode", health.Mode, "reason", health.Reason)
	return nil
}

func (m *ESignModule) validateLineageRuntimeWiring(ctx context.Context) error {
	if m == nil || m.store == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if _, err := release.RequireV2SourceManagementLineageStore(m.store); err != nil {
		return fmt.Errorf("esign module: %w", err)
	}
	if m.sourceReadModels == nil {
		return fmt.Errorf("esign module: source read model service is required when lineage store is enabled")
	}
	if m.sourceDiagnostics == nil {
		return fmt.Errorf("esign module: lineage diagnostics service is required when lineage store is enabled")
	}
	if m.googleEnabled && m.durableJobs == nil {
		return fmt.Errorf("esign module: durable job runtime is required when esign_google is enabled")
	}
	repoRoot, err := resolveV2SourceManagementRepoRoot()
	if err != nil {
		return fmt.Errorf("esign module: resolve v2 source-management repo root: %w", err)
	}
	if err := validateV2SourceManagementRuntime(ctx, repoRoot, m.defaultScope, m.store, m.sourceReadModels); err != nil {
		return fmt.Errorf("esign module: v2 source-management startup validation failed: %w", err)
	}
	return nil
}

func resolveESignStrictStartup() bool {
	return appcfg.Active().Runtime.StrictStartup
}

func agreementReviewActionPayloadSchema(includeParticipants bool) map[string]any {
	properties := map[string]any{
		"gate": map[string]any{
			"type":  "string",
			"title": "Gate",
		},
		"comments_enabled": map[string]any{
			"type":  "boolean",
			"title": "Comments Enabled",
		},
	}
	if includeParticipants {
		properties["review_participants"] = map[string]any{
			"type":  "array",
			"title": "Review Participants",
			"items": map[string]any{
				"type":                 "object",
				"additionalProperties": false,
				"properties": map[string]any{
					"participant_type": map[string]any{
						"type":  "string",
						"title": "Participant Type",
						"enum":  []string{"recipient", "external"},
					},
					"recipient_id": map[string]any{
						"type":  "string",
						"title": "Recipient ID",
					},
					"email": map[string]any{
						"type":  "string",
						"title": "Email",
					},
					"display_name": map[string]any{
						"type":  "string",
						"title": "Display Name",
					},
					"can_comment": map[string]any{
						"type":  "boolean",
						"title": "Can Comment",
					},
					"can_approve": map[string]any{
						"type":  "boolean",
						"title": "Can Approve",
					},
				},
				"required": []string{"participant_type"},
			},
		}
	}
	return map[string]any{
		"type":       "object",
		"properties": properties,
	}
}
