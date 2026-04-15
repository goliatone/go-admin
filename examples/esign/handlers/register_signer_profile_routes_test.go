package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestSignerProfileRoutesRoundTripAndClear(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 2, 20, 12, 0, 0, 0, time.UTC)
	profileSvc := services.NewSignerProfileService(
		store,
		services.WithSignerProfileClock(func() time.Time { return now }),
	)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerProfileService(profileSvc),
		WithDefaultScope(scope),
	)

	key := "https%3A%2F%2Flocalhost%3A8080%3Asigner%40example.com"
	body := []byte(`{"patch":{"fullName":"Signer Example","initials":"SE","typedSignature":"Signer Example","drawnSignatureDataUrl":"data:image/png;base64,ZmFrZQ==","drawnInitialsDataUrl":"data:image/png;base64,ZmFrZUluaXRpYWxz"}}`)
	patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/esign/signing/profile/token-1?key="+key, bytes.NewReader(body))
	patchReq.Header.Set("Content-Type", "application/json")
	patchResp, err := app.Test(patchReq, -1)
	if err != nil {
		t.Fatalf("patch request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, patchResp)
	if patchResp.StatusCode != http.StatusOK {
		t.Fatalf("expected patch status 200, got %d", patchResp.StatusCode)
	}
	patchPayload := mustDecodeJSONMap(t, patchResp.Body)
	profile, ok := patchPayload["profile"].(map[string]any)
	if !ok {
		t.Fatalf("expected profile payload, got %+v", patchPayload)
	}
	if profile["fullName"] != "Signer Example" {
		t.Fatalf("expected fullName to round-trip, got %+v", profile["fullName"])
	}
	if profile["drawnSignatureDataUrl"] == "" {
		t.Fatalf("expected drawn signature data url to persist, got %+v", profile)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/profile/token-1?key="+key, nil)
	getResp, err := app.Test(getReq, -1)
	if err != nil {
		t.Fatalf("get request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, getResp)
	if getResp.StatusCode != http.StatusOK {
		t.Fatalf("expected get status 200, got %d", getResp.StatusCode)
	}
	getPayload := mustDecodeJSONMap(t, getResp.Body)
	getProfile, ok := getPayload["profile"].(map[string]any)
	if !ok {
		t.Fatalf("expected profile payload on get, got %+v", getPayload)
	}
	if getProfile["typedSignature"] != "Signer Example" {
		t.Fatalf("expected typed signature persisted, got %+v", getProfile["typedSignature"])
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/v1/esign/signing/profile/token-1?key="+key, nil)
	deleteResp, err := app.Test(deleteReq, -1)
	if err != nil {
		t.Fatalf("delete request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, deleteResp)
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteResp.StatusCode)
	}

	getAfterDeleteReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/profile/token-1?key="+key, nil)
	getAfterDeleteResp, err := app.Test(getAfterDeleteReq, -1)
	if err != nil {
		t.Fatalf("get-after-delete request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, getAfterDeleteResp)
	if getAfterDeleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected get-after-delete status 200, got %d", getAfterDeleteResp.StatusCode)
	}
	getAfterDeletePayload := mustDecodeJSONMap(t, getAfterDeleteResp.Body)
	if profileVal, exists := getAfterDeletePayload["profile"]; !exists || profileVal != nil {
		t.Fatalf("expected null profile after delete, got %+v", getAfterDeletePayload)
	}
}

func TestSignerProfileRoutesRequireKey(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	profileSvc := services.NewSignerProfileService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerProfileService(profileSvc),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/profile/token-1", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400 when key missing, got %d", resp.StatusCode)
	}
}

func TestSignerProfileRoutesReturnNotImplementedWhenServiceMissing(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/profile/token-1?key=test", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp)
	if resp.StatusCode != http.StatusNotImplemented {
		t.Fatalf("expected status 501 when service missing, got %d", resp.StatusCode)
	}
}

func TestSignerProfileRoutesPatchRejectsEmptyPatch(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	profileSvc := services.NewSignerProfileService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerProfileService(profileSvc),
		WithDefaultScope(scope),
	)

	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/esign/signing/profile/token-1?key=profile-key",
		bytes.NewReader([]byte(`{"patch":{}}`)),
	)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400 for empty patch, got %d", resp.StatusCode)
	}
}

func TestSignerProfileRoutesPatchRejectsOverlongKey(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	profileSvc := services.NewSignerProfileService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerProfileService(profileSvc),
		WithDefaultScope(scope),
	)

	longKey := strings.Repeat("k", 2048)
	req := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/esign/signing/profile/token-1?key="+longKey,
		bytes.NewReader([]byte(`{"patch":{"fullName":"Signer"}}`)),
	)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, resp)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400 for overlong key, got %d", resp.StatusCode)
	}
}
