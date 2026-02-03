package main

import (
	"context"
	"io"
	"io/fs"
	"testing"

	"github.com/goliatone/go-admin/examples/web/helpers"
	"github.com/goliatone/go-admin/pkg/client"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
)

func TestPagesRelationshipFieldsHaveEndpointMetadata(t *testing.T) {
	openapiFS, err := fs.Sub(webFS, "openapi")
	if err != nil {
		t.Fatalf("openapi sub fs: %v", err)
	}

	gen := helpers.NewUserFormGenerator(openapiFS, nil)
	if gen == nil {
		t.Fatalf("expected form generator")
	}

	for _, operationID := range []string{"createPage", "updatePage"} {
		html, err := gen.Generate(context.Background(), formgenorchestrator.Request{
			Source:      formgenopenapi.SourceFromFS("pages.json"),
			OperationID: operationID,
		})
		if err != nil {
			t.Fatalf("generate %s: %v", operationID, err)
		}

		output := string(html)
		assertContains(t, output, `name="parent_id"`)
		assertContains(t, output, `data-endpoint-url="/admin/crud/pages"`)
		assertContains(t, output, `data-endpoint-mapping-value="id"`)
		assertContains(t, output, `data-endpoint-mapping-label="title"`)
		assertContains(t, output, `name="template_id"`)
		assertContains(t, output, `data-endpoint-url="/admin/api/templates"`)
		assertContains(t, output, `data-endpoint-mapping-label="label"`)
	}
}

func TestPagesRelationshipEditRendersCurrentValueMetadata(t *testing.T) {
	openapiFS, err := fs.Sub(webFS, "openapi")
	if err != nil {
		t.Fatalf("openapi sub fs: %v", err)
	}

	gen := helpers.NewUserFormGenerator(openapiFS, nil)
	if gen == nil {
		t.Fatalf("expected form generator")
	}

	html, err := gen.Generate(context.Background(), formgenorchestrator.Request{
		Source:      formgenopenapi.SourceFromFS("pages.json"),
		OperationID: "updatePage",
		RenderOptions: formgenrender.RenderOptions{
			Values: map[string]any{
				"parent_id":   "page-123",
				"template_id": "tpl-456",
			},
		},
	})
	if err != nil {
		t.Fatalf("generate updatePage: %v", err)
	}

	output := string(html)
	assertContains(t, output, `data-relationship-current="page-123"`)
	assertContains(t, output, `data-relationship-current="tpl-456"`)
}

func TestPagesTemplateLoadsRelationshipsRuntime(t *testing.T) {
	f, err := client.Templates().Open("resources/pages/form.html")
	if err != nil {
		t.Fatalf("open template: %v", err)
	}
	defer func() { _ = f.Close() }()

	raw, err := io.ReadAll(f)
	if err != nil {
		t.Fatalf("read template: %v", err)
	}
	content := string(raw)
	assertContains(t, content, `/runtime/formgen-relationships.min.js`)
	assertContains(t, content, `initRelationships`)
}
