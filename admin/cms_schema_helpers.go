package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"sort"
	"strconv"
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
		normalized := ensureObjectSchema(primitives.CloneAnyMap(schema))
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
	base = ensureObjectSchema(primitives.CloneAnyMap(base))
	if len(extra) == 0 {
		return base
	}
	extra = ensureObjectSchema(primitives.CloneAnyMap(extra))
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
	label := strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(raw["label"]), toString(raw["title"])))
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

// SchemaToFieldsConverter maps JSON Schema properties into panel field definitions.
type SchemaToFieldsConverter struct {
	widgetMapping map[string]string
	typeMapping   map[string]string
}

// ConvertedFields captures the derived list/form/detail fields and filters.
type ConvertedFields struct {
	List    []Field
	Form    []Field
	Detail  []Field
	Filters []Filter
}

// NewSchemaToFieldsConverter builds a converter with default mappings.
func NewSchemaToFieldsConverter() *SchemaToFieldsConverter {
	return &SchemaToFieldsConverter{
		widgetMapping: map[string]string{},
		typeMapping:   map[string]string{},
	}
}

// Convert maps a JSON schema + UI overlay into panel fields.
func (c *SchemaToFieldsConverter) Convert(schema map[string]any, uiSchema map[string]any) ConvertedFields {
	result := ConvertedFields{}
	props := extractSchemaProperties(schema)
	if len(props) == 0 {
		return result
	}
	required := extractSchemaRequired(schema)
	overrides := uiSchemaOverrides(uiSchema)

	keys := make([]string, 0, len(props))
	for key := range props {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	listFields := []Field{}
	formFields := []Field{}
	detailFields := []Field{}
	filterFields := []Filter{}
	orderByName := map[string]int{}

	for idx, name := range keys {
		prop := props[name]
		field := c.convertProperty(name, prop, required)
		override := overrides[name]
		if override != nil {
			field = c.applyUIOverride(field, override)
		}
		orderByName[name] = fieldOrder(prop, override, idx)

		hiddenInList := isHiddenInList(prop, override)
		if !hiddenInList {
			listFields = append(listFields, c.toListField(field))
		}
		formFields = append(formFields, field)
		detailFields = append(detailFields, c.toDetailField(field))

		if !hiddenInList && isFilterable(field, prop, override) {
			if filter := c.toFilter(field); filter.Name != "" {
				filterFields = append(filterFields, filter)
			}
		}
	}

	result.List = sortFieldsByOrder(listFields, orderByName)
	result.Form = sortFieldsByOrder(formFields, orderByName)
	result.Detail = sortFieldsByOrder(detailFields, orderByName)
	result.Filters = sortFiltersByOrder(filterFields, orderByName)

	return result
}

func (c *SchemaToFieldsConverter) convertProperty(name string, prop map[string]any, required map[string]bool) Field {
	field := Field{
		Name:     name,
		Label:    extractTitle(prop, name),
		Required: required[name],
	}

	if prop != nil {
		field.ReadOnly = toBool(prop["readOnly"]) || toBool(prop["read_only"])
		field.Hidden = toBool(prop["x-hidden"])
	}

	field.Options = schemaFieldOptions(prop)
	field.Type = c.inferFieldType(prop, field.Options)
	return field
}

func (c *SchemaToFieldsConverter) inferFieldType(prop map[string]any, options []Option) string {
	if widget := extractWidget(prop); widget != "" {
		if mapped := c.widgetMapping[widget]; mapped != "" {
			return mapped
		}
		return widget
	}
	if hasBlockUnion(prop) {
		return "block"
	}
	if len(options) > 0 || hasEnum(prop) {
		return "select"
	}
	rawType := strings.ToLower(strings.TrimSpace(schemaFieldType(prop)))
	format := strings.ToLower(strings.TrimSpace(toString(prop["format"])))

	switch rawType {
	case "boolean":
		return "boolean"
	case "integer", "number":
		return "number"
	case "array":
		return "array"
	case "object":
		return "json"
	}

	switch format {
	case "date":
		return "date"
	case "date-time", "datetime":
		return "datetime"
	case "time":
		return "time"
	}

	if mapped := c.typeMapping[rawType]; mapped != "" {
		return mapped
	}
	return "text"
}

func (c *SchemaToFieldsConverter) applyUIOverride(field Field, override map[string]any) Field {
	if override == nil {
		return field
	}
	if label := strings.TrimSpace(toString(override["label"])); label != "" {
		field.Label = label
	}
	if widget := strings.TrimSpace(toString(override["widget"])); widget != "" {
		field.Type = widget
	}
	if value := override["hidden"]; value != nil {
		field.Hidden = toBool(value)
	}
	if value := override["readonly"]; value != nil {
		field.ReadOnly = toBool(value)
	}
	if value := override["readOnly"]; value != nil {
		field.ReadOnly = toBool(value)
	}
	return field
}

func (c *SchemaToFieldsConverter) toListField(field Field) Field {
	return field
}

func (c *SchemaToFieldsConverter) toDetailField(field Field) Field {
	return field
}

func (c *SchemaToFieldsConverter) toFilter(field Field) Filter {
	filterType := NormalizeFilterType(field.Type)
	operators := []string{"eq", "ilike", "in"}
	defaultOperator := "ilike"
	switch filterType {
	case "number":
		filterType = "number"
		operators = []string{"eq", "in"}
		defaultOperator = "eq"
	case "select":
		filterType = "select"
		operators = []string{"eq", "in"}
		defaultOperator = "eq"
	default:
		filterType = "text"
	}
	filter := Filter{
		Name:            field.Name,
		Label:           field.Label,
		Type:            filterType,
		Operators:       operators,
		DefaultOperator: defaultOperator,
	}
	if filterType == "select" && len(field.Options) > 0 {
		filter.Options = append([]Option{}, field.Options...)
	}
	return filter
}

func extractSchemaProperties(schema map[string]any) map[string]map[string]any {
	if schema == nil {
		return nil
	}
	raw, ok := schema["properties"].(map[string]any)
	if !ok || len(raw) == 0 {
		return nil
	}
	out := map[string]map[string]any{}
	for key, value := range raw {
		if prop, ok := value.(map[string]any); ok {
			out[key] = prop
		}
	}
	return out
}

func extractSchemaRequired(schema map[string]any) map[string]bool {
	out := map[string]bool{}
	for _, key := range requiredFieldList(schema["required"]) {
		out[key] = true
	}
	return out
}

func extractTitle(prop map[string]any, fallback string) string {
	if prop != nil {
		if title := strings.TrimSpace(toString(prop["title"])); title != "" {
			return title
		}
	}
	return labelizeFieldName(fallback)
}

func extractWidget(prop map[string]any) string {
	if prop == nil {
		return ""
	}
	if meta := extractXFormgen(prop); meta != nil {
		if widget := strings.TrimSpace(toString(meta["widget"])); widget != "" {
			return widget
		}
	}
	if meta := extractXAdmin(prop); meta != nil {
		if widget := strings.TrimSpace(toString(meta["widget"])); widget != "" {
			return widget
		}
	}
	return ""
}

func extractXFormgen(prop map[string]any) map[string]any {
	if prop == nil {
		return nil
	}
	if raw, ok := prop["x-formgen"].(map[string]any); ok {
		return raw
	}
	if raw, ok := prop["x_formgen"].(map[string]any); ok {
		return raw
	}
	if raw, ok := prop["x-formgen"].(map[string]interface{}); ok {
		return map[string]any(raw)
	}
	return nil
}

func extractXAdmin(prop map[string]any) map[string]any {
	if prop == nil {
		return nil
	}
	if raw, ok := prop["x-admin"].(map[string]any); ok {
		return raw
	}
	if raw, ok := prop["x_admin"].(map[string]any); ok {
		return raw
	}
	if raw, ok := prop["x-admin"].(map[string]interface{}); ok {
		return map[string]any(raw)
	}
	return nil
}

func hasEnum(prop map[string]any) bool {
	if prop == nil {
		return false
	}
	switch prop["enum"].(type) {
	case []any, []string:
		return true
	default:
		return false
	}
}

func hasBlockUnion(prop map[string]any) bool {
	if prop == nil {
		return false
	}
	if meta := extractXFormgen(prop); meta != nil {
		if widget := strings.TrimSpace(toString(meta["widget"])); widget == "block" || widget == "blocks" {
			return true
		}
	}
	if schemaFieldType(prop) != "array" {
		return false
	}
	items, ok := prop["items"].(map[string]any)
	if !ok || items == nil {
		return false
	}
	if _, ok := items["oneOf"].([]any); ok {
		return true
	}
	return false
}

func uiSchemaOverrides(uiSchema map[string]any) map[string]map[string]any {
	out := map[string]map[string]any{}
	if uiSchema == nil {
		return out
	}
	raw, ok := uiSchema["overrides"].([]any)
	if !ok {
		return out
	}
	for _, item := range raw {
		override, ok := item.(map[string]any)
		if !ok {
			continue
		}
		fieldName := overrideFieldName(override)
		if fieldName == "" {
			continue
		}
		if meta, ok := override["x-formgen"].(map[string]any); ok {
			out[fieldName] = meta
			continue
		}
		if meta, ok := override["x_formgen"].(map[string]any); ok {
			out[fieldName] = meta
		}
	}
	return out
}

func overrideFieldName(override map[string]any) string {
	if override == nil {
		return ""
	}
	if name := strings.TrimSpace(toString(override["field"])); name != "" {
		return name
	}
	if name := strings.TrimSpace(toString(override["name"])); name != "" {
		return name
	}
	path := strings.TrimSpace(toString(override["path"]))
	if path == "" {
		return ""
	}
	path = strings.TrimPrefix(path, "#")
	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")
	for i := 0; i < len(parts)-1; i++ {
		if parts[i] == "properties" && i+1 < len(parts) {
			return parts[i+1]
		}
	}
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}

func fieldOrder(prop map[string]any, override map[string]any, fallback int) int {
	if override != nil {
		if order, ok := numericOrder(override["order"]); ok {
			return order
		}
	}
	if prop != nil {
		if meta := extractXFormgen(prop); meta != nil {
			if order, ok := numericOrder(meta["order"]); ok {
				return order
			}
		}
		if meta := extractXAdmin(prop); meta != nil {
			if order, ok := numericOrder(meta["order"]); ok {
				return order
			}
		}
	}
	return fallback
}

func numericOrder(value any) (int, bool) {
	switch v := value.(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	case string:
		if trimmed := strings.TrimSpace(v); trimmed != "" {
			if parsed, err := strconv.Atoi(trimmed); err == nil {
				return parsed, true
			}
		}
	}
	return 0, false
}

func isHiddenInList(prop map[string]any, override map[string]any) bool {
	if override != nil {
		if value, ok := override["hideInList"]; ok {
			return toBool(value)
		}
		if value, ok := override["listHidden"]; ok {
			return toBool(value)
		}
	}
	if prop == nil {
		return false
	}
	if meta := extractXFormgen(prop); meta != nil {
		if value, ok := meta["hideInList"]; ok {
			return toBool(value)
		}
		if value, ok := meta["listHidden"]; ok {
			return toBool(value)
		}
	}
	if meta := extractXAdmin(prop); meta != nil {
		if value, ok := meta["hideInList"]; ok {
			return toBool(value)
		}
	}
	return false
}

func isFilterable(field Field, prop map[string]any, override map[string]any) bool {
	if override != nil {
		if value, ok := override["filterable"]; ok {
			return toBool(value)
		}
	}
	if prop != nil {
		if meta := extractXFormgen(prop); meta != nil {
			if value, ok := meta["filterable"]; ok {
				return toBool(value)
			}
		}
		if meta := extractXAdmin(prop); meta != nil {
			if value, ok := meta["filterable"]; ok {
				return toBool(value)
			}
		}
	}
	if field.Hidden {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "", "object", "array", "block", "json", "group", "repeater", "blocks":
		return false
	default:
		return true
	}
}

func sortFieldsByOrder(fields []Field, order map[string]int) []Field {
	if len(fields) == 0 {
		return fields
	}
	sort.SliceStable(fields, func(i, j int) bool {
		left := fields[i].Name
		right := fields[j].Name
		leftOrder, okLeft := order[left]
		rightOrder, okRight := order[right]
		if okLeft && okRight && leftOrder != rightOrder {
			return leftOrder < rightOrder
		}
		if okLeft != okRight {
			return okLeft
		}
		return left < right
	})
	return fields
}

func sortFiltersByOrder(filters []Filter, order map[string]int) []Filter {
	if len(filters) == 0 {
		return filters
	}
	sort.SliceStable(filters, func(i, j int) bool {
		left := filters[i].Name
		right := filters[j].Name
		leftOrder, okLeft := order[left]
		rightOrder, okRight := order[right]
		if okLeft && okRight && leftOrder != rightOrder {
			return leftOrder < rightOrder
		}
		if okLeft != okRight {
			return okLeft
		}
		return left < right
	})
	return filters
}
