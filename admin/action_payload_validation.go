package admin

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"github.com/goliatone/go-admin/internal/primitives"
	"reflect"
	"strings"
	"time"

	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

const actionPayloadSchemaResource = "inmemory://admin/action_payload_schema.json"

// TODO: why are we mixing snake_case (OK) and pascalCase (NOT OK)?
var actionPayloadSystemFields = map[string]struct{}{
	"id":            {},
	"ids":           {},
	"selection":     {},
	"record":        {},
	"data":          {},
	"policy_entity": {},
	"policyEntity":  {},
	"environment":   {},
	"env":           {},
}

func validateActionPayload(action Action, payload map[string]any) error {
	if len(action.PayloadRequired) == 0 && len(action.PayloadSchema) == 0 {
		return nil
	}
	if payload == nil {
		payload = map[string]any{}
	}

	missing := map[string]string{}
	for _, field := range action.PayloadRequired {
		field = strings.TrimSpace(field)
		if field == "" {
			continue
		}
		value, ok := payload[field]
		if !ok || isEmptyActionPayloadValue(value) {
			missing[field] = "required"
		}
	}
	if len(missing) > 0 {
		return validationDomainError("action payload validation failed", map[string]any{
			"action": action.Name,
			"fields": missing,
		})
	}

	if len(action.PayloadSchema) == 0 {
		return nil
	}
	compiled, err := compileActionPayloadSchema(action.PayloadSchema)
	if err != nil {
		return validationDomainError("invalid action payload schema", map[string]any{
			"action": action.Name,
			"error":  strings.TrimSpace(err.Error()),
		})
	}
	return compiled.Validate(normalizeActionPayloadForSchema(action.PayloadSchema, payload))
}

func applyActionPayloadDefaults(action Action, payload map[string]any, ids []string) map[string]any {
	if payload == nil {
		payload = map[string]any{}
	}
	if !action.Idempotent {
		return payload
	}
	field := actionIdempotencyField(action)
	if field == "" {
		return payload
	}
	if value, ok := payload[field]; ok && !isEmptyActionPayloadValue(value) {
		return payload
	}
	targetID := strings.TrimSpace(toString(payload["id"]))
	if targetID == "" && len(ids) > 0 {
		targetID = strings.TrimSpace(toString(ids[0]))
	}
	payload[field] = generateActionIdempotencyKey(action.Name, targetID)
	return payload
}

func compileActionPayloadSchema(schema map[string]any) (*jsonschema.Schema, error) {
	raw, err := json.Marshal(schema)
	if err != nil {
		return nil, err
	}
	compiler := jsonschema.NewCompiler()
	if err := compiler.AddResource(actionPayloadSchemaResource, strings.NewReader(string(raw))); err != nil {
		return nil, err
	}
	return compiler.Compile(actionPayloadSchemaResource)
}

func normalizeActionPayloadForSchema(schema map[string]any, payload map[string]any) map[string]any {
	if len(payload) == 0 || !schemaDisallowsAdditionalProperties(schema) {
		return payload
	}
	properties := schemaProperties(schema)
	out := primitives.CloneAnyMap(payload)
	for field := range actionPayloadSystemFields {
		if _, declared := properties[field]; declared {
			continue
		}
		delete(out, field)
	}
	return out
}

func schemaDisallowsAdditionalProperties(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	disallowed, ok := schema["additionalProperties"].(bool)
	return ok && !disallowed
}

func schemaProperties(schema map[string]any) map[string]any {
	if len(schema) == 0 {
		return nil
	}
	props, _ := schema["properties"].(map[string]any)
	return props
}

func isEmptyActionPayloadValue(value any) bool {
	if value == nil {
		return true
	}
	if str, ok := value.(string); ok {
		return strings.TrimSpace(str) == ""
	}
	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Array, reflect.Slice, reflect.Map:
		return rv.Len() == 0
	}
	return false
}

func generateActionIdempotencyKey(actionName, targetID string) string {
	actionPart := sanitizeActionKeyPart(actionName, "action")
	targetPart := sanitizeActionKeyPart(targetID, "record")
	nonce := make([]byte, 8)
	if _, err := rand.Read(nonce); err != nil {
		return actionPart + "-" + targetPart + "-" + strings.TrimSpace(toString(time.Now().UTC().UnixNano()))
	}
	return actionPart + "-" + targetPart + "-" + hex.EncodeToString(nonce)
}

func sanitizeActionKeyPart(value, fallback string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if normalized == "" {
		return fallback
	}
	var b strings.Builder
	prevDash := false
	for _, r := range normalized {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if prevDash {
			continue
		}
		b.WriteRune('-')
		prevDash = true
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return fallback
	}
	return out
}
