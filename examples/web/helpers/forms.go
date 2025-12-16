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
func NewUserFormGenerator(openapiFS fs.FS) *formgenorchestrator.Orchestrator {
	if openapiFS == nil {
		return nil
	}

	registry := formgenrender.NewRegistry()
	vanillaRenderer, err := vanilla.New(vanilla.WithoutStyles())
	if err != nil {
		log.Printf("failed to initialize form renderer: %v", err)
		return nil
	}
	registry.MustRegister(vanillaRenderer)

	loader := formgen.NewLoader(formgenopenapi.WithFileSystem(openapiFS))

	return formgen.NewOrchestrator(
		formgenorchestrator.WithLoader(loader),
		formgenorchestrator.WithParser(formgen.NewParser()),
		formgenorchestrator.WithModelBuilder(formgenmodel.NewBuilder()),
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(vanillaRenderer.Name()),
	)
}
