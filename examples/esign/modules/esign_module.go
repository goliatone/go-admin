package modules

import (
	"context"
	"fmt"
	"log/slog"
	"path"
	"strings"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/commands"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/permissions"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	fggate "github.com/goliatone/go-featuregate/gate"
)

const moduleID = "esign"

// ESignModule registers routes, panels, commands, settings, and activity projection for e-sign.
type ESignModule struct {
	basePath      string
	defaultLocale string
	menuCode      string
	routes        handlers.RouteSet

	defaultScope  stores.Scope
	settings      RuntimeSettings
	googleEnabled bool

	store       *stores.InMemoryStore
	documents   services.DocumentService
	tokens      stores.TokenService
	agreements  services.AgreementService
	signing     services.SigningService
	artifacts   services.ArtifactPipelineService
	google      services.GoogleIntegrationService
	activityMap *AuditActivityProjector
}

func NewESignModule(basePath, defaultLocale, menuCode string) *ESignModule {
	return &ESignModule{
		basePath:      strings.TrimSpace(basePath),
		defaultLocale: strings.TrimSpace(defaultLocale),
		menuCode:      strings.TrimSpace(menuCode),
		defaultScope:  defaultModuleScope,
	}
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
		m.store = stores.NewInMemoryStore()
	}
	m.googleEnabled = featureEnabled(ctx.Admin.FeatureGate(), "esign_google")

	tokenTTL := time.Duration(m.settings.TokenTTLSeconds) * time.Second
	m.documents = services.NewDocumentService(m.store)
	m.tokens = stores.NewTokenService(m.store, stores.WithTokenTTL(tokenTTL))
	m.agreements = services.NewAgreementService(
		m.store,
		m.store,
		services.WithAgreementTokenService(m.tokens),
		services.WithAgreementAuditStore(m.store),
	)
	m.signing = services.NewSigningService(
		m.store,
		m.store,
		services.WithSigningAuditStore(m.store),
	)
	m.artifacts = services.NewArtifactPipelineService(m.store, m.store, m.store, m.store, m.store, m.store, nil)
	if m.googleEnabled {
		googleCipher, err := services.NewGoogleCredentialCipher(context.Background(), services.NewEnvGoogleCredentialKeyProvider())
		if err != nil {
			return fmt.Errorf("esign module: google credential key provider: %w", err)
		}
		m.google = services.NewGoogleIntegrationService(
			m.store,
			services.NewDeterministicGoogleProvider(),
			m.documents,
			m.agreements,
			services.WithGoogleCipher(googleCipher),
		)
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
	docRepo := newDocumentPanelRepository(m.store, services.NewDocumentService(m.store), m.defaultScope, m.settings)
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

	agreementRepo := newAgreementPanelRepository(m.store, m.agreements, m.artifacts, m.activityMap, m.defaultScope, m.settings)
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
			coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Permission: permissions.AdminESignSend, PayloadRequired: []string{"idempotency_key"}},
			coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}},
			coreadmin.Action{Name: "resend", Label: "Resend", CommandName: commands.CommandAgreementResend, Permission: permissions.AdminESignSend, PayloadRequired: []string{"recipient_id"}},
			coreadmin.Action{Name: "rotate_token", Label: "Rotate Token", CommandName: commands.CommandTokenRotate, Permission: permissions.AdminESignSend, PayloadRequired: []string{"recipient_id"}},
		).
		BulkActions(
			coreadmin.Action{Name: "send", Label: "Send", CommandName: commands.CommandAgreementSend, Permission: permissions.AdminESignSend, PayloadRequired: []string{"idempotency_key"}},
			coreadmin.Action{Name: "void", Label: "Void", CommandName: commands.CommandAgreementVoid, Permission: permissions.AdminESignVoid, PayloadRequired: []string{"reason"}},
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

	targetPath := strings.TrimSpace(m.routes.AdminStatus)
	if targetPath == "" {
		targetPath = joinBasePath(m.basePath, moduleID)
	}

	pos := 15
	return []coreadmin.MenuItem{
		{
			ID:       "esign.index",
			Label:    "E-Sign",
			LabelKey: "menu.esign",
			Icon:     "signature",
			Target: map[string]any{
				"type": "url",
				"path": targetPath,
				"key":  moduleID,
			},
			Permissions: []string{permissions.AdminESignView},
			Locale:      locale,
			Menu:        menuCode,
			Position:    &pos,
		},
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
