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
	count := root["properties"].(map[string]any)["count"].(map[string]any)
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
	scope := root["properties"].(map[string]any)["scope"].(map[string]any)
	region := scope["properties"].(map[string]any)["region"].(map[string]any)
	if region["type"] != "string" || region["default"] != "us" || region["description"] != "Target region" {
		t.Fatalf("region = %#v", region)
	}
	ui := region["x-formgen"].(map[string]any)
	if ui["label"] != "Region" || ui["placeholder"] != "Select a region" || ui["helpText"] != "Choose carefully" || ui["section"] != "Scope" || ui["unit"] != "region" {
		t.Fatalf("region UI = %#v", ui)
	}
	rootUI := root["x-formgen"].(map[string]any)
	if len(rootUI["layout.sections"].([]any)) != 2 {
		t.Fatalf("layout sections = %#v", rootUI["layout.sections"])
	}
	scopeUI := scope["x-formgen"].(map[string]any)
	if scopeUI["layout.section"] == "" {
		t.Fatalf("top-level nested object section missing: %#v", scopeUI)
	}
	if required := scope["required"].([]any); len(required) != 1 || required[0] != "region" {
		t.Fatalf("required = %#v", required)
	}
	dryRun := root["properties"].(map[string]any)["dry_run"].(map[string]any)
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
	limit := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)["properties"].(map[string]any)["limit"].(map[string]any)
	if limit["type"] != "integer" || limit["minimum"] != float64(5) || limit["default"] != float64(25) || limit["maximum"] != float64(500) {
		t.Fatalf("limit = %#v", limit)
	}
	if label := limit["x-formgen"].(map[string]any)["label"]; label != "Authored limit" {
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
	properties := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)["properties"].(map[string]any)
	option := properties["mode"].(map[string]any)["x-formgen"].(map[string]any)["options"].([]any)[0].(map[string]any)
	if option["value"] != "safe" || option["description"] != "Recommended" || option["disabled"] != true {
		t.Fatalf("option = %#v", option)
	}
	worker := properties["worker"].(map[string]any)
	endpoint := worker["x-endpoint"].(map[string]any)
	if endpoint["url"] != "command-options://jobs.run/worker" || endpoint["method"] != "POST" {
		t.Fatalf("endpoint = %#v", endpoint)
	}
	dynamic := endpoint["dynamicParams"].(map[string]any)
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

func TestAdaptCommandLauncherFormgenSchemaNoInput(t *testing.T) {
	adapted, diagnostics, err := adaptCommandLauncherFormgenSchema(gocommand.CommandDescriptor{ID: "health.check", Input: gocommand.CommandInputSchema{NoInput: true}})
	if err != nil || len(diagnostics) != 0 || !adapted.NoInput {
		t.Fatalf("adapted=%#v diagnostics=%#v err=%v", adapted, diagnostics, err)
	}
	root := decodeCommandLauncherSchema(t, adapted.RawJSONSchema)
	if len(root["properties"].(map[string]any)) != 0 {
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
