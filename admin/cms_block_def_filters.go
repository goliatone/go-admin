package admin

import "strings"

func blockDefinitionType(def CMSBlockDefinition) string {
	return strings.TrimSpace(firstNonEmpty(def.Type, def.Slug, def.ID, def.Name))
}

func blockTypesFromContentType(ct CMSContentType) ([]string, bool) {
	if types, ok := blockTypesFromCapabilities(ct.Capabilities); ok {
		return types, true
	}
	if types, ok := blockTypesFromSchema(ct.Schema); ok {
		return types, true
	}
	return nil, false
}

func blockTypesFromCapabilities(capabilities map[string]any) ([]string, bool) {
	if capabilities == nil {
		return nil, false
	}
	keys := []string{
		"blocks",
		"block_types",
		"blockTypes",
		"block-types",
		"allowed_blocks",
		"allowed_block_types",
		"allowedBlockTypes",
	}
	for _, key := range keys {
		if raw, ok := capabilities[key]; ok {
			if types, ok := blockTypesFromCapabilityValue(raw); ok {
				return types, true
			}
		}
	}
	return nil, false
}

func blockTypesFromCapabilityValue(raw any) ([]string, bool) {
	switch value := raw.(type) {
	case []string:
		return append([]string{}, value...), true
	case []any:
		return stringSliceFromAny(value), true
	case map[string]any:
		keys := []string{"types", "allowed", "block_types", "blockTypes"}
		for _, key := range keys {
			if nested, ok := value[key]; ok {
				if types, ok := blockTypesFromCapabilityValue(nested); ok {
					return types, true
				}
			}
		}
		return nil, false
	case bool:
		if !value {
			return []string{}, true
		}
	}
	return nil, false
}

func blockTypesFromSchema(schema map[string]any) ([]string, bool) {
	if len(schema) == 0 {
		return nil, false
	}
	if looksLikeJSONSchema(schema) {
		schema = ensureObjectSchema(cloneAnyMap(schema))
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || props == nil {
		return nil, false
	}
	blocksSchema, ok := props["blocks"].(map[string]any)
	if !ok || blocksSchema == nil {
		return nil, false
	}
	if raw, ok := blocksSchema["x-block-types"]; ok {
		if types, ok := blockTypesFromCapabilityValue(raw); ok {
			return types, true
		}
	}
	if raw, ok := blocksSchema["items"]; ok {
		return blockTypesFromSchemaItems(raw)
	}
	return blockTypesFromSchemaItems(blocksSchema)
}

func blockTypesFromSchemaItems(raw any) ([]string, bool) {
	items, ok := raw.(map[string]any)
	if !ok || items == nil {
		return nil, false
	}
	if rawTypes, ok := items["x-block-types"]; ok {
		if types, ok := blockTypesFromCapabilityValue(rawTypes); ok {
			return types, true
		}
	}
	if rawOneOf, ok := items["oneOf"].([]any); ok {
		if len(rawOneOf) == 0 {
			return []string{}, true
		}
		types := extractBlockTypesFromVariants(rawOneOf)
		if len(types) > 0 {
			return types, true
		}
		return nil, false
	}
	if rawAnyOf, ok := items["anyOf"].([]any); ok {
		if len(rawAnyOf) == 0 {
			return []string{}, true
		}
		types := extractBlockTypesFromVariants(rawAnyOf)
		if len(types) > 0 {
			return types, true
		}
		return nil, false
	}
	if ref, ok := items["$ref"].(string); ok && strings.TrimSpace(ref) != "" {
		return []string{refTail(ref)}, true
	}
	if defType := blockTypeFromSchemaDef(items); defType != "" {
		return []string{defType}, true
	}
	return nil, false
}

func extractBlockTypesFromVariants(variants []any) []string {
	types := []string{}
	for _, variant := range variants {
		def, ok := variant.(map[string]any)
		if !ok {
			continue
		}
		if defType := blockTypeFromSchemaDef(def); defType != "" {
			types = append(types, defType)
		}
	}
	return types
}

func blockTypeFromSchemaDef(def map[string]any) string {
	if def == nil {
		return ""
	}
	for _, key := range []string{"x-block-type", "x-blockType", "x-block_type"} {
		if value := strings.TrimSpace(toString(def[key])); value != "" {
			return value
		}
	}
	if props, ok := def["properties"].(map[string]any); ok && props != nil {
		for _, key := range []string{"_type", "type"} {
			if raw, ok := props[key].(map[string]any); ok {
				if value := strings.TrimSpace(toString(raw["const"])); value != "" {
					return value
				}
				if rawEnum, ok := raw["enum"].([]any); ok {
					for _, candidate := range rawEnum {
						if value := strings.TrimSpace(toString(candidate)); value != "" {
							return value
						}
					}
				}
			}
		}
	}
	if ref, ok := def["$ref"].(string); ok && strings.TrimSpace(ref) != "" {
		return refTail(ref)
	}
	return ""
}

func refTail(ref string) string {
	trimmed := strings.TrimSpace(ref)
	if trimmed == "" {
		return ""
	}
	trimmed = strings.TrimSuffix(trimmed, "#")
	if strings.Contains(trimmed, "#/") {
		parts := strings.Split(trimmed, "#/")
		trimmed = parts[len(parts)-1]
	}
	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == '/' || r == '#'
	})
	if len(parts) == 0 {
		return trimmed
	}
	return strings.TrimSpace(parts[len(parts)-1])
}
