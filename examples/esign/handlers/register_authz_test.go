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
	"path"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	esignsync "github.com/goliatone/go-admin/examples/esign/sync"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
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

type remediationDispatchStatusStub struct {
	status RemediationDispatchStatus
	err    error
}

type remediationTriggerFunc func(context.Context, RemediationTriggerInput) (RemediationDispatchReceipt, error)
type remediationDispatchStatusFunc func(context.Context, string) (RemediationDispatchStatus, error)

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

func (s statusFailingGoogleService) ListAccounts(context.Context, stores.Scope, string) ([]services.GoogleAccountInfo, error) {
	if s.err != nil {
		return nil, s.err
	}
	return nil, nil
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

func (s remediationDispatchStatusStub) LookupRemediationDispatchStatus(context.Context, string) (RemediationDispatchStatus, error) {
	if s.err != nil {
		return RemediationDispatchStatus{}, s.err
	}
	return s.status, nil
}

func (fn remediationTriggerFunc) TriggerRemediation(ctx context.Context, input RemediationTriggerInput) (RemediationDispatchReceipt, error) {
	if fn == nil {
		return RemediationDispatchReceipt{}, nil
	}
	return fn(ctx, input)
}

func (fn remediationDispatchStatusFunc) LookupRemediationDispatchStatus(ctx context.Context, dispatchID string) (RemediationDispatchStatus, error) {
	if fn == nil {
		return RemediationDispatchStatus{}, nil
	}
	return fn(ctx, dispatchID)
}

type sharedDriveEdgeProvider struct {
	now        time.Time
	files      map[string]services.GoogleDriveFile
	pdfByID    map[string][]byte
	denyExport map[string]bool
}

type senderAgreementViewerRouteFixture struct {
	app         *fiber.App
	store       *stores.InMemoryStore
	scope       stores.Scope
	agreementID string
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

func (p *sharedDriveEdgeProvider) ListComments(_ context.Context, _ string, fileID string) ([]services.GoogleDriveComment, error) {
	fileID = strings.TrimSpace(fileID)
	if _, ok := p.files[fileID]; !ok {
		return nil, services.NewGoogleProviderError(services.GoogleProviderErrorPermissionDenied, "google file not found", map[string]any{"file_id": fileID})
	}
	return []services.GoogleDriveComment{}, nil
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
	return withClaimsUserPermissions(testAdminUserID, perms...)
}

func withClaimsUserPermissions(userID string, perms ...string) router.MiddlewareFunc {
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
				UID:      strings.TrimSpace(userID),
				UserRole: string(auth.RoleAdmin),
				Scopes:   append([]string{}, normalized...),
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
	if err := Register(adapter.Router(), routes, opts...); err != nil {
		t.Fatalf("Register: %v", err)
	}
	adapter.Init()
	return adapter.WrappedRouter()
}

func newTestSigningService(store stores.Store, opts ...services.SigningServiceOption) services.SigningService {
	allOpts := make([]services.SigningServiceOption, 0, len(opts)+1)
	allOpts = append(allOpts, opts...)
	allOpts = append(allOpts, services.WithSignatureUploadConfig(5*time.Minute, "test-signature-upload-secret-v1"))
	return services.NewSigningService(store, allOpts...)
}

func setupSignerFlowApp(t *testing.T) (*fiber.App, stores.Scope, string, string, string) {
	t.Helper()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(
		store,
		services.WithDocumentClock(func() time.Time {
			return time.Date(2026, 2, 2, 9, 0, 0, 0, time.UTC)
		}),
		services.WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
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
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
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
	if _, err = agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "phase4-handler-consent"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	tokenSvc := stores.NewTokenService(store)
	issued, err := tokenSvc.Issue(ctx, scope, agreement.ID, signer.ID)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	signingSvc := newTestSigningService(store,
		services.WithSigningObjectStore(objectStore),
		services.WithSigningPreviewFallbackEnabled(true),
	)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(tokenSvc),
		WithSignerSessionService(signingSvc),
		WithDefaultScope(scope),
	)
	return app, scope, issued.Token, field.ID, signatureField.ID
}

func setupPublicSignerSessionApp(t *testing.T) (*fiber.App, stores.Scope, string) {
	t.Helper()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(
		store,
		services.WithDocumentClock(func() time.Time {
			return time.Date(2026, 2, 2, 9, 0, 0, 0, time.UTC)
		}),
		services.WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
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
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
		Role:         &signerRole,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer: %v", err)
	}
	fieldType := stores.FieldTypeText
	page := 1
	required := true
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	signatureType := stores.FieldTypeSignature
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &signatureType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err = agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "public-signer-bootstrap"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	signingTokenService := stores.NewTokenService(store)
	issued, err := signingTokenService.Issue(ctx, scope, agreement.ID, signer.ID)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	signingSvc := newTestSigningService(store,
		services.WithSigningObjectStore(objectStore),
		services.WithSigningPreviewFallbackEnabled(true),
	)
	publicResolver := services.NewPublicReviewTokenResolver(signingTokenService, nil)
	publicSessionTokens := stores.NewPublicSignerSessionTokenService(store)
	publicSessionAuth := services.NewPublicSignerSessionAuthService(publicSessionTokens, store, store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(signingTokenService),
		WithPublicReviewTokenValidator(publicResolver),
		WithSignerSessionService(signingSvc),
		WithPublicReviewSessionService(signingSvc),
		WithPublicSignerSessionAuthService(publicSessionAuth),
		WithDefaultScope(scope),
	)
	return app, scope, issued.Token
}

func bootstrapPublicSignerSession(t *testing.T, app *fiber.App, token string) string {
	t.Helper()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/bootstrap/"+url.PathEscape(token), nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("bootstrap request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected bootstrap status 200, got %d body=%s", resp.StatusCode, string(body))
	}
	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode bootstrap payload: %v", err)
	}
	authPayload, _ := payload["auth"].(map[string]any)
	bearer := strings.TrimSpace(fmt.Sprint(authPayload["token"]))
	if bearer == "" {
		t.Fatalf("expected bootstrap bearer token, got %+v", payload)
	}
	return bearer
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
				{Status: stores.AgreementStatusDraft, ReviewStatus: stores.AgreementReviewStatusChangesRequested},
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
	if !strings.Contains(payload, `"draft":2`) {
		t.Fatalf("expected draft count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"pending":2`) {
		t.Fatalf("expected pending count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"completed":1`) {
		t.Fatalf("expected completed count in payload, got %s", payload)
	}
	if !strings.Contains(payload, `"action_required":4`) {
		t.Fatalf("expected action_required count in payload, got %s", payload)
	}
}

func TestRegisterAgreementStatsRouteRequiresPermission(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}),
		WithAgreementStatsService(agreementStatsStub{}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/stats", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
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

func TestSignerBootstrapIssuesBearerSession(t *testing.T) {
	app, _, token := setupPublicSignerSessionApp(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/bootstrap/"+url.PathEscape(token), nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode bootstrap response: %v", err)
	}
	authPayload, _ := payload["auth"].(map[string]any)
	routesPayload, _ := payload["routes"].(map[string]any)
	if strings.TrimSpace(fmt.Sprint(authPayload["type"])) != "bearer" {
		t.Fatalf("expected bearer auth payload, got %+v", authPayload)
	}
	if strings.TrimSpace(fmt.Sprint(authPayload["token"])) == "" {
		t.Fatalf("expected auth token in bootstrap payload, got %+v", authPayload)
	}
	if strings.TrimSpace(fmt.Sprint(routesPayload["session"])) != "/api/v1/esign/signing/session" {
		t.Fatalf("expected session auth route in bootstrap payload, got %+v", routesPayload)
	}
	if strings.TrimSpace(fmt.Sprint(routesPayload["profile"])) != "/api/v1/esign/signing/profile" {
		t.Fatalf("expected profile auth route in bootstrap payload, got %+v", routesPayload)
	}
}

func TestSignerAuthSessionRouteRequiresBearerAndIgnoresCookies(t *testing.T) {
	app, _, token := setupPublicSignerSessionApp(t)
	bearer := bootstrapPublicSignerSession(t, app, token)

	missingReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session", nil)
	missingReq.Header.Set("Cookie", "esign_admin_user=admin-cookie")
	missingResp, err := app.Test(missingReq, -1)
	if err != nil {
		t.Fatalf("missing bearer request failed: %v", err)
	}
	defer missingResp.Body.Close()
	if missingResp.StatusCode != http.StatusUnauthorized {
		body, _ := io.ReadAll(missingResp.Body)
		t.Fatalf("expected 401 without bearer token, got %d body=%s", missingResp.StatusCode, string(body))
	}

	authReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session", nil)
	authReq.Header.Set("Authorization", "Bearer "+bearer)
	authReq.Header.Set("Cookie", "esign_admin_user=admin-cookie")
	authResp, err := app.Test(authReq, -1)
	if err != nil {
		t.Fatalf("authorized request failed: %v", err)
	}
	defer authResp.Body.Close()
	if authResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(authResp.Body)
		t.Fatalf("expected 200 with bearer token, got %d body=%s", authResp.StatusCode, string(body))
	}
	var payload map[string]any
	if err := json.NewDecoder(authResp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode auth response: %v", err)
	}
	sessionPayload, _ := payload["session"].(map[string]any)
	if strings.TrimSpace(fmt.Sprint(sessionPayload["agreement_id"])) == "" {
		t.Fatalf("expected session payload from auth route, got %+v", payload)
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
	if _, err = expiredValidator.Validate(ctx, scope, issued.Token); err == nil {
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
	cfg, err := buildRegisterConfig([]RegisterOption{WithSignerTokenValidator(validator)})
	if err != nil {
		t.Fatalf("buildRegisterConfig: %v", err)
	}
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
	err = validator.Revoke(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
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

func setupSupersededCorrectionSignerLink(t *testing.T) (context.Context, stores.Scope, *stores.InMemoryStore, stores.TokenService, string, string) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}
	tokenService := stores.NewTokenService(store)
	documentService := services.NewDocumentService(
		store,
		services.WithDocumentObjectStore(objectStore),
	)
	document, err := documentService.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Correction Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-redirect/original.pdf",
		SourceOriginalName: "redirect.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementService := services.NewAgreementService(store, services.WithAgreementTokenService(tokenService))
	agreement, err := agreementService.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Original Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signerRole := stores.RecipientRoleSigner
	order := 1
	signer, err := agreementService.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer One"),
		Role:         &signerRole,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	fieldType := stores.FieldTypeSignature
	page := 1
	required := true
	if _, err = agreementService.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}

	sourceSent, err := agreementService.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "redirect-source-send"})
	if err != nil {
		t.Fatalf("Send source: %v", err)
	}
	legacyIssued, err := tokenService.Issue(ctx, scope, sourceSent.ID, signer.ID)
	if err != nil {
		t.Fatalf("Issue legacy token: %v", err)
	}

	revision, err := agreementService.CreateRevision(ctx, scope, services.CreateRevisionInput{
		SourceAgreementID: sourceSent.ID,
		Kind:              services.AgreementRevisionKindCorrection,
		CreatedByUserID:   "user-2",
		IPAddress:         "198.51.100.44",
	})
	if err != nil {
		t.Fatalf("CreateRevision: %v", err)
	}
	corrected, err := agreementService.Send(ctx, scope, revision.ID, services.SendInput{IdempotencyKey: "redirect-revision-send"})
	if err != nil {
		t.Fatalf("Send correction: %v", err)
	}

	if _, err := tokenService.Validate(ctx, scope, legacyIssued.Token); err == nil {
		t.Fatal("expected legacy token to be revoked after correction supersedes source")
	}
	return ctx, scope, store, tokenService, legacyIssued.Token, corrected.ID
}

func TestRegisterSignerAssetsRedirectsSupersededCorrectionToken(t *testing.T) {
	ctx, scope, store, tokenService, legacyToken, correctedID := setupSupersededCorrectionSignerLink(t)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(tokenService),
		WithAgreementStatsService(store),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/"+legacyToken+"?asset=source", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected redirect status 302, got %d", resp.StatusCode)
	}
	location := strings.TrimSpace(resp.Header.Get("Location"))
	if location == "" {
		t.Fatal("expected redirect location header")
	}
	if strings.Contains(location, legacyToken) {
		t.Fatalf("expected redirect to a fresh token, got %q", location)
	}
	if !strings.Contains(location, "?asset=source") {
		t.Fatalf("expected redirect to preserve asset query, got %q", location)
	}

	redirectURL, err := url.Parse(location)
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	redirectToken := path.Base(strings.TrimSpace(redirectURL.Path))
	if redirectToken == "" {
		t.Fatalf("expected token in redirect location, got %q", location)
	}
	redirectedRecord, err := tokenService.Validate(ctx, scope, redirectToken)
	if err != nil {
		t.Fatalf("Validate redirected token: %v", err)
	}
	if redirectedRecord.AgreementID != correctedID {
		t.Fatalf("expected redirected token agreement %q, got %+v", correctedID, redirectedRecord)
	}
}

func TestRegisterSignerSessionRedirectsSupersededCorrectionToken(t *testing.T) {
	ctx, scope, store, tokenService, legacyToken, correctedID := setupSupersededCorrectionSignerLink(t)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(tokenService),
		WithAgreementStatsService(store),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+legacyToken, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Fatalf("expected redirect status 302, got %d", resp.StatusCode)
	}
	location := strings.TrimSpace(resp.Header.Get("Location"))
	if location == "" {
		t.Fatal("expected redirect location header")
	}
	if strings.Contains(location, legacyToken) {
		t.Fatalf("expected redirect to a fresh token, got %q", location)
	}

	redirectURL, err := url.Parse(location)
	if err != nil {
		t.Fatalf("parse redirect location: %v", err)
	}
	redirectToken := path.Base(strings.TrimSpace(redirectURL.Path))
	if redirectToken == "" {
		t.Fatalf("expected token in redirect location, got %q", location)
	}
	redirectedRecord, err := tokenService.Validate(ctx, scope, redirectToken)
	if err != nil {
		t.Fatalf("Validate redirected token: %v", err)
	}
	if redirectedRecord.AgreementID != correctedID {
		t.Fatalf("expected redirected token agreement %q, got %+v", correctedID, redirectedRecord)
	}
}

func TestRegisterSignerAssetsReturns410ForRevokedTokenWithoutSupersedingVersion(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	tokenStore := stores.NewInMemoryStore()
	validator := stores.NewTokenService(tokenStore)
	issued, err := validator.Issue(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	err = validator.Revoke(ctx, scope, "agreement-1", "recipient-1")
	if err != nil {
		t.Fatalf("Revoke: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(validator),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/"+issued.Token, nil)
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
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status?tenant_id=tenant-2&org_id=org-1", nil)

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

func TestRegisterRemediationTriggerRequiresAdminEdit(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestRegisterRemediationTriggerModeOverrideRequiresAdminSettings(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminEdit: true,
		}}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate?mode=queued", nil)
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

func TestRegisterRemediationTriggerModeOverrideAllowedWithAdminSettings(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminEdit:     true,
			DefaultPermissions.AdminSettings: true,
		}}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate?mode=queued", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotImplemented {
		t.Fatalf("expected status 501, got %d", resp.StatusCode)
	}
}

func TestRegisterRemediationTriggerDeniesScopeMismatch(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminEdit: true,
		}}),
		WithRemediationTrigger(remediationTriggerFunc(func(context.Context, RemediationTriggerInput) (RemediationDispatchReceipt, error) {
			return RemediationDispatchReceipt{
				Accepted:   true,
				Mode:       "queued",
				CommandID:  "esign.pdf.remediate",
				DispatchID: "dispatch-1",
			}, nil
		})),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate?tenant_id=tenant-2&org_id=org-1", nil)
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

func TestRegisterRemediationTriggerReturnsQueuedReceiptAndStatusURL(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminEdit: true,
		}}),
		WithRemediationTrigger(remediationTriggerFunc(func(context.Context, RemediationTriggerInput) (RemediationDispatchReceipt, error) {
			enqueuedAt := time.Date(2026, 3, 8, 10, 0, 0, 0, time.UTC)
			return RemediationDispatchReceipt{
				Accepted:      true,
				Mode:          "queued",
				CommandID:     "esign.pdf.remediate",
				DispatchID:    "dispatch-q-1",
				CorrelationID: "corr-q-1",
				EnqueuedAt:    &enqueuedAt,
			}, nil
		})),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	for _, fragment := range []string{
		"\"mode\":\"queued\"",
		"\"accepted\":true",
		"\"dispatch_id\":\"dispatch-q-1\"",
		"\"dispatch_status_url\":\"/admin/api/v1/esign/dispatches/dispatch-q-1\"",
	} {
		if !strings.Contains(bodyText, fragment) {
			t.Fatalf("expected response to contain %s, got %s", fragment, bodyText)
		}
	}
}

func TestRegisterRemediationTriggerMapsIdempotencyKeyAndRetries(t *testing.T) {
	var calls int
	var capturedKeys []string
	var nextDispatchSeq int
	seen := map[string]string{}
	trigger := remediationTriggerFunc(func(_ context.Context, input RemediationTriggerInput) (RemediationDispatchReceipt, error) {
		calls++
		key := strings.TrimSpace(input.IdempotencyKey)
		capturedKeys = append(capturedKeys, key)
		dispatchID, ok := seen[key]
		if !ok {
			nextDispatchSeq++
			dispatchID = fmt.Sprintf("dispatch-retry-%d", nextDispatchSeq)
			seen[key] = dispatchID
		}
		return RemediationDispatchReceipt{
			Accepted:      true,
			Mode:          "queued",
			CommandID:     "esign.pdf.remediate",
			DispatchID:    dispatchID,
			CorrelationID: strings.TrimSpace(input.CorrelationID),
		}, nil
	})
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminEdit: true,
		}}),
		WithRemediationTrigger(trigger),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	reqOne := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate", nil)
	reqOne.Header.Set("Idempotency-Key", "remediate-key-1")
	respOne, err := app.Test(reqOne, -1)
	if err != nil {
		t.Fatalf("request one failed: %v", err)
	}
	defer respOne.Body.Close()
	if respOne.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(respOne.Body)
		t.Fatalf("expected request one status 202, got %d body=%s", respOne.StatusCode, body)
	}
	bodyOne, err := io.ReadAll(respOne.Body)
	if err != nil {
		t.Fatalf("read request one body: %v", err)
	}
	dispatchOne := extractJSONFieldString(bodyOne, []string{"receipt", "dispatch_id"})

	reqTwo := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/documents/doc-1/remediate", nil)
	reqTwo.Header.Set("Idempotency-Key", "remediate-key-1")
	respTwo, err := app.Test(reqTwo, -1)
	if err != nil {
		t.Fatalf("request two failed: %v", err)
	}
	defer respTwo.Body.Close()
	if respTwo.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(respTwo.Body)
		t.Fatalf("expected request two status 202, got %d body=%s", respTwo.StatusCode, body)
	}
	bodyTwo, err := io.ReadAll(respTwo.Body)
	if err != nil {
		t.Fatalf("read request two body: %v", err)
	}
	dispatchTwo := extractJSONFieldString(bodyTwo, []string{"receipt", "dispatch_id"})

	if dispatchOne == "" || dispatchTwo == "" {
		t.Fatalf("expected dispatch ids for both retries, got one=%q two=%q", dispatchOne, dispatchTwo)
	}
	if dispatchOne != dispatchTwo {
		t.Fatalf("expected duplicate retries to return same dispatch id, got one=%q two=%q", dispatchOne, dispatchTwo)
	}
	if calls != 2 {
		t.Fatalf("expected trigger to be invoked for each API retry, got %d", calls)
	}
	if len(capturedKeys) != 2 || capturedKeys[0] != "remediate-key-1" || capturedKeys[1] != "remediate-key-1" {
		t.Fatalf("expected idempotency key to be passed through each retry, got %+v", capturedKeys)
	}
}

func TestRegisterRemediationDispatchStatusRequiresAdminView(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}),
		WithRemediationDispatchStatusLookup(remediationDispatchStatusStub{
			status: RemediationDispatchStatus{
				DispatchID: "dispatch-1",
				Status:     "accepted",
				TenantID:   "tenant-1",
				OrgID:      "org-1",
			},
		}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/dispatches/dispatch-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
}

func TestRegisterRemediationDispatchStatusDeniesScopeMismatch(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminView: true,
		}}),
		WithRemediationDispatchStatusLookup(remediationDispatchStatusStub{
			status: RemediationDispatchStatus{
				DispatchID: "dispatch-1",
				Status:     "accepted",
				TenantID:   "tenant-2",
				OrgID:      "org-1",
			},
		}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/dispatches/dispatch-1", nil)
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

func TestRegisterRemediationDispatchStatusAllowsMatchingScope(t *testing.T) {
	updatedAt := time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminView: true,
		}}),
		WithRemediationDispatchStatusLookup(remediationDispatchStatusStub{
			status: RemediationDispatchStatus{
				DispatchID:     "dispatch-1",
				Status:         "running",
				TenantID:       "tenant-1",
				OrgID:          "org-1",
				Attempt:        2,
				MaxAttempts:    5,
				TerminalReason: "",
				UpdatedAt:      &updatedAt,
			},
		}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)
	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/dispatches/dispatch-1", nil)
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
	if !strings.Contains(string(body), "\"dispatch_id\":\"dispatch-1\"") {
		t.Fatalf("expected dispatch payload in response, got %s", string(body))
	}
}

func TestRegisterRemediationDispatchStatusNormalizesLifecycleStates(t *testing.T) {
	testCases := []struct {
		name         string
		rawStatus    string
		wantStatus   string
		wantHTTPCode int
	}{
		{name: "requested maps accepted", rawStatus: "requested", wantStatus: "\"status\":\"accepted\"", wantHTTPCode: http.StatusOK},
		{name: "started maps running", rawStatus: "started", wantStatus: "\"status\":\"running\"", wantHTTPCode: http.StatusOK},
		{name: "failed stays failed", rawStatus: "failed", wantStatus: "\"status\":\"failed\"", wantHTTPCode: http.StatusOK},
		{name: "cancelled maps canceled", rawStatus: "cancelled", wantStatus: "\"status\":\"canceled\"", wantHTTPCode: http.StatusOK},
		{name: "deadletter maps dead_letter", rawStatus: "deadletter", wantStatus: "\"status\":\"dead_letter\"", wantHTTPCode: http.StatusOK},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			app := setupRegisterTestApp(t,
				WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
					DefaultPermissions.AdminView: true,
				}}),
				WithRemediationDispatchStatusLookup(remediationDispatchStatusStub{
					status: RemediationDispatchStatus{
						DispatchID:     "dispatch-state-1",
						Status:         tc.rawStatus,
						TenantID:       "tenant-1",
						OrgID:          "org-1",
						Attempt:        2,
						MaxAttempts:    4,
						TerminalReason: "",
					},
				}),
				WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
			)
			req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/dispatches/dispatch-state-1", nil)
			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != tc.wantHTTPCode {
				t.Fatalf("expected status %d, got %d", tc.wantHTTPCode, resp.StatusCode)
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("read response body: %v", err)
			}
			if !strings.Contains(string(body), tc.wantStatus) {
				t.Fatalf("expected body to contain %s, got %s", tc.wantStatus, string(body))
			}
		})
	}
}

func TestRegisterDraftWorkflowUnsupportedThenRemediateThenSend(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 8, 9, 0, 0, 0, time.UTC)
	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-remediation-workflow",
		Title:                  "Unsupported Source",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-remediation-workflow/original.pdf",
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           strings.Repeat("b", 64),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(services.PDFCompatibilityTierUnsupported),
		PDFCompatibilityReason: services.PDFCompatibilityReasonPreviewFallbackDisabled,
		PDFNormalizationStatus: string(services.PDFNormalizationStatusFailed),
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}

	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(services.NewAgreementService(store)),
	)
	syncSvc, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(draftSvc),
		esignsync.NewAgreementDraftIdempotencyStore(store),
	)
	if err != nil {
		t.Fatalf("NewSyncService: %v", err)
	}

	dispatchID := "dispatch-workflow-1"
	statusReads := 0
	remediationTrigger := remediationTriggerFunc(func(ctx context.Context, input RemediationTriggerInput) (RemediationDispatchReceipt, error) {
		startedAt := time.Date(2026, 3, 8, 9, 5, 0, 0, time.UTC)
		completedAt := startedAt.Add(2 * time.Second)
		_, patchErr := store.SaveMetadata(ctx, input.Scope, strings.TrimSpace(input.DocumentID), stores.DocumentMetadataPatch{
			PDFCompatibilityTier:   string(services.PDFCompatibilityTierFull),
			PDFCompatibilityReason: "",
			PDFNormalizationStatus: string(services.PDFNormalizationStatusCompleted),
			RemediationStatus:      services.PDFRemediationStatusSucceeded,
			RemediationDispatchID:  dispatchID,
			RemediationRequestedAt: &startedAt,
			RemediationStartedAt:   &startedAt,
			RemediationCompletedAt: &completedAt,
		})
		if patchErr != nil {
			return RemediationDispatchReceipt{}, patchErr
		}
		enqueuedAt := startedAt.Add(-1 * time.Second)
		return RemediationDispatchReceipt{
			Accepted:      true,
			Mode:          "queued",
			CommandID:     "esign.pdf.remediate",
			DispatchID:    dispatchID,
			CorrelationID: strings.TrimSpace(input.CorrelationID),
			EnqueuedAt:    &enqueuedAt,
		}, nil
	})
	remediationStatus := remediationDispatchStatusFunc(func(_ context.Context, requestedDispatchID string) (RemediationDispatchStatus, error) {
		if strings.TrimSpace(requestedDispatchID) != dispatchID {
			return RemediationDispatchStatus{}, fmt.Errorf("dispatch not found")
		}
		statusReads++
		status := "accepted"
		if statusReads > 1 {
			status = "succeeded"
		}
		updatedAt := now.Add(time.Duration(statusReads) * time.Second)
		return RemediationDispatchStatus{
			DispatchID:  dispatchID,
			Status:      status,
			TenantID:    scope.TenantID,
			OrgID:       scope.OrgID,
			Attempt:     1,
			MaxAttempts: 3,
			UpdatedAt:   &updatedAt,
		}, nil
	})

	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminCreate: true,
			DefaultPermissions.AdminView:   true,
			DefaultPermissions.AdminEdit:   true,
			DefaultPermissions.AdminSend:   true,
		}}),
		WithAdminRouteMiddleware(withClaimsUserPermissions("workflow-user-1",
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
			DefaultPermissions.AdminEdit,
			DefaultPermissions.AdminSend,
		)),
		WithDraftWorkflowService(draftSvc),
		WithAgreementDraftSyncService(syncSvc),
		WithAgreementDraftSyncBootstrap(esignsync.NewAgreementDraftBootstrapper(draftSvc)),
		WithRemediationTrigger(remediationTrigger),
		WithRemediationDispatchStatusLookup(remediationStatus),
		WithDefaultScope(scope),
	)

	requestJSON := func(method, path, userID string, payload any, headers map[string]string) (int, []byte) {
		t.Helper()
		var body io.Reader
		if payload != nil {
			raw, marshalErr := json.Marshal(payload)
			if marshalErr != nil {
				t.Fatalf("marshal payload: %v", marshalErr)
			}
			body = bytes.NewReader(raw)
		}
		req := httptest.NewRequest(method, path, body)
		req.Header.Set("Accept", "application/json")
		if payload != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		_ = userID
		for key, value := range headers {
			req.Header.Set(key, value)
		}
		resp, testErr := app.Test(req, -1)
		if testErr != nil {
			t.Fatalf("request %s %s failed: %v", method, path, testErr)
		}
		defer resp.Body.Close()
		raw, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			t.Fatalf("read response body: %v", readErr)
		}
		return resp.StatusCode, raw
	}

	validWizardState := map[string]any{
		"document": map[string]any{"id": document.ID},
		"details": map[string]any{
			"title":   "Needs Remediation",
			"message": "Please sign",
		},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "Signer One",
				"email":  "signer@example.com",
				"role":   "signer",
				"order":  1,
			},
		},
		"fieldDefinitions": []map[string]any{
			{
				"tempId":            "field-1",
				"type":              "signature",
				"participantTempId": "participant-1",
				"required":          true,
			},
		},
		"fieldPlacements": []map[string]any{
			{
				"fieldTempId": "field-1",
				"page":        1,
				"x":           120,
				"y":           140,
				"width":       180,
				"height":      32,
			},
		},
	}

	userID := "workflow-user-1"
	bootstrapStatus, bootstrapBody := requestJSON(http.MethodPost, "/admin/api/v1/esign/sync/bootstrap/agreement-draft", userID, nil, nil)
	if bootstrapStatus != http.StatusCreated {
		t.Fatalf("expected bootstrap status 201, got %d body=%s", bootstrapStatus, string(bootstrapBody))
	}
	draftID := extractJSONFieldString(bootstrapBody, []string{"resource_ref", "id"})
	if draftID == "" {
		t.Fatalf("expected draft id in bootstrap payload, got %s", string(bootstrapBody))
	}

	autosaveStatus, autosaveBody := requestJSON(http.MethodPatch, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, userID, map[string]any{
		"operation":         "autosave",
		"expected_revision": 1,
		"payload": map[string]any{
			"wizard_state": validWizardState,
			"title":        "Needs Remediation",
			"current_step": 6,
			"document_id":  document.ID,
		},
	}, nil)
	if autosaveStatus != http.StatusOK {
		t.Fatalf("expected autosave status 200, got %d body=%s", autosaveStatus, string(autosaveBody))
	}

	sendStatusBefore, sendBodyBefore := requestJSON(http.MethodPost, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID+"/actions/send", userID, map[string]any{
		"expected_revision": 2,
		"idempotency_key":   "remediation-send-before",
		"payload":           map[string]any{},
	}, nil)
	if sendStatusBefore != http.StatusBadRequest {
		t.Fatalf("expected unsupported sync send status 400, got %d body=%s", sendStatusBefore, string(sendBodyBefore))
	}
	if !strings.Contains(string(sendBodyBefore), `"code":"INVALID_MUTATION"`) {
		t.Fatalf("expected INVALID_MUTATION sync error, got %s", string(sendBodyBefore))
	}
	if !strings.Contains(string(sendBodyBefore), `"reason":"preview_fallback.disabled"`) {
		t.Fatalf("expected preview_fallback.disabled in send failure payload, got %s", string(sendBodyBefore))
	}

	triggerStatus, triggerBody := requestJSON(http.MethodPost, "/admin/api/v1/esign/documents/"+document.ID+"/remediate", userID, nil, map[string]string{
		"Idempotency-Key": "remediation-workflow-key-1",
	})
	if triggerStatus != http.StatusAccepted {
		t.Fatalf("expected remediation trigger status 202, got %d body=%s", triggerStatus, string(triggerBody))
	}
	dispatchStatusURL := extractJSONFieldString(triggerBody, []string{"dispatch_status_url"})
	if strings.TrimSpace(dispatchStatusURL) == "" {
		t.Fatalf("expected dispatch_status_url for queued remediation, got %s", string(triggerBody))
	}

	statusCodeOne, statusBodyOne := requestJSON(http.MethodGet, dispatchStatusURL, userID, nil, nil)
	if statusCodeOne != http.StatusOK {
		t.Fatalf("expected first status poll 200, got %d body=%s", statusCodeOne, string(statusBodyOne))
	}
	if !strings.Contains(string(statusBodyOne), "\"status\":\"accepted\"") {
		t.Fatalf("expected first poll accepted status, got %s", string(statusBodyOne))
	}

	statusCodeTwo, statusBodyTwo := requestJSON(http.MethodGet, dispatchStatusURL, userID, nil, nil)
	if statusCodeTwo != http.StatusOK {
		t.Fatalf("expected second status poll 200, got %d body=%s", statusCodeTwo, string(statusBodyTwo))
	}
	if !strings.Contains(string(statusBodyTwo), "\"status\":\"succeeded\"") {
		t.Fatalf("expected second poll succeeded status, got %s", string(statusBodyTwo))
	}

	sendStatusAfter, sendBodyAfter := requestJSON(http.MethodPost, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID+"/actions/send", userID, map[string]any{
		"expected_revision": 2,
		"idempotency_key":   "remediation-send-after",
		"payload":           map[string]any{},
	}, nil)
	if sendStatusAfter != http.StatusOK {
		t.Fatalf("expected send-after-remediation status 200, got %d body=%s", sendStatusAfter, string(sendBodyAfter))
	}
	if extractJSONFieldString(sendBodyAfter, []string{"data", "agreement_id"}) == "" {
		t.Fatalf("expected agreement_id after remediation, got %s", string(sendBodyAfter))
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
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(
		store,
		services.WithDocumentClock(func() time.Time {
			return time.Date(2026, 2, 1, 10, 0, 0, 0, time.UTC)
		}),
		services.WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
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
		Email:        new("signer-one@example.com"),
		Name:         new("Signer One"),
		Role:         &signerOneRole,
		SigningOrder: &signerOneOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer one: %v", err)
	}
	signerTwoRole := stores.RecipientRoleSigner
	signerTwoOrder := 2
	signerTwo, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer-two@example.com"),
		Name:         new("Signer Two"),
		Role:         &signerTwoRole,
		SigningOrder: &signerTwoOrder,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft signer two: %v", err)
	}

	required := true
	pageOne := 1
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerOne.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  &pageOne,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer one: %v", err)
	}
	pageTwo := 1
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signerTwo.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  &pageTwo,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signer two: %v", err)
	}

	if _, err = agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "phase4-session"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	tokenService := stores.NewTokenService(store)
	if _, err = tokenService.Issue(ctx, scope, agreement.ID, signerOne.ID); err != nil {
		t.Fatalf("Issue signer one token: %v", err)
	}
	issuedTwo, err := tokenService.Issue(ctx, scope, agreement.ID, signerTwo.ID)
	if err != nil {
		t.Fatalf("Issue signer two token: %v", err)
	}

	signingSvc := services.NewSigningService(store,
		services.WithSigningObjectStore(objectStore),
		services.WithSigningPreviewFallbackEnabled(true),
	)
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
	for _, key := range []string{"\"contract_version\":\"pdf_page_space_v1\"", "\"unit\":\"pt\"", "\"origin\":\"top_left\"", "\"y_axis_direction\":\"down\"", "\"compatibility\":\"", "\"compatibility_tier\":\""} {
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

type externalReviewRouteFixture struct {
	app         *fiber.App
	issued      stores.IssuedReviewSessionToken
	store       *stores.InMemoryStore
	scope       stores.Scope
	agreementID string
}

func TestRegisterSignerSessionAcceptsExternalReviewToken(t *testing.T) {
	fixture := setupExternalReviewRouteApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+fixture.issued.Token, nil)
	resp, err := fixture.app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, body)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	for _, fragment := range []string{
		`"session_kind":"reviewer"`,
		`"ui_mode":"review"`,
		`"default_tab":"review"`,
		`"recipient_email":"route.reviewer@example.com"`,
		`"can_sign":false`,
		`"review_markers_visible":true`,
		`"review_markers_interactive":true`,
	} {
		if !strings.Contains(bodyText, fragment) {
			t.Fatalf("expected %s in session payload, got %s", fragment, bodyText)
		}
	}
}

func setupExternalReviewRouteApp(t *testing.T) externalReviewRouteFixture {
	t.Helper()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-review-public", OrgID: "org-review-public"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(store, services.WithDocumentObjectStore(objectStore))
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "External Review",
		SourceOriginalName: "external-review.pdf",
		ObjectKey:          "tenant/tenant-review-public/org/org-review-public/docs/external-review/source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "External Review",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signerRole := stores.RecipientRoleSigner
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("review-route-signer@example.com"),
		Name:         new("Route Signer"),
		Role:         &signerRole,
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	fieldType := stores.FieldTypeSignature
	required := true
	page := 1
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	summary, err := agreementSvc.OpenReview(ctx, scope, agreement.ID, services.ReviewOpenInput{
		Gate:            stores.AgreementReviewGateApproveBeforeSign,
		CommentsEnabled: true,
		ReviewParticipants: []services.ReviewParticipantInput{
			{
				ParticipantType: stores.AgreementReviewParticipantTypeExternal,
				Email:           "route.reviewer@example.com",
				DisplayName:     "Route Reviewer",
				CanComment:      true,
				CanApprove:      true,
			},
		},
		RequestedByUserID: "user-1",
		ActorType:         "user",
		ActorID:           "user-1",
	})
	if err != nil {
		t.Fatalf("OpenReview: %v", err)
	}
	if _, err = agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "external-review-route-send"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	participants, err := store.ListAgreementReviewParticipants(ctx, scope, summary.Review.ID)
	if err != nil {
		t.Fatalf("ListAgreementReviewParticipants: %v", err)
	}
	reviewTokenService := stores.NewReviewSessionTokenService(store)
	issued, err := reviewTokenService.Rotate(ctx, scope, agreement.ID, summary.Review.ID, participants[0].ID)
	if err != nil {
		t.Fatalf("Rotate review token: %v", err)
	}

	signingTokenService := stores.NewTokenService(store)
	signingSvc := services.NewSigningService(store, services.WithSigningObjectStore(objectStore))
	assetSvc := services.NewSignerAssetContractService(store, services.WithSignerAssetObjectStore(objectStore))
	publicResolver := services.NewPublicReviewTokenResolver(signingTokenService, reviewTokenService)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(signingTokenService),
		WithPublicReviewTokenValidator(publicResolver),
		WithSignerSessionService(signingSvc),
		WithSignerAssetContractService(assetSvc),
		WithSignerObjectStore(objectStore),
		WithAuditEventStore(store),
		WithDefaultScope(scope),
	)
	return externalReviewRouteFixture{
		app:         app,
		issued:      issued,
		store:       store,
		scope:       scope,
		agreementID: agreement.ID,
	}
}

func setupSenderAgreementViewerRouteApp(t *testing.T, grantedPerms []string, claimPerms []string, commentsEnabled bool) senderAgreementViewerRouteFixture {
	t.Helper()

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-sender-viewer", OrgID: "org-sender-viewer"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(store, services.WithDocumentObjectStore(objectStore))
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Sender Viewer",
		SourceOriginalName: "sender-viewer.pdf",
		ObjectKey:          "tenant/tenant-sender-viewer/org/org-sender-viewer/docs/sender-viewer/source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Sender Viewer",
		CreatedByUserID: "sender-owner",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signerRole := stores.RecipientRoleSigner
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("sender.viewer.signer@example.com"),
		Name:         new("Sender Viewer Signer"),
		Role:         &signerRole,
		SigningOrder: new(1),
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	fieldType := stores.FieldTypeText
	required := true
	page := 1
	if _, err := agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err := agreementSvc.OpenReview(ctx, scope, agreement.ID, services.ReviewOpenInput{
		Gate:              stores.AgreementReviewGateApproveBeforeSend,
		CommentsEnabled:   commentsEnabled,
		ReviewerIDs:       []string{signer.ID},
		RequestedByUserID: "sender-owner",
		ActorType:         "user",
		ActorID:           "sender-owner",
	}); err != nil {
		t.Fatalf("OpenReview: %v", err)
	}

	executedKey := "tenant/tenant-sender-viewer/org/org-sender-viewer/agreements/sender-viewer/executed.pdf"
	certificateKey := "tenant/tenant-sender-viewer/org/org-sender-viewer/agreements/sender-viewer/certificate.pdf"
	if _, err := objectStore.UploadFile(ctx, executedKey, services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("UploadFile executed: %v", err)
	}
	if _, err := objectStore.UploadFile(ctx, certificateKey, services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("UploadFile certificate: %v", err)
	}
	if _, err := store.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:       agreement.ID,
		ExecutedObjectKey: executedKey,
		ExecutedSHA256:    "sender-viewer-executed",
		CorrelationID:     "sender-viewer-executed",
	}); err != nil {
		t.Fatalf("SaveAgreementArtifacts executed: %v", err)
	}
	if _, err := store.SaveAgreementArtifacts(ctx, scope, stores.AgreementArtifactRecord{
		AgreementID:          agreement.ID,
		CertificateObjectKey: certificateKey,
		CertificateSHA256:    "sender-viewer-certificate",
		CorrelationID:        "sender-viewer-certificate",
	}); err != nil {
		t.Fatalf("SaveAgreementArtifacts certificate: %v", err)
	}

	allowed := map[string]bool{}
	for _, permission := range grantedPerms {
		permission = strings.TrimSpace(permission)
		if permission != "" {
			allowed[permission] = true
		}
	}
	if len(claimPerms) == 0 {
		claimPerms = append([]string{}, grantedPerms...)
	}

	viewerSvc := services.NewAgreementViewService(
		services.NewSigningService(store, services.WithSigningObjectStore(objectStore)),
		store,
		services.WithSignerAssetObjectStore(objectStore),
	)
	app := setupRegisterTestApp(t,
		WithAgreementViewerService(viewerSvc),
		WithSignerObjectStore(objectStore),
		WithAuditEventStore(store),
		WithAuthorizer(mapAuthorizer{allowed: allowed}),
		WithAdminRouteMiddleware(withClaimsUserPermissions("sender-viewer-user", claimPerms...)),
		WithDefaultScope(scope),
	)
	return senderAgreementViewerRouteFixture{
		app:         app,
		store:       store,
		scope:       scope,
		agreementID: agreement.ID,
	}
}

func TestRegisterSignerAssetsAcceptsExternalReviewTokenForSourcePreview(t *testing.T) {
	fixture := setupExternalReviewRouteApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/"+fixture.issued.Token, nil)
	resp, err := fixture.app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, body)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	if !strings.Contains(bodyText, "\"preview_url\"") {
		t.Fatalf("expected preview_url in asset contract, got %s", bodyText)
	}
	for _, forbidden := range []string{"\"source_url\"", "\"executed_url\"", "\"certificate_url\""} {
		if strings.Contains(bodyText, forbidden) {
			t.Fatalf("did not expect %s for reviewer asset contract, got %s", forbidden, bodyText)
		}
	}

	binaryReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/"+fixture.issued.Token+"?asset=preview", nil)
	binaryReq.Header.Set("User-Agent", "review-token-preview/1.0")
	binaryResp, err := fixture.app.Test(binaryReq, -1)
	if err != nil {
		t.Fatalf("binary request failed: %v", err)
	}
	defer binaryResp.Body.Close()
	if binaryResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(binaryResp.Body)
		t.Fatalf("expected binary status 200, got %d body=%s", binaryResp.StatusCode, payload)
	}
	if contentType := strings.TrimSpace(binaryResp.Header.Get("Content-Type")); !strings.Contains(contentType, "application/pdf") {
		t.Fatalf("expected pdf content type, got %q", contentType)
	}

	events, err := fixture.store.ListForAgreement(context.Background(), fixture.scope, fixture.agreementID, stores.AuditEventQuery{SortDesc: false})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	var opened *stores.AuditEventRecord
	for idx := range events {
		if events[idx].EventType == "signer.assets.asset_opened" {
			opened = &events[idx]
			break
		}
	}
	if opened == nil {
		t.Fatalf("expected signer.assets.asset_opened event, got %+v", events)
	}
	if opened.ActorType != "review_token" {
		t.Fatalf("expected actor type review_token, got %q", opened.ActorType)
	}
}

func TestRegisterAgreementViewerAssetsFilterProtectedArtifactsByPolicy(t *testing.T) {
	fixture := setupSenderAgreementViewerRouteApp(t,
		[]string{DefaultPermissions.AdminView},
		[]string{DefaultPermissions.AdminView},
		true,
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer/assets", nil)
	resp, err := fixture.app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, body)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	for _, expected := range []string{`"preview_url"`, `"source_url"`} {
		if !strings.Contains(bodyText, expected) {
			t.Fatalf("expected %s in sender asset response, got %s", expected, bodyText)
		}
	}
	for _, forbidden := range []string{`"executed_url"`, `"certificate_url"`} {
		if strings.Contains(bodyText, forbidden) {
			t.Fatalf("did not expect %s without download permission, got %s", forbidden, bodyText)
		}
	}

	executedReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer/assets?asset=executed", nil)
	executedResp, err := fixture.app.Test(executedReq, -1)
	if err != nil {
		t.Fatalf("executed asset request failed: %v", err)
	}
	defer executedResp.Body.Close()
	if executedResp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(executedResp.Body)
		t.Fatalf("expected status 403 for executed asset without download permission, got %d body=%s", executedResp.StatusCode, body)
	}
}

func TestRegisterAgreementViewerThreadsUseEditAndViewPolicy(t *testing.T) {
	fixture := setupSenderAgreementViewerRouteApp(t,
		[]string{DefaultPermissions.AdminView},
		[]string{DefaultPermissions.AdminView},
		true,
	)

	sessionReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer", nil)
	sessionResp, err := fixture.app.Test(sessionReq, -1)
	if err != nil {
		t.Fatalf("session request failed: %v", err)
	}
	defer sessionResp.Body.Close()
	if sessionResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sessionResp.Body)
		t.Fatalf("expected status 200 for sender session, got %d body=%s", sessionResp.StatusCode, body)
	}
	sessionBody, err := io.ReadAll(sessionResp.Body)
	if err != nil {
		t.Fatalf("read session body: %v", err)
	}
	if !strings.Contains(string(sessionBody), `"can_comment":false`) {
		t.Fatalf("expected sender session to stay read-only for comments, got %s", string(sessionBody))
	}

	payload := strings.NewReader(`{"thread":{"anchor_type":"agreement","body":"sender comment"}}`)
	threadReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer/review/threads", payload)
	threadReq.Header.Set("Content-Type", "application/json")
	threadResp, err := fixture.app.Test(threadReq, -1)
	if err != nil {
		t.Fatalf("thread create request failed: %v", err)
	}
	defer threadResp.Body.Close()
	if threadResp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(threadResp.Body)
		t.Fatalf("expected status 403 without edit+view comment policy, got %d body=%s", threadResp.StatusCode, body)
	}
}

func TestRegisterAgreementViewerThreadsAllowEditAndViewPolicy(t *testing.T) {
	fixture := setupSenderAgreementViewerRouteApp(t,
		[]string{DefaultPermissions.AdminView, DefaultPermissions.AdminEdit},
		[]string{DefaultPermissions.AdminView, DefaultPermissions.AdminEdit},
		true,
	)

	payload := strings.NewReader(`{"thread":{"anchor_type":"agreement","body":"sender comment"}}`)
	threadReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer/review/threads", payload)
	threadReq.Header.Set("Content-Type", "application/json")
	threadResp, err := fixture.app.Test(threadReq, -1)
	if err != nil {
		t.Fatalf("thread create request failed: %v", err)
	}
	defer threadResp.Body.Close()
	if threadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(threadResp.Body)
		t.Fatalf("expected status 200 with edit+view policy, got %d body=%s", threadResp.StatusCode, body)
	}
	body, err := io.ReadAll(threadResp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.Contains(string(body), `"status":"ok"`) || !strings.Contains(string(body), `"visibility":"shared"`) {
		t.Fatalf("expected successful shared sender thread creation, got %s", string(body))
	}
}

func TestRegisterAgreementViewerThreadsRespectReviewCommentState(t *testing.T) {
	fixture := setupSenderAgreementViewerRouteApp(t,
		[]string{DefaultPermissions.AdminView, DefaultPermissions.AdminEdit},
		[]string{DefaultPermissions.AdminView, DefaultPermissions.AdminEdit},
		false,
	)

	sessionReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer", nil)
	sessionResp, err := fixture.app.Test(sessionReq, -1)
	if err != nil {
		t.Fatalf("session request failed: %v", err)
	}
	defer sessionResp.Body.Close()
	if sessionResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sessionResp.Body)
		t.Fatalf("expected status 200 for sender session, got %d body=%s", sessionResp.StatusCode, body)
	}
	sessionBody, err := io.ReadAll(sessionResp.Body)
	if err != nil {
		t.Fatalf("read session body: %v", err)
	}
	if !strings.Contains(string(sessionBody), `"can_comment":false`) {
		t.Fatalf("expected sender session comments disabled when review comments are off, got %s", string(sessionBody))
	}

	payload := strings.NewReader(`{"thread":{"anchor_type":"agreement","body":"sender comment"}}`)
	threadReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/agreements/"+fixture.agreementID+"/viewer/review/threads", payload)
	threadReq.Header.Set("Content-Type", "application/json")
	threadResp, err := fixture.app.Test(threadReq, -1)
	if err != nil {
		t.Fatalf("thread create request failed: %v", err)
	}
	defer threadResp.Body.Close()
	if threadResp.StatusCode != http.StatusForbidden {
		body, _ := io.ReadAll(threadResp.Body)
		t.Fatalf("expected status 403 when review comments are disabled, got %d body=%s", threadResp.StatusCode, body)
	}
}

func TestRegisterSignerTelemetryAcceptsExternalReviewToken(t *testing.T) {
	fixture := setupExternalReviewRouteApp(t)

	body := bytes.NewBufferString(`{"events":[{"event":"viewer_load_success"}],"summary":{"sessionId":"reviewer-session-1"}}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/telemetry/"+fixture.issued.Token, body)
	req.Header.Set("Content-Type", "text/plain;charset=UTF-8")

	resp, err := fixture.app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusAccepted {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 202, got %d body=%s", resp.StatusCode, payload)
	}
}

func TestRegisterSignerAssetsRejectExternalReviewTokenAfterReviewClose(t *testing.T) {
	fixture := setupExternalReviewRouteApp(t)

	agreementSvc := services.NewAgreementService(
		fixture.store,
		services.WithAgreementReviewTokenService(stores.NewReviewSessionTokenService(fixture.store)),
	)
	if _, err := agreementSvc.CloseReview(context.Background(), fixture.scope, fixture.agreementID, "user", "user-1", "203.0.113.10"); err != nil {
		t.Fatalf("CloseReview: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/"+fixture.issued.Token, nil)
	resp, err := fixture.app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusGone {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 410 after closing review, got %d body=%s", resp.StatusCode, body)
	}
}

func TestRegisterSignerSessionIncludesLimitedCompatibilityReasonWhenPreviewFallbackForced(t *testing.T) {
	// Build route with preview fallback forced to validate compatibility contract fields.
	adapter := router.NewFiberAdapter(func(_ *fiber.App) *fiber.App {
		return fiber.New(fiber.Config{EnablePrintRoutes: false})
	})
	routes := BuildRouteSet(nil, "/admin", "admin.api.v1")

	ctx2 := context.Background()
	scope2 := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store2 := stores.NewInMemoryStore()
	docSvc := services.NewDocumentService(store2)
	doc, err := docSvc.Upload(ctx2, scope2, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-preview-fallback/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}
	agreementSvc := services.NewAgreementService(store2)
	agreement, err := agreementSvc.CreateDraft(ctx2, scope2, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Signer Flow",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	signerRole := stores.RecipientRoleSigner
	order := 1
	signer, err := agreementSvc.UpsertRecipientDraft(ctx2, scope2, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
		Role:         &signerRole,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	fieldType := stores.FieldTypeSignature
	required := true
	page := 1
	if _, err = agreementSvc.UpsertFieldDraft(ctx2, scope2, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err = agreementSvc.Send(ctx2, scope2, agreement.ID, services.SendInput{IdempotencyKey: "phase-slice5-preview-fallback"}); err != nil {
		t.Fatalf("Send: %v", err)
	}
	tokenService := stores.NewTokenService(store2)
	issued, err := tokenService.Issue(ctx2, scope2, agreement.ID, signer.ID)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}
	signingSvc := services.NewSigningService(store2, services.WithSigningPreviewFallbackEnabled(true))
	err = Register(adapter.Router(), routes,
		WithSignerTokenValidator(tokenService),
		WithSignerSessionService(signingSvc),
		WithDefaultScope(scope2),
	)
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	adapter.Init()
	forcedApp := adapter.WrappedRouter()

	forcedReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	forcedResp, err := forcedApp.Test(forcedReq, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer forcedResp.Body.Close()
	if forcedResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(forcedResp.Body)
		t.Fatalf("expected status 200, got %d body=%s", forcedResp.StatusCode, body)
	}
	payload, err := io.ReadAll(forcedResp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(payload)
	for _, key := range []string{
		"\"compatibility\":\"limited\"",
		"\"compatibility_tier\":\"limited\"",
		"\"reason\":\"preview_fallback_forced\"",
		"\"compatibility_reason\":\"preview_fallback_forced\"",
	} {
		if !strings.Contains(bodyText, key) {
			t.Fatalf("expected key %s in viewer payload, got %s", key, bodyText)
		}
	}
}

func TestRegisterSignerSessionReturnsTypedUnsupportedForUnsupportedDocument(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 7, 11, 0, 0, 0, time.UTC)
	document, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-unsupported-session",
		Title:                  "Unsupported Session Source",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-unsupported-session/original.pdf",
		SourceOriginalName:     "source.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SourceType:             stores.SourceTypeUpload,
		PDFCompatibilityTier:   string(services.PDFCompatibilityTierUnsupported),
		PDFCompatibilityReason: services.PDFCompatibilityReasonPreviewFallbackDisabled,
		CreatedAt:              now,
		UpdatedAt:              now,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      document.ID,
		Title:           "Unsupported Session Agreement",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	role := stores.RecipientRoleSigner
	order := 1
	signer, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
		Role:         &role,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	required := true
	page := 1
	fieldType := stores.FieldTypeSignature
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &signer.ID,
		Type:        &fieldType,
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err = store.Transition(ctx, scope, agreement.ID, stores.AgreementTransitionInput{
		ToStatus:        stores.AgreementStatusSent,
		ExpectedVersion: agreement.Version,
	}); err != nil {
		t.Fatalf("Transition to sent: %v", err)
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
	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnprocessableEntity {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 422, got %d body=%s", resp.StatusCode, body)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	bodyText := string(body)
	for _, key := range []string{
		`"code":"PDF_UNSUPPORTED"`,
		`"tier":"unsupported"`,
		`"reason":"preview_fallback.disabled"`,
	} {
		if !strings.Contains(bodyText, key) {
			t.Fatalf("expected key %s in response payload, got %s", key, bodyText)
		}
	}
}

func TestRegisterSignerSessionEmitsViewedAuditEventWithIPAndUserAgent(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{objects: map[string][]byte{}}

	docSvc := services.NewDocumentService(
		store,
		services.WithDocumentClock(func() time.Time {
			return time.Date(2026, 2, 2, 9, 0, 0, 0, time.UTC)
		}),
		services.WithDocumentObjectStore(objectStore),
	)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Agreement Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/doc-1/original.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Viewed Audit",
		CreatedByUserID: "user-1",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}
	role := stores.RecipientRoleSigner
	order := 1
	recipient, err := agreementSvc.UpsertRecipientDraft(ctx, scope, agreement.ID, stores.RecipientDraftPatch{
		Email:        new("signer@example.com"),
		Name:         new("Signer"),
		Role:         &role,
		SigningOrder: &order,
	}, 0)
	if err != nil {
		t.Fatalf("UpsertRecipientDraft: %v", err)
	}
	required := true
	page := 1
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeText),
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft: %v", err)
	}
	if _, err = agreementSvc.UpsertFieldDraft(ctx, scope, agreement.ID, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        new(stores.FieldTypeSignature),
		PageNumber:  &page,
		Required:    &required,
	}); err != nil {
		t.Fatalf("UpsertFieldDraft signature: %v", err)
	}
	if _, err = agreementSvc.Send(ctx, scope, agreement.ID, services.SendInput{IdempotencyKey: "session-viewed-audit"}); err != nil {
		t.Fatalf("Send: %v", err)
	}

	tokenService := stores.NewTokenService(store)
	issued, err := tokenService.Issue(ctx, scope, agreement.ID, recipient.ID)
	if err != nil {
		t.Fatalf("Issue: %v", err)
	}

	signingSvc := services.NewSigningService(store, services.WithSigningObjectStore(objectStore))
	app := setupRegisterTestApp(t,
		WithDefaultScope(scope),
		WithSignerTokenValidator(tokenService),
		WithSignerSessionService(signingSvc),
		WithAuditEventStore(store),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+issued.Token, nil)
	req.Header.Set("User-Agent", "signer-viewed-test/1.0")
	req.Header.Set("X-Forwarded-For", "203.0.113.10")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}

	events, err := store.ListForAgreement(ctx, scope, agreement.ID, stores.AuditEventQuery{SortDesc: false})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	var viewed *stores.AuditEventRecord
	for idx := range events {
		if events[idx].EventType == "signer.viewed" {
			viewed = &events[idx]
			break
		}
	}
	if viewed == nil {
		t.Fatalf("expected signer.viewed event, got %+v", events)
	}
	if viewed.ActorType != "signer_token" {
		t.Fatalf("expected actor type signer_token, got %q", viewed.ActorType)
	}
	if viewed.ActorID != recipient.ID {
		t.Fatalf("expected actor id %q, got %q", recipient.ID, viewed.ActorID)
	}
	if strings.TrimSpace(viewed.IPAddress) == "" {
		t.Fatalf("expected signer.viewed event with IP address, got %+v", viewed)
	}
	if strings.TrimSpace(viewed.UserAgent) != "signer-viewed-test/1.0" {
		t.Fatalf("expected signer.viewed event with user-agent, got %q", viewed.UserAgent)
	}
	if !strings.Contains(viewed.MetadataJSON, "\"session_state\"") {
		t.Fatalf("expected session_state in audit metadata, got %s", viewed.MetadataJSON)
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
	err = json.Unmarshal(bootstrapPayloadRaw, &bootstrapPayload)
	if err != nil {
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
	err = json.Unmarshal(bootstrapPayloadRaw, &bootstrapPayload)
	if err != nil {
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
	firstArtifactID := extractJSONFieldString(firstPayload, []string{"signature", "artifact", "id"})
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
	retryArtifactID := extractJSONFieldString(retryPayload, []string{"signature", "artifact", "id"})
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

	for i := range 20 {
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
	if !strings.Contains(bodyText, "\"decline_reason\":\"I decline to sign\"") {
		t.Fatalf("expected decline reason in payload, got %s", bodyText)
	}
}
