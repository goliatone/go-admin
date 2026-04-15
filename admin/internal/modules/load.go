package modules

import (
	"context"
	"errors"
	"strings"

	goerrors "github.com/goliatone/go-errors"
	fggate "github.com/goliatone/go-featuregate/gate"
)

type skippedModuleError struct {
	moduleID string
	err      error
}

func (e *skippedModuleError) Error() string {
	if e == nil || e.err == nil {
		return "module skipped"
	}
	return e.err.Error()
}

func (e *skippedModuleError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.err
}

// NewSkippedModuleError marks a module as intentionally skipped while continuing startup.
func NewSkippedModuleError(moduleID string, err error) error {
	moduleID = strings.TrimSpace(moduleID)
	if err == nil {
		err = goerrors.New("module skipped", goerrors.CategoryValidation).WithMetadata(map[string]any{
			"module": moduleID,
		})
	}
	return &skippedModuleError{
		moduleID: moduleID,
		err:      err,
	}
}

// IsSkippedModuleError returns true when the error indicates the current module should be skipped.
func IsSkippedModuleError(err error) bool {
	var skipped *skippedModuleError
	return errors.As(err, &skipped)
}

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
	skipped := map[string]struct{}{}
	for _, mod := range ordered {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		skippedDeps := moduleSkippedDependencies(skipped, manifest.Dependencies)
		if len(skippedDeps) > 0 {
			if err := skipUnavailableModule(opts, skipped, manifest.ID, skippedDeps); err != nil {
				return err
			}
			continue
		}
		if err := ensureModuleFeaturesEnabled(ctx, opts, manifest); err != nil {
			return err
		}
		applyModuleTranslator(opts, mod)
		if err := registerModule(opts, skipped, manifest.ID, mod); err != nil {
			if IsSkippedModuleError(err) {
				continue
			}
			return err
		}
		if err := addModuleMenuItems(ctx, opts, mod); err != nil {
			return err
		}
		if err := addModuleIcons(opts, mod); err != nil {
			return err
		}
	}
	return nil
}

func moduleSkippedDependencies(skipped map[string]struct{}, dependencies []string) []string {
	skippedDeps := []string{}
	for _, dep := range dependencies {
		if _, ok := skipped[strings.TrimSpace(dep)]; ok {
			skippedDeps = append(skippedDeps, strings.TrimSpace(dep))
		}
	}
	return skippedDeps
}

func skipUnavailableModule(opts LoadOptions, skipped map[string]struct{}, moduleID string, skippedDeps []string) error {
	if opts.SkipDependency != nil {
		opts.SkipDependency(moduleID, skippedDeps)
		skipped[strings.TrimSpace(moduleID)] = struct{}{}
		return nil
	}
	return goerrors.New("module dependency unavailable", goerrors.CategoryValidation).WithCode(400).WithMetadata(map[string]any{
		"module":       moduleID,
		"dependencies": skippedDeps,
	})
}

func ensureModuleFeaturesEnabled(ctx context.Context, opts LoadOptions, manifest Manifest) error {
	if len(manifest.FeatureFlags) == 0 || opts.Gates == nil {
		return nil
	}
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
	return nil
}

func applyModuleTranslator(opts LoadOptions, mod Module) {
	if opts.Translator == nil {
		return
	}
	if aware, ok := mod.(TranslatorAware); ok {
		aware.WithTranslator(opts.Translator)
	}
}

func registerModule(opts LoadOptions, skipped map[string]struct{}, moduleID string, mod Module) error {
	if opts.Register == nil {
		return nil
	}
	if err := opts.Register(mod); err != nil {
		if IsSkippedModuleError(err) {
			skipped[strings.TrimSpace(moduleID)] = struct{}{}
		}
		return err
	}
	return nil
}

func addModuleMenuItems(ctx context.Context, opts LoadOptions, mod Module) error {
	if opts.AddMenuItems == nil {
		return nil
	}
	contributor, ok := mod.(MenuContributor)
	if !ok {
		return nil
	}
	return opts.AddMenuItems(ctx, contributor.MenuItems(opts.DefaultLocale))
}

func addModuleIcons(opts LoadOptions, mod Module) error {
	if opts.AddIconLibrary == nil && opts.AddIconDefinition == nil {
		return nil
	}
	contributor, ok := mod.(IconContributor)
	if !ok {
		return nil
	}
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
