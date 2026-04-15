package services

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	gocore "github.com/goliatone/go-services/core"
)

type scopeViolatingProvider struct{}

type staticCredentialKeyProvider struct {
	keyring GoogleCredentialKeyring
	err     error
}

type resolverAwareGoogleProvider struct {
	*DeterministicGoogleProvider
	email string
	err   error
}

type failingSourceIdentityService struct {
	err error
}

type failingAgreementCreator struct {
	err error
}

type recordingLineageProcessingTrigger struct {
	inputs []SourceLineageProcessingInput
}

func (c failingAgreementCreator) CreateDraft(context.Context, stores.Scope, CreateDraftInput) (stores.AgreementRecord, error) {
	return stores.AgreementRecord{}, c.err
}

func (s failingSourceIdentityService) ResolveSourceIdentity(context.Context, stores.Scope, SourceIdentityResolutionInput) (SourceIdentityResolution, error) {
	return SourceIdentityResolution{}, s.err
}

func (r *recordingLineageProcessingTrigger) EnqueueLineageProcessing(_ context.Context, _ stores.Scope, input SourceLineageProcessingInput) error {
	r.inputs = append(r.inputs, input)
	return nil
}

func (p *resolverAwareGoogleProvider) ResolveAccountEmail(_ context.Context, _ string) (string, error) {
	if p == nil {
		return "", nil
	}
	if p.err != nil {
		return "", p.err
	}
	return strings.TrimSpace(p.email), nil
}

func (p staticCredentialKeyProvider) Resolve(context.Context) (GoogleCredentialKeyring, error) {
	if p.err != nil {
		return GoogleCredentialKeyring{}, p.err
	}
	return p.keyring, nil
}

func (scopeViolatingProvider) ExchangeCode(context.Context, string, string, []string) (GoogleOAuthToken, error) {
	return GoogleOAuthToken{
		AccessToken:  "token",
		RefreshToken: "refresh",
		Scopes: []string{
			GoogleScopeDriveReadonly,
			"https://www.googleapis.com/auth/drive",
		},
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour),
	}, nil
}

func (scopeViolatingProvider) RevokeToken(context.Context, string) error {
	return nil
}

func (scopeViolatingProvider) SearchFiles(context.Context, string, string, string, int) (GoogleDriveListResult, error) {
	return GoogleDriveListResult{}, nil
}

func (scopeViolatingProvider) BrowseFiles(context.Context, string, string, string, int) (GoogleDriveListResult, error) {
	return GoogleDriveListResult{}, nil
}

func (scopeViolatingProvider) GetFile(context.Context, string, string) (GoogleDriveFile, error) {
	return GoogleDriveFile{}, nil
}

func (scopeViolatingProvider) ExportFilePDF(context.Context, string, string) (GoogleExportSnapshot, error) {
	return GoogleExportSnapshot{}, nil
}

func (scopeViolatingProvider) DownloadFilePDF(context.Context, string, string) (GoogleExportSnapshot, error) {
	return GoogleExportSnapshot{}, nil
}

func (scopeViolatingProvider) ListComments(context.Context, string, string) ([]GoogleDriveComment, error) {
	return nil, nil
}

func TestMapGoogleProviderErrorMapsTypedFailures(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantCode   string
		wantStatus int
	}{
		{
			name:       "permission denied",
			err:        NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "forbidden", map[string]any{"reason": "insufficientPermissions"}),
			wantCode:   string(ErrorCodeGooglePermissionDenied),
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "rate limited",
			err:        NewGoogleProviderError(GoogleProviderErrorRateLimited, "too many requests", nil),
			wantCode:   string(ErrorCodeGoogleRateLimited),
			wantStatus: http.StatusTooManyRequests,
		},
		{
			name:       "access revoked",
			err:        NewGoogleProviderError(GoogleProviderErrorAccessRevoked, "token revoked", nil),
			wantCode:   string(ErrorCodeGoogleAccessRevoked),
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			mapped := MapGoogleProviderError(tc.err)
			var coded *goerrors.Error
			if !strings.Contains(mapped.Error(), strings.TrimSpace(tc.err.Error())) {
				t.Fatalf("expected mapped error to preserve message, got %v", mapped)
			}
			if !asGoError(mapped, &coded) {
				t.Fatalf("expected mapped goerrors.Error, got %T", mapped)
			}
			if coded.TextCode != tc.wantCode {
				t.Fatalf("expected text code %s, got %s", tc.wantCode, coded.TextCode)
			}
			if coded.Code != tc.wantStatus {
				t.Fatalf("expected status %d, got %d", tc.wantStatus, coded.Code)
			}
		})
	}
}

func TestGoogleIntegrationConnectStatusDisconnect(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	service := NewGoogleIntegrationService(store, provider, nil, nil)

	status, err := service.Status(ctx, scope, "user-1")
	if err != nil {
		t.Fatalf("Status disconnected: %v", err)
	}
	if status.Connected {
		t.Fatalf("expected disconnected status, got %+v", status)
	}

	connected, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "user-1",
		AuthCode: "code-1",
	})
	if err != nil {
		t.Fatalf("Connect: %v", err)
	}
	if !connected.Connected {
		t.Fatalf("expected connected status, got %+v", connected)
	}
	if !connected.LeastPrivilege {
		t.Fatalf("expected least privilege scopes, got %+v", connected)
	}

	credential, err := store.GetIntegrationCredential(ctx, scope, GoogleProviderName, "user-1")
	if err != nil {
		t.Fatalf("GetIntegrationCredential: %v", err)
	}
	if credential.EncryptedAccessToken == "access-code-1" {
		t.Fatalf("expected encrypted token, got plaintext %q", credential.EncryptedAccessToken)
	}
	if len(credential.Scopes) != len(DefaultGoogleOAuthScopes) {
		t.Fatalf("expected persisted scopes, got %+v", credential.Scopes)
	}

	status, err = service.Status(ctx, scope, "user-1")
	if err != nil {
		t.Fatalf("Status connected: %v", err)
	}
	if !status.Connected || status.ExpiresAt == nil {
		t.Fatalf("expected status scopes/expiry details, got %+v", status)
	}

	disconnectErr := service.Disconnect(ctx, scope, "user-1")
	if disconnectErr != nil {
		t.Fatalf("Disconnect: %v", disconnectErr)
	}
	status, err = service.Status(ctx, scope, "user-1")
	if err != nil {
		t.Fatalf("Status after disconnect: %v", err)
	}
	if status.Connected {
		t.Fatalf("expected disconnected status after disconnect, got %+v", status)
	}
}

func TestGoogleIntegrationImportDocumentEnqueuesLineageProcessing(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-google-lineage", OrgID: "org-google-lineage"}
	store := stores.NewInMemoryStore()
	trigger := &recordingLineageProcessingTrigger{}
	service := NewGoogleIntegrationService(
		store,
		NewDeterministicGoogleProvider(),
		NewDocumentService(store),
		NewAgreementService(store),
		WithGoogleLineageStore(store),
		WithGoogleLineageProcessingTrigger(trigger),
	)
	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "google-lineage-trigger",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}
	run, created, err := store.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "rev-lineage",
		DedupeKey:         "google-lineage-import-1",
		DocumentTitle:     "Imported Lineage Contract",
		AgreementTitle:    "Imported Lineage Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-lineage",
		RequestedAt:       time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun: %v", err)
	}
	if !created {
		t.Fatalf("expected queued import run to be created")
	}

	result, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		ImportRunID:       run.ID,
		UserID:            "ops-user",
		AccountID:         "",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "rev-lineage",
		DocumentTitle:     "Imported Lineage Contract",
		AgreementTitle:    "Imported Lineage Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-lineage",
		IdempotencyKey:    "google-lineage-import-1",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}
	if len(trigger.inputs) != 1 {
		t.Fatalf("expected one lineage processing trigger call, got %+v", trigger.inputs)
	}
	enqueued := trigger.inputs[0]
	if enqueued.SourceDocumentID != result.SourceDocumentID || enqueued.SourceRevisionID != result.SourceRevisionID || enqueued.ArtifactID != result.SourceArtifactID {
		t.Fatalf("expected enqueued lineage ids to match import result, enqueued=%+v result=%+v", enqueued, result)
	}
	if enqueued.ImportRunID != run.ID {
		t.Fatalf("expected import run id %q forwarded to lineage trigger, got %+v", run.ID, enqueued)
	}
	if enqueued.Metadata.ExternalFileID != "google-file-1" || enqueued.Metadata.TitleHint != "Imported Lineage Contract" {
		t.Fatalf("expected import metadata forwarded to lineage trigger, got %+v", enqueued.Metadata)
	}
}

func TestGoogleServicesIntegrationEnqueueLineageProcessingForwardsImportRunID(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-google-services-lineage", OrgID: "org-google-services-lineage"}
	trigger := &recordingLineageProcessingTrigger{}
	service := GoogleServicesIntegrationService{
		lineageProcessing: trigger,
		now:               func() time.Time { return time.Date(2026, time.March, 20, 12, 0, 0, 0, time.UTC) },
	}
	runID := "gir_services_001"
	result := GoogleImportResult{
		SourceDocumentID: "src-doc-1",
		SourceRevisionID: "src-rev-1",
		SourceArtifactID: "src-art-1",
		Document: stores.DocumentRecord{
			PageCount: 3,
		},
	}
	service.enqueueLineageProcessing(ctx, scope, result, GoogleImportInput{
		ImportRunID:       runID,
		UserID:            "ops-user",
		AccountID:         "acct-1",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "rev-lineage",
		DocumentTitle:     "Imported Services Lineage Contract",
		AgreementTitle:    "Imported Services Lineage Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-services-lineage",
		IdempotencyKey:    "google-services-lineage-import-1",
	}, GoogleExportSnapshot{
		File: GoogleDriveFile{
			ID:           "google-file-1",
			Name:         "Imported Services Lineage Contract",
			WebViewURL:   "https://docs.google.com/document/d/google-file-1/edit",
			DriveID:      "drive-1",
			ModifiedTime: time.Date(2026, time.March, 20, 11, 0, 0, 0, time.UTC),
			OwnerEmail:   "owner@example.com",
			ParentID:     "folder-1",
		},
	}, GoogleDriveMimeTypeDoc, GoogleIngestionModeExportPDF)
	if len(trigger.inputs) != 1 {
		t.Fatalf("expected one lineage processing trigger call, got %+v", trigger.inputs)
	}
	enqueued := trigger.inputs[0]
	if enqueued.ImportRunID != runID {
		t.Fatalf("expected import run id %q forwarded to lineage trigger, got %+v", runID, enqueued)
	}
	if enqueued.SourceDocumentID != result.SourceDocumentID || enqueued.SourceRevisionID != result.SourceRevisionID || enqueued.ArtifactID != result.SourceArtifactID {
		t.Fatalf("expected enqueued lineage ids to match import result, enqueued=%+v result=%+v", enqueued, result)
	}
}

func TestGoogleIntegrationImportDocumentRejectsInFlightIdempotentReplay(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-google-inflight", OrgID: "org-google-inflight"}
	store := stores.NewInMemoryStore()
	service := NewGoogleIntegrationService(
		store,
		NewDeterministicGoogleProvider(),
		NewDocumentService(store),
		NewAgreementService(store),
	)
	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "google-inflight-import",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}
	run, created, err := store.BeginGoogleImportRun(ctx, scope, stores.GoogleImportRunInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "rev-lineage",
		DedupeKey:         "google-lineage-import-inflight",
		DocumentTitle:     "Imported Lineage Contract",
		AgreementTitle:    "Imported Lineage Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-inflight",
		RequestedAt:       time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("BeginGoogleImportRun: %v", err)
	}
	if !created {
		t.Fatalf("expected queued import run to be created")
	}

	_, err = service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "ops-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "rev-lineage",
		DocumentTitle:     "Imported Lineage Contract",
		AgreementTitle:    "Imported Lineage Agreement",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-inflight",
		IdempotencyKey:    "google-lineage-import-inflight",
	})
	if err == nil {
		t.Fatal("expected in-flight idempotency conflict")
	}
	var inProgress *GoogleImportInProgressError
	if !errors.As(err, &inProgress) {
		t.Fatalf("expected GoogleImportInProgressError, got %T", err)
	}
	if inProgress.RunID != run.ID || inProgress.Status != stores.GoogleImportRunStatusQueued {
		t.Fatalf("expected queued run metadata, got %+v", inProgress)
	}
}

func TestGoogleScopedUserIDRoundTrip(t *testing.T) {
	scoped := ComposeGoogleScopedUserID("ops-user", "work@example.com")
	if !strings.Contains(scoped, "ops-user") {
		t.Fatalf("expected scoped id to include base user id, got %q", scoped)
	}
	userID, accountID := ParseGoogleScopedUserID(scoped)
	if userID != "ops-user" {
		t.Fatalf("expected parsed user id ops-user, got %q", userID)
	}
	if accountID != "work@example.com" {
		t.Fatalf("expected parsed account id work@example.com, got %q", accountID)
	}

	baseOnly := ComposeGoogleScopedUserID("ops-user", "")
	if baseOnly != "ops-user" {
		t.Fatalf("expected base id passthrough, got %q", baseOnly)
	}
	parsedUserID, parsedAccountID := ParseGoogleScopedUserID(baseOnly)
	if parsedUserID != "ops-user" || parsedAccountID != "" {
		t.Fatalf("expected base parse without account, got user=%q account=%q", parsedUserID, parsedAccountID)
	}
}

func TestGoogleIntegrationSupportsMultipleAccountsPerUser(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	service := NewGoogleIntegrationService(store, provider, nil, nil)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:    "user-1",
		AccountID: "work@example.com",
		AuthCode:  "code-work",
	}); err != nil {
		t.Fatalf("Connect work account: %v", err)
	}
	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:    "user-1",
		AccountID: "personal@example.com",
		AuthCode:  "code-personal",
	}); err != nil {
		t.Fatalf("Connect personal account: %v", err)
	}

	workScoped := ComposeGoogleScopedUserID("user-1", "work@example.com")
	personalScoped := ComposeGoogleScopedUserID("user-1", "personal@example.com")

	workCredential, err := store.GetIntegrationCredential(ctx, scope, GoogleProviderName, workScoped)
	if err != nil {
		t.Fatalf("GetIntegrationCredential work: %v", err)
	}
	personalCredential, err := store.GetIntegrationCredential(ctx, scope, GoogleProviderName, personalScoped)
	if err != nil {
		t.Fatalf("GetIntegrationCredential personal: %v", err)
	}
	if workCredential.ID == personalCredential.ID {
		t.Fatalf("expected separate credentials per account, got shared id %q", workCredential.ID)
	}

	disconnectErr := service.Disconnect(ctx, scope, personalScoped)
	if disconnectErr != nil {
		t.Fatalf("Disconnect personal account: %v", disconnectErr)
	}
	personalStatus, err := service.Status(ctx, scope, personalScoped)
	if err != nil {
		t.Fatalf("Status personal after disconnect: %v", err)
	}
	if personalStatus.Connected {
		t.Fatalf("expected personal account disconnected, got %+v", personalStatus)
	}
	workStatus, err := service.Status(ctx, scope, workScoped)
	if err != nil {
		t.Fatalf("Status work after personal disconnect: %v", err)
	}
	if !workStatus.Connected {
		t.Fatalf("expected work account to remain connected, got %+v", workStatus)
	}
}

func TestGoogleIntegrationConnectRejectsScopeViolations(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	service := NewGoogleIntegrationService(store, scopeViolatingProvider{}, nil, nil)

	_, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "user-1",
		AuthCode: "code-1",
	})
	if err == nil {
		t.Fatal("expected least-privilege scope violation")
	}
	var coded *goerrors.Error
	if !asGoError(err, &coded) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if coded.TextCode != string(ErrorCodeGoogleScopeViolation) {
		t.Fatalf("expected %s, got %s", ErrorCodeGoogleScopeViolation, coded.TextCode)
	}
}

func TestValidateLeastPrivilegeScopesAllowsLegacyDriveFile(t *testing.T) {
	err := validateLeastPrivilegeScopes(
		[]string{
			GoogleScopeDriveReadonly,
			GoogleScopeDriveFile,
		},
		DefaultGoogleOAuthScopes,
	)
	if err != nil {
		t.Fatalf("expected legacy drive.file scope to be accepted, got %v", err)
	}
}

func TestValidateLeastPrivilegeScopesAllowsOpenID(t *testing.T) {
	err := validateLeastPrivilegeScopes(
		[]string{
			GoogleScopeDriveReadonly,
			GoogleScopeOpenID,
			GoogleScopeUserinfoEmail,
		},
		DefaultGoogleOAuthScopes,
	)
	if err != nil {
		t.Fatalf("expected openid scope to be accepted, got %v", err)
	}
}

func TestGoogleIntegrationImportDocumentPersistsGoogleSourceMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(store, provider, documents, agreements)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:          "import-user",
		GoogleFileID:    "google-file-1",
		DocumentTitle:   "Imported NDA",
		AgreementTitle:  "Imported NDA Agreement",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}
	if imported.Document.SourceType != stores.SourceTypeGoogleDrive {
		t.Fatalf("expected document source_type google_drive, got %q", imported.Document.SourceType)
	}
	if imported.Document.SourceGoogleFileID != "google-file-1" {
		t.Fatalf("expected google file id on document, got %q", imported.Document.SourceGoogleFileID)
	}
	if imported.Agreement.SourceType != stores.SourceTypeGoogleDrive {
		t.Fatalf("expected agreement source_type google_drive, got %q", imported.Agreement.SourceType)
	}
	if imported.Agreement.SourceGoogleDocURL == "" {
		t.Fatalf("expected source google doc url on agreement, got %+v", imported.Agreement)
	}
	if imported.Agreement.SourceExportedAt == nil {
		t.Fatalf("expected source_exported_at on agreement, got %+v", imported.Agreement)
	}
	if imported.SourceMimeType != GoogleDriveMimeTypeDoc {
		t.Fatalf("expected source mime %q, got %q", GoogleDriveMimeTypeDoc, imported.SourceMimeType)
	}
	if imported.IngestionMode != GoogleIngestionModeExportPDF {
		t.Fatalf("expected ingestion mode %q, got %q", GoogleIngestionModeExportPDF, imported.IngestionMode)
	}
}

func TestGoogleIntegrationImportDocumentDrivePDFDirect(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(store, provider, documents, agreements)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:          "import-user",
		GoogleFileID:    "google-pdf-1",
		DocumentTitle:   "Imported PDF",
		AgreementTitle:  "Imported PDF Agreement",
		CreatedByUserID: "ops-user",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}
	if imported.SourceMimeType != GoogleDriveMimeTypePDF {
		t.Fatalf("expected source mime %q, got %q", GoogleDriveMimeTypePDF, imported.SourceMimeType)
	}
	if imported.IngestionMode != GoogleIngestionModeDrivePDFDirect {
		t.Fatalf("expected ingestion mode %q, got %q", GoogleIngestionModeDrivePDFDirect, imported.IngestionMode)
	}
	if imported.Document.SourceIngestionMode != GoogleIngestionModeDrivePDFDirect {
		t.Fatalf("expected document ingestion mode persisted, got %q", imported.Document.SourceIngestionMode)
	}
}

func TestGoogleIntegrationImportDocumentPersistsLineageLinks(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		AgreementTitle:    "Imported NDA Agreement",
		CreatedByUserID:   "ops-user",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}
	if imported.SourceDocumentID == "" || imported.SourceRevisionID == "" || imported.SourceArtifactID == "" {
		t.Fatalf("expected lineage ids, got %+v", imported)
	}
	if imported.Document.SourceDocumentID != imported.SourceDocumentID {
		t.Fatalf("expected document source_document_id %q, got %q", imported.SourceDocumentID, imported.Document.SourceDocumentID)
	}
	if imported.Document.SourceRevisionID != imported.SourceRevisionID {
		t.Fatalf("expected document source_revision_id %q, got %q", imported.SourceRevisionID, imported.Document.SourceRevisionID)
	}
	if imported.Document.SourceArtifactID != imported.SourceArtifactID {
		t.Fatalf("expected document source_artifact_id %q, got %q", imported.SourceArtifactID, imported.Document.SourceArtifactID)
	}
	if imported.Agreement.SourceRevisionID != imported.SourceRevisionID {
		t.Fatalf("expected agreement source_revision_id %q, got %q", imported.SourceRevisionID, imported.Agreement.SourceRevisionID)
	}
	if imported.LineageStatus != LineageImportStatusLinked {
		t.Fatalf("expected linked lineage status, got %q", imported.LineageStatus)
	}
}

func TestGoogleIntegrationImportDocumentPersistsCorrelationAndIdempotencyMetadataOnRevision(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	imported, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		CreatedByUserID:   "ops-user",
		CorrelationID:     "corr-google-import-1",
		IdempotencyKey:    "dedupe-google-import-1",
	})
	if err != nil {
		t.Fatalf("ImportDocument: %v", err)
	}

	revision, err := store.GetSourceRevision(ctx, scope, imported.SourceRevisionID)
	if err != nil {
		t.Fatalf("GetSourceRevision: %v", err)
	}
	if !strings.Contains(revision.MetadataJSON, `"correlation_id":"corr-google-import-1"`) {
		t.Fatalf("expected correlation id in revision metadata, got %s", revision.MetadataJSON)
	}
	if !strings.Contains(revision.MetadataJSON, `"idempotency_key":"dedupe-google-import-1"`) {
		t.Fatalf("expected idempotency key in revision metadata, got %s", revision.MetadataJSON)
	}
	if !strings.Contains(revision.MetadataJSON, `"revision_content_sha256":"`) {
		t.Fatalf("expected revision content hash in revision metadata, got %s", revision.MetadataJSON)
	}
}

func TestGoogleIntegrationImportDocumentReusesRevisionWhenVersionUnchanged(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	first, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
	})
	if err != nil {
		t.Fatalf("ImportDocument first: %v", err)
	}
	second, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
	})
	if err != nil {
		t.Fatalf("ImportDocument second: %v", err)
	}
	if first.SourceDocumentID != second.SourceDocumentID {
		t.Fatalf("expected same source document, got %q vs %q", first.SourceDocumentID, second.SourceDocumentID)
	}
	if first.SourceRevisionID != second.SourceRevisionID {
		t.Fatalf("expected same source revision, got %q vs %q", first.SourceRevisionID, second.SourceRevisionID)
	}
	if first.SourceArtifactID != second.SourceArtifactID {
		t.Fatalf("expected same source artifact, got %q vs %q", first.SourceArtifactID, second.SourceArtifactID)
	}
}

func TestGoogleIntegrationImportDocumentCreatesNewRevisionWhenVersionChanges(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	first, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
	})
	if err != nil {
		t.Fatalf("ImportDocument first: %v", err)
	}

	changedAt := time.Date(2026, 2, 11, 10, 0, 0, 0, time.UTC)
	provider.files["google-file-1"] = GoogleDriveFile{
		ID:           "google-file-1",
		Name:         "Imported NDA",
		MimeType:     GoogleDriveMimeTypeDoc,
		WebViewURL:   "https://docs.google.com/document/d/google-file-1/edit",
		OwnerEmail:   "owner@example.com",
		ParentID:     "root",
		ModifiedTime: changedAt,
	}
	provider.pdfByID["google-file-1"] = GenerateDeterministicPDF(3)

	second, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v2",
		DocumentTitle:     "Imported NDA",
	})
	if err != nil {
		t.Fatalf("ImportDocument second: %v", err)
	}
	if first.SourceDocumentID != second.SourceDocumentID {
		t.Fatalf("expected same source document, got %q vs %q", first.SourceDocumentID, second.SourceDocumentID)
	}
	if first.SourceRevisionID == second.SourceRevisionID {
		t.Fatalf("expected changed import to create new revision, got %q", second.SourceRevisionID)
	}
}

func TestGoogleIntegrationImportDocumentFailsBeforeDocumentOrAgreementWriteWhenLineageResolutionFails(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
		WithGoogleSourceIdentityService(failingSourceIdentityService{err: errors.New("lineage resolution failed")}),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	if _, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		AgreementTitle:    "Imported NDA Agreement",
		CreatedByUserID:   "ops-user",
	}); err == nil {
		t.Fatalf("expected lineage resolution failure")
	}
	docs, err := store.List(ctx, scope, stores.DocumentQuery{})
	if err != nil {
		t.Fatalf("List documents: %v", err)
	}
	if len(docs) != 0 {
		t.Fatalf("expected zero documents after lineage resolution failure, got %d", len(docs))
	}
	agreementsList, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("ListAgreements: %v", err)
	}
	if len(agreementsList) != 0 {
		t.Fatalf("expected zero agreements after lineage resolution failure, got %d", len(agreementsList))
	}
}

func TestGoogleIntegrationImportDocumentMarksRunFailedWithoutPermissionDeniedWhenLineageResolutionFails(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
		WithGoogleSourceIdentityService(failingSourceIdentityService{err: errors.New("lineage resolution failed")}),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	if _, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		AgreementTitle:    "Imported NDA Agreement",
		CreatedByUserID:   "ops-user",
		IdempotencyKey:    "lineage-resolution-failure-run",
	}); err == nil {
		t.Fatalf("expected lineage resolution failure")
	}

	runs, _, err := store.ListGoogleImportRuns(ctx, scope, stores.GoogleImportRunQuery{UserID: "import-user", Limit: 10})
	if err != nil {
		t.Fatalf("ListGoogleImportRuns: %v", err)
	}
	if len(runs) != 1 {
		t.Fatalf("expected one import run, got %+v", runs)
	}
	run := runs[0]
	if run.Status != stores.GoogleImportRunStatusFailed {
		t.Fatalf("expected failed import run, got %+v", run)
	}
	if run.ErrorCode != googleImportRunFailureCode {
		t.Fatalf("expected generic import failure code %q, got %+v", googleImportRunFailureCode, run)
	}
	if run.ErrorCode == string(ErrorCodeGooglePermissionDenied) {
		t.Fatalf("expected lineage resolution failure to avoid GOOGLE_PERMISSION_DENIED, got %+v", run)
	}
	if !strings.Contains(run.ErrorMessage, "lineage resolution failed") {
		t.Fatalf("expected failure message to preserve lineage error, got %+v", run)
	}
}

func TestGoogleIntegrationImportDocumentRollsBackLineageAndDocumentWhenAgreementPersistFails(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		failingAgreementCreator{err: errors.New("agreement persist failed")},
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	if _, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		AgreementTitle:    "Imported NDA Agreement",
		CreatedByUserID:   "ops-user",
		IdempotencyKey:    "sync-failure-retry-key",
	}); err == nil {
		t.Fatalf("expected agreement persistence failure")
	}

	docs, err := store.List(ctx, scope, stores.DocumentQuery{})
	if err != nil {
		t.Fatalf("List documents: %v", err)
	}
	if len(docs) != 0 {
		t.Fatalf("expected zero documents after rollback, got %d", len(docs))
	}
	agreementsList, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("ListAgreements: %v", err)
	}
	if len(agreementsList) != 0 {
		t.Fatalf("expected zero agreements after rollback, got %d", len(agreementsList))
	}
	sourceDocuments, err := store.ListSourceDocuments(ctx, scope, stores.SourceDocumentQuery{})
	if err != nil {
		t.Fatalf("ListSourceDocuments: %v", err)
	}
	if len(sourceDocuments) != 0 {
		t.Fatalf("expected zero source documents after rollback, got %d", len(sourceDocuments))
	}
}

func TestGoogleImportRunFailureInputPreservesTypedDomainCodes(t *testing.T) {
	completedAt := time.Date(2026, 3, 19, 9, 30, 0, 0, time.UTC)
	input := googleImportRunFailureInput(
		goerrors.New("unsupported google file type", goerrors.CategoryValidation).
			WithCode(http.StatusUnprocessableEntity).
			WithTextCode(string(ErrorCodeGoogleUnsupportedType)).
			WithMetadata(map[string]any{"file_id": "shared-sheet-1"}),
		completedAt,
	)

	if input.ErrorCode != string(ErrorCodeGoogleUnsupportedType) {
		t.Fatalf("expected typed failure code %q, got %+v", ErrorCodeGoogleUnsupportedType, input)
	}
	if input.ErrorMessage != "unsupported google file type" {
		t.Fatalf("expected typed failure message to be preserved, got %+v", input)
	}
	if strings.TrimSpace(input.ErrorDetailsJSON) == "" {
		t.Fatalf("expected typed failure details json, got %+v", input)
	}

	var details map[string]any
	if err := json.Unmarshal([]byte(input.ErrorDetailsJSON), &details); err != nil {
		t.Fatalf("unmarshal failure details: %v", err)
	}
	if got := strings.TrimSpace(anyString(details["text_code"])); got != string(ErrorCodeGoogleUnsupportedType) {
		t.Fatalf("expected details text_code %q, got %+v", ErrorCodeGoogleUnsupportedType, details)
	}
	if got := strings.TrimSpace(anyString(details["category"])); got != string(goerrors.CategoryValidation) {
		t.Fatalf("expected details category %q, got %+v", goerrors.CategoryValidation, details)
	}
}

func TestGoogleIntegrationImportDocumentReplaysCompletedRunForSameIdempotencyKey(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleLineageStore(store),
	)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:    "import-user",
		AccountID: "work@example.com",
		AuthCode:  "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	first, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		AccountID:         "work@example.com",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA",
		AgreementTitle:    "Imported NDA Agreement",
		CreatedByUserID:   "ops-user",
		IdempotencyKey:    "sync-import-replay-key",
	})
	if err != nil {
		t.Fatalf("ImportDocument first: %v", err)
	}

	second, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:            "import-user",
		AccountID:         "work@example.com",
		GoogleFileID:      "google-file-1",
		SourceVersionHint: "v1",
		DocumentTitle:     "Imported NDA Retry",
		AgreementTitle:    "Imported NDA Agreement Retry",
		CreatedByUserID:   "ops-user",
		IdempotencyKey:    "sync-import-replay-key",
	})
	if err != nil {
		t.Fatalf("ImportDocument second: %v", err)
	}
	if first.Document.ID != second.Document.ID || first.Agreement.ID != second.Agreement.ID {
		t.Fatalf("expected replay to reuse imported entities, got first=%+v second=%+v", first, second)
	}

	docs, err := store.List(ctx, scope, stores.DocumentQuery{})
	if err != nil {
		t.Fatalf("List documents: %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("expected one persisted document after replay, got %d", len(docs))
	}
	agreementsList, err := store.ListAgreements(ctx, scope, stores.AgreementQuery{})
	if err != nil {
		t.Fatalf("List agreements: %v", err)
	}
	if len(agreementsList) != 1 {
		t.Fatalf("expected one persisted agreement after replay, got %d", len(agreementsList))
	}
}

func TestGoogleIntegrationImportDocumentRejectsUnsupportedMIME(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	provider.files["google-sheet-1"] = GoogleDriveFile{
		ID:           "google-sheet-1",
		Name:         "Budget Sheet",
		MimeType:     "application/vnd.google-apps.spreadsheet",
		WebViewURL:   "https://docs.google.com/spreadsheets/d/google-sheet-1/edit",
		OwnerEmail:   "owner@example.com",
		ParentID:     "root",
		ModifiedTime: time.Date(2026, 2, 10, 11, 0, 0, 0, time.UTC),
	}
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)
	service := NewGoogleIntegrationService(store, provider, documents, agreements)

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "import-user",
		AuthCode: "import-code",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	_, err := service.ImportDocument(ctx, scope, GoogleImportInput{
		UserID:       "import-user",
		GoogleFileID: "google-sheet-1",
	})
	if err == nil {
		t.Fatal("expected unsupported mime error")
	}
	var coded *goerrors.Error
	if !asGoError(err, &coded) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if coded.TextCode != string(ErrorCodeGoogleUnsupportedType) {
		t.Fatalf("expected code %s, got %s", ErrorCodeGoogleUnsupportedType, coded.TextCode)
	}
	if coded.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected status 422, got %d", coded.Code)
	}
}

func TestKeyringCredentialCipherEncryptDecryptAndLegacyFallback(t *testing.T) {
	ctx := context.Background()
	legacyCipher := NewAESGCMCredentialCipher([]byte("legacy-google-key"))
	legacyEncrypted, err := legacyCipher.Encrypt(ctx, "access-token-1")
	if err != nil {
		t.Fatalf("legacy Encrypt: %v", err)
	}

	keyring := NewKeyringCredentialCipher("v2", map[string][]byte{
		"v1": []byte("legacy-google-key"),
		"v2": []byte("rotated-google-key"),
	})
	if keyring.PrimaryKeyID() != "v2" {
		t.Fatalf("expected primary key id v2, got %q", keyring.PrimaryKeyID())
	}

	legacyPlain, err := keyring.Decrypt(ctx, legacyEncrypted)
	if err != nil {
		t.Fatalf("Decrypt legacy ciphertext: %v", err)
	}
	if legacyPlain != "access-token-1" {
		t.Fatalf("expected legacy plaintext access-token-1, got %q", legacyPlain)
	}

	rotatedEncrypted, err := keyring.Encrypt(ctx, "access-token-2")
	if err != nil {
		t.Fatalf("Encrypt rotated ciphertext: %v", err)
	}
	if !strings.HasPrefix(rotatedEncrypted, "v2:") {
		t.Fatalf("expected rotated ciphertext with v2 prefix, got %q", rotatedEncrypted)
	}
	if keyring.CiphertextKeyID(rotatedEncrypted) != "v2" {
		t.Fatalf("expected ciphertext key id v2, got %q", keyring.CiphertextKeyID(rotatedEncrypted))
	}

	rotatedPlain, err := keyring.Decrypt(ctx, rotatedEncrypted)
	if err != nil {
		t.Fatalf("Decrypt rotated ciphertext: %v", err)
	}
	if rotatedPlain != "access-token-2" {
		t.Fatalf("expected rotated plaintext access-token-2, got %q", rotatedPlain)
	}
}

func TestGoogleIntegrationRotateCredentialEncryptionRewrapsTokensToActiveKey(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store)

	legacy := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleCipher(NewAESGCMCredentialCipher([]byte("legacy-google-key"))),
	)
	if _, err := legacy.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "legacy-code-1",
	}); err != nil {
		t.Fatalf("legacy Connect: %v", err)
	}

	rotated := NewGoogleIntegrationService(
		store,
		provider,
		documents,
		agreements,
		WithGoogleCipher(NewKeyringCredentialCipher("v2", map[string][]byte{
			"v1": []byte("legacy-google-key"),
			"v2": []byte("rotated-google-key"),
		})),
	)

	status, err := rotated.RotateCredentialEncryption(ctx, scope, "ops-user")
	if err != nil {
		t.Fatalf("RotateCredentialEncryption: %v", err)
	}
	if !status.Connected {
		t.Fatalf("expected connected status after rotation, got %+v", status)
	}

	credential, err := store.GetIntegrationCredential(ctx, scope, GoogleProviderName, "ops-user")
	if err != nil {
		t.Fatalf("GetIntegrationCredential: %v", err)
	}
	if !strings.HasPrefix(credential.EncryptedAccessToken, "v2:") {
		t.Fatalf("expected encrypted access token v2 prefix, got %q", credential.EncryptedAccessToken)
	}
	if !strings.HasPrefix(credential.EncryptedRefreshToken, "v2:") {
		t.Fatalf("expected encrypted refresh token v2 prefix, got %q", credential.EncryptedRefreshToken)
	}

	search, err := rotated.SearchFiles(ctx, scope, GoogleDriveQueryInput{
		UserID: "ops-user",
		Query:  "nda",
	})
	if err != nil {
		t.Fatalf("SearchFiles after rotation: %v", err)
	}
	if len(search.Files) == 0 {
		t.Fatalf("expected search results after key rotation, got %+v", search)
	}
}

func TestEnvGoogleCredentialKeyProviderResolve(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Google.CredentialActiveKeyID = "v2"
	cfg.Google.CredentialActiveKey = "active-key-material"
	cfg.Google.CredentialKeysJSON = `{"v1":"legacy-key-material"}`
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	provider := NewEnvGoogleCredentialKeyProvider()
	keyring, err := provider.Resolve(context.Background())
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if keyring.ActiveKeyID != "v2" {
		t.Fatalf("expected active key id v2, got %q", keyring.ActiveKeyID)
	}
	if string(keyring.Keys["v1"]) != "legacy-key-material" {
		t.Fatalf("expected legacy key material, got %+v", keyring.Keys)
	}
	if string(keyring.Keys["v2"]) != "active-key-material" {
		t.Fatalf("expected active key material, got %+v", keyring.Keys)
	}
}

func TestNewGoogleCredentialCipherFromProvider(t *testing.T) {
	cipher, err := NewGoogleCredentialCipher(context.Background(), staticCredentialKeyProvider{
		keyring: GoogleCredentialKeyring{
			ActiveKeyID: "v2",
			Keys: map[string][]byte{
				"v1": []byte("legacy-google-key"),
				"v2": []byte("rotated-google-key"),
			},
		},
	})
	if err != nil {
		t.Fatalf("NewGoogleCredentialCipher: %v", err)
	}
	encrypted, err := cipher.Encrypt(context.Background(), "token-abc")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if !strings.HasPrefix(encrypted, "v2:") {
		t.Fatalf("expected encrypted token with v2 prefix, got %q", encrypted)
	}
}

func TestNewGoogleCredentialCipherFailsWhenActiveKeyMissing(t *testing.T) {
	_, err := NewGoogleCredentialCipher(context.Background(), staticCredentialKeyProvider{
		keyring: GoogleCredentialKeyring{
			ActiveKeyID: "v2",
			Keys: map[string][]byte{
				"v1": []byte("legacy-google-key"),
			},
		},
	})
	if err == nil {
		t.Fatal("expected missing active key error")
	}
}

func TestGoogleHTTPProviderContractAgainstEmulator(t *testing.T) {
	ctx := context.Background()
	emulator := newGoogleProviderEmulatorServer()
	defer emulator.Close()

	provider, err := NewGoogleHTTPProvider(GoogleHTTPProviderConfig{
		ClientID:         "client-id",
		ClientSecret:     "client-secret",
		TokenEndpoint:    emulator.URL + "/oauth/token",
		RevokeEndpoint:   emulator.URL + "/oauth/revoke",
		DriveBaseURL:     emulator.URL + "/drive/v3",
		UserInfoEndpoint: emulator.URL + "/oauth/userinfo",
		HealthEndpoint:   emulator.URL + "/health",
		HTTPClient:       emulator.Client(),
	})
	if err != nil {
		t.Fatalf("NewGoogleHTTPProvider: %v", err)
	}

	healthErr := provider.HealthCheck(ctx)
	if healthErr != nil {
		t.Fatalf("HealthCheck: %v", healthErr)
	}

	token, err := provider.ExchangeCode(ctx, "oauth-code-1", "https://app.example.test/callback", DefaultGoogleOAuthScopes)
	if err != nil {
		t.Fatalf("ExchangeCode: %v", err)
	}
	if token.AccessToken == "" || token.RefreshToken == "" {
		t.Fatalf("expected non-empty oauth tokens, got %+v", token)
	}
	if token.AccountEmail != "operator@example.com" {
		t.Fatalf("expected account email from userinfo, got %q", token.AccountEmail)
	}

	resolvedEmail, err := provider.ResolveAccountEmail(ctx, token.AccessToken)
	if err != nil {
		t.Fatalf("ResolveAccountEmail: %v", err)
	}
	if resolvedEmail != "operator@example.com" {
		t.Fatalf("expected resolved account email operator@example.com, got %q", resolvedEmail)
	}

	search, err := provider.SearchFiles(ctx, token.AccessToken, "nda", "", 25)
	if err != nil {
		t.Fatalf("SearchFiles: %v", err)
	}
	if len(search.Files) != 1 || search.Files[0].ID != "google-file-1" {
		t.Fatalf("expected one NDA file, got %+v", search.Files)
	}

	browse, err := provider.BrowseFiles(ctx, token.AccessToken, "root", "", 25)
	if err != nil {
		t.Fatalf("BrowseFiles: %v", err)
	}
	if len(browse.Files) == 0 {
		t.Fatalf("expected browse results, got %+v", browse)
	}

	exported, err := provider.ExportFilePDF(ctx, token.AccessToken, "google-file-1")
	if err != nil {
		t.Fatalf("ExportFilePDF: %v", err)
	}
	if exported.File.ID != "google-file-1" || len(exported.PDF) == 0 {
		t.Fatalf("expected exported google file payload, got %+v", exported)
	}

	if err := provider.RevokeToken(ctx, token.AccessToken); err != nil {
		t.Fatalf("RevokeToken: %v", err)
	}
}

func TestGoogleServicesIntegrationResolveAccountEmailUsesResolverWhenAvailable(t *testing.T) {
	service := GoogleServicesIntegrationService{
		provider: &resolverAwareGoogleProvider{
			DeterministicGoogleProvider: NewDeterministicGoogleProvider(),
			email:                       "work@example.com",
		},
	}
	email := service.resolveAccountEmail(context.Background(), "access-token-1")
	if email != "work@example.com" {
		t.Fatalf("expected resolved account email work@example.com, got %q", email)
	}
}

func TestGoogleServicesIntegrationResolveAccountEmailIgnoresMissingResolver(t *testing.T) {
	service := GoogleServicesIntegrationService{
		provider: NewDeterministicGoogleProvider(),
	}
	email := service.resolveAccountEmail(context.Background(), "access-token-1")
	if email != "" {
		t.Fatalf("expected empty account email when provider resolver is unavailable, got %q", email)
	}
}

func TestGoogleIntegrationRealAdapterRevokedAccessRecovery(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	emulator := newGoogleProviderEmulatorServer()
	defer emulator.Close()

	provider, err := NewGoogleHTTPProvider(GoogleHTTPProviderConfig{
		ClientID:         "client-id",
		ClientSecret:     "client-secret",
		TokenEndpoint:    emulator.URL + "/oauth/token",
		RevokeEndpoint:   emulator.URL + "/oauth/revoke",
		DriveBaseURL:     emulator.URL + "/drive/v3",
		UserInfoEndpoint: emulator.URL + "/oauth/userinfo",
		HealthEndpoint:   emulator.URL + "/health",
		HTTPClient:       emulator.Client(),
	})
	if err != nil {
		t.Fatalf("NewGoogleHTTPProvider: %v", err)
	}

	service := NewGoogleIntegrationService(
		store,
		provider,
		NewDocumentService(store),
		NewAgreementService(store),
		WithGoogleProviderMode(GoogleProviderModeReal),
	)
	_, connectErr := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "oauth-recovery-1",
	})
	if connectErr != nil {
		t.Fatalf("Connect: %v", connectErr)
	}

	emulator.Revoke("access-oauth-recovery-1")
	_, searchErr := service.SearchFiles(ctx, scope, GoogleDriveQueryInput{UserID: "ops-user", Query: "nda"})
	if searchErr == nil {
		t.Fatal("expected SearchFiles to fail with revoked access")
	} else {
		var coded *goerrors.Error
		if !errors.As(searchErr, &coded) {
			t.Fatalf("expected goerrors.Error, got %T", searchErr)
		}
		if coded.TextCode != string(ErrorCodeGoogleAccessRevoked) {
			t.Fatalf("expected GOOGLE_ACCESS_REVOKED, got %q (%v)", coded.TextCode, searchErr)
		}
	}

	_, connectErr = service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "oauth-recovery-2",
	})
	if connectErr != nil {
		t.Fatalf("Connect recovery: %v", connectErr)
	}
	search, err := service.SearchFiles(ctx, scope, GoogleDriveQueryInput{UserID: "ops-user", Query: "nda"})
	if err != nil {
		t.Fatalf("SearchFiles after recovery: %v", err)
	}
	if len(search.Files) == 0 {
		t.Fatalf("expected search results after recovery, got %+v", search)
	}
}

func TestGoogleIntegrationProviderHealthDegradedMode(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	emulator := newGoogleProviderEmulatorServer()
	defer emulator.Close()
	emulator.SetHealth(false)

	provider, err := NewGoogleHTTPProvider(GoogleHTTPProviderConfig{
		ClientID:         "client-id",
		ClientSecret:     "client-secret",
		TokenEndpoint:    emulator.URL + "/oauth/token",
		RevokeEndpoint:   emulator.URL + "/oauth/revoke",
		DriveBaseURL:     emulator.URL + "/drive/v3",
		UserInfoEndpoint: emulator.URL + "/oauth/userinfo",
		HealthEndpoint:   emulator.URL + "/health",
		HTTPClient:       emulator.Client(),
	})
	if err != nil {
		t.Fatalf("NewGoogleHTTPProvider: %v", err)
	}
	service := NewGoogleIntegrationService(
		store,
		provider,
		NewDocumentService(store),
		NewAgreementService(store),
		WithGoogleProviderMode(GoogleProviderModeReal),
	)

	status, err := service.Status(ctx, scope, "ops-user")
	if err != nil {
		t.Fatalf("Status: %v", err)
	}
	if status.Healthy || !status.Degraded {
		t.Fatalf("expected degraded health status, got %+v", status)
	}
	if status.ProviderMode != GoogleProviderModeReal {
		t.Fatalf("expected real provider mode, got %q", status.ProviderMode)
	}

	_, err = service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "oauth-degraded-1",
	})
	if err == nil {
		t.Fatal("expected connect to fail when provider health is degraded")
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if coded.TextCode != string(ErrorCodeGoogleProviderDegraded) {
		t.Fatalf("expected GOOGLE_PROVIDER_DEGRADED, got %q", coded.TextCode)
	}
}

func TestNewGoogleProviderFromEnvRequiresExplicitDeterministicOptIn(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Google.ProviderMode = GoogleProviderModeDeterministic
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)

	provider, mode, err := NewGoogleProviderFromEnv()
	if err != nil {
		t.Fatalf("NewGoogleProviderFromEnv deterministic: %v", err)
	}
	if mode != GoogleProviderModeDeterministic {
		t.Fatalf("expected deterministic mode, got %q", mode)
	}
	if _, ok := provider.(*DeterministicGoogleProvider); !ok {
		t.Fatalf("expected deterministic provider, got %T", provider)
	}
}

type googleProviderEmulatorServer struct {
	*httptest.Server
	mu      sync.Mutex
	revoked map[string]bool
	healthy bool
}

func newGoogleProviderEmulatorServer() *googleProviderEmulatorServer {
	emulator := &googleProviderEmulatorServer{
		revoked: map[string]bool{},
		healthy: true,
	}
	emulator.Server = httptest.NewServer(http.HandlerFunc(emulator.serveHTTP))
	return emulator
}

func (e *googleProviderEmulatorServer) SetHealth(healthy bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.healthy = healthy
}

func (e *googleProviderEmulatorServer) Revoke(token string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.revoked[strings.TrimSpace(token)] = true
}

func (e *googleProviderEmulatorServer) serveHTTP(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/health":
		e.mu.Lock()
		healthy := e.healthy
		e.mu.Unlock()
		if !healthy {
			writeJSONResponse(w, http.StatusServiceUnavailable, map[string]any{"error": "provider outage"})
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	case r.Method == http.MethodPost && r.URL.Path == "/oauth/token":
		if err := r.ParseForm(); err != nil {
			writeJSONResponse(w, http.StatusBadRequest, map[string]any{"error": "invalid_request"})
			return
		}
		code := strings.TrimSpace(r.FormValue("code"))
		if code == "" {
			writeJSONResponse(w, http.StatusBadRequest, map[string]any{"error": "invalid_grant"})
			return
		}
		writeJSONResponse(w, http.StatusOK, map[string]any{
			"access_token":  "access-" + code,
			"refresh_token": "refresh-" + code,
			"scope":         strings.Join(DefaultGoogleOAuthScopes, " "),
			"expires_in":    3600,
			"token_type":    "Bearer",
		})
		return
	case r.Method == http.MethodPost && r.URL.Path == "/oauth/revoke":
		if err := r.ParseForm(); err == nil {
			e.Revoke(strings.TrimSpace(r.FormValue("token")))
		}
		w.WriteHeader(http.StatusOK)
		return
	case r.Method == http.MethodGet && r.URL.Path == "/oauth/userinfo":
		if e.isRevokedBearer(r) {
			writeJSONResponse(w, http.StatusUnauthorized, map[string]any{"error": "invalid_token"})
			return
		}
		writeJSONResponse(w, http.StatusOK, map[string]any{"email": "operator@example.com"})
		return
	case strings.HasPrefix(r.URL.Path, "/drive/v3/files"):
		if e.isRevokedBearer(r) {
			writeJSONResponse(w, http.StatusUnauthorized, map[string]any{"error": "invalid_token"})
			return
		}
		e.serveDriveFiles(w, r)
		return
	default:
		http.NotFound(w, r)
	}
}

func (e *googleProviderEmulatorServer) serveDriveFiles(w http.ResponseWriter, r *http.Request) {
	switch {
	case r.Method == http.MethodGet && r.URL.Path == "/drive/v3/files":
		q := strings.TrimSpace(r.URL.Query().Get("q"))
		file := map[string]any{
			"id":           "google-file-1",
			"name":         "NDA Source",
			"mimeType":     "application/vnd.google-apps.document",
			"webViewLink":  "https://docs.google.com/document/d/google-file-1/edit",
			"parents":      []string{"root"},
			"modifiedTime": "2026-02-10T12:00:00Z",
			"owners":       []map[string]any{{"emailAddress": "owner@example.com"}},
		}
		files := []map[string]any{}
		if strings.Contains(q, "name contains") || strings.Contains(q, "in parents") || q == "" {
			files = append(files, file)
		}
		writeJSONResponse(w, http.StatusOK, map[string]any{
			"nextPageToken": "",
			"files":         files,
		})
		return
	case r.Method == http.MethodGet && strings.HasSuffix(r.URL.Path, "/export"):
		w.Header().Set("Content-Type", "application/pdf")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(GenerateDeterministicPDF(1))
		return
	case r.Method == http.MethodGet && r.URL.Path == "/drive/v3/files/google-file-1":
		writeJSONResponse(w, http.StatusOK, map[string]any{
			"id":           "google-file-1",
			"name":         "NDA Source",
			"mimeType":     "application/vnd.google-apps.document",
			"webViewLink":  "https://docs.google.com/document/d/google-file-1/edit",
			"parents":      []string{"root"},
			"modifiedTime": "2026-02-10T12:00:00Z",
			"owners":       []map[string]any{{"emailAddress": "owner@example.com"}},
		})
		return
	default:
		http.NotFound(w, r)
	}
}

func (e *googleProviderEmulatorServer) isRevokedBearer(r *http.Request) bool {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return false
	}
	token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer"))
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.revoked[token]
}

func TestGoogleServicesIntegrationResolveConnectRedirectURIRejectsConfiguredMismatch(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Google.OAuthRedirectURI = "http://127.0.0.1:8082/admin/esign/integrations/google/callback"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	service := GoogleServicesIntegrationService{providerMode: GoogleProviderModeReal}

	_, err := service.resolveConnectRedirectURI("http://localhost:8082/admin/esign/integrations/google/callback")
	if err == nil {
		t.Fatal("expected redirect URI mismatch validation error")
	}
	var coded *goerrors.Error
	if !errors.As(err, &coded) {
		t.Fatalf("expected goerrors.Error, got %T", err)
	}
	if coded.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for redirect mismatch, got %d", coded.Code)
	}
}

func TestGoogleServicesIntegrationResolveConnectRedirectURIRequiresRealModeRedirect(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Google.OAuthRedirectURI = ""
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	service := GoogleServicesIntegrationService{providerMode: GoogleProviderModeReal}

	_, err := service.resolveConnectRedirectURI("")
	if err == nil {
		t.Fatal("expected redirect URI requirement error in real mode")
	}
}

func TestGoogleServicesIntegrationResolveConnectRedirectURIAcceptsCanonicalMatch(t *testing.T) {
	cfg := appcfg.Defaults()
	cfg.Google.OAuthRedirectURI = "http://127.0.0.1:8082/admin/esign/integrations/google/callback"
	appcfg.SetActive(cfg)
	t.Cleanup(appcfg.ResetActive)
	service := GoogleServicesIntegrationService{providerMode: GoogleProviderModeReal}

	got, err := service.resolveConnectRedirectURI("http://127.0.0.1:8082/admin/esign/integrations/google/callback/")
	if err != nil {
		t.Fatalf("expected canonical redirect URI match to pass, got %v", err)
	}
	if got != "http://127.0.0.1:8082/admin/esign/integrations/google/callback" {
		t.Fatalf("expected configured redirect URI to be used, got %q", got)
	}
}

func TestGoogleOAuthStatusJSONUsesSnakeCaseFields(t *testing.T) {
	payload, err := json.Marshal(GoogleOAuthStatus{
		Provider:             "google",
		ProviderMode:         "real",
		UserID:               "user-1",
		Connected:            true,
		AccountEmail:         "ops@example.com",
		Scopes:               []string{GoogleScopeDriveReadonly},
		IsExpired:            false,
		IsExpiringSoon:       true,
		CanAutoRefresh:       true,
		NeedsReauthorization: false,
		LeastPrivilege:       true,
		Healthy:              true,
	})
	if err != nil {
		t.Fatalf("marshal status payload: %v", err)
	}
	raw := string(payload)
	if !strings.Contains(raw, `"connected":true`) {
		t.Fatalf("expected connected field in snake_case payload, got %s", raw)
	}
	if !strings.Contains(raw, `"least_privilege":true`) {
		t.Fatalf("expected least_privilege field in snake_case payload, got %s", raw)
	}
	if !strings.Contains(raw, `"is_expiring_soon":true`) {
		t.Fatalf("expected is_expiring_soon field in snake_case payload, got %s", raw)
	}
	if !strings.Contains(raw, `"can_auto_refresh":true`) {
		t.Fatalf("expected can_auto_refresh field in snake_case payload, got %s", raw)
	}
	if !strings.Contains(raw, `"needs_reauthorization":false`) {
		t.Fatalf("expected needs_reauthorization field in snake_case payload, got %s", raw)
	}
	if strings.Contains(raw, `"Connected"`) ||
		strings.Contains(raw, `"LeastPrivilege"`) ||
		strings.Contains(raw, `"IsExpiringSoon"`) ||
		strings.Contains(raw, `"CanAutoRefresh"`) {
		t.Fatalf("did not expect PascalCase field names in payload, got %s", raw)
	}
}

func TestGoogleTokenExpiryState(t *testing.T) {
	now := time.Date(2026, 2, 16, 8, 0, 0, 0, time.UTC)
	cases := []struct {
		name       string
		credential gocore.ActiveCredential
		expired    bool
		soon       bool
		auto       bool
	}{
		{
			name:       "no expiry",
			credential: gocore.ActiveCredential{},
			expired:    false,
			soon:       false,
			auto:       false,
		},
		{
			name: "expired",
			credential: gocore.ActiveCredential{
				Refreshable:  true,
				RefreshToken: "refresh-1",
				ExpiresAt:    ptrTime(now.Add(-30 * time.Second)),
			},
			expired: true,
			soon:    false,
			auto:    true,
		},
		{
			name: "expiring soon",
			credential: gocore.ActiveCredential{
				Refreshable:  true,
				RefreshToken: "refresh-1",
				ExpiresAt:    ptrTime(now.Add(2 * time.Minute)),
			},
			expired: false,
			soon:    true,
			auto:    true,
		},
		{
			name: "healthy ttl",
			credential: gocore.ActiveCredential{
				Refreshable:  true,
				RefreshToken: "refresh-1",
				ExpiresAt:    ptrTime(now.Add(20 * time.Minute)),
			},
			expired: false,
			soon:    false,
			auto:    true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			state := gocore.ResolveCredentialTokenState(now, tc.credential, gocore.DefaultCredentialExpiringSoonWindow)
			if state.IsExpired != tc.expired || state.IsExpiringSoon != tc.soon {
				t.Fatalf("expected expired=%t soon=%t, got expired=%t soon=%t", tc.expired, tc.soon, state.IsExpired, state.IsExpiringSoon)
			}
			if state.CanAutoRefresh != tc.auto {
				t.Fatalf("expected can_auto_refresh=%t, got %t", tc.auto, state.CanAutoRefresh)
			}
		})
	}
}

func TestGoogleTokenRefreshDue(t *testing.T) {
	now := time.Date(2026, 2, 16, 8, 0, 0, 0, time.UTC)
	cases := []struct {
		name  string
		state gocore.CredentialTokenState
		due   bool
	}{
		{
			name:  "no expiry",
			state: gocore.CredentialTokenState{},
			due:   false,
		},
		{
			name: "expired",
			state: gocore.CredentialTokenState{
				CanAutoRefresh: true,
				HasAccessToken: true,
				ExpiresAt:      ptrTime(now.Add(-1 * time.Minute)),
			},
			due: true,
		},
		{
			name: "within lead window",
			state: gocore.CredentialTokenState{
				CanAutoRefresh: true,
				HasAccessToken: true,
				ExpiresAt:      ptrTime(now.Add(2 * time.Minute)),
			},
			due: true,
		},
		{
			name: "outside lead window",
			state: gocore.CredentialTokenState{
				CanAutoRefresh: true,
				HasAccessToken: true,
				ExpiresAt:      ptrTime(now.Add(30 * time.Minute)),
			},
			due: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if due := gocore.ShouldRefreshCredential(now, tc.state, gocore.DefaultCredentialRefreshLeadWindow); due != tc.due {
				t.Fatalf("expected due=%t, got %t", tc.due, due)
			}
		})
	}
}

func ptrTime(value time.Time) *time.Time {
	utc := value.UTC()
	return &utc
}

func writeJSONResponse(w http.ResponseWriter, status int, payload map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func anyString(value any) string {
	text, _ := value.(string)
	return text
}

func asGoError(err error, target **goerrors.Error) bool {
	return strings.TrimSpace(err.Error()) != "" && errors.As(err, target)
}
