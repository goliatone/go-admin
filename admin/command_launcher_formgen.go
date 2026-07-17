package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"sync"

	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-formgen/pkg/orchestrator"
	"github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla"
)

const commandLauncherOptionEndpointScheme = "command-options://"

type commandLauncherFormgenSchema struct {
	RawJSONSchema []byte
	OperationID   string
	NoInput       bool
	Sensitive     bool
}

type commandLauncherFormgenRenderer struct {
	orchestrator *orchestrator.Orchestrator
}

var (
	commandLauncherFormgenRendererOnce sync.Once
	commandLauncherFormgenRendererInst *commandLauncherFormgenRenderer
	commandLauncherFormgenRendererErr  error
)

func sharedCommandLauncherFormgenRenderer() (*commandLauncherFormgenRenderer, error) {
	commandLauncherFormgenRendererOnce.Do(func() {
		renderer, err := vanilla.New()
		if err != nil {
			commandLauncherFormgenRendererErr = err
			return
		}
		commandLauncherFormgenRendererInst = &commandLauncherFormgenRenderer{orchestrator: orchestrator.New(
			orchestrator.WithRenderer(renderer),
			orchestrator.WithDefaultRenderer(renderer.Name()),
		)}
	})
	return commandLauncherFormgenRendererInst, commandLauncherFormgenRendererErr
}

func (renderer *commandLauncherFormgenRenderer) render(ctx context.Context, schema commandLauncherFormgenSchema) ([]byte, error) {
	if renderer == nil || renderer.orchestrator == nil {
		return nil, fmt.Errorf("command launcher formgen: renderer is unavailable")
	}
	return renderer.orchestrator.Generate(ctx, orchestrator.Request{
		RawJSONSchema: schema.RawJSONSchema,
		OperationID:   schema.OperationID,
		Renderer:      "vanilla",
		RenderOptions: render.RenderOptions{
			RenderMode: render.RenderModeFields,
			OmitAssets: true,
		},
	})
}

// adaptCommandLauncherFormgenSchema combines the renderer-neutral command
// descriptor sources into the canonical JSON Schema consumed by go-formgen.
// Explicit JSON Schema owns validation and data-shape conflicts; ordered field
// declarations supplement missing shape and add presentation metadata.
func adaptCommandLauncherFormgenSchema(descriptor gocommand.CommandDescriptor) (commandLauncherFormgenSchema, []CommandLauncherDiagnostic, error) {
	descriptor = normalizeCommandLauncherDescriptor(descriptor)
	schemaID := commandLauncherActionID(descriptor.ID)
	if descriptor.Input.NoInput {
		raw, err := json.Marshal(map[string]any{"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": schemaID, "type": "object", "properties": map[string]any{}})
		return commandLauncherFormgenSchema{RawJSONSchema: raw, OperationID: schemaID + ".edit", NoInput: true}, nil, err
	}

	root, schemaID, sectionByPath, diagnostics, err := prepareCommandLauncherFormgenRoot(descriptor, schemaID)
	if err != nil || len(diagnostics) > 0 {
		return commandLauncherFormgenSchema{}, diagnostics, err
	}
	diagnostics = mergeCommandLauncherFormgenFields(root, descriptor, sectionByPath)

	raw, err := json.Marshal(root)
	if err != nil {
		return commandLauncherFormgenSchema{}, diagnostics, fmt.Errorf("command launcher formgen: encode JSON Schema: %w", err)
	}
	return commandLauncherFormgenSchema{
		RawJSONSchema: raw,
		OperationID:   schemaID + ".edit",
		Sensitive:     commandLauncherFormgenSchemaHasSensitiveField(root),
	}, diagnostics, nil
}

func prepareCommandLauncherFormgenRoot(descriptor gocommand.CommandDescriptor, schemaID string) (map[string]any, string, map[string]string, []CommandLauncherDiagnostic, error) {
	root, err := cloneCommandLauncherSchema(descriptor.Input.JSONSchema)
	if err != nil {
		return nil, "", nil, nil, fmt.Errorf("command launcher formgen: clone JSON Schema: %w", err)
	}
	if root == nil {
		root = map[string]any{}
	}
	if path, conflict := validateCommandLauncherAuthoredSchema(root); conflict != "" {
		return nil, "", nil, []CommandLauncherDiagnostic{
			commandLauncherFormgenConflictDiagnostic(descriptor.ID, path, conflict),
		}, nil
	}
	if schemaType := commandLauncherSchemaString(root["type"]); schemaType != "" && schemaType != "object" {
		return nil, "", nil, []CommandLauncherDiagnostic{
			commandLauncherFormgenConflictDiagnostic(descriptor.ID, "", "command schema root must be an object"),
		}, nil
	}
	root["type"] = "object"
	setCommandLauncherFormgenRootDefaults(root, descriptor, &schemaID)
	if commandLauncherSchemaObject(root["properties"]) == nil {
		if root["properties"] != nil {
			return nil, "", nil, []CommandLauncherDiagnostic{
				commandLauncherFormgenConflictDiagnostic(descriptor.ID, "", "command schema properties must be an object"),
			}, nil
		}
		root["properties"] = map[string]any{}
	}
	sectionByPath, sections := commandLauncherFormgenSections(descriptor.Input.Fields)
	if len(sections) > 0 {
		formgen := commandLauncherSchemaObject(root["x-formgen"])
		if formgen == nil {
			formgen = map[string]any{}
			root["x-formgen"] = formgen
		}
		setMissingCommandLauncherSchemaValue(formgen, "layout.sections", sections)
	}
	return root, schemaID, sectionByPath, nil, nil
}

func setCommandLauncherFormgenRootDefaults(root map[string]any, descriptor gocommand.CommandDescriptor, schemaID *string) {
	if _, exists := root["$schema"]; !exists {
		root["$schema"] = "https://json-schema.org/draft/2020-12/schema"
	}
	if authoredID := strings.TrimSpace(commandLauncherSchemaString(root["$id"])); authoredID != "" {
		*schemaID = authoredID
	} else {
		root["$id"] = *schemaID
	}
	if title := commandLauncherLabel(descriptor); title != "" {
		if _, exists := root["title"]; !exists {
			root["title"] = title
		}
	}
}

func mergeCommandLauncherFormgenFields(root map[string]any, descriptor gocommand.CommandDescriptor, sectionByPath map[string]string) []CommandLauncherDiagnostic {
	diagnostics := make([]CommandLauncherDiagnostic, 0)
	for index, field := range descriptor.Input.Fields {
		path := commandLauncherFormgenFieldPath(field)
		if path == "" {
			diagnostics = append(diagnostics, commandLauncherFormgenConflictDiagnostic(descriptor.ID, "", "command field is missing a path"))
			continue
		}
		property, parent, leaf, conflict := ensureCommandLauncherSchemaProperty(root, path)
		if conflict != "" {
			diagnostics = append(diagnostics, commandLauncherFormgenConflictDiagnostic(descriptor.ID, path, conflict))
			continue
		}
		mergeCommandLauncherFieldShape(property, field)
		sectionID := sectionByPath[path]
		mergeCommandLauncherFieldPresentation(property, descriptor.ID, path, sectionID, index, field)
		if sectionID != "" {
			if conflict := assignCommandLauncherTopLevelSection(root, path, sectionID); conflict != "" {
				diagnostics = append(diagnostics, commandLauncherFormgenConflictDiagnostic(descriptor.ID, path, conflict))
			}
		}
		if field.Required {
			appendCommandLauncherSchemaRequired(parent, leaf)
		}
	}
	for _, path := range descriptor.Input.Required {
		path = strings.TrimSpace(path)
		if path == "" {
			continue
		}
		_, parent, leaf, conflict := ensureCommandLauncherSchemaProperty(root, path)
		if conflict != "" {
			diagnostics = append(diagnostics, commandLauncherFormgenConflictDiagnostic(descriptor.ID, path, conflict))
			continue
		}
		appendCommandLauncherSchemaRequired(parent, leaf)
	}
	return diagnostics
}

func commandLauncherFormgenSchemaHasSensitiveField(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		if format := commandLauncherSchemaString(typed["format"]); strings.EqualFold(strings.TrimSpace(format), "password") {
			return true
		}
		for _, key := range []string{
			"x-formgen.sensitive", "x-formgen.secret", "x-admin.secret",
			"x-formgen-sensitive", "x-formgen-secret", "x-admin-secret", "cli.secret",
		} {
			if marked, ok := commandLauncherPresentationBool(typed[key]); ok && marked {
				return true
			}
		}
		for namespace, keys := range map[string][]string{
			"x-formgen": {"sensitive", "secret"},
			"x-admin":   {"secret"},
		} {
			nested := commandLauncherSchemaObject(typed[namespace])
			for _, key := range keys {
				if marked, ok := commandLauncherPresentationBool(nested[key]); ok && marked {
					return true
				}
			}
		}
		for _, child := range typed {
			if commandLauncherFormgenSchemaHasSensitiveField(child) {
				return true
			}
		}
	case []any:
		if slices.ContainsFunc(typed, commandLauncherFormgenSchemaHasSensitiveField) {
			return true
		}
	}
	return false
}

func cloneCommandLauncherSchema(input map[string]any) (map[string]any, error) {
	if len(input) == 0 {
		return nil, nil
	}
	raw, err := json.Marshal(input)
	if err != nil {
		return nil, err
	}
	var output map[string]any
	if err := json.Unmarshal(raw, &output); err != nil {
		return nil, err
	}
	return output, nil
}

func commandLauncherFormgenFieldPath(field gocommand.CommandInputField) string {
	return firstNonEmptyString(strings.TrimSpace(field.Path), strings.TrimSpace(field.Name), strings.TrimSpace(field.ID))
}

func ensureCommandLauncherSchemaProperty(root map[string]any, path string) (map[string]any, map[string]any, string, string) {
	segments, conflict := commandLauncherFormgenPathSegments(path)
	if conflict != "" {
		return nil, nil, "", conflict
	}

	current := root
	for index, segment := range segments {
		properties, ok := current["properties"].(map[string]any)
		if !ok {
			return nil, nil, "", "field path traverses a non-object schema"
		}
		property, exists := properties[segment].(map[string]any)
		if !exists {
			property = map[string]any{}
			properties[segment] = property
		}
		if index == len(segments)-1 {
			return property, current, segment, ""
		}
		if propertyType := commandLauncherSchemaString(property["type"]); propertyType != "" && propertyType != "object" {
			return nil, nil, "", "field path traverses an explicitly non-object property"
		}
		property["type"] = "object"
		if _, ok := property["properties"].(map[string]any); !ok {
			if property["properties"] != nil {
				return nil, nil, "", "field path traverses invalid object properties"
			}
			property["properties"] = map[string]any{}
		}
		current = property
	}
	return nil, nil, "", "field path is empty"
}

func commandLauncherFormgenPathSegments(path string) ([]string, string) {
	rawSegments := strings.Split(path, ".")
	segments := make([]string, 0, len(rawSegments))
	for _, rawSegment := range rawSegments {
		segment := strings.TrimSpace(rawSegment)
		if segment == "" || strings.ContainsAny(segment, "[]") {
			return nil, "field path contains an unsupported segment"
		}
		if commandLauncherUnsafePropertySegment(segment) {
			return nil, "field path contains an unsafe property segment"
		}
		segments = append(segments, segment)
	}
	return segments, ""
}

func validateCommandLauncherAuthoredSchema(root map[string]any) (string, string) {
	return validateCommandLauncherAuthoredSchemaNode(root, nil)
}

func validateCommandLauncherAuthoredSchemaNode(node map[string]any, propertyPath []string) (string, string) {
	if conflictPath, conflict := validateCommandLauncherAuthoredProperties(node, propertyPath); conflict != "" {
		return conflictPath, conflict
	}
	if conflictPath, conflict := validateCommandLauncherAuthoredDirectChildren(node, propertyPath); conflict != "" {
		return conflictPath, conflict
	}
	if conflictPath, conflict := validateCommandLauncherAuthoredBranches(node, propertyPath); conflict != "" {
		return conflictPath, conflict
	}
	return validateCommandLauncherAuthoredDefinitions(node, propertyPath)
}

func validateCommandLauncherAuthoredProperties(node map[string]any, propertyPath []string) (string, string) {
	if properties, ok := node["properties"].(map[string]any); ok {
		names := make([]string, 0, len(properties))
		for name := range properties {
			names = append(names, name)
		}
		slices.Sort(names)
		for _, name := range names {
			path := appendCommandLauncherSchemaPath(propertyPath, name)
			if _, conflict := commandLauncherFormgenPathSegments(name); conflict != "" {
				return strings.Join(path, "."), conflict
			}
			if child, ok := properties[name].(map[string]any); ok {
				if conflictPath, conflict := validateCommandLauncherAuthoredSchemaNode(child, path); conflict != "" {
					return conflictPath, conflict
				}
			}
		}
	}
	return "", ""
}

func validateCommandLauncherAuthoredDirectChildren(node map[string]any, propertyPath []string) (string, string) {
	for _, keyword := range []string{"items", "contains", "additionalProperties", "propertyNames", "if", "then", "else", "not", "unevaluatedProperties", "contentSchema"} {
		if child, ok := node[keyword].(map[string]any); ok {
			if conflictPath, conflict := validateCommandLauncherAuthoredSchemaNode(child, propertyPath); conflict != "" {
				return conflictPath, conflict
			}
		}
	}
	return "", ""
}

func validateCommandLauncherAuthoredBranches(node map[string]any, propertyPath []string) (string, string) {
	for _, keyword := range []string{"allOf", "anyOf", "oneOf", "prefixItems"} {
		children := commandLauncherSchemaArray(node[keyword])
		for _, value := range children {
			if child, ok := value.(map[string]any); ok {
				if conflictPath, conflict := validateCommandLauncherAuthoredSchemaNode(child, propertyPath); conflict != "" {
					return conflictPath, conflict
				}
			}
		}
	}
	return "", ""
}

func validateCommandLauncherAuthoredDefinitions(node map[string]any, propertyPath []string) (string, string) {
	for _, keyword := range []string{"$defs", "definitions", "dependentSchemas"} {
		children := commandLauncherSchemaObject(node[keyword])
		names := make([]string, 0, len(children))
		for name := range children {
			names = append(names, name)
		}
		slices.Sort(names)
		for _, name := range names {
			if child, ok := children[name].(map[string]any); ok {
				if conflictPath, conflict := validateCommandLauncherAuthoredSchemaNode(child, propertyPath); conflict != "" {
					return conflictPath, conflict
				}
			}
		}
	}
	return "", ""
}

func appendCommandLauncherSchemaPath(path []string, segment string) []string {
	output := make([]string, len(path), len(path)+1)
	copy(output, path)
	return append(output, segment)
}

func commandLauncherUnsafePropertySegment(segment string) bool {
	switch segment {
	case "__proto__", "constructor", "prototype":
		return true
	default:
		return false
	}
}

func mergeCommandLauncherFieldShape(property map[string]any, field gocommand.CommandInputField) {
	if _, exists := property["type"]; !exists {
		property["type"] = commandLauncherFormgenJSONType(field)
	}
	if format := strings.TrimSpace(field.Format); format != "" {
		if _, exists := property["format"]; !exists {
			property["format"] = format
		}
	}
	if description := strings.TrimSpace(field.Description); description != "" {
		if _, exists := property["description"]; !exists {
			property["description"] = description
		}
	}
	if field.Default != nil && !field.Sensitive {
		if _, exists := property["default"]; !exists {
			if safe := commandLauncherJSONSafeValue(field.Default); safe != nil {
				property["default"] = safe
			}
		}
	}
	for key, value := range commandLauncherJSONSafeMap(field.Validation) {
		if _, exists := property[key]; !exists {
			property[key] = value
		}
	}
	if property["type"] == "array" {
		if _, exists := property["items"]; !exists {
			property["items"] = map[string]any{"type": "string"}
		}
	}
}

func commandLauncherFormgenJSONType(field gocommand.CommandInputField) string {
	if fieldType := strings.ToLower(strings.TrimSpace(field.Type)); fieldType != "" {
		switch fieldType {
		case "string", "integer", "number", "boolean", "array", "object":
			return fieldType
		case "bool":
			return "boolean"
		case "list", "string_list":
			return "array"
		default:
			return "string"
		}
	}
	switch strings.ToLower(strings.TrimSpace(field.Kind)) {
	case "boolean", "toggle", "checkbox":
		return "boolean"
	case "integer":
		return "integer"
	case "number":
		return "number"
	case "array", "list", "string_list", "chips", "multi_select":
		return "array"
	case "object", "json":
		return "object"
	default:
		return "string"
	}
}

func mergeCommandLauncherFieldPresentation(property map[string]any, commandID, path, sectionID string, index int, field gocommand.CommandInputField) {
	formgen := commandLauncherSchemaObject(property["x-formgen"])
	if formgen == nil {
		formgen = map[string]any{}
		property["x-formgen"] = formgen
	}
	setMissingCommandLauncherSchemaValue(formgen, "order", index+1)
	setMissingCommandLauncherSchemaValue(formgen, "label", strings.TrimSpace(field.Label))
	setMissingCommandLauncherSchemaValue(formgen, "placeholder", strings.TrimSpace(field.Placeholder))
	setMissingCommandLauncherSchemaValue(formgen, "helpText", firstNonEmptyString(strings.TrimSpace(field.Help), strings.TrimSpace(field.Description)))
	mergeCommandLauncherFormgenGrid(formgen, commandLauncherFormgenCompactField(field))
	if field.Sensitive {
		property["x-formgen-sensitive"] = true
		delete(property, "default")
	}
	if section := commandLauncherPresentationString(field.DisplayHints["section"]); section != "" {
		setMissingCommandLauncherSchemaValue(formgen, "section", section)
	}
	if sectionID != "" {
		setMissingCommandLauncherSchemaValue(formgen, "layout.section", sectionID)
	}
	if advanced, ok := commandLauncherPresentationBool(field.DisplayHints["advanced"]); ok {
		setMissingCommandLauncherSchemaValue(formgen, "advanced", advanced)
	}
	if units := commandLauncherPresentationString(field.DisplayHints["units"]); units != "" {
		setMissingCommandLauncherSchemaValue(formgen, "unit", units)
	}
	if widget := commandLauncherFormgenWidget(field); widget != "" {
		setMissingCommandLauncherSchemaValue(formgen, "widget", widget)
	}
	if len(field.StaticOptions) > 0 {
		options := make([]any, 0, len(field.StaticOptions))
		for _, option := range field.StaticOptions {
			value := strings.TrimSpace(option.Value)
			if value == "" {
				continue
			}
			options = append(options, map[string]any{
				"value": value, "label": firstNonEmptyString(strings.TrimSpace(option.Label), value),
				"description": strings.TrimSpace(option.Description), "disabled": option.Disabled,
				"metadata": commandLauncherJSONSafeMap(option.Metadata),
			})
		}
		if len(options) > 0 {
			formgen["options"] = options
		}
	}
	if field.OptionSource != nil && strings.TrimSpace(field.OptionSource.ID) != "" {
		formgen["commandOptionSource"] = map[string]any{
			"id": strings.TrimSpace(field.OptionSource.ID), "label": strings.TrimSpace(field.OptionSource.Label),
			"dynamic": field.OptionSource.Dynamic, "cacheScope": strings.TrimSpace(field.OptionSource.CacheScope),
			"params": commandLauncherJSONSafeMap(field.OptionSource.Params),
		}
		endpoint := map[string]any{
			"url":    commandLauncherOptionEndpointScheme + commandID + "/" + path,
			"method": "POST", "resultsPath": "data.option_items", "valueField": "value", "labelField": "label",
			"params": map[string]string{"command_id": commandID, "field_path": path, "source_id": strings.TrimSpace(field.OptionSource.ID)},
		}
		if dynamicParams := commandLauncherFormgenDynamicParams(field.OptionSource.Params); len(dynamicParams) > 0 {
			endpoint["dynamicParams"] = dynamicParams
		}
		property["x-endpoint"] = endpoint
	}
}

func mergeCommandLauncherFormgenGrid(formgen map[string]any, compact bool) {
	grid := commandLauncherSchemaObject(formgen["grid"])
	if grid == nil {
		grid = map[string]any{}
		formgen["grid"] = grid
	}
	setMissingCommandLauncherSchemaValue(grid, "span", 12)
	if !compact {
		return
	}
	breakpoints := commandLauncherSchemaObject(grid["breakpoints"])
	if breakpoints == nil {
		breakpoints = map[string]any{}
		grid["breakpoints"] = breakpoints
	}
	for name, span := range map[string]int{"md": 6, "lg": 4} {
		entry := commandLauncherSchemaObject(breakpoints[name])
		if entry == nil {
			entry = map[string]any{}
			breakpoints[name] = entry
		}
		setMissingCommandLauncherSchemaValue(entry, "span", span)
	}
}

func commandLauncherFormgenCompactField(field gocommand.CommandInputField) bool {
	fieldType := commandLauncherFormgenJSONType(field)
	if fieldType == "array" || fieldType == "object" || fieldType == "boolean" {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(field.Kind)) {
	case "textarea", "json", "chips", "multi_select":
		return false
	default:
		return true
	}
}

func commandLauncherFormgenDynamicParams(params map[string]any) map[string]string {
	if len(params) == 0 {
		return nil
	}
	var raw any
	for _, key := range []string{"depends_on", "dependencies", "refresh_on"} {
		if params[key] != nil {
			raw = params[key]
			break
		}
	}
	dependencies := make([]string, 0)
	switch value := raw.(type) {
	case string:
		dependencies = strings.Split(value, ",")
	case []string:
		dependencies = append(dependencies, value...)
	case []any:
		for _, item := range value {
			if text, ok := item.(string); ok {
				dependencies = append(dependencies, text)
			}
		}
	}
	out := map[string]string{}
	for index, dependency := range dependencies {
		dependency = strings.TrimSpace(strings.TrimPrefix(dependency, "payload."))
		if dependency != "" {
			out[fmt.Sprintf("dependency_%d", index+1)] = dependency
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func commandLauncherFormgenSections(fields []gocommand.CommandInputField) (map[string]string, []any) {
	if len(fields) == 0 {
		return nil, nil
	}
	sectionByPath := make(map[string]string, len(fields))
	sectionIDs := map[string]string{}
	sections := make([]any, 0)
	for _, field := range fields {
		path := commandLauncherFormgenFieldPath(field)
		if path == "" {
			continue
		}
		title := commandLauncherPresentationString(field.DisplayHints["section"])
		advanced, _ := commandLauncherPresentationBool(field.DisplayHints["advanced"])
		if advanced {
			title = "Advanced"
		} else if title == "" {
			title = "Parameters"
		}
		sectionID := sectionIDs[title]
		if sectionID == "" {
			sectionID = fmt.Sprintf("command-section-%d", len(sections)+1)
			sectionIDs[title] = sectionID
			meta := map[string]any{"id": sectionID, "title": title, "order": len(sections) + 1, "fieldset": true}
			if advanced {
				meta["uiHints"] = map[string]string{"collapsible": "true", "collapsed": "true"}
			}
			sections = append(sections, meta)
		}
		sectionByPath[path] = sectionID
	}
	return sectionByPath, sections
}

func assignCommandLauncherTopLevelSection(root map[string]any, path, sectionID string) string {
	properties := commandLauncherSchemaObject(root["properties"])
	top := strings.TrimSpace(strings.Split(path, ".")[0])
	property := commandLauncherSchemaObject(properties[top])
	if property == nil {
		return "field section could not be assigned to its top-level property"
	}
	formgen := commandLauncherSchemaObject(property["x-formgen"])
	if formgen == nil {
		formgen = map[string]any{}
		property["x-formgen"] = formgen
	}
	if existing := commandLauncherSchemaString(formgen["layout.section"]); existing != "" && existing != sectionID {
		return "nested fields assign incompatible sections to the same top-level object"
	}
	setMissingCommandLauncherSchemaValue(formgen, "layout.section", sectionID)
	return ""
}

func commandLauncherFormgenWidget(field gocommand.CommandInputField) string {
	switch strings.ToLower(strings.TrimSpace(field.Kind)) {
	case "toggle", "boolean", "checkbox":
		return "toggle"
	case "chips", "multi_select":
		return "chips"
	case "select", "enum":
		return "select"
	case "textarea":
		return "textarea"
	default:
		if len(field.StaticOptions) > 0 || field.OptionSource != nil {
			if commandLauncherFormgenJSONType(field) == "array" {
				return "chips"
			}
			return "select"
		}
		return ""
	}
}

func setMissingCommandLauncherSchemaValue(target map[string]any, key string, value any) {
	if value == nil {
		return
	}
	if text, ok := value.(string); ok && text == "" {
		return
	}
	if _, exists := target[key]; !exists {
		target[key] = value
	}
}

func appendCommandLauncherSchemaRequired(schema map[string]any, field string) {
	field = strings.TrimSpace(field)
	if field == "" {
		return
	}
	required := commandLauncherSchemaArray(schema["required"])
	for _, value := range required {
		if value == field {
			return
		}
	}
	schema["required"] = append(required, field)
}

func commandLauncherSchemaString(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return text
}

func commandLauncherSchemaObject(value any) map[string]any {
	object, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return object
}

func commandLauncherSchemaArray(value any) []any {
	array, ok := value.([]any)
	if !ok {
		return nil
	}
	return array
}

func commandLauncherFormgenConflictDiagnostic(commandID, path, message string) CommandLauncherDiagnostic {
	metadata := map[string]any{"command_id": commandID}
	if path != "" {
		metadata["field_path"] = path
	}
	return commandLauncherDiagnostic("formgen_schema_conflict", "warning", message, metadata)
}
