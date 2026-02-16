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

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

func TestRegisterIntegrationMappingAndPublishEndpoints(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	integration := services.NewIntegrationFoundationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithIntegrationFoundationService(integration),
		WithDefaultScope(scope),
	)

	mappingPayload := map[string]any{
		"provider": "crm",
		"name":     "employee-participant-mapping",
		"external_schema": map[string]any{
			"object_type": "employee",
			"version":     "v1",
			"fields": []map[string]any{
				{"object": "employee", "field": "email", "type": "string", "required": true},
				{"object": "employee", "field": "name", "type": "string", "required": true},
			},
		},
		"rules": []map[string]any{
			{"source_object": "employee", "source_field": "name", "target_entity": "participant", "target_path": "name"},
			{"source_object": "employee", "source_field": "email", "target_entity": "participant", "target_path": "email"},
		},
	}
	mappingBody, _ := json.Marshal(mappingPayload)
	createReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/mappings", bytes.NewReader(mappingBody))
	createReq.Header.Set("Content-Type", "application/json")
	createResp, err := app.Test(createReq, -1)
	if err != nil {
		t.Fatalf("create mapping request failed: %v", err)
	}
	defer createResp.Body.Close()
	if createResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(createResp.Body)
		t.Fatalf("expected create mapping status 200, got %d body=%s", createResp.StatusCode, payload)
	}
	created := decodeBodyMap(t, createResp.Body)
	mapping := asMap(t, created["mapping"])
	mappingID := strings.TrimSpace(asString(mapping["id"]))
	if mappingID == "" {
		t.Fatalf("expected mapping id in response: %+v", mapping)
	}
	if strings.TrimSpace(asString(mapping["compiled_hash"])) == "" {
		t.Fatalf("expected compiled hash in mapping payload: %+v", mapping)
	}
	version := int64(asFloat(mapping["version"]))

	publishBody, _ := json.Marshal(map[string]any{"expected_version": version})
	publishReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/mappings/"+mappingID+"/publish", bytes.NewReader(publishBody))
	publishReq.Header.Set("Content-Type", "application/json")
	publishResp, err := app.Test(publishReq, -1)
	if err != nil {
		t.Fatalf("publish mapping request failed: %v", err)
	}
	defer publishResp.Body.Close()
	if publishResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(publishResp.Body)
		t.Fatalf("expected publish status 200, got %d body=%s", publishResp.StatusCode, payload)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/integrations/mappings/"+mappingID, nil)
	getResp, err := app.Test(getReq, -1)
	if err != nil {
		t.Fatalf("get mapping request failed: %v", err)
	}
	defer getResp.Body.Close()
	if getResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(getResp.Body)
		t.Fatalf("expected get mapping status 200, got %d body=%s", getResp.StatusCode, payload)
	}
	fetched := decodeBodyMap(t, getResp.Body)
	fetchedMapping := asMap(t, fetched["mapping"])
	if asString(fetchedMapping["status"]) != stores.MappingSpecStatusPublished {
		t.Fatalf("expected published mapping status, got %+v", fetchedMapping)
	}
}

func TestRegisterIntegrationSyncConflictInboundOutboundEndpoints(t *testing.T) {
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	integration := services.NewIntegrationFoundationService(store)
	app := setupRegisterTestApp(t,
		WithAuthorizer(mapAuthorizer{allowed: map[string]bool{
			DefaultPermissions.AdminSettings: true,
			DefaultPermissions.AdminView:     true,
		}}),
		WithIntegrationFoundationService(integration),
		WithDefaultScope(scope),
	)

	compiled, err := integration.ValidateAndCompileMapping(context.Background(), scope, services.MappingCompileInput{
		Provider: "crm",
		Name:     "sync-diagnostics-spec",
		ExternalSchema: stores.ExternalSchema{
			ObjectType: "agreement",
			Version:    "v1",
			Fields:     []stores.ExternalFieldRef{{Object: "agreement", Field: "title", Type: "string"}},
		},
		Rules: []stores.MappingRule{{SourceObject: "agreement", SourceField: "title", TargetEntity: "agreement", TargetPath: "title"}},
	})
	if err != nil {
		t.Fatalf("ValidateAndCompileMapping: %v", err)
	}

	startBody, _ := json.Marshal(map[string]any{
		"provider":        "crm",
		"direction":       "inbound",
		"mapping_spec_id": compiled.Spec.ID,
		"cursor":          "batch-0",
	})
	startReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/sync-runs", bytes.NewReader(startBody))
	startReq.Header.Set("Content-Type", "application/json")
	startReq.Header.Set("Idempotency-Key", "sync-start-1")
	startResp, err := app.Test(startReq, -1)
	if err != nil {
		t.Fatalf("start sync run request failed: %v", err)
	}
	defer startResp.Body.Close()
	if startResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(startResp.Body)
		t.Fatalf("expected start sync run status 200, got %d body=%s", startResp.StatusCode, payload)
	}
	started := decodeBodyMap(t, startResp.Body)
	run := asMap(t, started["run"])
	runID := strings.TrimSpace(asString(run["id"]))
	if runID == "" {
		t.Fatalf("expected sync run id in response: %+v", started)
	}

	checkpointBody, _ := json.Marshal(map[string]any{
		"checkpoint_key": "page-1",
		"cursor":         "batch-1",
		"payload":        map[string]any{"offset": 100},
	})
	checkpointReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/sync-runs/"+runID+"/checkpoints", bytes.NewReader(checkpointBody))
	checkpointReq.Header.Set("Content-Type", "application/json")
	checkpointResp, err := app.Test(checkpointReq, -1)
	if err != nil {
		t.Fatalf("checkpoint request failed: %v", err)
	}
	defer checkpointResp.Body.Close()
	if checkpointResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(checkpointResp.Body)
		t.Fatalf("expected checkpoint status 200, got %d body=%s", checkpointResp.StatusCode, payload)
	}
	checkpointPayload := decodeBodyMap(t, checkpointResp.Body)
	checkpoint := asMap(t, checkpointPayload["checkpoint"])
	if asString(checkpoint["checkpoint_key"]) != "page-1" {
		t.Fatalf("expected checkpoint key page-1, got %+v", checkpoint)
	}

	agreementID := createIntegrationAgreementForHandlerTests(t, store, scope)
	_, _, err = integration.DetectConflict(context.Background(), scope, services.DetectConflictInput{
		RunID:      runID,
		Provider:   "crm",
		EntityKind: "agreement",
		ExternalID: "ext-agreement-1",
		InternalID: agreementID,
		Reason:     "title mismatch",
		Payload:    map[string]any{"email": "ops@example.com", "safe": "ok"},
	})
	if err != nil {
		t.Fatalf("DetectConflict: %v", err)
	}

	diagnosticsReq := httptest.NewRequest(http.MethodGet, "/admin/api/v1/esign/integrations/diagnostics?run_id="+runID, nil)
	diagnosticsResp, err := app.Test(diagnosticsReq, -1)
	if err != nil {
		t.Fatalf("diagnostics request failed: %v", err)
	}
	defer diagnosticsResp.Body.Close()
	if diagnosticsResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(diagnosticsResp.Body)
		t.Fatalf("expected diagnostics status 200, got %d body=%s", diagnosticsResp.StatusCode, payload)
	}
	diagnostics := decodeBodyMap(t, diagnosticsResp.Body)
	conflicts := asSlice(t, diagnostics["conflicts"])
	if len(conflicts) != 1 {
		t.Fatalf("expected diagnostics to include one conflict, got %+v", diagnostics)
	}
	conflict := asMap(t, conflicts[0])
	conflictID := asString(conflict["id"])

	resolveBody, _ := json.Marshal(map[string]any{
		"status":              stores.IntegrationConflictStatusResolved,
		"resolved_by_user_id": "ops-user",
		"resolution":          map[string]any{"action": "keep_internal"},
	})
	resolveReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/conflicts/"+conflictID+"/resolve", bytes.NewReader(resolveBody))
	resolveReq.Header.Set("Content-Type", "application/json")
	resolveReq.Header.Set("Idempotency-Key", "resolve-conflict-1")
	resolveResp, err := app.Test(resolveReq, -1)
	if err != nil {
		t.Fatalf("resolve request failed: %v", err)
	}
	defer resolveResp.Body.Close()
	if resolveResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(resolveResp.Body)
		t.Fatalf("expected resolve status 200, got %d body=%s", resolveResp.StatusCode, payload)
	}

	inboundBody, _ := json.Marshal(map[string]any{
		"provider":       "crm",
		"entity_kind":    "agreement",
		"external_id":    "ext-agreement-1",
		"agreement_id":   agreementID,
		"metadata_title": "Hydrated from CRM",
		"participants": []map[string]any{
			{"external_id": "ext-participant-1", "email": "signer@example.com", "name": "Signer", "role": "signer", "signing_stage": 1},
		},
		"field_definitions": []map[string]any{
			{"participant_external_id": "ext-participant-1", "type": "signature", "required": true, "page_number": 1, "x": 0.1, "y": 0.2, "width": 0.2, "height": 0.07},
		},
		"idempotency_key": "inbound-handler-1",
	})
	inboundReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/inbound", bytes.NewReader(inboundBody))
	inboundReq.Header.Set("Content-Type", "application/json")
	inboundResp, err := app.Test(inboundReq, -1)
	if err != nil {
		t.Fatalf("inbound request failed: %v", err)
	}
	defer inboundResp.Body.Close()
	if inboundResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(inboundResp.Body)
		t.Fatalf("expected inbound status 200, got %d body=%s", inboundResp.StatusCode, payload)
	}
	inbound := decodeBodyMap(t, inboundResp.Body)
	result := asMap(t, inbound["result"])
	if asFloat(result["participant_count"]) != 1 {
		t.Fatalf("expected participant_count=1, got %+v", result)
	}

	outboundBody, _ := json.Marshal(map[string]any{
		"provider":        "crm",
		"agreement_id":    agreementID,
		"event_type":      "agreement.completed",
		"source_event_id": "audit-evt-1",
		"payload":         map[string]any{"status": "completed", "token": "sensitive"},
		"idempotency_key": "outbound-handler-1",
	})
	outboundReq := httptest.NewRequest(http.MethodPost, "/admin/api/v1/esign/integrations/outbound", bytes.NewReader(outboundBody))
	outboundReq.Header.Set("Content-Type", "application/json")
	outboundResp, err := app.Test(outboundReq, -1)
	if err != nil {
		t.Fatalf("outbound request failed: %v", err)
	}
	defer outboundResp.Body.Close()
	if outboundResp.StatusCode != http.StatusOK {
		payload, _ := io.ReadAll(outboundResp.Body)
		t.Fatalf("expected outbound status 200, got %d body=%s", outboundResp.StatusCode, payload)
	}
	outbound := decodeBodyMap(t, outboundResp.Body)
	event := asMap(t, outbound["event"])
	if strings.Contains(asString(event["payload_json"]), "sensitive") {
		t.Fatalf("expected outbound payload to be redacted, got %+v", event)
	}
}

func createIntegrationAgreementForHandlerTests(t *testing.T, store *stores.InMemoryStore, scope stores.Scope) string {
	t.Helper()
	ctx := context.Background()
	doc, err := store.Create(ctx, scope, stores.DocumentRecord{
		Title:           "Handler Integration Document",
		SourceObjectKey: "tenant/tenant-1/org/org-1/docs/handler-integration.pdf",
		SourceSHA256:    strings.Repeat("b", 64),
		SizeBytes:       1024,
		PageCount:       1,
	})
	if err != nil {
		t.Fatalf("Create document: %v", err)
	}
	agreement, err := store.CreateDraft(ctx, scope, stores.AgreementRecord{
		DocumentID: doc.ID,
		Title:      "Handler Integration Draft",
		Message:    "Seed",
	})
	if err != nil {
		t.Fatalf("Create draft agreement: %v", err)
	}
	return agreement.ID
}

func decodeBodyMap(t *testing.T, body io.Reader) map[string]any {
	t.Helper()
	var payload map[string]any
	if err := json.NewDecoder(body).Decode(&payload); err != nil {
		t.Fatalf("decode response payload: %v", err)
	}
	return payload
}

func asMap(t *testing.T, value any) map[string]any {
	t.Helper()
	row, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %#v", value)
	}
	return row
}

func asSlice(t *testing.T, value any) []any {
	t.Helper()
	rows, ok := value.([]any)
	if !ok {
		t.Fatalf("expected []any payload, got %#v", value)
	}
	return rows
}

func asString(value any) string {
	if text, ok := value.(string); ok {
		return text
	}
	return ""
}

func asFloat(value any) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0
	}
}
