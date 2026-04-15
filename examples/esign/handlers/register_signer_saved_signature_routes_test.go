package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const signerSavedSignaturePNGDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5+qf8AAAAASUVORK5CYII="

func TestSignerSavedSignatureRoutesRoundTrip(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	svc := services.NewSignerSavedSignatureService(store)
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerSavedSignatureService(svc),
		WithDefaultScope(scope),
	)

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/esign/signing/signatures/token-1",
		bytes.NewReader([]byte(`{"type":"signature","label":"Main","data_url":"`+signerSavedSignaturePNGDataURL+`"}`)),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createResp, err := app.Test(createReq, -1)
	if err != nil {
		t.Fatalf("create request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, createResp)
	if createResp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", createResp.StatusCode)
	}
	createPayload := mustDecodeJSONMap(t, createResp.Body)
	signature, ok := createPayload["signature"].(map[string]any)
	if !ok {
		t.Fatalf("expected signature payload, got %+v", createPayload)
	}
	signatureID, _ := signature["id"].(string)
	if signatureID == "" {
		t.Fatalf("expected signature id, got %+v", signature)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/signatures/token-1?type=signature", nil)
	listResp, err := app.Test(listReq, -1)
	if err != nil {
		t.Fatalf("list request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, listResp)
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", listResp.StatusCode)
	}
	listPayload := mustDecodeJSONMap(t, listResp.Body)
	rows, ok := listPayload["signatures"].([]any)
	if !ok || len(rows) != 1 {
		t.Fatalf("expected one signature in list, got %+v", listPayload)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/api/v1/esign/signing/signatures/token-1/"+signatureID, nil)
	deleteResp, err := app.Test(deleteReq, -1)
	if err != nil {
		t.Fatalf("delete request failed: %v", err)
	}
	defer closeHTTPResponseBody(t, deleteResp)
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteResp.StatusCode)
	}
}

func TestSignerSavedSignatureRoutesEnforceLimit(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	svc := services.NewSignerSavedSignatureService(store, services.WithSignerSavedSignatureDefaultLimit(1))
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(fixedSignerTokenValidator{record: stores.SigningTokenRecord{
			AgreementID: "agreement-1",
			RecipientID: "recipient-1",
		}}),
		WithSignerSavedSignatureService(svc),
		WithDefaultScope(scope),
	)

	for i := range 2 {
		req := httptest.NewRequest(
			http.MethodPost,
			"/api/v1/esign/signing/signatures/token-1",
			bytes.NewReader([]byte(`{"type":"initials","data_url":"`+signerSavedSignaturePNGDataURL+`"}`)),
		)
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("save request %d failed: %v", i+1, err)
		}
		defer closeHTTPResponseBody(t, resp)
		if i == 0 && resp.StatusCode != http.StatusOK {
			t.Fatalf("expected first save 200, got %d", resp.StatusCode)
		}
		if i == 1 && resp.StatusCode != http.StatusConflict {
			t.Fatalf("expected second save 409, got %d", resp.StatusCode)
		}
	}
}
