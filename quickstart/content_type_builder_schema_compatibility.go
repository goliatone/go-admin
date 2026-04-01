package quickstart

import (
	"encoding/json"
	"fmt"
	"reflect"
	"sort"
	"strings"
)

func normalizeSchemaValue(value any) map[string]any {
	switch v := value.(type) {
	case map[string]any:
		return v
	case string:
		var out map[string]any
		if err := json.Unmarshal([]byte(v), &out); err == nil {
			return out
		}
	}
	return map[string]any{}
}

func mergeContentTypeSchema(base, incoming map[string]any) map[string]any {
	if incoming == nil {
		return base
	}
	if base == nil {
		return incoming
	}
	merged := compatCloneMap(incoming)
	if baseDefs, ok := base["$defs"].(map[string]any); ok && len(baseDefs) > 0 {
		defs, _ := merged["$defs"].(map[string]any)
		if defs == nil {
			defs = map[string]any{}
		}
		for key, value := range baseDefs {
			if _, exists := defs[key]; exists {
				continue
			}
			defs[key] = compatCloneValue(value)
		}
		merged["$defs"] = defs
	}
	if baseMeta, ok := base["metadata"].(map[string]any); ok && len(baseMeta) > 0 {
		meta, _ := merged["metadata"].(map[string]any)
		if meta == nil {
			meta = map[string]any{}
		}
		for key, value := range baseMeta {
			if _, exists := meta[key]; exists {
				continue
			}
			meta[key] = compatCloneValue(value)
		}
		merged["metadata"] = meta
	}
	return merged
}

func diffSchemas(oldSchema, newSchema map[string]any) ([]schemaChange, []schemaChange) {
	breaking := []schemaChange{}
	warnings := []schemaChange{}
	if oldSchema == nil {
		oldSchema = map[string]any{}
	}
	if newSchema == nil {
		newSchema = map[string]any{}
	}
	oldProps := extractProperties(oldSchema)
	newProps := extractProperties(newSchema)
	oldRequired := requiredSet(oldSchema)
	newRequired := requiredSet(newSchema)

	for field, oldDef := range oldProps {
		newDef, ok := newProps[field]
		if !ok {
			isBreaking := oldRequired[field]
			change := schemaChange{
				Type:       "removed",
				Path:       "properties." + field,
				Field:      field,
				IsBreaking: isBreaking,
			}
			if isBreaking {
				change.Description = "Required field removed"
				breaking = append(breaking, change)
			} else {
				change.Description = "Field removed"
				warnings = append(warnings, change)
			}
			continue
		}
		breaking = append(breaking, compareField(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
		warnings = append(warnings, compareFieldWarnings(field, oldDef, newDef, oldRequired[field], newRequired[field])...)
	}

	for field := range newProps {
		if _, ok := oldProps[field]; ok {
			continue
		}
		if newRequired[field] {
			breaking = append(breaking, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Required field added",
				IsBreaking:  true,
			})
		} else {
			warnings = append(warnings, schemaChange{
				Type:        "added",
				Path:        "properties." + field,
				Field:       field,
				Description: "Field added",
			})
		}
	}

	return breaking, warnings
}

func compatibilityChanges(oldSchema, newSchema map[string]any) ([]schemaChange, []schemaChange) {
	result := checkSchemaCompatibility(oldSchema, newSchema)
	breaking := make([]schemaChange, 0, len(result.BreakingChanges))
	for _, change := range result.BreakingChanges {
		path := strings.TrimSpace(change.Field)
		if path == "" {
			path = strings.TrimSpace(change.Type)
		}
		breaking = append(breaking, schemaChange{
			Type:        change.Type,
			Path:        path,
			Field:       change.Field,
			Description: change.Description,
			IsBreaking:  true,
		})
	}
	if len(breaking) == 0 {
		_, warnings := diffSchemas(oldSchema, newSchema)
		return breaking, warnings
	}
	return breaking, nil
}

type compatibilityChangeLevel int

const (
	compatChangeNone compatibilityChangeLevel = iota
	compatChangePatch
	compatChangeMinor
	compatChangeMajor
)

type compatibilityBreakingChange struct {
	Type        string `json:"type"`
	Field       string `json:"field"`
	Description string `json:"description"`
}

type compatibilityResult struct {
	Compatible      bool                          `json:"compatible"`
	ChangeLevel     compatibilityChangeLevel      `json:"change_level"`
	BreakingChanges []compatibilityBreakingChange `json:"breaking_changes"`
	Warnings        []string                      `json:"warnings"`
}

func checkSchemaCompatibility(oldSchema, newSchema map[string]any) compatibilityResult {
	result := compatibilityResult{Compatible: true, ChangeLevel: compatChangeNone}
	oldNormalized := normalizeCompatibilitySchema(oldSchema)
	newNormalized := normalizeCompatibilitySchema(newSchema)

	oldFields := collectCompatibilityFields(oldNormalized)
	newFields := collectCompatibilityFields(newNormalized)

	hasMinor := false
	for path, oldField := range oldFields {
		newField, ok := newFields[path]
		if !ok {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "field_removed",
				Field:       path,
				Description: "field removed",
			})
			continue
		}
		switch compareCompatTypeInfo(oldField.Type, newField.Type) {
		case compatTypeChangeBreaking:
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "type_changed",
				Field:       path,
				Description: "field type changed",
			})
		case compatTypeChangeMinor:
			hasMinor = true
		}
		if !oldField.Required && newField.Required {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "required_added",
				Field:       path,
				Description: "required field added",
			})
		}
		if oldField.Required && !newField.Required {
			hasMinor = true
		}
	}

	for path, newField := range newFields {
		if _, ok := oldFields[path]; ok {
			continue
		}
		if newField.Required {
			result.BreakingChanges = append(result.BreakingChanges, compatibilityBreakingChange{
				Type:        "required_added",
				Field:       path,
				Description: "required field added",
			})
			continue
		}
		hasMinor = true
	}

	changed := !reflect.DeepEqual(stripSchemaVersionMetadata(oldSchema), stripSchemaVersionMetadata(newSchema))
	if len(result.BreakingChanges) > 0 {
		result.Compatible = false
		result.ChangeLevel = compatChangeMajor
		return result
	}
	if hasMinor {
		result.ChangeLevel = compatChangeMinor
		return result
	}
	if changed {
		result.ChangeLevel = compatChangePatch
	}
	return result
}

type compatFieldDescriptor struct {
	Type     compatTypeInfo `json:"type"`
	Required bool           `json:"required"`
}

type compatTypeInfo struct {
	kind      string
	scalars   map[string]struct{}
	items     *compatTypeInfo
	signature string
}

type compatTypeChange int

const (
	compatTypeChangeNone compatTypeChange = iota
	compatTypeChangeMinor
	compatTypeChangeBreaking
)

func collectCompatibilityFields(schema map[string]any) map[string]compatFieldDescriptor {
	fields := map[string]compatFieldDescriptor{}
	walkCompatibilityFields(schema, "", fields)
	return fields
}

func walkCompatibilityFields(node map[string]any, prefix string, fields map[string]compatFieldDescriptor) {
	if node == nil {
		return
	}
	required := requiredSetFromValue(node["required"])
	if props, ok := node["properties"].(map[string]any); ok {
		for name, raw := range props {
			child, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			path := joinCompatibilityPath(prefix, name)
			fields[path] = compatFieldDescriptor{
				Type:     parseCompatTypeInfo(child),
				Required: required[name],
			}
			walkCompatibilityFields(child, path, fields)
		}
	}
	if items, ok := node["items"].(map[string]any); ok {
		itemPath := prefix
		if itemPath == "" {
			itemPath = "[]"
		} else {
			itemPath = itemPath + "[]"
		}
		walkCompatibilityFields(items, itemPath, fields)
	}
	if oneOf, ok := node["oneOf"].([]any); ok {
		for idx, entry := range oneOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "oneOf", idx), fields)
		}
	}
	if allOf, ok := node["allOf"].([]any); ok {
		for idx, entry := range allOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "allOf", idx), fields)
		}
	}
	if defs, ok := node["$defs"].(map[string]any); ok {
		for name, entry := range defs {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			walkCompatibilityFields(child, joinCompatibilityPath(prefix, "$defs", name), fields)
		}
	}
}

func requiredSetFromValue(value any) map[string]bool {
	set := map[string]bool{}
	switch typed := value.(type) {
	case []string:
		for _, name := range typed {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			set[name] = true
		}
	case []any:
		for _, entry := range typed {
			name, ok := entry.(string)
			if !ok {
				continue
			}
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			set[name] = true
		}
	}
	return set
}

func parseCompatTypeInfo(node map[string]any) compatTypeInfo {
	if node == nil {
		return compatTypeInfo{kind: "unknown"}
	}
	types := readCompatTypeList(node["type"])
	if len(types) > 0 {
		containsObject := containsCompatType(types, "object")
		containsArray := containsCompatType(types, "array")
		if containsObject || containsArray {
			if len(types) > 1 {
				return compatTypeInfo{kind: "unknown", signature: "type:" + strings.Join(types, "|")}
			}
			if containsArray {
				items, _ := node["items"].(map[string]any)
				info := compatTypeInfo{kind: "array"}
				if items != nil {
					itemInfo := parseCompatTypeInfo(items)
					info.items = &itemInfo
				}
				return info
			}
			return compatTypeInfo{kind: "object"}
		}
		return compatTypeInfo{kind: "scalar", scalars: compatToSet(types)}
	}

	if info, ok := compatTypeInfoFromConst(node["const"]); ok {
		return info
	}
	if info, ok := compatTypeInfoFromEnum(node["enum"]); ok {
		return info
	}

	if props, ok := node["properties"].(map[string]any); ok && len(props) > 0 {
		return compatTypeInfo{kind: "object"}
	}
	if items, ok := node["items"].(map[string]any); ok {
		info := compatTypeInfo{kind: "array"}
		itemInfo := parseCompatTypeInfo(items)
		info.items = &itemInfo
		return info
	}
	if oneOf, ok := node["oneOf"].([]any); ok {
		union := map[string]struct{}{}
		for _, entry := range oneOf {
			child, ok := entry.(map[string]any)
			if !ok {
				continue
			}
			childInfo := parseCompatTypeInfo(child)
			if childInfo.kind != "scalar" {
				return compatTypeInfo{kind: "unknown", signature: "oneOf"}
			}
			for scalar := range childInfo.scalars {
				union[scalar] = struct{}{}
			}
		}
		if len(union) > 0 {
			return compatTypeInfo{kind: "scalar", scalars: union}
		}
		return compatTypeInfo{kind: "unknown", signature: "oneOf"}
	}
	if allOf, ok := node["allOf"].([]any); ok && len(allOf) > 0 {
		return compatTypeInfo{kind: "unknown", signature: "allOf"}
	}

	return compatTypeInfo{kind: "unknown"}
}

func compatTypeInfoFromConst(value any) (compatTypeInfo, bool) {
	if value == nil {
		return compatTypeInfo{}, false
	}
	if kind := compatKindFromValue(value); kind != "" {
		return compatTypeInfo{kind: "scalar", scalars: compatToSet([]string{kind})}, true
	}
	return compatTypeInfo{}, false
}

func compatTypeInfoFromEnum(value any) (compatTypeInfo, bool) {
	if value == nil {
		return compatTypeInfo{}, false
	}
	switch typed := value.(type) {
	case []any:
		types := make(map[string]struct{})
		for _, entry := range typed {
			if kind := compatKindFromValue(entry); kind != "" {
				types[kind] = struct{}{}
			}
		}
		if len(types) == 0 {
			return compatTypeInfo{}, false
		}
		return compatTypeInfo{kind: "scalar", scalars: types}, true
	case []string:
		if len(typed) == 0 {
			return compatTypeInfo{}, false
		}
		return compatTypeInfo{kind: "scalar", scalars: compatToSet([]string{"string"})}, true
	}
	return compatTypeInfo{}, false
}

func compatKindFromValue(value any) string {
	switch typed := value.(type) {
	case string:
		if strings.TrimSpace(typed) == "" {
			return ""
		}
		return "string"
	case bool:
		return "boolean"
	case float64, float32, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "number"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	case nil:
		return "null"
	default:
		return ""
	}
}

func compareCompatTypeInfo(oldInfo, newInfo compatTypeInfo) compatTypeChange {
	if oldInfo.kind == "" && newInfo.kind == "" {
		return compatTypeChangeNone
	}
	if oldInfo.kind != newInfo.kind {
		if oldInfo.kind == "scalar" && newInfo.kind == "scalar" {
			return compareCompatScalarSets(oldInfo.scalars, newInfo.scalars)
		}
		return compatTypeChangeBreaking
	}
	switch oldInfo.kind {
	case "scalar":
		return compareCompatScalarSets(oldInfo.scalars, newInfo.scalars)
	case "array":
		if oldInfo.items == nil && newInfo.items == nil {
			return compatTypeChangeNone
		}
		if oldInfo.items == nil && newInfo.items != nil {
			return compatTypeChangeBreaking
		}
		if oldInfo.items != nil && newInfo.items == nil {
			return compatTypeChangeMinor
		}
		return compareCompatTypeInfo(*oldInfo.items, *newInfo.items)
	case "object":
		return compatTypeChangeNone
	default:
		if oldInfo.signature == "" && newInfo.signature == "" {
			return compatTypeChangeNone
		}
		if oldInfo.signature != "" || newInfo.signature != "" {
			if oldInfo.signature == newInfo.signature {
				return compatTypeChangeNone
			}
		}
		return compatTypeChangeBreaking
	}
}

func compareCompatScalarSets(oldSet, newSet map[string]struct{}) compatTypeChange {
	if len(oldSet) == 0 && len(newSet) == 0 {
		return compatTypeChangeNone
	}
	if len(oldSet) == 0 || len(newSet) == 0 {
		return compatTypeChangeBreaking
	}
	if compatIsSuperset(newSet, oldSet) {
		if len(newSet) == len(oldSet) {
			return compatTypeChangeNone
		}
		return compatTypeChangeMinor
	}
	return compatTypeChangeBreaking
}

func normalizeCompatibilitySchema(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	if compatIsJSONSchema(schema) {
		return compatCloneMap(schema)
	}
	fields, ok := schema["fields"]
	if !ok {
		return compatCloneMap(schema)
	}
	props, required := normalizeCompatFields(fields)
	normalized := map[string]any{
		"type":                 "object",
		"properties":           props,
		"additionalProperties": false,
	}
	if len(required) > 0 {
		normalized["required"] = required
	}
	if override, ok := schema["additionalProperties"]; ok {
		if allowed, ok := override.(bool); ok {
			normalized["additionalProperties"] = allowed
		}
	}
	return normalized
}

func compatIsJSONSchema(schema map[string]any) bool {
	if _, ok := schema["$schema"]; ok {
		return true
	}
	if _, ok := schema["type"]; ok {
		return true
	}
	if _, ok := schema["properties"]; ok {
		return true
	}
	if _, ok := schema["oneOf"]; ok {
		return true
	}
	if _, ok := schema["anyOf"]; ok {
		return true
	}
	if _, ok := schema["allOf"]; ok {
		return true
	}
	return false
}

func normalizeCompatFields(fields any) (map[string]any, []string) {
	properties := make(map[string]any)
	required := make([]string, 0)

	switch typed := fields.(type) {
	case []any:
		for _, entry := range typed {
			if fieldMap, ok := entry.(map[string]any); ok {
				addCompatField(properties, &required, fieldMap)
				continue
			}
			if name, ok := entry.(string); ok {
				addCompatField(properties, &required, map[string]any{"name": name})
			}
		}
	case []map[string]any:
		for _, fieldMap := range typed {
			addCompatField(properties, &required, fieldMap)
		}
	}

	return properties, required
}

func addCompatField(properties map[string]any, required *[]string, field map[string]any) {
	if field == nil {
		return
	}
	name, _ := field["name"].(string)
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	if schema, ok := field["schema"].(map[string]any); ok {
		properties[name] = compatCloneMap(schema)
	} else if fieldType, ok := field["type"].(string); ok {
		if jsonType := normalizeCompatJSONType(fieldType); jsonType != "" {
			properties[name] = map[string]any{"type": jsonType}
		} else {
			properties[name] = map[string]any{}
		}
	} else {
		properties[name] = map[string]any{}
	}
	if required != nil {
		if flag, ok := field["required"].(bool); ok && flag {
			*required = append(*required, name)
		}
	}
}

func normalizeCompatJSONType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "string", "number", "integer", "boolean", "object", "array", "null":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func readCompatTypeList(value any) []string {
	switch typed := value.(type) {
	case string:
		trimmed := strings.ToLower(strings.TrimSpace(typed))
		if trimmed == "" {
			return nil
		}
		return []string{trimmed}
	case []string:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			trimmed := strings.ToLower(strings.TrimSpace(entry))
			if trimmed == "" {
				continue
			}
			out = append(out, trimmed)
		}
		sort.Strings(out)
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, entry := range typed {
			if name, ok := entry.(string); ok {
				trimmed := strings.ToLower(strings.TrimSpace(name))
				if trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
		sort.Strings(out)
		return out
	default:
		return nil
	}
}

func compatToSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
}

func containsCompatType(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func compatIsSuperset(superset, subset map[string]struct{}) bool {
	for value := range subset {
		if _, ok := superset[value]; !ok {
			return false
		}
	}
	return true
}

const (
	compatMetadataKey        = "metadata"
	compatMetadataSlugKey    = "slug"
	compatMetadataVersionKey = "schema_version"
)

func stripSchemaVersionMetadata(schema map[string]any) map[string]any {
	if schema == nil {
		return nil
	}
	clean := compatCloneMap(schema)
	meta, ok := clean[compatMetadataKey].(map[string]any)
	if !ok || meta == nil {
		return clean
	}
	metaCopy := compatCloneMap(meta)
	delete(metaCopy, compatMetadataVersionKey)
	delete(metaCopy, compatMetadataSlugKey)
	if len(metaCopy) == 0 {
		delete(clean, compatMetadataKey)
		return clean
	}
	clean[compatMetadataKey] = metaCopy
	return clean
}

func joinCompatibilityPath(parts ...any) string {
	segments := make([]string, 0, len(parts))
	for _, part := range parts {
		switch value := part.(type) {
		case string:
			if value == "" {
				continue
			}
			segments = append(segments, value)
		case int:
			segments = append(segments, "["+compatIntToString(value)+"]")
		}
	}
	return strings.Join(segments, ".")
}

func compatIntToString(value int) string {
	if value == 0 {
		return "0"
	}
	sign := ""
	if value < 0 {
		sign = "-"
		value = -value
	}
	var digits [20]byte
	idx := len(digits)
	for value > 0 {
		idx--
		digits[idx] = byte('0' + value%10)
		value /= 10
	}
	return sign + string(digits[idx:])
}

func compatCloneMap(input map[string]any) map[string]any {
	if input == nil {
		return nil
	}
	out := make(map[string]any, len(input))
	for key, value := range input {
		out[key] = compatCloneValue(value)
	}
	return out
}

func compatCloneSlice(input []any) []any {
	if input == nil {
		return nil
	}
	out := make([]any, len(input))
	for i, value := range input {
		out[i] = compatCloneValue(value)
	}
	return out
}

func compatCloneValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return compatCloneMap(typed)
	case []any:
		return compatCloneSlice(typed)
	default:
		return typed
	}
}

func extractProperties(schema map[string]any) map[string]any {
	propsRaw, ok := schema["properties"]
	if !ok {
		return map[string]any{}
	}
	switch props := propsRaw.(type) {
	case map[string]any:
		return props
	default:
		return map[string]any{}
	}
}

func requiredSet(schema map[string]any) map[string]bool {
	required := map[string]bool{}
	raw, ok := schema["required"]
	if !ok || raw == nil {
		return required
	}
	switch vals := raw.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				required[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				required[s] = true
			}
		}
	}
	return required
}

func compareField(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldType := strings.TrimSpace(anyToString(oldMap["type"]))
	newType := strings.TrimSpace(anyToString(newMap["type"]))
	if oldType != "" && newType != "" && oldType != newType {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".type",
			Field:       field,
			Description: fmt.Sprintf("Type changed from %s to %s", oldType, newType),
			IsBreaking:  true,
		})
	}

	if oldRequired && !newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is no longer required",
			IsBreaking:  true,
		})
	}

	if !oldRequired && newRequired {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "required",
			Field:       field,
			Description: "Field is now required",
			IsBreaking:  true,
		})
	}

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 {
		if enumShrink(oldEnum, newEnum) {
			out = append(out, schemaChange{
				Type:        "modified",
				Path:        "properties." + field + ".enum",
				Field:       field,
				Description: "Enum values removed",
				IsBreaking:  true,
			})
		}
	}

	return out
}

func compareFieldWarnings(field string, oldDef any, newDef any, oldRequired bool, newRequired bool) []schemaChange {
	out := []schemaChange{}
	oldMap := normalizeSchemaValue(oldDef)
	newMap := normalizeSchemaValue(newDef)

	oldEnum := extractEnumSet(oldMap["enum"])
	newEnum := extractEnumSet(newMap["enum"])
	if len(oldEnum) > 0 && len(newEnum) > 0 && enumExpand(oldEnum, newEnum) {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".enum",
			Field:       field,
			Description: "Enum values added",
		})
	}

	oldDesc := strings.TrimSpace(anyToString(oldMap["description"]))
	newDesc := strings.TrimSpace(anyToString(newMap["description"]))
	if oldDesc != "" && newDesc != "" && oldDesc != newDesc {
		out = append(out, schemaChange{
			Type:        "modified",
			Path:        "properties." + field + ".description",
			Field:       field,
			Description: "Description changed",
		})
	}

	return out
}

func extractEnumSet(value any) map[string]bool {
	out := map[string]bool{}
	switch vals := value.(type) {
	case []string:
		for _, v := range vals {
			if strings.TrimSpace(v) != "" {
				out[v] = true
			}
		}
	case []any:
		for _, v := range vals {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				out[s] = true
			}
		}
	}
	return out
}

func enumShrink(oldSet, newSet map[string]bool) bool {
	for val := range oldSet {
		if !newSet[val] {
			return true
		}
	}
	return false
}

func enumExpand(oldSet, newSet map[string]bool) bool {
	for val := range newSet {
		if !oldSet[val] {
			return true
		}
	}
	return false
}
