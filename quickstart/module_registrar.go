package quickstart

import (
	"context"
	"fmt"
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

type moduleRegistrarSeedRuntime struct {
	adm      *admin.Admin
	cfg      admin.Config
	options  moduleRegistrarOptions
	ordered  []admin.Module
	menuCode string
	locale   string
}

type translationCapabilityMenuItemSpec struct {
	ID             string
	Label          string
	LabelKey       string
	Icon           string
	RouteName      string
	FallbackPanel  []string
	Name           string
	Key            string
	Breadcrumb     string
	Position       int
	EntryEnabled   bool
	DisabledReason string
	ReasonCode     string
}

type sidebarUtilityMenuItemSpec struct {
	ID        string
	Label     string
	LabelKey  string
	Icon      string
	RouteName string
	RoutePath []string
	Name      string
	Key       string
	Position  int
	Feature   admin.FeatureKey
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

	seedRuntime := moduleRegistrarSeedRuntime{
		adm:      adm,
		cfg:      cfg,
		options:  options,
		ordered:  ordered,
		menuCode: menuCode,
		locale:   locale,
	}
	if err := seedRuntime.seedNavigation(); err != nil {
		return err
	}

	return nil
}

func (runtime moduleRegistrarSeedRuntime) seedNavigation() error {
	if !runtime.options.seed || runtime.options.seedOpts.MenuSvc == nil {
		return nil
	}
	mainMenuCode := runtime.mainMenuCode()
	menuLocale := runtime.menuLocale()
	if err := runtime.seedPrimaryMenu(mainMenuCode, menuLocale); err != nil {
		return err
	}
	if err := runtime.seedUtilityMenu(menuLocale); err != nil {
		return err
	}
	return runMenuSeedHooks(runtime.options.ctx, runtime.adm, runtime.ordered)
}

func (runtime moduleRegistrarSeedRuntime) mainMenuCode() string {
	mainMenuCode := admin.NormalizeMenuSlug(strings.TrimSpace(runtime.options.seedOpts.MenuCode))
	if mainMenuCode != "" {
		return mainMenuCode
	}
	mainMenuCode = admin.NormalizeMenuSlug(runtime.menuCode)
	if mainMenuCode != "" {
		return mainMenuCode
	}
	return admin.NormalizeMenuSlug(DefaultNavMenuCode)
}

func (runtime moduleRegistrarSeedRuntime) menuLocale() string {
	menuLocale := strings.TrimSpace(runtime.options.seedOpts.Locale)
	if menuLocale != "" {
		return menuLocale
	}
	if runtime.locale != "" {
		return runtime.locale
	}
	return "en"
}

func (runtime moduleRegistrarSeedRuntime) seedPrimaryMenu(mainMenuCode, menuLocale string) error {
	baseItems := append([]admin.MenuItem{}, runtime.options.menuItems...)
	baseItems = append(baseItems, normalizeToolsMenuItems(runtime.options.toolsMenuItems, mainMenuCode, menuLocale)...)
	if runtime.options.translationCapabilityMenuMode == TranslationCapabilityMenuModeTools {
		baseItems = append(baseItems, translationCapabilityMenuItems(runtime.adm, runtime.cfg, mainMenuCode, menuLocale)...)
	}

	primarySeedOpts := runtime.options.seedOpts
	primarySeedOpts.MenuCode = mainMenuCode
	primarySeedOpts.Locale = menuLocale
	primarySeedOpts.Items = buildSeedMenuItems(mainMenuCode, menuLocale, runtime.ordered, baseItems)
	return SeedNavigation(runtime.options.ctx, primarySeedOpts)
}

func (runtime moduleRegistrarSeedRuntime) seedUtilityMenu(menuLocale string) error {
	utilityItems := runtime.utilityMenuItems(menuLocale)
	if len(utilityItems) == 0 {
		return nil
	}
	utilityMenuCode := runtime.utilityMenuCode()
	utilitySeedOpts := runtime.options.seedOpts
	utilitySeedOpts.MenuCode = utilityMenuCode
	utilitySeedOpts.Locale = menuLocale
	utilitySeedOpts.Items = normalizeMenuItemsForMenu(utilityItems, utilityMenuCode, menuLocale)
	return SeedNavigation(runtime.options.ctx, utilitySeedOpts)
}

func (runtime moduleRegistrarSeedRuntime) utilityMenuItems(menuLocale string) []admin.MenuItem {
	utilityItems := append([]admin.MenuItem{}, runtime.options.sidebarUtilityMenuItems...)
	if runtime.options.defaultSidebarUtilityMenu {
		utilityItems = append(utilityItems, defaultSidebarUtilityMenuItems(runtime.adm, runtime.cfg, "", menuLocale)...)
	}
	return dedupeMenuItems(utilityItems)
}

func (runtime moduleRegistrarSeedRuntime) utilityMenuCode() string {
	utilityMenuCode := admin.NormalizeMenuSlug(strings.TrimSpace(runtime.options.sidebarUtilityMenuCode))
	if utilityMenuCode != "" {
		return utilityMenuCode
	}
	return DefaultPlacements(runtime.cfg).MenuCodeFor(SidebarPlacementUtility, DefaultSidebarUtilityMenuCode)
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
	onDisabled = resolveModuleDisabledHandler(onDisabled, logger)
	filtered, err := filterModulesByFeatureFlags(mods, gates, onDisabled)
	if err != nil {
		return nil, err
	}
	index, err := moduleIndex(filtered)
	if err != nil {
		return nil, err
	}
	if err := pruneModulesWithMissingDependencies(filtered, index, onDisabled); err != nil {
		return nil, err
	}
	return modulesInIndexOrder(filtered, index), nil
}

func resolveModuleDisabledHandler(onDisabled func(feature, moduleID string) error, logger admin.Logger) func(feature, moduleID string) error {
	if onDisabled != nil {
		return onDisabled
	}
	logger = resolveQuickstartNamedLogger("quickstart.modules", nil, logger)
	return func(feature, moduleID string) error {
		logger.Warn("module skipped: feature disabled",
			"module_id", moduleID,
			"feature", feature,
		)
		return nil
	}
}

func filterModulesByFeatureFlags(mods []admin.Module, gates fggate.FeatureGate, onDisabled func(feature, moduleID string) error) ([]admin.Module, error) {
	filtered := make([]admin.Module, 0, len(mods))
	for _, mod := range mods {
		id, disabled, err := moduleDisabledByFeatureFlag(mod, gates, onDisabled)
		if err != nil {
			return nil, err
		}
		if mod == nil || id == "" || disabled {
			continue
		}
		filtered = append(filtered, mod)
	}
	return filtered, nil
}

func moduleDisabledByFeatureFlag(mod admin.Module, gates fggate.FeatureGate, onDisabled func(feature, moduleID string) error) (string, bool, error) {
	if mod == nil {
		return "", false, nil
	}
	manifest := mod.Manifest()
	id := strings.TrimSpace(manifest.ID)
	if id == "" {
		return "", false, fmt.Errorf("module missing ID")
	}
	for _, flag := range manifest.FeatureFlags {
		enabled, err := gates.Enabled(context.Background(), flag, fggate.WithScopeChain(fggate.ScopeChain{{Kind: fggate.ScopeSystem}}))
		if err != nil {
			return "", false, err
		}
		if enabled {
			continue
		}
		if err := onDisabled(flag, id); err != nil {
			return "", false, err
		}
		return id, true, nil
	}
	return id, false, nil
}

func moduleIndex(mods []admin.Module) (map[string]admin.Module, error) {
	index := map[string]admin.Module{}
	for _, mod := range mods {
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
	return index, nil
}

func pruneModulesWithMissingDependencies(mods []admin.Module, index map[string]admin.Module, onDisabled func(feature, moduleID string) error) error {
	removed := true
	for removed {
		var err error
		removed, err = pruneMissingDependencyPass(mods, index, onDisabled)
		if err != nil {
			return err
		}
	}
	return nil
}

func pruneMissingDependencyPass(mods []admin.Module, index map[string]admin.Module, onDisabled func(feature, moduleID string) error) (bool, error) {
	for _, mod := range mods {
		if mod == nil {
			continue
		}
		manifest := mod.Manifest()
		id := strings.TrimSpace(manifest.ID)
		if _, ok := index[id]; !ok {
			continue
		}
		for _, dep := range manifest.Dependencies {
			if _, ok := index[dep]; ok {
				continue
			}
			delete(index, id)
			if err := onDisabled("dependency:"+dep, id); err != nil {
				return false, err
			}
			return true, nil
		}
	}
	return false, nil
}

func modulesInIndexOrder(mods []admin.Module, index map[string]admin.Module) []admin.Module {
	out := make([]admin.Module, 0, len(index))
	for _, mod := range mods {
		if mod == nil {
			continue
		}
		id := strings.TrimSpace(mod.Manifest().ID)
		if _, ok := index[id]; ok {
			out = append(out, mod)
		}
	}
	return out
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
	if key := stringTargetValue(item.Target, "key"); key != "" {
		keys = append(keys, "target:"+key)
	}
	if pathValue := stringTargetValue(item.Target, "path"); pathValue != "" {
		keys = append(keys, "path:"+pathValue)
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

func stringTargetValue(target map[string]any, key string) string {
	if target == nil {
		return ""
	}
	value, ok := target[key].(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(value)
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

	parentID := NavigationGroupTranslationsID
	items := []admin.MenuItem{}

	if queueEnabled {
		items = append(items, translationCapabilityMenuItem(adm, cfg, parentID, menuCode, locale, translationCapabilityMenuItemSpec{
			ID:             "translations.dashboard",
			Label:          "Translation Dashboard",
			LabelKey:       "menu.translations.dashboard",
			Icon:           "dashboard-dots",
			RouteName:      "translations.dashboard",
			Name:           "admin.translations.dashboard",
			Key:            "translation_dashboard",
			Breadcrumb:     "Translations",
			Position:       49,
			EntryEnabled:   exposure.Queue.EntryEnabled,
			DisabledReason: exposure.Queue.Reason,
			ReasonCode:     exposure.Queue.ReasonCode,
		}))
		items = append(items, translationCapabilityMenuItem(adm, cfg, parentID, menuCode, locale, translationCapabilityMenuItemSpec{
			ID:             "translations.queue",
			Label:          "Translation Queue",
			LabelKey:       "menu.translations.queue",
			Icon:           "language",
			RouteName:      "translations.queue",
			Name:           "admin.translations.queue",
			Key:            "translation_queue",
			Breadcrumb:     "Queue",
			Position:       50,
			EntryEnabled:   exposure.Queue.EntryEnabled,
			DisabledReason: exposure.Queue.Reason,
			ReasonCode:     exposure.Queue.ReasonCode,
		}))
	}

	if exchangeEnabled {
		items = append(items, translationCapabilityMenuItem(adm, cfg, parentID, menuCode, locale, translationCapabilityMenuItemSpec{
			ID:             "translations.exchange",
			Label:          "Translation Exchange",
			LabelKey:       "menu.translations.exchange",
			Icon:           "translate",
			RouteName:      "translations.exchange",
			Name:           "admin.translations.exchange",
			Key:            "translation_exchange",
			Breadcrumb:     "Exchange",
			Position:       51,
			EntryEnabled:   exposure.Exchange.EntryEnabled,
			DisabledReason: exposure.Exchange.Reason,
			ReasonCode:     exposure.Exchange.ReasonCode,
		}))
	}

	return items
}

func translationCapabilityMenuItem(
	adm *admin.Admin,
	cfg admin.Config,
	parentID string,
	menuCode string,
	locale string,
	spec translationCapabilityMenuItemSpec,
) admin.MenuItem {
	return admin.MenuItem{
		ID:       parentID + "." + spec.ID,
		Type:     admin.MenuItemTypeItem,
		Label:    spec.Label,
		LabelKey: spec.LabelKey,
		Icon:     spec.Icon,
		Target: map[string]any{
			"type":                 "url",
			"path":                 resolveTranslationCapabilityMenuPath(adm.URLs(), cfg.BasePath, spec.RouteName),
			"name":                 spec.Name,
			"key":                  spec.Key,
			"breadcrumb_label":     spec.Breadcrumb,
			"enabled":              spec.EntryEnabled,
			"disabled_reason":      spec.DisabledReason,
			"disabled_reason_code": spec.ReasonCode,
		},
		Position: intPtr(spec.Position),
		ParentID: parentID,
		Menu:     menuCode,
		Locale:   locale,
	}
}

func resolveTranslationCapabilityMenuPath(urls urlkit.Resolver, fallbackBase, routeName string) string {
	switch strings.TrimSpace(routeName) {
	case "translations.dashboard":
		return resolveAdminRouteURL(urls, fallbackBase, routeName, "translations", "dashboard")
	case "translations.queue":
		if resolved := strings.TrimSpace(resolveRouteURL(urls, "admin", routeName, nil, nil)); resolved != "" {
			return resolved
		}
		return resolveAdminPanelURL(urls, fallbackBase, "translations")
	case "translations.exchange":
		return resolveAdminRouteURL(urls, fallbackBase, routeName, "translations", "exchange")
	default:
		return resolveAdminRouteURL(urls, fallbackBase, routeName)
	}
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
	featureIsEnabled := func(feature admin.FeatureKey) bool {
		if adm == nil {
			return true
		}
		return featureEnabled(adm.FeatureGate(), string(feature))
	}

	out := make([]admin.MenuItem, 0, 4)
	for _, spec := range sidebarUtilityMenuItemSpecs() {
		if spec.Feature != "" && !featureIsEnabled(spec.Feature) {
			continue
		}
		out = append(out, sidebarUtilityMenuItem(urls, cfg, menuCode, locale, spec))
	}
	return out
}

func sidebarUtilityMenuItemSpecs() []sidebarUtilityMenuItemSpec {
	return []sidebarUtilityMenuItemSpec{
		{
			ID: "utility.settings", Label: "Settings", LabelKey: "menu.settings", Icon: "settings",
			RouteName: "settings", RoutePath: []string{"settings"}, Name: "admin.settings", Key: "settings",
			Position: 10, Feature: admin.FeatureSettings,
		},
		{
			ID: "utility.preferences", Label: "Preferences", LabelKey: "menu.preferences", Icon: "user-circle",
			RouteName: "preferences", RoutePath: []string{"preferences"}, Name: "admin.preferences", Key: "preferences",
			Position: 20, Feature: admin.FeaturePreferences,
		},
		{
			ID: "utility.profile", Label: "Profile", LabelKey: "menu.profile", Icon: "user",
			RouteName: "profile", RoutePath: []string{"profile"}, Name: "admin.profile", Key: "profile",
			Position: 30, Feature: admin.FeatureProfile,
		},
		{
			ID: "utility.help", Label: "Help", LabelKey: "menu.help", Icon: "question-mark",
			RouteName: "help", RoutePath: []string{"help"}, Name: "admin.help", Key: "help",
			Position: 40,
		},
	}
}

func sidebarUtilityMenuItem(
	urls urlkit.Resolver,
	cfg admin.Config,
	menuCode string,
	locale string,
	spec sidebarUtilityMenuItemSpec,
) admin.MenuItem {
	return admin.MenuItem{
		ID:       spec.ID,
		Type:     admin.MenuItemTypeItem,
		Label:    spec.Label,
		LabelKey: spec.LabelKey,
		Icon:     spec.Icon,
		Target: map[string]any{
			"type": "url",
			"path": resolveAdminRouteURL(urls, cfg.BasePath, spec.RouteName, spec.RoutePath...),
			"name": spec.Name,
			"key":  spec.Key,
		},
		Position: intPtr(spec.Position),
		Menu:     menuCode,
		Locale:   locale,
	}
}

func normalizeTranslationCapabilityMenuMode(mode TranslationCapabilityMenuMode) TranslationCapabilityMenuMode {
	switch TranslationCapabilityMenuMode(strings.ToLower(strings.TrimSpace(string(mode)))) {
	case TranslationCapabilityMenuModeTools:
		return TranslationCapabilityMenuModeTools
	default:
		return TranslationCapabilityMenuModeNone
	}
}
