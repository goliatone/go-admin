package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/goliatone/go-admin/admin/internal/modules"
	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
	"github.com/goliatone/go-admin/admin/routing"
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
	menuIndexes := map[string]*persistedMenuItemIndex{}
	menuCodes := map[string]bool{}
	fallbackItems := []MenuItem{}
	for _, item := range items {
		code, normalized, index := a.normalizePersistedMenuItem(ctx, item, menuIndexes)
		match, ok, ambiguous := index.match(normalized)
		if ok && !ambiguous {
			persisted, err := a.updatePersistedMenuItem(ctx, code, normalized, match)
			if err != nil {
				return nil, err
			}
			index.replace(match.Item, persisted)
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
		index.add(normalized)
		fallbackItems = append(fallbackItems, normalized)
	}
	return fallbackItems, nil
}

func (a *Admin) normalizePersistedMenuItem(ctx context.Context, item MenuItem, menuIndexes map[string]*persistedMenuItemIndex) (string, MenuItem, *persistedMenuItemIndex) {
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
		if menu, err := a.menuSvc.Menu(ctx, code, item.Locale); err == nil && menu != nil {
			index.addAll(flattenPersistedMenuItems(menu.Items))
		}
	}
	return code, item, index
}

func (a *Admin) updatePersistedMenuItem(ctx context.Context, code string, item MenuItem, match persistedMenuItemMatch) (MenuItem, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if strings.TrimSpace(item.ID) == "" {
		return item, nil
	}
	update := match.repairItem(item)
	if err := a.menuSvc.UpdateMenuItem(ctx, code, update); err != nil {
		if isMenuTargetMissing(err) {
			if addErr := a.menuSvc.AddMenuItem(ctx, code, item); addErr != nil && !isMenuTargetMissing(addErr) {
				return item, addErr
			}
			return item, nil
		}
		return update, err
	}
	return update, nil
}

type persistedMenuItemIndex struct {
	byKey map[string][]MenuItem
}

type persistedMenuItemMatch struct {
	Item MenuItem
	Key  string
}

const (
	menuTargetProgrammaticOwnerKey = "_menu_owner"
	menuTargetProgrammaticOwner    = "go-admin.programmatic"
	menuTargetProgrammaticIDKey    = "_menu_owner_id"
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

func (idx *persistedMenuItemIndex) match(item MenuItem) (persistedMenuItemMatch, bool, bool) {
	if idx == nil {
		return persistedMenuItemMatch{}, false, false
	}
	keys := uniquePersistedMenuItemKeys(item)
	for _, key := range keys {
		if !strongPersistedMenuItemKey(key) {
			continue
		}
		matches := compatiblePersistedMenuMatches(item, key, idx.byKey[key])
		if len(matches) == 0 {
			continue
		}
		if len(matches) > 1 {
			return persistedMenuItemMatch{}, false, true
		}
		return persistedMenuItemMatch{Item: matches[0], Key: key}, true, false
	}
	for _, key := range keys {
		if strongPersistedMenuItemKey(key) {
			continue
		}
		matches := compatiblePersistedMenuMatches(item, key, idx.byKey[key])
		if len(matches) == 0 {
			continue
		}
		if len(matches) > 1 {
			return persistedMenuItemMatch{}, false, true
		}
		if !legacyProgrammaticMenuRepairCandidate(item, matches[0], key) {
			continue
		}
		return persistedMenuItemMatch{Item: matches[0], Key: key}, true, false
	}
	return persistedMenuItemMatch{}, false, false
}

func strongPersistedMenuItemKey(key string) bool {
	return strings.HasPrefix(key, "path:") ||
		strings.HasPrefix(key, "code:") ||
		strings.HasPrefix(key, "generated_id:") ||
		strings.HasPrefix(key, "programmatic_id:")
}

func compatiblePersistedMenuMatches(expected MenuItem, key string, matches []MenuItem) []MenuItem {
	if len(matches) == 0 {
		return nil
	}
	out := make([]MenuItem, 0, len(matches))
	for _, match := range matches {
		if persistedMenuMatchCompatible(expected, match, key) {
			out = append(out, match)
		}
	}
	return out
}

func persistedMenuMatchCompatible(expected, existing MenuItem, key string) bool {
	if !strings.HasPrefix(key, "target_path:") {
		return true
	}
	expectedParent := strings.ToLower(strings.TrimSpace(expected.ParentID))
	existingParent := strings.ToLower(strings.TrimSpace(existing.ParentID))
	if expectedParent != "" || existingParent != "" {
		return expectedParent == existingParent
	}
	return true
}

func legacyProgrammaticMenuRepairCandidate(expected, existing MenuItem, key string) bool {
	if strongPersistedMenuItemKey(key) {
		return true
	}
	if targetStringValue(existing.Target, menuTargetProgrammaticOwnerKey) == menuTargetProgrammaticOwner {
		return true
	}
	expectedPath := targetStringValue(expected.Target, "path")
	existingPath := targetStringValue(existing.Target, "path")
	if expectedPath != "" && existingPath == "" {
		return true
	}
	if stringSliceContainsFold(existing.Permissions, "admin.archive.view") && !stringSliceContainsFold(expected.Permissions, "admin.archive.view") {
		return true
	}
	return false
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
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "path:"+strings.ToLower(id))
	}
	if code := strings.TrimSpace(item.Code); code != "" {
		keys = append(keys, "code:"+strings.ToLower(code))
	}
	if generatedID := targetStringValue(item.Target, "_generated_id"); generatedID != "" {
		keys = append(keys, "generated_id:"+strings.ToLower(generatedID))
	}
	if targetStringValue(item.Target, menuTargetProgrammaticOwnerKey) == menuTargetProgrammaticOwner {
		if ownerID := targetStringValue(item.Target, menuTargetProgrammaticIDKey); ownerID != "" {
			keys = append(keys, "programmatic_id:"+strings.ToLower(ownerID))
		}
	}
	if key := targetStringValue(item.Target, "key"); key != "" {
		keys = append(keys, "target_key:"+strings.ToLower(key))
	}
	if name := targetStringValue(item.Target, "name"); name != "" {
		keys = append(keys, "target_name:"+strings.ToLower(name))
	}
	if routeName := targetStringValue(item.Target, "route_name"); routeName != "" {
		keys = append(keys, "target_name:"+strings.ToLower(routeName))
	}
	if route := targetStringValue(item.Target, "route"); route != "" {
		keys = append(keys, "target_name:"+strings.ToLower(route))
	}
	if path := targetStringValue(item.Target, "path"); path != "" {
		keys = append(keys, "target_path:"+strings.ToLower(path))
	}
	return keys
}

func markProgrammaticMenuItem(item MenuItem) MenuItem {
	itemType := NormalizeMenuItemType(item.Type)
	if itemType == MenuItemTypeGroup || itemType == MenuItemTypeSeparator || len(item.Target) == 0 {
		return item
	}
	target := primitives.CloneAnyMap(item.Target)
	target[menuTargetProgrammaticOwnerKey] = menuTargetProgrammaticOwner
	if strings.TrimSpace(toString(target[menuTargetProgrammaticIDKey])) == "" {
		target[menuTargetProgrammaticIDKey] = programmaticMenuOwnerID(item)
	}
	item.Target = target
	return item
}

func programmaticMenuOwnerID(item MenuItem) string {
	for _, candidate := range []string{
		targetStringValue(item.Target, "key"),
		targetStringValue(item.Target, "name"),
		targetStringValue(item.Target, "route_name"),
		targetStringValue(item.Target, "route"),
		strings.TrimSpace(item.ID),
	} {
		if candidate != "" {
			return candidate
		}
	}
	return ""
}

func targetStringValue(target map[string]any, key string) string {
	if target == nil {
		return ""
	}
	value, ok := target[key]
	if !ok || value == nil {
		return ""
	}
	return strings.TrimSpace(toString(value))
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

func stringSliceContainsFold(values []string, want string) bool {
	want = strings.ToLower(strings.TrimSpace(want))
	if want == "" {
		return false
	}
	for _, value := range values {
		if strings.ToLower(strings.TrimSpace(value)) == want {
			return true
		}
	}
	return false
}

func flattenPersistedMenuItems(items []MenuItem) []MenuItem {
	out := make([]MenuItem, 0, len(items))
	for _, item := range items {
		out = append(out, item)
		out = append(out, flattenPersistedMenuItems(item.Children)...)
	}
	return out
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
