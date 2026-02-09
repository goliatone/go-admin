package admin

import (
	"encoding/json"
	"reflect"
	"strings"

	jsonschema "github.com/santhosh-tekuri/jsonschema/v5"
)

const actionPayloadSchemaResource = "inmemory://admin/action_payload_schema.json"

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
	return compiled.Validate(payload)
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
