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

	if err := service.Disconnect(ctx, scope, "user-1"); err != nil {
		t.Fatalf("Disconnect: %v", err)
	}
	status, err = service.Status(ctx, scope, "user-1")
	if err != nil {
		t.Fatalf("Status after disconnect: %v", err)
	}
	if status.Connected {
		t.Fatalf("expected disconnected status after disconnect, got %+v", status)
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

	if err := service.Disconnect(ctx, scope, personalScoped); err != nil {
		t.Fatalf("Disconnect personal account: %v", err)
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
	t.Setenv(EnvGoogleCredentialActiveKeyID, "v2")
	t.Setenv(EnvGoogleCredentialActiveKey, "active-key-material")
	t.Setenv(EnvGoogleCredentialKeysJSON, `{"v1":"legacy-key-material"}`)

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

	if err := provider.HealthCheck(ctx); err != nil {
		t.Fatalf("HealthCheck: %v", err)
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
	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "oauth-recovery-1",
	}); err != nil {
		t.Fatalf("Connect: %v", err)
	}

	emulator.Revoke("access-oauth-recovery-1")
	if _, err := service.SearchFiles(ctx, scope, GoogleDriveQueryInput{UserID: "ops-user", Query: "nda"}); err == nil {
		t.Fatal("expected SearchFiles to fail with revoked access")
	} else {
		var coded *goerrors.Error
		if !errors.As(err, &coded) {
			t.Fatalf("expected goerrors.Error, got %T", err)
		}
		if coded.TextCode != string(ErrorCodeGoogleAccessRevoked) {
			t.Fatalf("expected GOOGLE_ACCESS_REVOKED, got %q (%v)", coded.TextCode, err)
		}
	}

	if _, err := service.Connect(ctx, scope, GoogleConnectInput{
		UserID:   "ops-user",
		AuthCode: "oauth-recovery-2",
	}); err != nil {
		t.Fatalf("Connect recovery: %v", err)
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
	t.Setenv(EnvGoogleProviderMode, GoogleProviderModeDeterministic)
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
	t.Setenv(EnvGoogleOAuthRedirectURI, "http://127.0.0.1:8082/admin/esign/integrations/google/callback")
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
	t.Setenv(EnvGoogleOAuthRedirectURI, "")
	service := GoogleServicesIntegrationService{providerMode: GoogleProviderModeReal}

	_, err := service.resolveConnectRedirectURI("")
	if err == nil {
		t.Fatal("expected redirect URI requirement error in real mode")
	}
}

func TestGoogleServicesIntegrationResolveConnectRedirectURIAcceptsCanonicalMatch(t *testing.T) {
	t.Setenv(EnvGoogleOAuthRedirectURI, "http://127.0.0.1:8082/admin/esign/integrations/google/callback")
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

func asGoError(err error, target **goerrors.Error) bool {
	return strings.TrimSpace(err.Error()) != "" && errors.As(err, target)
}
