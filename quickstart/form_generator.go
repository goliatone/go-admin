package quickstart

import (
	"fmt"
	"io/fs"

	formgen "github.com/goliatone/go-formgen"
	formgenmodel "github.com/goliatone/go-formgen/pkg/model"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
)

// NewFormGenerator creates a form generator from OpenAPI and template filesystems.
func NewFormGenerator(openapiFS fs.FS, templatesFS fs.FS) (*formgenorchestrator.Orchestrator, error) {
	if openapiFS == nil {
		return nil, fmt.Errorf("missing OpenAPI filesystem")
	}

	registry := formgenrender.NewRegistry()
	templateBundle := formgenvanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = WithFallbackFS(templatesFS, templateBundle)
	}

	vanillaRenderer, err := formgenvanilla.New(
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
	)
	if err != nil {
		return nil, fmt.Errorf("init vanilla renderer: %w", err)
	}
	registry.MustRegister(vanillaRenderer)

	loader := formgen.NewLoader(formgenopenapi.WithFileSystem(openapiFS))

	var uiSchemaFS fs.FS
	if sub, err := fs.Sub(openapiFS, "uischema"); err == nil {
		uiSchemaFS = sub
	}

	opts := []formgenorchestrator.Option{
		formgenorchestrator.WithLoader(loader),
		formgenorchestrator.WithParser(formgen.NewParser()),
		formgenorchestrator.WithModelBuilder(formgenmodel.NewBuilder()),
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(vanillaRenderer.Name()),
	}
	if uiSchemaFS != nil {
		opts = append(opts, formgenorchestrator.WithUISchemaFS(uiSchemaFS))
	}

	return formgen.NewOrchestrator(opts...), nil
}
