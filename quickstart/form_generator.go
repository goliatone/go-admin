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
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

// FormGeneratorOption configures the form generator.
type FormGeneratorOption func(*formGeneratorConfig)

type formGeneratorConfig struct {
	componentRegistry      *components.Registry
	mergeComponentRegistry bool
	vanillaOptions         []formgenvanilla.Option
}

// WithComponentRegistry replaces the default component registry.
func WithComponentRegistry(reg *components.Registry) FormGeneratorOption {
	return func(cfg *formGeneratorConfig) {
		if reg != nil {
			cfg.componentRegistry = reg
			cfg.mergeComponentRegistry = false
		}
	}
}

// WithComponentRegistryMergeDefaults merges a custom registry into defaults.
// Custom components override built-ins with the same name.
func WithComponentRegistryMergeDefaults(reg *components.Registry) FormGeneratorOption {
	return func(cfg *formGeneratorConfig) {
		if reg != nil {
			cfg.componentRegistry = reg
			cfg.mergeComponentRegistry = true
		}
	}
}

// WithVanillaOption appends a vanilla renderer option.
// These are applied last to allow overrides.
func WithVanillaOption(opt formgenvanilla.Option) FormGeneratorOption {
	return func(cfg *formGeneratorConfig) {
		if opt != nil {
			cfg.vanillaOptions = append(cfg.vanillaOptions, opt)
		}
	}
}

// NewFormGenerator creates a form generator from OpenAPI and template filesystems.
func NewFormGenerator(openapiFS fs.FS, templatesFS fs.FS, opts ...FormGeneratorOption) (*formgenorchestrator.Orchestrator, error) {
	if openapiFS == nil {
		return nil, fmt.Errorf("missing OpenAPI filesystem")
	}

	cfg := formGeneratorConfig{}
	for _, opt := range opts {
		if opt != nil {
			opt(&cfg)
		}
	}

	registry := formgenrender.NewRegistry()
	templateBundle := formgenvanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = WithFallbackFS(templatesFS, templateBundle)
	}

	vanillaOpts := []formgenvanilla.Option{
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
	}
	componentRegistry := cfg.componentRegistry
	if componentRegistry != nil && cfg.mergeComponentRegistry {
		merged := components.NewDefaultRegistry()
		for _, name := range componentRegistry.Names() {
			if descriptor, ok := componentRegistry.Descriptor(name); ok {
				merged.MustRegister(name, descriptor)
			}
		}
		componentRegistry = merged
	}
	if componentRegistry != nil {
		vanillaOpts = append(vanillaOpts, formgenvanilla.WithComponentRegistry(componentRegistry))
	}
	vanillaOpts = append(vanillaOpts, cfg.vanillaOptions...)

	vanillaRenderer, err := formgenvanilla.New(vanillaOpts...)
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
