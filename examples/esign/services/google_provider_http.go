package services

import (
	"context"
	"encoding/json"
	"fmt"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/internal/primitives"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	GoogleProviderModeReal          = "real"
	GoogleProviderModeDeterministic = "deterministic"

	EnvGoogleProviderMode = "APP_GOOGLE__PROVIDER_MODE"
	EnvGoogleClientID     = "APP_GOOGLE__CLIENT_ID"
	// #nosec G101 -- configuration key name, not an embedded credential.
	EnvGoogleClientSecret     = "APP_GOOGLE__CLIENT_SECRET"
	EnvGoogleOAuthRedirectURI = "APP_GOOGLE__OAUTH_REDIRECT_URI"
	// #nosec G101 -- OAuth endpoint constant, not a credential.
	EnvGoogleTokenEndpoint      = "APP_GOOGLE__TOKEN_ENDPOINT"
	EnvGoogleRevokeEndpoint     = "APP_GOOGLE__REVOKE_ENDPOINT"
	EnvGoogleDriveBaseURL       = "APP_GOOGLE__DRIVE_BASE_URL"
	EnvGoogleUserInfoEndpoint   = "APP_GOOGLE__USERINFO_ENDPOINT"
	EnvGoogleHealthEndpoint     = "APP_GOOGLE__HEALTH_ENDPOINT"
	EnvGoogleHTTPTimeoutSeconds = "APP_GOOGLE__HTTP_TIMEOUT_SECONDS"
)

const (
	// #nosec G101 -- OAuth endpoint constant, not a credential.
	defaultGoogleTokenEndpoint      = "https://oauth2.googleapis.com/token"
	defaultGoogleRevokeEndpoint     = "https://oauth2.googleapis.com/revoke"
	defaultGoogleDriveBaseURL       = "https://www.googleapis.com/drive/v3"
	defaultGoogleUserInfoEndpoint   = "https://www.googleapis.com/oauth2/v2/userinfo"
	defaultGoogleHealthEndpoint     = "https://www.googleapis.com/generate_204"
	defaultGoogleHTTPTimeoutSeconds = 10
)

type GoogleHTTPProviderConfig struct {
	ClientID         string       `json:"client_id"`
	ClientSecret     string       `json:"client_secret"`
	TokenEndpoint    string       `json:"token_endpoint"`
	RevokeEndpoint   string       `json:"revoke_endpoint"`
	DriveBaseURL     string       `json:"drive_base_url"`
	UserInfoEndpoint string       `json:"user_info_endpoint"`
	HealthEndpoint   string       `json:"health_endpoint"`
	HTTPClient       *http.Client `json:"http_client"`
}

type GoogleHTTPProvider struct {
	client           *http.Client
	clientID         string
	clientSecret     string
	tokenEndpoint    string
	revokeEndpoint   string
	driveBaseURL     string
	userInfoEndpoint string
	healthEndpoint   string
}

type googleDriveFilePayload struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	MimeType     string   `json:"mimeType"`
	WebViewLink  string   `json:"webViewLink"`
	DriveID      string   `json:"driveId"`
	Parents      []string `json:"parents"`
	ModifiedTime string   `json:"modifiedTime"`
	Owners       []struct {
		EmailAddress string `json:"emailAddress"`
	} `json:"owners"`
}

// ResolveGoogleProviderMode returns the configured runtime provider mode.
// Default is "real" so production wiring does not silently fall back to deterministic behavior.
func ResolveGoogleProviderMode() string {
	mode := strings.ToLower(strings.TrimSpace(appcfg.Active().Google.ProviderMode))
	switch mode {
	case "", GoogleProviderModeReal:
		return GoogleProviderModeReal
	case GoogleProviderModeDeterministic:
		return GoogleProviderModeDeterministic
	default:
		return mode
	}
}

// NewGoogleProviderFromEnv resolves runtime provider wiring from environment.
func NewGoogleProviderFromEnv() (GoogleProvider, string, error) {
	mode := ResolveGoogleProviderMode()
	switch mode {
	case GoogleProviderModeDeterministic:
		return NewDeterministicGoogleProvider(), mode, nil
	case GoogleProviderModeReal:
		provider, err := NewGoogleHTTPProviderFromEnv()
		if err != nil {
			return nil, mode, err
		}
		return provider, mode, nil
	default:
		return nil, mode, fmt.Errorf("unsupported google provider mode: %s", mode)
	}
}

// NewGoogleHTTPProviderFromEnv builds the real HTTP-backed provider from env configuration.
func NewGoogleHTTPProviderFromEnv() (*GoogleHTTPProvider, error) {
	runtimeCfg := appcfg.Active()
	timeoutSeconds := runtimeCfg.Google.HTTPTimeoutSeconds
	if timeoutSeconds <= 0 {
		timeoutSeconds = defaultGoogleHTTPTimeoutSeconds
	}
	return NewGoogleHTTPProvider(GoogleHTTPProviderConfig{
		ClientID:         strings.TrimSpace(runtimeCfg.Google.ClientID),
		ClientSecret:     strings.TrimSpace(runtimeCfg.Google.ClientSecret),
		TokenEndpoint:    primitives.FirstNonEmpty(strings.TrimSpace(runtimeCfg.Google.TokenEndpoint), defaultGoogleTokenEndpoint),
		RevokeEndpoint:   primitives.FirstNonEmpty(strings.TrimSpace(runtimeCfg.Google.RevokeEndpoint), defaultGoogleRevokeEndpoint),
		DriveBaseURL:     primitives.FirstNonEmpty(strings.TrimSpace(runtimeCfg.Google.DriveBaseURL), defaultGoogleDriveBaseURL),
		UserInfoEndpoint: primitives.FirstNonEmpty(strings.TrimSpace(runtimeCfg.Google.UserInfoEndpoint), defaultGoogleUserInfoEndpoint),
		HealthEndpoint:   primitives.FirstNonEmpty(strings.TrimSpace(runtimeCfg.Google.HealthEndpoint), defaultGoogleHealthEndpoint),
		HTTPClient: &http.Client{
			Timeout: time.Duration(timeoutSeconds) * time.Second,
		},
	})
}

func NewGoogleHTTPProvider(cfg GoogleHTTPProviderConfig) (*GoogleHTTPProvider, error) {
	if strings.TrimSpace(cfg.ClientID) == "" {
		return nil, fmt.Errorf("%s is required when google provider mode is real", EnvGoogleClientID)
	}
	if strings.TrimSpace(cfg.ClientSecret) == "" {
		return nil, fmt.Errorf("%s is required when google provider mode is real", EnvGoogleClientSecret)
	}
	tokenEndpoint := primitives.FirstNonEmpty(strings.TrimSpace(cfg.TokenEndpoint), defaultGoogleTokenEndpoint)
	revokeEndpoint := primitives.FirstNonEmpty(strings.TrimSpace(cfg.RevokeEndpoint), defaultGoogleRevokeEndpoint)
	driveBaseURL := primitives.FirstNonEmpty(strings.TrimSpace(cfg.DriveBaseURL), defaultGoogleDriveBaseURL)
	userInfoEndpoint := primitives.FirstNonEmpty(strings.TrimSpace(cfg.UserInfoEndpoint), defaultGoogleUserInfoEndpoint)
	healthEndpoint := primitives.FirstNonEmpty(strings.TrimSpace(cfg.HealthEndpoint), defaultGoogleHealthEndpoint)

	for envKey, endpoint := range map[string]string{
		EnvGoogleTokenEndpoint:    tokenEndpoint,
		EnvGoogleRevokeEndpoint:   revokeEndpoint,
		EnvGoogleDriveBaseURL:     driveBaseURL,
		EnvGoogleUserInfoEndpoint: userInfoEndpoint,
		EnvGoogleHealthEndpoint:   healthEndpoint,
	} {
		if _, err := url.ParseRequestURI(endpoint); err != nil {
			return nil, fmt.Errorf("invalid %s: %w", envKey, err)
		}
	}

	client := cfg.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: defaultGoogleHTTPTimeoutSeconds * time.Second}
	}

	return &GoogleHTTPProvider{
		client:           client,
		clientID:         strings.TrimSpace(cfg.ClientID),
		clientSecret:     strings.TrimSpace(cfg.ClientSecret),
		tokenEndpoint:    tokenEndpoint,
		revokeEndpoint:   revokeEndpoint,
		driveBaseURL:     strings.TrimRight(driveBaseURL, "/"),
		userInfoEndpoint: userInfoEndpoint,
		healthEndpoint:   healthEndpoint,
	}, nil
}

func (p *GoogleHTTPProvider) HealthCheck(ctx context.Context) error {
	if p == nil {
		return fmt.Errorf("google provider not configured")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.healthEndpoint, nil)
	if err != nil {
		return err
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("google provider health request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return fmt.Errorf("google provider health status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (p *GoogleHTTPProvider) ExchangeCode(ctx context.Context, authCode, redirectURI string, requestedScopes []string) (GoogleOAuthToken, error) {
	if p == nil {
		return GoogleOAuthToken{}, fmt.Errorf("google provider not configured")
	}
	authCode = strings.TrimSpace(authCode)
	if authCode == "" {
		return GoogleOAuthToken{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "missing authorization code", nil)
	}
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", authCode)
	form.Set("client_id", p.clientID)
	form.Set("client_secret", p.clientSecret)
	if strings.TrimSpace(redirectURI) != "" {
		form.Set("redirect_uri", strings.TrimSpace(redirectURI))
	}
	respBody, statusCode, err := p.requestForm(ctx, http.MethodPost, p.tokenEndpoint, form, nil)
	if err != nil {
		return GoogleOAuthToken{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleOAuthToken{}, mapGoogleHTTPStatus("oauth_token_exchange", statusCode, respBody, map[string]any{"auth_code_present": true})
	}
	var payload struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		Scope        string `json:"scope"`
		ExpiresIn    int64  `json:"expires_in"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return GoogleOAuthToken{}, fmt.Errorf("decode google oauth token response: %w", err)
	}
	accessToken := strings.TrimSpace(payload.AccessToken)
	if accessToken == "" {
		return GoogleOAuthToken{}, fmt.Errorf("google oauth token response missing access_token")
	}
	scopes := parseGoogleScopeString(payload.Scope)
	if len(scopes) == 0 {
		scopes = normalizeScopes(requestedScopes)
	}
	expiresAt := time.Time{}
	if payload.ExpiresIn > 0 {
		expiresAt = time.Now().UTC().Add(time.Duration(payload.ExpiresIn) * time.Second)
	}
	accountEmail, _ := p.fetchUserEmail(ctx, accessToken)
	return GoogleOAuthToken{
		AccessToken:  accessToken,
		RefreshToken: strings.TrimSpace(payload.RefreshToken),
		Scopes:       scopes,
		ExpiresAt:    expiresAt,
		AccountEmail: accountEmail,
	}, nil
}

func (p *GoogleHTTPProvider) RevokeToken(ctx context.Context, accessToken string) error {
	if p == nil {
		return fmt.Errorf("google provider not configured")
	}
	accessToken = strings.TrimSpace(accessToken)
	if accessToken == "" {
		return nil
	}
	form := url.Values{}
	form.Set("token", accessToken)
	respBody, statusCode, err := p.requestForm(ctx, http.MethodPost, p.revokeEndpoint, form, nil)
	if err != nil {
		return err
	}
	if statusCode == http.StatusBadRequest {
		// Google returns 400 for already-invalid tokens; treat as no-op revoke.
		return nil
	}
	if statusCode >= http.StatusBadRequest {
		return mapGoogleHTTPStatus("oauth_revoke", statusCode, respBody, nil)
	}
	return nil
}

func (p *GoogleHTTPProvider) SearchFiles(ctx context.Context, accessToken, query, pageToken string, pageSize int) (GoogleDriveListResult, error) {
	if p == nil {
		return GoogleDriveListResult{}, fmt.Errorf("google provider not configured")
	}
	if pageSize <= 0 {
		pageSize = 25
	}
	if pageSize > 100 {
		pageSize = 100
	}
	params := url.Values{}
	params.Set("fields", "nextPageToken,files(id,name,mimeType,webViewLink,driveId,parents,modifiedTime,owners(emailAddress))")
	params.Set("pageSize", strconv.Itoa(pageSize))
	params.Set("q", buildGoogleSearchQuery(query))
	if strings.TrimSpace(pageToken) != "" {
		params.Set("pageToken", strings.TrimSpace(pageToken))
	}
	endpoint := p.driveBaseURL + "/files?" + params.Encode()
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleDriveListResult{}, mapGoogleHTTPStatus("drive_search", statusCode, respBody, nil)
	}
	var payload struct {
		NextPageToken string                   `json:"nextPageToken"`
		Files         []googleDriveFilePayload `json:"files"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return GoogleDriveListResult{}, fmt.Errorf("decode google drive search response: %w", err)
	}
	return GoogleDriveListResult{
		Files:         decodeGoogleDriveFiles(payload.Files),
		NextPageToken: strings.TrimSpace(payload.NextPageToken),
	}, nil
}

func (p *GoogleHTTPProvider) BrowseFiles(ctx context.Context, accessToken, folderID, pageToken string, pageSize int) (GoogleDriveListResult, error) {
	if p == nil {
		return GoogleDriveListResult{}, fmt.Errorf("google provider not configured")
	}
	if pageSize <= 0 {
		pageSize = 25
	}
	if pageSize > 100 {
		pageSize = 100
	}
	folderID = strings.TrimSpace(folderID)
	if folderID == "" {
		folderID = "root"
	}
	params := url.Values{}
	params.Set("fields", "nextPageToken,files(id,name,mimeType,webViewLink,driveId,parents,modifiedTime,owners(emailAddress))")
	params.Set("pageSize", strconv.Itoa(pageSize))
	params.Set("q", fmt.Sprintf("'%s' in parents and trashed = false", escapeGoogleDriveQueryValue(folderID)))
	if strings.TrimSpace(pageToken) != "" {
		params.Set("pageToken", strings.TrimSpace(pageToken))
	}
	endpoint := p.driveBaseURL + "/files?" + params.Encode()
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
	if err != nil {
		return GoogleDriveListResult{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleDriveListResult{}, mapGoogleHTTPStatus("drive_browse", statusCode, respBody, map[string]any{"folder_id": folderID})
	}
	var payload struct {
		NextPageToken string                   `json:"nextPageToken"`
		Files         []googleDriveFilePayload `json:"files"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return GoogleDriveListResult{}, fmt.Errorf("decode google drive browse response: %w", err)
	}
	return GoogleDriveListResult{
		Files:         decodeGoogleDriveFiles(payload.Files),
		NextPageToken: strings.TrimSpace(payload.NextPageToken),
	}, nil
}

func (p *GoogleHTTPProvider) GetFile(ctx context.Context, accessToken, fileID string) (GoogleDriveFile, error) {
	if p == nil {
		return GoogleDriveFile{}, fmt.Errorf("google provider not configured")
	}
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return GoogleDriveFile{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "google_file_id is required", nil)
	}
	return p.fetchDriveFileMetadata(ctx, accessToken, fileID)
}

func (p *GoogleHTTPProvider) ExportFilePDF(ctx context.Context, accessToken, fileID string) (GoogleExportSnapshot, error) {
	if p == nil {
		return GoogleExportSnapshot{}, fmt.Errorf("google provider not configured")
	}
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return GoogleExportSnapshot{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "google_file_id is required", nil)
	}

	metadata, err := p.fetchDriveFileMetadata(ctx, accessToken, fileID)
	if err != nil {
		return GoogleExportSnapshot{}, err
	}
	endpoint := fmt.Sprintf("%s/files/%s/export?mimeType=application/pdf", p.driveBaseURL, url.PathEscape(fileID))
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
	if err != nil {
		return GoogleExportSnapshot{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleExportSnapshot{}, mapGoogleHTTPStatus("drive_export_pdf", statusCode, respBody, map[string]any{"file_id": fileID})
	}
	return GoogleExportSnapshot{File: metadata, PDF: append([]byte{}, respBody...)}, nil
}

func (p *GoogleHTTPProvider) DownloadFilePDF(ctx context.Context, accessToken, fileID string) (GoogleExportSnapshot, error) {
	if p == nil {
		return GoogleExportSnapshot{}, fmt.Errorf("google provider not configured")
	}
	fileID = strings.TrimSpace(fileID)
	if fileID == "" {
		return GoogleExportSnapshot{}, NewGoogleProviderError(GoogleProviderErrorPermissionDenied, "google_file_id is required", nil)
	}

	metadata, err := p.fetchDriveFileMetadata(ctx, accessToken, fileID)
	if err != nil {
		return GoogleExportSnapshot{}, err
	}
	endpoint := fmt.Sprintf("%s/files/%s?alt=media", p.driveBaseURL, url.PathEscape(fileID))
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
	if err != nil {
		return GoogleExportSnapshot{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleExportSnapshot{}, mapGoogleHTTPStatus("drive_download_pdf", statusCode, respBody, map[string]any{"file_id": fileID})
	}
	return GoogleExportSnapshot{File: metadata, PDF: append([]byte{}, respBody...)}, nil
}

func (p *GoogleHTTPProvider) fetchDriveFileMetadata(ctx context.Context, accessToken, fileID string) (GoogleDriveFile, error) {
	params := url.Values{}
	params.Set("fields", "id,name,mimeType,webViewLink,driveId,parents,modifiedTime,owners(emailAddress)")
	endpoint := fmt.Sprintf("%s/files/%s?%s", p.driveBaseURL, url.PathEscape(fileID), params.Encode())
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, endpoint, accessToken, nil)
	if err != nil {
		return GoogleDriveFile{}, err
	}
	if statusCode >= http.StatusBadRequest {
		return GoogleDriveFile{}, mapGoogleHTTPStatus("drive_file_metadata", statusCode, respBody, map[string]any{"file_id": fileID})
	}
	var payload struct {
		ID           string   `json:"id"`
		Name         string   `json:"name"`
		MimeType     string   `json:"mimeType"`
		WebViewLink  string   `json:"webViewLink"`
		DriveID      string   `json:"driveId"`
		Parents      []string `json:"parents"`
		ModifiedTime string   `json:"modifiedTime"`
		Owners       []struct {
			EmailAddress string `json:"emailAddress"`
		} `json:"owners"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return GoogleDriveFile{}, fmt.Errorf("decode google drive metadata response: %w", err)
	}
	modifiedAt, _ := parseGoogleTime(payload.ModifiedTime)
	ownerEmail := ""
	if len(payload.Owners) > 0 {
		ownerEmail = strings.TrimSpace(payload.Owners[0].EmailAddress)
	}
	parentID := ""
	if len(payload.Parents) > 0 {
		parentID = strings.TrimSpace(payload.Parents[0])
	}
	return GoogleDriveFile{
		ID:           strings.TrimSpace(payload.ID),
		Name:         strings.TrimSpace(payload.Name),
		MimeType:     strings.TrimSpace(payload.MimeType),
		WebViewURL:   strings.TrimSpace(payload.WebViewLink),
		OwnerEmail:   ownerEmail,
		DriveID:      strings.TrimSpace(payload.DriveID),
		ParentID:     parentID,
		ModifiedTime: modifiedAt,
	}, nil
}

func (p *GoogleHTTPProvider) fetchUserEmail(ctx context.Context, accessToken string) (string, error) {
	respBody, statusCode, err := p.requestJSON(ctx, http.MethodGet, p.userInfoEndpoint, accessToken, nil)
	if err != nil {
		return "", err
	}
	if statusCode >= http.StatusBadRequest {
		return "", mapGoogleHTTPStatus("oauth_userinfo", statusCode, respBody, nil)
	}
	var payload struct {
		Email string `json:"email"`
	}
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return "", fmt.Errorf("decode google userinfo response: %w", err)
	}
	return strings.TrimSpace(payload.Email), nil
}

func (p *GoogleHTTPProvider) ResolveAccountEmail(ctx context.Context, accessToken string) (string, error) {
	if p == nil {
		return "", fmt.Errorf("google provider not configured")
	}
	accessToken = strings.TrimSpace(accessToken)
	if accessToken == "" {
		return "", nil
	}
	return p.fetchUserEmail(ctx, accessToken)
}

func (p *GoogleHTTPProvider) requestForm(ctx context.Context, method, endpoint string, form url.Values, headers map[string]string) ([]byte, int, error) {
	body := strings.NewReader(form.Encode())
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	for key, value := range headers {
		if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, 0, err
	}
	return payload, resp.StatusCode, nil
}

func (p *GoogleHTTPProvider) requestJSON(ctx context.Context, method, endpoint, accessToken string, headers map[string]string) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, method, endpoint, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Accept", "application/json")
	if token := strings.TrimSpace(accessToken); token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for key, value := range headers {
		if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, 0, err
	}
	return payload, resp.StatusCode, nil
}

func decodeGoogleDriveFiles(in []googleDriveFilePayload) []GoogleDriveFile {
	out := make([]GoogleDriveFile, 0, len(in))
	for _, record := range in {
		modifiedAt, _ := parseGoogleTime(record.ModifiedTime)
		ownerEmail := ""
		if len(record.Owners) > 0 {
			ownerEmail = strings.TrimSpace(record.Owners[0].EmailAddress)
		}
		parentID := ""
		if len(record.Parents) > 0 {
			parentID = strings.TrimSpace(record.Parents[0])
		}
		out = append(out, GoogleDriveFile{
			ID:           strings.TrimSpace(record.ID),
			Name:         strings.TrimSpace(record.Name),
			MimeType:     strings.TrimSpace(record.MimeType),
			WebViewURL:   strings.TrimSpace(record.WebViewLink),
			OwnerEmail:   ownerEmail,
			DriveID:      strings.TrimSpace(record.DriveID),
			ParentID:     parentID,
			ModifiedTime: modifiedAt,
		})
	}
	return out
}

func parseGoogleTime(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, err
	}
	return parsed.UTC(), nil
}

func parseGoogleScopeString(value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	parts := strings.Fields(value)
	return normalizeScopes(parts)
}

func buildGoogleSearchQuery(query string) string {
	query = strings.TrimSpace(query)
	if query == "" {
		return "trashed = false"
	}
	return fmt.Sprintf("trashed = false and name contains '%s'", escapeGoogleDriveQueryValue(query))
}

func escapeGoogleDriveQueryValue(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "'", "\\'")
	return value
}

func mapGoogleHTTPStatus(operation string, statusCode int, body []byte, metadata map[string]any) error {
	message := strings.TrimSpace(extractGoogleErrorMessage(body))
	if message == "" {
		message = fmt.Sprintf("google %s failed with status %d", strings.TrimSpace(operation), statusCode)
	}
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadata["http_status"] = statusCode
	metadata["operation"] = strings.TrimSpace(operation)
	switch statusCode {
	case http.StatusUnauthorized:
		return NewGoogleProviderError(GoogleProviderErrorAccessRevoked, message, metadata)
	case http.StatusForbidden, http.StatusNotFound:
		return NewGoogleProviderError(GoogleProviderErrorPermissionDenied, message, metadata)
	case http.StatusTooManyRequests:
		return NewGoogleProviderError(GoogleProviderErrorRateLimited, message, metadata)
	default:
		if statusCode >= http.StatusInternalServerError {
			return NewGoogleProviderError(GoogleProviderErrorUnavailable, message, metadata)
		}
		lower := strings.ToLower(message)
		if strings.Contains(lower, "invalid_grant") || strings.Contains(lower, "token has been expired") {
			return NewGoogleProviderError(GoogleProviderErrorAccessRevoked, message, metadata)
		}
		return NewGoogleProviderError(GoogleProviderErrorPermissionDenied, message, metadata)
	}
}

func extractGoogleErrorMessage(body []byte) string {
	trimmed := strings.TrimSpace(string(body))
	if trimmed == "" {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		if len(trimmed) > 240 {
			return strings.TrimSpace(trimmed[:240])
		}
		return trimmed
	}
	if v, ok := payload["error_description"].(string); ok && strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	errorValue, ok := payload["error"]
	if !ok {
		return trimmed
	}
	switch v := errorValue.(type) {
	case string:
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	case map[string]any:
		if msg, ok := v["message"].(string); ok && strings.TrimSpace(msg) != "" {
			return strings.TrimSpace(msg)
		}
		if status, ok := v["status"].(string); ok && strings.TrimSpace(status) != "" {
			return strings.TrimSpace(status)
		}
	}
	return trimmed
}
