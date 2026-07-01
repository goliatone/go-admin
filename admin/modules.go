package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/modules"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	"github.com/goliatone/go-admin/admin/routing"
	navcontract "github.com/goliatone/go-admin/internal/navigation"
	"github.com/goliatone/go-admin/internal/primitives"
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
		{id: mediaModuleID, enabled: featureEnabled(a.featureGate, FeatureMedia), build: func() Module {
			return NewMediaModule().WithDeliveryConfig(a.config.MediaDelivery)
		}},
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
	pendingMenuItems := []MenuItem{}
	loadOptions := a.moduleLoadOptions(ctx, modulesToLoad, routingContexts, authMiddleware, publicRouter, protectedRouter)
	loadOptions.AddMenuItems = func(ctx context.Context, items []navinternal.MenuItem) error {
		pendingMenuItems = append(pendingMenuItems, cloneNavigationContributionItems(items)...)
		return nil
	}
	err = modules.Load(ctx, loadOptions)
	if err != nil {
		return err
	}
	a.CloseNavigationContributions()
	if err := a.addMenuItemsNow(ctx, pendingMenuItems); err != nil {
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
	handled, err := a.queueOrRejectLateNavigationItems(items)
	if handled || err != nil {
		return err
	}
	return a.addMenuItemsNow(ctx, items)
}

func (a *Admin) addMenuItemsNow(ctx context.Context, items []MenuItem) error {
	if len(items) == 0 {
		return nil
	}
	menuCode := a.navigationConvergenceMenuCode(items)
	return a.withNavigationConvergence(ctx, menuCode, func(ctx context.Context) error {
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
	})
}

func (a *Admin) navigationConvergenceMenuCode(items []MenuItem) string {
	for _, item := range items {
		if code := NormalizeMenuSlug(item.Menu); code != "" {
			return code
		}
	}
	if a == nil {
		return ""
	}
	return NormalizeMenuSlug(a.navMenuCode)
}

func (a *Admin) persistMenuItems(ctx context.Context, items []MenuItem) ([]MenuItem, error) {
	menuIndexes := map[string]*persistedMenuItemIndex{}
	menuCodes := map[string]bool{}
	fallbackItems := []MenuItem{}
	for _, item := range items {
		code, normalized, index, err := a.normalizePersistedMenuItem(ctx, item, menuIndexes)
		if err != nil {
			return nil, err
		}
		if navcontract.MissingRoute(navigationContractItem(normalized)) {
			a.recordNavigationRouteMissing(normalized)
			if a.navigationRouteMissingPolicyStrict() {
				return nil, validationDomainError("navigation route target missing", map[string]any{
					"component": "navigation",
					"menu":      code,
					"id":        strings.TrimSpace(normalized.ID),
				})
			}
			a.loggerFor("admin.navigation").Warn("navigation route target missing",
				"component", "navigation",
				"menu", code,
				"id", strings.TrimSpace(normalized.ID),
			)
			continue
		}
		planned := index.plan(normalized)
		if planned.Matched && !planned.Ambiguous && !planned.UnsafeBroad {
			persisted, err := a.updatePersistedMenuItem(ctx, code, adminMenuItemFromNavigationContract(planned.Update), persistedMenuItemMatch{
				Item: adminMenuItemFromNavigationContract(planned.Actual),
				Key:  planned.MatchKey,
			})
			if err != nil {
				return nil, err
			}
			index.replace(adminMenuItemFromNavigationContract(planned.Actual), persisted)
			continue
		}
		if err := a.ensurePersistentMenu(ctx, code, menuCodes); err != nil {
			return nil, err
		}
		if err := a.menuSvc.AddMenuItem(ctx, code, normalized); err != nil {
			if isMenuTargetMissing(err) {
				if routeErr := a.handleNavigationTargetMissing(code, normalized); routeErr != nil {
					return nil, routeErr
				}
				continue
			}
			return nil, err
		}
		index.add(normalized)
		fallbackItems = append(fallbackItems, normalized)
	}
	return fallbackItems, nil
}

func (a *Admin) normalizePersistedMenuItem(ctx context.Context, item MenuItem, menuIndexes map[string]*persistedMenuItemIndex) (string, MenuItem, *persistedMenuItemIndex, error) {
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
	item = markProgrammaticMenuItem(item)
	index, ok := menuIndexes[code]
	if !ok {
		index = newPersistedMenuItemIndex()
		menuIndexes[code] = index
		if raw, err := a.rawPersistedMenuItems(ctx, code); err == nil {
			index.addAll(flattenPersistedMenuItems(raw))
		} else if !errors.Is(err, ErrNotFound) {
			a.recordNavigationRawInventoryUnavailable(code, err)
			return code, item, index, validationDomainError("navigation raw inventory unavailable", map[string]any{
				"component": "navigation",
				"menu":      code,
				"error":     strings.TrimSpace(err.Error()),
			})
		} else if menu, err := a.menuSvc.Menu(ctx, code, item.Locale); err == nil && menu != nil {
			index.addAll(flattenPersistedMenuItems(menu.Items))
		}
	}
	return code, item, index, nil
}

func (a *Admin) rawPersistedMenuItems(ctx context.Context, code string) ([]MenuItem, error) {
	if a == nil || a.menuSvc == nil {
		return nil, ErrNotFound
	}
	a.navigationLifecycleMu.Lock()
	opts := a.navigationRawInventoryOptionsLocked(code)
	a.navigationLifecycleMu.Unlock()
	return rawMenuItems(ctx, a.menuSvc, opts)
}

func (a *Admin) handleNavigationTargetMissing(code string, item MenuItem) error {
	a.recordNavigationRouteMissing(item)
	if a.navigationRouteMissingPolicyStrict() {
		return validationDomainError("navigation route target missing", map[string]any{
			"component": "navigation",
			"menu":      code,
			"id":        strings.TrimSpace(item.ID),
		})
	}
	a.loggerFor("admin.navigation").Warn("navigation route target missing",
		"component", "navigation",
		"menu", code,
		"id", strings.TrimSpace(item.ID),
	)
	return nil
}

func (a *Admin) updatePersistedMenuItem(ctx context.Context, code string, item MenuItem, match persistedMenuItemMatch) (MenuItem, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(item.ID) == "" {
		return item, nil
	}
	update := match.repairItem(item)
	err := a.menuSvc.UpdateMenuItem(ctx, code, update)
	if err == nil {
		return update, nil
	}
	if !isMenuTargetMissing(err) {
		return update, err
	}

	err = a.menuSvc.AddMenuItem(ctx, code, item)
	if err == nil {
		return item, nil
	}
	if isMenuTargetMissing(err) {
		return item, a.handleNavigationTargetMissing(code, item)
	}
	return item, err
}

type persistedMenuItemIndex struct {
	byKey map[string][]MenuItem
}

type persistedMenuItemMatch struct {
	Item MenuItem
	Key  string
}

type rawMenuItemsProvider interface {
	RawMenuItems(ctx context.Context, menuCode string) ([]MenuItem, error)
}

type scopedRawMenuItemsProvider interface {
	RawMenuItemsWithOptions(ctx context.Context, opts NavigationRawInventoryOptions) ([]MenuItem, error)
}

type navigationCoordinationReporter interface {
	NavigationCoordinationReport() NavigationCoordinationReport
}

type navigationPersistenceReporter interface {
	NavigationPersistenceReport() NavigationPersistenceReport
}

func rawMenuItems(ctx context.Context, menuSvc any, opts NavigationRawInventoryOptions) ([]MenuItem, error) {
	if menuSvc == nil {
		return nil, ErrNotFound
	}
	if scoped, ok := menuSvc.(scopedRawMenuItemsProvider); ok && scoped != nil {
		return scoped.RawMenuItemsWithOptions(ctx, opts)
	}
	provider, ok := menuSvc.(rawMenuItemsProvider)
	if !ok || provider == nil {
		return nil, ErrNotFound
	}
	return provider.RawMenuItems(ctx, opts.MenuCode)
}

const (
	menuTargetProgrammaticOwnerKey = navcontract.TargetProgrammaticOwnerKey
	menuTargetProgrammaticOwner    = navcontract.TargetProgrammaticOwner
	menuTargetProgrammaticIDKey    = navcontract.TargetProgrammaticIDKey
)

func newPersistedMenuItemIndex() *persistedMenuItemIndex {
	return &persistedMenuItemIndex{byKey: map[string][]MenuItem{}}
}

func (idx *persistedMenuItemIndex) addAll(items []MenuItem) {
	for _, item := range items {
		idx.add(item)
	}
}

func (idx *persistedMenuItemIndex) add(item MenuItem) {
	if idx == nil {
		return
	}
	for _, key := range uniquePersistedMenuItemKeys(item) {
		idx.byKey[key] = appendUniquePersistedMenuItem(idx.byKey[key], item)
	}
}

func (idx *persistedMenuItemIndex) replace(oldItem, newItem MenuItem) {
	if idx == nil {
		return
	}
	idx.remove(oldItem)
	idx.add(newItem)
}

func (idx *persistedMenuItemIndex) remove(item MenuItem) {
	if idx == nil {
		return
	}
	itemIdentity := persistedMenuItemIdentity(item)
	for _, key := range uniquePersistedMenuItemKeys(item) {
		matches := idx.byKey[key]
		if len(matches) == 0 {
			continue
		}
		filtered := matches[:0]
		for _, existing := range matches {
			if persistedMenuItemIdentity(existing) == itemIdentity {
				continue
			}
			filtered = append(filtered, existing)
		}
		if len(filtered) == 0 {
			delete(idx.byKey, key)
			continue
		}
		idx.byKey[key] = filtered
	}
}

func (idx *persistedMenuItemIndex) plan(item MenuItem) navcontract.PlannedItem {
	if idx == nil {
		return navcontract.PlannedItem{Action: navcontract.ConvergenceCreate, Expected: navigationContractItem(item), Update: navigationContractItem(item)}
	}
	return navcontract.PlanExpectedItem(navigationContractItem(item), navigationContractItems(idx.items()), navcontract.ConvergenceOptions{
		MatchPolicy: navcontract.MatchPolicy{Owner: navcontract.OwnerModule},
		Apply:       true,
	})
}

func (idx *persistedMenuItemIndex) items() []MenuItem {
	if idx == nil {
		return nil
	}
	seen := map[string]bool{}
	out := []MenuItem{}
	for _, matches := range idx.byKey {
		for _, item := range matches {
			key := persistedMenuItemIdentity(item)
			if key != "" && seen[key] {
				continue
			}
			if key != "" {
				seen[key] = true
			}
			out = append(out, item)
		}
	}
	return out
}

func (match persistedMenuItemMatch) repairItem(expected MenuItem) MenuItem {
	update := expected
	existingID := strings.TrimSpace(match.Item.ID)
	if existingID == "" || strings.EqualFold(existingID, strings.TrimSpace(expected.ID)) {
		return update
	}
	update.ID = existingID
	update.Code = strings.TrimSpace(match.Item.Code)
	if update.Code == "" || strings.EqualFold(update.Code, strings.TrimSpace(expected.ID)) {
		update.Code = existingID
	}
	return update
}

func uniquePersistedMenuItemKeys(item MenuItem) []string {
	return uniquePersistedMenuKeys(persistedMenuItemKeys(item))
}

func persistedMenuItemKeys(item MenuItem) []string {
	return navcontract.IdentityKeys(navigationContractItem(item))
}

func markProgrammaticMenuItem(item MenuItem) MenuItem {
	return adminMenuItemFromNavigationContract(navcontract.MarkProgrammatic(navigationContractItem(item)))
}

func targetStringValue(target map[string]any, key string) string {
	return navcontract.TargetString(target, key)
}

func uniquePersistedMenuKeys(values []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}

func appendUniquePersistedMenuItem(items []MenuItem, item MenuItem) []MenuItem {
	key := persistedMenuItemIdentity(item)
	for _, existing := range items {
		existingKey := persistedMenuItemIdentity(existing)
		if key != "" && existingKey == key {
			return items
		}
	}
	return append(items, item)
}

func persistedMenuItemIdentity(item MenuItem) string {
	if id := strings.ToLower(strings.TrimSpace(item.ID)); id != "" {
		return "id:" + id
	}
	if code := strings.ToLower(strings.TrimSpace(item.Code)); code != "" {
		return "code:" + code
	}
	if ownerID := targetStringValue(item.Target, menuTargetProgrammaticIDKey); ownerID != "" {
		return "programmatic:" + strings.ToLower(ownerID)
	}
	return ""
}

func flattenPersistedMenuItems(items []MenuItem) []MenuItem {
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		out = append(out, flattenPersistedMenuItems(item.Children)...)
	}
	return out
}

func navigationContractItems(items []MenuItem) []navcontract.Item {
	out := make([]navcontract.Item, 0, len(items))
	for _, item := range items {
		out = append(out, navigationContractItem(item))
	}
	return out
}

func navigationContractItem(item MenuItem) navcontract.Item {
	return navcontract.Item{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		URLOverride:   cloneStringPtr(item.URLOverride),
		Target:        primitives.CloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneIntPtr(item.Position),
		PlacementSlot: navigationPlacementSlot(item.PlacementSlot, item.Target),
		Permissions:   cloneStringSliceOrNil(item.Permissions),
		Badge:         primitives.CloneAnyMap(item.Badge),
		Classes:       cloneStringSliceOrNil(item.Classes),
		Styles:        cloneStringMapOrNil(item.Styles),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

func adminMenuItemFromNavigationContract(item navcontract.Item) MenuItem {
	return MenuItem{
		ID:            item.ID,
		Code:          item.Code,
		Type:          item.Type,
		Label:         item.Label,
		LabelKey:      item.LabelKey,
		GroupTitle:    item.GroupTitle,
		GroupTitleKey: item.GroupTitleKey,
		URLOverride:   cloneStringPtr(item.URLOverride),
		Target:        primitives.CloneAnyMap(item.Target),
		Icon:          item.Icon,
		Position:      cloneIntPtr(item.Position),
		PlacementSlot: navigationPlacementSlot(item.PlacementSlot, item.Target),
		Permissions:   cloneStringSliceOrNil(item.Permissions),
		Badge:         primitives.CloneAnyMap(item.Badge),
		Classes:       cloneStringSliceOrNil(item.Classes),
		Styles:        cloneStringMapOrNil(item.Styles),
		Menu:          item.Menu,
		ParentID:      item.ParentID,
		ParentCode:    item.ParentCode,
		Locale:        item.Locale,
		Collapsible:   item.Collapsible,
		Collapsed:     item.Collapsed,
	}
}

func navigationPlacementSlot(slot string, target map[string]any) string {
	if trimmed := strings.TrimSpace(slot); trimmed != "" {
		return trimmed
	}
	return navcontract.TargetString(target, navcontract.TargetPlacementSlotKey)
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
