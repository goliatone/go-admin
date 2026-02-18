package quickstart

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"sort"
	"strings"

	"github.com/goliatone/go-admin/admin"
	goerrors "github.com/goliatone/go-errors"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	router "github.com/goliatone/go-router"
)

func (h *contentEntryHandlers) renderForm(
	c router.Context,
	panelName string,
	panel *admin.Panel,
	contentType *admin.CMSContentType,
	adminCtx admin.AdminContext,
	values map[string]any,
	resourceItem map[string]any,
	isEdit bool,
	previewURL string,
) error {
	if h.formRenderer == nil {
		return errors.New("form renderer is not configured")
	}
	baseSlug := contentTypeSlug(contentType, panelName)
	routes := newContentEntryRoutes(h.cfg.BasePath, baseSlug, adminCtx.Environment)
	translationState := contentEntryTranslationStateFromRecord(resourceItem)
	formAction := routes.create()
	if isEdit {
		id := strings.TrimSpace(c.Param("id"))
		formAction = routes.update(id)
		if locale := contentEntryRequestedLocale(c, translationState.RequestedLocale); locale != "" {
			formAction = appendQueryParam(formAction, "locale", locale)
		}
	}
	schema := contentTypeSchema(contentType, panel)
	if schema == nil {
		return admin.ErrNotFound
	}
	uiSchema := contentTypeUISchema(contentType)
	opts := admin.SchemaValidationOptions{
		Slug:     formAction,
		UISchema: uiSchema,
	}
	renderOpts := formgenrender.RenderOptions{Values: values}
	html, err := h.formRenderer.RenderForm(c.Context(), schema, opts, renderOpts)
	if err != nil {
		return err
	}
	viewCtx := router.ViewContext{
		"title":          h.cfg.Title,
		"base_path":      h.cfg.BasePath,
		"resource":       "content",
		"resource_label": contentTypeLabel(contentType, panelName),
		"panel_name":     baseSlug,
		"routes":         routes.routesMap(),
		"form_action":    formAction,
		"form_html":      html,
		"resource_item":  resourceItem,
		"is_edit":        isEdit,
		"create_success": queryParamEnabled(c, "created"),
		"preview_url":    strings.TrimSpace(previewURL),
		"content_type": map[string]any{
			"id":     contentTypeID(contentType),
			"name":   contentTypeLabel(contentType, panelName),
			"slug":   baseSlug,
			"icon":   contentTypeIcon(contentType),
			"status": contentTypeStatus(contentType),
		},
	}
	if h.viewContext != nil {
		viewCtx = h.viewContext(viewCtx, panelName, c)
	}
	return h.renderTemplate(c, baseSlug, h.formTemplate, viewCtx)
}

func (h *contentEntryHandlers) parseFormPayload(c router.Context, schema map[string]any) (map[string]any, error) {
	if c == nil {
		return map[string]any{}, nil
	}
	if isJSONRequest(c) {
		payload := map[string]any{}
		if err := parseJSONBody(c, &payload); err != nil {
			return nil, err
		}
		return payload, nil
	}
	body := c.Body()
	values := url.Values{}
	if len(body) > 0 {
		if isMultipartFormRequest(c) {
			parsed, err := parseMultipartFormValues(c)
			if err != nil {
				return nil, goerrors.New("invalid multipart form payload", goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			values = parsed
		} else {
			parsed, err := url.ParseQuery(string(body))
			if err != nil {
				return nil, goerrors.New("invalid form payload", goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			values = parsed
		}
	}
	record := map[string]any{}
	schemaMap, boolPaths := flattenSchema(schema)
	for key, vals := range values {
		if key == "" {
			continue
		}
		if len(vals) == 0 {
			continue
		}
		schemaDef := schemaMap[key]
		if len(vals) > 1 {
			value, err := parseMultiValue(vals, schemaDef)
			if err != nil {
				return nil, goerrors.New(fmt.Sprintf("invalid form payload for %s", strings.TrimSpace(key)), goerrors.CategoryValidation).
					WithCode(http.StatusBadRequest).
					WithTextCode("INVALID_FORM")
			}
			setNestedValue(record, key, value)
			continue
		}
		value := parseValue(vals[0], schemaDef)
		setNestedValue(record, key, value)
	}
	for _, path := range boolPaths {
		if !hasNestedValue(record, path) {
			setNestedValue(record, path, false)
		}
	}
	return record, nil
}

func isMultipartFormRequest(c router.Context) bool {
	contentType := strings.ToLower(strings.TrimSpace(requestContentType(c)))
	return strings.Contains(contentType, "multipart/form-data")
}

func requestContentType(c router.Context) string {
	if c == nil {
		return ""
	}
	return strings.TrimSpace(c.Header("Content-Type"))
}

func parseMultipartFormValues(c router.Context) (url.Values, error) {
	values := url.Values{}
	if c == nil {
		return values, nil
	}
	body := c.Body()
	if len(body) == 0 {
		return values, nil
	}
	contentType := strings.TrimSpace(requestContentType(c))
	if contentType == "" {
		return values, nil
	}
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, err
	}
	boundary := strings.TrimSpace(params["boundary"])
	if boundary == "" {
		return nil, fmt.Errorf("missing multipart boundary")
	}
	reader := multipart.NewReader(bytes.NewReader(body), boundary)
	for {
		part, err := reader.NextPart()
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, err
		}
		name := strings.TrimSpace(part.FormName())
		if name == "" {
			_ = part.Close()
			continue
		}
		if strings.TrimSpace(part.FileName()) != "" {
			_ = part.Close()
			continue
		}
		data, readErr := io.ReadAll(part)
		_ = part.Close()
		if readErr != nil {
			return nil, readErr
		}
		values.Add(name, string(data))
	}
	return values, nil
}

func contentEntryColumns(panel *admin.Panel, contentType *admin.CMSContentType, filters []map[string]any, defaultRenderers map[string]string) []map[string]any {
	fields := []admin.Field{}
	filterable := map[string]struct{}{}
	if panel != nil {
		schema := panel.Schema()
		fields = schema.ListFields
		for _, filter := range schema.Filters {
			name := strings.TrimSpace(filter.Name)
			if name == "" {
				continue
			}
			filterable[name] = struct{}{}
		}
	}
	for _, filter := range filters {
		name := strings.TrimSpace(anyToString(filter["name"]))
		if name == "" {
			continue
		}
		filterable[name] = struct{}{}
	}
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title"},
			{Name: "slug", Label: "Slug"},
			{Name: "status", Label: "Status"},
			{Name: "locale", Label: "Locale"},
		}
	}
	cols := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(strings.TrimSpace(field.Name))
		}
		sortable := contentEntryFieldSortable(field)
		col := map[string]any{
			"field":      field.Name,
			"label":      label,
			"sortable":   sortable,
			"filterable": false,
			"default":    !field.Hidden,
		}
		renderer, rendererOptions := contentEntryFieldRenderer(field, contentType, defaultRenderers)
		if renderer != "" {
			col["renderer"] = renderer
		}
		if len(rendererOptions) > 0 {
			col["renderer_options"] = rendererOptions
		}
		if _, ok := filterable[field.Name]; ok {
			col["filterable"] = true
		}
		cols = append(cols, col)
	}
	return cols
}

func contentEntryFieldSortable(field admin.Field) bool {
	if field.Hidden {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "textarea", "json", "object", "array", "block-library-picker", "blocks":
		return false
	default:
		return true
	}
}

func contentEntryFieldRenderer(field admin.Field, contentType *admin.CMSContentType, defaultRenderers map[string]string) (string, map[string]any) {
	hints := contentEntryFieldUISchemaHints(contentType, field.Name)
	renderer := contentEntryRendererNameFromHints(hints)
	if renderer == "" {
		renderer = contentEntryDefaultRenderer(field, defaultRenderers)
	}
	return renderer, contentEntryRendererOptionsFromHints(hints)
}

func contentEntryDefaultRenderer(field admin.Field, defaultRenderers map[string]string) string {
	if renderer := contentEntryConfiguredDefaultRenderer(field, defaultRenderers); renderer != "" {
		return renderer
	}
	fieldType := strings.ToLower(strings.TrimSpace(field.Type))
	fieldName := strings.ToLower(strings.TrimSpace(field.Name))
	switch fieldType {
	case "array", "multiselect", "list", "tags", "block-library-picker", "blocks":
		return "_array"
	case "json", "jsonschema", "object":
		return "_object"
	}
	switch fieldName {
	case "tags", "blocks":
		return "_array"
	}
	return ""
}

func contentEntryConfiguredDefaultRenderer(field admin.Field, defaultRenderers map[string]string) string {
	if len(defaultRenderers) == 0 {
		return ""
	}
	fieldType := strings.ToLower(strings.TrimSpace(field.Type))
	if fieldType == "" {
		return ""
	}
	return strings.TrimSpace(defaultRenderers[fieldType])
}

func contentEntryNormalizeDefaultRenderers(renderers map[string]string) map[string]string {
	if len(renderers) == 0 {
		return nil
	}
	out := make(map[string]string, len(renderers))
	for fieldType, renderer := range renderers {
		key := strings.ToLower(strings.TrimSpace(fieldType))
		value := strings.TrimSpace(renderer)
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func contentEntryMergeDefaultRenderers(base map[string]string, renderers map[string]string) map[string]string {
	out := cloneStringMap(contentEntryNormalizeDefaultRenderers(base))
	normalized := contentEntryNormalizeDefaultRenderers(renderers)
	if len(normalized) == 0 {
		return out
	}
	if out == nil {
		out = make(map[string]string, len(normalized))
	}
	for fieldType, renderer := range normalized {
		out[fieldType] = renderer
	}
	return out
}

func contentEntryFieldUISchemaHints(contentType *admin.CMSContentType, fieldName string) map[string]any {
	if contentType == nil || len(contentType.UISchema) == 0 {
		return nil
	}
	fields, ok := contentType.UISchema["fields"].(map[string]any)
	if !ok || len(fields) == 0 {
		return nil
	}
	name := strings.TrimSpace(fieldName)
	if name == "" {
		return nil
	}
	candidates := []string{name, "/" + name}
	for _, key := range candidates {
		value, ok := fields[key]
		if !ok {
			continue
		}
		hints, ok := value.(map[string]any)
		if !ok {
			continue
		}
		return hints
	}
	return nil
}

func contentEntryHintScopes(hints map[string]any) []map[string]any {
	if len(hints) == 0 {
		return nil
	}
	scopes := []map[string]any{}
	for _, key := range []string{"table", "list", "datagrid", "data_grid"} {
		if value, ok := hints[key].(map[string]any); ok && len(value) > 0 {
			scopes = append(scopes, value)
		}
	}
	scopes = append(scopes, hints)
	return scopes
}

func contentEntryRendererNameFromHints(hints map[string]any) string {
	for _, scope := range contentEntryHintScopes(hints) {
		for _, key := range []string{"renderer", "cell_renderer", "cellRenderer"} {
			if name := strings.TrimSpace(anyToString(scope[key])); name != "" {
				return name
			}
		}
	}
	return ""
}

func contentEntryRendererOptionsFromHints(hints map[string]any) map[string]any {
	options := map[string]any{}
	for _, scope := range contentEntryHintScopes(hints) {
		for _, key := range []string{"renderer_options", "rendererOptions"} {
			raw, ok := scope[key].(map[string]any)
			if !ok || len(raw) == 0 {
				continue
			}
			for optKey, optValue := range raw {
				if _, exists := options[optKey]; exists {
					continue
				}
				options[optKey] = optValue
			}
		}
		if _, exists := options["display_key"]; !exists {
			if key := strings.TrimSpace(anyToString(scope["display_key"])); key != "" {
				options["display_key"] = key
			} else if key := strings.TrimSpace(anyToString(scope["displayKey"])); key != "" {
				options["display_key"] = key
			}
		}
		if _, exists := options["display_keys"]; !exists {
			keys := contentEntryStringList(scope["display_keys"])
			if len(keys) == 0 {
				keys = contentEntryStringList(scope["displayKeys"])
			}
			if len(keys) > 0 {
				out := make([]any, 0, len(keys))
				for _, key := range keys {
					out = append(out, key)
				}
				options["display_keys"] = out
			}
		}
	}
	if len(options) == 0 {
		return nil
	}
	return options
}

func contentEntryStringList(raw any) []string {
	switch typed := raw.(type) {
	case string:
		if value := strings.TrimSpace(typed); value != "" {
			return []string{value}
		}
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(item); value != "" {
				out = append(out, value)
			}
		}
		if len(out) > 0 {
			return out
		}
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if value := strings.TrimSpace(anyToString(item)); value != "" {
				out = append(out, value)
			}
		}
		if len(out) > 0 {
			return out
		}
	}
	return nil
}

func contentEntryFilters(panel *admin.Panel) []map[string]any {
	if panel == nil {
		return []map[string]any{}
	}
	schema := panel.Schema()
	optionsByField := map[string][]map[string]any{}
	formFieldByName := map[string]admin.Field{}
	for _, field := range schema.FormFields {
		name := strings.TrimSpace(field.Name)
		if name == "" {
			if name != "" {
				formFieldByName[name] = field
			}
			continue
		}
		if len(field.Options) > 0 {
			optionsByField[name] = contentEntryFilterOptions(field.Options)
		}
		formFieldByName[name] = field
	}
	if len(schema.Filters) == 0 {
		return contentEntryColumnFallbackFilters(schema.ListFields, formFieldByName, optionsByField)
	}
	out := make([]map[string]any, 0, len(schema.Filters))
	for _, filter := range schema.Filters {
		name := strings.TrimSpace(filter.Name)
		if name == "" {
			continue
		}
		label := strings.TrimSpace(filter.Label)
		if label == "" {
			label = titleCase(name)
		}
		entry := map[string]any{
			"name":  name,
			"label": label,
			"type":  strings.TrimSpace(filter.Type),
		}
		if len(filter.Operators) > 0 {
			entry["operators"] = append([]string{}, filter.Operators...)
		}
		if op := strings.TrimSpace(filter.DefaultOperator); op != "" {
			entry["default_operator"] = op
		}
		if len(filter.Options) > 0 {
			entry["options"] = contentEntryFilterOptions(filter.Options)
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryColumnFallbackFilters(listFields []admin.Field, formFieldByName map[string]admin.Field, optionsByField map[string][]map[string]any) []map[string]any {
	fields := listFields
	if len(fields) == 0 {
		fields = []admin.Field{
			{Name: "title", Label: "Title", Type: "text"},
			{Name: "slug", Label: "Slug", Type: "text"},
			{Name: "status", Label: "Status", Type: "select"},
			{Name: "locale", Label: "Locale", Type: "select"},
		}
	}
	seen := map[string]struct{}{}
	out := make([]map[string]any, 0, len(fields))
	for _, field := range fields {
		name := strings.TrimSpace(field.Name)
		if name == "" || field.Hidden {
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		label := strings.TrimSpace(field.Label)
		if label == "" {
			label = titleCase(name)
		}
		filterType := normalizeContentEntryFilterType(field.Type)
		if formField, ok := formFieldByName[name]; ok {
			if normalized := normalizeContentEntryFilterType(formField.Type); normalized != "" {
				filterType = normalized
			}
		}
		if filterType == "" {
			filterType = "text"
		}
		entry := map[string]any{
			"name":             name,
			"label":            label,
			"type":             filterType,
			"operators":        []string{"eq", "ilike", "in"},
			"default_operator": "ilike",
		}
		if options, ok := optionsByField[name]; ok && len(options) > 0 {
			entry["options"] = options
			entry["type"] = "select"
			entry["operators"] = []string{"eq", "in"}
			entry["default_operator"] = "eq"
		}
		out = append(out, entry)
	}
	return out
}

func contentEntryFilterOptions(options []admin.Option) []map[string]any {
	if len(options) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(options))
	for _, option := range options {
		label := strings.TrimSpace(option.Label)
		if label == "" {
			label = strings.TrimSpace(anyToString(option.Value))
		}
		out = append(out, map[string]any{
			"label": label,
			"value": option.Value,
		})
	}
	return out
}

func normalizeContentEntryFilterType(raw string) string {
	return admin.NormalizeFilterType(raw)
}

func detailFieldsForRecord(panel *admin.Panel, contentType *admin.CMSContentType, record map[string]any) []map[string]any {
	fields := []admin.Field{}
	if panel != nil {
		schema := panel.Schema()
		if len(schema.DetailFields) > 0 {
			fields = schema.DetailFields
		} else if len(schema.ListFields) > 0 {
			fields = schema.ListFields
		}
	}
	out := []map[string]any{}
	if len(fields) > 0 {
		for _, field := range fields {
			label := strings.TrimSpace(field.Label)
			if label == "" {
				label = titleCase(strings.TrimSpace(field.Name))
			}
			out = append(out, map[string]any{
				"label": label,
				"value": formatContentEntryDetailValue(record[field.Name], contentEntryDisplayKeys(field.Name, contentType)),
			})
		}
		return out
	}
	if record == nil {
		return out
	}
	keys := make([]string, 0, len(record))
	for key := range record {
		if key == "data" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		out = append(out, map[string]any{
			"label": titleCase(key),
			"value": formatContentEntryDetailValue(record[key], contentEntryDisplayKeys(key, contentType)),
		})
	}
	return out
}

func contentEntryDisplayKeys(fieldName string, contentType *admin.CMSContentType) []string {
	hints := contentEntryFieldUISchemaHints(contentType, fieldName)
	scopes := contentEntryHintScopes(hints)
	if len(scopes) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := []string{}
	for _, scope := range scopes {
		if key := strings.TrimSpace(anyToString(scope["display_key"])); key != "" {
			if _, exists := seen[key]; !exists {
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
		if key := strings.TrimSpace(anyToString(scope["displayKey"])); key != "" {
			if _, exists := seen[key]; !exists {
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
		for _, raw := range []any{scope["display_keys"], scope["displayKeys"]} {
			for _, key := range contentEntryStringList(raw) {
				if _, exists := seen[key]; exists {
					continue
				}
				seen[key] = struct{}{}
				out = append(out, key)
			}
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func formatContentEntryDetailValue(value any, displayKeys []string) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case []string:
		if len(typed) == 0 {
			return ""
		}
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if trimmed := strings.TrimSpace(item); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return strings.Join(out, ", ")
	case []any:
		if len(typed) == 0 {
			return ""
		}
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := strings.TrimSpace(formatContentEntryDetailValue(item, displayKeys)); text != "" {
				out = append(out, text)
			}
		}
		return strings.Join(out, ", ")
	case map[string]any:
		return summarizeContentEntryObject(typed, displayKeys)
	case map[string]string:
		converted := make(map[string]any, len(typed))
		for key, item := range typed {
			converted[key] = item
		}
		return summarizeContentEntryObject(converted, displayKeys)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	default:
		if encoded, err := json.Marshal(typed); err == nil {
			return string(encoded)
		}
		return anyToString(typed)
	}
}

func summarizeContentEntryObject(value map[string]any, displayKeys []string) string {
	if len(value) == 0 {
		return ""
	}
	candidates := make([]string, 0, len(displayKeys)+11)
	candidates = append(candidates, displayKeys...)
	candidates = append(candidates, "name", "label", "title", "slug", "id", "code", "key", "value", "type", "blockType", "block_type")
	seen := map[string]struct{}{}
	for _, key := range candidates {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		candidate, ok := contentEntryObjectValueByPath(value, key)
		if !ok {
			continue
		}
		if text := strings.TrimSpace(formatContentEntryDetailValue(candidate, nil)); text != "" {
			return text
		}
	}
	if encoded, err := json.Marshal(value); err == nil {
		return string(encoded)
	}
	return anyToString(value)
}

func contentEntryObjectValueByPath(value map[string]any, key string) (any, bool) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, false
	}
	if candidate, ok := value[key]; ok {
		return candidate, true
	}
	segments := strings.Split(key, ".")
	if len(segments) == 1 {
		return nil, false
	}
	var current any = value
	for idx, segment := range segments {
		typed, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		candidate, ok := typed[segment]
		if !ok {
			return nil, false
		}
		if idx == len(segments)-1 {
			return candidate, true
		}
		current = candidate
	}
	return nil, false
}

func contentTypeSchema(contentType *admin.CMSContentType, panel *admin.Panel) map[string]any {
	if contentType != nil && len(contentType.Schema) > 0 {
		schema := ensureContentEntryJSONSchema(cloneAnyMap(contentType.Schema))
		if contentEntrySchemaHasRenderableFields(schema) {
			return schema
		}
	}
	if panel != nil {
		if schema := panel.Schema().FormSchema; len(schema) > 0 {
			normalized := ensureContentEntryJSONSchema(cloneAnyMap(schema))
			if contentEntrySchemaHasRenderableFields(normalized) {
				return normalized
			}
		}
		if schema := schemaFromPanelFields(panel.Schema().FormFields); len(schema) > 0 {
			normalized := ensureContentEntryJSONSchema(schema)
			if contentEntrySchemaHasRenderableFields(normalized) {
				return normalized
			}
		}
	}
	return nil
}

func contentEntrySchemaHasRenderableFields(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	properties, ok := schema["properties"].(map[string]any)
	if !ok || len(properties) == 0 {
		return false
	}
	for key := range properties {
		if strings.TrimSpace(key) != "" {
			return true
		}
	}
	return false
}

func ensureContentEntryJSONSchema(schema map[string]any) map[string]any {
	if len(schema) == 0 {
		return nil
	}
	stripUnsupportedContentEntrySchemaKeywords(schema)
	if raw, ok := schema["$schema"]; ok {
		if strings.TrimSpace(anyToString(raw)) != "" {
			return schema
		}
	}
	schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
	return schema
}

func stripUnsupportedContentEntrySchemaKeywords(node any) {
	switch typed := node.(type) {
	case map[string]any:
		delete(typed, "readOnly")
		delete(typed, "read_only")
		for _, value := range typed {
			stripUnsupportedContentEntrySchemaKeywords(value)
		}
	case []any:
		for _, value := range typed {
			stripUnsupportedContentEntrySchemaKeywords(value)
		}
	}
}

func contentTypeUISchema(contentType *admin.CMSContentType) map[string]any {
	if contentType == nil {
		return nil
	}
	return cloneAnyMap(contentType.UISchema)
}

func contentTypeLabel(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return titleCase(panelSlug)
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
	}
	return titleCase(strings.TrimSpace(fallback))
}

func contentTypeSlug(contentType *admin.CMSContentType, fallback string) string {
	if contentType != nil {
		if panelSlug := contentTypePanelSlug(contentType); panelSlug != "" {
			return panelSlug
		}
		if val := strings.TrimSpace(contentType.Slug); val != "" {
			return val
		}
		if val := strings.TrimSpace(contentType.Name); val != "" {
			return val
		}
	}
	return strings.TrimSpace(fallback)
}

func contentTypePanelSlug(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return panelSlugFromCapabilities(contentType.Capabilities)
}

func contentTypeID(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.ID)
}

func contentTypeIcon(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Icon)
}

func contentTypeStatus(contentType *admin.CMSContentType) string {
	if contentType == nil {
		return ""
	}
	return strings.TrimSpace(contentType.Status)
}

func schemaFromPanelFields(fields []admin.Field) map[string]any {
	if len(fields) == 0 {
		return nil
	}
	properties := map[string]any{}
	required := []string{}
	for _, field := range fields {
		name := strings.TrimSpace(field.Name)
		if name == "" {
			continue
		}
		fieldSchema := map[string]any{
			"type": schemaTypeForField(field),
		}
		if label := strings.TrimSpace(field.Label); label != "" {
			fieldSchema["title"] = label
		}
		if enumValues := enumValuesFromField(field); len(enumValues) > 0 {
			fieldSchema["enum"] = enumValues
		}
		if fieldSchema["type"] == "array" {
			fieldSchema["items"] = map[string]any{"type": "string"}
		}
		properties[name] = fieldSchema
		if field.Required {
			required = append(required, name)
		}
	}
	if len(properties) == 0 {
		return nil
	}
	schema := map[string]any{
		"$schema":    "https://json-schema.org/draft/2020-12/schema",
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func schemaTypeForField(field admin.Field) string {
	switch strings.ToLower(strings.TrimSpace(field.Type)) {
	case "checkbox", "toggle", "switch", "boolean", "bool":
		return "boolean"
	case "integer", "int":
		return "integer"
	case "number", "float", "decimal", "currency":
		return "number"
	case "json", "jsonschema", "object":
		return "object"
	case "multiselect", "array", "list", "tags":
		return "array"
	default:
		return "string"
	}
}

func enumValuesFromField(field admin.Field) []any {
	if len(field.Options) == 0 {
		return nil
	}
	values := make([]any, 0, len(field.Options))
	for _, option := range field.Options {
		switch v := option.Value.(type) {
		case nil:
			continue
		case string:
			if strings.TrimSpace(v) == "" {
				continue
			}
			values = append(values, strings.TrimSpace(v))
		default:
			values = append(values, v)
		}
	}
	if len(values) == 0 {
		return nil
	}
	return values
}

func (h *contentEntryHandlers) renderTemplate(c router.Context, panelSlug string, fallbackTemplate string, viewCtx router.ViewContext) error {
	if c == nil {
		return admin.ErrNotFound
	}
	fallbackTemplate = strings.TrimSpace(fallbackTemplate)
	if fallbackTemplate == "" {
		return admin.ErrNotFound
	}
	customTemplate := contentEntryPanelTemplate(panelSlug, fallbackTemplate)
	if customTemplate == "" || customTemplate == fallbackTemplate {
		return c.Render(fallbackTemplate, viewCtx)
	}
	if h.templateExists != nil {
		if h.templateExists(customTemplate) {
			return c.Render(customTemplate, viewCtx)
		}
		return c.Render(fallbackTemplate, viewCtx)
	}
	if err := c.Render(customTemplate, viewCtx); err != nil {
		if !isTemplateResolutionError(err) {
			return err
		}
		return c.Render(fallbackTemplate, viewCtx)
	}
	return nil
}

func templateExistsFromFS(fsys ...fs.FS) templateExistsFunc {
	stack := make([]fs.FS, 0, len(fsys))
	for _, current := range fsys {
		if current == nil {
			continue
		}
		stack = append(stack, normalizeTemplatesFS(current))
	}
	merged := fallbackFSList(stack)
	if merged == nil {
		return nil
	}
	return func(name string) bool {
		candidates := templateLookupCandidates(name)
		for _, candidate := range candidates {
			info, err := fs.Stat(merged, candidate)
			if err != nil {
				continue
			}
			if !info.IsDir() {
				return true
			}
		}
		return false
	}
}

func templateLookupCandidates(name string) []string {
	normalized := normalizeTemplateLookupName(name)
	if normalized == "" {
		return nil
	}
	if path.Ext(normalized) != "" {
		return []string{normalized}
	}
	return []string{
		normalized,
		normalized + ".html",
	}
}

func normalizeTemplateLookupName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return ""
	}
	name = strings.TrimPrefix(name, "/")
	name = path.Clean(name)
	if name == "." {
		return ""
	}
	return name
}

func contentEntryPanelTemplate(panelSlug, fallbackTemplate string) string {
	fallbackTemplate = strings.TrimSpace(fallbackTemplate)
	panelSlug = normalizeContentEntryTemplateSlug(panelSlug)
	if fallbackTemplate == "" || panelSlug == "" {
		return fallbackTemplate
	}
	return path.Join("resources", panelSlug, path.Base(fallbackTemplate))
}

func normalizeContentEntryTemplateSlug(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if idx := strings.Index(raw, "@"); idx >= 0 {
		raw = raw[:idx]
	}
	raw = strings.ReplaceAll(raw, "_", "-")
	raw = strings.ReplaceAll(raw, ".", "-")
	return strings.Trim(raw, "- ")
}

func isTemplateResolutionError(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(strings.TrimSpace(err.Error()))
	if !strings.Contains(lower, "does not exist") {
		return false
	}
	return strings.Contains(lower, "template") ||
		strings.Contains(lower, "view") ||
		strings.Contains(lower, "layout")
}

func defaultLocaleValue(value string, fallback string) string {
	if strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	if strings.TrimSpace(fallback) != "" {
		return strings.TrimSpace(fallback)
	}
	return "en"
}
