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

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func setupDraftWorkflowApp(t *testing.T, draftSvc services.DraftService, scope stores.Scope) *fiber.App {
	t.Helper()
	return setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminCreate: true,
			DefaultPermissions.AdminView:   true,
			DefaultPermissions.AdminEdit:   true,
			DefaultPermissions.AdminSend:   true,
		}}),
		WithDraftWorkflowService(draftSvc),
		WithDefaultScope(scope),
	)
}

func doDraftRequest(t *testing.T, app *fiber.App, method, path, userID string, payload any) (int, []byte) {
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
	if strings.TrimSpace(userID) != "" {
		req.Header.Set("X-User-ID", strings.TrimSpace(userID))
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request %s %s failed: %v", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return resp.StatusCode, raw
}

func TestRegisterDraftEndpointsRequirePermissions(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(services.NewAgreementService(store)),
	)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{}}),
		WithDraftWorkflowService(draftSvc),
		WithDefaultScope(scope),
	)

	status, body := doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts", "admin-user", nil)
	if status != http.StatusForbidden {
		t.Fatalf("expected list status 403, got %d body=%s", status, string(body))
	}

	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", "admin-user", map[string]any{
		"wizard_id":    "wiz-unauthorized",
		"wizard_state": map[string]any{"details": map[string]any{"title": "Unauthorized"}},
		"title":        "Unauthorized",
		"current_step": 1,
	})
	if status != http.StatusForbidden {
		t.Fatalf("expected create status 403, got %d body=%s", status, string(body))
	}
}

func TestRegisterDraftLifecycleEndpoints(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Draft Lifecycle Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-lifecycle/source.pdf",
		PDF:       services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(services.NewAgreementService(store)),
	)
	app := setupDraftWorkflowApp(t, draftSvc, scope)
	userID := "admin-user"

	initialState := map[string]any{
		"document": map[string]any{"id": doc.ID, "title": doc.Title},
		"details": map[string]any{
			"title":   "Q1 Contract",
			"message": "Please review",
		},
		"participants":     []map[string]any{},
		"fieldDefinitions": []map[string]any{},
		"fieldPlacements":  []map[string]any{},
	}

	status, body := doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", userID, map[string]any{
		"wizard_id":    "wiz-lifecycle-1",
		"wizard_state": initialState,
		"title":        "Q1 Contract",
		"current_step": 2,
		"document_id":  doc.ID,
	})
	if status != http.StatusCreated {
		t.Fatalf("expected create status 201, got %d body=%s", status, string(body))
	}
	createPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	draftID := strings.TrimSpace(toString(createPayload["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id in create payload, got %s", string(body))
	}
	if revision := toString(createPayload["revision"]); revision != "1" {
		t.Fatalf("expected revision=1, got %q payload=%s", revision, string(body))
	}

	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", userID, map[string]any{
		"wizard_id":    "wiz-lifecycle-1",
		"wizard_state": initialState,
		"title":        "Q1 Contract replay",
		"current_step": 2,
		"document_id":  doc.ID,
	})
	if status != http.StatusOK {
		t.Fatalf("expected replay status 200, got %d body=%s", status, string(body))
	}
	replayPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if strings.TrimSpace(toString(replayPayload["id"])) != draftID {
		t.Fatalf("expected replayed draft id %q, got %q", draftID, toString(replayPayload["id"]))
	}

	status, body = doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts?limit=10", userID, nil)
	if status != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", status, string(body))
	}
	listPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	draftsRaw, ok := listPayload["drafts"].([]any)
	if !ok {
		t.Fatalf("expected drafts array, got %+v", listPayload["drafts"])
	}
	if len(draftsRaw) != 1 {
		t.Fatalf("expected one draft in list, got %d payload=%s", len(draftsRaw), string(body))
	}
	if toString(listPayload["total"]) != "1" {
		t.Fatalf("expected total=1, got %+v", listPayload["total"])
	}

	status, body = doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts/"+draftID, userID, nil)
	if status != http.StatusOK {
		t.Fatalf("expected get status 200, got %d body=%s", status, string(body))
	}
	detailPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if _, ok := detailPayload["wizard_state"].(map[string]any); !ok {
		t.Fatalf("expected wizard_state object, got %+v", detailPayload["wizard_state"])
	}

	updatedState := map[string]any{
		"document": map[string]any{"id": doc.ID, "title": doc.Title},
		"details": map[string]any{
			"title":   "Q1 Contract Updated",
			"message": "Please review updated draft",
		},
		"participants":     []map[string]any{},
		"fieldDefinitions": []map[string]any{},
		"fieldPlacements":  []map[string]any{},
	}
	status, body = doDraftRequest(t, app, http.MethodPut, "/admin/api/v1/esign/drafts/"+draftID, userID, map[string]any{
		"expected_revision": 1,
		"wizard_state":      updatedState,
		"title":             "Q1 Contract Updated",
		"current_step":      3,
		"document_id":       doc.ID,
	})
	if status != http.StatusOK {
		t.Fatalf("expected update status 200, got %d body=%s", status, string(body))
	}
	updatePayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if revision := toString(updatePayload["revision"]); revision != "2" {
		t.Fatalf("expected revision=2, got %q payload=%s", revision, string(body))
	}

	status, body = doDraftRequest(t, app, http.MethodPut, "/admin/api/v1/esign/drafts/"+draftID, userID, map[string]any{
		"expected_revision": 1,
		"wizard_state":      updatedState,
		"title":             "Q1 Contract stale",
		"current_step":      4,
		"document_id":       doc.ID,
	})
	if status != http.StatusConflict {
		t.Fatalf("expected stale update status 409, got %d body=%s", status, string(body))
	}
	conflictPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	errPayload := mustMapField(t, conflictPayload, "error")
	if strings.TrimSpace(toString(errPayload["code"])) != "stale_revision" {
		t.Fatalf("expected stale_revision error code, got %+v", errPayload["code"])
	}
	details := mustMapField(t, errPayload, "details")
	if toString(details["current_revision"]) != "2" {
		t.Fatalf("expected current_revision=2, got %+v", details["current_revision"])
	}

	status, body = doDraftRequest(t, app, http.MethodDelete, "/admin/api/v1/esign/drafts/"+draftID, userID, nil)
	if status != http.StatusNoContent {
		t.Fatalf("expected delete status 204, got %d body=%s", status, string(body))
	}

	status, body = doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts/"+draftID, userID, nil)
	if status != http.StatusNotFound {
		t.Fatalf("expected get-after-delete status 404, got %d body=%s", status, string(body))
	}
}

func TestRegisterDraftSendAndExpiryFlows(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()

	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:     "Draft Send Source",
		ObjectKey: "tenant/tenant-1/org/org-1/docs/draft-send/source.pdf",
		PDF:       services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftTTL(50*time.Millisecond),
	)
	app := setupDraftWorkflowApp(t, draftSvc, scope)
	userID := "admin-user"

	invalidState := map[string]any{
		"document": map[string]any{"id": doc.ID},
		"details": map[string]any{"title": "Invalid Draft"},
	}
	status, body := doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", userID, map[string]any{
		"wizard_id":    "wiz-send-invalid",
		"wizard_state": invalidState,
		"title":        "Invalid Draft",
		"current_step": 6,
		"document_id":  doc.ID,
	})
	if status != http.StatusCreated {
		t.Fatalf("expected invalid draft create status 201, got %d body=%s", status, string(body))
	}
	invalidDraftID := extractJSONFieldString(body, []string{"id"})

	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts/"+invalidDraftID+"/send", userID, map[string]any{
		"expected_revision": 1,
	})
	if status != http.StatusUnprocessableEntity {
		t.Fatalf("expected invalid send status 422, got %d body=%s", status, string(body))
	}
	sendErrPayload := mustMapField(t, mustDecodeJSONMap(t, bytes.NewReader(body)), "error")
	if strings.TrimSpace(toString(sendErrPayload["code"])) != "validation_failed" {
		t.Fatalf("expected validation_failed code for invalid send, got %+v", sendErrPayload["code"])
	}

	status, body = doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts/"+invalidDraftID, userID, nil)
	if status != http.StatusOK {
		t.Fatalf("expected invalid draft to remain after failed send, got %d body=%s", status, string(body))
	}

	missingDocumentState := map[string]any{
		"document": map[string]any{"id": "doc-missing"},
		"details":  map[string]any{"title": "Missing Document"},
	}
	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts", userID, map[string]any{
		"wizard_id":    "wiz-missing-doc",
		"wizard_state": missingDocumentState,
		"title":        "Missing Document",
		"current_step": 6,
		"document_id":  "doc-missing",
	})
	if status != http.StatusCreated {
		t.Fatalf("expected missing-document draft create status 201, got %d body=%s", status, string(body))
	}
	missingDocDraftID := extractJSONFieldString(body, []string{"id"})
	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts/"+missingDocDraftID+"/send", userID, map[string]any{
		"expected_revision": 1,
	})
	if status != http.StatusUnprocessableEntity {
		t.Fatalf("expected missing-document send status 422, got %d body=%s", status, string(body))
	}

	validState := map[string]any{
		"document": map[string]any{"id": doc.ID},
		"details": map[string]any{
			"title":   "Valid Draft",
			"message": "Ready to send",
		},
		"participants": []map[string]any{
			{
				"tempId": "participant-1",
				"name":   "Signer One",
				"email":  "signer@example.com",
				"role":   "signer",
				"order":  1,
			},
		},
		"fieldDefinitions": []map[string]any{
			{
				"tempId":            "field-1",
				"type":              "signature",
				"participantTempId": "participant-1",
				"label":             "Signature",
				"required":          true,
			},
		},
		"fieldPlacements": []map[string]any{
			{
				"fieldTempId": "field-1",
				"page":        1,
				"x":           96,
				"y":           128,
				"width":       180,
				"height":      32,
			},
		},
	}
	status, body = doDraftRequest(t, app, http.MethodPut, "/admin/api/v1/esign/drafts/"+invalidDraftID, userID, map[string]any{
		"expected_revision": 1,
		"wizard_state":      validState,
		"title":             "Valid Draft",
		"current_step":      6,
		"document_id":       doc.ID,
	})
	if status != http.StatusOK {
		t.Fatalf("expected valid update status 200, got %d body=%s", status, string(body))
	}

	status, body = doDraftRequest(t, app, http.MethodPost, "/admin/api/v1/esign/drafts/"+invalidDraftID+"/send", userID, map[string]any{
		"expected_revision": 2,
	})
	if status != http.StatusOK {
		t.Fatalf("expected valid send status 200, got %d body=%s", status, string(body))
	}
	sendPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if strings.TrimSpace(toString(sendPayload["agreement_id"])) == "" {
		t.Fatalf("expected agreement_id in send response, got %s", string(body))
	}
	if strings.TrimSpace(toString(sendPayload["draft_id"])) != invalidDraftID {
		t.Fatalf("expected draft_id=%q, got %q", invalidDraftID, sendPayload["draft_id"])
	}
	if toString(sendPayload["draft_deleted"]) != "true" {
		t.Fatalf("expected draft_deleted=true, got %+v", sendPayload["draft_deleted"])
	}

	status, body = doDraftRequest(t, app, http.MethodGet, "/admin/api/v1/esign/drafts/"+invalidDraftID, userID, nil)
	if status != http.StatusNotFound {
		t.Fatalf("expected sent draft to be deleted, got %d body=%s", status, string(body))
	}

	// Cross-session: new app instance over same store can still read active drafts.
	app2 := setupDraftWorkflowApp(t, services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftTTL(50*time.Millisecond),
	), scope)

	status, body = doDraftRequest(t, app2, http.MethodPost, "/admin/api/v1/esign/drafts", userID, map[string]any{
		"wizard_id":    "wiz-expiry-check",
		"wizard_state": validState,
		"title":        "Expiry Draft",
		"current_step": 2,
		"document_id":  doc.ID,
	})
	if status != http.StatusCreated {
		t.Fatalf("expected expiry draft create status 201, got %d body=%s", status, string(body))
	}

	status, body = doDraftRequest(t, app2, http.MethodGet, "/admin/api/v1/esign/drafts?limit=10", userID, nil)
	if status != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", status, string(body))
	}
	beforeExpiry := mustDecodeJSONMap(t, bytes.NewReader(body))
	if toString(beforeExpiry["total"]) == "0" {
		t.Fatalf("expected at least one active draft before expiry, got %s", string(body))
	}

	time.Sleep(80 * time.Millisecond)
	if _, err := draftSvc.CleanupExpiredDrafts(context.Background(), time.Now().UTC()); err != nil {
		t.Fatalf("CleanupExpiredDrafts: %v", err)
	}

	status, body = doDraftRequest(t, app2, http.MethodGet, "/admin/api/v1/esign/drafts?limit=10", userID, nil)
	if status != http.StatusOK {
		t.Fatalf("expected post-cleanup list status 200, got %d body=%s", status, string(body))
	}
	afterExpiry := mustDecodeJSONMap(t, bytes.NewReader(body))
	if toString(afterExpiry["total"]) != "0" {
		t.Fatalf("expected total=0 after cleanup, got %s", string(body))
	}
}
