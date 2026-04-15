package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// Schema returns a basic schema description.
func (p *Panel) Schema() Schema {
	formSchema := buildFormSchema(p.formFields)
	if len(p.formSchema) > 0 {
		formSchema = mergeFormSchemaWithFields(p.formSchema, p.formFields)
	}
	actions := normalizePanelActionsForSchema(p.actions, p.permissions, p.actionDefaultsMode)
	bulkActions := normalizeBulkActionsForSchema(p.bulkActions, p.permissions, p.actionDefaultsMode)
	return Schema{
		ListFields:   p.listFields,
		FormFields:   p.formFields,
		DetailFields: p.detailFields,
		Filters:      p.filters,
		Actions:      actions,
		BulkActions:  bulkActions,
		Subresources: p.Subresources(),
		Tabs:         append([]PanelTab{}, p.tabs...),
		FormSchema:   formSchema,
		UseBlocks:    p.useBlocks,
		UseSEO:       p.useSEO,
		TreeView:     p.treeView,
		Permissions:  p.permissions,
	}
}

// SchemaWithTheme attaches the resolved theme payload for UI renderers.
func (p *Panel) SchemaWithTheme(theme map[string]map[string]string) Schema {
	schema := p.Schema()
	if len(theme) > 0 {
		schema.Theme = theme
	}
	return schema
}

func normalizePanelActionsForSchema(actions []Action, perms PanelPermissions, defaultsMode PanelActionDefaultsMode) []Action {
	defaultsMode = normalizePanelActionDefaultsMode(defaultsMode)
	out := make([]Action, 0, len(actions)+3)
	if defaultsMode != PanelActionDefaultsModeNone && !hasActionNamed(actions, "view") {
		out = append(out, normalizeActionContract(Action{
			Name:       "view",
			Label:      "View",
			Type:       "navigation",
			Scope:      ActionScopeRow,
			Permission: strings.TrimSpace(perms.View),
			Variant:    "secondary",
			Icon:       "eye",
		}, ActionScopeRow))
	}
	if defaultsMode != PanelActionDefaultsModeNone && !hasActionNamed(actions, "edit") {
		out = append(out, normalizeActionContract(Action{
			Name:       "edit",
			Label:      "Edit",
			Type:       "navigation",
			Scope:      ActionScopeAny,
			Permission: strings.TrimSpace(perms.Edit),
			Variant:    "primary",
			Icon:       "edit",
		}, ActionScopeAny))
	}
	if defaultsMode == PanelActionDefaultsModeCRUD && !hasActionNamed(actions, "delete") {
		out = append(out, normalizeActionContract(Action{
			Name:       "delete",
			Label:      "Delete",
			Scope:      ActionScopeAny,
			Permission: strings.TrimSpace(perms.Delete),
			Variant:    "danger",
			Icon:       "trash",
			Confirm:    "Are you sure you want to delete this item?",
		}, ActionScopeAny))
	}
	for _, action := range actions {
		out = append(out, normalizeActionContract(action, ActionScopeRow))
	}
	return ensureActionOrderContract(out, 900)
}

func normalizeBulkActionsForSchema(actions []Action, perms PanelPermissions, defaultsMode PanelActionDefaultsMode) []Action {
	defaultsMode = normalizePanelActionDefaultsMode(defaultsMode)
	out := make([]Action, 0, len(actions)+1)
	if defaultsMode == PanelActionDefaultsModeCRUD &&
		!hasActionNamed(actions, "delete") &&
		!hasActionNamed(actions, "bulk_delete") {
		out = append(out, normalizeActionContract(Action{
			Name:       "delete",
			Label:      "Delete",
			Scope:      ActionScopeBulk,
			Permission: strings.TrimSpace(perms.Delete),
			Variant:    "danger",
			Icon:       "trash",
			Confirm:    "Delete {count} item(s)?",
		}, ActionScopeBulk))
	}
	for _, action := range actions {
		out = append(out, normalizeActionContract(action, ActionScopeBulk))
	}
	return ensureActionOrderContract(out, 1900)
}

func ensureActionOrderContract(actions []Action, fallbackStart int) []Action {
	if len(actions) == 0 {
		return nil
	}
	used := map[int]struct{}{}
	next := fallbackStart
	if next <= 0 {
		next = 1
	}
	for _, action := range actions {
		if action.Order <= 0 {
			continue
		}
		used[action.Order] = struct{}{}
	}
	for index := range actions {
		if actions[index].Order > 0 {
			continue
		}
		for {
			if _, exists := used[next]; exists {
				next++
				continue
			}
			actions[index].Order = next
			used[next] = struct{}{}
			next++
			break
		}
	}
	return actions
}

func normalizeActionContract(action Action, defaultScope ActionScope) Action {
	action.Name = strings.TrimSpace(action.Name)
	action.Label = strings.TrimSpace(action.Label)
	action.LabelKey = strings.TrimSpace(action.LabelKey)
	action.CommandName = strings.TrimSpace(action.CommandName)
	action.Permission = strings.TrimSpace(action.Permission)
	action.PermissionsAll = compactPermissions(action.PermissionsAll...)
	if action.Permission != "" && !containsActionField(action.PermissionsAll, action.Permission) {
		action.PermissionsAll = append(action.PermissionsAll, action.Permission)
	}
	action.Type = strings.TrimSpace(action.Type)
	action.Href = strings.TrimSpace(action.Href)
	action.Icon = strings.TrimSpace(action.Icon)
	action.Confirm = strings.TrimSpace(action.Confirm)
	action.Variant = strings.TrimSpace(action.Variant)
	action.IdempotencyField = strings.TrimSpace(action.IdempotencyField)
	action.Scope = normalizeActionScope(action.Scope, defaultScope)
	if action.Order <= 0 {
		action.Order = defaultActionOrder(action.Name)
	}
	action.ContextRequired = normalizeActionFieldList(action.ContextRequired)
	action.PayloadRequired = normalizeActionFieldList(action.PayloadRequired)
	if strings.EqualFold(action.Name, CreateTranslationKey) && !containsActionField(action.PayloadRequired, "locale") {
		action.PayloadRequired = append(action.PayloadRequired, "locale")
	}

	if action.Idempotent {
		field := actionIdempotencyField(action)
		if field != "" && !containsActionField(action.PayloadRequired, field) {
			action.PayloadRequired = append(action.PayloadRequired, field)
		}
	}
	if len(action.PayloadRequired) > 0 || len(action.PayloadSchema) > 0 {
		action.PayloadSchema = ensureActionPayloadSchemaContract(action.PayloadSchema, action.PayloadRequired)
	}
	if strings.EqualFold(action.Name, CreateTranslationKey) {
		action.PayloadSchema = ensureCreateTranslationPayloadSchemaContract(action.PayloadSchema)
	}
	return action
}

func normalizeActionScope(scope ActionScope, fallback ActionScope) ActionScope {
	normalized := strings.ToLower(strings.TrimSpace(string(scope)))
	switch ActionScope(normalized) {
	case ActionScopeAny, ActionScopeRow, ActionScopeDetail, ActionScopeBulk:
		return ActionScope(normalized)
	}
	if strings.TrimSpace(string(fallback)) == "" {
		return ActionScopeAny
	}
	return fallback
}

func normalizeActionFieldList(fields []string) []string {
	if len(fields) == 0 {
		return nil
	}
	out := make([]string, 0, len(fields))
	seen := map[string]struct{}{}
	for _, field := range fields {
		normalized := canonicalActionPayloadFieldName(field)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func ensureActionPayloadSchemaContract(schema map[string]any, required []string) map[string]any {
	out := normalizeActionPayloadSchema(schema)
	if out == nil {
		out = map[string]any{}
	}

	required = normalizeActionFieldList(required)
	if existingType, ok := out["type"].(string); !ok || strings.TrimSpace(existingType) == "" {
		out["type"] = "object"
	}

	props, ok := out["properties"].(map[string]any)
	if !ok || props == nil {
		props = map[string]any{}
	}
	out["properties"] = props

	requiredSet := map[string]struct{}{}
	requiredOut := []string{}
	appendRequired := func(field string) {
		normalized := canonicalActionPayloadFieldName(field)
		if normalized == "" {
			return
		}
		if _, ok := requiredSet[normalized]; ok {
			return
		}
		requiredSet[normalized] = struct{}{}
		requiredOut = append(requiredOut, normalized)
	}
	switch existing := out["required"].(type) {
	case []string:
		for _, field := range existing {
			appendRequired(field)
		}
	case []any:
		for _, field := range existing {
			appendRequired(strings.TrimSpace(toString(field)))
		}
	}
	for _, field := range required {
		appendRequired(field)
	}

	for _, field := range requiredOut {
		prop, ok := props[field].(map[string]any)
		if !ok || prop == nil {
			prop = map[string]any{}
		}
		if _, ok := prop["type"].(string); !ok {
			prop["type"] = "string"
		}
		if _, ok := prop["title"].(string); !ok {
			prop["title"] = actionFieldTitle(field)
		}
		props[field] = prop
	}

	if len(requiredOut) > 0 {
		out["required"] = requiredOut
	}
	return out
}

func actionFieldTitle(name string) string {
	parts := strings.Fields(strings.ReplaceAll(strings.TrimSpace(name), "_", " "))
	if len(parts) == 0 {
		return ""
	}
	for i, part := range parts {
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		parts[i] = strings.ToUpper(lower[:1]) + lower[1:]
	}
	return strings.Join(parts, " ")
}

func hasActionNamed(actions []Action, name string) bool {
	target := strings.ToLower(strings.TrimSpace(name))
	if target == "" {
		return false
	}
	for _, action := range actions {
		if strings.ToLower(strings.TrimSpace(action.Name)) == target {
			return true
		}
	}
	return false
}

func containsActionField(fields []string, field string) bool {
	target := canonicalActionPayloadFieldName(field)
	if target == "" {
		return false
	}
	for _, candidate := range fields {
		if canonicalActionPayloadFieldName(candidate) == target {
			return true
		}
	}
	return false
}

func actionIdempotencyField(action Action) string {
	if field := strings.TrimSpace(action.IdempotencyField); field != "" {
		return canonicalActionPayloadFieldName(field)
	}
	return "idempotency_key"
}

func actionRequiredPermissions(action Action) []string {
	return compactPermissions(action.PermissionsAll...)
}

func defaultActionOrder(name string) int {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "edit":
		return 10
	case "view":
		return 11
	case "view_family":
		return 12
	case CreateTranslationKey:
		return 20
	case "request_approval", "submit_for_approval", "submit_review":
		return 30
	case "approve":
		return 35
	case "reject":
		return 36
	case "publish":
		return 40
	case "unpublish":
		return 50
	case "archive":
		return 60
	case "restore":
		return 61
	case "duplicate":
		return 70
	case "schedule":
		return 80
	case "delete":
		return 1000
	default:
		return 0
	}
}

func ensureCreateTranslationPayloadSchemaContract(schema map[string]any) map[string]any {
	out := primitives.CloneAnyMap(schema)
	if out == nil {
		out = map[string]any{}
	}
	out["type"] = "object"
	out["additionalProperties"] = false
	required := ensureActionPayloadRequiredFields(out["required"], "locale")
	if len(required) > 0 {
		out["required"] = required
	}
	props, _ := out["properties"].(map[string]any)
	if props == nil {
		props = map[string]any{}
	}
	localeProp, _ := props["locale"].(map[string]any)
	if localeProp == nil {
		localeProp = map[string]any{}
	}
	if _, ok := localeProp["type"].(string); !ok {
		localeProp["type"] = "string"
	}
	if _, ok := localeProp["title"].(string); !ok {
		localeProp["title"] = "Locale"
	}
	props["locale"] = localeProp
	if _, exists := props["path"]; !exists {
		props["path"] = map[string]any{
			"type":  "string",
			"title": "Path",
		}
	}
	if _, exists := props["route_key"]; !exists {
		props["route_key"] = map[string]any{
			"type":     "string",
			"title":    "Route Key",
			"x-hidden": true,
		}
	}
	delete(props, "available_locales")

	requiredForPublishDefault := actionSchemaLocaleEnum(localeProp["enum"])
	props["missing_locales"] = createTranslationLocaleArraySchema("Missing Locales", nil)
	props["existing_locales"] = createTranslationLocaleArraySchema("Existing Locales", nil)
	props["recommended_locale"] = map[string]any{
		"type":  "string",
		"title": "Recommended Locale",
	}
	props["required_for_publish"] = createTranslationLocaleArraySchema("Required for Publish", requiredForPublishDefault)
	out["properties"] = props

	out["x-translation-context"] = map[string]any{
		"missing_locales":      "translation_readiness.missing_required_locales",
		"existing_locales":     "translation_readiness.available_locales",
		"recommended_locale":   "translation_readiness.recommended_locale",
		"required_for_publish": "translation_readiness.required_locales",
	}
	return out
}

func createTranslationLocaleArraySchema(title string, defaultLocales []string) map[string]any {
	schema := map[string]any{
		"type":  "array",
		"title": strings.TrimSpace(title),
		"items": map[string]any{
			"type": "string",
		},
	}
	if len(defaultLocales) > 0 {
		schema["default"] = append([]string{}, defaultLocales...)
	}
	return schema
}

func ensureActionPayloadRequiredFields(raw any, fields ...string) []string {
	out := []string{}
	seen := map[string]struct{}{}
	appendField := func(field string) {
		normalized := canonicalActionPayloadFieldName(field)
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		out = append(out, normalized)
	}
	switch typed := raw.(type) {
	case []string:
		for _, field := range typed {
			appendField(field)
		}
	case []any:
		for _, field := range typed {
			appendField(toString(field))
		}
	}
	for _, field := range fields {
		appendField(field)
	}
	return out
}

func actionSchemaLocaleEnum(raw any) []string {
	values := []string{}
	seen := map[string]struct{}{}
	appendLocale := func(locale string) {
		normalized := strings.ToLower(strings.TrimSpace(locale))
		if normalized == "" {
			return
		}
		if _, ok := seen[normalized]; ok {
			return
		}
		seen[normalized] = struct{}{}
		values = append(values, normalized)
	}
	switch typed := raw.(type) {
	case []string:
		for _, locale := range typed {
			appendLocale(locale)
		}
	case []any:
		for _, locale := range typed {
			appendLocale(toString(locale))
		}
	}
	if len(values) == 0 {
		return nil
	}
	return values
}

func filterActionsForScope(actions []Action, scope ActionScope) []Action {
	if len(actions) == 0 {
		return nil
	}
	target := normalizeActionScope(scope, ActionScopeAny)
	out := make([]Action, 0, len(actions))
	for _, action := range actions {
		actionScope := normalizeActionScope(action.Scope, ActionScopeAny)
		if actionScope == ActionScopeAny || actionScope == target {
			out = append(out, action)
		}
	}
	return out
}

func buildFormSchema(fields []Field) map[string]any {
	schema := map[string]any{
		"type":       "object",
		"properties": map[string]any{},
	}
	required := []string{}
	props := schema["properties"].(map[string]any)
	for _, f := range fields {
		prop := formFieldSchemaProperty(f)
		props[f.Name] = prop
		if f.Required {
			required = append(required, f.Name)
		}
	}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func mergeFormSchemaWithFields(schema map[string]any, fields []Field) map[string]any {
	out := primitives.CloneAnyMap(schema)
	if out == nil {
		return buildFormSchema(fields)
	}
	if existingType, ok := out["type"].(string); !ok || strings.TrimSpace(existingType) == "" {
		out["type"] = "object"
	}
	props, _ := out["properties"].(map[string]any)
	if props == nil {
		props = map[string]any{}
		out["properties"] = props
	}
	required := ensureActionPayloadRequiredFields(out["required"])
	for _, field := range fields {
		prop, _ := props[field.Name].(map[string]any)
		if prop == nil {
			prop = formFieldSchemaProperty(field)
		} else {
			mergeFormFieldSchemaProperty(prop, field)
		}
		props[field.Name] = prop
		if field.Required {
			required = ensureActionPayloadRequiredFields(required, field.Name)
		}
	}
	if len(required) > 0 {
		out["required"] = required
	}
	return out
}

func formFieldSchemaProperty(f Field) map[string]any {
	prop := map[string]any{
		"type":         mapFieldType(f.Type),
		"title":        f.Label,
		"readOnly":     f.ReadOnly,
		"read_only":    f.ReadOnly,
		"x-hidden":     f.Hidden,
		"x-options":    f.Options,
		"x-validation": f.Validation,
	}
	if widget := mapWidget(f.Type); widget != "" {
		prop["x-formgen:widget"] = widget
	}
	if f.Validation != "" {
		prop["x-validation-source"] = "panel"
	}
	return prop
}

func mergeFormFieldSchemaProperty(prop map[string]any, field Field) {
	if prop == nil {
		return
	}
	if existingType, ok := prop["type"].(string); !ok || strings.TrimSpace(existingType) == "" {
		prop["type"] = mapFieldType(field.Type)
	}
	if existingTitle, ok := prop["title"].(string); !ok || strings.TrimSpace(existingTitle) == "" {
		prop["title"] = field.Label
	}
	if _, ok := prop["readOnly"]; !ok && field.ReadOnly {
		prop["readOnly"] = true
	}
	if _, ok := prop["read_only"]; !ok && field.ReadOnly {
		prop["read_only"] = true
	}
	if _, ok := prop["x-hidden"]; !ok && field.Hidden {
		prop["x-hidden"] = true
	}
	if _, ok := prop["x-options"]; !ok && len(field.Options) > 0 {
		prop["x-options"] = field.Options
	}
	if _, ok := prop["x-validation"]; !ok && field.Validation != "" {
		prop["x-validation"] = field.Validation
	}
	if _, ok := prop["x-validation-source"]; !ok && field.Validation != "" {
		prop["x-validation-source"] = "panel"
	}
	if _, ok := prop["x-formgen:widget"]; !ok {
		if widget := mapWidget(field.Type); widget != "" {
			prop["x-formgen:widget"] = widget
		}
	}
}

func mapFieldType(t string) string {
	switch t {
	case "number", "integer":
		return "number"
	case "boolean":
		return "boolean"
	case "array", "blocks", "block", "repeater", "block-library-picker", "block-library":
		return "array"
	case "object", "json":
		return "object"
	default:
		return "string"
	}
}

func mapWidget(t string) string {
	switch t {
	case "textarea":
		return "textarea"
	case "jsonschema", "json_schema", "schema":
		return "schema-editor"
	case "media", "media_picker":
		return "media-picker"
	case "block", "blocks":
		return "block"
	case "block-library-picker", "block-library":
		return "block-library-picker"
	default:
		return ""
	}
}

func applyMediaHints(schema *Schema, media *MediaConfig) {
	if schema == nil || schema.FormSchema == nil || media == nil || strings.TrimSpace(media.LibraryPath) == "" {
		return
	}
	props, ok := schema.FormSchema["properties"].(map[string]any)
	if !ok {
		return
	}
	for _, field := range schema.FormFields {
		if field.Type != "media" && field.Type != "media_picker" {
			continue
		}
		prop, ok := props[field.Name].(map[string]any)
		if !ok {
			continue
		}
		if _, ok := prop["x-formgen:widget"]; !ok {
			prop["x-formgen:widget"] = "media-picker"
		}
		valueMode := applyFormgenMediaHints(prop, media)
		applyAdminMediaHints(prop, media, valueMode)
	}
}

func applyFormgenMediaHints(prop map[string]any, media *MediaConfig) string {
	formgenMeta, _ := prop["x-formgen"].(map[string]any)
	if formgenMeta == nil {
		formgenMeta = map[string]any{}
	}
	if strings.TrimSpace(toString(formgenMeta["widget"])) == "" {
		formgenMeta["widget"] = "media-picker"
	}
	componentOptions, _ := formgenMeta["componentOptions"].(map[string]any)
	if componentOptions == nil {
		componentOptions = map[string]any{}
	}
	componentOptions["variant"] = "media-picker"
	componentOptions["libraryPath"] = media.LibraryPath
	componentOptions["itemEndpoint"] = media.ItemPath
	componentOptions["resolveEndpoint"] = media.ResolvePath
	componentOptions["uploadEndpoint"] = media.UploadPath
	componentOptions["presignEndpoint"] = media.PresignPath
	componentOptions["confirmEndpoint"] = media.ConfirmPath
	componentOptions["capabilitiesEndpoint"] = media.CapabilitiesPath
	componentOptions["valueMode"] = string(resolveMediaFieldValueMode(componentOptions, prop, media))
	if propType := strings.ToLower(strings.TrimSpace(toString(prop["type"]))); propType == "array" {
		componentOptions["multiple"] = true
	}
	formgenMeta["componentOptions"] = componentOptions
	prop["x-formgen"] = formgenMeta
	return toString(componentOptions["valueMode"])
}

func applyAdminMediaHints(prop map[string]any, media *MediaConfig, valueMode string) {
	adminMeta, _ := prop["x-admin"].(map[string]any)
	if adminMeta == nil {
		adminMeta = map[string]any{}
	}
	adminMeta["media_library_path"] = media.LibraryPath
	adminMeta["media_item_path"] = media.ItemPath
	adminMeta["media_resolve_path"] = media.ResolvePath
	adminMeta["media_upload_path"] = media.UploadPath
	adminMeta["media_presign_path"] = media.PresignPath
	adminMeta["media_confirm_path"] = media.ConfirmPath
	adminMeta["media_capabilities_path"] = media.CapabilitiesPath
	mediaMeta, _ := adminMeta["media"].(map[string]any)
	if mediaMeta == nil {
		mediaMeta = map[string]any{}
	}
	mediaMeta["libraryPath"] = media.LibraryPath
	mediaMeta["itemPath"] = media.ItemPath
	mediaMeta["resolvePath"] = media.ResolvePath
	mediaMeta["uploadPath"] = media.UploadPath
	mediaMeta["presignPath"] = media.PresignPath
	mediaMeta["confirmPath"] = media.ConfirmPath
	mediaMeta["capabilitiesPath"] = media.CapabilitiesPath
	mediaMeta["valueMode"] = valueMode
	adminMeta["media"] = mediaMeta
	prop["x-admin"] = adminMeta
}

func resolveMediaFieldValueMode(componentOptions map[string]any, prop map[string]any, media *MediaConfig) MediaValueMode {
	defaultMode := MediaValueModeURL
	if media != nil && media.DefaultValueMode != "" {
		defaultMode = media.DefaultValueMode
	}
	candidates := []string{
		toString(componentOptions["valueMode"]),
		toString(componentOptions["value_mode"]),
	}
	if adminMeta, ok := prop["x-admin"].(map[string]any); ok {
		if mediaMeta, ok := adminMeta["media"].(map[string]any); ok {
			candidates = append(candidates, toString(mediaMeta["valueMode"]), toString(mediaMeta["value_mode"]))
		}
		candidates = append(candidates, toString(adminMeta["media_value_mode"]))
	}
	for _, candidate := range candidates {
		switch normalizeMediaValueMode(candidate) {
		case MediaValueModeID:
			if media != nil && strings.TrimSpace(media.ItemPath) != "" {
				return MediaValueModeID
			}
		case MediaValueModeURL:
			if media == nil || strings.TrimSpace(media.ResolvePath) != "" || strings.TrimSpace(media.LibraryPath) != "" {
				return MediaValueModeURL
			}
		}
	}
	return defaultMode
}

func normalizeMediaValueMode(raw string) MediaValueMode {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(MediaValueModeID):
		return MediaValueModeID
	case string(MediaValueModeURL):
		return MediaValueModeURL
	default:
		return ""
	}
}
