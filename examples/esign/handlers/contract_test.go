package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	"github.com/goliatone/go-uploader"
)

type staticSignerAssetContractResolver struct {
	contract services.SignerAssetContract
	err      error
}

func (r staticSignerAssetContractResolver) Resolve(context.Context, stores.Scope, stores.SigningTokenRecord) (services.SignerAssetContract, error) {
	if r.err != nil {
		return services.SignerAssetContract{}, r.err
	}
	return r.contract, nil
}

type staticAgreementDeliveryResolver struct {
	detail services.AgreementDeliveryDetail
	err    error
}

func (r staticAgreementDeliveryResolver) AgreementDeliveryDetail(context.Context, stores.Scope, string) (services.AgreementDeliveryDetail, error) {
	if r.err != nil {
		return services.AgreementDeliveryDetail{}, r.err
	}
	return r.detail, nil
}

type fixedSignerTokenValidator struct {
	record stores.SigningTokenRecord
}

func (v fixedSignerTokenValidator) Validate(context.Context, stores.Scope, string) (stores.SigningTokenRecord, error) {
	return v.record, nil
}

type memorySignerObjectStore struct {
	objects map[string][]byte
}

func (s *memorySignerObjectStore) GetFile(_ context.Context, path string) ([]byte, error) {
	if s == nil {
		return nil, io.EOF
	}
	raw, ok := s.objects[strings.TrimSpace(path)]
	if !ok {
		return nil, io.EOF
	}
	return append([]byte{}, raw...), nil
}

func (s *memorySignerObjectStore) UploadFile(_ context.Context, path string, content []byte, _ ...uploader.UploadOption) (string, error) {
	if s == nil {
		return "", io.EOF
	}
	if s.objects == nil {
		s.objects = map[string][]byte{}
	}
	key := strings.TrimSpace(path)
	s.objects[key] = append([]byte{}, content...)
	return key, nil
}

func TestAdminAPIStatusEnvelopeContract(t *testing.T) {
	app := setupRegisterTestApp(t, WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminView: true}}))

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/status", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	payload := mustDecodeJSONMap(t, resp.Body)
	if payload["status"] != "ok" {
		t.Fatalf("expected status=ok envelope, got %+v", payload)
	}
	if _, ok := payload["codes"].([]any); !ok {
		t.Fatalf("expected codes array in envelope, got %+v", payload)
	}
	routes, ok := payload["routes"].(map[string]any)
	if !ok {
		t.Fatalf("expected routes map in envelope, got %+v", payload)
	}
	for _, key := range []string{
		"admin", "admin_api",
		"admin_documents_upload",
		"signer_session", "signer_consent", "signer_field_values", "signer_signature", "signer_signature_upload", "signer_signature_object", "signer_telemetry", "signer_submit", "signer_decline", "signer_assets",
		"google_oauth_connect", "google_oauth_disconnect", "google_oauth_rotate", "google_oauth_status",
		"google_drive_search", "google_drive_browse", "google_drive_import",
	} {
		if _, exists := routes[key]; !exists {
			t.Fatalf("expected route key %q in contract, got %+v", key, routes)
		}
	}
}

func TestGoogleImportEnvelopeAndMetadataContractWhenEnabled(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	google := services.NewGoogleIntegrationService(
		store,
		services.NewDeterministicGoogleProvider(),
		services.NewDocumentService(store),
		services.NewAgreementService(store, store),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminCreate:   true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithGoogleIntegrationEnabled(true),
		WithGoogleIntegrationService(google),
		WithDefaultScope(scope),
	)

	connectReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/google/connect?user_id=ops-user", bytes.NewBufferString(`{"auth_code":"oauth-code-contract"}`))
	connectReq.Header.Set("Content-Type", "application/json")
	connectResp, err := app.Test(connectReq, -1)
	if err != nil {
		t.Fatalf("google connect request failed: %v", err)
	}
	_ = connectResp.Body.Close()
	if connectResp.StatusCode != http.StatusOK {
		t.Fatalf("expected connect status 200, got %d", connectResp.StatusCode)
	}

	importReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/google-drive/import?user_id=ops-user", bytes.NewBufferString(`{"google_file_id":"google-file-1","document_title":"Contract Doc","agreement_title":"Contract Agreement"}`))
	importReq.Header.Set("Content-Type", "application/json")
	importResp, err := app.Test(importReq, -1)
	if err != nil {
		t.Fatalf("google import request failed: %v", err)
	}
	defer importResp.Body.Close()
	if importResp.StatusCode != http.StatusOK {
		t.Fatalf("expected import status 200, got %d", importResp.StatusCode)
	}

	payload := mustDecodeJSONMap(t, importResp.Body)
	if payload["status"] != "imported" {
		t.Fatalf("expected status=imported envelope, got %+v", payload)
	}
	document := mustMapField(t, payload, "document")
	agreement := mustMapField(t, payload, "agreement")

	requiredMetadataKeys := []string{
		"id", "title",
		"source_type", "source_google_file_id", "source_google_doc_url",
		"source_modified_time", "source_exported_at", "source_exported_by_user_id",
	}
	assertMapHasRequiredKeys(t, document, requiredMetadataKeys...)
	assertMapHasRequiredKeys(t, agreement, append(requiredMetadataKeys, "document_id")...)

	if document["source_type"] != string(stores.SourceTypeGoogleDrive) {
		t.Fatalf("expected document source_type=%q, got %+v", stores.SourceTypeGoogleDrive, document)
	}
	if agreement["source_type"] != string(stores.SourceTypeGoogleDrive) {
		t.Fatalf("expected agreement source_type=%q, got %+v", stores.SourceTypeGoogleDrive, agreement)
	}
	if document["source_google_file_id"] != "google-file-1" {
		t.Fatalf("expected document source_google_file_id=google-file-1, got %+v", document)
	}
	if agreement["source_google_file_id"] != "google-file-1" {
		t.Fatalf("expected agreement source_google_file_id=google-file-1, got %+v", agreement)
	}
}

func TestSignerSessionRateLimitErrorEnvelopeContract(t *testing.T) {
	limiter := NewSlidingWindowRateLimiter(map[string]RateLimitRule{
		OperationSignerSession: {MaxRequests: 1, Window: time.Minute},
	})
	app := setupRegisterTestApp(t, WithRequestRateLimiter(limiter))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/contract-token", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.24")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("first request failed: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected first request 200, got %d", resp.StatusCode)
	}

	replay := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/contract-token", nil)
	replay.Header.Set("X-Forwarded-For", "203.0.113.24")
	limited, err := app.Test(replay, -1)
	if err != nil {
		t.Fatalf("rate limit request failed: %v", err)
	}
	defer limited.Body.Close()
	if limited.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected status 429, got %d", limited.StatusCode)
	}

	payload := mustDecodeJSONMap(t, limited.Body)
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error envelope, got %+v", payload)
	}
	if errPayload["code"] != string(services.ErrorCodeRateLimited) {
		t.Fatalf("expected RATE_LIMITED code, got %+v", errPayload)
	}
	details, ok := errPayload["details"].(map[string]any)
	if !ok {
		t.Fatalf("expected details in rate limit envelope, got %+v", errPayload)
	}
	if details["operation"] != OperationSignerSession {
		t.Fatalf("expected operation %q, got %+v", OperationSignerSession, details)
	}
}

func TestSignerSessionExpiredTokenErrorEnvelopeContract(t *testing.T) {
	app := setupRegisterTestApp(t,
		WithSignerTokenValidator(rejectingValidator{}),
		WithDefaultScope(stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/token-contract", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusGone {
		t.Fatalf("expected status 410, got %d", resp.StatusCode)
	}

	payload := mustDecodeJSONMap(t, resp.Body)
	errPayload, ok := payload["error"].(map[string]any)
	if !ok {
		t.Fatalf("expected error envelope, got %+v", payload)
	}
	if errPayload["code"] != string(services.ErrorCodeTokenExpired) {
		t.Fatalf("expected TOKEN_EXPIRED code, got %+v", errPayload)
	}
	if _, ok := errPayload["message"].(string); !ok {
		t.Fatalf("expected error.message string, got %+v", errPayload)
	}
}

func TestSignerAssetContractEnvelope(t *testing.T) {
	app := setupRegisterTestApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/token-contract", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	payload := mustDecodeJSONMap(t, resp.Body)
	if payload["status"] != "ok" {
		t.Fatalf("expected status=ok envelope, got %+v", payload)
	}
	assets := mustMapField(t, payload, "assets")
	assertMapHasRequiredKeys(t, assets, "contract_url", "session_url")
}

func TestSignerAssetContractReturnsPDFBinaryWhenAssetQueryPresent(t *testing.T) {
	objectStore := &memorySignerObjectStore{
		objects: map[string][]byte{
			"tenant/tenant-1/org/org-1/docs/agreement-asset-1/source.pdf": services.GenerateDeterministicPDF(1),
		},
	}
	app := setupRegisterTestApp(t, WithSignerAssetContractService(staticSignerAssetContractResolver{
		contract: services.SignerAssetContract{
			AgreementID:             "agreement-asset-1",
			RecipientID:             "recipient-asset-1",
			RecipientRole:           stores.RecipientRoleSigner,
			SourceDocumentAvailable: true,
			SourceObjectKey:         "tenant/tenant-1/org/org-1/docs/agreement-asset-1/source.pdf",
		},
	}), WithSignerObjectStore(objectStore))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/token-contract?asset=source", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}
	if contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type"))); !strings.Contains(contentType, "application/pdf") {
		t.Fatalf("expected application/pdf content type, got %q", resp.Header.Get("Content-Type"))
	}
	if disposition := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Disposition"))); !strings.HasPrefix(disposition, "inline;") {
		t.Fatalf("expected inline content disposition, got %q", resp.Header.Get("Content-Disposition"))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.HasPrefix(string(body), "%PDF-") {
		t.Fatalf("expected pdf payload prefix, got %q", string(body))
	}
}

func TestSignerAssetContractReturnsTyped404WhenAssetUnavailable(t *testing.T) {
	app := setupRegisterTestApp(t, WithSignerAssetContractService(staticSignerAssetContractResolver{
		contract: services.SignerAssetContract{
			AgreementID:             "agreement-asset-2",
			RecipientID:             "recipient-asset-2",
			RecipientRole:           stores.RecipientRoleCC,
			SourceDocumentAvailable: false,
		},
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/token-contract?asset=source", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 404, got %d body=%s", resp.StatusCode, string(body))
	}
	payload := mustDecodeJSONMap(t, resp.Body)
	errPayload := mustMapField(t, payload, "error")
	if errPayload["code"] != string(services.ErrorCodeAssetUnavailable) {
		t.Fatalf("expected code %q, got %+v", services.ErrorCodeAssetUnavailable, errPayload)
	}
}

func TestAdminAgreementArtifactDownloadReturnsPDFBinary(t *testing.T) {
	objectKey := "tenant/tenant-1/org/org-1/agreements/agreement-admin-1/executed.pdf"
	objectStore := &memorySignerObjectStore{
		objects: map[string][]byte{
			objectKey: services.GenerateDeterministicPDF(1),
		},
	}

	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminDownload: true}}),
		WithSignerObjectStore(objectStore),
		WithAgreementDeliveryService(staticAgreementDeliveryResolver{
			detail: services.AgreementDeliveryDetail{
				AgreementID:       "agreement-admin-1",
				ExecutedObjectKey: objectKey,
			},
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign_agreements/agreement-admin-1/artifact/executed", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}
	if contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type"))); !strings.Contains(contentType, "application/pdf") {
		t.Fatalf("expected application/pdf content type, got %q", resp.Header.Get("Content-Type"))
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	if !strings.HasPrefix(string(body), "%PDF-") {
		t.Fatalf("expected pdf payload prefix, got %q", string(body))
	}
}

func TestAdminAgreementArtifactDownloadSupportsEnvSuffixedPanelName(t *testing.T) {
	objectKey := "tenant/tenant-1/org/org-1/agreements/agreement-admin-env-1/executed.pdf"
	objectStore := &memorySignerObjectStore{
		objects: map[string][]byte{
			objectKey: services.GenerateDeterministicPDF(1),
		},
	}

	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{DefaultPermissions.AdminDownload: true}}),
		WithSignerObjectStore(objectStore),
		WithAgreementDeliveryService(staticAgreementDeliveryResolver{
			detail: services.AgreementDeliveryDetail{
				AgreementID:       "agreement-admin-env-1",
				ExecutedObjectKey: objectKey,
			},
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign_agreements@staging/agreement-admin-env-1/artifact/executed", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}
}

func TestSignerAssetContractEmitsAuditEventForAssetOpen(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	auditStore := stores.NewInMemoryStore()
	objectStore := &memorySignerObjectStore{
		objects: map[string][]byte{
			"tenant/tenant-1/org/org-1/docs/agreement-asset-audit-1/source.pdf": services.GenerateDeterministicPDF(1),
		},
	}
	app := setupRegisterTestApp(t,
		WithDefaultScope(scope),
		WithAuditEventStore(auditStore),
		WithSignerObjectStore(objectStore),
		WithSignerTokenValidator(fixedSignerTokenValidator{
			record: stores.SigningTokenRecord{
				AgreementID: "agreement-asset-audit-1",
				RecipientID: "recipient-asset-audit-1",
			},
		}),
		WithSignerAssetContractService(staticSignerAssetContractResolver{
			contract: services.SignerAssetContract{
				AgreementID:             "agreement-asset-audit-1",
				RecipientID:             "recipient-asset-audit-1",
				RecipientRole:           stores.RecipientRoleSigner,
				SourceDocumentAvailable: true,
				SourceObjectKey:         "tenant/tenant-1/org/org-1/docs/agreement-asset-audit-1/source.pdf",
			},
		}),
	)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/assets/token-contract?asset=source", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d body=%s", resp.StatusCode, string(body))
	}

	events, err := auditStore.ListForAgreement(context.Background(), scope, "agreement-asset-audit-1", stores.AuditEventQuery{})
	if err != nil {
		t.Fatalf("list audit events: %v", err)
	}
	if len(events) == 0 {
		t.Fatal("expected at least one audit event")
	}
	found := false
	for _, event := range events {
		if event.EventType == "signer.assets.asset_opened" {
			found = true
			if strings.Contains(event.MetadataJSON, "object_key") || strings.Contains(event.MetadataJSON, "tenant/") {
				t.Fatalf("expected no object-key leakage in metadata, got %s", event.MetadataJSON)
			}
			break
		}
	}
	if !found {
		t.Fatalf("expected signer.assets.asset_opened event, got %+v", events)
	}
}

func TestSignerSessionLegacyCompatibilityGate(t *testing.T) {
	app, _, token, _, _ := setupSignerFlowApp(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/esign/signing/session/"+token, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	payload := mustDecodeJSONMap(t, resp.Body)
	session := mustMapField(t, payload, "session")
	assertMapHasRequiredKeys(t, session,
		"agreement_id",
		"agreement_status",
		"recipient_id",
		"recipient_role",
		"state",
		"fields",
	)
	fields, ok := session["fields"].([]any)
	if !ok || len(fields) == 0 {
		t.Fatalf("expected non-empty fields in legacy-compatible session payload, got %+v", session)
	}
	firstField, ok := fields[0].(map[string]any)
	if !ok {
		t.Fatalf("expected field object payload, got %+v", fields[0])
	}
	assertMapHasRequiredKeys(t, firstField,
		"id",
		"type",
		"page",
		"pos_x",
		"pos_y",
		"width",
		"height",
		"required",
	)
}

func TestSignerTypedSignatureAttachLegacyCompatibilityGate(t *testing.T) {
	app, _, token, _, signatureFieldID := setupSignerFlowApp(t)

	body := bytes.NewBufferString(`{"field_id":"` + signatureFieldID + `","type":"typed","object_key":"tenant/tenant-1/org/org-1/agreements/agreement-1/sig/legacy-compat.png","sha256":"` + strings.Repeat("a", 64) + `","value_text":"Legacy Signer"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/esign/signing/field-values/signature/"+token, body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200 for legacy typed signature attach without upload token, got %d body=%s", resp.StatusCode, payload)
	}
}

func mustDecodeJSONMap(t *testing.T, body io.Reader) map[string]any {
	t.Helper()
	raw, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("decode json payload: %v payload=%s", err, string(raw))
	}
	return out
}

func mustMapField(t *testing.T, payload map[string]any, key string) map[string]any {
	t.Helper()
	raw, ok := payload[key]
	if !ok {
		t.Fatalf("expected field %q in payload %+v", key, payload)
	}
	out, ok := raw.(map[string]any)
	if !ok {
		t.Fatalf("expected field %q to be object, got %+v", key, raw)
	}
	return out
}

func assertMapHasRequiredKeys(t *testing.T, payload map[string]any, keys ...string) {
	t.Helper()
	for _, key := range keys {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected key %q in payload %+v", key, payload)
		}
	}
}
