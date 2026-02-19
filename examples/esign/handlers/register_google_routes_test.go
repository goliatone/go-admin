package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestRegisterGoogleRoutesFeatureGatedWhenDisabled(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminSettings)),
		WithGoogleIntegrationEnabled(false),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
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
	scope := defaultTestScope()
	newGoogle := func() GoogleIntegrationService {
		store := stores.NewInMemoryStore()
		return services.NewGoogleIntegrationService(
			store,
			services.NewDeterministicGoogleProvider(),
			services.NewDocumentService(store),
			services.NewAgreementService(store),
		)
	}

	authz := coreadmin.NewGoAuthAuthorizer(coreadmin.GoAuthAuthorizerConfig{
		DefaultResource: "admin",
		ResolvePermissions: func(ctx context.Context) ([]string, error) {
			claims, ok := auth.GetClaims(ctx)
			if !ok || claims == nil {
				return nil, nil
			}
			var raw any
			if carrier, ok := claims.(interface{ ClaimsMetadata() map[string]any }); ok && carrier != nil {
				if metadata := carrier.ClaimsMetadata(); len(metadata) > 0 {
					raw = metadata["permissions"]
				}
			}
			if raw == nil {
				if typed, ok := claims.(*auth.JWTClaims); ok && typed != nil && typed.Metadata != nil {
					raw = typed.Metadata["permissions"]
				}
			}
			if raw == nil {
				return nil, nil
			}
			if typed, ok := raw.([]string); ok {
				return append([]string{}, typed...), nil
			}
			if typed, ok := raw.([]any); ok {
				perms := make([]string, 0, len(typed))
				for _, item := range typed {
					value, ok := item.(string)
					if !ok {
						continue
					}
					value = strings.TrimSpace(value)
					if value == "" {
						continue
					}
					perms = append(perms, value)
				}
				return perms, nil
			}
			return nil, nil
		},
	})
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
	_, scope, store := newScopeStoreFixture()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(
			DefaultPermissions.AdminSettings,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
		)),
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
		WithAuthorizer(authorizerWithPermissions(DefaultPermissions.AdminSettings)),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(statusFailingGoogleService{err: fmt.Errorf("status lookup failed")}),
		WithDefaultScope(defaultTestScope()),
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
	_, scope, store := newScopeStoreFixture()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(
			DefaultPermissions.AdminSettings,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
		)),
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
	if !strings.Contains(string(searchBody), `"name":"NDA Source"`) {
		t.Fatalf("expected camelCase google file name in search response, got %s", string(searchBody))
	}
	if !strings.Contains(string(searchBody), `"mimeType":"application/vnd.google-apps.document"`) {
		t.Fatalf("expected camelCase google file mimeType in search response, got %s", string(searchBody))
	}
	if strings.Contains(string(searchBody), `"Name"`) || strings.Contains(string(searchBody), `"MimeType"`) {
		t.Fatalf("expected camelCase google file keys only, got %s", string(searchBody))
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
	_, scope, store := newScopeStoreFixture()
	google := services.NewGoogleIntegrationService(
		store,
		newSharedDriveEdgeProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(
			DefaultPermissions.AdminSettings,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
		)),
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
	_, scope, store := newScopeStoreFixture()
	provider := newSharedDriveEdgeProvider()
	provider.denyExport["shared-denied-1"] = true
	google := services.NewGoogleIntegrationService(
		store,
		provider,
		services.NewDocumentService(store),
		services.NewAgreementService(store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerWithPermissions(
			DefaultPermissions.AdminSettings,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
		)),
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
