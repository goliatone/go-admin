package helpers

import (
	"io/fs"
	"log"

	formgen "github.com/goliatone/go-formgen"
	formgenmodel "github.com/goliatone/go-formgen/pkg/model"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla"
)

// NewUserFormGenerator creates a form generator for user forms from an OpenAPI filesystem
func NewUserFormGenerator(openapiFS fs.FS, templatesFS fs.FS) *formgenorchestrator.Orchestrator {
	if openapiFS == nil {
		return nil
	}

	registry := formgenrender.NewRegistry()
	templateBundle := vanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = WithFallbackFS(templatesFS, templateBundle)
	}
	vanillaRenderer, err := vanilla.New(vanilla.WithoutStyles(), vanilla.WithTemplatesFS(templateBundle))
	if err != nil {
		log.Printf("failed to initialize form renderer: %v", err)
		return nil
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

	return formgen.NewOrchestrator(opts...)
}
