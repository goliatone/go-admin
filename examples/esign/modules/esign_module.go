package modules

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/commands"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/jobs"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	fggate "github.com/goliatone/go-featuregate/gate"
	"github.com/goliatone/go-uploader"
)

const moduleID = "esign"

const (
	esignDocumentUploadMaxSize = 25 * 1024 * 1024
)

var (
	allowedESignDocumentMimeTypes = map[string]bool{
		"application/pdf": true,
	}
	allowedESignDocumentExtensions = map[string]bool{
		".pdf": true,
	}
)

type eSignStore interface {
	stores.DocumentStore
	stores.AgreementStore
	stores.SigningStore
	stores.SigningTokenStore
	stores.SignatureArtifactStore
	stores.AuditEventStore
	stores.AgreementArtifactStore
	stores.EmailLogStore
	stores.JobRunStore
	stores.IntegrationCredentialStore
}

// ESignModule registers routes, panels, commands, settings, and activity projection for e-sign.
type ESignModule struct {
	basePath      string
	defaultLocale string
	menuCode      string
	routes        handlers.RouteSet

	defaultScope  stores.Scope
	settings      RuntimeSettings
	googleEnabled bool
	uploadDir     string

	store         eSignStore
	documents     services.DocumentService
	tokens        stores.TokenService
	agreements    services.AgreementService
	signing       services.SigningService
	artifacts     services.ArtifactPipelineService
	google        services.GoogleIntegrationService
	activityMap   *AuditActivityProjector
	uploadManager *uploader.Manager
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

// SignerAssetContractService returns token-scoped asset contract resolution used by signer web/runtime paths.
func (m *ESignModule) SignerAssetContractService() services.SignerAssetContractService {
	if m == nil || m.store == nil {
		return services.SignerAssetContractService{}
	}
	return services.NewSignerAssetContractService(
		m.store,
		m.store,
		m.store,
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

func (m *ESignModule) Register(ctx coreadmin.ModuleContext) error {
	if ctx.Admin == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	if ctx.Router == nil {
		return fmt.Errorf("esign module: router is nil")
	}

	services.RegisterDomainErrorCodes()
	m.settings = registerRuntimeSettings(ctx.Admin.SettingsService())
	if m.defaultScope.TenantID == "" || m.defaultScope.OrgID == "" {
		m.defaultScope = defaultModuleScope
	}
	if m.store == nil {
		sqliteStore, err := stores.NewSQLiteStore(stores.ResolveSQLiteDSN())
		if err != nil {
			return fmt.Errorf("esign module: sqlite store: %w", err)
		}
		m.store = sqliteStore
	}
	m.googleEnabled = featureEnabled(ctx.Admin.FeatureGate(), "esign_google")
	objectStore := m.documentUploadManager()

	tokenTTL := time.Duration(m.settings.TokenTTLSeconds) * time.Second
	m.documents = services.NewDocumentService(
		m.store,
		services.WithDocumentObjectStore(objectStore),
	)
	m.tokens = stores.NewTokenService(m.store, stores.WithTokenTTL(tokenTTL))
	artifactRenderer := services.NewReadableArtifactRenderer(
		m.store,
		m.store,
		objectStore,
	)
	m.artifacts = services.NewArtifactPipelineService(
		m.store,
		m.store,
		m.store,
		m.store,
		m.store,
		m.store,
		artifactRenderer,
		services.WithArtifactObjectStore(objectStore),
	)
	emailProvider := jobs.EmailProviderFromEnv()
	jobHandlers := jobs.NewHandlers(jobs.HandlerDependencies{
		Agreements:    m.store,
		Artifacts:     m.store,
		JobRuns:       m.store,
		EmailLogs:     m.store,
		Audits:        m.store,
		Tokens:        m.tokens,
		Pipeline:      m.artifacts,
		EmailProvider: emailProvider,
	})
	emailWorkflow := jobs.NewAgreementWorkflow(jobHandlers)
	m.agreements = services.NewAgreementService(
		m.store,
		m.store,
		services.WithAgreementTokenService(m.tokens),
		services.WithAgreementAuditStore(m.store),
		services.WithAgreementEmailWorkflow(emailWorkflow),
	)
	signatureUploadTTL, signatureUploadSecret := resolveSignatureUploadSecurityPolicy()
	m.signing = services.NewSigningService(
		m.store,
		m.store,
		services.WithSigningAuditStore(m.store),
		services.WithSigningCompletionWorkflow(emailWorkflow),
		services.WithSignatureUploadConfig(signatureUploadTTL, signatureUploadSecret),
		services.WithSigningObjectStore(objectStore),
	)
	if m.googleEnabled {
		googleCipher, err := services.NewGoogleCredentialCipher(context.Background(), services.NewEnvGoogleCredentialKeyProvider())
		if err != nil {
			return fmt.Errorf("esign module: google credential key provider: %w", err)
		}
		googleProvider, providerMode, err := services.NewGoogleProviderFromEnv()
		if err != nil {
			return fmt.Errorf("esign module: google provider: %w", err)
		}
		m.google = services.NewGoogleIntegrationService(
			m.store,
			googleProvider,
			m.documents,
			m.agreements,
			services.WithGoogleCipher(googleCipher),
			services.WithGoogleProviderMode(providerMode),
		)
		health := m.google.ProviderHealth(context.Background())
		if !health.Healthy {
			slog.Warn("esign module: google provider degraded at startup", "mode", health.Mode, "reason", health.Reason)
		}
	}
	m.activityMap = NewAuditActivityProjector(ctx.Admin.ActivityFeed(), m.store)

	if err := commands.Register(ctx.Admin.Commands(), m.agreements, m.tokens, m.defaultScope, m.activityMap); err != nil {
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
	handlers.Register(
		ctx.Router,
		m.routes,
		handlers.WithAuthorizer(ctx.Admin.Authorizer()),
		handlers.WithPermissions(handlers.DefaultPermissions),
		handlers.WithSignerTokenValidator(m.tokens),
		handlers.WithSignerSessionService(m.signing),
		handlers.WithSignerAssetContractService(
			services.NewSignerAssetContractService(
				m.store,
				m.store,
				m.store,
				services.WithSignerAssetObjectStore(objectStore),
			),
		),
		handlers.WithAgreementDeliveryService(m.artifacts),
		handlers.WithSignerObjectStore(objectStore),
		handlers.WithAgreementStatsService(m.store),
		handlers.WithAuditEventStore(m.store),
		handlers.WithDefaultScope(m.defaultScope),
		handlers.WithTransportGuard(handlers.TLSTransportGuard{AllowLocalInsecure: true}),
		handlers.WithRequestRateLimiter(handlers.NewSlidingWindowRateLimiter(handlers.DefaultRateLimitRules())),
		handlers.WithSecurityLogEvent(func(event string, fields map[string]any) {
			correlationID := observability.ResolveCorrelationID(strings.TrimSpace(fmt.Sprint(fields["correlation_id"])), strings.TrimSpace(event), moduleID)
			observability.LogOperation(context.Background(), slog.LevelWarn, "api", "security_event", "warning", correlationID, 0, nil, map[string]any{
				"security_event": strings.TrimSpace(event),
				"fields":         fields,
			})
		}),
		handlers.WithGoogleIntegrationEnabled(m.googleEnabled),
		handlers.WithGoogleIntegrationService(m.google),
	)
	return nil
}

func (m *ESignModule) registerPanels(adm *coreadmin.Admin) error {
	if adm == nil {
		return fmt.Errorf("esign module: admin is nil")
	}
	docRepo := newDocumentPanelRepository(
		m.store,
		services.NewDocumentService(m.store, services.WithDocumentObjectStore(m.documentUploadManager())),
		m.documentUploadManager(),
		m.defaultScope,
		m.settings,
	)
	docBuilder := adm.Panel(esignDocumentsPanelID).
		WithRepository(docRepo).
		ListFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "page_count", Label: "Pages", Type: "number"},
			coreadmin.Field{Name: "size_bytes", Label: "Size", Type: "number"},
			coreadmin.Field{Name: "created_at", Label: "Uploaded", Type: "datetime"},
		).
		FormFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", Required: true},
			coreadmin.Field{Name: "source_object_key", Label: "Source Object Key", Type: "text"},
			coreadmin.Field{Name: "pdf_base64", Label: "PDF (Base64)", Type: "textarea"},
		).
		DetailFields(
			coreadmin.Field{Name: "id", Label: "ID", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "title", Label: "Title", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "source_object_key", Label: "Source Object Key", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "source_sha256", Label: "SHA256", Type: "text", ReadOnly: true},
			coreadmin.Field{Name: "size_bytes", Label: "Size", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "page_count", Label: "Pages", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "created_at", Label: "Uploaded", Type: "datetime", ReadOnly: true},
		).
		Filters(
			coreadmin.Filter{Name: "title", Label: "Title", Type: "text"},
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

	agreementRepo := newAgreementPanelRepository(m.store, m.agreements, m.artifacts, m.activityMap, m.documentUploadManager(), m.defaultScope, m.settings)
	agreementBuilder := adm.Panel(esignAgreementsPanelID).
		WithRepository(agreementRepo).
		ListFields(
			coreadmin.Field{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Field{Name: "status", Label: "Status", Type: "select"},
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
			coreadmin.Field{Name: "recipient_count", Label: "Recipients", Type: "number", ReadOnly: true},
			coreadmin.Field{Name: "sent_at", Label: "Sent", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "completed_at", Label: "Completed", Type: "datetime", ReadOnly: true},
			coreadmin.Field{Name: "updated_at", Label: "Updated", Type: "datetime", ReadOnly: true},
		).
		Filters(
			coreadmin.Filter{Name: "status", Label: "Status", Type: "select", Options: agreementStatusOptions()},
			coreadmin.Filter{Name: "title", Label: "Title", Type: "text"},
			coreadmin.Filter{Name: "recipient_email", Label: "Recipient Email", Type: "text"},
		).
		Actions(
			coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}},
			coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}},
			coreadmin.Action{Name: "resend", Label: "Resend", CommandName: commands.CommandAgreementResend, Permission: permissions.AdminESignSend, Idempotent: true},
			coreadmin.Action{Name: "rotate_token", Label: "Rotate Token", CommandName: commands.CommandTokenRotate, Permission: permissions.AdminESignSend, ContextRequired: []string{"recipient_id"}, PayloadRequired: []string{"recipient_id"}},
		).
		BulkActions(
			coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Permission: permissions.AdminESignSend, Idempotent: true, PayloadRequired: []string{"idempotency_key"}},
			coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}},
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

	targetPath := strings.TrimSpace(m.routes.AdminHome)
	if targetPath == "" {
		targetPath = joinBasePath(m.basePath, moduleID)
	}
	documentsPath := joinBasePath(m.basePath, path.Join("content", esignDocumentsPanelID))
	agreementsPath := joinBasePath(m.basePath, path.Join("content", esignAgreementsPanelID))

	rootPos := 15
	agreementsPos := 16
	documentsPos := 17
	items := []coreadmin.MenuItem{
		{
			ID:       "esign.index",
			Label:    "E-Sign",
			LabelKey: "menu.esign",
			Icon:     "shield",
			Target: map[string]any{
				"type": "url",
				"path": targetPath,
				"key":  moduleID,
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &rootPos,
		},
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
		integrationsPos := 18
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
	assetsDir := m.documentUploadDir()
	_ = os.MkdirAll(assetsDir, 0o755)
	maxUploadSize := int64(esignDocumentUploadMaxSize)
	if m.settings.MaxSourcePDFBytes > 0 {
		maxUploadSize = m.settings.MaxSourcePDFBytes
	}
	validator := uploader.NewValidator(
		uploader.WithUploadMaxFileSize(maxUploadSize),
		uploader.WithAllowedMimeTypes(cloneBoolMap(allowedESignDocumentMimeTypes)),
		uploader.WithAllowedImageFormats(cloneBoolMap(allowedESignDocumentExtensions)),
	)
	m.uploadManager = uploader.NewManager(
		uploader.WithProvider(uploader.NewFSProvider(assetsDir)),
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
	for key, value := range in {
		out[key] = value
	}
	return out
}

func resolveSignatureUploadSecurityPolicy() (time.Duration, string) {
	ttlSeconds := 300
	if raw := strings.TrimSpace(os.Getenv("ESIGN_SIGNER_UPLOAD_TTL_SECONDS")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			ttlSeconds = parsed
		}
	}
	if ttlSeconds < 60 {
		ttlSeconds = 60
	}
	if ttlSeconds > 900 {
		ttlSeconds = 900
	}
	return time.Duration(ttlSeconds) * time.Second, strings.TrimSpace(os.Getenv("ESIGN_SIGNER_UPLOAD_SIGNING_KEY"))
}
