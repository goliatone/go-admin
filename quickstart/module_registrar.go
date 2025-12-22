package quickstart

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

// ModuleRegistrarOption customizes module registration behavior.
type ModuleRegistrarOption func(*moduleRegistrarOptions)

type moduleRegistrarOptions struct {
	ctx       context.Context
	menuItems []admin.MenuItem
	seed      bool
	seedOpts  SeedNavigationOptions
}

// WithModuleRegistrarContext sets the context used for navigation seeding.
func WithModuleRegistrarContext(ctx context.Context) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		if ctx != nil {
			opts.ctx = ctx
		}
	}
}

// WithModuleMenuItems appends base menu items before seeding.
func WithModuleMenuItems(items ...admin.MenuItem) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil || len(items) == 0 {
			return
		}
		opts.menuItems = append(opts.menuItems, items...)
	}
}

// WithSeedNavigation toggles navigation seeding.
func WithSeedNavigation(enabled bool) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.seed = enabled
	}
}

// WithSeedNavigationOptions mutates the seed options before execution.
func WithSeedNavigationOptions(mutator func(*SeedNavigationOptions)) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil || mutator == nil {
			return
		}
		mutator(&opts.seedOpts)
	}
}

// NewModuleRegistrar seeds navigation and registers modules deterministically.
func NewModuleRegistrar(adm *admin.Admin, cfg admin.Config, modules []admin.Module, isDev bool, opts ...ModuleRegistrarOption) error {
	if adm == nil {
		return fmt.Errorf("admin is required")
	}
	_ = isDev

	menuCode := strings.TrimSpace(cfg.NavMenuCode)
	if menuCode == "" {
		menuCode = DefaultNavMenuCode
	}
	locale := strings.TrimSpace(cfg.DefaultLocale)
	if locale == "" {
		locale = "en"
	}

	options := moduleRegistrarOptions{
		ctx:  context.Background(),
		seed: true,
		seedOpts: SeedNavigationOptions{
			MenuSvc:  adm.MenuService(),
			MenuCode: menuCode,
			Locale:   locale,
		},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	ordered, err := orderModules(modules)
	if err != nil {
		return err
	}

	if options.seed && options.seedOpts.MenuSvc != nil {
		items := append([]admin.MenuItem{}, DefaultMenuParents(menuCode)...)
		items = append(items, options.menuItems...)
		for _, mod := range ordered {
			if mod == nil {
				continue
			}
			if contributor, ok := mod.(interface{ MenuItems(string) []admin.MenuItem }); ok {
				items = append(items, contributor.MenuItems(locale)...)
			}
		}
		items = dedupeMenuItems(items)
		options.seedOpts.Items = items
		if err := SeedNavigation(options.ctx, options.seedOpts); err != nil {
			if !errors.Is(err, ErrSeedNavigationRequiresGoCMS) {
				return err
			}
			if seedErr := EnsureDefaultMenuParents(options.ctx, options.seedOpts.MenuSvc, menuCode, locale); seedErr != nil {
				return seedErr
			}
		}
	}

	for _, mod := range ordered {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		if err := adm.RegisterModule(mod); err != nil {
			if manifest.ID != "" {
				return fmt.Errorf("register module %s: %w", manifest.ID, err)
			}
			return err
		}
	}

	return nil
}

func orderModules(mods []admin.Module) ([]admin.Module, error) {
	nodes := map[string]admin.Module{}
	order := []string{}
	for _, mod := range mods {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		id := strings.TrimSpace(manifest.ID)
		if id == "" {
			return nil, fmt.Errorf("module missing ID")
		}
		if _, exists := nodes[id]; exists {
			return nil, fmt.Errorf("duplicate module ID %s", id)
		}
		nodes[id] = mod
		order = append(order, id)
	}

	visited := map[string]bool{}
	stack := map[string]bool{}
	result := []admin.Module{}

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

func dedupeMenuItems(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		id := strings.TrimSpace(item.ID)
		if id == "" {
			out = append(out, item)
			continue
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, item)
	}
	return out
}
