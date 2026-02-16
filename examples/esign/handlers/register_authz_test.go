package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
	goerrors "github.com/goliatone/go-errors"
	router "github.com/goliatone/go-router"
)

type rejectingValidator struct{}

func (rejectingValidator) Validate(context.Context, stores.Scope, string) (stores.SigningTokenRecord, error) {
	return stores.SigningTokenRecord{}, goerrors.New("expired", goerrors.CategoryAuthz).
		WithCode(http.StatusGone).
		WithTextCode(string(services.ErrorCodeTokenExpired))
}

type mapAuthorizer struct {
	allowed map[string]bool
}

type agreementStatsStub struct {
	records []stores.AgreementRecord
	err     error
}

type statusFailingGoogleService struct {
	err error
}

func (s agreementStatsStub) ListAgreements(context.Context, stores.Scope, stores.AgreementQuery) ([]stores.AgreementRecord, error) {
	if s.err != nil {
		return nil, s.err
	}
	return append([]stores.AgreementRecord{}, s.records...), nil
}

func (s statusFailingGoogleService) Connect(context.Context, stores.Scope, services.GoogleConnectInput) (services.GoogleOAuthStatus, error) {
	return services.GoogleOAuthStatus{}, nil
}

func (s statusFailingGoogleService) Disconnect(context.Context, stores.Scope, string) error {
	return nil
}

func (s statusFailingGoogleService) RotateCredentialEncryption(context.Context, stores.Scope, string) (services.GoogleOAuthStatus, error) {
	return services.GoogleOAuthStatus{}, nil
}

func (s statusFailingGoogleService) Status(context.Context, stores.Scope, string) (services.GoogleOAuthStatus, error) {
	if s.err != nil {
		return services.GoogleOAuthStatus{}, s.err
	}
	return services.GoogleOAuthStatus{}, nil
}

func (s statusFailingGoogleService) SearchFiles(context.Context, stores.Scope, services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error) {
	return services.GoogleDriveListResult{}, nil
}

func (s statusFailingGoogleService) BrowseFiles(context.Context, stores.Scope, services.GoogleDriveQueryInput) (services.GoogleDriveListResult, error) {
	return services.GoogleDriveListResult{}, nil
}

func (s statusFailingGoogleService) ImportDocument(context.Context, stores.Scope, services.GoogleImportInput) (services.GoogleImportResult, error) {
	return services.GoogleImportResult{}, nil
}

type sharedDriveEdgeProvider struct {
	now        time.Time
	files      map[string]services.GoogleDriveFile
	pdfByID    map[string][]byte
	denyExport map[string]bool
}

func newSharedDriveEdgeProvider() *sharedDriveEdgeProvider {
	now := time.Date(2026, 2, 10, 9, 0, 0, 0, time.UTC)
	return &sharedDriveEdgeProvider{
		now: now,
		files: map[string]services.GoogleDriveFile{
			"shared-file-1": {
				ID:           "shared-file-1",
				Name:         "Shared Drive NDA",
				MimeType:     "application/vnd.google-apps.document",
				WebViewURL:   "https://docs.google.com/document/d/shared-file-1/edit",
				OwnerEmail:   "shared-owner@example.com",
				ParentID:     "shared-drive-1",
				ModifiedTime: now.Add(-30 * time.Minute),
			},
			"shared-denied-1": {
				ID:           "shared-denied-1",
				Name:         "Shared Drive Restricted",
				MimeType:     "application/vnd.google-apps.document",
				WebViewURL:   "https://docs.google.com/document/d/shared-denied-1/edit",
				OwnerEmail:   "shared-owner@example.com",
				ParentID:     "shared-drive-1",
				ModifiedTime: now.Add(-20 * time.Minute),
			},
		},
		pdfByID: map[string][]byte{
			"shared-file-1":   services.GenerateDeterministicPDF(1),
			"shared-denied-1": services.GenerateDeterministicPDF(1),
		},
		denyExport: map[string]bool{},
	}
}

func (p *sharedDriveEdgeProvider) ExchangeCode(_ context.Context, authCode, _ string, requestedScopes []string) (services.GoogleOAuthToken, error) {
	if strings.TrimSpace(authCode) == "" {
		return services.GoogleOAuthToken{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "missing auth code", nil)
	}
	return services.GoogleOAuthToken{
		AccessToken:  "access-" + strings.TrimSpace(authCode),
		RefreshToken: "refresh-" + strings.TrimSpace(authCode),
		Scopes:       append([]string{}, requestedScopes...),
		ExpiresAt:    p.now.Add(1 * time.Hour),
		AccountEmail: "ops-user@example.com",
	}, nil
}

func (p *sharedDriveEdgeProvider) RevokeToken(context.Context, string) error {
	return nil
}

func (p *sharedDriveEdgeProvider) SearchFiles(_ context.Context, _ string, query, _ string, pageSize int) (services.GoogleDriveListResult, error) {
	query = strings.ToLower(strings.TrimSpace(query))
	out := make([]services.GoogleDriveFile, 0)
	for _, file := range p.files {
		if query == "" || strings.Contains(strings.ToLower(file.Name), query) {
			out = append(out, file)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	if pageSize > 0 && pageSize < len(out) {
		out = out[:pageSize]
	}
	return services.GoogleDriveListResult{Files: out}, nil
}

func (p *sharedDriveEdgeProvider) BrowseFiles(_ context.Context, _ string, folderID, _ string, pageSize int) (services.GoogleDriveListResult, error) {
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		folderID = "root"
	}
	out := make([]services.GoogleDriveFile, 0)
	for _, file := range p.files {
		if strings.TrimSpace(file.ParentID) == folderID {
			out = append(out, file)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	if pageSize > 0 && pageSize < len(out) {
		out = out[:pageSize]
	}
	return services.GoogleDriveListResult{Files: out}, nil
}

func (p *sharedDriveEdgeProvider) GetFile(_ context.Context, _ string, fileID string) (services.GoogleDriveFile, error) {
	fileID = strings.TrimSpace(fileID)
	file, ok := p.files[fileID]
	if !ok {
		return services.GoogleDriveFile{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "google file not found", map[string]any{"file_id": fileID})
	}
	return file, nil
}

func (p *sharedDriveEdgeProvider) ExportFilePDF(_ context.Context, _ string, fileID string) (services.GoogleExportSnapshot, error) {
	fileID = strings.TrimSpace(fileID)
	file, ok := p.files[fileID]
	if !ok {
		return services.GoogleExportSnapshot{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "google file not found", map[string]any{"file_id": fileID})
	}
	if p.denyExport[fileID] {
		return services.GoogleExportSnapshot{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "permission denied for shared drive export", map[string]any{"file_id": fileID})
	}
	pdf := append([]byte{}, p.pdfByID[fileID]...)
	return services.GoogleExportSnapshot{File: file, PDF: pdf}, nil
}

func (p *sharedDriveEdgeProvider) DownloadFilePDF(_ context.Context, _ string, fileID string) (services.GoogleExportSnapshot, error) {
	fileID = strings.TrimSpace(fileID)
	file, ok := p.files[fileID]
	if !ok {
		return services.GoogleExportSnapshot{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "google file not found", map[string]any{"file_id": fileID})
	}
	if !strings.EqualFold(strings.TrimSpace(file.MimeType), services.GoogleDriveMimeTypePDF) {
		return services.GoogleExportSnapshot{}, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "google file is not a PDF", map[string]any{"file_id": fileID})
	}
	pdf := append([]byte{}, p.pdfByID[fileID]...)
	return services.GoogleExportSnapshot{File: file, PDF: pdf}, nil
}

func strPtr(value string) *string {
	return &value
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	if out, ok := value.(string); ok {
		return out
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func extractJSONFieldString(raw []byte, path []string) string {
	payload := map[string]any{}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}
	var current any = payload
	for _, key := range path {
		asMap, ok := current.(map[string]any)
		if !ok {
			return ""
		}
		current = asMap[key]
	}
	if out, ok := current.(string); ok {
		return strings.TrimSpace(out)
	}
	return ""
}

func (a mapAuthorizer) Can(_ context.Context, action string, _ string) bool {
	if len(a.allowed) == 0 {
		return false
	}
	return a.allowed[action]
}

func withClaimsPermissions(perms ...string) router.MiddlewareFunc {
	normalized := make([]string, 0, len(perms))
	for _, perm := range perms {
		perm = strings.TrimSpace(perm)
		if perm == "" {
			continue
		}
		normalized = append(normalized, perm)
	}
	return func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			claims := &auth.JWTClaims{
				UID:      "test-admin",
				UserRole: string(auth.RoleAdmin),
				Metadata: map[string]any{
					"permissions": append([]string{}, normalized...),
				},
			}
			c.SetContext(auth.WithClaimsContext(c.Context(), claims))
			return next(c)
		}
	}
}

func setupRegisterTestApp(t *testing.T, opts ...RegisterOption) *fiber.App {
	t.Helper()

	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})

	routes := BuildRouteSet(nil, "/admin", "admin.api.v1")
	Register(adapter.Router(), routes, opts...)
	adapter.Init()
	return adapter.WrappedRouter()
}

func setupSignerFlowApp(t *testing.T) (*fiber.App, stores.Scope, string, string, string) {
	t.Helper()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := services.NewDocumentService(store, services.WithDocumentClock(func() time.Time {
		return time.Date(2026, 2, 2, 9, 0, 0, 0, time.UTC)
	}))
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Agreement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Signer Flow",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signerRole := stores.RecipientRoleSigner
	order := 1
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtr("signer@example.com"),
		Name:         strPtr("Signer"),
		Role:         &signerRole,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}

	fieldType := stores.FieldTypeText
	page := 1
	required := true
	field, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	signatureType := stores.FieldTypeSignature
	signatureField, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &signatureType,
		PageNumber:  &page,
		Required:    &required,
	})
	if err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "phase4-handler-consent"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	tokenSvc := stores.NewTokenService(store)
	issued, err := tokenSvc.Issue(ctx, scope, agreement.ID, signer.ID)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	signingSvc := services.NewSigningService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(tokenSvc),
		WithSignerSessionService(signingSvc),
		WithDefaultScope(scope),
	)
	return app, scope, issued.Token, field.ID, signatureField.ID
}

func TestRegisterAdminRoutesRequirePermission(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/esign/status", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestRegisterAdminRoutesAllowPermission(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestRegisterAgreementStatsRouteAllowPermission(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}),
		WithAgreementStatsService(agreementStatsStub{
			records: []stores.AgreementRecord{
				{Status: stores.AgreementStatusDraft},
				{Status: stores.AgreementStatusSent},
				{Status: stores.AgreementStatusInProgress},
				{Status: stores.AgreementStatusCompleted},
				{Status: stores.AgreementStatusDeclined},
			},
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/stats", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	payload := string(body)
	if !strings.Contains(payload, `"draft":1`) {
		t.Fatalf("expected draft count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"pending":2`) {
		t.Fatalf("expected pending count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"completed":1`) {
		t.Fatalf("expected completed count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"action_required":3`) {
		t.Fatalf("expected action_required count in payload, got %s", payload)
	}
}

func TestRegisterSignerRoutesRemainPublic(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/test-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected signer route to stay reachable, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "test-token") {
		t.Fatalf("expected token echo, got %s", string(body))
	}
}

func TestRegisterSignerSessionReturns410ForExpiredToken(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	baseNow := time.Date(2026, 1, 1, 8, 0, 0, 0, time.UTC)
	issuer := stores.NewTokenService(tokenStore,
		stores.WithTokenTTL(5*time.Minute),
		stores.WithTokenClock(func() time.Time { return baseNow }),
	)
	issued, err := issuer.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	expiredValidator := stores.NewTokenService(tokenStore, stores.WithTokenClock(func() time.Time { return baseNow.Add(2 * time.Hour) }))
	if _, err := expiredValidator.Validate(ctx, scope, issued.Token); err == nil {
		t.Fatal("expected token service validation to fail for expired token")
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(expiredValidator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "TOKEN_EXPIRED") {
		t.Fatalf("expected TOKEN_EXPIRED response, got %s", string(body))
	}
}

func TestWithSignerTokenValidatorOptionSetsConfig(t *testing.T) {
	validator := stores.NewTokenService(stores.NewInMemoryStore())
	cfg := buildRegisterConfig([]RegisterOption{WithSignerTokenValidator(validator)})
	if cfg.tokenValidator == nil {
		t.Fatal("expected token validator to be configured")
	}
}

func TestSignerTokenValidatorIsUsedByRoute(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(rejectingValidator{}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
}

func TestRegisterSignerSessionReturns410ForRevokedToken(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	validator := stores.NewTokenService(tokenStore)
	issued, err := validator.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	if err := validator.Revoke(ctx, scope, "agreement-1", "recipient-1"); err != nil {
		t.Fatalf("Revoke: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(validator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "TOKEN_REVOKED") {
		t.Fatalf("expected TOKEN_REVOKED response, got %s", string(body))
	}
}

func TestRegisterAdminRouteDeniesCrossTenantScope(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status?tenant_id=tenant-2&org_id=org-1", nil)
	req.Header.Set("X-Actor-Tenant-ID", "tenant-1")
	req.Header.Set("X-Actor-Org-ID", "org-1")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "SCOPE_DENIED") {
		t.Fatalf("expected SCOPE_DENIED response, got %s", string(body))
	}
}

func TestRegisterSignerRouteDeniesCrossTenantScope(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	validator := stores.NewTokenService(tokenStore)
	issued, err := validator.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(validator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token+"?tenant_id=tenant-2&org_id=org-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), "SCOPE_DENIED") {
		t.Fatalf("expected SCOPE_DENIED response, got %s", string(body))
	}
}

func TestRegisterSignerSessionReturnsScopedContextWithWaitingState(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := services.NewDocumentService(store, services.WithDocumentClock(func() time.Time {
		return time.Date(2026, 2, 1, 10, 0, 0, 0, time.UTC)
	}))
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Agreement Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		PDF:       services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "NDA",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	signerOneRole := stores.RecipientRoleSigner
	signerOneOrder := 1
	signerOne, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtr("signer-one@example.com"),
		Name:         strPtr("Signer One"),
		Role:         &signerOneRole,
		SigningOrder: &signerOneOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwoRole := stores.RecipientRoleSigner
	signerTwoOrder := 2
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        strPtr("signer-two@example.com"),
		Name:         strPtr("Signer Two"),
		Role:         &signerTwoRole,
		SigningOrder: &signerTwoOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}

	required := true
	pageOne := 1
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        strPtr(stores.FieldTypeSignature),
		PageNumber:  &pageOne,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer one: %v", err)
	}
	pageTwo := 1
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        strPtr(stores.FieldTypeSignature),
		PageNumber:  &pageTwo,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer two: %v", err)
	}

	if _, err := agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "phase4-session"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	tokenService := stores.NewTokenService(store)
	if _, err := tokenService.Issue(ctx, scope, agreement.ID, signerOne.ID); err != nil {
		t.Fatalf("Issue signer one token: %v", err)
	}
	issuedTwo, err := tokenService.Issue(ctx, scope, agreement.ID, signerTwo.ID)
	if err != nil {
		t.Fatalf("Issue signer two token: %v", err)
	}

	signingSvc := services.NewSigningService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(tokenService),
		WithSignerSessionService(signingSvc),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issuedTwo.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	if !strings.Contains(bodyText, "\"state\":\"waiting\"") {
		t.Fatalf("expected waiting session state, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"active_recipient_id\":\""+signerOne.ID+"\"") {
		t.Fatalf("expected active recipient id %q, got %s", signerOne.ID, bodyText)
	}
	if !strings.Contains(bodyText, "\"recipient_id\":\""+signerTwo.ID+"\"") {
		t.Fatalf("expected signer two recipient id %q, got %s", signerTwo.ID, bodyText)
	}
}

func TestRegisterSignerSessionIncludesUnifiedGeometryAndBootstrapMetadata(t *testing.T) {
	app, _, token, fieldID, _ := setupSignerFlowApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(payload)
	if !strings.Contains(bodyText, "\"document_name\":\"Agreement Source\"") {
		t.Fatalf("expected document_name in session payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"page_count\":1") {
		t.Fatalf("expected page_count in session payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"viewer\":{\"coordinate_space\":\"pdf_points\"") {
		t.Fatalf("expected viewer context in session payload, got %s", bodyText)
	}
	for _, key := range []string{"\"contract_version\":\"pdf_page_space_v1\"", "\"unit\":\"pt\"", "\"origin\":\"top_left\"", "\"y_axis_direction\":\"down\""} {
		if !strings.Contains(bodyText, key) {
			t.Fatalf("expected key %s in viewer payload, got %s", key, bodyText)
		}
	}
	if !strings.Contains(bodyText, "\"id\":\""+fieldID+"\"") {
		t.Fatalf("expected field id %q in session payload, got %s", fieldID, bodyText)
	}
	for _, key := range []string{"\"recipient_id\":", "\"pos_x\":", "\"pos_y\":", "\"width\":", "\"height\":", "\"page_width\":", "\"page_height\":", "\"page_rotation\":", "\"tab_index\":"} {
		if !strings.Contains(bodyText, key) {
			t.Fatalf("expected key %s in session payload, got %s", key, bodyText)
		}
	}
}

func TestRegisterSignerConsentCapturesAcceptance(t *testing.T) {
	app, _, token, _, _ := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"accepted":true}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/consent/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(payload), "\"accepted_at\"") {
		t.Fatalf("expected consent timestamp in response, got %s", string(payload))
	}
}

func TestRegisterSignerFieldValuesUpsertRequiredValidation(t *testing.T) {
	app, _, token, fieldID, _ := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"field_instance_id":"` + fieldID + `","value_text":" "}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", resp.StatusCode)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(payload), "MISSING_REQUIRED_FIELDS") {
		t.Fatalf("expected MISSING_REQUIRED_FIELDS response, got %s", string(payload))
	}
}

func TestRegisterSignerFieldValuesUpsertSuccess(t *testing.T) {
	app, _, token, fieldID, _ := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"field_instance_id":"` + fieldID + `","value_text":"Signed by Alice"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(payload)
	if !strings.Contains(bodyText, "\"field_value\"") {
		t.Fatalf("expected field_value payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, fieldID) {
		t.Fatalf("expected field id %q in payload, got %s", fieldID, bodyText)
	}
}

func TestRegisterSignerSignatureAttachSuccess(t *testing.T) {
	app, _, token, _, signatureFieldID := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","type":"typed","object_key":"tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-1.png","sha256":"` + strings.Repeat("a", 64) + `","value_text":"Signer Name"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(payload)
	if !strings.Contains(bodyText, "\"signature\"") {
		t.Fatalf("expected signature payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, signatureFieldID) {
		t.Fatalf("expected signature field id %q in payload, got %s", signatureFieldID, bodyText)
	}
}

func TestRegisterSignerSignatureUploadBootstrapSuccess(t *testing.T) {
	app, _, token, _, signatureFieldID := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","sha256":"` + strings.Repeat("a", 64) + `","content_type":"image/png","size_bytes":2048}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/signature-upload/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(payload))
	}
	if cacheControl := strings.ToLower(strings.TrimSpace(resp.Header.Get("Cache-Control"))); !strings.Contains(cacheControl, "no-store") {
		t.Fatalf("expected no-store cache-control policy, got %q", resp.Header.Get("Cache-Control"))
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(payload)
	if !strings.Contains(bodyText, "\"contract\"") {
		t.Fatalf("expected contract payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"upload_token\"") {
		t.Fatalf("expected upload token in contract payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"object_key\"") {
		t.Fatalf("expected object_key in contract payload, got %s", bodyText)
	}
}

func TestRegisterSignerTelemetryAcceptsBeaconPayload(t *testing.T) {
	app, _, token, _, _ := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"events":[{"event":"viewer_load_success"},{"event":"page_viewed"}],"summary":{"sessionId":"session-1"}}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/telemetry/"+token, body)
	req.Header.Set("Content-Type", "text/plain;charset=UTF-8")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 202, got %d body=%s", resp.StatusCode, payload)
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(payload), "\"accepted_events\":2") {
		t.Fatalf("expected accepted event count in response, got %s", payload)
	}
}

func TestRegisterSignerSignatureAttachDrawnWithUploadBootstrap(t *testing.T) {
	app, _, token, _, signatureFieldID := setupSignerFlowApp(t)
	uploadBytes := bytes.Repeat([]byte("b"), 1024)
	uploadDigest := sha256.Sum256(uploadBytes)
	uploadSHA := hex.EncodeToString(uploadDigest[:])

	bootstrapReqBody := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","sha256":"` + uploadSHA + `","content_type":"image/png","size_bytes":1024}`)
	bootstrapReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/signature-upload/"+token, bootstrapReqBody)
	bootstrapReq.Header.Set("Content-Type", "application/json")
	bootstrapResp, err := app.Test(bootstrapReq, -1)
	if err != nil {
		t.Fatalf("bootstrap request failed: %v", err)
	}
	defer bootstrapResp.Body.Close()
	if bootstrapResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(bootstrapResp.Body)
		t.Fatalf("expected bootstrap status 200, got %d body=%s", bootstrapResp.StatusCode, body)
	}
	bootstrapPayloadRaw, err := io.ReadAll(bootstrapResp.Body)
	if err != nil {
		t.Fatalf("read bootstrap response body: %v", err)
	}
	var bootstrapPayload map[string]any
	if err := json.Unmarshal(bootstrapPayloadRaw, &bootstrapPayload); err != nil {
		t.Fatalf("decode bootstrap payload: %v", err)
	}
	contract, _ := bootstrapPayload["contract"].(map[string]any)
	uploadToken := strings.TrimSpace(toString(contract["upload_token"]))
	objectKey := strings.TrimSpace(toString(contract["object_key"]))
	if uploadToken == "" || objectKey == "" {
		t.Fatalf("expected upload token/object key in bootstrap contract, got %+v", bootstrapPayload)
	}
	uploadReq := httptest.NewRequest(http.MethodPut, "/api/v1/esign/signing/signature-upload/object?upload_token="+url.QueryEscape(uploadToken)+"&object_key="+url.QueryEscape(objectKey), bytes.NewBuffer(uploadBytes))
	uploadReq.Header.Set("Content-Type", "image/png")
	uploadReq.Header.Set("X-ESign-Upload-Token", uploadToken)
	uploadReq.Header.Set("X-ESign-Upload-Key", objectKey)
	uploadResp, err := app.Test(uploadReq, -1)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", uploadResp.StatusCode, body)
	}

	body := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","type":"drawn","object_key":"` + objectKey + `","sha256":"` + uploadSHA + `","upload_token":"` + uploadToken + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(payload))
	}
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(payload), "\"signature\"") {
		t.Fatalf("expected signature payload, got %s", payload)
	}
}

func TestRegisterSignerSignatureAttachDrawnRetryRemainsIdempotent(t *testing.T) {
	app, _, token, _, signatureFieldID := setupSignerFlowApp(t)
	uploadBytes := bytes.Repeat([]byte("c"), 1024)
	uploadDigest := sha256.Sum256(uploadBytes)
	uploadSHA := hex.EncodeToString(uploadDigest[:])

	bootstrapReqBody := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","sha256":"` + uploadSHA + `","content_type":"image/png","size_bytes":1024}`)
	bootstrapReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/signature-upload/"+token, bootstrapReqBody)
	bootstrapReq.Header.Set("Content-Type", "application/json")
	bootstrapResp, err := app.Test(bootstrapReq, -1)
	if err != nil {
		t.Fatalf("bootstrap request failed: %v", err)
	}
	defer bootstrapResp.Body.Close()
	if bootstrapResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(bootstrapResp.Body)
		t.Fatalf("expected bootstrap status 200, got %d body=%s", bootstrapResp.StatusCode, body)
	}
	bootstrapPayloadRaw, err := io.ReadAll(bootstrapResp.Body)
	if err != nil {
		t.Fatalf("read bootstrap response body: %v", err)
	}
	var bootstrapPayload map[string]any
	if err := json.Unmarshal(bootstrapPayloadRaw, &bootstrapPayload); err != nil {
		t.Fatalf("decode bootstrap payload: %v", err)
	}
	contract, _ := bootstrapPayload["contract"].(map[string]any)
	uploadToken := strings.TrimSpace(toString(contract["upload_token"]))
	objectKey := strings.TrimSpace(toString(contract["object_key"]))
	if uploadToken == "" || objectKey == "" {
		t.Fatalf("expected upload token/object key in bootstrap contract, got %+v", bootstrapPayload)
	}
	uploadReq := httptest.NewRequest(http.MethodPut, "/api/v1/esign/signing/signature-upload/object?upload_token="+url.QueryEscape(uploadToken)+"&object_key="+url.QueryEscape(objectKey), bytes.NewBuffer(uploadBytes))
	uploadReq.Header.Set("Content-Type", "image/png")
	uploadReq.Header.Set("X-ESign-Upload-Token", uploadToken)
	uploadReq.Header.Set("X-ESign-Upload-Key", objectKey)
	uploadResp, err := app.Test(uploadReq, -1)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", uploadResp.StatusCode, body)
	}

	attachBody := `{"field_instance_id":"` + signatureFieldID + `","type":"drawn","object_key":"` + objectKey + `","sha256":"` + uploadSHA + `","upload_token":"` + uploadToken + `"}`
	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, bytes.NewBufferString(attachBody))
	firstReq.Header.Set("Content-Type", "application/json")
	firstResp, err := app.Test(firstReq, -1)
	if err != nil {
		t.Fatalf("first attach request failed: %v", err)
	}
	defer firstResp.Body.Close()
	if firstResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(firstResp.Body)
		t.Fatalf("expected first attach status 200, got %d body=%s", firstResp.StatusCode, body)
	}
	firstPayload, err := io.ReadAll(firstResp.Body)
	if err != nil {
		t.Fatalf("read first attach response body: %v", err)
	}
	firstArtifactID := extractJSONFieldString(firstPayload, []string{"signature", "artifact", "ID"})
	if firstArtifactID == "" {
		t.Fatalf("expected first attach artifact id, got %s", firstPayload)
	}

	retryReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, bytes.NewBufferString(attachBody))
	retryReq.Header.Set("Content-Type", "application/json")
	retryResp, err := app.Test(retryReq, -1)
	if err != nil {
		t.Fatalf("retry attach request failed: %v", err)
	}
	defer retryResp.Body.Close()
	if retryResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(retryResp.Body)
		t.Fatalf("expected retry attach status 200, got %d body=%s", retryResp.StatusCode, body)
	}
	retryPayload, err := io.ReadAll(retryResp.Body)
	if err != nil {
		t.Fatalf("read retry attach response body: %v", err)
	}
	retryArtifactID := extractJSONFieldString(retryPayload, []string{"signature", "artifact", "ID"})
	if retryArtifactID == "" {
		t.Fatalf("expected retry attach artifact id, got %s", retryPayload)
	}
	if retryArtifactID != firstArtifactID {
		t.Fatalf("expected retry artifact id %q, got %q", firstArtifactID, retryArtifactID)
	}
}

func TestRegisterSignerSubmitFlowWithIdempotency(t *testing.T) {
	app, _, token, textFieldID, signatureFieldID := setupSignerFlowApp(t)

	consentReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/consent/"+token, bytes.NewBufferString(`{"accepted":true}`))
	consentReq.Header.Set("Content-Type", "application/json")
	consentResp, err := app.Test(consentReq, -1)
	if err != nil {
		t.Fatalf("consent request failed: %v", err)
	}
	_ = consentResp.Body.Close()
	if consentResp.StatusCode != http.StatusOK {
		t.Fatalf("expected consent status 200, got %d", consentResp.StatusCode)
	}

	signatureReqBody := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","type":"typed","object_key":"tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-submit.png","sha256":"` + strings.Repeat("d", 64) + `","value_text":"Signer Name"}`)
	signatureReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, signatureReqBody)
	signatureReq.Header.Set("Content-Type", "application/json")
	signatureResp, err := app.Test(signatureReq, -1)
	if err != nil {
		t.Fatalf("signature request failed: %v", err)
	}
	_ = signatureResp.Body.Close()
	if signatureResp.StatusCode != http.StatusOK {
		t.Fatalf("expected signature status 200, got %d", signatureResp.StatusCode)
	}

	fieldReqBody := bytes.NewBufferString(`{"field_instance_id":"` + textFieldID + `","value_text":"Signer Name"}`)
	fieldReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/"+token, fieldReqBody)
	fieldReq.Header.Set("Content-Type", "application/json")
	fieldResp, err := app.Test(fieldReq, -1)
	if err != nil {
		t.Fatalf("field-values request failed: %v", err)
	}
	_ = fieldResp.Body.Close()
	if fieldResp.StatusCode != http.StatusOK {
		t.Fatalf("expected field-values status 200, got %d", fieldResp.StatusCode)
	}

	submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/"+token, nil)
	submitReq.Header.Set("Idempotency-Key", "submit-handler-key-1")
	submitResp, err := app.Test(submitReq, -1)
	if err != nil {
		t.Fatalf("submit request failed: %v", err)
	}
	defer submitResp.Body.Close()
	if submitResp.StatusCode != http.StatusOK {
		t.Fatalf("expected submit status 200, got %d", submitResp.StatusCode)
	}
	submitPayload, err := io.ReadAll(submitResp.Body)
	if err != nil {
		t.Fatalf("read submit response body: %v", err)
	}
	if !strings.Contains(string(submitPayload), `"completed":true`) {
		t.Fatalf("expected completed submit payload, got %s", string(submitPayload))
	}

	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/"+token, nil)
	replayReq.Header.Set("Idempotency-Key", "submit-handler-key-1")
	replayResp, err := app.Test(replayReq, -1)
	if err != nil {
		t.Fatalf("submit replay request failed: %v", err)
	}
	defer replayResp.Body.Close()
	if replayResp.StatusCode != http.StatusOK {
		t.Fatalf("expected submit replay status 200, got %d", replayResp.StatusCode)
	}
	replayPayload, err := io.ReadAll(replayResp.Body)
	if err != nil {
		t.Fatalf("read submit replay response body: %v", err)
	}
	if !strings.Contains(string(replayPayload), `"replay":true`) {
		t.Fatalf("expected replay submit payload marker, got %s", string(replayPayload))
	}
}

func TestRegisterSignerUnifiedFlowObservabilitySignals(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	app, _, token, textFieldID, signatureFieldID := setupSignerFlowApp(t)

	consentReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/consent/"+token, bytes.NewBufferString(`{"accepted":true}`))
	consentReq.Header.Set("Content-Type", "application/json")
	consentReq.Header.Set("X-ESign-Flow-Mode", "unified")
	consentResp, err := app.Test(consentReq, -1)
	if err != nil {
		t.Fatalf("consent request failed: %v", err)
	}
	_ = consentResp.Body.Close()
	if consentResp.StatusCode != http.StatusOK {
		t.Fatalf("expected consent status 200, got %d", consentResp.StatusCode)
	}

	signatureReqBody := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","type":"typed","object_key":"tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-observe.png","sha256":"` + strings.Repeat("f", 64) + `","value_text":"Signer Name"}`)
	signatureReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, signatureReqBody)
	signatureReq.Header.Set("Content-Type", "application/json")
	signatureReq.Header.Set("X-ESign-Flow-Mode", "unified")
	signatureResp, err := app.Test(signatureReq, -1)
	if err != nil {
		t.Fatalf("signature request failed: %v", err)
	}
	_ = signatureResp.Body.Close()
	if signatureResp.StatusCode != http.StatusOK {
		t.Fatalf("expected signature status 200, got %d", signatureResp.StatusCode)
	}

	fieldReqBody := bytes.NewBufferString(`{"field_instance_id":"` + textFieldID + `","value_text":"Signer Name"}`)
	fieldReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/"+token, fieldReqBody)
	fieldReq.Header.Set("Content-Type", "application/json")
	fieldReq.Header.Set("X-ESign-Flow-Mode", "unified")
	fieldResp, err := app.Test(fieldReq, -1)
	if err != nil {
		t.Fatalf("field-values request failed: %v", err)
	}
	_ = fieldResp.Body.Close()
	if fieldResp.StatusCode != http.StatusOK {
		t.Fatalf("expected field-values status 200, got %d", fieldResp.StatusCode)
	}

	submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/"+token, nil)
	submitReq.Header.Set("Idempotency-Key", "submit-unified-observe-1")
	submitReq.Header.Set("X-ESign-Flow-Mode", "unified")
	submitResp, err := app.Test(submitReq, -1)
	if err != nil {
		t.Fatalf("submit request failed: %v", err)
	}
	_ = submitResp.Body.Close()
	if submitResp.StatusCode != http.StatusOK {
		t.Fatalf("expected submit status 200, got %d", submitResp.StatusCode)
	}

	snapshot := observability.Snapshot()
	if snapshot.UnifiedFieldSaveSuccessTotal == 0 {
		t.Fatalf("expected unified field-save telemetry, got %+v", snapshot)
	}
	if snapshot.UnifiedSignatureSuccessTotal == 0 {
		t.Fatalf("expected unified signature telemetry, got %+v", snapshot)
	}
	if snapshot.UnifiedSubmitSuccessTotal == 0 {
		t.Fatalf("expected unified submit telemetry, got %+v", snapshot)
	}
}

func TestRegisterSignerSubmitIdempotencyUnderBurstTraffic(t *testing.T) {
	app, _, token, textFieldID, signatureFieldID := setupSignerFlowApp(t)

	consentReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/consent/"+token, bytes.NewBufferString(`{"accepted":true}`))
	consentReq.Header.Set("Content-Type", "application/json")
	consentResp, err := app.Test(consentReq, -1)
	if err != nil {
		t.Fatalf("consent request failed: %v", err)
	}
	_ = consentResp.Body.Close()
	if consentResp.StatusCode != http.StatusOK {
		t.Fatalf("expected consent status 200, got %d", consentResp.StatusCode)
	}

	signatureReqBody := bytes.NewBufferString(`{"field_instance_id":"` + signatureFieldID + `","type":"typed","object_key":"tenant/tenant-1/org/org-1/agreements/agreement-1/sig/sig-burst.png","sha256":"` + strings.Repeat("e", 64) + `","value_text":"Signer Name"}`)
	signatureReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, signatureReqBody)
	signatureReq.Header.Set("Content-Type", "application/json")
	signatureResp, err := app.Test(signatureReq, -1)
	if err != nil {
		t.Fatalf("signature request failed: %v", err)
	}
	_ = signatureResp.Body.Close()
	if signatureResp.StatusCode != http.StatusOK {
		t.Fatalf("expected signature status 200, got %d", signatureResp.StatusCode)
	}

	fieldReqBody := bytes.NewBufferString(`{"field_instance_id":"` + textFieldID + `","value_text":"Signer Name"}`)
	fieldReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/"+token, fieldReqBody)
	fieldReq.Header.Set("Content-Type", "application/json")
	fieldResp, err := app.Test(fieldReq, -1)
	if err != nil {
		t.Fatalf("field-values request failed: %v", err)
	}
	_ = fieldResp.Body.Close()
	if fieldResp.StatusCode != http.StatusOK {
		t.Fatalf("expected field-values status 200, got %d", fieldResp.StatusCode)
	}

	for i := 0; i < 20; i++ {
		submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/submit/"+token, nil)
		submitReq.Header.Set("Idempotency-Key", "submit-burst-idempotency-1")
		submitResp, err := app.Test(submitReq, -1)
		if err != nil {
			t.Fatalf("submit request %d failed: %v", i, err)
		}
		body, _ := io.ReadAll(submitResp.Body)
		_ = submitResp.Body.Close()
		if submitResp.StatusCode != http.StatusOK {
			t.Fatalf("expected submit status 200 in burst iteration %d, got %d body=%s", i, submitResp.StatusCode, body)
		}
		if !strings.Contains(string(body), `"completed":true`) {
			t.Fatalf("expected completed submit payload in burst iteration %d, got %s", i, body)
		}
	}
}

func TestRegisterSignerDeclineFlow(t *testing.T) {
	app, _, token, _, _ := setupSignerFlowApp(t)

	declineReq := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/decline/"+token, bytes.NewBufferString(`{"reason":"I decline to sign"}`))
	declineReq.Header.Set("Content-Type", "application/json")
	declineResp, err := app.Test(declineReq, -1)
	if err != nil {
		t.Fatalf("decline request failed: %v", err)
	}
	defer declineResp.Body.Close()
	if declineResp.StatusCode != http.StatusOK {
		t.Fatalf("expected decline status 200, got %d", declineResp.StatusCode)
	}
	payload, err := io.ReadAll(declineResp.Body)
	if err != nil {
		t.Fatalf("read decline response body: %v", err)
	}
	bodyText := string(payload)
	if !strings.Contains(bodyText, "\"status\":\"ok\"") {
		t.Fatalf("expected ok decline status payload, got %s", bodyText)
	}
	if !strings.Contains(bodyText, "\"DeclineReason\":\"I decline to sign\"") {
		t.Fatalf("expected decline reason in payload, got %s", bodyText)
	}
}

func TestRegisterGoogleRoutesFeatureGatedWhenDisabled(t *testing.T) {
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminSettings: true}}),
		WithGoogleIntegrationEnabled(false),
		WithGoogleIntegrationService(google),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/integrations/google/status?user_id=ops-user", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected status 404 when esign_google disabled, got %d", resp.StatusCode)
	}
}

func TestRegisterAdminRouteMiddlewareInjectsClaimsForGoAuthAuthorizer(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	newGoogle := func() GoogleIntegrationService {
		store := stores.NewInMemoryStore()
		return services.NewGoogleIntegrationService(
			store,
			services.NewDeterministicGoogleProvider(),
			services.NewDocumentService(store),
			services.NewAgreementService(store),
		)
	}

	authz := coreadmin.NewGoAuthAuthorizer(coreadmin.GoAuthAuthorizerConfig{DefaultResource: "admin"})
	noClaimsApp := setupRegisterTestApp(t,
		WithAuthorizer(authz),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(newGoogle()),
		WithDefaultScope(scope),
	)
	noClaimsReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-missing-claims"}`))
	noClaimsReq.Header.Set("Content-Type", "application/json")
	noClaimsResp, err := noClaimsApp.Test(noClaimsReq, -1)
	if err != nil {
		t.Fatalf("connect request without claims failed: %v", err)
	}
	defer noClaimsResp.Body.Close()
	if noClaimsResp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(noClaimsResp.Body)
		t.Fatalf("expected connect 403 without auth middleware claims, got %d body=%s", noClaimsResp.StatusCode, string(body))
	}

	withClaimsApp := setupRegisterTestApp(t,
		WithAuthorizer(authz),
		WithAdminRouteMiddleware(withClaimsPermissions(DefaultPermissions.AdminSettings, DefaultPermissions.AdminCreate, DefaultPermissions.AdminView)),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(newGoogle()),
		WithDefaultScope(scope),
	)
	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-with-claims"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := withClaimsApp.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("connect request with claims failed: %v", err)
	}
	defer connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(connectResp.Body)
		t.Fatalf("expected connect 200 with admin route middleware claims, got %d body=%s", connectResp.StatusCode, string(body))
	}
}

func TestRegisterAdminRouteMiddlewareDoesNotProtectSignerRoutes(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAdminRouteMiddleware(func(next router.HandlerFunc) router.HandlerFunc {
			return func(c router.Context) error {
				return writeAPIError(c, nil, http.StatusUnauthorized, "MISSING_TOKEN", "auth required", nil)
			}
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/public-token", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("signer session request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected signer session to remain public (200), got %d body=%s", resp.StatusCode, string(body))
	}
}

func TestRegisterGoogleOAuthConnectAndStatusEndpoints(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminCreate:   true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
	)

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-1"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("connect request failed: %v", err)
	}
	defer connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(connectResp.Body)
		t.Fatalf("expected connect 200, got %d body=%s", connectResp.StatusCode, string(body))
	}
	connectBody, _ := io.ReadAll(connectResp.Body)
	if !strings.Contains(string(connectBody), `"status":"connected"`) {
		t.Fatalf("expected connected response, got %s", string(connectBody))
	}

	rotateReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/rotate-credentials?user_id=ops-user", nil)
	rotateResp, err := app.Test(rotateReq, -1)
	if err != nil {
		t.Fatalf("rotate request failed: %v", err)
	}
	defer rotateResp.Body.Close()
	if rotateResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(rotateResp.Body)
		t.Fatalf("expected rotate 200, got %d body=%s", rotateResp.StatusCode, string(body))
	}
	rotateBody, _ := io.ReadAll(rotateResp.Body)
	if !strings.Contains(string(rotateBody), `"status":"rotated"`) {
		t.Fatalf("expected rotated response status, got %s", string(rotateBody))
	}

	statusReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/integrations/google/status?user_id=ops-user", nil)
	statusResp, err := app.Test(statusReq, -1)
	if err != nil {
		t.Fatalf("status request failed: %v", err)
	}
	defer statusResp.Body.Close()
	if statusResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(statusResp.Body)
		t.Fatalf("expected status 200, got %d body=%s", statusResp.StatusCode, string(body))
	}
	statusBody, _ := io.ReadAll(statusResp.Body)
	if !strings.Contains(string(statusBody), `"least_privilege":true`) {
		t.Fatalf("expected least-privilege marker in status response, got %s", string(statusBody))
	}
	if !strings.Contains(string(statusBody), services.GoogleScopeDriveReadonly) {
		t.Fatalf("expected drive readonly scope in status response, got %s", string(statusBody))
	}
}

func TestRegisterGoogleOAuthStatusUnexpectedErrorReturnsInternalServerError(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminSettings: true}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(statusFailingGoogleService{err: fmt.Errorf("status lookup failed")}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/integrations/google/status?user_id=ops-user", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("status request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 500, got %d body=%s", resp.StatusCode, string(body))
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "GOOGLE_STATUS_UNAVAILABLE") {
		t.Fatalf("expected GOOGLE_STATUS_UNAVAILABLE code, got %s", string(body))
	}
}

func TestRegisterGoogleDriveSearchBrowseAndImportEndpoints(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminCreate:   true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
	)

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-2"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("connect request failed: %v", err)
	}
	_ = connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		t.Fatalf("expected connect status 200, got %d", connectResp.StatusCode)
	}

	searchReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/google-drive/search?user_id=ops-user&q=nda", nil)
	searchResp, err := app.Test(searchReq, -1)
	if err != nil {
		t.Fatalf("search request failed: %v", err)
	}
	defer searchResp.Body.Close()
	if searchResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(searchResp.Body)
		t.Fatalf("expected search 200, got %d body=%s", searchResp.StatusCode, string(body))
	}
	searchBody, _ := io.ReadAll(searchResp.Body)
	if !strings.Contains(string(searchBody), `"files"`) {
		t.Fatalf("expected files in search response, got %s", string(searchBody))
	}

	browseReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/google-drive/browse?user_id=ops-user&folder_id=root", nil)
	browseResp, err := app.Test(browseReq, -1)
	if err != nil {
		t.Fatalf("browse request failed: %v", err)
	}
	defer browseResp.Body.Close()
	if browseResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(browseResp.Body)
		t.Fatalf("expected browse 200, got %d body=%s", browseResp.StatusCode, string(body))
	}

	importReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/google-drive/import?user_id=ops-user", bytes.NewBufferString(`{"google_file_id":"google-file-1","document_title":"Imported NDA","agreement_title":"Imported NDA Agreement"}`))
	importReq.Header.Set("Content-Type", "application/json")
	importResp, err := app.Test(importReq, -1)
	if err != nil {
		t.Fatalf("import request failed: %v", err)
	}
	defer importResp.Body.Close()
	if importResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(importResp.Body)
		t.Fatalf("expected import 200, got %d body=%s", importResp.StatusCode, string(body))
	}
	importBody, _ := io.ReadAll(importResp.Body)
	if !strings.Contains(string(importBody), `"source_google_file_id":"google-file-1"`) {
		t.Fatalf("expected google source metadata keys in import response, got %s", string(importBody))
	}
	if !strings.Contains(string(importBody), `"source_type":"google_drive"`) {
		t.Fatalf("expected source_type in import response, got %s", string(importBody))
	}
}

func TestRegisterGoogleDriveSharedDriveBrowseAndImport(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		newSharedDriveEdgeProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminCreate:   true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
	)

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-shared-1"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("connect request failed: %v", err)
	}
	_ = connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		t.Fatalf("expected connect status 200, got %d", connectResp.StatusCode)
	}

	browseReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/google-drive/browse?user_id=ops-user&folder_id=shared-drive-1", nil)
	browseResp, err := app.Test(browseReq, -1)
	if err != nil {
		t.Fatalf("browse request failed: %v", err)
	}
	defer browseResp.Body.Close()
	if browseResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(browseResp.Body)
		t.Fatalf("expected browse 200, got %d body=%s", browseResp.StatusCode, string(body))
	}
	browseBody, _ := io.ReadAll(browseResp.Body)
	if !strings.Contains(string(browseBody), `"shared-file-1"`) {
		t.Fatalf("expected shared drive file in browse response, got %s", string(browseBody))
	}

	importReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/google-drive/import?user_id=ops-user", bytes.NewBufferString(`{"google_file_id":"shared-file-1","document_title":"Shared NDA","agreement_title":"Shared NDA Agreement"}`))
	importReq.Header.Set("Content-Type", "application/json")
	importResp, err := app.Test(importReq, -1)
	if err != nil {
		t.Fatalf("import request failed: %v", err)
	}
	defer importResp.Body.Close()
	if importResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(importResp.Body)
		t.Fatalf("expected import 200, got %d body=%s", importResp.StatusCode, string(body))
	}
	importBody, _ := io.ReadAll(importResp.Body)
	if !strings.Contains(string(importBody), `"source_google_file_id":"shared-file-1"`) {
		t.Fatalf("expected shared drive source metadata in import response, got %s", string(importBody))
	}
}

func TestRegisterGoogleDriveImportPermissionDeniedReturnsTypedError(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := newSharedDriveEdgeProvider()
	provider.denyExport["shared-denied-1"] = true
	google := services.NewGoogleIntegrationService(
		store,
		provider,
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminCreate:   true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
	)

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-shared-2"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("connect request failed: %v", err)
	}
	_ = connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		t.Fatalf("expected connect status 200, got %d", connectResp.StatusCode)
	}

	importReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/google-drive/import?user_id=ops-user", bytes.NewBufferString(`{"google_file_id":"shared-denied-1","document_title":"Denied Shared Doc","agreement_title":"Denied Shared Agreement"}`))
	importReq.Header.Set("Content-Type", "application/json")
	importResp, err := app.Test(importReq, -1)
	if err != nil {
		t.Fatalf("import request failed: %v", err)
	}
	defer importResp.Body.Close()
	if importResp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(importResp.Body)
		t.Fatalf("expected import 403 for permission denied, got %d body=%s", importResp.StatusCode, string(body))
	}
	importBody, _ := io.ReadAll(importResp.Body)
	if !strings.Contains(string(importBody), string(services.ErrorCodeGooglePermissionDenied)) {
		t.Fatalf("expected GOOGLE_PERMISSION_DENIED typed error response, got %s", string(importBody))
	}
}
