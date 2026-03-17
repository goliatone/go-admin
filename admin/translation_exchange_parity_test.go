package admin

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestTranslationImportValidateInputFactoryMatchesHTTPJSONParsing(t *testing.T) {
	payload := map[string]any{
		"rows": []map[string]any{
			{
				"resource":      "pages",
				"entity_id":     "page_1",
				"family_id":     "tg_1",
				"target_locale": "es",
				"field_path":    "title",
				"source_hash":   "hash_1",
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
				"resource":        "pages",
				"entity_id":       "page_1",
				"family_id":       "tg_1",
				"target_locale":   "es",
				"field_path":      "title",
				"translated_text": "Hola",
				"source_hash":     "hash_1",
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

func TestParseTranslationExportInputRejectsClientIdentityFields(t *testing.T) {
	mockCtx := router.NewMockContext()
	mockCtx.On("Body").Return([]byte(`{"actor_id":"spoofed","resources":["pages"]}`))
	mockCtx.On("Query", "resources").Return("")
	mockCtx.On("Query", "resource").Return("")
	mockCtx.On("Query", "entity_ids").Return("")
	mockCtx.On("Query", "entity_id").Return("")
	mockCtx.On("Query", "id").Return("")
	mockCtx.On("Query", "ids").Return("")
	mockCtx.On("Query", "source_locale").Return("")
	mockCtx.On("Query", "locale").Return("")
	mockCtx.On("Query", "target_locales").Return("")
	mockCtx.On("Query", "target_locale").Return("")
	mockCtx.On("Query", "field_paths").Return("")
	mockCtx.On("Query", "field_path").Return("")
	mockCtx.On("Query", "include_source_hash").Return("")

	_, _, err := parseTranslationExportInput(mockCtx)
	if err == nil {
		t.Fatalf("expected actor_id to be rejected")
	}
	if !strings.Contains(err.Error(), "auth-derived identity fields") {
		t.Fatalf("expected identity-field error, got %v", err)
	}
}

func TestParseTranslationImportJSONRejectsClientIdentityFields(t *testing.T) {
	_, _, err := parseTranslationImportJSON([]byte(`{
		"tenant_id":"tenant-1",
		"rows":[{"resource":"pages","entity_id":"page_1","family_id":"tg_1","target_locale":"es","field_path":"title","translated_text":"Hola"}]
	}`), true)
	if err == nil {
		t.Fatalf("expected tenant_id to be rejected")
	}
	if !strings.Contains(err.Error(), "auth-derived identity fields") {
		t.Fatalf("expected identity-field error, got %v", err)
	}
}
