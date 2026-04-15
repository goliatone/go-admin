package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
)

func setupLegacyDraftRoutesApp(t *testing.T, allowed map[string]bool, withClaims bool) *fiber.App {
	t.Helper()

	_, scope, store := newScopeStoreFixture()
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(services.NewAgreementService(store)),
	)
	opts := []RegisterOption{
		WithAuthorizer(authorizerFromAllowedMap(allowed)),
		WithDraftWorkflowService(draftSvc),
		WithDefaultScope(scope),
	}
	if withClaims {
		opts = append(opts, WithAdminRouteMiddleware(withClaimsUserPermissions(testAdminUserID,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
			DefaultPermissions.AdminEdit,
			DefaultPermissions.AdminSend,
		)))
	}
	return setupRegisterTestApp(t, opts...)
}

func doLegacyDraftRequest(t *testing.T, app *fiber.App, method, path string, payload any) (int, []byte) {
	t.Helper()

	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("json marshal payload: %v", err)
		}
		body = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, body)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request %s %s failed: %v", method, path, err)
	}
	defer closeHTTPResponseBody(t, resp)
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return resp.StatusCode, raw
}

func TestLegacyDraftRoutesRequirePermissions(t *testing.T) {
	app := setupLegacyDraftRoutesApp(t, nil, true)

	status, body := doLegacyDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts", nil)
	if status != http.StatusForbidden {
		t.Fatalf("expected list status 403, got %d body=%s", status, string(body))
	}

	status, body = doLegacyDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", map[string]any{
		"wizard_id": "wiz-unauthorized",
	})
	if status != http.StatusForbidden {
		t.Fatalf("expected create status 403, got %d body=%s", status, string(body))
	}
}

func TestLegacyDraftRoutesRequireAuthenticatedActor(t *testing.T) {
	app := setupLegacyDraftRoutesApp(t, draftWorkflowPermissionSet(), false)

	status, body := doLegacyDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts", nil)
	if status != http.StatusUnauthorized {
		t.Fatalf("expected list status 401, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"code":"UNAUTHENTICATED"`) {
		t.Fatalf("expected unauthenticated error, got body=%s", string(body))
	}
}

func TestLegacyDraftRoutesReturnGoneAndAdvertiseSyncAuthoritativeSurface(t *testing.T) {
	app := setupLegacyDraftRoutesApp(t, draftWorkflowPermissionSet(), true)

	cases := []struct {
		method string
		path   string
		body   any
	}{
		{method: http.MethodGet, path: "/admin/api/v1/esign/drafts"},
		{method: http.MethodPost, path: "/admin/api/v1/esign/drafts", body: map[string]any{"wizard_id": "wiz-1"}},
		{method: http.MethodGet, path: "/admin/api/v1/esign/drafts/draft-1"},
		{method: http.MethodPut, path: "/admin/api/v1/esign/drafts/draft-1", body: map[string]any{"expected_revision": 1}},
		{method: http.MethodDelete, path: "/admin/api/v1/esign/drafts/draft-1"},
		{method: http.MethodPost, path: "/admin/api/v1/esign/drafts/draft-1/send", body: map[string]any{"expected_revision": 1}},
	}

	for _, tc := range cases {
		status, body := doLegacyDraftRequest(t, app, tc.method, tc.path, tc.body)
		if status != http.StatusGone {
			t.Fatalf("%s %s: expected status 410, got %d body=%s", tc.method, tc.path, status, string(body))
		}
		if !strings.Contains(string(body), `"code":"`+legacyDraftRouteErrorCode+`"`) {
			t.Fatalf("%s %s: expected legacy route error code, got body=%s", tc.method, tc.path, string(body))
		}
		if !strings.Contains(string(body), `/admin/api/v1/esign/sync`) {
			t.Fatalf("%s %s: expected sync authoritative surface in body=%s", tc.method, tc.path, string(body))
		}
	}
}
