package modules

import (
	"context"
	"fmt"
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
				if opts.Gates.EnabledKey(flag) {
					continue
				}
				if opts.DisabledError != nil {
					return opts.DisabledError(flag, manifest.ID)
				}
				return fmt.Errorf("%s feature disabled (required by module %s)", flag, manifest.ID)
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
			return fmt.Errorf("module dependency cycle detected at %s", id)
		}
		mod, ok := nodes[id]
		if !ok {
			return fmt.Errorf("module %s not registered", id)
		}
		stack[id] = true
		for _, dep := range mod.Manifest().Dependencies {
			if _, ok := nodes[dep]; !ok {
				return fmt.Errorf("module %s missing dependency %s", id, dep)
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
