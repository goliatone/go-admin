package handlers

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func setupAgreementAuthoringApp(t *testing.T, allowed map[string]bool) (*fiber.App, stores.Scope, string) {
	t.Helper()

	ctx, scope, store := newScopeStoreFixture()
	docSvc := services.NewDocumentService(store, services.WithDocumentClock(func() time.Time {
		return time.Date(2026, 2, 12, 8, 0, 0, 0, time.UTC)
	}))
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Authoring Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/doc-authoring/source.pdf",
		PDF:       services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	agreement, err := agreementSvc.CreateDraft(ctx, scope, services.CreateDraftInput{
		DocumentID:      doc.ID,
		Title:           "Authoring Draft",
		CreatedByUserID: "admin-user",
	})
	if err != nil {
		t.Fatalf("CreateDraft: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerFromAllowedMap(allowed)),
		WithAgreementAuthoringService(agreementSvc),
		WithDefaultScope(scope),
	)
	return app, scope, agreement.ID
}

func doJSONRequest(t *testing.T, app *fiber.App, method, path, payload string) (int, []byte) {
	t.Helper()

	var body io.Reader
	if strings.TrimSpace(payload) != "" {
		body = bytes.NewBufferString(payload)
	}
	req := httptest.NewRequest(method, path, body)
	if strings.TrimSpace(payload) != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request %s %s failed: %v", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response body: %v", err)
	}
	return resp.StatusCode, raw
}

func TestRegisterAgreementAuthoringRoutesRequirePermissions(t *testing.T) {
	app, _, agreementID := setupAgreementAuthoringApp(t, map[string]bool{})

	status, _ := doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/participants", "")
	if status != http.StatusForbidden {
		t.Fatalf("expected participants list status 403, got %d", status)
	}

	status, _ = doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/send-readiness", "")
	if status != http.StatusForbidden {
		t.Fatalf("expected send-readiness status 403, got %d", status)
	}

	status, _ = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/auto-place", `{"user_id":"admin-user"}`)
	if status != http.StatusForbidden {
		t.Fatalf("expected auto-place status 403, got %d", status)
	}
}

func TestRegisterAgreementAuthoringCRUDAndReadinessEndpoints(t *testing.T) {
	app, _, agreementID := setupAgreementAuthoringApp(t, map[string]bool{
		DefaultPermissions.AdminView: true,
		DefaultPermissions.AdminEdit: true,
		DefaultPermissions.AdminSend: true,
	})

	status, body := doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/participants", `{
		"email":"signer@example.com",
		"name":"Signer One",
		"role":"signer",
		"signing_stage":1
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected participant create 200, got %d body=%s", status, string(body))
	}
	participantID := extractJSONFieldString(body, []string{"participant", "id"})
	if participantID == "" {
		t.Fatalf("expected participant id in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/participants", "")
	if status != http.StatusOK {
		t.Fatalf("expected participant list 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"signing_stage":1`) {
		t.Fatalf("expected signing_stage in participants payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPut, "/admin/api/v1/esign/agreements/"+agreementID+"/participants/"+participantID, `{
		"name":"Signer One Updated",
		"signing_stage":1
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected participant update 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), "Signer One Updated") {
		t.Fatalf("expected updated participant name in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/field-definitions", `{
		"participant_id":"`+participantID+`",
		"field_type":"signature",
		"required":true
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected definition create 200, got %d body=%s", status, string(body))
	}
	fieldDefinitionID := extractJSONFieldString(body, []string{"field_definition", "id"})
	if fieldDefinitionID == "" {
		t.Fatalf("expected field definition id in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/field-definitions", `{
		"participant_id":"`+participantID+`",
		"field_type":"text",
		"required":false
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected optional definition create 200, got %d body=%s", status, string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPut, "/admin/api/v1/esign/agreements/"+agreementID+"/field-definitions/"+fieldDefinitionID, `{
		"participant_id":"`+participantID+`",
		"field_type":"signature",
		"required":true
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected definition update 200, got %d body=%s", status, string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/field-instances", `{
		"field_definition_id":"`+fieldDefinitionID+`",
		"page_number":1,
		"x":12,
		"y":24,
		"width":180,
		"height":28,
		"tab_index":1
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected instance create 200, got %d body=%s", status, string(body))
	}
	fieldInstanceID := extractJSONFieldString(body, []string{"field_instance", "id"})
	if fieldInstanceID == "" {
		t.Fatalf("expected field instance id in payload, got %s", string(body))
	}
	if !strings.Contains(string(body), `"tab_index":1`) {
		t.Fatalf("expected tab_index in instance payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPut, "/admin/api/v1/esign/agreements/"+agreementID+"/field-instances/"+fieldInstanceID, `{
		"tab_index":3
	}`)
	if status != http.StatusOK {
		t.Fatalf("expected instance update 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"tab_index":3`) {
		t.Fatalf("expected updated tab_index in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/send-readiness", "")
	if status != http.StatusOK {
		t.Fatalf("expected send-readiness 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"ready":true`) {
		t.Fatalf("expected ready=true in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/auto-place", `{"user_id":"admin-user"}`)
	if status != http.StatusOK {
		t.Fatalf("expected auto-place 200, got %d body=%s", status, string(body))
	}
	placementRunID := extractJSONFieldString(body, []string{"run", "id"})
	if placementRunID == "" {
		t.Fatalf("expected placement run id in payload, got %s", string(body))
	}
	if !strings.Contains(string(body), `"suggestions"`) {
		t.Fatalf("expected placement suggestions in auto-place payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/placement-runs", "")
	if status != http.StatusOK {
		t.Fatalf("expected placement-runs list 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), placementRunID) {
		t.Fatalf("expected placement run id %q in list payload, got %s", placementRunID, string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodGet, "/admin/api/v1/esign/agreements/"+agreementID+"/placement-runs/"+placementRunID, "")
	if status != http.StatusOK {
		t.Fatalf("expected placement-run detail 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"run"`) {
		t.Fatalf("expected run payload in placement-run detail, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/placement-runs/"+placementRunID+"/apply", `{"user_id":"admin-user"}`)
	if status != http.StatusOK {
		t.Fatalf("expected placement apply 200, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"placement_source"`) {
		t.Fatalf("expected placement metadata in apply payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodPost, "/admin/api/v1/esign/agreements/"+agreementID+"/field-instances", `{
		"field_definition_id":"`+fieldDefinitionID+`",
		"page_number":2,
		"x":10,
		"y":20,
		"width":100,
		"height":30
	}`)
	if status != http.StatusBadRequest {
		t.Fatalf("expected out-of-bounds geometry status 400, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), "page_number") {
		t.Fatalf("expected geometry bounds error in payload, got %s", string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodDelete, "/admin/api/v1/esign/agreements/"+agreementID+"/field-definitions/"+fieldDefinitionID, "")
	if status != http.StatusOK {
		t.Fatalf("expected definition delete 200, got %d body=%s", status, string(body))
	}

	status, body = doJSONRequest(t, app, http.MethodDelete, "/admin/api/v1/esign/agreements/"+agreementID+"/participants/"+participantID, "")
	if status != http.StatusOK {
		t.Fatalf("expected participant delete 200, got %d body=%s", status, string(body))
	}
}
