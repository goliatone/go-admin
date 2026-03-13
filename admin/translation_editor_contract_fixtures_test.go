package admin

import (
	"encoding/json"
	"os"
	"testing"

	translationcore "github.com/goliatone/go-admin/translations/core"
)

func TestTranslationEditorContractFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_editor_contract_fixtures.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	fixture := map[string]any{}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	detail := extractMap(extractMap(fixture["detail"])["data"])
	if got := toString(detail["assignment_id"]); got == "" {
		t.Fatalf("expected detail.assignment_id")
	}
	assertEditorActionEnvelope(t, detail["assignment_action_states"], "submit_review")
	assertEditorActionEnvelope(t, detail["assignment_action_states"], "archive")
	assertEditorActionEnvelope(t, detail["review_action_states"], "approve")
	reviewFeedback := extractMap(detail["review_feedback"])
	comments, _ := reviewFeedback["comments"].([]any)
	if len(comments) == 0 {
		t.Fatalf("expected review_feedback comments")
	}
	qaResults := extractMap(detail["qa_results"])
	summary := extractMap(qaResults["summary"])
	if got := toInt(summary["warning_count"]); got <= 0 {
		t.Fatalf("expected qa_results warning_count > 0, got %+v", qaResults)
	}
	if got := toInt(summary["blocker_count"]); got <= 0 {
		t.Fatalf("expected qa_results blocker_count > 0, got %+v", qaResults)
	}

	assist := extractMap(detail["assist"])
	glossaryMatches, _ := assist["glossary_matches"].([]any)
	if len(glossaryMatches) == 0 {
		t.Fatalf("expected fixture glossary_matches")
	}
	styleGuide := extractMap(assist["style_guide_summary"])
	if available, _ := styleGuide["available"].(bool); !available {
		t.Fatalf("expected style guide available in fixture")
	}

	update := extractMap(extractMap(fixture["variant_update"])["data"])
	if got := toInt(update["row_version"]); got <= 0 {
		t.Fatalf("expected update row_version > 0, got %d", got)
	}
	assertEditorActionEnvelope(t, update["assignment_action_states"], "submit_review")
	updateQA := extractMap(update["qa_results"])
	if blocked, _ := updateQA["submit_blocked"].(bool); !blocked {
		t.Fatalf("expected variant_update qa_results.submit_blocked=true, got %+v", updateQA)
	}

	history := extractMap(detail["history"])
	if got := toInt(history["total"]); got <= 0 {
		t.Fatalf("expected history total > 0, got %+v", history)
	}
	attachments, _ := detail["attachments"].([]any)
	if len(attachments) == 0 {
		t.Fatalf("expected fixture attachments")
	}
	attachmentSummary := extractMap(detail["attachment_summary"])
	if got := toInt(attachmentSummary["total"]); got != len(attachments) {
		t.Fatalf("expected attachment_summary total=%d, got %+v", len(attachments), attachmentSummary)
	}

	submitBlocked := extractMap(extractMap(fixture["submit_blocked"])["error"])
	if got := toString(submitBlocked["text_code"]); got != string(translationcore.ErrorPolicyBlocked) {
		t.Fatalf("expected submit_blocked text_code %q, got %q", string(translationcore.ErrorPolicyBlocked), got)
	}

	autoApprove := extractMap(extractMap(fixture["no_review_auto_approve"])["data"])
	if got := toString(autoApprove["status"]); got != string(AssignmentStatusApproved) {
		t.Fatalf("expected no_review_auto_approve status %q, got %q", AssignmentStatusApproved, got)
	}

	reviewReject := extractMap(extractMap(fixture["review_reject"])["data"])
	if got := toString(reviewReject["status"]); got != string(AssignmentStatusRejected) {
		t.Fatalf("expected review_reject status %q, got %q", AssignmentStatusRejected, got)
	}
	reviewApprove := extractMap(extractMap(fixture["review_approve"])["data"])
	if got := toString(reviewApprove["status"]); got != string(AssignmentStatusApproved) {
		t.Fatalf("expected review_approve status %q, got %q", AssignmentStatusApproved, got)
	}

	backcompat := extractMap(fixture["assist_backcompat"])
	legacy := normalizeEditorAssistFixture(backcompat["legacy_top_level"])
	if len(legacy["glossary_matches"].([]map[string]any)) == 0 {
		t.Fatalf("expected legacy assist parser to preserve glossary matches")
	}
	missing := normalizeEditorAssistFixture(backcompat["missing_assets"])
	if len(missing["glossary_matches"].([]map[string]any)) != 0 {
		t.Fatalf("expected missing-assets fixture to degrade to empty glossary matches")
	}
}

func assertEditorActionEnvelope(t *testing.T, raw any, key string) {
	t.Helper()
	actions := extractMap(raw)
	entry := extractMap(actions[key])
	if _, ok := entry["enabled"].(bool); !ok {
		t.Fatalf("expected %s enabled flag, got %+v", key, entry)
	}
}

func normalizeEditorAssistFixture(raw any) map[string]any {
	record := extractMap(raw)
	assist := extractMap(record["assist"])
	if len(assist) == 0 {
		assist = record
	}
	out := map[string]any{
		"glossary_matches": []map[string]any{},
		"style_guide_summary": map[string]any{
			"available": false,
			"title":     "",
			"summary":   "",
			"rules":     []string{},
		},
	}
	if matches, ok := assist["glossary_matches"].([]any); ok {
		normalized := make([]map[string]any, 0, len(matches))
		for _, entry := range matches {
			match := extractMap(entry)
			if len(match) == 0 {
				continue
			}
			normalized = append(normalized, match)
		}
		out["glossary_matches"] = normalized
	}
	styleGuide := extractMap(assist["style_guide_summary"])
	if len(styleGuide) != 0 {
		out["style_guide_summary"] = styleGuide
	}
	return out
}
