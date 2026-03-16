package modules

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/require"
)

func TestESignActionContractsPhase6FixtureSnapshot(t *testing.T) {
	fixture := buildESignActionContractsPhase6Fixture(t)
	data, err := json.MarshalIndent(fixture, "", "  ")
	require.NoError(t, err, "marshal phase 6 fixture")

	path := filepath.Join("..", "..", "..", "pkg", "client", "assets", "tests", "fixtures", "examples_esign_action_contracts", "esign_actions_phase6.json")
	if os.Getenv("UPDATE_FIXTURES") == "1" {
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755), "create phase 6 fixture directory")
		require.NoError(t, os.WriteFile(path, append(data, '\n'), 0o644), "write phase 6 fixture snapshot")
	}
	expected, err := os.ReadFile(path)
	require.NoError(t, err, "read phase 6 fixture snapshot")
	require.Equal(t, strings.TrimSpace(string(expected)), strings.TrimSpace(string(data)))
}

func TestESignActionContractsPhase6ExposeCanonicalListAndDetailState(t *testing.T) {
	fixture := buildESignActionContractsPhase6Fixture(t)

	documents := extractFixtureMap(t, fixture["documents"])
	documentList := extractFixtureMap(t, documents["list_contract"])
	documentDetail := extractFixtureMap(t, documents["detail_contract"])

	assertActionStateCode(t, extractFixtureMap(t, extractFixtureMap(t, documentList["record"])["_action_state"]), "delete", coreadmin.ActionDisabledReasonCodeResourceInUse)
	assertActionStateCode(t, extractFixtureMap(t, extractFixtureMap(t, documentDetail["data"])["_action_state"]), "delete", coreadmin.ActionDisabledReasonCodeResourceInUse)

	agreements := extractFixtureMap(t, fixture["agreements"])
	agreementList := extractFixtureMap(t, agreements["list_contract"])
	agreementDetail := extractFixtureMap(t, agreements["detail_contract"])

	assertActionStateCode(t, extractFixtureMap(t, extractFixtureMap(t, agreementList["record"])["_action_state"]), "send", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	assertActionStateEnabled(t, extractFixtureMap(t, extractFixtureMap(t, agreementList["record"])["_action_state"]), "resend", true)
	assertActionStateEnabled(t, extractFixtureMap(t, extractFixtureMap(t, agreementList["record"])["_action_state"]), "void", true)

	detailState := extractFixtureMap(t, extractFixtureMap(t, agreementDetail["data"])["_action_state"])
	assertActionStateCode(t, detailState, "edit", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	assertActionStateCode(t, detailState, "delete", coreadmin.ActionDisabledReasonCodePreconditionFailed)
	assertActionStateCode(t, detailState, "send", coreadmin.ActionDisabledReasonCodeInvalidStatus)
	assertActionStateEnabled(t, detailState, "resend", true)
	assertActionStateEnabled(t, detailState, "void", true)
	assertActionStateCode(t, detailState, "resume_delivery", coreadmin.ActionDisabledReasonCodePreconditionFailed)
}

func TestESignActionContractsPhase6StructuredFailuresAndFilters(t *testing.T) {
	fixture := buildESignActionContractsPhase6Fixture(t)

	documents := extractFixtureMap(t, fixture["documents"])
	deleteFailure := extractFixtureMap(t, extractFixtureMap(t, documents["execution_failures"])["delete"])
	require.Equal(t, http.StatusConflict, toInt(deleteFailure["status"]))

	errPayload := extractFixtureMap(t, deleteFailure["error"])
	require.Equal(t, coreadmin.TextCodeResourceInUse, strings.TrimSpace(toString(errPayload["text_code"])))
	require.Equal(t, 2, toInt(extractFixtureMap(t, errPayload["metadata"])["agreement_count"]))

	agreements := extractFixtureMap(t, fixture["agreements"])
	filtered := extractFixtureMap(t, agreements["filtered_by_document_id"])
	require.Equal(t, 2, toInt(filtered["count"]))

	ids := extractFixtureSlice(t, filtered["ids"])
	require.ElementsMatch(t, []string{"agreement-phase6-draft", "agreement-phase6-sent"}, toStringSlice(ids))
}

func buildESignActionContractsPhase6Fixture(t *testing.T) map[string]any {
	t.Helper()

	module, server, scope := setupESignModuleArtifactSubresourceTest(t, allowAllAuthorizer{})
	store, ok := module.store.(*stores.InMemoryStore)
	require.True(t, ok, "expected in-memory store")

	seedESignContractDocument(t, store, scope, "doc-phase6-001", "Phase 6 Protected Document")
	seedESignContractDocument(t, store, scope, "doc-phase6-002", "Phase 6 Secondary Document")

	seedESignContractAgreement(t, module, store, scope, "agreement-phase6-sent", "doc-phase6-001", "Phase 6 Sent Agreement", true)
	seedESignContractAgreement(t, module, store, scope, "agreement-phase6-draft", "doc-phase6-001", "Phase 6 Draft Agreement", false)
	seedESignContractAgreement(t, module, store, scope, "agreement-phase6-other", "doc-phase6-002", "Phase 6 Secondary Agreement", false)

	documentListPath := scopedPanelCollectionPath(scope, esignDocumentsPanelID) + "&page=1&per_page=100"
	agreementListPath := scopedPanelCollectionPath(scope, esignAgreementsPanelID) + "&page=1&per_page=100"

	documentListPayload := doPanelJSONRequest(t, server, http.MethodGet, documentListPath, nil)
	documentRecord := extractListRecordByID(t, documentListPayload, "doc-phase6-001")

	documentDetailPayload := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelDetailPath(scope, esignDocumentsPanelID, "doc-phase6-001"), nil)
	documentDeleteStatus, documentDeleteFailure := doPanelJSONRequestWithStatus(t, server, http.MethodDelete, scopedPanelDetailPath(scope, esignDocumentsPanelID, "doc-phase6-001"), nil)

	agreementListPayload := doPanelJSONRequest(t, server, http.MethodGet, agreementListPath, nil)
	agreementRecord := extractListRecordByID(t, agreementListPayload, "agreement-phase6-sent")
	agreementDetailPayload := doPanelJSONRequest(t, server, http.MethodGet, scopedPanelDetailPath(scope, esignAgreementsPanelID, "agreement-phase6-sent"), nil)
	filteredStatus, filteredAgreements := doPanelJSONRequestWithStatus(
		t,
		server,
		http.MethodGet,
		agreementListPath+"&document_id=doc-phase6-001",
		nil,
	)
	require.Equal(t, http.StatusOK, filteredStatus, "filtered agreements payload=%+v", filteredAgreements)

	return map[string]any{
		"schema_version": 1,
		"documents": map[string]any{
			"list_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActionsPayload(documentListPayload), "view", "delete"),
				},
				"record": filterRecordContract(documentRecord, "delete"),
			},
			"detail_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActionsPayload(documentDetailPayload), "view", "delete"),
				},
				"data": filterRecordContract(extractTestRecordPayload(t, documentDetailPayload), "delete"),
			},
			"execution_failures": map[string]any{
				"delete": map[string]any{
					"status": documentDeleteStatus,
					"error":  filterExecutionFailure(extractFixtureMap(t, documentDeleteFailure["error"]), "agreement_count", "agreement_statuses", "business_rule_id", "document_id", "remediation_href", "remediation_label"),
				},
			},
		},
		"agreements": map[string]any{
			"list_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActionsPayload(agreementListPayload), "send", "resend", "void"),
				},
				"record": filterRecordContract(agreementRecord, "send", "resend", "void"),
			},
			"detail_contract": map[string]any{
				"schema": map[string]any{
					"actions": filterActionContracts(extractSchemaActionsPayload(agreementDetailPayload), "edit", "delete", "send", "resend", "resume_delivery", "void"),
				},
				"data": filterRecordContract(extractTestRecordPayload(t, agreementDetailPayload), "edit", "delete", "send", "resend", "resume_delivery", "void"),
			},
			"filtered_by_document_id": map[string]any{
				"document_id": "doc-phase6-001",
				"count":       len(extractListRecordsPayload(filteredAgreements)),
				"ids":         extractRecordIDs(extractListRecordsPayload(filteredAgreements)),
			},
		},
	}
}

func seedESignContractDocument(t *testing.T, store *stores.InMemoryStore, scope stores.Scope, id, title string) {
	t.Helper()
	now := time.Date(2026, time.January, 15, 12, 0, 0, 0, time.UTC)
	_, err := store.Create(context.Background(), scope, stores.DocumentRecord{
		ID:                 id,
		Title:              title,
		CreatedByUserID:    "ops-user",
		SourceObjectKey:    "tenant/" + scope.TenantID + "/org/" + scope.OrgID + "/docs/" + id + ".pdf",
		SourceOriginalName: id + ".pdf",
		SourceSHA256:       strings.Repeat("a", 64),
		SizeBytes:          4096,
		PageCount:          2,
		CreatedAt:          now,
		UpdatedAt:          now,
	})
	require.NoError(t, err, "seed document %s", id)
}

func seedESignContractAgreement(t *testing.T, module *ESignModule, store *stores.InMemoryStore, scope stores.Scope, id, documentID, title string, send bool) {
	t.Helper()
	now := time.Date(2026, time.January, 15, 13, 0, 0, 0, time.UTC)
	_, err := store.CreateDraft(context.Background(), scope, stores.AgreementRecord{
		ID:              id,
		DocumentID:      documentID,
		Title:           title,
		Message:         "Please review and sign.",
		Status:          stores.AgreementStatusDraft,
		CreatedByUserID: "ops-user",
		UpdatedByUserID: "ops-user",
		CreatedAt:       now,
		UpdatedAt:       now,
		SourceType:      stores.SourceTypeUpload,
	})
	require.NoError(t, err, "seed agreement %s", id)

	recipientEmail := strings.ReplaceAll(id, "agreement-", "signer-") + "@example.test"
	recipientName := "Primary Signer"
	recipientRole := stores.RecipientRoleSigner
	signingOrder := 1
	recipientID := "recipient-" + id
	recipient, err := module.agreements.UpsertRecipientDraft(context.Background(), scope, id, stores.RecipientDraftPatch{
		ID:           recipientID,
		Email:        &recipientEmail,
		Name:         &recipientName,
		Role:         &recipientRole,
		SigningOrder: &signingOrder,
	}, 0)
	require.NoError(t, err, "seed recipient %s", id)

	fieldType := stores.FieldTypeSignature
	pageNumber := 1
	posX := 0.15
	posY := 0.65
	width := 0.25
	height := 0.08
	required := true
	_, err = module.agreements.UpsertFieldDraft(context.Background(), scope, id, stores.FieldDraftPatch{
		RecipientID: &recipient.ID,
		Type:        &fieldType,
		PageNumber:  &pageNumber,
		PosX:        &posX,
		PosY:        &posY,
		Width:       &width,
		Height:      &height,
		Required:    &required,
	})
	require.NoError(t, err, "seed field %s", id)

	if !send {
		return
	}
	_, err = module.agreements.Send(context.Background(), scope, id, services.SendInput{
		IdempotencyKey: "send-" + id,
		IPAddress:      "127.0.0.1",
	})
	require.NoError(t, err, "send agreement %s", id)
}

func doPanelJSONRequest(t *testing.T, server router.Server[*fiber.App], method, requestPath string, payload map[string]any) map[string]any {
	t.Helper()
	status, out := doPanelJSONRequestWithStatus(t, server, method, requestPath, payload)
	require.Equal(t, http.StatusOK, status, "request %s %s payload=%+v", method, requestPath, out)
	return out
}

func doPanelJSONRequestWithStatus(t *testing.T, server router.Server[*fiber.App], method, requestPath string, payload map[string]any) (int, map[string]any) {
	t.Helper()

	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		require.NoError(t, err, "marshal payload")
		body = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, requestPath, body)
	req.Header.Set("X-User-ID", "ops-user")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := server.WrappedRouter().Test(req, -1)
	require.NoError(t, err, "request %s %s", method, requestPath)
	defer res.Body.Close()

	out := map[string]any{}
	if strings.TrimSpace(res.Status) != "" {
		bodyBytes, readErr := io.ReadAll(res.Body)
		require.NoError(t, readErr, "read response body")
		if strings.TrimSpace(string(bodyBytes)) != "" {
			require.NoError(t, json.Unmarshal(bodyBytes, &out), "decode response body")
		}
	}
	return res.StatusCode, out
}

func scopedPanelCollectionPath(scope stores.Scope, panel string) string {
	return "/admin/api/v1/panels/" + strings.TrimSpace(panel) + "?tenant_id=" + scope.TenantID + "&org_id=" + scope.OrgID
}

func scopedPanelDetailPath(scope stores.Scope, panel, id string) string {
	return "/admin/api/v1/panels/" + strings.TrimSpace(panel) + "/" + strings.TrimSpace(id) + "?tenant_id=" + scope.TenantID + "&org_id=" + scope.OrgID
}

func extractSchemaActionsPayload(payload map[string]any) []any {
	out, _ := tolerateMap(payload["schema"])["actions"].([]any)
	return out
}

func extractTestRecordPayload(t *testing.T, payload map[string]any) map[string]any {
	t.Helper()
	record := tolerateMap(payload["data"])
	require.NotEmpty(t, record, "expected detail payload record")
	return record
}

func extractListRecordsPayload(payload map[string]any) []any {
	for _, key := range []string{"items", "records", "data"} {
		if out, ok := payload[key].([]any); ok && len(out) > 0 {
			return out
		}
	}
	if out, ok := payload["items"].([]any); ok {
		return out
	}
	return nil
}

func extractListRecordByID(t *testing.T, payload map[string]any, id string) map[string]any {
	t.Helper()
	for _, item := range extractListRecordsPayload(payload) {
		record, _ := item.(map[string]any)
		if strings.TrimSpace(toString(record["id"])) == strings.TrimSpace(id) {
			return record
		}
	}
	t.Fatalf("expected record %q in payload %+v", id, payload)
	return nil
}

func filterActionContracts(actions []any, names ...string) []map[string]any {
	if len(actions) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, name := range names {
		allowed[strings.ToLower(strings.TrimSpace(name))] = struct{}{}
	}
	out := make([]map[string]any, 0, len(names))
	for _, item := range actions {
		action, _ := item.(map[string]any)
		name := strings.ToLower(strings.TrimSpace(toString(action["name"])))
		if _, ok := allowed[name]; !ok {
			continue
		}
		out = append(out, map[string]any{
			"name":         strings.TrimSpace(toString(action["name"])),
			"label":        strings.TrimSpace(toString(action["label"])),
			"scope":        strings.TrimSpace(toString(action["scope"])),
			"command_name": strings.TrimSpace(toString(action["command_name"])),
			"variant":      strings.TrimSpace(toString(action["variant"])),
		})
	}
	return out
}

func filterRecordContract(record map[string]any, actionNames ...string) map[string]any {
	if len(record) == 0 {
		return nil
	}
	out := map[string]any{
		"id":     strings.TrimSpace(toString(record["id"])),
		"title":  strings.TrimSpace(toString(record["title"])),
		"status": strings.TrimSpace(toString(record["status"])),
	}
	if documentID := strings.TrimSpace(toString(record["document_id"])); documentID != "" {
		out["document_id"] = documentID
	}
	out["_action_state"] = filterActionState(tolerateMap(record["_action_state"]), actionNames...)
	return out
}

func filterActionState(state map[string]any, actionNames ...string) map[string]any {
	if len(state) == 0 {
		return nil
	}
	allowed := map[string]struct{}{}
	for _, actionName := range actionNames {
		allowed[strings.ToLower(strings.TrimSpace(actionName))] = struct{}{}
	}
	out := map[string]any{}
	for actionName, raw := range state {
		if _, ok := allowed[strings.ToLower(strings.TrimSpace(actionName))]; !ok {
			continue
		}
		actionState := tolerateMap(raw)
		entry := map[string]any{
			"enabled": actionState["enabled"],
		}
		for _, key := range []string{"reason_code", "reason", "severity", "kind"} {
			if value := strings.TrimSpace(toString(actionState[key])); value != "" {
				entry[key] = value
			}
		}
		if metadata := tolerateMap(actionState["metadata"]); len(metadata) > 0 {
			entry["metadata"] = metadata
		}
		if remediation := tolerateMap(actionState["remediation"]); len(remediation) > 0 {
			entry["remediation"] = remediation
		}
		out[actionName] = entry
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func filterExecutionFailure(errPayload map[string]any, metadataKeys ...string) map[string]any {
	if len(errPayload) == 0 {
		return nil
	}
	out := map[string]any{
		"text_code": strings.TrimSpace(toString(errPayload["text_code"])),
		"message":   strings.TrimSpace(toString(errPayload["message"])),
	}
	metadata := tolerateMap(errPayload["metadata"])
	if len(metadataKeys) > 0 && len(metadata) > 0 {
		filtered := map[string]any{}
		for _, key := range metadataKeys {
			value, ok := metadata[key]
			if ok {
				filtered[key] = value
			}
		}
		if len(filtered) > 0 {
			out["metadata"] = filtered
		}
	}
	return out
}

func extractRecordIDs(records []any) []string {
	out := make([]string, 0, len(records))
	for _, item := range records {
		record, _ := item.(map[string]any)
		if id := strings.TrimSpace(toString(record["id"])); id != "" {
			out = append(out, id)
		}
	}
	return out
}

func assertActionStateCode(t *testing.T, actionState map[string]any, actionName, code string) {
	t.Helper()
	entry := tolerateMap(actionState[actionName])
	require.NotEmpty(t, entry, "expected action state for %s in %+v", actionName, actionState)
	require.Equal(t, strings.TrimSpace(code), strings.TrimSpace(toString(entry["reason_code"])))
}

func assertActionStateEnabled(t *testing.T, actionState map[string]any, actionName string, enabled bool) {
	t.Helper()
	entry := tolerateMap(actionState[actionName])
	require.NotEmpty(t, entry, "expected action state for %s in %+v", actionName, actionState)
	require.Equal(t, enabled, entry["enabled"])
}

func extractFixtureMap(t *testing.T, value any) map[string]any {
	t.Helper()
	out := tolerateMap(value)
	require.NotNil(t, out, "expected map payload, got %#v", value)
	return out
}

func tolerateMap(value any) map[string]any {
	out, _ := value.(map[string]any)
	return out
}

func extractFixtureSlice(t *testing.T, value any) []any {
	t.Helper()
	if raw, ok := value.([]string); ok {
		out := make([]any, 0, len(raw))
		for _, entry := range raw {
			out = append(out, entry)
		}
		return out
	}
	out, ok := value.([]any)
	require.True(t, ok, "expected slice payload, got %#v", value)
	return out
}

func toStringSlice(values []any) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		out = append(out, strings.TrimSpace(toString(value)))
	}
	return out
}
