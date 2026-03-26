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

func TestApplyActionPayloadDefaultsNormalizesAliasIdempotencyKey(t *testing.T) {
	action := Action{
		Name:       "send",
		Idempotent: true,
	}

	payload := applyActionPayloadDefaults(action, map[string]any{
		"id":             "agreement-1",
		"idempotencyKey": "provided-key",
	}, nil)
	if got := toString(payload["idempotency_key"]); got != "provided-key" {
		t.Fatalf("expected alias idempotency key to normalize, got %q", got)
	}
	if _, ok := payload["idempotencyKey"]; ok {
		t.Fatalf("expected camelCase alias to be removed from normalized payload")
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

func TestValidateActionPayloadAcceptsCamelCaseAliases(t *testing.T) {
	action := Action{
		Name:            "create_translation",
		PayloadRequired: []string{"policyEntity", "dryRun", "idempotencyKey"},
		PayloadSchema: map[string]any{
			"type":                 "object",
			"additionalProperties": false,
			"required":             []string{"policyEntity", "dryRun", "idempotencyKey"},
			"properties": map[string]any{
				"policyEntity":   map[string]any{"type": "string"},
				"dryRun":         map[string]any{"type": "boolean"},
				"idempotencyKey": map[string]any{"type": "string"},
			},
		},
	}

	err := validateActionPayload(action, map[string]any{
		"policyEntity":   "pages",
		"dryRun":         true,
		"idempotencyKey": "job-1",
	})
	if err != nil {
		t.Fatalf("expected camelCase aliases to validate, got %v", err)
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

func TestEnsureActionPayloadSchemaContractCanonicalizesAliases(t *testing.T) {
	schema := ensureActionPayloadSchemaContract(map[string]any{
		"type": "object",
		"properties": map[string]any{
			"policyEntity": map[string]any{"type": "string"},
			"dryRun":       map[string]any{"type": "boolean"},
		},
		"required": []string{"policyEntity"},
	}, []string{"dryRun", "idempotencyKey"})

	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected schema properties map, got %T", schema["properties"])
	}
	if _, ok := properties["policy_entity"]; !ok {
		t.Fatalf("expected canonical policy_entity property")
	}
	if _, ok := properties["dry_run"]; !ok {
		t.Fatalf("expected canonical dry_run property")
	}
	if _, ok := properties["idempotency_key"]; !ok {
		t.Fatalf("expected required idempotency_key property to be synthesized")
	}
	if _, ok := properties["policyEntity"]; ok {
		t.Fatalf("expected camelCase policyEntity property to be removed")
	}

	required, ok := schema["required"].([]string)
	if !ok {
		t.Fatalf("expected []string required list, got %T", schema["required"])
	}
	expected := map[string]struct{}{
		"policy_entity":   {},
		"dry_run":         {},
		"idempotency_key": {},
	}
	if len(required) != len(expected) {
		t.Fatalf("expected %d required fields, got %v", len(expected), required)
	}
	for _, field := range required {
		if _, ok := expected[field]; !ok {
			t.Fatalf("unexpected required field %q", field)
		}
	}
}
