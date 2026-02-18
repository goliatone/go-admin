package quickstart

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
	urlkit "github.com/goliatone/go-urlkit"
)

// ModuleRegistrarOption customizes module registration behavior.
type ModuleRegistrarOption func(*moduleRegistrarOptions)

type moduleRegistrarOptions struct {
	ctx                           context.Context
	menuItems                     []admin.MenuItem
	toolsMenuItems                []admin.MenuItem
	sidebarUtilityMenuItems       []admin.MenuItem
	defaultSidebarUtilityMenu     bool
	sidebarUtilityMenuCode        string
	seed                          bool
	seedOpts                      SeedNavigationOptions
	gates                         fggate.FeatureGate
	onDisabled                    func(feature, moduleID string) error
	translationCapabilityMenuMode TranslationCapabilityMenuMode
}

type menuSeedHook interface {
	AfterMenuSeed(ctx context.Context, admin *admin.Admin) error
}

// TranslationCapabilityMenuMode controls whether quickstart seeds translation capability
// menu items into the server-side navigation tree.
type TranslationCapabilityMenuMode string

const (
	// TranslationCapabilityMenuModeNone keeps translation links out of server-seeded menus.
	// Use this when translation links are intentionally omitted from server-seeded navigation.
	TranslationCapabilityMenuModeNone TranslationCapabilityMenuMode = "none"
	// TranslationCapabilityMenuModeTools seeds translation links into a dedicated Translations group.
	// The name is retained for backward compatibility.
	TranslationCapabilityMenuModeTools TranslationCapabilityMenuMode = "tools"
)

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

// WithToolsMenuItems appends menu items to the quickstart Tools group.
func WithToolsMenuItems(items ...admin.MenuItem) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil || len(items) == 0 {
			return
		}
		opts.toolsMenuItems = append(opts.toolsMenuItems, items...)
	}
}

// WithSidebarUtilityMenuItems appends utility links for the fixed sidebar utility zone.
func WithSidebarUtilityMenuItems(items ...admin.MenuItem) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil || len(items) == 0 {
			return
		}
		opts.sidebarUtilityMenuItems = append(opts.sidebarUtilityMenuItems, items...)
	}
}

// WithDefaultSidebarUtilityItems toggles quickstart-provided utility links.
func WithDefaultSidebarUtilityItems(enabled bool) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.defaultSidebarUtilityMenu = enabled
	}
}

// WithSidebarUtilityMenuCode overrides the menu code used for utility links.
func WithSidebarUtilityMenuCode(menuCode string) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.sidebarUtilityMenuCode = admin.NormalizeMenuSlug(menuCode)
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

// WithModuleFeatureGates enables feature-gated module filtering.
func WithModuleFeatureGates(gates fggate.FeatureGate) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.gates = gates
	}
}

// WithModuleFeatureDisabledHandler configures how feature-disabled modules are handled.
func WithModuleFeatureDisabledHandler(handler func(feature, moduleID string) error) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.onDisabled = handler
	}
}

// WithTranslationCapabilityMenuMode controls how translation capability links are seeded
// into server-side navigation menus.
func WithTranslationCapabilityMenuMode(mode TranslationCapabilityMenuMode) ModuleRegistrarOption {
	return func(opts *moduleRegistrarOptions) {
		if opts == nil {
			return
		}
		opts.translationCapabilityMenuMode = normalizeTranslationCapabilityMenuMode(mode)
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
		sidebarUtilityMenuCode:        admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode),
		translationCapabilityMenuMode: TranslationCapabilityMenuModeTools,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(&options)
		}
	}

	if options.gates == nil && adm != nil {
		options.gates = adm.FeatureGate()
	}
	filtered, err := filterModulesForRegistrarWithLogger(
		modules,
		options.gates,
		options.onDisabled,
		resolveQuickstartAdminLogger(adm, "quickstart.modules", nil, nil),
	)
	if err != nil {
		return err
	}
	ordered, err := orderModules(filtered)
	if err != nil {
		return err
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

	if err := preSeedContentTypeBuilder(adm, cfg, ordered); err != nil {
		return err
	}

	if options.seed && options.seedOpts.MenuSvc != nil {
		mainMenuCode := admin.NormalizeMenuSlug(strings.TrimSpace(options.seedOpts.MenuCode))
		if mainMenuCode == "" {
			mainMenuCode = admin.NormalizeMenuSlug(menuCode)
		}
		if mainMenuCode == "" {
			mainMenuCode = admin.NormalizeMenuSlug(DefaultNavMenuCode)
		}
		menuLocale := strings.TrimSpace(options.seedOpts.Locale)
		if menuLocale == "" {
			menuLocale = locale
		}
		if menuLocale == "" {
			menuLocale = "en"
		}

		baseItems := append([]admin.MenuItem{}, options.menuItems...)
		baseItems = append(baseItems, normalizeToolsMenuItems(options.toolsMenuItems, mainMenuCode, menuLocale)...)
		if options.translationCapabilityMenuMode == TranslationCapabilityMenuModeTools {
			baseItems = append(baseItems, translationCapabilityMenuItems(adm, cfg, mainMenuCode, menuLocale)...)
		}

		items := buildSeedMenuItems(mainMenuCode, menuLocale, ordered, baseItems)
		primarySeedOpts := options.seedOpts
		primarySeedOpts.MenuCode = mainMenuCode
		primarySeedOpts.Locale = menuLocale
		primarySeedOpts.Items = items
		if err := SeedNavigation(options.ctx, primarySeedOpts); err != nil {
			return err
		}

		utilityItems := append([]admin.MenuItem{}, options.sidebarUtilityMenuItems...)
		if options.defaultSidebarUtilityMenu {
			utilityItems = append(utilityItems, defaultSidebarUtilityMenuItems(adm, cfg, "", menuLocale)...)
		}
		utilityItems = dedupeMenuItems(utilityItems)
		if len(utilityItems) > 0 {
			utilityMenuCode := admin.NormalizeMenuSlug(strings.TrimSpace(options.sidebarUtilityMenuCode))
			if utilityMenuCode == "" {
				utilityMenuCode = DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, DefaultSidebarUtilityMenuCode)
			}
			utilitySeedOpts := options.seedOpts
			utilitySeedOpts.MenuCode = utilityMenuCode
			utilitySeedOpts.Locale = menuLocale
			utilitySeedOpts.Items = normalizeMenuItemsForMenu(utilityItems, utilityMenuCode, menuLocale)
			if err := SeedNavigation(options.ctx, utilitySeedOpts); err != nil {
				return err
			}
		}

		if err := runMenuSeedHooks(options.ctx, adm, ordered); err != nil {
			return err
		}
	}

	return nil
}

func preSeedContentTypeBuilder(adm *admin.Admin, cfg admin.Config, modules []admin.Module) error {
	if adm == nil || len(modules) == 0 {
		return nil
	}
	for _, mod := range modules {
		builder, ok := mod.(*admin.ContentTypeBuilderModule)
		if !ok || builder == nil {
			continue
		}
		err := builder.Register(admin.ModuleContext{
			Admin:           adm,
			Router:          adm.PublicRouter(),
			PublicRouter:    adm.PublicRouter(),
			ProtectedRouter: adm.ProtectedRouter(),
			Locale:          strings.TrimSpace(cfg.DefaultLocale),
		})
		if err != nil && !errors.Is(err, admin.ErrFeatureDisabled) {
			return err
		}
	}
	return nil
}

func runMenuSeedHooks(ctx context.Context, adm *admin.Admin, modules []admin.Module) error {
	if adm == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	for _, mod := range modules {
		hook, ok := mod.(menuSeedHook)
		if !ok || hook == nil {
			continue
		}
		if err := hook.AfterMenuSeed(ctx, adm); err != nil {
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

func filterModulesForRegistrar(mods []admin.Module, gates fggate.FeatureGate, onDisabled func(feature, moduleID string) error) ([]admin.Module, error) {
	return filterModulesForRegistrarWithLogger(mods, gates, onDisabled, nil)
}

func filterModulesForRegistrarWithLogger(mods []admin.Module, gates fggate.FeatureGate, onDisabled func(feature, moduleID string) error, logger admin.Logger) ([]admin.Module, error) {
	if gates == nil {
		return mods, nil
	}
	if onDisabled == nil {
		logger = resolveQuickstartNamedLogger("quickstart.modules", nil, logger)
		onDisabled = func(feature, moduleID string) error {
			logger.Warn("module skipped: feature disabled",
				"module_id", moduleID,
				"feature", feature,
			)
			return nil
		}
	}

	filtered := make([]admin.Module, 0, len(mods))
	for _, mod := range mods {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		id := strings.TrimSpace(manifest.ID)
		if id == "" {
			return nil, fmt.Errorf("module missing ID")
		}
		disabled := false
		for _, flag := range manifest.FeatureFlags {
			enabled, err := gates.Enabled(context.Background(), flag, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
			if err != nil {
				return nil, err
			}
			if enabled {
				continue
			}
			disabled = true
			if err := onDisabled(flag, id); err != nil {
				return nil, err
			}
			break
		}
		if disabled {
			continue
		}
		filtered = append(filtered, mod)
	}

	index := map[string]admin.Module{}
	for _, mod := range filtered {
		if mod == nil {
			continue
		}
		id := strings.TrimSpace(mod.Manifest().ID)
		if id == "" {
			return nil, fmt.Errorf("module missing ID")
		}
		if _, exists := index[id]; exists {
			return nil, fmt.Errorf("duplicate module ID %s", id)
		}
		index[id] = mod
	}

	removed := true
	for removed {
		removed = false
		for _, mod := range filtered {
			if mod == nil {
				continue
			}
			manifest := mod.Manifest()
			id := strings.TrimSpace(manifest.ID)
			if _, ok := index[id]; !ok {
				continue
			}
			for _, dep := range manifest.Dependencies {
				if _, ok := index[dep]; !ok {
					delete(index, id)
					removed = true
					if err := onDisabled("dependency:"+dep, id); err != nil {
						return nil, err
					}
					break
				}
			}
		}
	}

	out := make([]admin.Module, 0, len(index))
	for _, mod := range filtered {
		if mod == nil {
			continue
		}
		id := strings.TrimSpace(mod.Manifest().ID)
		if _, ok := index[id]; ok {
			out = append(out, mod)
		}
	}
	return out, nil
}

func buildSeedMenuItems(menuCode, locale string, modules []admin.Module, baseItems []admin.MenuItem) []admin.MenuItem {
	items := append([]admin.MenuItem{}, DefaultMenuParents(menuCode)...)
	items = append(items, baseItems...)
	for _, mod := range modules {
		if mod == nil {
			continue
		}
		if contributor, ok := mod.(interface{ MenuItems(string) []admin.MenuItem }); ok {
			items = append(items, contributor.MenuItems(locale)...)
		}
	}
	return dedupeMenuItems(items)
}

func dedupeMenuItems(items []admin.MenuItem) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	seen := map[string]bool{}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		keys := dedupeMenuItemKeys(item)
		duplicate := false
		for _, key := range keys {
			if seen[key] {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue
		}
		for _, key := range keys {
			seen[key] = true
		}
		out = append(out, item)
	}
	return out
}

func dedupeMenuItemKeys(item admin.MenuItem) []string {
	keys := []string{}
	if id := strings.TrimSpace(item.ID); id != "" {
		keys = append(keys, "id:"+id)
	}
	if item.Target != nil {
		if key, ok := item.Target["key"].(string); ok {
			if key = strings.TrimSpace(key); key != "" {
				keys = append(keys, "target:"+key)
			}
		}
		if pathValue, ok := item.Target["path"].(string); ok {
			if pathValue = strings.TrimSpace(pathValue); pathValue != "" {
				keys = append(keys, "path:"+pathValue)
			}
		}
	}
	if len(keys) == 0 {
		// Preserve previous behavior for entries with no explicit identity.
		fallback := strings.TrimSpace(item.Type) + "|" + strings.TrimSpace(item.Label) + "|" +
			strings.TrimSpace(item.LabelKey) + "|" + strings.TrimSpace(item.ParentID) + "|" + strings.TrimSpace(item.Menu)
		if fallback == "||||" {
			fallback = fmt.Sprintf("anon:%s", strings.TrimSpace(item.GroupTitle))
		}
		return []string{"anon:" + fallback}
	}
	return keys
}

func normalizeToolsMenuItems(items []admin.MenuItem, menuCode, locale string) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		normalized := item
		if strings.TrimSpace(normalized.ParentID) == "" {
			normalized.ParentID = NavigationGroupToolsID
		}
		if strings.TrimSpace(normalized.Menu) == "" {
			normalized.Menu = menuCode
		}
		if strings.TrimSpace(normalized.Locale) == "" {
			normalized.Locale = locale
		}
		out = append(out, normalized)
	}
	return out
}

func normalizeMenuItemsForMenu(items []admin.MenuItem, menuCode, locale string) []admin.MenuItem {
	if len(items) == 0 {
		return nil
	}
	out := make([]admin.MenuItem, 0, len(items))
	for _, item := range items {
		normalized := item
		normalized.Menu = menuCode
		if strings.TrimSpace(normalized.Locale) == "" {
			normalized.Locale = locale
		}
		out = append(out, normalized)
	}
	return out
}

func translationCapabilityMenuItems(adm *admin.Admin, cfg admin.Config, menuCode, locale string) []admin.MenuItem {
	if adm == nil {
		return nil
	}
	exposure := resolveTranslationModuleExposureSnapshot(adm, nil)
	queueEnabled := exposure.Queue.CapabilityEnabled
	exchangeEnabled := exposure.Exchange.CapabilityEnabled
	if !queueEnabled && !exchangeEnabled {
		return nil
	}

	menuCode = strings.TrimSpace(menuCode)
	if menuCode == "" {
		menuCode = DefaultNavMenuCode
	}
	if strings.TrimSpace(locale) == "" {
		locale = cfg.DefaultLocale
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}

	urls := adm.URLs()
	basePath := resolveAdminBasePath(urls, cfg.BasePath)
	parentID := NavigationGroupTranslationsID
	items := []admin.MenuItem{}

	if queueEnabled {
		// TODO: Use proper URL management
		dashboardPath := strings.TrimSpace(resolveRoutePath(urls, "admin", "translations.dashboard"))
		if dashboardPath == "" {
			dashboardPath = prefixBasePath(basePath, path.Join("translations", "dashboard"))
		}
		items = append(items, admin.MenuItem{
			ID:       parentID + ".translations.dashboard",
			Type:     admin.MenuItemTypeItem,
			Label:    "Translation Dashboard",
			LabelKey: "menu.translations.dashboard",
			Icon:     "dashboard-dots",
			Target: map[string]any{
				"type": "url",
				"path": dashboardPath,
				"name": "admin.translations.dashboard",
				"key":  "translation_dashboard",
			},
			Position: intPtr(49),
			ParentID: parentID,
			Menu:     menuCode,
			Locale:   locale,
		})

		queuePath := strings.TrimSpace(resolveAdminPanelURL(urls, cfg.BasePath, "translations"))
		if queuePath == "" {
			queuePath = prefixBasePath(basePath, path.Join("content", "translations"))
		}
		items = append(items, admin.MenuItem{
			ID:       parentID + ".translations.queue",
			Type:     admin.MenuItemTypeItem,
			Label:    "Translation Queue",
			LabelKey: "menu.translations.queue",
			Icon:     "language",
			Target: map[string]any{
				"type": "url",
				"path": queuePath,
				"name": "admin.translations.queue",
				"key":  "translations",
			},
			Position: intPtr(50),
			ParentID: parentID,
			Menu:     menuCode,
			Locale:   locale,
		})
	}

	if exchangeEnabled {
		exchangePath := strings.TrimSpace(resolveRoutePath(urls, "admin", "translations.exchange"))
		if exchangePath == "" {
			exchangePath = prefixBasePath(basePath, path.Join("translations", "exchange"))
		}
		items = append(items, admin.MenuItem{
			ID:       parentID + ".translations.exchange",
			Type:     admin.MenuItemTypeItem,
			Label:    "Translation Exchange",
			LabelKey: "menu.translations.exchange",
			Icon:     "translate",
			Target: map[string]any{
				"type": "url",
				"path": exchangePath,
				"name": "admin.translations.exchange",
				"key":  "translation_exchange",
			},
			Position: intPtr(51),
			ParentID: parentID,
			Menu:     menuCode,
			Locale:   locale,
		})
	}

	return items
}

func defaultSidebarUtilityMenuItems(adm *admin.Admin, cfg admin.Config, menuCode, locale string) []admin.MenuItem {
	menuCode = admin.NormalizeMenuSlug(strings.TrimSpace(menuCode))
	if menuCode == "" {
		menuCode = admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode)
	}
	if strings.TrimSpace(locale) == "" {
		locale = cfg.DefaultLocale
	}
	if strings.TrimSpace(locale) == "" {
		locale = "en"
	}
	var urls urlkit.Resolver
	if adm != nil {
		urls = adm.URLs()
	}
	basePath := resolveAdminBasePath(urls, cfg.BasePath)
	resolvePath := func(routeName string, fallbackSegments ...string) string {
		pathValue := strings.TrimSpace(resolveRoutePath(urls, "admin", routeName))
		if pathValue != "" {
			return pathValue
		}
		if len(fallbackSegments) == 0 {
			return ""
		}
		return prefixBasePath(basePath, path.Join(fallbackSegments...))
	}
	featureIsEnabled := func(feature admin.FeatureKey) bool {
		if adm == nil {
			return true
		}
		return featureEnabled(adm.FeatureGate(), string(feature))
	}

	out := make([]admin.MenuItem, 0, 4)
	if featureIsEnabled(admin.FeatureSettings) {
		out = append(out, admin.MenuItem{
			ID:       "utility.settings",
			Type:     admin.MenuItemTypeItem,
			Label:    "Settings",
			LabelKey: "menu.settings",
			Icon:     "settings",
			Target: map[string]any{
				"type": "url",
				"path": resolvePath("settings", "settings"),
				"name": "admin.settings",
				"key":  "settings",
			},
			Position: intPtr(10),
			Menu:     menuCode,
			Locale:   locale,
		})
	}
	if featureIsEnabled(admin.FeaturePreferences) {
		out = append(out, admin.MenuItem{
			ID:       "utility.preferences",
			Type:     admin.MenuItemTypeItem,
			Label:    "Preferences",
			LabelKey: "menu.preferences",
			Icon:     "user-circle",
			Target: map[string]any{
				"type": "url",
				"path": resolvePath("preferences", "preferences"),
				"name": "admin.preferences",
				"key":  "preferences",
			},
			Position: intPtr(20),
			Menu:     menuCode,
			Locale:   locale,
		})
	}
	if featureIsEnabled(admin.FeatureProfile) {
		out = append(out, admin.MenuItem{
			ID:       "utility.profile",
			Type:     admin.MenuItemTypeItem,
			Label:    "Profile",
			LabelKey: "menu.profile",
			Icon:     "user",
			Target: map[string]any{
				"type": "url",
				"path": resolvePath("profile", "profile"),
				"name": "admin.profile",
				"key":  "profile",
			},
			Position: intPtr(30),
			Menu:     menuCode,
			Locale:   locale,
		})
	}
	out = append(out, admin.MenuItem{
		ID:       "utility.help",
		Type:     admin.MenuItemTypeItem,
		Label:    "Help",
		LabelKey: "menu.help",
		Icon:     "question-mark",
		Target: map[string]any{
			"type": "url",
			"path": resolvePath("help", "help"),
			"name": "admin.help",
			"key":  "help",
		},
		Position: intPtr(40),
		Menu:     menuCode,
		Locale:   locale,
	})
	return out
}

func normalizeTranslationCapabilityMenuMode(mode TranslationCapabilityMenuMode) TranslationCapabilityMenuMode {
	switch TranslationCapabilityMenuMode(strings.ToLower(strings.TrimSpace(string(mode)))) {
	case TranslationCapabilityMenuModeTools:
		return TranslationCapabilityMenuModeTools
	default:
		return TranslationCapabilityMenuModeNone
	}
}
