package quickstart

import (
	"bytes"
	"context"
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
