package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/esign/services"
	syncdata "github.com/goliatone/go-admin/pkg/go-sync/data"
)

func TestRuntimeAgreementSyncE2ECreateAutosaveConflictRecoverAndReplaySend(t *testing.T) {
	fixture, err := newESignRuntimeWebFixtureForTestsWithGoogleEnabled(t, false)
	if err != nil {
		t.Fatalf("setup e-sign runtime app fixture: %v", err)
	}
	app := fixture.App
	authCookie := loginRuntimeWebAdmin(t, app)

	documentID := createRuntimeWebSyncDocument(t, app, authCookie)

	bootstrapResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/esign/sync/bootstrap/agreement-draft",
		"application/json",
		bytes.NewReader(nil),
	)
	defer bootstrapResp.Body.Close()
	if bootstrapResp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(bootstrapResp.Body)
		t.Fatalf("expected sync bootstrap status 201, got %d body=%s", bootstrapResp.StatusCode, strings.TrimSpace(string(body)))
	}
	bootstrapPayload := decodeJSONMap(t, bootstrapResp.Body)
	resourceRef := mustMapFieldRuntime(t, bootstrapPayload, "resource_ref")
	draftID := strings.TrimSpace(fmt.Sprint(resourceRef["id"]))
	if draftID == "" {
		t.Fatalf("expected draft id from bootstrap payload, got %+v", bootstrapPayload)
	}
	draftPayload := mustMapFieldRuntime(t, bootstrapPayload, "draft")
	if got := strings.TrimSpace(fmt.Sprint(draftPayload["revision"])); got != "1" {
		t.Fatalf("expected bootstrap revision 1, got %q payload=%+v", got, bootstrapPayload)
	}

	firstAutosavePayload := map[string]any{
		"operation":         "autosave",
		"expected_revision": 1,
		"payload":           runtimeSyncAutosavePayload(documentID, "Runtime Sync Agreement", "Step two", 2),
	}
	firstAutosave := doRuntimeWebSyncMutation(t, app, authCookie, http.MethodPatch, runtimeSyncResourcePath(draftID), firstAutosavePayload)
	if got := strings.TrimSpace(fmt.Sprint(firstAutosave["revision"])); got != "2" {
		t.Fatalf("expected first autosave revision 2, got %q payload=%+v", got, firstAutosave)
	}

	secondAutosavePayload := map[string]any{
		"operation":         "autosave",
		"expected_revision": 2,
		"payload":           runtimeSyncAutosavePayload(documentID, "Runtime Sync Agreement", "Step four", 4),
	}
	secondAutosave := doRuntimeWebSyncMutation(t, app, authCookie, http.MethodPatch, runtimeSyncResourcePath(draftID), secondAutosavePayload)
	if got := strings.TrimSpace(fmt.Sprint(secondAutosave["revision"])); got != "3" {
		t.Fatalf("expected second autosave revision 3, got %q payload=%+v", got, secondAutosave)
	}

	readResp := doRequestWithCookie(t, app, http.MethodGet, runtimeSyncResourcePath(draftID), authCookie)
	defer readResp.Body.Close()
	if readResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(readResp.Body)
		t.Fatalf("expected synced draft read status 200, got %d body=%s", readResp.StatusCode, strings.TrimSpace(string(body)))
	}
	readPayload := decodeJSONMap(t, readResp.Body)
	readData := mustMapFieldRuntime(t, readPayload, "data")
	readWizardState := mustMapFieldRuntime(t, readData, "wizard_state")
	readDetails := mustMapFieldRuntime(t, readWizardState, "details")
	if got := strings.TrimSpace(fmt.Sprint(readDetails["message"])); got != "Step four" {
		t.Fatalf("expected latest autosave message to persist, got %q payload=%+v", got, readPayload)
	}

	staleResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPatch,
		runtimeSyncResourcePath(draftID),
		"application/json",
		mustJSONReader(t, map[string]any{
			"operation":         "autosave",
			"expected_revision": 1,
			"payload":           runtimeSyncAutosavePayload(documentID, "Runtime Sync Agreement", "Stale write", 5),
		}),
	)
	defer staleResp.Body.Close()
	if staleResp.StatusCode != http.StatusConflict {
		body, _ := io.ReadAll(staleResp.Body)
		t.Fatalf("expected stale autosave status 409, got %d body=%s", staleResp.StatusCode, strings.TrimSpace(string(body)))
	}
	stalePayload := decodeJSONMap(t, staleResp.Body)
	staleError := mustMapFieldRuntime(t, stalePayload, "error")
	staleDetails := mustMapFieldRuntime(t, staleError, "details")
	if got := strings.TrimSpace(fmt.Sprint(staleError["code"])); got != "STALE_REVISION" {
		t.Fatalf("expected stale revision code, got %q payload=%+v", got, stalePayload)
	}
	if got := strings.TrimSpace(fmt.Sprint(staleDetails["current_revision"])); got != "3" {
		t.Fatalf("expected current_revision 3, got %q payload=%+v", got, stalePayload)
	}

	recovery := doRuntimeWebSyncMutation(t, app, authCookie, http.MethodPatch, runtimeSyncResourcePath(draftID), map[string]any{
		"operation":         "autosave",
		"expected_revision": 3,
		"payload":           runtimeSyncAutosavePayload(documentID, "Runtime Sync Agreement", "Recovered latest", 5),
	})
	if got := strings.TrimSpace(fmt.Sprint(recovery["revision"])); got != "4" {
		t.Fatalf("expected recovery autosave revision 4, got %q payload=%+v", got, recovery)
	}

	sendPath := runtimeSyncActionPath(draftID, "send")
	firstSend := doRuntimeWebSyncMutation(t, app, authCookie, http.MethodPost, sendPath, map[string]any{
		"expected_revision": 4,
		"idempotency_key":   "runtime-sync-send-once",
		"payload":           map[string]any{},
	})
	if got := strings.TrimSpace(fmt.Sprint(firstSend["replay"])); got != "false" {
		t.Fatalf("expected first send replay=false, got %q payload=%+v", got, firstSend)
	}
	firstSendData := mustMapFieldRuntime(t, firstSend, "data")
	agreementID := strings.TrimSpace(fmt.Sprint(firstSendData["agreement_id"]))
	if agreementID == "" {
		t.Fatalf("expected agreement_id in first send payload, got %+v", firstSend)
	}

	replaySend := doRuntimeWebSyncMutation(t, app, authCookie, http.MethodPost, sendPath, map[string]any{
		"expected_revision": 4,
		"idempotency_key":   "runtime-sync-send-once",
		"payload":           map[string]any{},
	})
	if got := strings.TrimSpace(fmt.Sprint(replaySend["replay"])); got != "true" {
		t.Fatalf("expected replayed send replay=true, got %q payload=%+v", got, replaySend)
	}
	replaySendData := mustMapFieldRuntime(t, replaySend, "data")
	if got := strings.TrimSpace(fmt.Sprint(replaySendData["agreement_id"])); got != agreementID {
		t.Fatalf("expected replayed send agreement_id %q, got %q", agreementID, got)
	}

	agreementDetailResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/api/v1/panels/esign_agreements/"+agreementID, authCookie)
	defer agreementDetailResp.Body.Close()
	if agreementDetailResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementDetailResp.Body)
		t.Fatalf("expected created agreement detail status 200, got %d body=%s", agreementDetailResp.StatusCode, strings.TrimSpace(string(body)))
	}

	sentDraftResp := doRequestWithCookie(t, app, http.MethodGet, runtimeSyncResourcePath(draftID), authCookie)
	defer sentDraftResp.Body.Close()
	if sentDraftResp.StatusCode != http.StatusNotFound {
		body, _ := io.ReadAll(sentDraftResp.Body)
		t.Fatalf("expected sent draft read status 404, got %d body=%s", sentDraftResp.StatusCode, strings.TrimSpace(string(body)))
	}
}

func TestRuntimeAgreementSyncClientUsesEmbeddedPkgArtifactRoute(t *testing.T) {
	app := setupESignRuntimeWebApp(t)
	authCookie := loginRuntimeWebAdmin(t, app)

	agreementResp := doRequestWithCookie(t, app, http.MethodGet, "/admin/content/esign_agreements/new", authCookie)
	defer agreementResp.Body.Close()
	if agreementResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(agreementResp.Body)
		t.Fatalf("expected agreement form status 200, got %d body=%s", agreementResp.StatusCode, strings.TrimSpace(string(body)))
	}
	markup, err := io.ReadAll(agreementResp.Body)
	if err != nil {
		t.Fatalf("read agreement form markup: %v", err)
	}
	pageConfig := extractESignPageConfigFromHTML(t, string(markup))
	pageContext := mustMapFieldRuntime(t, pageConfig, "context")
	syncCfg := mustMapFieldRuntime(t, pageContext, "sync")
	if got := strings.TrimSpace(fmt.Sprint(syncCfg["client_base_path"])); got != "/admin/sync-client/sync-core" {
		t.Fatalf("expected sync.client_base_path /admin/sync-client/sync-core, got %q", got)
	}

	servedResp := doRequest(t, app, http.MethodGet, "/admin/sync-client/sync-core/index.js", "", nil)
	defer servedResp.Body.Close()
	if servedResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(servedResp.Body)
		t.Fatalf("expected sync-core route status 200, got %d body=%s", servedResp.StatusCode, strings.TrimSpace(string(body)))
	}
	servedBody, err := io.ReadAll(servedResp.Body)
	if err != nil {
		t.Fatalf("read served sync-core body: %v", err)
	}

	embeddedBody, err := fs.ReadFile(syncdata.ClientSyncCoreFS(), "index.js")
	if err != nil {
		t.Fatalf("read embedded sync-core body: %v", err)
	}
	if !bytes.Equal(servedBody, embeddedBody) {
		t.Fatalf("expected served sync-core asset to match embedded pkg/go-sync artifact")
	}
}

func loginRuntimeWebAdmin(t *testing.T, app *fiber.App) *http.Cookie {
	t.Helper()

	form := url.Values{}
	form.Set("identifier", defaultESignDemoAdminEmail)
	form.Set("password", defaultESignDemoAdminPassword)
	loginResp := doRequest(t, app, http.MethodPost, "/admin/login", "application/x-www-form-urlencoded", strings.NewReader(form.Encode()))
	defer loginResp.Body.Close()
	authCookie := firstAuthCookie(loginResp)
	if authCookie == nil {
		t.Fatal("expected auth cookie after login")
	}
	return authCookie
}

func createRuntimeWebSyncDocument(t *testing.T, app *fiber.App, authCookie *http.Cookie) string {
	t.Helper()

	var uploadBody bytes.Buffer
	uploadWriter := multipart.NewWriter(&uploadBody)
	fileWriter, err := uploadWriter.CreateFormFile("file", fmt.Sprintf("sync-runtime-%d.pdf", time.Now().UnixNano()))
	if err != nil {
		t.Fatalf("create upload file: %v", err)
	}
	if _, err := fileWriter.Write(services.GenerateDeterministicPDF(1)); err != nil {
		t.Fatalf("write upload payload: %v", err)
	}
	if err := uploadWriter.Close(); err != nil {
		t.Fatalf("close upload writer: %v", err)
	}

	uploadResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/api/v1/esign/documents/upload",
		uploadWriter.FormDataContentType(),
		&uploadBody,
	)
	defer uploadResp.Body.Close()
	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		t.Fatalf("expected upload status 200, got %d body=%s", uploadResp.StatusCode, strings.TrimSpace(string(body)))
	}
	uploadPayload := decodeJSONMap(t, uploadResp.Body)
	objectKey := strings.TrimSpace(fmt.Sprint(uploadPayload["object_key"]))
	if objectKey == "" {
		t.Fatalf("expected object_key in upload payload, got %+v", uploadPayload)
	}

	documentReqBody := url.Values{}
	documentReqBody.Set("title", fmt.Sprintf("Runtime Sync Source %d", time.Now().UnixNano()))
	documentReqBody.Set("source_object_key", objectKey)
	documentReqBody.Set("source_original_name", "runtime-sync-source.pdf")
	createDocumentResp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		http.MethodPost,
		"/admin/content/esign_documents",
		"application/x-www-form-urlencoded",
		strings.NewReader(documentReqBody.Encode()),
	)
	defer createDocumentResp.Body.Close()
	if createDocumentResp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(createDocumentResp.Body)
		t.Fatalf("expected document create redirect 302, got %d body=%s", createDocumentResp.StatusCode, strings.TrimSpace(string(body)))
	}
	documentID := parseIDFromLocation("/admin/content/esign_documents/", strings.TrimSpace(createDocumentResp.Header.Get("Location")))
	if documentID == "" {
		t.Fatalf("expected document id from create response location, got %q", createDocumentResp.Header.Get("Location"))
	}
	return documentID
}

func runtimeSyncAutosavePayload(documentID, title, message string, step int) map[string]any {
	return map[string]any{
		"wizard_state": map[string]any{
			"document": map[string]any{"id": documentID},
			"details": map[string]any{
				"title":   title,
				"message": message,
			},
			"participants": []map[string]any{
				{
					"tempId": "participant-1",
					"name":   "Runtime Sync Signer",
					"email":  "runtime.sync.signer@example.test",
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
		},
		"title":        title,
		"current_step": step,
		"document_id":  documentID,
	}
}

func runtimeSyncResourcePath(draftID string) string {
	return "/admin/api/v1/esign/sync/resources/agreement_draft/" + url.PathEscape(draftID)
}

func runtimeSyncActionPath(draftID, operation string) string {
	return "/admin/api/v1/esign/sync/resources/agreement_draft/" + url.PathEscape(draftID) + "/actions/" + url.PathEscape(operation)
}

func doRuntimeWebSyncMutation(
	t *testing.T,
	app *fiber.App,
	authCookie *http.Cookie,
	method, path string,
	payload map[string]any,
) map[string]any {
	t.Helper()

	resp := doRequestWithCookieAndBody(
		t,
		app,
		authCookie,
		method,
		path,
		"application/json",
		mustJSONReader(t, payload),
	)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected %s %s status 200, got %d body=%s", method, path, resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return decodeJSONMap(t, resp.Body)
}

func mustJSONReader(t *testing.T, value any) io.Reader {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal json payload: %v", err)
	}
	return bytes.NewReader(raw)
}

func decodeJSONMap(t *testing.T, reader io.Reader) map[string]any {
	t.Helper()
	payload := map[string]any{}
	if err := json.NewDecoder(reader).Decode(&payload); err != nil {
		t.Fatalf("decode json payload: %v", err)
	}
	return payload
}

func mustMapFieldRuntime(t *testing.T, payload map[string]any, key string) map[string]any {
	t.Helper()
	value, ok := payload[key]
	if !ok {
		t.Fatalf("expected field %q in payload %+v", key, payload)
	}
	out, ok := value.(map[string]any)
	if !ok || out == nil {
		t.Fatalf("expected field %q to be an object, got %+v", key, value)
	}
	return out
}
