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

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	esignsync "github.com/goliatone/go-admin/examples/esign/sync"
	syncservice "github.com/goliatone/go-admin/pkg/go-sync/service"
	router "github.com/goliatone/go-router"
)

func setupDraftSyncApp(t *testing.T, store *stores.InMemoryStore, scope stores.Scope) *fiber.App {
	return setupDraftSyncAppForActor(t, store, scope, testAdminUserID)
}

func setupDraftSyncAppForActor(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, actorID string) *fiber.App {
	t.Helper()

	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(store),
	)
	syncSvc, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(draftSvc),
		esignsync.NewAgreementDraftIdempotencyStore(store),
	)
	if err != nil {
		t.Fatalf("NewSyncService: %v", err)
	}

	return setupRegisterTestApp(t,
		WithAuthorizer(authorizerFromAllowedMap(draftWorkflowPermissionSet())),
		WithAdminRouteMiddleware(withClaimsUserPermissions(actorID,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
			DefaultPermissions.AdminEdit,
			DefaultPermissions.AdminSend,
		)),
		WithDraftWorkflowService(draftSvc),
		WithAgreementDraftSyncService(syncSvc),
		WithAgreementDraftSyncBootstrap(esignsync.NewAgreementDraftBootstrapper(draftSvc)),
		WithDefaultScope(scope),
	)
}

func doSyncRequest(
	t *testing.T,
	app *fiber.App,
	method, path, userID string,
	payload any,
	headers map[string]string,
) (int, []byte) {
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
	_ = userID
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(strings.TrimSpace(key), strings.TrimSpace(value))
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

func bootstrapAgreementDraft(t *testing.T, app *fiber.App, userID string, headers map[string]string) map[string]any {
	t.Helper()
	status, body := doSyncRequest(t, app, http.MethodPost, "/admin/api/v1/esign/sync/bootstrap/agreement-draft", userID, nil, headers)
	if status != http.StatusCreated {
		t.Fatalf("expected bootstrap status 201, got %d body=%s", status, string(body))
	}
	return mustDecodeJSONMap(t, bytes.NewReader(body))
}

func TestRegisterSyncBootstrapReturnsFreshDraftIDs(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	app := setupDraftSyncApp(t, store, scope)

	first := bootstrapAgreementDraft(t, app, testAdminUserID, nil)
	second := bootstrapAgreementDraft(t, app, testAdminUserID, nil)

	firstRef := mustMapField(t, first, "resource_ref")
	secondRef := mustMapField(t, second, "resource_ref")
	firstID := strings.TrimSpace(toString(firstRef["id"]))
	secondID := strings.TrimSpace(toString(secondRef["id"]))
	if firstID == "" || secondID == "" {
		t.Fatalf("expected non-empty bootstrap resource ids: first=%q second=%q", firstID, secondID)
	}
	if firstID == secondID {
		t.Fatalf("expected fresh bootstrap resource ids, got %q", firstID)
	}
}

func TestRegisterSyncUsesConfiguredScopeResolverForBootstrapAndReads(t *testing.T) {
	_, defaultScope, store := newScopeStoreFixture()
	resolvedScope := stores.Scope{TenantID: "tenant-sync-resolved", OrgID: "org-sync-resolved"}

	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(store),
	)
	syncSvc, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(draftSvc),
		esignsync.NewAgreementDraftIdempotencyStore(store),
	)
	if err != nil {
		t.Fatalf("NewSyncService: %v", err)
	}

	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerFromAllowedMap(draftWorkflowPermissionSet())),
		WithAdminRouteMiddleware(withClaimsUserPermissions(testAdminUserID,
			DefaultPermissions.AdminCreate,
			DefaultPermissions.AdminView,
			DefaultPermissions.AdminEdit,
			DefaultPermissions.AdminSend,
		)),
		WithDraftWorkflowService(draftSvc),
		WithAgreementDraftSyncService(syncSvc),
		WithAgreementDraftSyncBootstrap(esignsync.NewAgreementDraftBootstrapper(draftSvc)),
		WithDefaultScope(defaultScope),
		WithActorScopeResolver(func(_ router.Context) stores.Scope {
			return resolvedScope
		}),
		WithScopeResolver(func(_ router.Context, _ stores.Scope) stores.Scope {
			return resolvedScope
		}),
	)

	bootstrapped := bootstrapAgreementDraft(t, app, testAdminUserID, nil)
	resourceRef := mustMapField(t, bootstrapped, "resource_ref")
	draftID := strings.TrimSpace(toString(resourceRef["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id in bootstrap payload")
	}

	status, body := doSyncRequest(t, app, http.MethodGet, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, nil, nil)
	if status != http.StatusOK {
		t.Fatalf("expected sync load status 200, got %d body=%s", status, string(body))
	}
	readPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	metadata := mustMapField(t, readPayload, "metadata")
	scopeMetadata := mustMapField(t, metadata, "scope")
	if got := strings.TrimSpace(toString(scopeMetadata["tenant_id"])); got != resolvedScope.TenantID {
		t.Fatalf("expected read scope tenant_id %q, got %q", resolvedScope.TenantID, got)
	}
	if got := strings.TrimSpace(toString(scopeMetadata["org_id"])); got != resolvedScope.OrgID {
		t.Fatalf("expected read scope org_id %q, got %q", resolvedScope.OrgID, got)
	}
}

func TestRegisterSyncDraftLifecycleEndpoints(t *testing.T) {
	ctx, scope, store := newScopeStoreFixture()
	app := setupDraftSyncApp(t, store, scope)

	docSvc := services.NewDocumentService(store)
	doc, err := docSvc.Upload(ctx, scope, services.DocumentUploadInput{
		Title:              "Draft Sync Source",
		ObjectKey:          "tenant/tenant-1/org/org-1/docs/draft-sync/source.pdf",
		SourceOriginalName: "source.pdf",
		PDF:                services.GenerateDeterministicPDF(1),
	})
	if err != nil {
		t.Fatalf("Upload: %v", err)
	}

	bootstrapped := bootstrapAgreementDraft(t, app, testAdminUserID, nil)
	resourceRef := mustMapField(t, bootstrapped, "resource_ref")
	draftID := strings.TrimSpace(toString(resourceRef["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id in bootstrap payload: %s", mustJSONStringForTest(bootstrapped))
	}

	status, body := doSyncRequest(t, app, http.MethodGet, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, nil, nil)
	if status != http.StatusOK {
		t.Fatalf("expected sync load status 200, got %d body=%s", status, string(body))
	}
	readPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if revision := toString(readPayload["revision"]); revision != "1" {
		t.Fatalf("expected bootstrap revision=1, got %q payload=%s", revision, string(body))
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

	status, body = doSyncRequest(t, app, http.MethodPatch, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, map[string]any{
		"operation":         "autosave",
		"expected_revision": 1,
		"payload": map[string]any{
			"wizard_state": validState,
			"title":        "Valid Draft",
			"current_step": 6,
			"document_id":  doc.ID,
		},
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("expected sync autosave status 200, got %d body=%s", status, string(body))
	}
	mutatePayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if toString(mutatePayload["applied"]) != "true" {
		t.Fatalf("expected autosave applied=true, got %+v", mutatePayload["applied"])
	}
	if revision := toString(mutatePayload["revision"]); revision != "2" {
		t.Fatalf("expected autosave revision=2, got %q payload=%s", revision, string(body))
	}

	status, body = doSyncRequest(t, app, http.MethodPatch, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, map[string]any{
		"operation":         "autosave",
		"expected_revision": 1,
		"payload": map[string]any{
			"wizard_state": validState,
			"title":        "Stale Draft",
			"current_step": 6,
			"document_id":  doc.ID,
		},
	}, nil)
	if status != http.StatusConflict {
		t.Fatalf("expected stale autosave status 409, got %d body=%s", status, string(body))
	}
	stalePayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	errorPayload := mustMapField(t, stalePayload, "error")
	details := mustMapField(t, errorPayload, "details")
	if strings.TrimSpace(toString(errorPayload["code"])) != "STALE_REVISION" {
		t.Fatalf("expected STALE_REVISION code, got %+v", errorPayload["code"])
	}
	if toString(details["current_revision"]) != "2" {
		t.Fatalf("expected current_revision=2, got %+v", details["current_revision"])
	}
	resource := mustMapField(t, details, "resource")
	if toString(resource["revision"]) != "2" {
		t.Fatalf("expected latest resource revision=2, got %+v", resource["revision"])
	}

	status, body = doSyncRequest(t, app, http.MethodPost, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID+"/actions/send", testAdminUserID, map[string]any{
		"expected_revision": 2,
		"idempotency_key":   "send-once",
		"payload":           map[string]any{},
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("expected sync send status 200, got %d body=%s", status, string(body))
	}
	sendPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if toString(sendPayload["replay"]) != "false" {
		t.Fatalf("expected first send replay=false, got %+v", sendPayload["replay"])
	}
	sendData := mustMapField(t, sendPayload, "data")
	agreementID := strings.TrimSpace(toString(sendData["agreement_id"]))
	if agreementID == "" {
		t.Fatalf("expected agreement_id in send response, got %s", string(body))
	}
	events, err := store.ListForAgreement(context.Background(), scope, agreementID, stores.AuditEventQuery{Limit: 10, SortDesc: true})
	if err != nil {
		t.Fatalf("ListForAgreement: %v", err)
	}
	foundAgreementSent := false
	for _, event := range events {
		if strings.TrimSpace(event.EventType) != "agreement.sent" {
			continue
		}
		foundAgreementSent = true
		if strings.TrimSpace(event.IPAddress) == "" {
			t.Fatalf("expected sync send to preserve audit ip address")
		}
	}
	if !foundAgreementSent {
		t.Fatalf("expected agreement.sent audit event for sync send")
	}

	status, body = doSyncRequest(t, app, http.MethodPost, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID+"/actions/send", testAdminUserID, map[string]any{
		"expected_revision": 2,
		"idempotency_key":   "send-once",
		"payload":           map[string]any{},
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("expected replayed send status 200, got %d body=%s", status, string(body))
	}
	replayPayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if toString(replayPayload["replay"]) != "true" {
		t.Fatalf("expected replayed send replay=true, got %+v", replayPayload["replay"])
	}
	replayData := mustMapField(t, replayPayload, "data")
	if got := strings.TrimSpace(toString(replayData["agreement_id"])); got != agreementID {
		t.Fatalf("expected replay agreement_id %q, got %q", agreementID, got)
	}

	status, body = doSyncRequest(t, app, http.MethodGet, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, nil, nil)
	if status != http.StatusNotFound {
		t.Fatalf("expected sent draft load status 404, got %d body=%s", status, string(body))
	}
}

func TestRegisterSyncDraftScopeIsolation(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	app := setupDraftSyncAppForActor(t, store, scope, testAdminUserID)

	bootstrapped := bootstrapAgreementDraft(t, app, testAdminUserID, nil)
	resourceRef := mustMapField(t, bootstrapped, "resource_ref")
	draftID := strings.TrimSpace(toString(resourceRef["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id in bootstrap payload")
	}

	otherUserApp := setupDraftSyncAppForActor(t, store, scope, "other-user")
	status, body := doSyncRequest(t, otherUserApp, http.MethodGet, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, "other-user", nil, nil)
	if status != http.StatusNotFound {
		t.Fatalf("expected cross-user load status 404, got %d body=%s", status, string(body))
	}
}

func TestRegisterSyncDisposeDeletesDraftWithoutLegacyDraftRoute(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	app := setupDraftSyncAppForActor(t, store, scope, testAdminUserID)

	bootstrapped := bootstrapAgreementDraft(t, app, testAdminUserID, nil)
	resourceRef := mustMapField(t, bootstrapped, "resource_ref")
	draftID := strings.TrimSpace(toString(resourceRef["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id in bootstrap payload")
	}

	status, body := doSyncRequest(t, app, http.MethodPost, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID+"/actions/dispose", testAdminUserID, map[string]any{
		"expected_revision": 1,
		"idempotency_key":   "dispose-once",
		"payload":           map[string]any{},
	}, nil)
	if status != http.StatusOK {
		t.Fatalf("expected sync dispose status 200, got %d body=%s", status, string(body))
	}
	disposePayload := mustDecodeJSONMap(t, bytes.NewReader(body))
	if got := strings.TrimSpace(toString(disposePayload["applied"])); got != "true" {
		t.Fatalf("expected dispose applied=true, got %+v", disposePayload["applied"])
	}

	status, body = doSyncRequest(t, app, http.MethodGet, "/admin/api/v1/esign/sync/resources/agreement_draft/"+draftID, testAdminUserID, nil, nil)
	if status != http.StatusNotFound {
		t.Fatalf("expected discarded draft load status 404, got %d body=%s", status, string(body))
	}
}

func TestRegisterSyncBootstrapRejectsUntrustedUserHeaderWithoutAuthenticatedActor(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	agreementSvc := services.NewAgreementService(store)
	draftSvc := services.NewDraftService(store,
		services.WithDraftAgreementService(agreementSvc),
		services.WithDraftAuditStore(store),
	)
	syncSvc, err := syncservice.NewSyncService(
		esignsync.NewAgreementDraftResourceStore(draftSvc),
		esignsync.NewAgreementDraftIdempotencyStore(store),
	)
	if err != nil {
		t.Fatalf("NewSyncService: %v", err)
	}
	app := setupRegisterTestApp(t,
		WithAuthorizer(authorizerFromAllowedMap(draftWorkflowPermissionSet())),
		WithDraftWorkflowService(draftSvc),
		WithAgreementDraftSyncService(syncSvc),
		WithAgreementDraftSyncBootstrap(esignsync.NewAgreementDraftBootstrapper(draftSvc)),
		WithDefaultScope(scope),
	)

	status, body := doSyncRequest(t, app, http.MethodPost, "/admin/api/v1/esign/sync/bootstrap/agreement-draft", "", nil, map[string]string{
		"X-User-ID": "spoofed-user",
	})
	if status != http.StatusUnauthorized {
		t.Fatalf("expected bootstrap status 401 without authenticated actor, got %d body=%s", status, string(body))
	}
	if !strings.Contains(string(body), `"code":"UNAUTHENTICATED"`) {
		t.Fatalf("expected unauthenticated failure, got body=%s", string(body))
	}
}

func TestRegisterSyncBootstrapEchoesTraceHeaders(t *testing.T) {
	_, scope, store := newScopeStoreFixture()
	app := setupDraftSyncApp(t, store, scope)

	req := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/sync/bootstrap/agreement-draft", nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Request-ID", "req-sync-1")
	req.Header.Set("X-Correlation-ID", "corr-sync-1")
	req.Header.Set("X-Trace-ID", "trace-sync-1")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("bootstrap request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected bootstrap status 201, got %d body=%s", resp.StatusCode, string(body))
	}
	if got := strings.TrimSpace(resp.Header.Get("X-Request-ID")); got != "req-sync-1" {
		t.Fatalf("expected X-Request-ID header to echo request id, got %q", got)
	}
	if got := strings.TrimSpace(resp.Header.Get("X-Correlation-ID")); got != "corr-sync-1" {
		t.Fatalf("expected X-Correlation-ID header to echo correlation id, got %q", got)
	}
	if got := strings.TrimSpace(resp.Header.Get("X-Trace-ID")); got != "trace-sync-1" {
		t.Fatalf("expected X-Trace-ID header to echo trace id, got %q", got)
	}
}

func mustJSONStringForTest(value any) string {
	encoded, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(encoded)
}
