package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/modules"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	"github.com/goliatone/go-admin/admin/routing"
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
	for _, candidate := range a.defaultModules() {
		if !candidate.enabled {
			continue
		}
		if err := a.registerDefaultModule(candidate.id, candidate.build); err != nil {
			return err
		}
	}
	return nil
}

type defaultModuleRegistration struct {
	id      string
	enabled bool
	build   func() Module
}

func (a *Admin) defaultModules() []defaultModuleRegistration {
	return []defaultModuleRegistration{
		{id: usersModuleID, enabled: featureEnabled(a.featureGate, FeatureUsers), build: func() Module { return NewUserManagementModule() }},
		{id: preferencesModuleID, enabled: featureEnabled(a.featureGate, FeaturePreferences), build: func() Module { return NewPreferencesModule() }},
		{id: featureFlagsModuleID, enabled: true, build: func() Module { return NewFeatureFlagsModule() }},
		{id: profileModuleID, enabled: featureEnabled(a.featureGate, FeatureProfile), build: func() Module { return NewProfileModule() }},
		{id: tenantsModuleID, enabled: featureEnabled(a.featureGate, FeatureTenants), build: func() Module { return NewTenantsModule() }},
		{id: organizationsModuleID, enabled: featureEnabled(a.featureGate, FeatureOrganizations), build: func() Module { return NewOrganizationsModule() }},
		{id: mediaModuleID, enabled: featureEnabled(a.featureGate, FeatureMedia), build: func() Module { return NewMediaModule() }},
		{id: activityModuleID, enabled: true, build: func() Module { return NewActivityModule() }},
	}
}

func (a *Admin) registerDefaultModule(id string, build func() Module) error {
	if a == nil || a.registry == nil || build == nil {
		return nil
	}
	if _, exists := a.registry.Module(id); exists {
		return nil
	}
	return a.registry.RegisterModule(build())
}

func (a *Admin) loadModules(ctx context.Context) error {
	if a.modulesLoaded {
		return nil
	}
	if err := a.registerDefaultModules(); err != nil {
		return err
	}
	modulesToLoad := collectRegisteredModules(a.registry.Modules())
	routingContexts, err := a.planModuleRouting(modulesToLoad)
	if err != nil {
		return err
	}
	authMiddleware, publicRouter, protectedRouter := a.moduleRouters()
	err = modules.Load(ctx, a.moduleLoadOptions(ctx, modulesToLoad, routingContexts, authMiddleware, publicRouter, protectedRouter))
	if err != nil {
		return err
	}
	a.modulesLoaded = true
	return nil
}

func collectRegisteredModules(registered []Module) []modules.Module {
	modulesToLoad := make([]modules.Module, 0, len(registered))
	for _, mod := range registered {
		if mod == nil {
			continue
		}
		modulesToLoad = append(modulesToLoad, mod)
	}
	return modulesToLoad
}

func (a *Admin) moduleRouters() (router.MiddlewareFunc, AdminRouter, AdminRouter) {
	authMiddleware := router.MiddlewareFunc(nil)
	if a.authenticator != nil {
		authMiddleware = router.MiddlewareFunc(a.authWrapper())
	}
	publicRouter := a.router
	protectedRouter := wrapAdminRouter(publicRouter, authMiddleware)
	return authMiddleware, publicRouter, protectedRouter
}

func (a *Admin) moduleLoadOptions(ctx context.Context, mods []modules.Module, routingContexts map[string]routing.ModuleContext, authMiddleware router.MiddlewareFunc, publicRouter, protectedRouter AdminRouter) modules.LoadOptions {
	return modules.LoadOptions{
		Modules:       mods,
		Gates:         a.featureGate,
		DefaultLocale: a.config.DefaultLocale,
		Translator:    a.translator,
		DisabledError: func(feature, moduleID string) error {
			return FeatureDisabledError{Feature: feature, Reason: fmt.Sprintf("required by module %s; enable via FeatureGate defaults", moduleID)}
		},
		Register: func(mod modules.Module) error {
			return a.registerLoadedModule(ctx, mod, routingContexts, authMiddleware, publicRouter, protectedRouter)
		},
		SkipDependency: func(moduleID string, dependencies []string) {
			a.loggerFor("admin.modules").Warn("module startup skipped due to invalid dependency",
				"module", strings.TrimSpace(moduleID),
				"dependencies", dependencies,
			)
		},
		AddMenuItems: func(ctx context.Context, items []navinternal.MenuItem) error {
			return a.addMenuItems(ctx, items)
		},
		AddIconLibrary:    a.registerModuleIconLibrary,
		AddIconDefinition: a.registerModuleIconDefinition,
	}
}

func (a *Admin) registerLoadedModule(ctx context.Context, mod modules.Module, routingContexts map[string]routing.ModuleContext, authMiddleware router.MiddlewareFunc, publicRouter, protectedRouter AdminRouter) error {
	registrar, ok := mod.(Module)
	if !ok {
		return validationDomainError("module missing Register implementation", map[string]any{"component": "modules", "module": mod.Manifest().ID})
	}
	moduleID := strings.TrimSpace(mod.Manifest().ID)
	stagedPublicRouter := newStagedAdminRouter(publicRouter)
	stagedProtectedRouter := newStagedAdminRouter(protectedRouter)
	moduleCtx := ModuleContext{
		Admin:           a,
		Router:          stagedProtectedRouter,
		ProtectedRouter: stagedProtectedRouter,
		PublicRouter:    stagedPublicRouter,
		AuthMiddleware:  authMiddleware,
		Locale:          a.config.DefaultLocale,
		Translator:      a.translator,
		Routing:         routingContexts[moduleID],
	}
	if err := registrar.Register(moduleCtx); err != nil {
		return err
	}
	if err := a.validateModuleStartup(ctx, moduleID, registrar); err != nil {
		return err
	}
	stagedPublicRouter.Commit()
	stagedProtectedRouter.Commit()
	return nil
}

func (a *Admin) validateModuleStartup(ctx context.Context, moduleID string, registrar Module) error {
	validator, ok := registrar.(ModuleStartupValidator)
	if !ok {
		return nil
	}
	validateErr := validator.ValidateStartup(ctx)
	if validateErr == nil {
		return nil
	}
	if a.moduleStartupPolicy == ModuleStartupPolicyWarn {
		a.loggerFor("admin.modules").Warn("module startup validation warning",
			"module", moduleID,
			"error", validateErr,
		)
		return modules.NewSkippedModuleError(moduleID, validateErr)
	}
	return validationDomainError("module startup validation failed", map[string]any{
		"component": "modules",
		"module":    moduleID,
		"error":     strings.TrimSpace(validateErr.Error()),
	})
}

func (a *Admin) registerModuleIconLibrary(lib modules.IconLibrary) error {
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
}

func (a *Admin) registerModuleIconDefinition(icon modules.IconDefinition) error {
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
}

func (a *Admin) planModuleRouting(registered []modules.Module) (map[string]routing.ModuleContext, error) {
	contexts := map[string]routing.ModuleContext{}
	if len(registered) == 0 || a == nil || a.routingPlanner == nil {
		return contexts, nil
	}

	ordered, err := modules.Order(registered)
	if err != nil {
		return nil, err
	}
	for _, mod := range ordered {
		if mod == nil {
			continue
		}
		moduleID := strings.TrimSpace(mod.Manifest().ID)
		registrar, ok := mod.(Module)
		if !ok {
			return nil, validationDomainError("module missing Register implementation", map[string]any{"component": "modules", "module": moduleID})
		}
		provider, ok := registrar.(RouteContractProvider)
		if !ok {
			return nil, validationDomainError("module missing explicit route contract", map[string]any{"component": "modules", "module": moduleID})
		}
		contract := provider.RouteContract()
		if err := a.routingPlanner.RegisterModule(contract); err != nil {
			a.refreshRoutingReport()
			return nil, validationDomainError("module routing registration failed", map[string]any{
				"component": "modules",
				"module":    moduleID,
				"slug":      strings.TrimSpace(contract.Slug),
				"error":     strings.TrimSpace(err.Error()),
			})
		}
		resolved, ok := a.routingPlanner.ResolvedModule(contract.Slug)
		if !ok {
			return nil, validationDomainError("module routing resolution missing", map[string]any{
				"component": "modules",
				"module":    moduleID,
				"slug":      strings.TrimSpace(contract.Slug),
			})
		}
		contexts[moduleID] = routing.BuildModuleContext(contract, resolved)
	}
	a.refreshRoutingReport()
	return contexts, nil
}

func (a *Admin) addMenuItems(ctx context.Context, items []MenuItem) error {
	if len(items) == 0 {
		return nil
	}
	cmsEnabled := featureEnabled(a.featureGate, FeatureCMS)
	fallbackItems := []MenuItem{}
	if a.menuSvc != nil {
		persistedItems, err := a.persistMenuItems(ctx, items)
		if err != nil {
			return err
		}
		fallbackItems = persistedItems
	}
	if (!cmsEnabled || a.menuSvc == nil) && a.nav != nil {
		a.addFallbackMenuItems(items, fallbackItems)
	}
	return nil
}

func (a *Admin) persistMenuItems(ctx context.Context, items []MenuItem) ([]MenuItem, error) {
	menuKeys := map[string]map[string]bool{}
	menuCodes := map[string]bool{}
	fallbackItems := []MenuItem{}
	for _, item := range items {
		code, normalized, keySet := a.normalizePersistedMenuItem(ctx, item, menuKeys)
		keys := canonicalMenuKeys(normalized)
		if hasAnyKey(keySet, keys) {
			if err := a.updatePersistedMenuItem(code, normalized, keySet); err != nil {
				return nil, err
			}
			continue
		}
		if err := a.ensurePersistentMenu(ctx, code, menuCodes); err != nil {
			return nil, err
		}
		if err := a.menuSvc.AddMenuItem(ctx, code, normalized); err != nil {
			if isMenuTargetMissing(err) {
				continue
			}
			return nil, err
		}
		for _, key := range keys {
			keySet[key] = true
		}
		fallbackItems = append(fallbackItems, normalized)
	}
	return fallbackItems, nil
}

func (a *Admin) normalizePersistedMenuItem(ctx context.Context, item MenuItem, menuKeys map[string]map[string]bool) (string, MenuItem, map[string]bool) {
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
	return code, item, keySet
}

func (a *Admin) updatePersistedMenuItem(code string, item MenuItem, keySet map[string]bool) error {
	if item.ID == "" || !keySet["path:"+strings.TrimSpace(item.ID)] {
		return nil
	}
	if err := a.menuSvc.UpdateMenuItem(context.Background(), code, item); err != nil {
		if isMenuTargetMissing(err) {
			if addErr := a.menuSvc.AddMenuItem(context.Background(), code, item); addErr != nil && !isMenuTargetMissing(addErr) {
				return addErr
			}
			return nil
		}
		return err
	}
	return nil
}

func (a *Admin) ensurePersistentMenu(ctx context.Context, code string, menuCodes map[string]bool) error {
	if menuCodes[code] {
		return nil
	}
	if _, err := a.menuSvc.CreateMenu(ctx, code); err != nil {
		errMsg := strings.ToLower(err.Error())
		if !strings.Contains(errMsg, "already exists") && !strings.Contains(errMsg, "code already exists") {
			return err
		}
	}
	menuCodes[code] = true
	return nil
}

func (a *Admin) addFallbackMenuItems(items, fallbackItems []MenuItem) {
	if a.nav == nil {
		return
	}
	if len(fallbackItems) == 0 {
		fallbackItems = items
	}
	if len(fallbackItems) == 0 {
		return
	}
	deduped := dedupeMenuItems(fallbackItems)
	converted := navinternal.ConvertMenuItems(deduped, a.translator, a.config.DefaultLocale)
	if len(converted) > 0 {
		a.nav.AddFallback(converted...)
	}
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
