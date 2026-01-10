package quickstart

import (
	"bytes"
	"context"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-formgen/pkg/model"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

const formGeneratorOpenAPI = `openapi: 3.0.3
info:
  title: Widgets
  version: 1.0.0
paths:
  /widgets:
    post:
      operationId: createWidget
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                description:
                  type: string
      responses:
        '200':
          description: OK
`

const formGeneratorUISchema = `operations:
  createWidget:
    fields:
      name:
        component: custom-component
`

func formGeneratorFS() fstest.MapFS {
	return fstest.MapFS{
		"openapi.yaml":         {Data: []byte(formGeneratorOpenAPI)},
		"uischema/fields.yaml": {Data: []byte(formGeneratorUISchema)},
	}
}

func customComponentRenderer(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
	_ = field
	_ = data
	buf.WriteString(`<div data-custom="true">custom</div>`)
	return nil
}

func TestNewFormGeneratorMergeComponentRegistry(t *testing.T) {
	openapiFS := formGeneratorFS()
	registry := components.New()
	registry.MustRegister("custom-component", components.Descriptor{
		Renderer: customComponentRenderer,
	})

	formgen, err := NewFormGenerator(openapiFS, nil, WithComponentRegistryMergeDefaults(registry))
	if err != nil {
		t.Fatalf("new form generator: %v", err)
	}

	output, err := formgen.Generate(context.Background(), formgenorchestrator.Request{
		Source:      formgenopenapi.SourceFromFS("openapi.yaml"),
		OperationID: "createWidget",
	})
	if err != nil {
		t.Fatalf("generate form: %v", err)
	}

	html := string(output)
	if !strings.Contains(html, `data-component="custom-component"`) {
		t.Fatalf("expected custom component in output")
	}
	if !strings.Contains(html, `data-custom="true"`) {
		t.Fatalf("expected custom renderer output")
	}
	if !strings.Contains(html, `data-component="input"`) {
		t.Fatalf("expected default input component in output")
	}
}

func TestNewFormGeneratorReplaceComponentRegistry(t *testing.T) {
	openapiFS := formGeneratorFS()
	registry := components.New()
	registry.MustRegister("custom-component", components.Descriptor{
		Renderer: customComponentRenderer,
	})

	formgen, err := NewFormGenerator(openapiFS, nil, WithComponentRegistry(registry))
	if err != nil {
		t.Fatalf("new form generator: %v", err)
	}

	_, err = formgen.Generate(context.Background(), formgenorchestrator.Request{
		Source:      formgenopenapi.SourceFromFS("openapi.yaml"),
		OperationID: "createWidget",
	})
	if err == nil {
		t.Fatalf("expected error when default components are not registered")
	}
	if !strings.Contains(err.Error(), `component "input" not registered`) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestMergeComponentDescriptors(t *testing.T) {
	baseRenderer := func(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
		_ = buf
		_ = field
		_ = data
		return nil
	}
	overrideRenderer := func(buf *bytes.Buffer, field model.Field, data components.ComponentData) error {
		_ = buf
		_ = field
		_ = data
		return nil
	}

	base := components.Descriptor{
		Renderer:    baseRenderer,
		Stylesheets: []string{"base.css"},
		Scripts: []components.Script{
			{Src: "base.js"},
		},
	}
	override := components.Descriptor{
		Renderer:    overrideRenderer,
		Stylesheets: []string{"override.css"},
		Scripts: []components.Script{
			{Src: "override.js"},
		},
	}

	merged := MergeComponentDescriptors(base, override)
	if got, want := reflect.ValueOf(merged.Renderer).Pointer(), reflect.ValueOf(overrideRenderer).Pointer(); got != want {
		t.Fatalf("expected override renderer to win")
	}
	if len(merged.Stylesheets) != 2 {
		t.Fatalf("expected merged stylesheets, got %d", len(merged.Stylesheets))
	}
	if merged.Stylesheets[0] != "base.css" || merged.Stylesheets[1] != "override.css" {
		t.Fatalf("unexpected stylesheet order: %v", merged.Stylesheets)
	}
	if len(merged.Scripts) != 2 {
		t.Fatalf("expected merged scripts, got %d", len(merged.Scripts))
	}
	if merged.Scripts[0].Src != "base.js" || merged.Scripts[1].Src != "override.js" {
		t.Fatalf("unexpected script order: %v", merged.Scripts)
	}
}
