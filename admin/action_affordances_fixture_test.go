package admin

import (
	"encoding/json"
	"maps"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestActionAffordancesPhase4FixtureSnapshot(t *testing.T) {
	payload := enrichedActionAffordancesPhase4Fixture()
	path := filepath.Join("..", "pkg", "client", "assets", "tests", "fixtures", "action_affordances", "enriched_affordances.json")
	assertActionContractsSnapshot(t, payload, path)
}

func TestActionAffordancesPhase4FixtureCoversSharedDisabledCases(t *testing.T) {
	fixture := enrichedActionAffordancesPhase4Fixture()
	allowedReasonCodes := allowedActionReasonCodes()

	row := extractMap(fixture["row_contract"])
	assertActionStateEnvelope(t, extractMap(row["record"])["_action_state"], allowedReasonCodes)
	assertExpectedAffordanceEntry(t, extractMap(row["record"])["_action_state"], "delete", ActionDisabledReasonCodeResourceInUse)
	assertExpectedAffordanceEntry(t, extractMap(row["record"])["_action_state"], "publish", ActionDisabledReasonCodeInvalidStatus)
	assertExpectedAffordanceEntry(t, extractMap(row["record"])["_action_state"], "approve", ActionDisabledReasonCodePermissionDenied)
	assertExpectedAffordanceEntry(t, extractMap(row["record"])["_action_state"], "submit_for_approval", ActionDisabledReasonCodeTranslationMissing)

	detail := extractMap(fixture["detail_contract"])
	assertActionStateEnvelope(t, extractMap(detail["data"])["_action_state"], allowedReasonCodes)
	assertExpectedAffordanceEntry(t, extractMap(detail["data"])["_action_state"], "delete", ActionDisabledReasonCodeResourceInUse)
	assertExpectedAffordanceEntry(t, extractMap(detail["data"])["_action_state"], "publish", ActionDisabledReasonCodeInvalidStatus)
	assertExpectedAffordanceEntry(t, extractMap(detail["data"])["_action_state"], "approve", ActionDisabledReasonCodePermissionDenied)
	assertExpectedAffordanceEntry(t, extractMap(detail["data"])["_action_state"], "submit_for_approval", ActionDisabledReasonCodeTranslationMissing)
}

func TestActionAffordancesPhase4FixtureIsFrontendReadable(t *testing.T) {
	path := filepath.Join("..", "pkg", "client", "assets", "tests", "fixtures", "action_affordances", "enriched_affordances.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}
	if got := toString(payload["schema_version"]); got != "1" {
		t.Fatalf("expected schema_version 1, got %q", got)
	}
}

func assertExpectedAffordanceEntry(t *testing.T, raw any, actionName, expectedCode string) {
	t.Helper()
	entry := extractMap(extractMap(raw)[actionName])
	if got := toString(entry["reason_code"]); got != expectedCode {
		t.Fatalf("expected %s reason_code %q, got %#v", actionName, expectedCode, entry)
	}
	if _, ok := entry["enabled"].(bool); !ok {
		t.Fatalf("expected %s enabled bool, got %#v", actionName, entry)
	}
	if strings.TrimSpace(toString(entry["severity"])) == "" {
		t.Fatalf("expected %s severity, got %#v", actionName, entry)
	}
	if strings.TrimSpace(toString(entry["kind"])) == "" {
		t.Fatalf("expected %s kind, got %#v", actionName, entry)
	}
}

func enrichedActionAffordancesPhase4Fixture() map[string]any {
	actions := []map[string]any{
		{
			"name":  "submit_for_approval",
			"label": "Submit for approval",
			"scope": string(ActionScopeDetail),
		},
		{
			"name":  "publish",
			"label": "Publish",
			"scope": string(ActionScopeDetail),
		},
		{
			"name":       "approve",
			"label":      "Approve",
			"scope":      string(ActionScopeDetail),
			"permission": "admin.content.approve",
		},
		{
			"name":  "delete",
			"label": "Delete",
			"scope": string(ActionScopeDetail),
		},
	}

	rowActions := cloneActionFixtureEntries(actions, string(ActionScopeRow))
	return map[string]any{
		"schema_version": 1,
		"row_contract": map[string]any{
			"schema": map[string]any{
				"actions": rowActions,
			},
			"record": phase4AffordanceRecord(),
		},
		"detail_contract": map[string]any{
			"schema": map[string]any{
				"actions": actions,
			},
			"data": phase4AffordanceRecord(),
		},
	}
}

func phase4AffordanceRecord() map[string]any {
	return map[string]any{
		"id":    "doc_123",
		"title": "Master Services Agreement",
		"_action_state": map[string]any{
			"delete": map[string]any{
				"enabled":     false,
				"reason_code": ActionDisabledReasonCodeResourceInUse,
				"reason":      "Document is used by 2 active agreements.",
				"severity":    "warning",
				"kind":        "business_rule",
				"metadata": map[string]any{
					"agreement_count": 2,
					"agreement_statuses": []string{
						"sent",
						"completed",
					},
				},
				"remediation": map[string]any{
					"label": "View agreements",
					"href":  "/admin/esign_agreements?document_id=doc_123",
					"kind":  "link",
				},
			},
			"publish": map[string]any{
				"enabled":     false,
				"reason_code": ActionDisabledReasonCodeInvalidStatus,
				"reason":      "Only approved documents can be published.",
				"severity":    "info",
				"kind":        "workflow",
				"metadata": map[string]any{
					"current_status":  "draft",
					"required_status": "approved",
				},
			},
			"approve": map[string]any{
				"enabled":     false,
				"reason_code": ActionDisabledReasonCodePermissionDenied,
				"reason":      "You need approval permission for this workspace.",
				"severity":    "error",
				"kind":        "permission",
				"permission":  "admin.content.approve",
				"metadata": map[string]any{
					"workspace": "legal",
				},
			},
			"submit_for_approval": map[string]any{
				"enabled":     false,
				"reason_code": ActionDisabledReasonCodeTranslationMissing,
				"reason":      "Add the missing French translation fields before submitting.",
				"severity":    "warning",
				"kind":        "business_rule",
				"metadata": map[string]any{
					"missing_locales": []string{"fr"},
					"missing_fields_by_locale": map[string]any{
						"fr": []string{"title", "summary"},
					},
				},
				"remediation": map[string]any{
					"label": "Open translation family",
					"href":  "/admin/translations/families/tg_doc_123?locale=fr",
					"kind":  "link",
				},
			},
		},
	}
}

func cloneActionFixtureEntries(actions []map[string]any, scope string) []map[string]any {
	out := make([]map[string]any, 0, len(actions))
	for _, action := range actions {
		cloned := map[string]any{}
		maps.Copy(cloned, action)
		cloned["scope"] = scope
		out = append(out, cloned)
	}
	return out
}
