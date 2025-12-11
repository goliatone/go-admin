package settings

import (
	"sort"

	opts "github.com/goliatone/go-options"
)

// MapType normalizes admin setting field types to JSON schema types.
func MapType(t string) string {
	switch t {
	case "boolean", "bool":
		return "boolean"
	case "number":
		return "number"
	case "textarea", "text":
		return "string"
	default:
		return "string"
	}
}

// MapWidget determines a widget hint from an explicit widget or field type.
func MapWidget(widget string, fieldType string) string {
	if widget != "" {
		return widget
	}
	switch fieldType {
	case "textarea":
		return "textarea"
	}
	return ""
}

// AllowedScopes converts a slice of scope identifiers into strings.
func AllowedScopes(scopes []string) []string {
	if len(scopes) == 0 {
		return nil
	}
	out := make([]string, 0, len(scopes))
	for _, scope := range scopes {
		if scope == "" {
			continue
		}
		out = append(out, scope)
	}
	return out
}

// ExtractSchema returns the root schema from a go-options document.
func ExtractSchema(doc opts.SchemaDocument) map[string]any {
	if doc.Format == opts.SchemaFormatOpenAPI {
		if root, ok := doc.Document.(map[string]any); ok {
			if schema := ExtractSchemaFromOpenAPI(root); schema != nil {
				return schema
			}
		}
	}
	if root, ok := doc.Document.(map[string]any); ok {
		return CloneAnyMapValue(root)
	}
	return map[string]any{
		"type":       "object",
		"properties": map[string]any{},
	}
}

// ExtractSchemaFromOpenAPI pulls the first requestBody schema from an OpenAPI document.
func ExtractSchemaFromOpenAPI(document map[string]any) map[string]any {
	paths, ok := document["paths"].(map[string]any)
	if !ok {
		return nil
	}
	for _, pathItem := range paths {
		operations, ok := pathItem.(map[string]any)
		if !ok {
			continue
		}
		for _, op := range operations {
			operation, ok := op.(map[string]any)
			if !ok {
				continue
			}
			request, ok := operation["requestBody"].(map[string]any)
			if !ok {
				continue
			}
			content, ok := request["content"].(map[string]any)
			if !ok {
				continue
			}
			for _, v := range content {
				if wrapper, ok := v.(map[string]any); ok {
					if schema, ok := wrapper["schema"].(map[string]any); ok {
						return CloneAnyMapValue(schema)
					}
				}
			}
		}
	}
	return nil
}

// EnsureSchemaProperties guarantees an object schema with properties map.
func EnsureSchemaProperties(schema map[string]any) map[string]any {
	if schema == nil {
		schema = map[string]any{}
	}
	if _, ok := schema["type"]; !ok {
		schema["type"] = "object"
	}
	if _, ok := schema["properties"]; !ok {
		schema["properties"] = map[string]any{}
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok {
		props = map[string]any{}
		schema["properties"] = props
	}
	return props
}

// EnsureAdminMeta ensures the x-admin metadata container exists on a field.
func EnsureAdminMeta(field map[string]any) map[string]any {
	raw, ok := field["x-admin"]
	if !ok {
		meta := map[string]any{}
		field["x-admin"] = meta
		return meta
	}
	meta, ok := raw.(map[string]any)
	if !ok {
		meta = map[string]any{}
		field["x-admin"] = meta
	}
	return meta
}

// SchemaField clones a field definition into a mutable map.
func SchemaField(raw any) map[string]any {
	if raw == nil {
		return map[string]any{}
	}
	field, ok := raw.(map[string]any)
	if !ok {
		return map[string]any{}
	}
	return CloneAnyMapValue(field)
}

// CloneAnyMapValue deep-copies a map[string]any tree.
func CloneAnyMapValue(input map[string]any) map[string]any {
	if len(input) == 0 {
		return map[string]any{}
	}
	out := make(map[string]any, len(input))
	for k, v := range input {
		switch typed := v.(type) {
		case map[string]any:
			out[k] = CloneAnyMapValue(typed)
		case []string:
			out[k] = append([]string(nil), typed...)
		case []any:
			out[k] = append([]any(nil), typed...)
		default:
			out[k] = typed
		}
	}
	return out
}

// SortRequiredKeys sorts required field keys for stable schemas.
func SortRequiredKeys(keys map[string]struct{}) []string {
	if len(keys) == 0 {
		return nil
	}
	out := make([]string, 0, len(keys))
	for key := range keys {
		out = append(out, key)
	}
	sort.Strings(out)
	return out
}
