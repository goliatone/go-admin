package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
)

const (
	GoogleProviderName = "google"
	// DefaultGoogleCredentialKeyID is the default active key id used for credential encryption.
	DefaultGoogleCredentialKeyID   = "v1"
	defaultGoogleCredentialKey     = "go-admin-esign-google"
	EnvGoogleCredentialActiveKeyID = "ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY_ID"
	EnvGoogleCredentialActiveKey   = "ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY"
	EnvGoogleCredentialKeysJSON    = "ESIGN_GOOGLE_CREDENTIAL_KEYS_JSON"
)

const (
	GoogleScopeDriveReadonly = "https://www.googleapis.com/auth/drive.readonly"
	GoogleScopeUserinfoEmail = "https://www.googleapis.com/auth/userinfo.email"
)

// DefaultGoogleOAuthScopes is the least-privilege scope set required by the Google integration backend.
var DefaultGoogleOAuthScopes = []string{
	GoogleScopeDriveReadonly,
	GoogleScopeUserinfoEmail,
}

// GoogleProviderErrorCode captures provider-specific failure classification.
type GoogleProviderErrorCode string

const (
	GoogleProviderErrorPermissionDenied GoogleProviderErrorCode = "permission_denied"
	GoogleProviderErrorRateLimited      GoogleProviderErrorCode = "rate_limited"
	GoogleProviderErrorAccessRevoked    GoogleProviderErrorCode = "access_revoked"
)

// GoogleProviderError captures typed provider failures that must map to API-safe error codes.
type GoogleProviderError struct {
	Code     GoogleProviderErrorCode
	Message  string
	Metadata map[string]any
}

func (e *GoogleProviderError) Error() string {
	if e == nil {
		return "google provider error"
	}
	msg := strings.TrimSpace(e.Message)
	if msg == "" {
		msg = "google provider error"
	}
	return msg
}

// NewGoogleProviderError constructs a typed provider error.
func NewGoogleProviderError(code GoogleProviderErrorCode, message string, metadata map[string]any) error {
	return &GoogleProviderError{
		Code:     code,
		Message:  strings.TrimSpace(message),
		Metadata: metadata,
	}
}

// MapGoogleProviderError maps provider-specific errors to typed domain/API-safe errors.
func MapGoogleProviderError(err error) error {
	if err == nil {
		return nil
	}
	var providerErr *GoogleProviderError
	if !errors.As(err, &providerErr) || providerErr == nil {
		return err
	}
	message := providerErr.Error()
	metadata := map[string]any{}
	for key, value := range providerErr.Metadata {
		metadata[key] = value
	}
	switch providerErr.Code {
	case GoogleProviderErrorPermissionDenied:
		return goerrors.New(message, goerrors.CategoryAuthz).
			WithCode(http.StatusForbidden).
			WithTextCode(string(ErrorCodeGooglePermissionDenied)).
			WithMetadata(metadata)
	case GoogleProviderErrorRateLimited:
		return goerrors.New(message, goerrors.CategoryRateLimit).
			WithCode(http.StatusTooManyRequests).
			WithTextCode(string(ErrorCodeGoogleRateLimited)).
			WithMetadata(metadata)
	case GoogleProviderErrorAccessRevoked:
		return goerrors.New(message, goerrors.CategoryAuthz).
			WithCode(http.StatusUnauthorized).
			WithTextCode(string(ErrorCodeGoogleAccessRevoked)).
			WithMetadata(metadata)
	default:
		return err
	}
}

// CredentialCipher encrypts and decrypts provider credential payloads before storage.
type CredentialCipher interface {
	Encrypt(ctx context.Context, plaintext string) (string, error)
	Decrypt(ctx context.Context, ciphertext string) (string, error)
}

// CredentialKeyVersioner exposes key-id metadata used for key-rotation decisions.
type CredentialKeyVersioner interface {
	PrimaryKeyID() string
	CiphertextKeyID(ciphertext string) string
}

// GoogleCredentialKeyring represents a provider-supplied active key and keyring material.
type GoogleCredentialKeyring struct {
	ActiveKeyID string
	Keys        map[string][]byte
}

// GoogleCredentialKeyProvider resolves encryption key material for Google credential storage.
type GoogleCredentialKeyProvider interface {
	Resolve(ctx context.Context) (GoogleCredentialKeyring, error)
}

// EnvGoogleCredentialKeyProvider loads key material from environment variables.
type EnvGoogleCredentialKeyProvider struct {
	ActiveKeyIDEnv string
	ActiveKeyEnv   string
	KeysJSONEnv    string
}

// NewEnvGoogleCredentialKeyProvider returns the default env-backed key provider.
func NewEnvGoogleCredentialKeyProvider() EnvGoogleCredentialKeyProvider {
	return EnvGoogleCredentialKeyProvider{
		ActiveKeyIDEnv: EnvGoogleCredentialActiveKeyID,
		ActiveKeyEnv:   EnvGoogleCredentialActiveKey,
		KeysJSONEnv:    EnvGoogleCredentialKeysJSON,
	}
}

// Resolve loads keyring material from env.
// Required:
// - ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY
// Optional:
// - ESIGN_GOOGLE_CREDENTIAL_ACTIVE_KEY_ID (default "v1")
// - ESIGN_GOOGLE_CREDENTIAL_KEYS_JSON (JSON object: {"v0":"old-key","v-1":"older-key"})
func (p EnvGoogleCredentialKeyProvider) Resolve(_ context.Context) (GoogleCredentialKeyring, error) {
	activeKeyIDEnv := strings.TrimSpace(p.ActiveKeyIDEnv)
	if activeKeyIDEnv == "" {
		activeKeyIDEnv = EnvGoogleCredentialActiveKeyID
	}
	activeKeyEnv := strings.TrimSpace(p.ActiveKeyEnv)
	if activeKeyEnv == "" {
		activeKeyEnv = EnvGoogleCredentialActiveKey
	}
	keysJSONEnv := strings.TrimSpace(p.KeysJSONEnv)
	if keysJSONEnv == "" {
		keysJSONEnv = EnvGoogleCredentialKeysJSON
	}

	activeKeyID := normalizeCredentialKeyID(os.Getenv(activeKeyIDEnv))
	if activeKeyID == "" {
		activeKeyID = DefaultGoogleCredentialKeyID
	}
	activeKey := strings.TrimSpace(os.Getenv(activeKeyEnv))
	if activeKey == "" {
		return GoogleCredentialKeyring{}, fmt.Errorf("%s is required when esign_google is enabled", activeKeyEnv)
	}

	keys := map[string][]byte{}
	rawJSON := strings.TrimSpace(os.Getenv(keysJSONEnv))
	if rawJSON != "" {
		parsed := map[string]string{}
		if err := json.Unmarshal([]byte(rawJSON), &parsed); err != nil {
			return GoogleCredentialKeyring{}, fmt.Errorf("parse %s: %w", keysJSONEnv, err)
		}
		for keyID, material := range parsed {
			keyID = normalizeCredentialKeyID(keyID)
			material = strings.TrimSpace(material)
			if keyID == "" || material == "" {
				continue
			}
			keys[keyID] = []byte(material)
		}
	}
	keys[activeKeyID] = []byte(activeKey)

	return GoogleCredentialKeyring{
		ActiveKeyID: activeKeyID,
		Keys:        keys,
	}, nil
}

// NewGoogleCredentialCipher resolves key material from provider and constructs a keyring cipher.
func NewGoogleCredentialCipher(ctx context.Context, provider GoogleCredentialKeyProvider) (KeyringCredentialCipher, error) {
	if provider == nil {
		return KeyringCredentialCipher{}, fmt.Errorf("google credential key provider is nil")
	}
	keyring, err := provider.Resolve(ctx)
	if err != nil {
		return KeyringCredentialCipher{}, err
	}
	active := normalizeCredentialKeyID(keyring.ActiveKeyID)
	if active == "" {
		active = DefaultGoogleCredentialKeyID
	}
	keys := map[string][]byte{}
	for keyID, material := range keyring.Keys {
		keyID = normalizeCredentialKeyID(keyID)
		if keyID == "" || len(material) == 0 {
			continue
		}
		keys[keyID] = append([]byte{}, material...)
	}
	if len(keys) == 0 {
		return KeyringCredentialCipher{}, fmt.Errorf("google credential keyring is empty")
	}
	if _, ok := keys[active]; !ok {
		return KeyringCredentialCipher{}, fmt.Errorf("active google credential key id not found in keyring: %s", active)
	}
	return NewKeyringCredentialCipher(active, keys), nil
}

// AESGCMCredentialCipher encrypts credential material using AES-GCM.
type AESGCMCredentialCipher struct {
	key []byte
}

// NewAESGCMCredentialCipher creates an AES-GCM cipher using a 32-byte key derived from the input bytes.
func NewAESGCMCredentialCipher(keyMaterial []byte) AESGCMCredentialCipher {
	sum := sha256.Sum256(keyMaterial)
	return AESGCMCredentialCipher{key: sum[:]}
}

func (c AESGCMCredentialCipher) Encrypt(_ context.Context, plaintext string) (string, error) {
	if strings.TrimSpace(plaintext) == "" {
		return "", nil
	}
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := aead.Seal(nil, nonce, []byte(plaintext), nil)
	payload := append(nonce, sealed...)
	return base64.RawStdEncoding.EncodeToString(payload), nil
}

func (c AESGCMCredentialCipher) Decrypt(_ context.Context, ciphertext string) (string, error) {
	ciphertext = strings.TrimSpace(ciphertext)
	if ciphertext == "" {
		return "", nil
	}
	payload, err := base64.RawStdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := aead.NonceSize()
	if len(payload) < nonceSize {
		return "", fmt.Errorf("invalid encrypted payload")
	}
	nonce := payload[:nonceSize]
	encrypted := payload[nonceSize:]
	plain, err := aead.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return "", err
	}
	return string(plain), nil
}

// KeyringCredentialCipher encrypts credential material with a key id prefix and supports decrypt fallback.
type KeyringCredentialCipher struct {
	primaryKeyID string
	ciphers      map[string]AESGCMCredentialCipher
}

// NewKeyringCredentialCipher creates a keyring cipher with an active key id and id->key material map.
func NewKeyringCredentialCipher(primaryKeyID string, keyMaterialByID map[string][]byte) KeyringCredentialCipher {
	primaryKeyID = normalizeCredentialKeyID(primaryKeyID)
	if primaryKeyID == "" {
		primaryKeyID = DefaultGoogleCredentialKeyID
	}

	ciphers := map[string]AESGCMCredentialCipher{}
	for keyID, material := range keyMaterialByID {
		keyID = normalizeCredentialKeyID(keyID)
		if keyID == "" || len(material) == 0 {
			continue
		}
		ciphers[keyID] = NewAESGCMCredentialCipher(material)
	}
	return KeyringCredentialCipher{
		primaryKeyID: primaryKeyID,
		ciphers:      ciphers,
	}
}

func (c KeyringCredentialCipher) Encrypt(ctx context.Context, plaintext string) (string, error) {
	if strings.TrimSpace(plaintext) == "" {
		return "", nil
	}
	active, ok := c.ciphers[c.primaryKeyID]
	if !ok {
		return "", fmt.Errorf("credential key id not configured: %s", c.primaryKeyID)
	}
	encrypted, err := active.Encrypt(ctx, plaintext)
	if err != nil {
		return "", err
	}
	return c.primaryKeyID + ":" + encrypted, nil
}

func (c KeyringCredentialCipher) Decrypt(ctx context.Context, ciphertext string) (string, error) {
	ciphertext = strings.TrimSpace(ciphertext)
	if ciphertext == "" {
		return "", nil
	}

	keyID, payload, versioned := splitCredentialCiphertext(ciphertext)
	if versioned {
		versionCipher, ok := c.ciphers[keyID]
		if !ok {
			return "", fmt.Errorf("credential key id not configured: %s", keyID)
		}
		return versionCipher.Decrypt(ctx, payload)
	}

	var lastErr error
	for _, candidate := range sortedCredentialKeyIDs(c.ciphers) {
		plain, err := c.ciphers[candidate].Decrypt(ctx, ciphertext)
		if err == nil {
			return plain, nil
		}
		lastErr = err
	}
	if lastErr != nil {
		return "", lastErr
	}
	return "", fmt.Errorf("credential decrypt failed")
}

// PrimaryKeyID returns the active key id used for encrypt operations.
func (c KeyringCredentialCipher) PrimaryKeyID() string {
	return c.primaryKeyID
}

// CiphertextKeyID returns the key id prefix when ciphertext is versioned.
func (c KeyringCredentialCipher) CiphertextKeyID(ciphertext string) string {
	keyID, _, versioned := splitCredentialCiphertext(ciphertext)
	if !versioned {
		return ""
	}
	return keyID
}

// GoogleOAuthToken captures provider OAuth token exchange output.
type GoogleOAuthToken struct {
	AccessToken  string
	RefreshToken string
	Scopes       []string
	ExpiresAt    time.Time
	AccountEmail string
}

// GoogleOAuthStatus captures connection status details returned by status endpoints.
type GoogleOAuthStatus struct {
	Provider       string
	UserID         string
	Connected      bool
	AccountEmail   string
	Scopes         []string
	ExpiresAt      *time.Time
	LeastPrivilege bool
}

// GoogleDriveFile captures the subset of Drive metadata needed by backend APIs.
type GoogleDriveFile struct {
	ID           string
	Name         string
	MimeType     string
	WebViewURL   string
	OwnerEmail   string
	ParentID     string
	ModifiedTime time.Time
}

// GoogleDriveListResult captures search/browse pagination results.
type GoogleDriveListResult struct {
	Files         []GoogleDriveFile
	NextPageToken string
}

// GoogleExportSnapshot captures exported PDF bytes plus source metadata.
type GoogleExportSnapshot struct {
	File GoogleDriveFile
	PDF  []byte
}

// GoogleProvider captures provider operations used by backend OAuth/search/import flows.
type GoogleProvider interface {
	ExchangeCode(ctx context.Context, authCode, redirectURI string, requestedScopes []string) (GoogleOAuthToken, error)
	RevokeToken(ctx context.Context, accessToken string) error
	SearchFiles(ctx context.Context, accessToken, query, pageToken string, pageSize int) (GoogleDriveListResult, error)
	BrowseFiles(ctx context.Context, accessToken, folderID, pageToken string, pageSize int) (GoogleDriveListResult, error)
	ExportFilePDF(ctx context.Context, accessToken, fileID string) (GoogleExportSnapshot, error)
}

// DeterministicGoogleProvider is a no-network test/local provider implementation.
type DeterministicGoogleProvider struct {
	now       func() time.Time
	files     map[string]GoogleDriveFile
	pdfByID   map[string][]byte
	errorByOp map[string]error
}

// NewDeterministicGoogleProvider creates a deterministic provider with optional fixture data.
func NewDeterministicGoogleProvider() *DeterministicGoogleProvider {
	now := time.Date(2026, 2, 10, 12, 0, 0, 0, time.UTC)
	return &DeterministicGoogleProvider{
		now: func() time.Time { return now },
		files: map[string]GoogleDriveFile{
			"google-file-1": {
				ID:           "google-file-1",
				Name:         "NDA Source",
				MimeType:     "application/vnd.google-apps.document",
				WebViewURL:   "https://docs.google.com/document/d/google-file-1/edit",
				OwnerEmail:   "owner@example.com",
				ParentID:     "root",
				ModifiedTime: now.Add(-2 * time.Hour),
			},
		},
		pdfByID: map[string][]byte{
			"google-file-1": []byte("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Type /Page >>\nendobj\n%%EOF"),
		},
		errorByOp: map[string]error{},
	}
}

func (p *DeterministicGoogleProvider) ExchangeCode(_ context.Context, authCode, _ string, requestedScopes []string) (GoogleOAuthToken, error) {
	if p == nil {
		return GoogleOAuthToken{}, fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("exchange:" + strings.TrimSpace(authCode)); err != nil {
		return GoogleOAuthToken{}, err
	}
	if strings.TrimSpace(authCode) == "" {
		return GoogleOAuthToken{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "missing authorization code", nil)
	}
	now := p.now()
	return GoogleOAuthToken{
		AccessToken:  "access-" + strings.TrimSpace(authCode),
		RefreshToken: "refresh-" + strings.TrimSpace(authCode),
		Scopes:       normalizeScopes(requestedScopes),
		ExpiresAt:    now.Add(1 * time.Hour).UTC(),
		AccountEmail: "operator@example.com",
	}, nil
}

func (p *DeterministicGoogleProvider) RevokeToken(_ context.Context, accessToken string) error {
	if p == nil {
		return fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("revoke:" + strings.TrimSpace(accessToken)); err != nil {
		return err
	}
	return nil
}

func (p *DeterministicGoogleProvider) SearchFiles(_ context.Context, accessToken, query, _ string, pageSize int) (GoogleDriveListResult, error) {
	if p == nil {
		return GoogleDriveListResult{}, fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("search:" + strings.TrimSpace(accessToken)); err != nil {
		return GoogleDriveListResult{}, err
	}
	query = strings.ToLower(strings.TrimSpace(query))
	out := make([]GoogleDriveFile, 0)
	for _, file := range p.files {
		if query == "" || strings.Contains(strings.ToLower(file.Name), query) {
			out = append(out, file)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	if pageSize <= 0 || pageSize > len(out) {
		pageSize = len(out)
	}
	if pageSize < len(out) {
		out = out[:pageSize]
	}
	return GoogleDriveListResult{Files: out}, nil
}

func (p *DeterministicGoogleProvider) BrowseFiles(_ context.Context, accessToken, folderID, _ string, pageSize int) (GoogleDriveListResult, error) {
	if p == nil {
		return GoogleDriveListResult{}, fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("browse:" + strings.TrimSpace(accessToken)); err != nil {
		return GoogleDriveListResult{}, err
	}
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		folderID = "root"
	}
	out := make([]GoogleDriveFile, 0)
	for _, file := range p.files {
		if strings.TrimSpace(file.ParentID) == folderID {
			out = append(out, file)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	if pageSize <= 0 || pageSize > len(out) {
		pageSize = len(out)
	}
	if pageSize < len(out) {
		out = out[:pageSize]
	}
	return GoogleDriveListResult{Files: out}, nil
}

func (p *DeterministicGoogleProvider) ExportFilePDF(_ context.Context, accessToken, fileID string) (GoogleExportSnapshot, error) {
	if p == nil {
		return GoogleExportSnapshot{}, fmt.Errorf("google provider not configured")
	}
	if err := p.resolveError("export:" + strings.TrimSpace(accessToken) + ":" + strings.TrimSpace(fileID)); err != nil {
		return GoogleExportSnapshot{}, err
	}
	fileID = strings.TrimSpace(fileID)
	file, ok := p.files[fileID]
	if !ok {
		return GoogleExportSnapshot{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "google file not found", map[string]any{"file_id": fileID})
	}
	pdf := append([]byte{}, p.pdfByID[fileID]...)
	if len(pdf) == 0 {
		return GoogleExportSnapshot{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "file export not available", map[string]any{"file_id": fileID})
	}
	return GoogleExportSnapshot{File: file, PDF: pdf}, nil
}

func (p *DeterministicGoogleProvider) resolveError(key string) error {
	if p == nil {
		return fmt.Errorf("provider unavailable")
	}
	if p.errorByOp == nil {
		return nil
	}
	return p.errorByOp[strings.TrimSpace(key)]
}

// GoogleDocumentUploader captures document upload behavior used by Google imports.
type GoogleDocumentUploader interface {
	Upload(ctx context.Context, scope stores.Scope, input DocumentUploadInput) (stores.DocumentRecord, error)
}

// GoogleAgreementCreator captures draft creation behavior used by Google imports.
type GoogleAgreementCreator interface {
	CreateDraft(ctx context.Context, scope stores.Scope, input CreateDraftInput) (stores.AgreementRecord, error)
}

// GoogleConnectInput captures OAuth connect inputs.
type GoogleConnectInput struct {
	UserID      string
	AuthCode    string
	RedirectURI string
}

// GoogleDriveQueryInput captures search/browse query input.
type GoogleDriveQueryInput struct {
	UserID    string
	Query     string
	FolderID  string
	PageToken string
	PageSize  int
}

// GoogleImportInput captures import request inputs.
type GoogleImportInput struct {
	UserID          string
	GoogleFileID    string
	DocumentTitle   string
	AgreementTitle  string
	CreatedByUserID string
}

// GoogleImportResult captures imported document/agreement output.
type GoogleImportResult struct {
	Document  stores.DocumentRecord
	Agreement stores.AgreementRecord
}

// GoogleIntegrationOption customizes Google integration service behavior.
type GoogleIntegrationOption func(*GoogleIntegrationService)

// WithGoogleCipher overrides the credential cipher used for persisted tokens.
func WithGoogleCipher(cipher CredentialCipher) GoogleIntegrationOption {
	return func(s *GoogleIntegrationService) {
		if s == nil || cipher == nil {
			return
		}
		s.cipher = cipher
	}
}

// WithGoogleClock overrides the service clock.
func WithGoogleClock(now func() time.Time) GoogleIntegrationOption {
	return func(s *GoogleIntegrationService) {
		if s == nil || now == nil {
			return
		}
		s.now = now
	}
}

// WithGoogleAllowedScopes overrides least-privilege OAuth scopes.
func WithGoogleAllowedScopes(scopes []string) GoogleIntegrationOption {
	return func(s *GoogleIntegrationService) {
		if s == nil {
			return
		}
		s.allowedScopes = normalizeScopes(scopes)
	}
}

// GoogleIntegrationService handles OAuth credential lifecycle, Drive search/browse, and import flows.
type GoogleIntegrationService struct {
	credentials   stores.IntegrationCredentialStore
	provider      GoogleProvider
	documents     GoogleDocumentUploader
	agreements    GoogleAgreementCreator
	cipher        CredentialCipher
	now           func() time.Time
	allowedScopes []string
}

// NewGoogleIntegrationService creates a Google integration service with deterministic defaults.
func NewGoogleIntegrationService(
	credentials stores.IntegrationCredentialStore,
	provider GoogleProvider,
	documents GoogleDocumentUploader,
	agreements GoogleAgreementCreator,
	opts ...GoogleIntegrationOption,
) GoogleIntegrationService {
	svc := GoogleIntegrationService{
		credentials:   credentials,
		provider:      provider,
		documents:     documents,
		agreements:    agreements,
		cipher:        NewKeyringCredentialCipher(DefaultGoogleCredentialKeyID, map[string][]byte{DefaultGoogleCredentialKeyID: []byte(defaultGoogleCredentialKey)}), // deterministic local/test default
		now:           func() time.Time { return time.Now().UTC() },
		allowedScopes: normalizeScopes(DefaultGoogleOAuthScopes),
	}
	if svc.provider == nil {
		svc.provider = NewDeterministicGoogleProvider()
	}
	for _, opt := range opts {
		if opt == nil {
			continue
		}
		opt(&svc)
	}
	if len(svc.allowedScopes) == 0 {
		svc.allowedScopes = normalizeScopes(DefaultGoogleOAuthScopes)
	}
	return svc
}

// Connect exchanges auth code, enforces scope policy, encrypts tokens, and persists credentials.
func (s GoogleIntegrationService) Connect(ctx context.Context, scope stores.Scope, input GoogleConnectInput) (GoogleOAuthStatus, error) {
	if s.credentials == nil || s.provider == nil || s.cipher == nil {
		return GoogleOAuthStatus{}, domainValidationError("google", "service", "not configured")
	}
	userID := normalizeRequiredID("google", "user_id", input.UserID)
	if userID == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "user_id", "required")
	}
	authCode := strings.TrimSpace(input.AuthCode)
	if authCode == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "auth_code", "required")
	}
	token, err := s.provider.ExchangeCode(ctx, authCode, strings.TrimSpace(input.RedirectURI), append([]string{}, s.allowedScopes...))
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleOAuthStatus{}, MapGoogleProviderError(err)
	}
	scopes := normalizeScopes(token.Scopes)
	if err := validateLeastPrivilegeScopes(scopes, s.allowedScopes); err != nil {
		return GoogleOAuthStatus{}, err
	}
	encryptedAccess, err := s.cipher.Encrypt(ctx, token.AccessToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	encryptedRefresh, err := s.cipher.Encrypt(ctx, token.RefreshToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	var expiresAt *time.Time
	if !token.ExpiresAt.IsZero() {
		exp := token.ExpiresAt.UTC()
		expiresAt = &exp
	}
	if _, err := s.credentials.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
		UserID:                userID,
		Provider:              GoogleProviderName,
		EncryptedAccessToken:  encryptedAccess,
		EncryptedRefreshToken: encryptedRefresh,
		Scopes:                scopes,
		ExpiresAt:             expiresAt,
	}); err != nil {
		return GoogleOAuthStatus{}, err
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	observability.ObserveGoogleAuthChurn(ctx, "oauth_connected")
	return GoogleOAuthStatus{
		Provider:       GoogleProviderName,
		UserID:         userID,
		Connected:      true,
		AccountEmail:   strings.TrimSpace(token.AccountEmail),
		Scopes:         scopes,
		ExpiresAt:      expiresAt,
		LeastPrivilege: true,
	}, nil
}

// Disconnect revokes provider access token and removes persisted encrypted credentials.
func (s GoogleIntegrationService) Disconnect(ctx context.Context, scope stores.Scope, userID string) error {
	if s.credentials == nil || s.provider == nil || s.cipher == nil {
		return domainValidationError("google", "service", "not configured")
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return domainValidationError("google", "user_id", "required")
	}
	credential, err := s.credentials.GetIntegrationCredential(ctx, scope, GoogleProviderName, userID)
	if err != nil {
		if isNotFound(err) {
			return nil
		}
		return err
	}
	accessToken, err := s.cipher.Decrypt(ctx, credential.EncryptedAccessToken)
	if err != nil {
		return err
	}
	if err := s.provider.RevokeToken(ctx, accessToken); err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return MapGoogleProviderError(err)
	}
	if err := s.credentials.DeleteIntegrationCredential(ctx, scope, GoogleProviderName, userID); err != nil {
		return err
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	observability.ObserveGoogleAuthChurn(ctx, "oauth_disconnected")
	return nil
}

// Status returns OAuth connection status with scopes/expiry details.
func (s GoogleIntegrationService) Status(ctx context.Context, scope stores.Scope, userID string) (GoogleOAuthStatus, error) {
	if s.credentials == nil {
		return GoogleOAuthStatus{}, domainValidationError("google", "service", "not configured")
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "user_id", "required")
	}
	credential, err := s.credentials.GetIntegrationCredential(ctx, scope, GoogleProviderName, userID)
	if err != nil {
		if isNotFound(err) {
			return GoogleOAuthStatus{
				Provider:       GoogleProviderName,
				UserID:         userID,
				Connected:      false,
				Scopes:         []string{},
				ExpiresAt:      nil,
				LeastPrivilege: false,
			}, nil
		}
		return GoogleOAuthStatus{}, err
	}
	least := validateLeastPrivilegeScopes(credential.Scopes, s.allowedScopes) == nil
	return GoogleOAuthStatus{
		Provider:       GoogleProviderName,
		UserID:         userID,
		Connected:      true,
		Scopes:         normalizeScopes(credential.Scopes),
		ExpiresAt:      cloneGoogleTimePtr(credential.ExpiresAt),
		LeastPrivilege: least,
	}, nil
}

// RotateCredentialEncryption re-encrypts persisted tokens with the currently configured active key.
func (s GoogleIntegrationService) RotateCredentialEncryption(ctx context.Context, scope stores.Scope, userID string) (GoogleOAuthStatus, error) {
	if s.credentials == nil || s.cipher == nil {
		return GoogleOAuthStatus{}, domainValidationError("google", "service", "not configured")
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "user_id", "required")
	}

	credential, err := s.credentials.GetIntegrationCredential(ctx, scope, GoogleProviderName, userID)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}

	accessToken, err := s.cipher.Decrypt(ctx, credential.EncryptedAccessToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	refreshToken, err := s.cipher.Decrypt(ctx, credential.EncryptedRefreshToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	encryptedAccess, err := s.cipher.Encrypt(ctx, accessToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	encryptedRefresh, err := s.cipher.Encrypt(ctx, refreshToken)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}

	if _, err := s.credentials.UpsertIntegrationCredential(ctx, scope, stores.IntegrationCredentialRecord{
		ID:                    credential.ID,
		UserID:                userID,
		Provider:              GoogleProviderName,
		EncryptedAccessToken:  encryptedAccess,
		EncryptedRefreshToken: encryptedRefresh,
		Scopes:                append([]string{}, credential.Scopes...),
		ExpiresAt:             cloneGoogleTimePtr(credential.ExpiresAt),
	}); err != nil {
		return GoogleOAuthStatus{}, err
	}

	return s.Status(ctx, scope, userID)
}

// SearchFiles searches files via provider using decrypted scoped credentials.
func (s GoogleIntegrationService) SearchFiles(ctx context.Context, scope stores.Scope, input GoogleDriveQueryInput) (GoogleDriveListResult, error) {
	accessToken, _, err := s.resolveAccessToken(ctx, scope, input.UserID)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	pageSize := input.PageSize
	if pageSize <= 0 {
		pageSize = 25
	}
	if pageSize > 100 {
		pageSize = 100
	}
	result, err := s.provider.SearchFiles(ctx, accessToken, strings.TrimSpace(input.Query), strings.TrimSpace(input.PageToken), pageSize)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleDriveListResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	return result, nil
}

// BrowseFiles lists files under a Drive folder via provider using decrypted scoped credentials.
func (s GoogleIntegrationService) BrowseFiles(ctx context.Context, scope stores.Scope, input GoogleDriveQueryInput) (GoogleDriveListResult, error) {
	accessToken, _, err := s.resolveAccessToken(ctx, scope, input.UserID)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	pageSize := input.PageSize
	if pageSize <= 0 {
		pageSize = 25
	}
	if pageSize > 100 {
		pageSize = 100
	}
	result, err := s.provider.BrowseFiles(ctx, accessToken, strings.TrimSpace(input.FolderID), strings.TrimSpace(input.PageToken), pageSize)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleDriveListResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	return result, nil
}

// ImportDocument exports a Google doc PDF snapshot and persists source metadata on document/agreement.
func (s GoogleIntegrationService) ImportDocument(ctx context.Context, scope stores.Scope, input GoogleImportInput) (result GoogleImportResult, err error) {
	defer func() {
		observability.ObserveGoogleImport(ctx, err == nil, googleTelemetryReason(err))
	}()
	if s.documents == nil || s.agreements == nil {
		return GoogleImportResult{}, domainValidationError("google", "import", "document/agreement services not configured")
	}
	accessToken, userID, err := s.resolveAccessToken(ctx, scope, input.UserID)
	if err != nil {
		return GoogleImportResult{}, err
	}
	fileID := strings.TrimSpace(input.GoogleFileID)
	if fileID == "" {
		return GoogleImportResult{}, domainValidationError("google", "google_file_id", "required")
	}
	snapshot, err := s.provider.ExportFilePDF(ctx, accessToken, fileID)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleImportResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	modifiedTime := snapshot.File.ModifiedTime
	if modifiedTime.IsZero() {
		modifiedTime = s.now().UTC()
	}
	exportedAt := s.now().UTC()
	documentTitle := strings.TrimSpace(input.DocumentTitle)
	if documentTitle == "" {
		documentTitle = strings.TrimSpace(snapshot.File.Name)
	}
	if documentTitle == "" {
		documentTitle = "Imported Google Document"
	}
	agreementTitle := strings.TrimSpace(input.AgreementTitle)
	if agreementTitle == "" {
		agreementTitle = documentTitle
	}
	createdByUserID := strings.TrimSpace(input.CreatedByUserID)
	if createdByUserID == "" {
		createdByUserID = userID
	}

	document, err := s.documents.Upload(ctx, scope, DocumentUploadInput{
		Title:                  documentTitle,
		ObjectKey:              googleImportObjectKey(scope, fileID, exportedAt),
		PDF:                    append([]byte{}, snapshot.PDF...),
		CreatedBy:              createdByUserID,
		UploadedAt:             exportedAt,
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     fileID,
		SourceGoogleDocURL:     strings.TrimSpace(snapshot.File.WebViewURL),
		SourceModifiedTime:     &modifiedTime,
		SourceExportedAt:       &exportedAt,
		SourceExportedByUserID: userID,
	})
	if err != nil {
		return GoogleImportResult{}, err
	}

	agreement, err := s.agreements.CreateDraft(ctx, scope, CreateDraftInput{
		DocumentID:             document.ID,
		Title:                  agreementTitle,
		CreatedByUserID:        createdByUserID,
		SourceType:             stores.SourceTypeGoogleDrive,
		SourceGoogleFileID:     fileID,
		SourceGoogleDocURL:     strings.TrimSpace(snapshot.File.WebViewURL),
		SourceModifiedTime:     &modifiedTime,
		SourceExportedAt:       &exportedAt,
		SourceExportedByUserID: userID,
	})
	if err != nil {
		return GoogleImportResult{}, err
	}

	return GoogleImportResult{
		Document:  document,
		Agreement: agreement,
	}, nil
}

func (s GoogleIntegrationService) resolveAccessToken(ctx context.Context, scope stores.Scope, userID string) (string, string, error) {
	if s.credentials == nil || s.provider == nil || s.cipher == nil {
		return "", "", domainValidationError("google", "service", "not configured")
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return "", "", domainValidationError("google", "user_id", "required")
	}
	credential, err := s.credentials.GetIntegrationCredential(ctx, scope, GoogleProviderName, userID)
	if err != nil {
		if isNotFound(err) {
			observability.ObserveGoogleAuthChurn(ctx, "disconnected")
			return "", "", goerrors.New("google integration disconnected", goerrors.CategoryAuthz).
				WithCode(http.StatusUnauthorized).
				WithTextCode(string(ErrorCodeGoogleAccessRevoked)).
				WithMetadata(map[string]any{"provider": GoogleProviderName, "user_id": userID})
		}
		return "", "", err
	}
	if err := validateLeastPrivilegeScopes(credential.Scopes, s.allowedScopes); err != nil {
		return "", "", err
	}
	accessToken, err := s.cipher.Decrypt(ctx, credential.EncryptedAccessToken)
	if err != nil {
		return "", "", err
	}
	if strings.TrimSpace(accessToken) == "" {
		observability.ObserveGoogleAuthChurn(ctx, "access_revoked")
		return "", "", goerrors.New("google integration access revoked", goerrors.CategoryAuthz).
			WithCode(http.StatusUnauthorized).
			WithTextCode(string(ErrorCodeGoogleAccessRevoked))
	}
	return accessToken, userID, nil
}

func normalizeRequiredID(entity, field, value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	return value
}

func normalizeCredentialKeyID(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return ""
	}
	value = strings.ReplaceAll(value, " ", "_")
	return value
}

func sortedCredentialKeyIDs(values map[string]AESGCMCredentialCipher) []string {
	out := make([]string, 0, len(values))
	for keyID := range values {
		out = append(out, keyID)
	}
	sort.Strings(out)
	return out
}

func splitCredentialCiphertext(ciphertext string) (string, string, bool) {
	ciphertext = strings.TrimSpace(ciphertext)
	if ciphertext == "" {
		return "", "", false
	}
	sep := strings.Index(ciphertext, ":")
	if sep <= 0 {
		return "", "", false
	}
	keyID := normalizeCredentialKeyID(ciphertext[:sep])
	payload := strings.TrimSpace(ciphertext[sep+1:])
	if keyID == "" || payload == "" {
		return "", "", false
	}
	return keyID, payload, true
}

func normalizeScopes(scopes []string) []string {
	set := map[string]struct{}{}
	for _, scope := range scopes {
		scope = strings.TrimSpace(scope)
		if scope == "" {
			continue
		}
		set[scope] = struct{}{}
	}
	out := make([]string, 0, len(set))
	for scope := range set {
		out = append(out, scope)
	}
	sort.Strings(out)
	return out
}

func validateLeastPrivilegeScopes(actual, allowed []string) error {
	actual = normalizeScopes(actual)
	allowed = normalizeScopes(allowed)
	allowedSet := map[string]struct{}{}
	for _, scope := range allowed {
		allowedSet[scope] = struct{}{}
	}
	extra := make([]string, 0)
	for _, scope := range actual {
		if _, ok := allowedSet[scope]; !ok {
			extra = append(extra, scope)
		}
	}
	if len(extra) > 0 {
		return goerrors.New("oauth scopes exceed least-privilege policy", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeGoogleScopeViolation)).
			WithMetadata(map[string]any{"extra_scopes": extra, "allowed_scopes": allowed})
	}
	required := GoogleScopeDriveReadonly
	hasRequired := false
	for _, scope := range actual {
		if scope == required {
			hasRequired = true
			break
		}
	}
	if !hasRequired {
		return goerrors.New("oauth scopes missing required permissions", goerrors.CategoryValidation).
			WithCode(http.StatusBadRequest).
			WithTextCode(string(ErrorCodeGoogleScopeViolation)).
			WithMetadata(map[string]any{"required_scope": required, "scopes": actual})
	}
	return nil
}

func isNotFound(err error) bool {
	if err == nil {
		return false
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		return strings.EqualFold(strings.TrimSpace(coded.TextCode), "NOT_FOUND") || coded.Code == http.StatusNotFound
	}
	return false
}

func googleTelemetryReason(err error) string {
	if err == nil {
		return ""
	}
	var providerErr *GoogleProviderError
	if errors.As(err, &providerErr) && providerErr != nil {
		return normalizeGoogleTelemetryReason(string(providerErr.Code))
	}
	var coded *goerrors.Error
	if errors.As(err, &coded) {
		code := strings.TrimSpace(coded.TextCode)
		if code != "" {
			return normalizeGoogleTelemetryReason(code)
		}
	}
	return "unknown"
}

func normalizeGoogleTelemetryReason(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return "unknown"
	}
	value = strings.ReplaceAll(value, " ", "_")
	value = strings.ReplaceAll(value, "-", "_")
	value = strings.ReplaceAll(value, ".", "_")
	return value
}

func googleImportObjectKey(scope stores.Scope, fileID string, exportedAt time.Time) string {
	timestamp := exportedAt.UTC().Format("20060102T150405Z")
	return fmt.Sprintf("tenant/%s/org/%s/docs/google/%s-%s.pdf",
		strings.TrimSpace(scope.TenantID),
		strings.TrimSpace(scope.OrgID),
		strings.TrimSpace(fileID),
		timestamp,
	)
}

func cloneGoogleTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	copy := src.UTC()
	return &copy
}
