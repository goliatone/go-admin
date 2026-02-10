package services

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

type scopeViolatingProvider struct{}

type staticCredentialKeyProvider struct {
	keyring GoogleCredentialKeyring
	err     error
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

func (scopeViolatingProvider) ExportFilePDF(context.Context, string, string) (GoogleExportSnapshot, error) {
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

func TestGoogleIntegrationImportDocumentPersistsGoogleSourceMetadata(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	provider := NewDeterministicGoogleProvider()
	documents := NewDocumentService(store)
	agreements := NewAgreementService(store, store)
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
	agreements := NewAgreementService(store, store)

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

func asGoError(err error, target **goerrors.Error) bool {
	return strings.TrimSpace(err.Error()) != "" && errors.As(err, target)
}
