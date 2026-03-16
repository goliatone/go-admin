package admin

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	boot "github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

func TestActionContractsPhase7FixtureSnapshot(t *testing.T) {
	payload := canonicalBulkActionContractsPhase7Fixture(t)
	path := filepath.Join("..", "pkg", "client", "assets", "tests", "fixtures", "action_bulk_phase7", "canonical_bulk_contracts.json")
	assertActionContractsSnapshot(t, payload, path)
}

func TestActionContractsPhase7ListPublishesStaticBulkStateAndSelectionConfig(t *testing.T) {
	fixture := canonicalBulkActionContractsPhase7Fixture(t)
	listContract := extractMap(fixture["list_contract"])
	meta := extractMap(listContract["$meta"])
	bulkState := extractMap(meta["bulk_action_state"])
	deleteState := extractMap(bulkState["delete"])
	if got := deleteState["enabled"]; got != true {
		t.Fatalf("expected static delete bulk state enabled, got %#v", deleteState)
	}

	schema := extractMap(listContract["schema"])
	config := extractMap(schema["bulk_action_state_config"])
	if got := config["selection_sensitive"]; got != true {
		t.Fatalf("expected selection_sensitive true, got %#v", config)
	}
	if got := strings.TrimSpace(toString(config["selection_state_endpoint"])); got == "" {
		t.Fatalf("expected selection_state_endpoint in schema config")
	}
}

func TestActionContractsPhase7SelectionEndpointPublishesSelectionSensitiveStates(t *testing.T) {
	fixture := canonicalBulkActionContractsPhase7Fixture(t)
	selection := extractMap(fixture["selection_contracts"])

	single := extractMap(selection["single_invalid"])
	singleState := extractMap(extractMap(single["bulk_action_state"])["delete"])
	if got := strings.TrimSpace(toString(singleState["reason_code"])); got != TextCodeResourceInUse {
		t.Fatalf("expected single selection resource-in-use state, got %#v", singleState)
	}

	mixed := extractMap(selection["mixed_selection"])
	mixedState := extractMap(extractMap(mixed["bulk_action_state"])["delete"])
	if got := strings.TrimSpace(toString(mixedState["reason_code"])); got != TextCodeInvalidSelection {
		t.Fatalf("expected mixed selection invalid-selection state, got %#v", mixedState)
	}
	meta := extractMap(mixedState["metadata"])
	if got := toInt(meta["invalid_count"]); got != 1 {
		t.Fatalf("expected invalid_count=1, got %#v", meta)
	}
	if got := strings.TrimSpace(toString(meta["remediation_href"])); got != "/admin/content/esign_agreements?document_id=doc_1" {
		t.Fatalf("expected remediation href in mixed selection metadata, got %#v", meta)
	}
}

func TestActionContractsPhase7BulkFailureEnvelopeIncludesInvalidSelectionAndRemediation(t *testing.T) {
	fixture := canonicalBulkActionContractsPhase7Fixture(t)
	executionFailure := extractMap(fixture["execution_failure"])
	if got := toInt(executionFailure["status"]); got != 400 {
		t.Fatalf("expected 400 execution failure, got %#v", executionFailure)
	}
	errPayload := extractMap(executionFailure["error"])
	if got := strings.TrimSpace(toString(errPayload["text_code"])); got != TextCodeInvalidSelection {
		t.Fatalf("expected invalid selection text code, got %#v", errPayload)
	}
	meta := extractMap(errPayload["metadata"])
	if got := strings.TrimSpace(toString(meta["remediation_label"])); got != "View agreements" {
		t.Fatalf("expected remediation metadata, got %#v", meta)
	}
}

func canonicalBulkActionContractsPhase7Fixture(t *testing.T) map[string]any {
	t.Helper()

	repo := &phase7BulkRepoAdapter{
		records: map[string]map[string]any{
			"doc_1": {"id": "doc_1", "title": "Protected Document", "status": "in_use"},
			"doc_2": {"id": "doc_2", "title": "Reusable Document", "status": "ready"},
		},
		list: []map[string]any{
			{"id": "doc_1", "title": "Protected Document", "status": "in_use"},
			{"id": "doc_2", "title": "Reusable Document", "status": "ready"},
		},
	}
	panel := &Panel{
		name: "documents",
		repo: repo,
		bulkActions: []Action{
			{Name: "delete", Label: "Delete", Scope: ActionScopeBulk, Permission: "documents.delete"},
		},
		authorizer: allowAll{},
		actionStateResolver: func(_ AdminContext, records []map[string]any, actions []Action, _ ActionScope) (map[string]map[string]ActionState, error) {
			if len(actions) == 0 || !hasActionName(actions, "delete") {
				return nil, nil
			}
			resolved := map[string]map[string]ActionState{}
			for _, record := range records {
				recordID := strings.TrimSpace(toString(record["id"]))
				if recordID != "doc_1" {
					continue
				}
				resolved[recordID] = map[string]ActionState{
					"delete": {
						Enabled:    false,
						ReasonCode: TextCodeResourceInUse,
						Reason:     "This document cannot be deleted because it is attached to 2 agreements.",
						Severity:   "warning",
						Kind:       "business_rule",
						Metadata: map[string]any{
							"agreement_count": 2,
							"document_id":     "doc_1",
							"blocked_action":  "delete",
						},
						Remediation: &ActionRemediation{
							Label: "View agreements",
							Href:  "/admin/content/esign_agreements?document_id=doc_1",
							Kind:  "link",
						},
					},
				}
			}
			return resolved, nil
		},
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "documents",
		panel: panel,
	}

	listRecords, _, schemaAny, _, meta, err := binding.List(newPanelBindingMockContext(), "en", boot.ListOptions{Page: 1, PerPage: 25})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	schema, _ := schemaAny.(Schema)

	singleSelection, err := binding.BulkActionState(newPanelBindingMockContext(), "en", map[string]any{
		"ids": []string{"doc_1"},
	})
	if err != nil {
		t.Fatalf("bulk action state single: %v", err)
	}
	mixedSelection, err := binding.BulkActionState(newPanelBindingMockContext(), "en", map[string]any{
		"ids": []string{"doc_1", "doc_2"},
	})
	if err != nil {
		t.Fatalf("bulk action state mixed: %v", err)
	}

	server := router.NewHTTPServer()
	server.Router().Post("/panels/documents/bulk/delete", func(c router.Context) error {
		body, err := parseJSONBody(c)
		if err != nil {
			return writeError(c, err)
		}
		if _, err := binding.Bulk(c, "en", "delete", body); err != nil {
			return writeError(c, err)
		}
		return writeJSON(c, map[string]any{"status": "ok"})
	})
	req := httptest.NewRequest("POST", "/panels/documents/bulk/delete", strings.NewReader(`{"ids":["doc_1","doc_2"]}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)

	var executionFailure map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &executionFailure); err != nil {
		t.Fatalf("decode execution failure: %v", err)
	}
	executionFailure["status"] = rr.Code

	return map[string]any{
		"schema_version": 1,
		"list_contract": map[string]any{
			"schema": map[string]any{
				"bulk_actions": filterBulkActionContracts(schema.BulkActions),
				"bulk_action_state_config": map[string]any{
					"selection_sensitive":     schema.BulkActionStateConfig.SelectionSensitive,
					"selection_state_endpoint": schema.BulkActionStateConfig.SelectionStateEndpoint,
					"debounce_ms":             schema.BulkActionStateConfig.DebounceMS,
				},
			},
			"record_ids": extractRecordIDsAny(listRecords),
			"$meta": map[string]any{
				"bulk_action_state": meta["bulk_action_state"],
			},
		},
		"selection_contracts": map[string]any{
			"single_invalid": singleSelection,
			"mixed_selection": mixedSelection,
		},
		"execution_failure": executionFailure,
	}
}

func hasActionName(actions []Action, target string) bool {
	target = strings.TrimSpace(strings.ToLower(target))
	if target == "" {
		return false
	}
	for _, action := range actions {
		if strings.EqualFold(strings.TrimSpace(action.Name), target) {
			return true
		}
	}
	return false
}

type phase7BulkRepoAdapter struct {
	records map[string]map[string]any
	list    []map[string]any
}

func (s *phase7BulkRepoAdapter) List(_ context.Context, _ ListOptions) ([]map[string]any, int, error) {
	out := make([]map[string]any, 0, len(s.list))
	for _, record := range s.list {
		out = append(out, clonePhase7Record(record))
	}
	return out, len(out), nil
}

func (s *phase7BulkRepoAdapter) Get(_ context.Context, id string) (map[string]any, error) {
	record, ok := s.records[id]
	if !ok {
		return nil, ErrNotFound
	}
	return clonePhase7Record(record), nil
}

func (s *phase7BulkRepoAdapter) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, nil
}

func (s *phase7BulkRepoAdapter) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, nil
}

func (s *phase7BulkRepoAdapter) Delete(context.Context, string) error {
	return nil
}

func filterBulkActionContracts(actions []Action) []map[string]any {
	out := make([]map[string]any, 0, len(actions))
	for _, action := range actions {
		out = append(out, map[string]any{
			"name":       strings.TrimSpace(action.Name),
			"label":      strings.TrimSpace(action.Label),
			"scope":      strings.TrimSpace(string(action.Scope)),
			"permission": strings.TrimSpace(action.Permission),
		})
	}
	return out
}

func extractRecordIDsAny(records []map[string]any) []string {
	out := make([]string, 0, len(records))
	for _, record := range records {
		if id := strings.TrimSpace(toString(record["id"])); id != "" {
			out = append(out, id)
		}
	}
	return out
}

func clonePhase7Record(record map[string]any) map[string]any {
	if len(record) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(record))
	for key, value := range record {
		out[key] = value
	}
	return out
}
