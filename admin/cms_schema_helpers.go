package admin

import (
	"context"
	"sort"
	"strings"
)

func (a *Admin) applyContentTypeSchema(ctx AdminContext, schema *Schema, contentType string) {
	if a == nil || schema == nil || strings.TrimSpace(contentType) == "" || a.contentTypeSvc == nil {
		return
	}
	ct := a.resolveCMSContentType(ctx.Context, contentType)
	if ct == nil {
		return
	}
	fields, formSchema := contentTypeSchemaToForm(ct.Schema)
	if len(fields) == 0 && formSchema == nil {
		return
	}
	mergedFields := mergeFormFields(schema.FormFields, fields)
	baseSchema := buildFormSchema(mergedFields)
	schema.FormFields = mergedFields
	schema.FormSchema = mergeFormSchemas(baseSchema, formSchema)
}

func (a *Admin) applyContentTypeSchemaFromContext(ctx AdminContext, schema *Schema, panelName string) {
	if panelName != "content" {
		return
	}
	query := queryParamsFromContext(ctx.Context)
	contentType := firstQueryValue(query, "filter_content_type", "content_type", "filter_content_type_slug", "content_type_slug")
	if contentType == "" {
		return
	}
	a.applyContentTypeSchema(ctx, schema, contentType)
}

func (a *Admin) resolveCMSContentType(ctx context.Context, key string) *CMSContentType {
	if a == nil || a.contentTypeSvc == nil || strings.TrimSpace(key) == "" {
		return nil
	}
	key = strings.TrimSpace(key)
	if ct, err := a.contentTypeSvc.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
		return ct
	}
	if ct, err := a.contentTypeSvc.ContentType(ctx, key); err == nil && ct != nil {
		return ct
	}
	types, err := a.contentTypeSvc.ContentTypes(ctx)
	if err != nil {
		return nil
	}
	needle := strings.ToLower(key)
	for _, ct := range types {
		if strings.ToLower(ct.Slug) == needle || strings.ToLower(ct.Name) == needle || strings.ToLower(ct.ID) == needle {
			copy := ct
			return &copy
		}
	}
	return nil
}

func firstQueryValue(params map[string][]string, keys ...string) string {
	if len(params) == 0 {
		return ""
	}
	for _, key := range keys {
		if vals, ok := params[key]; ok && len(vals) > 0 {
			if trimmed := strings.TrimSpace(vals[0]); trimmed != "" {
				return trimmed
			}
		}
	}
	return ""
}

func contentTypeSchemaToForm(schema map[string]any) ([]Field, map[string]any) {
	if len(schema) == 0 {
		return nil, nil
	}
	if looksLikeJSONSchema(schema) {
		normalized := ensureObjectSchema(cloneAnyMap(schema))
		fields := fieldsFromJSONSchema(normalized)
		return fields, normalized
	}
	fields := fieldsFromCustomSchema(schema)
	if len(fields) == 0 {
		return nil, nil
	}
	return fields, buildFormSchema(fields)
}

func looksLikeJSONSchema(schema map[string]any) bool {
	if schema == nil {
		return false
	}
	if _, ok := schema["properties"]; ok {
		return true
	}
	if _, ok := schema["$schema"]; ok {
		return true
	}
	if t, ok := schema["type"].(string); ok && t == "object" {
		if _, ok := schema["properties"].(map[string]any); ok {
			return true
		}
	}
	return false
}

func ensureObjectSchema(schema map[string]any) map[string]any {
	if schema == nil {
		schema = map[string]any{}
	}
	if _, ok := schema["type"]; !ok {
		schema["type"] = "object"
	}
	props, ok := schema["properties"].(map[string]any)
	if !ok || props == nil {
		props = map[string]any{}
		schema["properties"] = props
	}
	return schema
}

func mergeFormFields(base []Field, extra []Field) []Field {
	if len(extra) == 0 {
		return base
	}
	out := append([]Field{}, base...)
	seen := map[string]bool{}
	for _, f := range out {
		if f.Name != "" {
			seen[f.Name] = true
		}
	}
	for _, f := range extra {
		if f.Name == "" || seen[f.Name] {
			continue
		}
		out = append(out, f)
		seen[f.Name] = true
	}
	return out
}

func mergeFormSchemas(base, extra map[string]any) map[string]any {
	base = ensureObjectSchema(cloneAnyMap(base))
	if len(extra) == 0 {
		return base
	}
	extra = ensureObjectSchema(cloneAnyMap(extra))
	baseProps := base["properties"].(map[string]any)
	extraProps := extra["properties"].(map[string]any)
	for key, value := range extraProps {
		if _, ok := baseProps[key]; ok {
			continue
		}
		baseProps[key] = value
	}
	required := mergeRequiredFields(base["required"], extra["required"])
	if len(required) > 0 {
		base["required"] = required
	} else {
		delete(base, "required")
	}
	for key, value := range extra {
		if key == "properties" || key == "required" {
			continue
		}
		if _, ok := base[key]; !ok {
			base[key] = value
		}
	}
	return base
}

func mergeRequiredFields(base any, extra any) []string {
	out := map[string]bool{}
	for _, key := range requiredFieldList(base) {
		out[key] = true
	}
	for _, key := range requiredFieldList(extra) {
		out[key] = true
	}
	if len(out) == 0 {
		return nil
	}
	keys := make([]string, 0, len(out))
	for key := range out {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func requiredFieldList(raw any) []string {
	switch v := raw.(type) {
	case []string:
		return append([]string{}, v...)
	case []any:
		out := []string{}
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, s)
			}
		}
		return out
	default:
		return nil
	}
}

func fieldsFromCustomSchema(schema map[string]any) []Field {
	raw, ok := schema["fields"]
	if !ok {
		return nil
	}
	var items []any
	switch v := raw.(type) {
	case []any:
		items = v
	case []string:
		items = make([]any, 0, len(v))
		for _, s := range v {
			items = append(items, s)
		}
	}
	fields := []Field{}
	for _, item := range items {
		field, ok := parseSchemaField(item)
		if !ok || field.Name == "" {
			continue
		}
		fields = append(fields, field)
	}
	return fields
}

func fieldsFromJSONSchema(schema map[string]any) []Field {
	props, ok := schema["properties"].(map[string]any)
	if !ok || len(props) == 0 {
		return nil
	}
	required := map[string]bool{}
	for _, key := range requiredFieldList(schema["required"]) {
		required[key] = true
	}
	keys := make([]string, 0, len(props))
	for key := range props {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	fields := []Field{}
	for _, key := range keys {
		prop, _ := props[key].(map[string]any)
		field := Field{
			Name:     key,
			Label:    schemaFieldLabel(prop, key),
			Required: required[key],
		}
		field.Options = schemaFieldOptions(prop)
		field.Type = normalizeSchemaFieldType(schemaFieldType(prop), field.Options)
		fields = append(fields, field)
	}
	return fields
}

func parseSchemaField(raw any) (Field, bool) {
	switch v := raw.(type) {
	case string:
		name := strings.TrimSpace(v)
		if name == "" {
			return Field{}, false
		}
		return Field{
			Name:  name,
			Label: labelizeFieldName(name),
			Type:  "text",
		}, true
	case map[string]any:
		return parseSchemaFieldMap(v)
	case map[string]string:
		converted := map[string]any{}
		for key, val := range v {
			converted[key] = val
		}
		return parseSchemaFieldMap(converted)
	default:
		return Field{}, false
	}
}

func parseSchemaFieldMap(raw map[string]any) (Field, bool) {
	name := strings.TrimSpace(toString(raw["name"]))
	if name == "" {
		name = strings.TrimSpace(toString(raw["id"]))
	}
	if name == "" {
		name = strings.TrimSpace(toString(raw["key"]))
	}
	if name == "" {
		return Field{}, false
	}
	label := strings.TrimSpace(firstNonEmpty(toString(raw["label"]), toString(raw["title"])))
	if label == "" {
		label = labelizeFieldName(name)
	}
	options := optionsFromAny(raw["options"])
	if len(options) == 0 {
		options = optionsFromAny(raw["enum"])
	}
	fieldType := normalizeSchemaFieldType(strings.ToLower(toString(raw["type"])), options)
	required := false
	if val, ok := raw["required"].(bool); ok {
		required = val
	} else if val, ok := raw["required"].(string); ok {
		required = strings.TrimSpace(strings.ToLower(val)) == "true"
	}
	return Field{
		Name:     name,
		Label:    label,
		Type:     fieldType,
		Required: required,
		Options:  options,
	}, true
}

func schemaFieldLabel(prop map[string]any, fallback string) string {
	if prop == nil {
		return labelizeFieldName(fallback)
	}
	if label := strings.TrimSpace(toString(prop["title"])); label != "" {
		return label
	}
	return labelizeFieldName(fallback)
}

func schemaFieldType(prop map[string]any) string {
	if prop == nil {
		return ""
	}
	switch v := prop["type"].(type) {
	case string:
		return v
	case []any:
		for _, entry := range v {
			if s, ok := entry.(string); ok && s != "null" {
				return s
			}
		}
	}
	return ""
}

func schemaFieldOptions(prop map[string]any) []Option {
	if prop == nil {
		return nil
	}
	if opts := optionsFromAny(prop["x-options"]); len(opts) > 0 {
		return opts
	}
	return optionsFromAny(prop["enum"])
}

func optionsFromAny(raw any) []Option {
	switch v := raw.(type) {
	case []Option:
		return append([]Option{}, v...)
	case []any:
		out := []Option{}
		for _, item := range v {
			switch opt := item.(type) {
			case string:
				if strings.TrimSpace(opt) == "" {
					continue
				}
				out = append(out, Option{Value: opt, Label: labelizeFieldName(opt)})
			case map[string]any:
				value := toString(opt["value"])
				if value == "" {
					value = toString(opt["id"])
				}
				if value == "" {
					value = toString(opt["code"])
				}
				label := toString(opt["label"])
				if label == "" {
					label = labelizeFieldName(value)
				}
				out = append(out, Option{Value: value, Label: label})
			}
		}
		return out
	case []string:
		out := make([]Option, 0, len(v))
		for _, item := range v {
			if strings.TrimSpace(item) == "" {
				continue
			}
			out = append(out, Option{Value: item, Label: labelizeFieldName(item)})
		}
		return out
	default:
		return nil
	}
}

func normalizeSchemaFieldType(raw string, options []Option) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "textarea", "text", "markdown", "richtext":
		return "textarea"
	case "number", "integer", "float", "int":
		return "number"
	case "bool", "boolean":
		return "boolean"
	case "select", "enum":
		return "select"
	case "media", "media_picker":
		return "media"
	case "", "string":
		if len(options) > 0 {
			return "select"
		}
		return "text"
	default:
		if len(options) > 0 {
			return "select"
		}
		return "text"
	}
}

func labelizeFieldName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	parts := strings.FieldsFunc(name, func(r rune) bool {
		return r == '_' || r == '-' || r == '.'
	})
	for i, part := range parts {
		if part == "" {
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + strings.ToLower(part[1:])
	}
	return strings.Join(parts, " ")
}
