package modules

import (
	"context"

	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
)

// Load registers modules after validating dependencies, feature flags, and ordering.
func Load(ctx context.Context, opts LoadOptions) error {
	if opts.RegisterDefaults != nil {
		if err := opts.RegisterDefaults(); err != nil {
			return err
		}
	}
	ordered, err := Order(opts.Modules)
	if err != nil {
		return err
	}
	for _, mod := range ordered {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		if len(manifest.FeatureFlags) > 0 && opts.Gates != nil {
			for _, flag := range manifest.FeatureFlags {
				enabled, err := opts.Gates.Enabled(ctx, flag, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
				if err != nil {
					return err
				}
				if enabled {
					continue
				}
				if opts.DisabledError != nil {
					return opts.DisabledError(flag, manifest.ID)
				}
				return goerrors.New("feature disabled", goerrors.CategoryAuthz).WithCode(403).WithMetadata(map[string]any{
					"feature": flag,
					"module":  manifest.ID,
				})
			}
		}
		if opts.Translator != nil {
			if aware, ok := mod.(TranslatorAware); ok {
				aware.WithTranslator(opts.Translator)
			}
		}
		if opts.Register != nil {
			if err := opts.Register(mod); err != nil {
				return err
			}
		}
		if opts.AddMenuItems != nil {
			if contributor, ok := mod.(MenuContributor); ok {
				items := contributor.MenuItems(opts.DefaultLocale)
				if err := opts.AddMenuItems(ctx, items); err != nil {
					return err
				}
			}
		}
		if opts.AddIconLibrary != nil || opts.AddIconDefinition != nil {
			if contributor, ok := mod.(IconContributor); ok {
				if opts.AddIconLibrary != nil {
					for _, lib := range contributor.IconLibraries() {
						if err := opts.AddIconLibrary(lib); err != nil {
							return err
						}
					}
				}
				if opts.AddIconDefinition != nil {
					for _, icon := range contributor.IconDefinitions() {
						if err := opts.AddIconDefinition(icon); err != nil {
							return err
						}
					}
				}
			}
		}
	}
	return nil
}

// Order performs a deterministic topological sort based on declared dependencies.
func Order(modules []Module) ([]Module, error) {
	nodes := map[string]Module{}
	order := []string{}
	for _, mod := range modules {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		nodes[manifest.ID] = mod
		order = append(order, manifest.ID)
	}

	visited := map[string]bool{}
	stack := map[string]bool{}
	result := []Module{}

	var visit func(id string) error
	visit = func(id string) error {
		if visited[id] {
			return nil
		}
		if stack[id] {
			return goerrors.New("module dependency cycle detected", goerrors.CategoryValidation).WithCode(400).WithMetadata(map[string]any{
				"module": id,
			})
		}
		mod, ok := nodes[id]
		if !ok {
			return goerrors.New("module not registered", goerrors.CategoryNotFound).WithCode(404).WithMetadata(map[string]any{
				"module": id,
			})
		}
		stack[id] = true
		for _, dep := range mod.Manifest().Dependencies {
			if _, ok := nodes[dep]; !ok {
				return goerrors.New("module missing dependency", goerrors.CategoryValidation).WithCode(400).WithMetadata(map[string]any{
					"module":     id,
					"dependency": dep,
				})
			}
			if err := visit(dep); err != nil {
				return err
			}
		}
		stack[id] = false
		visited[id] = true
		result = append(result, mod)
		return nil
	}

	for _, id := range order {
		if err := visit(id); err != nil {
			return nil, err
		}
	}

	return result, nil
}
