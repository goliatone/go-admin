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

	store              eSignStore
	services           *servicesmodule.Module
	documents          services.DocumentService
	tokens             stores.TokenService
	reviewTokens       stores.ReviewSessionTokenService
	publicReviewTokens services.PublicReviewTokenResolver
	agreements         services.AgreementService
	reminders          services.AgreementReminderService
	drafts             services.DraftService
	draftSync          synccore.SyncService
	draftSyncBootstrap *esignsync.AgreementDraftBootstrapper
	signing            services.SigningService
	signerProfiles     services.SignerProfileService
	savedSignatures    services.SignerSavedSignatureService
	artifacts          services.ArtifactPipelineService
	google             googleIntegrationService
	sourceLineageQueue *jobs.SourceLineageQueue
	googleImportQueue  *jobs.GoogleDriveImportQueue
	emailOutbox        *jobs.EmailOutboxDispatcher
	signingWorkflows   *jobs.SigningWorkflowOutboxDispatcher
	integrations       services.IntegrationFoundationService
	activityMap        *AuditActivityProjector
	uploadProvider     uploader.Uploader
	uploadManager      *uploader.Manager
	remediationStatus  jobqueue.DispatchStatusReader
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
	if m.googleImportQueue != nil {
		m.googleImportQueue.Close()
		m.googleImportQueue = nil
	}
	if m.sourceLineageQueue != nil {
		m.sourceLineageQueue.Close()
		m.sourceLineageQueue = nil
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
		"esign.signing.session":                 "/signing/session/:token",
		"esign.signing.review.threads":          "/signing/session/:token/review/threads",
		"esign.signing.review.threads.replies":  "/signing/session/:token/review/threads/:thread_id/replies",
		"esign.signing.review.threads.resolve":  "/signing/session/:token/review/threads/:thread_id/resolve",
		"esign.signing.review.threads.reopen":   "/signing/session/:token/review/threads/:thread_id/reopen",
		"esign.signing.review.approve":          "/signing/session/:token/review/approve",
		"esign.signing.review.request_changes":  "/signing/session/:token/review/request-changes",
		"esign.signing.consent":                 "/signing/consent/:token",
		"esign.signing.field_values":            "/signing/field-values/:token",
		"esign.signing.field_values.signature":  "/signing/field-values/signature/:token",
		"esign.signing.signature_upload":        "/signing/signature-upload/:token",
		"esign.signing.signature_upload.object": "/signing/signature-upload/object",
		"esign.signing.telemetry":               "/signing/telemetry/:token",
		"esign.signing.submit":                  "/signing/submit/:token",
		"esign.signing.decline":                 "/signing/decline/:token",
		"esign.signing.assets":                  "/signing/assets/:token",
		"esign.signing.profile":                 "/signing/profile/:token",
		"esign.signing.signatures":              "/signing/signatures/:token",
		"esign.signing.signatures.id":           "/signing/signatures/:token/:id",
	}
}

// ValidateStartup performs post-registration startup validation checks.
func (m *ESignModule) ValidateStartup(ctx context.Context) error {
	if m == nil {
		return fmt.Errorf("esign module: startup validator module is nil")
	}
	return m.validateGoogleRuntimeWiring(ctx, resolveESignStrictStartup())
}

func (m *ESignModule) Register(ctx coreadmin.ModuleContext) error {
	if ctx.Admin == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	if ctx.Router == nil && ctx.PublicRouter == nil {
		return fmt.Errorf("esign module: router is nil")
	}

	services.RegisterDomainErrorCodes()
	m.settings = registerRuntimeSettings(ctx.Admin.SettingsService())
	adminScopeDefaults := ctx.Admin.ScopeDefaults()
	if adminScopeDefaults.Enabled {
		tenantID := strings.TrimSpace(adminScopeDefaults.TenantID)
		if tenantID == "" {
			tenantID = strings.TrimSpace(m.defaultScope.TenantID)
		}
		orgID := strings.TrimSpace(adminScopeDefaults.OrgID)
		if orgID == "" {
			orgID = strings.TrimSpace(m.defaultScope.OrgID)
		}
		m.defaultScope = stores.Scope{
			TenantID: tenantID,
			OrgID:    orgID,
		}
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
	objectStore := m.documentUploadManager()
	pdfPolicyResolver := services.NewRuntimePDFPolicyResolver(ctx.Admin.SettingsService())
	pdfService := services.NewPDFService(
		services.WithPDFPolicyResolver(pdfPolicyResolver),
	)

	tokenTTL := time.Duration(m.settings.TokenTTLSeconds) * time.Second
	m.documents = services.NewDocumentService(
		m.store,
		services.WithDocumentObjectStore(objectStore),
		services.WithDocumentPDFService(pdfService),
	)
	m.tokens = stores.NewTokenService(m.store, stores.WithTokenTTL(tokenTTL))
	m.reviewTokens = stores.NewReviewSessionTokenService(m.store, stores.WithReviewSessionTokenTTL(tokenTTL))
	m.publicReviewTokens = services.NewPublicReviewTokenResolver(m.tokens, m.reviewTokens)
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
	emailProvider := jobs.EmailProviderFromEnv()
	jobHandlerDeps := jobs.HandlerDependencies{
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
		EmailProvider:    emailProvider,
		Transactions:     m.store,
	}
	jobHandlers := jobs.NewHandlers(jobHandlerDeps)
	var lineageStore stores.LineageStore
	if resolved, ok := any(m.store).(stores.LineageStore); ok {
		lineageStore = resolved
	}
	var sourceReconciliation services.SourceReconciliationService
	var lineageProcessingTrigger services.SourceLineageProcessingTrigger
	m.sourceLineageQueue = nil
	if lineageStore != nil {
		fingerprintService := services.NewDefaultSourceFingerprintService(lineageStore, objectStore)
		reconciliationService := services.NewDefaultSourceReconciliationService(lineageStore)
		sourceReconciliation = reconciliationService
		lineageJobDeps := jobHandlerDeps
		lineageJobDeps.Fingerprints = fingerprintService
		lineageJobDeps.Reconciliation = reconciliationService
		lineageQueue, queueErr := jobs.NewSourceLineageQueue(jobs.NewHandlers(lineageJobDeps))
		if queueErr != nil {
			return fmt.Errorf("esign module: source lineage queue: %w", queueErr)
		}
		m.sourceLineageQueue = lineageQueue
		lineageProcessingTrigger = jobs.NewSourceLineageProcessingEnqueuer(lineageQueue.Enqueue)
	}
	emailWorkflow := jobs.NewAgreementWorkflow(jobHandlers)
	emailOutbox, err := jobs.NewEmailOutboxDispatcher(m.store, jobs.NewEmailOutboxPublisher(jobHandlers))
	if err != nil {
		return fmt.Errorf("esign module: email outbox dispatcher: %w", err)
	}
	emailOutbox.NotifyScope(m.defaultScope)
	m.emailOutbox = emailOutbox
	signingWorkflowOutbox, err := jobs.NewSigningWorkflowOutboxDispatcher(
		m.store,
		jobs.NewSigningWorkflowOutboxPublisher(jobHandlers, emailWorkflow, emailWorkflow),
	)
	if err != nil {
		return fmt.Errorf("esign module: signing workflow outbox dispatcher: %w", err)
	}
	signingWorkflowOutbox.NotifyScope(m.defaultScope)
	m.signingWorkflows = signingWorkflowOutbox
	m.agreements = services.NewAgreementService(m.store,
		services.WithAgreementTokenService(m.tokens),
		services.WithAgreementReviewTokenService(m.reviewTokens),
		services.WithAgreementAuditStore(m.store),
		services.WithAgreementReminderStore(m.store),
		services.WithAgreementNotificationOutbox(m.store),
		services.WithAgreementNotificationDispatchTrigger(emailOutbox),
		services.WithAgreementEmailWorkflow(emailWorkflow),
		services.WithAgreementPlacementObjectStore(objectStore),
		services.WithAgreementPDFService(pdfService),
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
	syncObserver := observability.NewSyncKernelObserver()
	draftSync, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(m.drafts),
		esignsync.NewAgreementDraftIdempotencyStore(m.store),
		syncservice.WithMetrics(syncObserver),
		syncservice.WithLogger(syncObserver),
	)
	if err != nil {
		return fmt.Errorf("esign module: agreement draft sync service: %w", err)
	}
	m.draftSync = draftSync
	m.draftSyncBootstrap = esignsync.NewAgreementDraftBootstrapper(m.drafts)
	signatureUploadTTL, signatureUploadSecret := resolveSignatureUploadSecurityPolicy()
	m.signing = services.NewSigningService(m.store,
		services.WithSigningAuditStore(m.store),
		services.WithSigningWorkflowOutbox(m.store),
		services.WithSigningWorkflowDispatchTrigger(signingWorkflowOutbox),
		services.WithSigningCompletionWorkflow(emailWorkflow),
		services.WithSigningStageWorkflow(emailWorkflow),
		services.WithSignatureUploadConfig(signatureUploadTTL, signatureUploadSecret),
		services.WithSigningObjectStore(objectStore),
		services.WithSigningPDFService(pdfService),
	)
	profileTTL, persistDrawnSignature := resolveSignerProfilePersistencePolicy()
	m.signerProfiles = services.NewSignerProfileService(
		m.store,
		services.WithSignerProfileTTL(profileTTL),
		services.WithSignerProfilePersistDrawnSignature(persistDrawnSignature),
	)
	savedSignatureLimit := int(m.settings.SavedSignaturesLimit)
	if savedSignatureLimit <= 0 {
		savedSignatureLimit = appcfg.Active().Signer.SavedSignaturesLimitPerType
	}
	if savedSignatureLimit <= 0 {
		savedSignatureLimit = 10
	}
	settingsService := ctx.Admin.SettingsService()
	m.savedSignatures = services.NewSignerSavedSignatureService(
		m.store,
		services.WithSignerSavedSignatureDefaultLimit(savedSignatureLimit),
		services.WithSignerSavedSignatureObjectStore(objectStore),
		services.WithSignerSavedSignatureLimitResolver(func(_ context.Context, _ stores.Scope, subject, _ string) int {
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
				if _, err := fmt.Sscan(trimmed, &parsed); err == nil {
					return parsed
				}
			}
			return 0
		}),
	)
	m.integrations = services.NewIntegrationFoundationService(
		m.store,
		services.WithIntegrationAuditStore(m.store),
	)
	m.googleImportQueue = nil
	if m.googleEnabled {
		googleProvider, providerMode, err := services.NewGoogleProviderFromEnv()
		if err != nil {
			return fmt.Errorf("esign module: google provider: %w", err)
		}
		if m.services != nil {
			opts := make([]services.GoogleServicesIntegrationOption, 0, 1)
			if lineageStore != nil {
				opts = append(opts, services.WithGoogleServicesLineageStore(lineageStore))
			}
			if lineageProcessingTrigger != nil {
				opts = append(opts, services.WithGoogleServicesLineageProcessingTrigger(lineageProcessingTrigger))
			}
			opts = append(opts, services.WithGoogleServicesPersistenceStore(m.store))
			m.google = services.NewGoogleServicesIntegrationService(
				m.services,
				googleProvider,
				providerMode,
				m.documents,
				m.agreements,
				opts...,
			)
		} else {
			googleCipher, cipherErr := services.NewGoogleCredentialCipher(context.Background(), services.NewEnvGoogleCredentialKeyProvider())
			if cipherErr != nil {
				return fmt.Errorf("esign module: google credential key provider: %w", cipherErr)
			}
			opts := []services.GoogleIntegrationOption{
				services.WithGoogleCipher(googleCipher),
				services.WithGoogleProviderMode(providerMode),
			}
			if lineageStore != nil {
				opts = append(opts, services.WithGoogleLineageStore(lineageStore))
			}
			if lineageProcessingTrigger != nil {
				opts = append(opts, services.WithGoogleLineageProcessingTrigger(lineageProcessingTrigger))
			}
			m.google = services.NewGoogleIntegrationService(
				m.store,
				googleProvider,
				m.documents,
				m.agreements,
				opts...,
			)
		}
		googleImportJobDeps := jobHandlerDeps
		googleImportJobDeps.GoogleImporter = m.google
		googleImportQueue, queueErr := jobs.NewGoogleDriveImportQueue(jobs.NewHandlers(googleImportJobDeps))
		if queueErr != nil {
			return fmt.Errorf("esign module: google import queue: %w", queueErr)
		}
		m.googleImportQueue = googleImportQueue
	}
	if err := m.validateGoogleRuntimeWiring(context.Background(), resolveESignStrictStartup()); err != nil {
		return err
	}
	m.activityMap = NewAuditActivityProjector(ctx.Admin.ActivityFeed(), m.store)
	notificationRecovery := services.NewAgreementNotificationRecoveryService(
		m.store,
		m.tokens,
		services.WithAgreementNotificationRecoveryReviewTokens(m.reviewTokens),
		services.WithAgreementNotificationRecoveryDispatch(m.emailOutbox),
	)

	registerOptions := make([]commands.RegisterOption, 0, 1)
	remediationService, remediationErr := buildPDFRemediationCommandService(
		appcfg.Active(),
		m.store,
		objectStore,
		pdfService,
		ctx.Admin.ActivityFeed(),
		m.activityMap,
	)
	if remediationErr != nil {
		return fmt.Errorf("esign module: pdf remediation runtime: %w", remediationErr)
	}
	if remediationService != nil {
		registerOptions = append(registerOptions, commands.WithPDFRemediationService(remediationService))
	}
	registerOptions = append(registerOptions, commands.WithGuardedEffectRecoveryService(notificationRecovery))
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
	if err := ensureDefaultRoleMappings(ctx.Admin); err != nil {
		return err
	}

	m.routes = handlers.BuildRouteSet(ctx.Admin.URLs(), ctx.Admin.BasePath(), ctx.Admin.AdminAPIGroup())
	routeRouter := ctx.PublicRouter
	if routeRouter == nil {
		routeRouter = ctx.Router
	}
	var sourceReadModels services.SourceReadModelService
	var lineageDiagnostics services.LineageDiagnosticsService
	if lineageStore, ok := any(m.store).(stores.LineageStore); ok {
		sourceReadModels = services.NewDefaultSourceReadModelService(
			m.store,
			m.store,
			lineageStore,
			services.WithSourceReadModelImportRuns(m.store),
		)
		lineageDiagnostics = services.NewDefaultLineageDiagnosticsService(
			m.store,
			m.store,
			lineageStore,
			services.WithSourceReadModelImportRuns(m.store),
		)
	}
	googleRuntime := handlers.GoogleRuntimeConfig{
		Enabled:     m.googleEnabled,
		Integration: m.google,
	}
	if m.googleImportQueue != nil {
		googleRuntime.ImportRuns = m.store
		googleRuntime.ImportEnqueue = func(ctx context.Context, msg jobs.GoogleDriveImportMsg) error {
			return m.googleImportQueue.Enqueue(ctx, msg)
		}
	}
	rateLimitRules := resolveRateLimitRulesFromConfig()
	requestTrustPolicy := resolveRequestTrustPolicyFromConfig()
	var remediationTrigger handlers.RemediationTrigger
	var remediationDispatchLookup handlers.RemediationDispatchStatusLookup
	if remediationService != nil {
		remediationTrigger = newRemediationCommandTrigger(ctx.Admin.Commands(), m.defaultScope, m.store)
		remediationDispatchLookup = newRemediationDispatchStatusLookup(m.store, m.store, m.remediationStatus)
	}
	var preferenceStore coreadmin.PreferencesStore
	if prefs := ctx.Admin.PreferencesService(); prefs != nil {
		preferenceStore = prefs.Store()
	}
	if err := handlers.Register(
		routeRouter,
		m.routes,
		handlers.WithRequestRateLimiter(handlers.NewSlidingWindowRateLimiter(rateLimitRules)),
		handlers.WithRateLimitRuleResolver(handlers.NewScopedRateLimitRuleResolver(preferenceStore, m.defaultScope, rateLimitRules)),
		handlers.WithAuthorizer(ctx.Admin.Authorizer()),
		handlers.WithAdminRouteMiddleware(ctx.AuthMiddleware),
		handlers.WithPermissions(handlers.DefaultPermissions),
		handlers.WithSignerTokenValidator(m.tokens),
		handlers.WithPublicReviewTokenValidator(m.publicReviewTokens),
		handlers.WithSignerSessionService(m.signing),
		handlers.WithSignerProfileService(m.signerProfiles),
		handlers.WithSignerSavedSignatureService(m.savedSignatures),
		handlers.WithSignerAssetContractService(
			services.NewSignerAssetContractService(m.store,
				services.WithSignerAssetObjectStore(objectStore),
			),
		),
		handlers.WithAgreementDeliveryService(m.artifacts),
		handlers.WithAgreementAuthoringService(m.agreements),
		handlers.WithDraftWorkflowService(m.drafts),
		handlers.WithAgreementDraftSyncService(m.draftSync),
		handlers.WithAgreementDraftSyncBootstrap(m.draftSyncBootstrap),
		handlers.WithSignerObjectStore(objectStore),
		handlers.WithAgreementStatsService(m.store),
		handlers.WithAuditEventStore(m.store),
		handlers.WithGuardedEffectStore(m.store),
		handlers.WithGuardedEffectRecoveryService(notificationRecovery),
		handlers.WithPDFPolicyService(pdfService),
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
		handlers.WithSourceReconciliationService(sourceReconciliation),
		handlers.WithLineageDiagnosticsService(lineageDiagnostics),
		handlers.WithIntegrationFoundationService(m.integrations),
	); err != nil {
		return err
	}
	return nil
}

func (m *ESignModule) registerPanels(adm *coreadmin.Admin) error {
	if adm == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	docRepo := newDocumentPanelRepository(
		m.store,
		m.store,
		m.documents,
		m.documentUploadManager(),
		m.defaultScope,
		m.settings,
	)
	docBuilder := adm.Panel(esignDocumentsPanelID).
		WithRepository(docRepo).
		WithActionStateResolver(documentsActionStateResolver(m.basePath, m.store, m.defaultScope)).
		WithActionDefaults(coreadmin.PanelActionDefaultsModeNone).
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

	agreementRepo := newAgreementPanelRepository(m.store, m.store, m.agreements, m.artifacts, m.activityMap, m.documentUploadManager(), m.defaultScope, m.settings)
	agreementBuilder := adm.Panel(esignAgreementsPanelID).
		WithRepository(agreementRepo).
		ListFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "status", Label: "Status", Type: "select"},
			coreadmin.Field{Name: "workflow_kind", Label: "Workflow", Type: "text"},
			coreadmin.Field{Name: "reminder_status", Label: "Reminder", Type: "text"},
			coreadmin.Field{Name: "next_due_at", Label: "Next Reminder", Type: "datetime"},
			coreadmin.Field{Name: "recipient_count", Label: "Recipients", Type: "number"},
			coreadmin.Field{Name: "updated_at", Label: "Updated", Type: "datetime"},
		).
		FormFields(
			coreadmin.Field{Name: "document_id", Label: "Document", Type: "text", Required: true},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			coreadmin.Field{Name: "message", Label: "Message", Type: "textarea"},
		).
		DetailFields(
			coreadmin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "document_id", Label: "Document", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "status", Label: "Status", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "review_status", Label: "Review Status", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "review_gate", Label: "Review Gate", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "comments_enabled", Label: "Comments Enabled", Type: "boolean", ReadOnly: true},
			coreadmin.Field{Name: "workflow_kind", Label: "Workflow", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "root_agreement_id", Label: "Root Agreement", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "parent_agreement_id", Label: "Parent Agreement", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "parent_executed_sha256", Label: "Parent Executed SHA256", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "superseded_by_agreement_id", Label: "Superseded By", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "reminder_status", Label: "Reminder", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "next_due_at", Label: "Next Reminder", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "last_sent_at", Label: "Last Reminder Sent", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "reminder_count", Label: "Reminder Count", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "last_error_code", Label: "Reminder Error Code", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "paused", Label: "Reminders Paused", Type: "boolean", ReadOnly: true},
			coreadmin.Field{Name: "recipient_count", Label: "Recipients", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "sent_at", Label: "Sent", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "completed_at", Label: "Completed", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
		).
		Filters(
			coreadmin.Filter{Name: "version_visibility", Label: "Versions", Type: "select", Options: []coreadmin.Option{
				{Value: "current", Label: "Current"},
				{Value: "all", Label: "All"},
				{Value: "previous", Label: "Previous"},
			}},
			coreadmin.Filter{Name: "status", Label: "Status", Type: "select", Options: agreementStatusOptions()},
			coreadmin.Filter{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Filter{Name: "document_id", Label: "Document ID", Type: "text"},
			coreadmin.Filter{Name: "recipient_email", Label: "Recipient Email", Type: "text"},
		).
		Actions(
			withAgreementActionGuard(coreadmin.Action{Name: "edit", Label: "Edit", Type: "navigation", Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignEdit}),
			withAgreementActionGuard(coreadmin.Action{Name: "delete", Label: "Delete", Variant: "danger", Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignVoid, Confirm: "Are you sure you want to delete this item?"}),
			withAgreementActionGuard(coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "request_review",
				Label:           "Request Review",
				CommandName:     commands.CommandAgreementRequestReview,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				PayloadRequired: []string{"gate", "review_participants"},
				Idempotent:      true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "reopen_review",
				Label:           "Reopen Review",
				CommandName:     commands.CommandAgreementReopenReview,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				PayloadRequired: []string{"gate"},
				Idempotent:      true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "notify_reviewers",
				Label:          "Notify Reviewers",
				CommandName:    commands.CommandAgreementNotifyReviewers,
				Scope:          coreadmin.ActionScopeDetail,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
				Overflow:       true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "pause_review_reminder",
				Label:          "Pause Review Reminder",
				CommandName:    commands.CommandAgreementReviewReminderPause,
				Scope:          coreadmin.ActionScopeDetail,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
				Overflow:       true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "resume_review_reminder",
				Label:          "Resume Review Reminder",
				CommandName:    commands.CommandAgreementReviewReminderResume,
				Scope:          coreadmin.ActionScopeDetail,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
				Overflow:       true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "send_review_reminder_now",
				Label:          "Send Review Reminder Now",
				CommandName:    commands.CommandAgreementReviewReminderSendNow,
				Scope:          coreadmin.ActionScopeDetail,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
				Overflow:       true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "close_review",
				Label:          "Close Review",
				CommandName:    commands.CommandAgreementCloseReview,
				Scope:          coreadmin.ActionScopeDetail,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "force_approve_review",
				Label:           "Force Approve Review",
				CommandName:     commands.CommandAgreementForceApproveReview,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				PayloadRequired: []string{"reason"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "approve_review_participant_on_behalf",
				Label:           "Approve On Behalf",
				CommandName:     commands.CommandAgreementApproveReviewOnBehalf,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				PayloadRequired: []string{"participant_id", "reason"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "create_comment_thread",
				Label:           "Add Review Comment",
				CommandName:     commands.CommandAgreementCreateCommentThread,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignView},
				PayloadRequired: []string{"body"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "reply_comment_thread",
				Label:           "Reply To Review Comment",
				CommandName:     commands.CommandAgreementReplyCommentThread,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignView},
				PayloadRequired: []string{"thread_id", "body"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "resolve_comment_thread",
				Label:           "Resolve Review Comment",
				CommandName:     commands.CommandAgreementResolveCommentThread,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignView},
				PayloadRequired: []string{"thread_id"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:            "reopen_comment_thread",
				Label:           "Reopen Review Comment",
				CommandName:     commands.CommandAgreementReopenCommentThread,
				Scope:           coreadmin.ActionScopeDetail,
				Permission:      permissions.AdminESignEdit,
				PermissionsAll:  []string{permissions.AdminESignEdit, permissions.AdminESignView},
				PayloadRequired: []string{"thread_id"},
				Idempotent:      true,
				Overflow:        true,
			}),
			withAgreementActionGuard(coreadmin.Action{Name: "resend", Label: "Resend", CommandName: commands.CommandAgreementResend, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignSend, Idempotent: true}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "request_correction",
				Label:          "Request Correction",
				CommandName:    commands.CommandAgreementRequestCorrection,
				Scope:          coreadmin.ActionScopeAny,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
			}),
			withAgreementActionGuard(coreadmin.Action{
				Name:           "request_amendment",
				Label:          "Request Amendment",
				CommandName:    commands.CommandAgreementRequestAmendment,
				Scope:          coreadmin.ActionScopeAny,
				Permission:     permissions.AdminESignEdit,
				PermissionsAll: []string{permissions.AdminESignEdit, permissions.AdminESignSend},
				Idempotent:     true,
			}),
			withAgreementActionGuard(coreadmin.Action{Name: "resume_delivery", Label: "Resume Delivery", CommandName: commands.CommandAgreementDeliveryResume, Scope: coreadmin.ActionScopeDetail, Permission: permissions.AdminESignSend, Idempotent: true}),
			withAgreementActionGuard(coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Scope: coreadmin.ActionScopeAny, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}}),
		).
		BulkActions(
			withAgreementActionGuard(coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Scope: coreadmin.ActionScopeBulk, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}}),
			withAgreementActionGuard(coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Scope: coreadmin.ActionScopeBulk, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}}),
		).
		Subresources(
			coreadmin.PanelSubresource{Name: "artifact", Method: "GET", Permission: permissions.AdminESignDownload},
		).
		Permissions(coreadmin.PanelPermissions{
			View:   permissions.AdminESignView,
			Create: permissions.AdminESignCreate,
			Edit:   permissions.AdminESignEdit,
			Delete: permissions.AdminESignVoid,
		})

	_, err := adm.RegisterPanel(esignAgreementsPanelID, agreementBuilder)
	return err
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
	if strings.TrimSpace(locale) == "" {
		locale = m.defaultLocale
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}
	menuCode := strings.TrimSpace(m.menuCode)
	if menuCode == "" {
		menuCode = "admin_main"
	}

	documentsPath := joinBasePath(m.basePath, path.Join("content", esignDocumentsPanelID))
	agreementsPath := joinBasePath(m.basePath, path.Join("content", esignAgreementsPanelID))

	agreementsPos := 15
	documentsPos := 16
	items := []coreadmin.MenuItem{
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
	}
	if m.GoogleIntegrationEnabled() {
		integrationsPos := 17
		items = append(items, coreadmin.MenuItem{
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
		})
	}
	return items
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
	if m.googleImportQueue == nil {
		return fmt.Errorf("esign module: google import queue is required when esign_google is enabled")
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

func resolveESignStrictStartup() bool {
	return appcfg.Active().Runtime.StrictStartup
}
