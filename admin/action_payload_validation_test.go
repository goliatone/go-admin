package admin

import "testing"

func TestApplyActionPayloadDefaultsGeneratesIdempotencyKey(t *testing.T) {
	action := Action{
		Name:       "send",
		Idempotent: true,
	}

	payload := applyActionPayloadDefaults(action, map[string]any{"id": "agreement-1"}, nil)
	value := toString(payload["idempotency_key"])
	if value == "" {
		t.Fatalf("expected idempotency_key to be generated")
	}
	if value == "agreement-1" {
		t.Fatalf("expected idempotency key, got raw id")
	}
}

func TestApplyActionPayloadDefaultsDoesNotOverrideProvidedIdempotencyKey(t *testing.T) {
	action := Action{
		Name:       "send",
		Idempotent: true,
	}

	payload := applyActionPayloadDefaults(action, map[string]any{
		"id":              "agreement-1",
		"idempotency_key": "provided-key",
	}, nil)
	if got := toString(payload["idempotency_key"]); got != "provided-key" {
		t.Fatalf("expected provided idempotency_key to be preserved, got %q", got)
	}
}

func TestApplyActionPayloadDefaultsUsesCustomField(t *testing.T) {
	action := Action{
		Name:             "rotate",
		Idempotent:       true,
		IdempotencyField: "request_id",
	}

	payload := applyActionPayloadDefaults(action, map[string]any{"id": "agreement-1"}, nil)
	if got := toString(payload["request_id"]); got == "" {
		t.Fatalf("expected request_id to be generated")
	}
	if _, ok := payload["idempotency_key"]; ok {
		t.Fatalf("expected default idempotency_key field to remain unset")
	}
}

func TestValidateActionPayloadAllowsSystemContextFieldsWithStrictSchema(t *testing.T) {
	action := Action{
		Name:            "create_translation",
		PayloadRequired: []string{"locale"},
		PayloadSchema: map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required":             []string{"locale"},
			"properties": map[string]any{
				"locale": map[string]any{"type": "string"},
			},
		},
	}

	err := validateActionPayload(action, map[string]any{
		"id":            "page_123",
		"locale":        "es",
		"policy_entity": "pages",
	})
	if err != nil {
		t.Fatalf("expected payload to validate, got %v", err)
	}
}

func TestValidateActionPayloadRejectsUnknownFieldsWhenStrict(t *testing.T) {
	action := Action{
		Name:            "create_translation",
		PayloadRequired: []string{"locale"},
		PayloadSchema: map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required":             []string{"locale"},
			"properties": map[string]any{
				"locale": map[string]any{"type": "string"},
			},
		},
	}

	err := validateActionPayload(action, map[string]any{
		"locale": "es",
		"foo":    "bar",
	})
	if err == nil {
		t.Fatalf("expected strict schema validation error for unknown field")
	}
}
