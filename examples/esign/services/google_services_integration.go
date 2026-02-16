package services

import (
	"context"
	"fmt"
	"net/http"
	"path"
	"strings"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
	servicesmodule "github.com/goliatone/go-admin/modules/services"
	goerrors "github.com/goliatone/go-errors"
	gocore "github.com/goliatone/go-services/core"
)

const defaultGoogleServicesProviderID = "google_drive"

// GoogleServicesIntegrationService bridges the legacy e-sign Google endpoints
// to the go-admin/services module runtime.
type GoogleServicesIntegrationService struct {
	module        *servicesmodule.Module
	provider      GoogleProvider
	providerMode  string
	providerID    string
	documents     GoogleDocumentUploader
	agreements    GoogleAgreementCreator
	now           func() time.Time
	allowedScopes []string
}

// NewGoogleServicesIntegrationService creates a Google integration facade backed by go-services.
func NewGoogleServicesIntegrationService(
	module *servicesmodule.Module,
	provider GoogleProvider,
	providerMode string,
	documents GoogleDocumentUploader,
	agreements GoogleAgreementCreator,
) GoogleServicesIntegrationService {
	resolvedMode := normalizeGoogleProviderMode(providerMode)
	if resolvedMode == "" {
		resolvedMode = inferGoogleProviderMode(provider)
	}
	if resolvedMode == "" {
		resolvedMode = GoogleProviderModeReal
	}
	return GoogleServicesIntegrationService{
		module:        module,
		provider:      provider,
		providerMode:  resolvedMode,
		providerID:    defaultGoogleServicesProviderID,
		documents:     documents,
		agreements:    agreements,
		now:           func() time.Time { return time.Now().UTC() },
		allowedScopes: normalizeScopes(DefaultGoogleOAuthScopes),
	}
}

// Connect exchanges the auth code through the services runtime and stores credentials in go-services tables.
func (s GoogleServicesIntegrationService) Connect(ctx context.Context, scope stores.Scope, input GoogleConnectInput) (GoogleOAuthStatus, error) {
	svc, err := s.serviceRuntime()
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	if err := s.ensureProviderHealthy(ctx); err != nil {
		return GoogleOAuthStatus{}, err
	}
	userID := normalizeRequiredID("google", "user_id", input.UserID)
	if userID == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "user_id", "required")
	}
	authCode := strings.TrimSpace(input.AuthCode)
	if authCode == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "auth_code", "required")
	}
	resolvedScope := s.scopeRef(scope, userID)

	begin, err := svc.Connect(ctx, gocore.ConnectRequest{
		ProviderID:      s.googleProviderID(),
		Scope:           resolvedScope,
		RedirectURI:     strings.TrimSpace(input.RedirectURI),
		RequestedGrants: append([]string(nil), s.allowedScopes...),
		Metadata: map[string]any{
			"user_id": userID,
		},
	})
	if err != nil {
		return GoogleOAuthStatus{}, err
	}

	completion, err := svc.CompleteCallback(ctx, gocore.CompleteAuthRequest{
		ProviderID:  s.googleProviderID(),
		Scope:       resolvedScope,
		Code:        authCode,
		State:       strings.TrimSpace(begin.State),
		RedirectURI: strings.TrimSpace(input.RedirectURI),
		Metadata: map[string]any{
			"user_id": userID,
		},
	})
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleOAuthStatus{}, err
	}

	scopes := normalizeScopes(completion.Credential.GrantedScopes)
	if len(scopes) == 0 {
		scopes = normalizeScopes(completion.Credential.RequestedScopes)
	}
	least := validateLeastPrivilegeScopes(scopes, s.allowedScopes) == nil
	var expiresAt *time.Time
	if !completion.Credential.ExpiresAt.IsZero() {
		expires := completion.Credential.ExpiresAt.UTC()
		expiresAt = &expires
	}

	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	observability.ObserveGoogleAuthChurn(ctx, "oauth_connected")
	health := s.ProviderHealth(ctx)
	return GoogleOAuthStatus{
		Provider:        GoogleProviderName,
		ProviderMode:    health.Mode,
		UserID:          userID,
		Connected:       true,
		Scopes:          scopes,
		ExpiresAt:       expiresAt,
		LeastPrivilege:  least,
		Healthy:         health.Healthy,
		Degraded:        !health.Healthy,
		DegradedReason:  health.Reason,
		HealthCheckedAt: cloneGoogleTimePtr(health.CheckedAt),
	}, nil
}

// Disconnect revokes Google access (best effort) and marks the services connection as disconnected.
func (s GoogleServicesIntegrationService) Disconnect(ctx context.Context, scope stores.Scope, userID string) error {
	svc, err := s.serviceRuntime()
	if err != nil {
		return err
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return domainValidationError("google", "user_id", "required")
	}
	connection, found, err := s.findScopedConnection(ctx, svc, scope, userID)
	if err != nil {
		return err
	}
	if !found {
		return nil
	}
	if s.provider != nil {
		if accessToken, _, tokenErr := s.resolveAccessToken(ctx, scope, userID); tokenErr == nil {
			if revokeErr := s.provider.RevokeToken(ctx, accessToken); revokeErr != nil {
				observability.ObserveProviderResult(ctx, GoogleProviderName, false)
				return MapGoogleProviderError(revokeErr)
			}
		}
	}
	if err := svc.Revoke(ctx, connection.ID, "google integration disconnected"); err != nil {
		return err
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	observability.ObserveGoogleAuthChurn(ctx, "oauth_disconnected")
	return nil
}

// Status returns OAuth connection status based on go-services connection and credential rows.
func (s GoogleServicesIntegrationService) Status(ctx context.Context, scope stores.Scope, userID string) (GoogleOAuthStatus, error) {
	svc, err := s.serviceRuntime()
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	health := s.ProviderHealth(ctx)
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return GoogleOAuthStatus{}, domainValidationError("google", "user_id", "required")
	}
	connection, found, err := s.findScopedConnection(ctx, svc, scope, userID)
	if err != nil {
		return GoogleOAuthStatus{}, err
	}
	if !found {
		return GoogleOAuthStatus{
			Provider:        GoogleProviderName,
			ProviderMode:    health.Mode,
			UserID:          userID,
			Connected:       false,
			Scopes:          []string{},
			LeastPrivilege:  false,
			Healthy:         health.Healthy,
			Degraded:        !health.Healthy,
			DegradedReason:  health.Reason,
			HealthCheckedAt: cloneGoogleTimePtr(health.CheckedAt),
		}, nil
	}

	active, activeErr := s.resolveActiveCredential(ctx, svc, connection.ID)
	scopes := []string{}
	var expiresAt *time.Time
	if activeErr == nil {
		scopes = normalizeScopes(active.GrantedScopes)
		if len(scopes) == 0 {
			scopes = normalizeScopes(active.RequestedScopes)
		}
		if active.ExpiresAt != nil {
			expiresAt = cloneGoogleTimePtr(active.ExpiresAt)
		}
	} else if !isNotFound(activeErr) {
		return GoogleOAuthStatus{}, activeErr
	}

	least := len(scopes) > 0 && validateLeastPrivilegeScopes(scopes, s.allowedScopes) == nil
	connected := !strings.EqualFold(strings.TrimSpace(string(connection.Status)), string(gocore.ConnectionStatusDisconnected))

	return GoogleOAuthStatus{
		Provider:        GoogleProviderName,
		ProviderMode:    health.Mode,
		UserID:          userID,
		Connected:       connected,
		Scopes:          scopes,
		ExpiresAt:       expiresAt,
		LeastPrivilege:  least,
		Healthy:         health.Healthy,
		Degraded:        !health.Healthy,
		DegradedReason:  health.Reason,
		HealthCheckedAt: cloneGoogleTimePtr(health.CheckedAt),
	}, nil
}

// RotateCredentialEncryption is a compatibility no-op under go-services-backed storage.
func (s GoogleServicesIntegrationService) RotateCredentialEncryption(ctx context.Context, scope stores.Scope, userID string) (GoogleOAuthStatus, error) {
	return s.Status(ctx, scope, userID)
}

// SearchFiles searches Drive files using the access token resolved from go-services credentials.
func (s GoogleServicesIntegrationService) SearchFiles(ctx context.Context, scope stores.Scope, input GoogleDriveQueryInput) (GoogleDriveListResult, error) {
	if err := s.ensureProviderHealthy(ctx); err != nil {
		return GoogleDriveListResult{}, err
	}
	if s.provider == nil {
		return GoogleDriveListResult{}, domainValidationError("google", "service", "provider not configured")
	}
	accessToken, _, err := s.resolveAccessToken(ctx, scope, input.UserID)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	pageSize := normalizeDrivePageSize(input.PageSize)
	result, err := s.provider.SearchFiles(ctx, accessToken, strings.TrimSpace(input.Query), strings.TrimSpace(input.PageToken), pageSize)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleDriveListResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	return result, nil
}

// BrowseFiles lists Drive folder files using go-services-backed credentials.
func (s GoogleServicesIntegrationService) BrowseFiles(ctx context.Context, scope stores.Scope, input GoogleDriveQueryInput) (GoogleDriveListResult, error) {
	if err := s.ensureProviderHealthy(ctx); err != nil {
		return GoogleDriveListResult{}, err
	}
	if s.provider == nil {
		return GoogleDriveListResult{}, domainValidationError("google", "service", "provider not configured")
	}
	accessToken, _, err := s.resolveAccessToken(ctx, scope, input.UserID)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	pageSize := normalizeDrivePageSize(input.PageSize)
	result, err := s.provider.BrowseFiles(ctx, accessToken, strings.TrimSpace(input.FolderID), strings.TrimSpace(input.PageToken), pageSize)
	if err != nil {
		observability.ObserveProviderResult(ctx, GoogleProviderName, false)
		return GoogleDriveListResult{}, MapGoogleProviderError(err)
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, true)
	return result, nil
}

// ImportDocument exports a Google Doc as PDF and persists the imported e-sign draft entities.
func (s GoogleServicesIntegrationService) ImportDocument(ctx context.Context, scope stores.Scope, input GoogleImportInput) (result GoogleImportResult, err error) {
	defer func() {
		observability.ObserveGoogleImport(ctx, err == nil, googleTelemetryReason(err))
	}()
	if err := s.ensureProviderHealthy(ctx); err != nil {
		return GoogleImportResult{}, err
	}
	if s.provider == nil {
		return GoogleImportResult{}, domainValidationError("google", "service", "provider not configured")
	}
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

	return GoogleImportResult{Document: document, Agreement: agreement}, nil
}

// ProviderHealth reports provider/runtime health used for degraded-mode signaling.
func (s GoogleServicesIntegrationService) ProviderHealth(ctx context.Context) GoogleProviderHealthStatus {
	mode := strings.TrimSpace(s.providerMode)
	if mode == "" {
		mode = inferGoogleProviderMode(s.provider)
	}
	if mode == "" {
		mode = GoogleProviderModeReal
	}
	checkedAt := s.now().UTC()
	status := GoogleProviderHealthStatus{
		Mode:      mode,
		Healthy:   true,
		Reason:    "",
		CheckedAt: &checkedAt,
	}
	if s.module == nil || s.module.Service() == nil {
		status.Healthy = false
		status.Reason = "services_runtime_unavailable"
		return status
	}
	if s.provider == nil {
		status.Healthy = false
		status.Reason = "provider_not_configured"
		return status
	}
	checker, ok := s.provider.(googleProviderHealthChecker)
	if !ok || checker == nil {
		return status
	}
	if err := checker.HealthCheck(ctx); err != nil {
		status.Healthy = false
		status.Reason = normalizeGoogleTelemetryReason(err.Error())
	}
	return status
}

func (s GoogleServicesIntegrationService) serviceRuntime() (*gocore.Service, error) {
	if s.module == nil || s.module.Service() == nil {
		return nil, domainValidationError("google", "service", "services runtime is not configured")
	}
	return s.module.Service(), nil
}

func (s GoogleServicesIntegrationService) googleProviderID() string {
	providerID := strings.TrimSpace(s.providerID)
	if providerID == "" {
		providerID = defaultGoogleServicesProviderID
	}
	return providerID
}

func (s GoogleServicesIntegrationService) scopeRef(scope stores.Scope, userID string) gocore.ScopeRef {
	userID = strings.TrimSpace(userID)
	tenantID := strings.TrimSpace(scope.TenantID)
	orgID := strings.TrimSpace(scope.OrgID)
	if tenantID == "" && orgID == "" {
		return gocore.ScopeRef{Type: string(gocore.ScopeTypeUser), ID: userID}
	}
	segments := []string{}
	if tenantID != "" {
		segments = append(segments, "tenant", tenantID)
	}
	if orgID != "" {
		segments = append(segments, "org", orgID)
	}
	segments = append(segments, "user", userID)
	return gocore.ScopeRef{Type: string(gocore.ScopeTypeUser), ID: path.Join(segments...)}
}

func (s GoogleServicesIntegrationService) findScopedConnection(
	ctx context.Context,
	svc *gocore.Service,
	scope stores.Scope,
	userID string,
) (gocore.Connection, bool, error) {
	if svc == nil {
		return gocore.Connection{}, false, domainValidationError("google", "service", "services runtime is not configured")
	}
	deps := svc.Dependencies()
	if deps.ConnectionStore == nil {
		return gocore.Connection{}, false, domainValidationError("google", "service", "connection store is not configured")
	}
	rows, err := deps.ConnectionStore.FindByScope(ctx, s.googleProviderID(), s.scopeRef(scope, userID))
	if err != nil {
		return gocore.Connection{}, false, err
	}
	if len(rows) == 0 {
		return gocore.Connection{}, false, nil
	}
	priority := []gocore.ConnectionStatus{
		gocore.ConnectionStatusActive,
		gocore.ConnectionStatusNeedsReconsent,
		gocore.ConnectionStatusPendingReauth,
		gocore.ConnectionStatusErrored,
		gocore.ConnectionStatusDisconnected,
	}
	for _, status := range priority {
		for _, row := range rows {
			if row.Status == status {
				return row, true, nil
			}
		}
	}
	return rows[0], true, nil
}

func (s GoogleServicesIntegrationService) resolveActiveCredential(
	ctx context.Context,
	svc *gocore.Service,
	connectionID string,
) (gocore.ActiveCredential, error) {
	if svc == nil {
		return gocore.ActiveCredential{}, domainValidationError("google", "service", "services runtime is not configured")
	}
	deps := svc.Dependencies()
	if deps.CredentialStore == nil {
		return gocore.ActiveCredential{}, domainValidationError("google", "service", "credential store is not configured")
	}
	stored, err := deps.CredentialStore.GetActiveByConnection(ctx, strings.TrimSpace(connectionID))
	if err != nil {
		return gocore.ActiveCredential{}, err
	}
	return decodeActiveCredential(ctx, deps, stored)
}

func decodeActiveCredential(
	ctx context.Context,
	deps gocore.ServiceDependencies,
	stored gocore.Credential,
) (gocore.ActiveCredential, error) {
	active := gocore.ActiveCredential{ConnectionID: stored.ConnectionID}
	if len(stored.EncryptedPayload) > 0 {
		if deps.SecretProvider == nil {
			return gocore.ActiveCredential{}, fmt.Errorf("google: secret provider is required to decrypt credentials")
		}
		decrypted, err := deps.SecretProvider.Decrypt(ctx, stored.EncryptedPayload)
		if err != nil {
			return gocore.ActiveCredential{}, err
		}
		codec := resolvedCredentialCodec(deps, stored.PayloadFormat)
		decoded, decodeErr := codec.Decode(decrypted)
		if decodeErr != nil && !strings.EqualFold(codec.Format(), gocore.CredentialPayloadFormatLegacyToken) {
			legacy := gocore.LegacyTokenCredentialCodec{}
			decoded, decodeErr = legacy.Decode(decrypted)
		}
		if decodeErr != nil {
			return gocore.ActiveCredential{}, decodeErr
		}
		active = decoded
	}
	if strings.TrimSpace(active.ConnectionID) == "" {
		active.ConnectionID = stored.ConnectionID
	}
	if strings.TrimSpace(active.TokenType) == "" {
		active.TokenType = stored.TokenType
	}
	if len(active.RequestedScopes) == 0 {
		active.RequestedScopes = append([]string(nil), stored.RequestedScopes...)
	}
	if len(active.GrantedScopes) == 0 {
		active.GrantedScopes = append([]string(nil), stored.GrantedScopes...)
	}
	if stored.Refreshable && !active.Refreshable {
		active.Refreshable = true
	}
	if active.ExpiresAt == nil && !stored.ExpiresAt.IsZero() {
		expires := stored.ExpiresAt.UTC()
		active.ExpiresAt = &expires
	}
	if active.RotatesAt == nil && !stored.RotatesAt.IsZero() {
		rotates := stored.RotatesAt.UTC()
		active.RotatesAt = &rotates
	}
	return active, nil
}

func resolvedCredentialCodec(deps gocore.ServiceDependencies, payloadFormat string) gocore.CredentialCodec {
	trimmed := strings.TrimSpace(strings.ToLower(payloadFormat))
	if trimmed == strings.ToLower(gocore.CredentialPayloadFormatLegacyToken) {
		return gocore.LegacyTokenCredentialCodec{}
	}
	if deps.CredentialCodec != nil {
		return deps.CredentialCodec
	}
	return gocore.JSONCredentialCodec{}
}

func (s GoogleServicesIntegrationService) ensureProviderHealthy(ctx context.Context) error {
	health := s.ProviderHealth(ctx)
	if health.Healthy {
		return nil
	}
	observability.ObserveProviderResult(ctx, GoogleProviderName, false)
	metadata := map[string]any{
		"provider":      GoogleProviderName,
		"provider_mode": health.Mode,
		"reason":        health.Reason,
	}
	if health.CheckedAt != nil {
		metadata["checked_at"] = health.CheckedAt.UTC().Format(time.RFC3339Nano)
	}
	return goerrors.New("google provider degraded", goerrors.CategoryBadInput).
		WithCode(http.StatusServiceUnavailable).
		WithTextCode(string(ErrorCodeGoogleProviderDegraded)).
		WithMetadata(metadata)
}

func (s GoogleServicesIntegrationService) resolveAccessToken(ctx context.Context, scope stores.Scope, userID string) (string, string, error) {
	svc, err := s.serviceRuntime()
	if err != nil {
		return "", "", err
	}
	userID = normalizeRequiredID("google", "user_id", userID)
	if userID == "" {
		return "", "", domainValidationError("google", "user_id", "required")
	}
	connection, found, err := s.findScopedConnection(ctx, svc, scope, userID)
	if err != nil {
		return "", "", err
	}
	if !found {
		observability.ObserveGoogleAuthChurn(ctx, "disconnected")
		return "", "", goerrors.New("google integration disconnected", goerrors.CategoryAuthz).
			WithCode(http.StatusUnauthorized).
			WithTextCode(string(ErrorCodeGoogleAccessRevoked)).
			WithMetadata(map[string]any{"provider": GoogleProviderName, "user_id": userID})
	}

	active, err := s.resolveActiveCredential(ctx, svc, connection.ID)
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
	if err := validateLeastPrivilegeScopes(active.GrantedScopes, s.allowedScopes); err != nil {
		return "", "", err
	}
	accessToken := strings.TrimSpace(active.AccessToken)
	if accessToken == "" {
		observability.ObserveGoogleAuthChurn(ctx, "access_revoked")
		return "", "", goerrors.New("google integration access revoked", goerrors.CategoryAuthz).
			WithCode(http.StatusUnauthorized).
			WithTextCode(string(ErrorCodeGoogleAccessRevoked))
	}
	return accessToken, userID, nil
}

func normalizeDrivePageSize(pageSize int) int {
	if pageSize <= 0 {
		return 25
	}
	if pageSize > 100 {
		return 100
	}
	return pageSize
}
