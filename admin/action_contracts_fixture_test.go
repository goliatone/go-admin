package admin

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	boot "github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

func TestActionContractsPhase1FixtureSnapshot(t *testing.T) {
	payload := canonicalActionContractsPhase1Fixture()
	path := filepath.Join("..", "pkg", "client", "assets", "tests", "fixtures", "action_contracts", "canonical_contracts.json")
	assertActionContractsSnapshot(t, payload, path)
}

func TestActionContractsPhase1FixtureVocabularyAlignment(t *testing.T) {
	fixture := canonicalActionContractsPhase1Fixture()

	allowedReasonCodes := allowedActionReasonCodes()
	for code := range allowedReasonCodes {
		if _, ok := DomainErrorCodeFor(code); !ok {
			t.Fatalf("expected disabled reason code %q to be registered as an execution-time domain error code", code)
		}
	}

	rowRecord := extractMap(fixture["row_contract"])
	assertActionStateEnvelope(t, extractMap(rowRecord["record"])["_action_state"], allowedReasonCodes)

	detail := extractMap(fixture["detail_contract"])
	assertActionStateEnvelope(t, extractMap(detail["data"])["_action_state"], allowedReasonCodes)

	list := extractMap(fixture["list_contract"])
	meta := extractMap(list["$meta"])
	assertActionStateEnvelope(t, meta["bulk_action_state"], allowedReasonCodes)

	executionFailure := extractMap(fixture["execution_failure"])
	errPayload := extractMap(executionFailure["error"])
	textCode := strings.TrimSpace(toString(errPayload["text_code"]))
	if textCode == "" {
		t.Fatalf("expected execution_failure.error.text_code")
	}
	if _, ok := DomainErrorCodeFor(textCode); !ok {
		t.Fatalf("expected execution_failure.error.text_code %q to exist in domain error registry", textCode)
	}
}

func TestActionContractsPhase1RuntimeListAndDetailEnvelopes(t *testing.T) {
	repo := &translationActionRepoStub{
		records: map[string]map[string]any{
			"post_123": {
				"id":     "post_123",
				"title":  "Published Post",
				"status": "published",
			},
		},
		list: []map[string]any{
			{
				"id":     "post_123",
				"title":  "Published Post",
				"status": "published",
			},
		},
	}
	panel := &Panel{
		name:     "posts",
		repo:     repo,
		workflow: translationWorkflowStateStub{transitionsByState: map[string][]WorkflowTransition{"published": {{Name: "unpublish", To: "draft"}}}},
		actions: []Action{
			{Name: "submit_for_approval", Scope: ActionScopeAny},
			{Name: "publish", Scope: ActionScopeAny},
			{Name: "unpublish", Scope: ActionScopeAny},
		},
	}

	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "posts",
		panel: panel,
	}
	c := newPanelBindingMockContext()
	records, total, _, _, _, err := binding.List(c, "en", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if total != 1 || len(records) != 1 {
		t.Fatalf("expected one list record, got total=%d len=%d", total, len(records))
	}

	allowedReasonCodes := allowedActionReasonCodes()
	assertActionStateEnvelope(t, records[0]["_action_state"], allowedReasonCodes)

	detail, err := binding.Detail(c, "en", "post_123")
	if err != nil {
		t.Fatalf("detail: %v", err)
	}
	assertActionStateEnvelope(t, extractMap(detail["data"])["_action_state"], allowedReasonCodes)
}

func TestActionContractsPhase1RuntimeWriteErrorEnvelope(t *testing.T) {
	server := router.NewHTTPServer()
	server.Router().Get("/err", func(c router.Context) error {
		return writeError(c, NewDomainError(TextCodeResourceInUse, "Document cannot be deleted while attached to agreements", map[string]any{
			"agreement_count": 2,
			"remediation": map[string]any{
				"label": "View agreements",
				"href":  "/admin/content/esign_agreements?document_id=doc_123",
				"kind":  "link",
			},
		}))
	})

	req := httptest.NewRequest("GET", "/err", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 409 {
		t.Fatalf("expected 409, got %d", rr.Code)
	}

	var body map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	errPayload := extractMap(body["error"])
	if got := strings.TrimSpace(toString(errPayload["text_code"])); got != TextCodeResourceInUse {
		t.Fatalf("expected text_code %q, got %q", TextCodeResourceInUse, got)
	}
}

func assertActionStateEnvelope(t *testing.T, raw any, allowed map[string]struct{}) {
	t.Helper()
	state := extractMap(raw)
	if len(state) == 0 {
		if typed, ok := raw.(map[string]map[string]any); ok && len(typed) > 0 {
			state = map[string]any{}
			for actionName, entry := range typed {
				state[actionName] = entry
			}
		}
	}
	if len(state) == 0 {
		t.Fatalf("expected non-empty action state envelope, got %#v", raw)
	}
	for actionName, rawEntry := range state {
		entry, ok := rawEntry.(map[string]any)
		if !ok {
			t.Fatalf("expected action state object for %q, got %#v", actionName, rawEntry)
		}
		if _, ok := entry["enabled"].(bool); !ok {
			t.Fatalf("expected action state enabled bool for %q, got %#v", actionName, entry["enabled"])
		}
		code := strings.TrimSpace(toString(entry["reason_code"]))
		if code != "" {
			if _, ok := allowed[code]; !ok {
				t.Fatalf("unexpected reason_code %q for action %q", code, actionName)
			}
		}
	}
}

func allowedActionReasonCodes() map[string]struct{} {
	allowedReasonCodes := map[string]struct{}{}
	for _, code := range ActionDisabledReasonCodes() {
		allowedReasonCodes[code] = struct{}{}
	}
	return allowedReasonCodes
}

func assertActionContractsSnapshot(t *testing.T, payload map[string]any, snapshotPath string) {
	t.Helper()
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal action contracts payload: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	got := strings.TrimSpace(string(data))
	expected := strings.TrimSpace(string(want))
	if got != expected {
		t.Fatalf("action contracts snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", expected, got)
	}
}

func canonicalActionContractsPhase1Fixture() map[string]any {
	return map[string]any{
		"schema_version":              1,
		"disabled_reason_codes":       ActionDisabledReasonCodes(),
		"shared_execution_text_codes": ActionDisabledReasonCodes(),
		"row_contract": map[string]any{
			"schema": map[string]any{
				"actions": []map[string]any{
					{
						"name":  "delete",
						"label": "Delete",
						"scope": string(ActionScopeRow),
					},
				},
			},
			"record": map[string]any{
				"id":    "doc_123",
				"title": "Master Services Agreement",
				"_action_state": map[string]any{
					"delete": map[string]any{
						"enabled":     false,
						"reason_code": ActionDisabledReasonCodeResourceInUse,
						"reason":      "Document is used by 2 agreements",
						"severity":    "warning",
						"kind":        "business_rule",
						"metadata": map[string]any{
							"agreement_count": 2,
						},
						"remediation": map[string]any{
							"label": "View agreements",
							"href":  "/admin/content/esign_agreements?document_id=doc_123",
							"kind":  "link",
						},
					},
				},
			},
		},
		"detail_contract": map[string]any{
			"schema": map[string]any{
				"actions": []map[string]any{
					{
						"name":  "delete",
						"label": "Delete",
						"scope": string(ActionScopeDetail),
					},
				},
			},
			"data": map[string]any{
				"id":    "doc_123",
				"title": "Master Services Agreement",
				"_action_state": map[string]any{
					"delete": map[string]any{
						"enabled":     false,
						"reason_code": ActionDisabledReasonCodeResourceInUse,
						"reason":      "Document is used by 2 agreements",
						"severity":    "warning",
						"kind":        "business_rule",
						"metadata": map[string]any{
							"agreement_count": 2,
						},
						"remediation": map[string]any{
							"label": "View agreements",
							"href":  "/admin/content/esign_agreements?document_id=doc_123",
							"kind":  "link",
						},
					},
				},
			},
		},
		"list_contract": map[string]any{
			"data": []map[string]any{
				{
					"id":    "doc_123",
					"title": "Master Services Agreement",
				},
			},
			"$meta": map[string]any{
				"count": 1,
				"bulk_action_state": map[string]any{
					"delete": map[string]any{
						"enabled":     false,
						"reason_code": ActionDisabledReasonCodeInvalidSelection,
						"reason":      "Some selected records cannot be deleted",
						"severity":    "warning",
						"kind":        "business_rule",
					},
				},
			},
			"schema": map[string]any{
				"bulk_actions": []map[string]any{
					{
						"name":  "delete",
						"label": "Delete selected",
						"scope": string(ActionScopeBulk),
					},
				},
			},
		},
		"execution_failure": map[string]any{
			"error": map[string]any{
				"text_code": TextCodeResourceInUse,
				"message":   "Document cannot be deleted while attached to agreements",
				"metadata": map[string]any{
					"agreement_count": 2,
					"remediation": map[string]any{
						"label": "View agreements",
						"href":  "/admin/content/esign_agreements?document_id=doc_123",
						"kind":  "link",
					},
				},
			},
		},
	}
}
