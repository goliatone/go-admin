package admin

import (
	"fmt"
	"io/fs"
	"time"

	formgen "github.com/goliatone/go-formgen"
	formgenmodel "github.com/goliatone/go-formgen/pkg/model"
	formgenopenapi "github.com/goliatone/go-formgen/pkg/openapi"
	formgenorchestrator "github.com/goliatone/go-formgen/pkg/orchestrator"
	formgenrender "github.com/goliatone/go-formgen/pkg/render"
	formgenvanilla "github.com/goliatone/go-formgen/pkg/renderers/vanilla"
	"github.com/goliatone/go-formgen/pkg/renderers/vanilla/components"
)

func newFormGenerator(openapiFS fs.FS, templatesFS fs.FS, componentRegistry *components.Registry) (*formgenorchestrator.Orchestrator, error) {
	if openapiFS == nil {
		return nil, fmt.Errorf("missing OpenAPI filesystem")
	}

	registry := formgenrender.NewRegistry()
	templateBundle := formgenvanilla.TemplatesFS()
	if templatesFS != nil {
		templateBundle = withFallbackFS(templatesFS, templateBundle)
	}

	vanillaOpts := []formgenvanilla.Option{
		formgenvanilla.WithoutStyles(),
		formgenvanilla.WithTemplatesFS(templateBundle),
	}
	if componentRegistry != nil {
		merged, err := mergeComponentRegistry(componentRegistry)
		if err != nil {
			return nil, err
		}
		if merged != nil {
			vanillaOpts = append(vanillaOpts, formgenvanilla.WithComponentRegistry(merged))
		}
	}

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

	orchestratorOpts := []formgenorchestrator.Option{
		formgenorchestrator.WithLoader(loader),
		formgenorchestrator.WithParser(formgen.NewParser()),
		formgenorchestrator.WithModelBuilder(formgenmodel.NewBuilder()),
		formgenorchestrator.WithRegistry(registry),
		formgenorchestrator.WithDefaultRenderer(vanillaRenderer.Name()),
	}
	if uiSchemaFS != nil {
		orchestratorOpts = append(orchestratorOpts, formgenorchestrator.WithUISchemaFS(uiSchemaFS))
	}

	return formgen.NewOrchestrator(orchestratorOpts...), nil
}

func mergeComponentRegistry(reg *components.Registry) (*components.Registry, error) {
	if reg == nil {
		return nil, nil
	}
	merged := components.NewDefaultRegistry()
	for _, name := range reg.Names() {
		descriptor, ok := reg.Descriptor(name)
		if !ok {
			continue
		}
		if baseDescriptor, ok := merged.Descriptor(name); ok {
			descriptor = mergeComponentDescriptors(baseDescriptor, descriptor)
		}
		if err := merged.Register(name, descriptor); err != nil {
			return nil, fmt.Errorf("merge component registry: %s: %w", name, err)
		}
	}
	return merged, nil
}

func mergeComponentDescriptors(base, override components.Descriptor) components.Descriptor {
	out := base
	out.Stylesheets = append([]string(nil), base.Stylesheets...)
	out.Scripts = append([]components.Script(nil), base.Scripts...)
	if override.Renderer != nil {
		out.Renderer = override.Renderer
	}
	if len(override.Stylesheets) > 0 {
		out.Stylesheets = append(out.Stylesheets, override.Stylesheets...)
	}
	if len(override.Scripts) > 0 {
		out.Scripts = append(out.Scripts, override.Scripts...)
	}
	return out
}

type multiFS []fs.FS

func (m multiFS) Open(name string) (fs.File, error) {
	var lastErr error
	for _, f := range m {
		if f == nil {
			continue
		}
		file, err := f.Open(name)
		if err == nil {
			return file, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = fs.ErrNotExist
	}
	return nil, lastErr
}

func (m multiFS) Stat(name string) (fs.FileInfo, error) {
	if name == "" || name == "." {
		return multiFSDirInfo{name: "."}, nil
	}

	var lastErr error
	for _, f := range m {
		if f == nil {
			continue
		}
		if statter, ok := f.(fs.StatFS); ok {
			info, err := statter.Stat(name)
			if err == nil {
				return info, nil
			}
			lastErr = err
			continue
		}

		file, err := f.Open(name)
		if err != nil {
			lastErr = err
			continue
		}
		info, statErr := file.Stat()
		_ = file.Close()
		if statErr == nil {
			return info, nil
		}
		lastErr = statErr
	}

	if lastErr == nil {
		lastErr = fs.ErrNotExist
	}
	return nil, lastErr
}

type multiFSDirInfo struct{ name string }

func (d multiFSDirInfo) Name() string       { return d.name }
func (d multiFSDirInfo) Size() int64        { return 0 }
func (d multiFSDirInfo) Mode() fs.FileMode  { return fs.ModeDir | 0o555 }
func (d multiFSDirInfo) ModTime() time.Time { return time.Time{} }
func (d multiFSDirInfo) IsDir() bool        { return true }
func (d multiFSDirInfo) Sys() any           { return nil }

func withFallbackFS(primary fs.FS, fallbacks ...fs.FS) fs.FS {
	fsList := []fs.FS{}
	fsList = append(fsList, extractFS(primary)...)
	for _, f := range fallbacks {
		fsList = append(fsList, extractFS(f)...)
	}
	if len(fsList) == 0 {
		return nil
	}
	return multiFS(fsList)
}

func extractFS(f fs.FS) []fs.FS {
	if f == nil {
		return nil
	}
	if m, ok := f.(multiFS); ok {
		return []fs.FS(m)
	}
	return []fs.FS{f}
}
