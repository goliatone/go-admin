package admin

import (
	"encoding/json"
	"os"
	"testing"
)

func TestTranslationEditorPhaseNineFixtureContracts(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_editor_phase9_fixtures.json")
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
	assertEditorActionEnvelope(t, detail["review_action_states"], "approve")

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

	conflict := extractMap(extractMap(fixture["autosave_conflict"])["error"])
	if got := toString(conflict["text_code"]); got != TextCodeAutosaveConflict {
		t.Fatalf("expected autosave conflict text_code %q, got %q", TextCodeAutosaveConflict, got)
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
