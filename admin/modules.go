package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/modules"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
)

// RegisterModule registers a pluggable module before initialization.
// Duplicate IDs are rejected to preserve ordering and idempotency.
func (a *Admin) RegisterModule(module Module) error {
	if a.registry == nil {
		return errors.New("registry not initialized")
	}
	return a.registry.RegisterModule(module)
}

func (a *Admin) registerDefaultModules() error {
	if a.registry == nil {
		return nil
	}
	if a.gates.Enabled(FeatureUsers) {
		if _, exists := a.registry.Module(usersModuleID); !exists {
			if err := a.registry.RegisterModule(NewUserManagementModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeaturePreferences) {
		if _, exists := a.registry.Module(preferencesModuleID); !exists {
			if err := a.registry.RegisterModule(NewPreferencesModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureProfile) {
		if _, exists := a.registry.Module(profileModuleID); !exists {
			if err := a.registry.RegisterModule(NewProfileModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureTenants) {
		if _, exists := a.registry.Module(tenantsModuleID); !exists {
			if err := a.registry.RegisterModule(NewTenantsModule()); err != nil {
				return err
			}
		}
	}
	if a.gates.Enabled(FeatureOrganizations) {
		if _, exists := a.registry.Module(organizationsModuleID); !exists {
			if err := a.registry.RegisterModule(NewOrganizationsModule()); err != nil {
				return err
			}
		}
	}
	return nil
}

func (a *Admin) loadModules(ctx context.Context) error {
	if a.modulesLoaded {
		return nil
	}
	if err := a.registerDefaultModules(); err != nil {
		return err
	}
	modulesToLoad := []modules.Module{}
	for _, mod := range a.registry.Modules() {
		if mod == nil {
			continue
		}
		modulesToLoad = append(modulesToLoad, mod)
	}

	err := modules.Load(ctx, modules.LoadOptions{
		Modules:       modulesToLoad,
		Gates:         a.gates,
		DefaultLocale: a.config.DefaultLocale,
		Translator:    a.translator,
		DisabledError: func(feature, moduleID string) error {
			return FeatureDisabledError{
				Feature: feature,
				Reason:  fmt.Sprintf("required by module %s; set via Config.Features or FeatureFlags", moduleID),
			}
		},
		Register: func(mod modules.Module) error {
			registrar, ok := mod.(Module)
			if !ok {
				return fmt.Errorf("module %s missing Register implementation", mod.Manifest().ID)
			}
			return registrar.Register(ModuleContext{Admin: a, Locale: a.config.DefaultLocale, Translator: a.translator})
		},
		AddMenuItems: func(ctx context.Context, items []navinternal.MenuItem) error {
			return a.addMenuItems(ctx, []MenuItem(items))
		},
	})
	if err != nil {
		return err
	}
	a.modulesLoaded = true
	return nil
}

func (a *Admin) addMenuItems(ctx context.Context, items []MenuItem) error {
	if len(items) == 0 {
		return nil
	}
	cmsEnabled := a.gates.Enabled(FeatureCMS)
	// Track canonical keys per menu code to avoid inserting duplicates into persistent stores.
	menuKeys := map[string]map[string]bool{}
	fallbackItems := []MenuItem{}
	if a.menuSvc != nil {
		menuCodes := map[string]bool{}
		for _, item := range items {
			code := item.Menu
			if code == "" {
				code = a.navMenuCode
			}
			code = NormalizeMenuSlug(code)
			if code == "" {
				code = a.navMenuCode
			}
			item = normalizeMenuItem(item, code)
			keySet, ok := menuKeys[code]
			if !ok {
				keySet = map[string]bool{}
				menuKeys[code] = keySet
				if menu, err := a.menuSvc.Menu(ctx, code, item.Locale); err == nil && menu != nil {
					addMenuKeys(menu.Items, keySet)
				}
			}
			keys := canonicalMenuKeys(item)
			if hasAnyKey(keySet, keys) {
				continue
			}
			if !menuCodes[code] {
				if _, err := a.menuSvc.CreateMenu(ctx, code); err != nil {
					errMsg := strings.ToLower(err.Error())
					// Ignore duplicate menu errors - menu might already exist from previous runs or setup
					if !strings.Contains(errMsg, "already exists") && !strings.Contains(errMsg, "code already exists") {
						return err
					}
				}
				menuCodes[code] = true
			}
			if err := a.menuSvc.AddMenuItem(ctx, code, item); err != nil {
				return err
			}
			for _, key := range keys {
				keySet[key] = true
			}
			fallbackItems = append(fallbackItems, item)
		}
	}
	if (!cmsEnabled || a.menuSvc == nil) && a.nav != nil {
		if len(fallbackItems) == 0 {
			fallbackItems = items
		}
		// Ensure fallback navigation also receives deduped items when CMS is disabled.
		if len(fallbackItems) > 0 {
			deduped := dedupeMenuItems(fallbackItems)
			converted := navinternal.ConvertMenuItems(deduped, a.translator, a.config.DefaultLocale)
			if len(converted) > 0 {
				a.nav.AddFallback(converted...)
			}
		}
	}
	return nil
}
