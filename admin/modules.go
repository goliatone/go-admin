package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/modules"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	router "github.com/goliatone/go-router"
)

// RegisterModule registers a pluggable module before initialization.
// Duplicate IDs are rejected to preserve ordering and idempotency.
func (a *Admin) RegisterModule(module Module) error {
	if a.registry == nil {
		return serviceNotConfiguredDomainError("registry", map[string]any{"component": "modules"})
	}
	return a.registry.RegisterModule(module)
}

func (a *Admin) registerDefaultModules() error {
	if a.registry == nil {
		return nil
	}
	if featureEnabled(a.featureGate, FeatureUsers) {
		if _, exists := a.registry.Module(usersModuleID); !exists {
			if err := a.registry.RegisterModule(NewUserManagementModule()); err != nil {
				return err
			}
		}
	}
	if featureEnabled(a.featureGate, FeaturePreferences) {
		if _, exists := a.registry.Module(preferencesModuleID); !exists {
			if err := a.registry.RegisterModule(NewPreferencesModule()); err != nil {
				return err
			}
		}
	}
	if _, exists := a.registry.Module(featureFlagsModuleID); !exists {
		if err := a.registry.RegisterModule(NewFeatureFlagsModule()); err != nil {
			return err
		}
	}
	if featureEnabled(a.featureGate, FeatureProfile) {
		if _, exists := a.registry.Module(profileModuleID); !exists {
			if err := a.registry.RegisterModule(NewProfileModule()); err != nil {
				return err
			}
		}
	}
	if featureEnabled(a.featureGate, FeatureTenants) {
		if _, exists := a.registry.Module(tenantsModuleID); !exists {
			if err := a.registry.RegisterModule(NewTenantsModule()); err != nil {
				return err
			}
		}
	}
	if featureEnabled(a.featureGate, FeatureOrganizations) {
		if _, exists := a.registry.Module(organizationsModuleID); !exists {
			if err := a.registry.RegisterModule(NewOrganizationsModule()); err != nil {
				return err
			}
		}
	}
	if _, exists := a.registry.Module(activityModuleID); !exists {
		if err := a.registry.RegisterModule(NewActivityModule()); err != nil {
			return err
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
	authMiddleware := router.MiddlewareFunc(nil)
	if a.authenticator != nil {
		authMiddleware = router.MiddlewareFunc(a.authWrapper())
	}
	publicRouter := a.router
	protectedRouter := wrapAdminRouter(publicRouter, authMiddleware)

	err := modules.Load(ctx, modules.LoadOptions{
		Modules:       modulesToLoad,
		Gates:         a.featureGate,
		DefaultLocale: a.config.DefaultLocale,
		Translator:    a.translator,
		DisabledError: func(feature, moduleID string) error {
			return FeatureDisabledError{
				Feature: feature,
				Reason:  fmt.Sprintf("required by module %s; enable via FeatureGate defaults", moduleID),
			}
		},
		Register: func(mod modules.Module) error {
			registrar, ok := mod.(Module)
			if !ok {
				return validationDomainError("module missing Register implementation", map[string]any{"component": "modules", "module": mod.Manifest().ID})
			}
			moduleCtx := ModuleContext{
				Admin:           a,
				Router:          protectedRouter,
				ProtectedRouter: protectedRouter,
				PublicRouter:    publicRouter,
				AuthMiddleware:  authMiddleware,
				Locale:          a.config.DefaultLocale,
				Translator:      a.translator,
			}
			if err := registrar.Register(moduleCtx); err != nil {
				return err
			}
			if validator, ok := registrar.(ModuleStartupValidator); ok {
				validateErr := validator.ValidateStartup(ctx)
				if validateErr != nil {
					if a.moduleStartupPolicy == ModuleStartupPolicyWarn {
						a.loggerFor("admin.modules").Warn("module startup validation warning",
							"module", strings.TrimSpace(mod.Manifest().ID),
							"error", validateErr,
						)
						return nil
					}
					return validationDomainError("module startup validation failed", map[string]any{
						"component": "modules",
						"module":    strings.TrimSpace(mod.Manifest().ID),
						"error":     strings.TrimSpace(validateErr.Error()),
					})
				}
			}
			return nil
		},
		AddMenuItems: func(ctx context.Context, items []navinternal.MenuItem) error {
			return a.addMenuItems(ctx, []MenuItem(items))
		},
		AddIconLibrary: func(lib modules.IconLibrary) error {
			if a.iconService == nil {
				return nil
			}
			return a.iconService.RegisterLibrary(IconLibrary{
				ID:          lib.ID,
				Name:        lib.Name,
				Description: lib.Description,
				CDN:         lib.CDN,
				CSSClass:    lib.CSSClass,
				RenderMode:  IconRenderMode(lib.RenderMode),
				Priority:    lib.Priority,
				Trusted:     lib.Trusted,
			})
		},
		AddIconDefinition: func(icon modules.IconDefinition) error {
			if a.iconService == nil {
				return nil
			}
			return a.iconService.RegisterIcon(IconDefinition{
				ID:       icon.ID,
				Name:     icon.Name,
				Label:    icon.Label,
				Type:     IconType(icon.Type),
				Library:  icon.Library,
				Content:  icon.Content,
				Keywords: icon.Keywords,
				Category: icon.Category,
				Trusted:  icon.Trusted,
			})
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
	cmsEnabled := featureEnabled(a.featureGate, FeatureCMS)
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
			item.Permissions = normalizeMenuPermissions(item.Permissions)
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
				if item.ID != "" && keySet["path:"+strings.TrimSpace(item.ID)] {
					if err := a.menuSvc.UpdateMenuItem(ctx, code, item); err != nil && !errors.Is(err, ErrNotFound) {
						if isMenuItemMissing(err) {
							if addErr := a.menuSvc.AddMenuItem(ctx, code, item); addErr != nil && !isMenuItemMissing(addErr) && !errors.Is(addErr, ErrNotFound) {
								return addErr
							}
							continue
						}
						return err
					}
				}
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
				if isMenuItemMissing(err) {
					continue
				}
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

func normalizeMenuPermissions(perms []string) []string {
	if len(perms) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(perms))
	for _, perm := range perms {
		trimmed := strings.TrimSpace(perm)
		if trimmed == "" || seen[trimmed] {
			continue
		}
		seen[trimmed] = true
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
