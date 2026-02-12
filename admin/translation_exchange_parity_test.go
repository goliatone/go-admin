package admin

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestTranslationImportValidateInputFactoryMatchesHTTPJSONParsing(t *testing.T) {
	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":             "pages",
				"entity_id":            "page_1",
				"translation_group_id": "tg_1",
				"target_locale":        "es",
				"field_path":           "title",
				"source_hash":          "hash_1",
			},
		},
	}

	msg, err := buildTranslationImportValidateInput(payload, nil)
	if err != nil {
		t.Fatalf("build validate input: %v", err)
	}

	raw, _ := json.Marshal(payload)
	rows, _, err := parseTranslationImportJSON(raw, false)
	if err != nil {
		t.Fatalf("parse http json rows: %v", err)
	}

	if !reflect.DeepEqual(msg.Rows, rows) {
		t.Fatalf("validate rows drift between factory and http parser\nfactory=%+v\nhttp=%+v", msg.Rows, rows)
	}
}

func TestTranslationImportApplyInputFactoryMatchesHTTPJSONParsing(t *testing.T) {
	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":             "pages",
				"entity_id":            "page_1",
				"translation_group_id": "tg_1",
				"target_locale":        "es",
				"field_path":           "title",
				"translated_text":      "Hola",
				"source_hash":          "hash_1",
			},
		},
		"create_translation":         true,
		"allow_source_hash_override": true,
		"continue_on_error":          true,
		"dry_run":                    true,
	}

	msg, err := buildTranslationImportApplyInput(payload, nil)
	if err != nil {
		t.Fatalf("build apply input: %v", err)
	}

	raw, _ := json.Marshal(payload)
	rows, body, err := parseTranslationImportJSON(raw, true)
	if err != nil {
		t.Fatalf("parse http json rows: %v", err)
	}
	httpInput := TranslationImportApplyInput{
		Rows:                    rows,
		AllowCreateMissing:      exchangeCreateTranslationRequested(body),
		AllowSourceHashOverride: toBool(body["allow_source_hash_override"]),
		ContinueOnError:         toBool(body["continue_on_error"]),
		DryRun:                  toBool(body["dry_run"]),
	}

	if !reflect.DeepEqual(msg.Rows, httpInput.Rows) {
		t.Fatalf("apply rows drift between factory and http parser\nfactory=%+v\nhttp=%+v", msg.Rows, httpInput.Rows)
	}
	if msg.AllowCreateMissing != httpInput.AllowCreateMissing {
		t.Fatalf("allow_create_missing drift: factory=%v http=%v", msg.AllowCreateMissing, httpInput.AllowCreateMissing)
	}
	if msg.AllowSourceHashOverride != httpInput.AllowSourceHashOverride {
		t.Fatalf("allow_source_hash_override drift: factory=%v http=%v", msg.AllowSourceHashOverride, httpInput.AllowSourceHashOverride)
	}
	if msg.ContinueOnError != httpInput.ContinueOnError {
		t.Fatalf("continue_on_error drift: factory=%v http=%v", msg.ContinueOnError, httpInput.ContinueOnError)
	}
	if msg.DryRun != httpInput.DryRun {
		t.Fatalf("dry_run drift: factory=%v http=%v", msg.DryRun, httpInput.DryRun)
	}
}
