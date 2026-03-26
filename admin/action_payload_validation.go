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

var actionPayloadFieldAliases = map[string]string{
	"policyEntity":    "policy_entity",
	"actorId":         "actor_id",
	"userId":          "user_id",
	"requestId":       "request_id",
	"correlationId":   "correlation_id",
	"tenantId":        "tenant_id",
	"orgId":           "org_id",
	"organizationId":  "organization_id",
	"idempotencyKey":  "idempotency_key",
	"_idempotencyKey": "_idempotency_key",
	"dryRun":          "dry_run",
}

var actionPayloadSystemFields = map[string]struct{}{
	"id":               {},
	"ids":              {},
	"selection":        {},
	"record":           {},
	"data":             {},
	"policy_entity":    {},
	"actor_id":         {},
	"user_id":          {},
	"request_id":       {},
	"correlation_id":   {},
	"tenant_id":        {},
	"org_id":           {},
	"organization_id":  {},
	"channel":          {},
	"environment":      {},
	"env":              {},
	"idempotency_key":  {},
	"_idempotency_key": {},
	"dry_run":          {},
}

func validateActionPayload(action Action, payload map[string]any) error {
	if len(action.PayloadRequired) == 0 && len(action.PayloadSchema) == 0 {
		return nil
	}
	payload = normalizeActionPayloadMap(payload)
	schema := normalizeActionPayloadSchema(action.PayloadSchema)

	missing := map[string]string{}
	for _, field := range action.PayloadRequired {
		field = canonicalActionPayloadFieldName(field)
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
	compiled, err := compileActionPayloadSchema(schema)
	if err != nil {
		return validationDomainError("invalid action payload schema", map[string]any{
			"action": action.Name,
			"error":  strings.TrimSpace(err.Error()),
		})
	}
	return compiled.Validate(normalizeActionPayloadForSchema(schema, payload))
}

func applyActionPayloadDefaults(action Action, payload map[string]any, ids []string) map[string]any {
	payload = normalizeActionPayloadMap(payload)
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
	payload = normalizeActionPayloadMap(payload)
	if len(payload) == 0 || !schemaDisallowsAdditionalProperties(schema) {
		return payload
	}
	properties := schemaProperties(normalizeActionPayloadSchema(schema))
	out := primitives.CloneAnyMap(payload)
	for field := range actionPayloadSystemFields {
		if _, declared := properties[field]; declared {
			continue
		}
		delete(out, field)
	}
	return out
}

func normalizeActionPayloadSchema(schema map[string]any) map[string]any {
	if len(schema) == 0 {
		return schema
	}
	out := primitives.CloneAnyMap(schema)
	if out == nil {
		return nil
	}
	if props, ok := out["properties"].(map[string]any); ok && len(props) > 0 {
		out["properties"] = normalizeActionPayloadSchemaProperties(props)
	}
	if required, ok := out["required"]; ok {
		out["required"] = ensureActionPayloadRequiredFields(required)
	}
	return out
}

func normalizeActionPayloadSchemaProperties(properties map[string]any) map[string]any {
	if len(properties) == 0 {
		return properties
	}
	out := map[string]any{}
	for field, value := range properties {
		out[canonicalActionPayloadFieldName(field)] = value
	}
	return out
}

func normalizeActionPayloadMap(payload map[string]any) map[string]any {
	if payload == nil {
		return map[string]any{}
	}
	out := primitives.CloneAnyMap(payload)
	for alias, canonical := range actionPayloadFieldAliases {
		canonicalValue, canonicalOK := out[canonical]
		aliasValue, aliasOK := out[alias]
		if !canonicalOK && aliasOK {
			out[canonical] = aliasValue
		} else if canonicalOK && isEmptyActionPayloadValue(canonicalValue) && aliasOK && !isEmptyActionPayloadValue(aliasValue) {
			out[canonical] = aliasValue
		}
		delete(out, alias)
	}
	return out
}

func canonicalActionPayloadFieldName(field string) string {
	field = strings.TrimSpace(field)
	if field == "" {
		return ""
	}
	if canonical, ok := actionPayloadFieldAliases[field]; ok {
		return canonical
	}
	return field
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
