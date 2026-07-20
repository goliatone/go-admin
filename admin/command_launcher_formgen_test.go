package admin

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	gocommand "github.com/goliatone/go-command"
)

func TestCommandLauncherFormgenRendererProducesFieldsOnlyHTML(t *testing.T) {
	schema, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{ID: "users.sync", Input: gocommand.CommandInputSchema{Fields: []gocommand.CommandInputField{
		{Path: "email", Label: `<Email & owner>`, Type: "string", Required: true},
		{Path: "force", Type: "boolean", DisplayHints: map[string]any{"advanced": true}},
	}}})
	if err != nil || len(diagnostics) != 0 {
		t.Fatalf("adapt err=%v diagnostics=%#v", err, diagnostics)
	}
	renderer, err := sharedCommandLauncherFormgenRenderer()
	if err != nil {
		t.Fatalf("renderer: %v", err)
	}
	html, err := renderer.render(context.Background(), schema)
	if err != nil {
		t.Fatalf("render: %v", err)
	}
	if len(html) == 0 {
		t.Fatal("expected fields-only HTML")
	}
	if strings.Contains(string(html), `<Email & owner>`) || !strings.Contains(string(html), `&lt;Email &amp; owner&gt;`) {
		t.Fatalf("label was not escaped: %s", html)
	}
	if !strings.Contains(string(html), `<details data-formgen-section=`) || !strings.Contains(string(html), `Advanced`) {
		t.Fatalf("advanced section was not rendered as collapsed formgen chrome: %s", html)
	}
	if !strings.Contains(string(html), `--fg-span-md: 6`) || !strings.Contains(string(html), `--fg-span-lg: 4`) {
		t.Fatalf("scalar command fields must retain responsive launcher spans: %s", html)
	}
}

func TestAdaptCommandLauncherFormgenSchemaSchemaOnly(t *testing.T) {
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{ID: "schema.only", Input: gocommand.CommandInputSchema{JSONSchema: map[string]any{
		"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": "authored.schema", "type": "object",
		"properties": map[string]any{"count": map[string]any{"type": "integer", "minimum": 1}}, "required": []string{"count"},
	}}})
	if err != nil || len(diagnostics) != 0 {
		t.Fatalf("adapt err=%v diagnostics=%#v", err, diagnostics)
	}
	if adapted.OperationID != "authored.schema.edit" {
		t.Fatalf("operation id = %q", adapted.OperationID)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	properties := mustCommandLauncherType[map[string]any](t, root["properties"], "root properties")
	count := mustCommandLauncherType[map[string]any](t, properties["count"], "count property")
	if count["type"] != "integer" || count["minimum"] != float64(1) {
		t.Fatalf("count = %#v", count)
	}
}

func TestAdaptCommandLauncherFormgenSchemaSchemaOnlySensitive(t *testing.T) {
	descriptor := gocommand.CommandDescriptor{ID: "schema.secret", Input: gocommand.CommandInputSchema{JSONSchema: map[string]any{
		"type": "object", "properties": map[string]any{
			"password": map[string]any{"type": "string", "format": "password", "default": "must-not-persist"},
		},
	}}}
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
	if err != nil || len(diagnostics) != 0 {
		t.Fatalf("adapt err=%v diagnostics=%#v", err, diagnostics)
	}
	if !adapted.Sensitive {
		t.Fatal("schema-only password must mark the generated action form sensitive")
	}
	actions := commandLauncherActions(context.Background(), nil, []gocommand.CommandDescriptor{descriptor}, &diagnostics)
	if len(actions) != 1 || actions[0].Form == nil || !actions[0].Form.Sensitive {
		t.Fatalf("schema-only password action was not protected: %#v", actions)
	}
	if strings.Contains(actions[0].Form.HTML, "must-not-persist") {
		t.Fatalf("schema-only password default leaked into generated HTML: %s", actions[0].Form.HTML)
	}
}

func TestAdaptCommandLauncherFormgenSchemaFieldsOnlyPreservesPresentation(t *testing.T) {
	descriptor := gocommand.CommandDescriptor{
		ID: "users.sync", Label: "Sync users",
		Input: gocommand.CommandInputSchema{Fields: []gocommand.CommandInputField{
			{Path: "scope.region", Label: "Region", Type: "string", Required: true, Default: "us", Placeholder: "Select a region", Description: "Target region", Help: "Choose carefully", DisplayHints: map[string]any{"section": "Scope", "units": "region"}},
			{Path: "dry_run", Kind: "toggle", Sensitive: true, Default: true, DisplayHints: map[string]any{"advanced": true}},
		}},
	}
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
	if err != nil {
		t.Fatalf("adapt: %v", err)
	}
	if len(diagnostics) != 0 {
		t.Fatalf("diagnostics = %#v", diagnostics)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	properties := mustCommandLauncherType[map[string]any](t, root["properties"], "root properties")
	scope := mustCommandLauncherType[map[string]any](t, properties["scope"], "scope property")
	scopeProperties := mustCommandLauncherType[map[string]any](t, scope["properties"], "scope properties")
	region := mustCommandLauncherType[map[string]any](t, scopeProperties["region"], "region property")
	if region["type"] != "string" || region["default"] != "us" || region["description"] != "Target region" {
		t.Fatalf("region = %#v", region)
	}
	ui := mustCommandLauncherType[map[string]any](t, region["x-formgen"], "region formgen metadata")
	if ui["label"] != "Region" || ui["placeholder"] != "Select a region" || ui["helpText"] != "Choose carefully" || ui["section"] != "Scope" || ui["unit"] != "region" {
		t.Fatalf("region UI = %#v", ui)
	}
	rootUI := mustCommandLauncherType[map[string]any](t, root["x-formgen"], "root formgen metadata")
	sections := mustCommandLauncherType[[]any](t, rootUI["layout.sections"], "layout sections")
	if len(sections) != 2 {
		t.Fatalf("layout sections = %#v", rootUI["layout.sections"])
	}
	scopeUI := mustCommandLauncherType[map[string]any](t, scope["x-formgen"], "scope formgen metadata")
	if scopeUI["layout.section"] == "" {
		t.Fatalf("top-level nested object section missing: %#v", scopeUI)
	}
	if required := mustCommandLauncherType[[]any](t, scope["required"], "scope required fields"); len(required) != 1 || required[0] != "region" {
		t.Fatalf("required = %#v", required)
	}
	dryRun := mustCommandLauncherType[map[string]any](t, properties["dry_run"], "dry_run property")
	if dryRun["x-formgen-sensitive"] != true {
		t.Fatalf("sensitive marker missing: %#v", dryRun)
	}
	if _, exists := dryRun["default"]; exists {
		t.Fatalf("sensitive default leaked: %#v", dryRun)
	}
}

func TestAdaptCommandLauncherFormgenSchemaExplicitSchemaWinsAndFieldsSupplement(t *testing.T) {
	descriptor := gocommand.CommandDescriptor{
		ID: "reports.export",
		Input: gocommand.CommandInputSchema{
			JSONSchema: map[string]any{"type": "object", "properties": map[string]any{
				"limit": map[string]any{"type": "integer", "minimum": 5, "default": 25, "x-formgen": map[string]any{"label": "Authored limit"}},
			}},
			Fields: []gocommand.CommandInputField{{Path: "limit", Label: "Field limit", Type: "string", Default: 100, Validation: map[string]any{"minimum": 1, "maximum": 500}}},
		},
	}
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
	if err != nil || len(diagnostics) != 0 {
		t.Fatalf("adapt err=%v diagnostics=%#v", err, diagnostics)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	properties := mustCommandLauncherType[map[string]any](t, root["properties"], "root properties")
	limit := mustCommandLauncherType[map[string]any](t, properties["limit"], "limit property")
	if limit["type"] != "integer" || limit["minimum"] != float64(5) || limit["default"] != float64(25) || limit["maximum"] != float64(500) {
		t.Fatalf("limit = %#v", limit)
	}
	limitUI := mustCommandLauncherType[map[string]any](t, limit["x-formgen"], "limit formgen metadata")
	if label := limitUI["label"]; label != "Authored limit" {
		t.Fatalf("label = %v", label)
	}
}

func TestAdaptCommandLauncherFormgenSchemaRichAndDynamicOptions(t *testing.T) {
	descriptor := gocommand.CommandDescriptor{ID: "jobs.run", Input: gocommand.CommandInputSchema{Fields: []gocommand.CommandInputField{
		{Path: "mode", Kind: "select", StaticOptions: []gocommand.CommandOption{{Value: "safe", Label: "Safe", Description: "Recommended", Disabled: true, Metadata: map[string]any{"tier": "default"}}}},
		{Path: "worker", OptionSource: &gocommand.CommandOptionSourceRef{ID: "workers.available", Dynamic: true, CacheScope: "request", Params: map[string]any{"depends_on": "mode"}}},
	}}}
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
	if err != nil || len(diagnostics) != 0 {
		t.Fatalf("adapt err=%v diagnostics=%#v", err, diagnostics)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	properties := mustCommandLauncherType[map[string]any](t, root["properties"], "root properties")
	mode := mustCommandLauncherType[map[string]any](t, properties["mode"], "mode property")
	modeUI := mustCommandLauncherType[map[string]any](t, mode["x-formgen"], "mode formgen metadata")
	options := mustCommandLauncherType[[]any](t, modeUI["options"], "mode options")
	option := mustCommandLauncherType[map[string]any](t, options[0], "first mode option")
	if option["value"] != "safe" || option["description"] != "Recommended" || option["disabled"] != true {
		t.Fatalf("option = %#v", option)
	}
	worker := mustCommandLauncherType[map[string]any](t, properties["worker"], "worker property")
	endpoint := mustCommandLauncherType[map[string]any](t, worker["x-endpoint"], "worker endpoint")
	if endpoint["url"] != "command-options://jobs.run/worker" || endpoint["method"] != "POST" {
		t.Fatalf("endpoint = %#v", endpoint)
	}
	dynamic := mustCommandLauncherType[map[string]any](t, endpoint["dynamicParams"], "worker dynamic parameters")
	if dynamic["dependency_1"] != "mode" {
		t.Fatalf("dynamic params = %#v", dynamic)
	}
}

func TestAdaptCommandLauncherFormgenSchemaReportsNestedConflict(t *testing.T) {
	descriptor := gocommand.CommandDescriptor{ID: "bad", Input: gocommand.CommandInputSchema{
		JSONSchema: map[string]any{"type": "object", "properties": map[string]any{"scope": map[string]any{"type": "string"}}},
		Fields:     []gocommand.CommandInputField{{Path: "scope.region"}},
	}}
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(descriptor)
	if err != nil {
		t.Fatalf("adapt: %v", err)
	}
	if len(diagnostics) != 1 || diagnostics[0].Code != "formgen_schema_conflict" {
		t.Fatalf("diagnostics = %#v", diagnostics)
	}
	if len(adapted.RawJSONSchema) == 0 {
		t.Fatal("expected remaining explicit schema")
	}
}

func TestAdaptCommandLauncherFormgenSchemaRejectsUnsafePropertyPaths(t *testing.T) {
	for _, path := range []string{
		"__proto__.polluted",
		"constructor.prototype.polluted",
		"safe.__proto__",
		"safe.prototype.value",
	} {
		t.Run(strings.ReplaceAll(path, ".", "_"), func(t *testing.T) {
			adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{
				ID: "unsafe.path",
				Input: gocommand.CommandInputSchema{
					Fields: []gocommand.CommandInputField{{Path: path, Type: "string"}},
				},
			})
			if err != nil {
				t.Fatalf("adapt: %v", err)
			}
			if len(diagnostics) != 1 || diagnostics[0].Code != "formgen_schema_conflict" || diagnostics[0].Metadata["field_path"] != path {
				t.Fatalf("expected unsafe path diagnostic for %q, got %#v", path, diagnostics)
			}
			if !strings.Contains(diagnostics[0].Message, "unsafe property segment") {
				t.Fatalf("expected actionable unsafe path message, got %#v", diagnostics[0])
			}
			root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
			if properties := mustCommandLauncherType[map[string]any](t, root["properties"], "root properties"); len(properties) != 0 {
				t.Fatalf("unsafe path %q must not create schema properties, got %#v", path, properties)
			}
		})
	}
}

func TestAdaptCommandLauncherFormgenSchemaRejectsUnsafeAuthoredProperties(t *testing.T) {
	tests := []struct {
		name       string
		schema     map[string]any
		wantPath   string
		wantReason string
	}{
		{
			name: "top level",
			schema: map[string]any{"type": "object", "properties": map[string]any{
				"__proto__": map[string]any{"type": "string"},
			}},
			wantPath: "__proto__", wantReason: "unsafe property segment",
		},
		{
			name: "nested object",
			schema: map[string]any{"type": "object", "properties": map[string]any{
				"safe": map[string]any{"type": "object", "properties": map[string]any{
					"constructor": map[string]any{"type": "string"},
				}},
			}},
			wantPath: "safe.constructor", wantReason: "unsafe property segment",
		},
		{
			name: "array item",
			schema: map[string]any{"type": "object", "properties": map[string]any{
				"rows": map[string]any{"type": "array", "items": map[string]any{"type": "object", "properties": map[string]any{
					"prototype": map[string]any{"type": "string"},
				}}},
			}},
			wantPath: "rows.prototype", wantReason: "unsafe property segment",
		},
		{
			name: "composition branch",
			schema: map[string]any{"type": "object", "properties": map[string]any{
				"block": map[string]any{"oneOf": []any{
					map[string]any{"type": "object", "properties": map[string]any{
						"constructor.prototype": map[string]any{"type": "string"},
					}},
				}},
			}},
			wantPath: "block.constructor.prototype", wantReason: "unsafe property segment",
		},
		{
			name: "definition",
			schema: map[string]any{"type": "object", "$defs": map[string]any{
				"unsafe": map[string]any{"type": "object", "properties": map[string]any{
					"prototype": map[string]any{"type": "string"},
				}},
			}},
			wantPath: "prototype", wantReason: "unsafe property segment",
		},
		{
			name: "bracket path",
			schema: map[string]any{"type": "object", "properties": map[string]any{
				"safe[__proto__]": map[string]any{"type": "string"},
			}},
			wantPath: "safe[__proto__]", wantReason: "unsupported segment",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{
				ID:    "unsafe.schema",
				Input: gocommand.CommandInputSchema{JSONSchema: test.schema},
			})
			if err != nil {
				t.Fatalf("adapt: %v", err)
			}
			if len(adapted.RawJSONSchema) != 0 {
				t.Fatalf("unsafe authored schema must fail closed, got %s", adapted.RawJSONSchema)
			}
			if len(diagnostics) != 1 || diagnostics[0].Code != "formgen_schema_conflict" || diagnostics[0].Metadata["field_path"] != test.wantPath {
				t.Fatalf("expected unsafe authored property diagnostic for %q, got %#v", test.wantPath, diagnostics)
			}
			if !strings.Contains(diagnostics[0].Message, test.wantReason) {
				t.Fatalf("expected %q in diagnostic, got %#v", test.wantReason, diagnostics[0])
			}
		})
	}
}

func TestAdaptCommandLauncherFormgenSchemaAllowsSafeAuthoredSchemaTrees(t *testing.T) {
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{
		ID: "safe.schema",
		Input: gocommand.CommandInputSchema{JSONSchema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"constructor_id": map[string]any{"type": "string"},
				"rows": map[string]any{"type": "array", "items": map[string]any{"type": "object", "properties": map[string]any{
					"prototype_version": map[string]any{"type": "string"},
				}}},
			},
		}},
	})
	if err != nil || len(diagnostics) != 0 || len(adapted.RawJSONSchema) == 0 {
		t.Fatalf("adapted=%#v diagnostics=%#v err=%v", adapted, diagnostics, err)
	}
}

func TestAdaptCommandLauncherFormgenSchemaNoInput(t *testing.T) {
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{ID: "health.check", Input: gocommand.CommandInputSchema{NoInput: true}})
	if err != nil || len(diagnostics) != 0 || !adapted.NoInput {
		t.Fatalf("adapted=%#v diagnostics=%#v err=%v", adapted, diagnostics, err)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	if len(mustCommandLauncherType[map[string]any](t, root["properties"], "root properties")) != 0 {
		t.Fatalf("schema = %#v", root)
	}
}

func decodeCommandLauncherSchema(t *testing.T, raw []byte) map[string]any {
	t.Helper()
	var output map[string]any
	if err := json.Unmarshal(raw, &output); err != nil {
		t.Fatalf("decode schema: %v", err)
	}
	return output
}
