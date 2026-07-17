package admin

import (
	"context"
	"encoding/json"
	"fmt"
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

	root, err := cloneCommandLauncherSchema(descriptor.Input.JSONSchema)
	if err != nil {
		return commandLauncherFormgenSchema{}, nil, fmt.Errorf("command launcher formgen: clone JSON Schema: %w", err)
	}
	if root == nil {
		root = map[string]any{}
	}
	if schemaType, _ := root["type"].(string); schemaType != "" && schemaType != "object" {
		return commandLauncherFormgenSchema{}, []CommandLauncherDiagnostic{commandLauncherFormgenConflictDiagnostic(descriptor.ID, "", "command schema root must be an object")}, nil
	}
	root["type"] = "object"
	if _, exists := root["$schema"]; !exists {
		root["$schema"] = "https://json-schema.org/draft/2020-12/schema"
	}
	if authoredID, _ := root["$id"].(string); strings.TrimSpace(authoredID) != "" {
		schemaID = strings.TrimSpace(authoredID)
	} else {
		root["$id"] = schemaID
	}
	if _, ok := root["properties"].(map[string]any); !ok {
		if root["properties"] != nil {
			return commandLauncherFormgenSchema{}, []CommandLauncherDiagnostic{commandLauncherFormgenConflictDiagnostic(descriptor.ID, "", "command schema properties must be an object")}, nil
		}
		root["properties"] = map[string]any{}
	}
	if title := commandLauncherLabel(descriptor); title != "" {
		if _, exists := root["title"]; !exists {
			root["title"] = title
		}
	}
	sectionByPath, sections := commandLauncherFormgenSections(descriptor.Input.Fields)
	if len(sections) > 0 {
		formgen, _ := root["x-formgen"].(map[string]any)
		if formgen == nil {
			formgen = map[string]any{}
			root["x-formgen"] = formgen
		}
		setMissingCommandLauncherSchemaValue(formgen, "layout.sections", sections)
	}

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

func commandLauncherFormgenSchemaHasSensitiveField(value any) bool {
	switch typed := value.(type) {
	case map[string]any:
		if format, _ := typed["format"].(string); strings.EqualFold(strings.TrimSpace(format), "password") {
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
			nested, _ := typed[namespace].(map[string]any)
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
		for _, child := range typed {
			if commandLauncherFormgenSchemaHasSensitiveField(child) {
				return true
			}
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
	segments := strings.Split(path, ".")
	current := root
	for index, rawSegment := range segments {
		segment := strings.TrimSpace(rawSegment)
		if segment == "" || strings.ContainsAny(segment, "[]") {
			return nil, nil, "", "field path contains an unsupported segment"
		}
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
		if propertyType, _ := property["type"].(string); propertyType != "" && propertyType != "object" {
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
	formgen, _ := property["x-formgen"].(map[string]any)
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
	grid, _ := formgen["grid"].(map[string]any)
	if grid == nil {
		grid = map[string]any{}
		formgen["grid"] = grid
	}
	setMissingCommandLauncherSchemaValue(grid, "span", 12)
	if !compact {
		return
	}
	breakpoints, _ := grid["breakpoints"].(map[string]any)
	if breakpoints == nil {
		breakpoints = map[string]any{}
		grid["breakpoints"] = breakpoints
	}
	for name, span := range map[string]int{"md": 6, "lg": 4} {
		entry, _ := breakpoints[name].(map[string]any)
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
	properties, _ := root["properties"].(map[string]any)
	top := strings.TrimSpace(strings.Split(path, ".")[0])
	property, _ := properties[top].(map[string]any)
	if property == nil {
		return "field section could not be assigned to its top-level property"
	}
	formgen, _ := property["x-formgen"].(map[string]any)
	if formgen == nil {
		formgen = map[string]any{}
		property["x-formgen"] = formgen
	}
	if existing, _ := formgen["layout.section"].(string); existing != "" && existing != sectionID {
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
	required, _ := schema["required"].([]any)
	for _, value := range required {
		if value == field {
			return
		}
	}
	schema["required"] = append(required, field)
}

func commandLauncherFormgenConflictDiagnostic(commandID, path, message string) CommandLauncherDiagnostic {
	metadata := map[string]any{"command_id": commandID}
	if path != "" {
		metadata["field_path"] = path
	}
	return commandLauncherDiagnostic("formgen_schema_conflict", "warning", message, metadata)
}
