package quickstart

import (
	"context"
	"net/url"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	uiplacement "github.com/goliatone/go-admin/ui/placement"
	urlkit "github.com/goliatone/go-urlkit"
	"github.com/goliatone/go-users/command"
)

type allowAllQuickstartAuthorizer struct{}

func (allowAllQuickstartAuthorizer) Can(context.Context, string, string) bool { return true }

type denyAllQuickstartAuthorizer struct{}

func (denyAllQuickstartAuthorizer) Can(context.Context, string, string) bool { return false }

type denyDebugQuickstartAuthorizer struct{}

func (denyDebugQuickstartAuthorizer) Can(_ context.Context, action, _ string) bool {
	return strings.TrimSpace(action) != "admin.debug.view"
}

func TestBuildNavItemsOrdering(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	nav := adm.Navigation()
	nav.UseCMS(false)
	nav.AddFallback(
		admin.NavigationItem{Label: "Second", Position: intPtr(2)},
		admin.NavigationItem{Label: "First", Position: intPtr(1)},
		admin.NavigationItem{
			ID:          "parent",
			Label:       "Parent",
			Collapsible: true,
			Position:    intPtr(5),
			Children: []admin.NavigationItem{
				{Label: "ChildB", Position: intPtr(2)},
				{Label: "ChildA", Position: intPtr(1)},
				{Label: "ChildAuto"},
			},
		},
	)

	items := BuildNavItems(adm, cfg, ctx, "")
	if len(items) != 3 {
		t.Fatalf("expected 3 root items, got %d", len(items))
	}
	if items[0]["label"] != "First" || items[1]["label"] != "Second" {
		t.Fatalf("unexpected root order: %v, %v", items[0]["label"], items[1]["label"])
	}

	parent := items[2]
	children, ok := parent["children"].([]map[string]any)
	if !ok {
		t.Fatalf("expected children slice, got %T", parent["children"])
	}
	expected := []string{"ChildA", "ChildB", "ChildAuto"}
	if len(children) != len(expected) {
		t.Fatalf("expected %d children, got %d", len(expected), len(children))
	}
	for i, child := range children {
		if child["label"] != expected[i] {
			t.Fatalf("child %d expected %s, got %v", i, expected[i], child["label"])
		}
	}
}

func TestWithNavInjectsThemeAndSession(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	ctx := context.Background()

	view := WithNav(nil, adm, cfg, "", ctx)
	if view["session_user"] == nil {
		t.Fatalf("expected session_user in view context")
	}
	if view["theme"] == nil {
		t.Fatalf("expected theme in view context")
	}
	if view["nav_items"] == nil {
		t.Fatalf("expected nav_items in view context")
	}
	if view["nav_utility_items"] == nil {
		t.Fatalf("expected nav_utility_items in view context")
	}
	if view["asset_base_path"] == nil {
		t.Fatalf("expected asset_base_path in view context")
	}
	if view["translation_capabilities"] == nil {
		t.Fatalf("expected translation_capabilities in view context")
	}
	if _, ok := view["activity_enabled"].(bool); !ok {
		t.Fatalf("expected activity_enabled boolean in view context")
	}
	if _, ok := view["activity_feature_enabled"].(bool); !ok {
		t.Fatalf("expected activity_feature_enabled boolean in view context")
	}
	if available, ok := view["users_import_available"].(bool); !ok || available {
		t.Fatalf("expected users_import_available=false by default, got %v", view["users_import_available"])
	}
	if enabled, ok := view["users_import_enabled"].(bool); !ok || enabled {
		t.Fatalf("expected users_import_enabled=false by default, got %v", view["users_import_enabled"])
	}
}

func TestWithNavCarriesConfiguredLogoURLIntoThemeAssets(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
		ThemeAssets: map[string]string{
			"icon": "/brand/icon.svg",
		},
		LogoURL:    "/brand/logo.svg",
		FaviconURL: "/brand/favicon.svg",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}

	view := WithNav(nil, adm, cfg, "", context.Background())
	theme, ok := view["theme"].(map[string]map[string]string)
	if !ok {
		t.Fatalf("expected theme payload, got %T", view["theme"])
	}
	assets := theme["assets"]
	if assets["logo"] != "/brand/logo.svg" {
		t.Fatalf("expected theme assets logo override, got %q", assets["logo"])
	}
	if assets["icon"] != "/brand/icon.svg" {
		t.Fatalf("expected theme assets icon override, got %q", assets["icon"])
	}
	if assets["favicon"] != "/brand/favicon.svg" {
		t.Fatalf("expected theme assets favicon override, got %q", assets["favicon"])
	}
}

func TestWithNavIncludesUsersImportFlagsWhenConfigured(t *testing.T) {
	resetCommandRegistryForTest(t)
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{
		BulkUserImport: &command.BulkUserImportCommand{},
	})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	view := WithNav(nil, adm, cfg, "", context.Background())
	if available, ok := view["users_import_available"].(bool); !ok || !available {
		t.Fatalf("expected users_import_available=true when command is configured, got %v", view["users_import_available"])
	}
	if enabled, ok := view["users_import_enabled"].(bool); !ok || !enabled {
		t.Fatalf("expected users_import_enabled=true when command is configured, got %v", view["users_import_enabled"])
	}
}

func TestResolveNavTargetUsesURLKitRoute(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/console",
				Routes: map[string]string{
					"dashboard": "/",
					"settings":  "/settings",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("urlkit config: %v", err)
	}

	href, key, _ := resolveNavTarget(map[string]any{
		"name": "admin.settings",
	}, "/admin", manager, navRequestScope{})

	if href != "/console/settings" {
		t.Fatalf("expected urlkit path, got %q", href)
	}
	if key != "settings" {
		t.Fatalf("expected key settings, got %q", key)
	}
}

func TestResolveNavTargetPrefersLocalizedURLOverrideAndAppliesRequestScope(t *testing.T) {
	href, key, _ := resolveNavTarget(map[string]any{
		"url":  "/sobre-nosotros",
		"path": "/about",
		"key":  "about",
	}, "/admin", nil, navRequestScope{
		Locale:  "es",
		Channel: "preview",
	})

	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if parsed.Path != "/sobre-nosotros" {
		t.Fatalf("expected localized url override path /sobre-nosotros, got %q", parsed.Path)
	}
	if got := strings.TrimSpace(parsed.Query().Get("locale")); got != "es" {
		t.Fatalf("expected locale query es, got %q", got)
	}
	if got := strings.TrimSpace(parsed.Query().Get(admin.ContentChannelScopeQueryParam)); got != "preview" {
		t.Fatalf("expected %s query preview, got %q", admin.ContentChannelScopeQueryParam, got)
	}
	if key != "about" {
		t.Fatalf("expected key about, got %q", key)
	}
}

func TestDefaultPlacementsIncludeSidebarUtilityMenu(t *testing.T) {
	cfg := admin.Config{NavMenuCode: "admin.main"}
	placements := DefaultPlacements(cfg)
	code := placements.MenuCodeFor(SidebarPlacementUtility, "")
	if code == "" {
		t.Fatalf("expected non-empty sidebar utility menu code")
	}
	if code != admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode) {
		t.Fatalf("expected sidebar utility menu code %q, got %q", admin.NormalizeMenuSlug(DefaultSidebarUtilityMenuCode), code)
	}
	if area := placements.DashboardAreaFor(uiplacement.DashboardPlacementSidebar, ""); area != uiplacement.DashboardAreaCodeSidebar {
		t.Fatalf("expected dashboard sidebar placement area %q, got %q", uiplacement.DashboardAreaCodeSidebar, area)
	}
	if area := placements.DashboardAreaFor(uiplacement.DashboardPlacementMain, ""); area != uiplacement.DashboardAreaCodeMain {
		t.Fatalf("expected dashboard main area %q, got %q", uiplacement.DashboardAreaCodeMain, area)
	}
	if area := placements.DashboardAreaFor(uiplacement.DashboardPlacementFooter, ""); area != uiplacement.DashboardAreaCodeFooter {
		t.Fatalf("expected dashboard footer area %q, got %q", uiplacement.DashboardAreaCodeFooter, area)
	}
}

func TestBuildNavItemsPrunesEmptyGroupNodes(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:  adm.MenuService(),
		MenuCode: cfg.NavMenuCode,
		Locale:   cfg.DefaultLocale,
		Items:    DefaultMenuParents(cfg.NavMenuCode),
	}); err != nil {
		t.Fatalf("SeedNavigation: %v", err)
	}

	items := BuildNavItems(adm, cfg, context.Background(), "")
	if hasNavItemByGroupTitle(items, "Tools") {
		t.Fatalf("expected empty Tools group to be pruned")
	}
	if hasNavItemByGroupTitle(items, "Translations") {
		t.Fatalf("expected empty Translations group to be pruned")
	}
}

func TestWithNavLoadsUtilityItemsFromUtilityPlacement(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	utilityMenuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:  adm.MenuService(),
		MenuCode: utilityMenuCode,
		Locale:   cfg.DefaultLocale,
		Items: []admin.MenuItem{
			{
				ID:       "utility.custom-help",
				Type:     admin.MenuItemTypeItem,
				Label:    "Help",
				LabelKey: "menu.help",
				Target: map[string]any{
					"type": "url",
					"path": "/admin/help",
					"key":  "help",
				},
			},
		},
	}); err != nil {
		t.Fatalf("SeedNavigation utility: %v", err)
	}

	view := WithNav(nil, adm, cfg, "", context.Background())
	utilityItems, ok := view["nav_utility_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_utility_items slice, got %T", view["nav_utility_items"])
	}
	if len(utilityItems) == 0 {
		t.Fatalf("expected utility nav items")
	}
	if utilityItems[0]["label"] != "Help" {
		t.Fatalf("expected utility nav label Help, got %v", utilityItems[0]["label"])
	}
}

func TestWithNavUsesSelectedUtilityFallbackWhenCMSMenuIsMissing(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	if err := NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithSeedNavigation(false),
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("NewModuleRegistrar: %v", err)
	}

	view := WithNav(nil, adm, cfg, "", context.Background())
	utilityItems, ok := view["nav_utility_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_utility_items slice, got %T", view["nav_utility_items"])
	}
	if len(utilityItems) == 0 {
		t.Fatalf("expected selected utility fallback when CMS menu is missing")
	}
	if len(utilityItems) != 1 {
		t.Fatalf("expected Settings-only utility fallback, got %+v", utilityItems)
	}
	if utilityItems[0]["label"] != "Settings" {
		t.Fatalf("expected default utility nav label Settings, got %v", utilityItems[0]["label"])
	}
	if utilityItems[0]["href"] != "/admin/settings" {
		t.Fatalf("expected default utility settings href /admin/settings, got %v", utilityItems[0]["href"])
	}
}

func TestWithNavDoesNotReplaceAuthoritativeEmptyUtilityMenu(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	if err := NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithSeedNavigation(false),
		WithDefaultSidebarUtilityItems(true),
	); err != nil {
		t.Fatalf("NewModuleRegistrar: %v", err)
	}
	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	if _, err := adm.MenuService().CreateMenu(context.Background(), menuCode); err != nil {
		t.Fatalf("create empty utility menu: %v", err)
	}

	view := WithNav(nil, adm, cfg, "", context.Background())
	utilityItems, ok := view["nav_utility_items"].([]map[string]any)
	if !ok {
		t.Fatalf("expected nav_utility_items slice, got %T", view["nav_utility_items"])
	}
	if len(utilityItems) != 0 {
		t.Fatalf("expected authoritative empty utility menu to remain empty, got %+v", utilityItems)
	}
}

func TestSelectedUtilityFallbackAppliesPermissionDeniedMode(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	adm.WithAuthorizer(denyAllQuickstartAuthorizer{})
	if err := NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithSeedNavigation(false),
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("NewModuleRegistrar: %v", err)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeHide
	hidden := WithNav(nil, adm, cfg, "", context.Background())["nav_utility_items"].([]map[string]any)
	if len(hidden) != 0 {
		t.Fatalf("expected denied Settings fallback hidden, got %+v", hidden)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeDisable
	disabled := WithNav(nil, adm, cfg, "", context.Background())["nav_utility_items"].([]map[string]any)
	if len(disabled) != 1 {
		t.Fatalf("expected denied Settings fallback retained in disable mode, got %+v", disabled)
	}
	if disabled[0]["disabled"] != true ||
		disabled[0]["disabled_reason_code"] != admin.NavigationDisabledReasonCodePermissionDenied ||
		disabled[0]["missing_permission"] != admin.PermAdminSettingsView {
		t.Fatalf("expected permission-denied metadata, got %+v", disabled[0])
	}
}

func TestSeededUtilityMenuAppliesPermissionDeniedMode(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	adm.WithAuthorizer(denyAllQuickstartAuthorizer{})
	if err := NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("NewModuleRegistrar: %v", err)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeHide
	hidden := WithNav(nil, adm, cfg, "", context.Background())["nav_utility_items"].([]map[string]any)
	if len(hidden) != 0 {
		t.Fatalf("expected denied seeded Settings item hidden, got %+v", hidden)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeDisable
	disabled := WithNav(nil, adm, cfg, "", context.Background())["nav_utility_items"].([]map[string]any)
	if len(disabled) != 1 {
		t.Fatalf("expected denied seeded Settings retained in disable mode, got %+v", disabled)
	}
	if disabled[0]["missing_permission"] != admin.PermAdminSettingsView {
		t.Fatalf("expected seeded missing permission %q, got %+v", admin.PermAdminSettingsView, disabled[0])
	}
}

func TestBuildNavItemsForPlacementUsesRequestLocaleAndScope(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(
		admin.NavigationItem{
			ID:     "content.en",
			Type:   admin.MenuItemTypeItem,
			Label:  "Content",
			Locale: "en",
			Target: map[string]any{"path": "/content"},
		},
		admin.NavigationItem{
			ID:     "content.es",
			Type:   admin.MenuItemTypeItem,
			Label:  "Contenido",
			Locale: "es",
			Target: map[string]any{"path": "/contenido"},
		},
	)

	reqCtx := admin.WithContentChannel(admin.WithLocale(context.Background(), "es"), "preview")
	items := BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, reqCtx, "")

	var selected map[string]any
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toNavString(item["label"])), "Contenido") {
			selected = item
			break
		}
	}
	if selected == nil {
		t.Fatalf("expected to resolve locale-specific navigation item Contenido, got %+v", items)
	}

	href := strings.TrimSpace(toNavString(selected["href"]))
	parsed, err := url.Parse(href)
	if err != nil {
		t.Fatalf("parse href: %v", err)
	}
	if parsed.Path != "/admin/contenido" {
		t.Fatalf("expected localized href path /admin/contenido, got %q", parsed.Path)
	}
	if got := strings.TrimSpace(parsed.Query().Get("locale")); got != "es" {
		t.Fatalf("expected locale query es, got %q", got)
	}
	if got := strings.TrimSpace(parsed.Query().Get(admin.ContentChannelScopeQueryParam)); got != "preview" {
		t.Fatalf("expected %s query preview, got %q", admin.ContentChannelScopeQueryParam, got)
	}
}

func TestBuildNavItemsForPlacementAppliesPermissionDeniedMode(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuthorizer(denyAllQuickstartAuthorizer{})
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(
		admin.NavigationItem{ID: "home", Label: "Home", Target: map[string]any{"path": "/home"}},
		admin.NavigationItem{ID: "debug", Label: "Debug", Target: map[string]any{"path": "/debug", "key": "debug"}, Permissions: []string{"admin.debug.view"}},
	)

	hidden := BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, context.Background(), "")
	if findNavEntryByKey(hidden, "debug") != nil {
		t.Fatalf("expected denied debug item to be hidden by default, got %+v", hidden)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeDisable
	disabled := BuildNavItemsForPlacement(adm, cfg, DefaultPlacements(cfg), SidebarPlacementPrimary, context.Background(), "")
	debug := findNavEntryByKey(disabled, "debug")
	if debug == nil {
		t.Fatalf("expected denied debug item in disable mode, got %+v", disabled)
	}
	if debug["enabled"] != false || debug["disabled"] != true || debug["aria_disabled"] != true {
		t.Fatalf("expected disabled render metadata, got %+v", debug)
	}
	if debug["disabled_reason_code"] != admin.NavigationDisabledReasonCodePermissionDenied {
		t.Fatalf("expected permission denied reason code, got %+v", debug["disabled_reason_code"])
	}
	if debug["missing_permission"] != "admin.debug.view" {
		t.Fatalf("expected missing permission metadata, got %+v", debug["missing_permission"])
	}
}

func TestResolveFallbackMenuItemsAppliesPermissionDeniedMode(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.WithAuthorizer(denyAllQuickstartAuthorizer{})

	items := []admin.MenuItem{
		{
			ID:          "utility.secure",
			Label:       "Secure Utility",
			Locale:      "en",
			Permissions: []string{"admin.utility.secure"},
			Target:      map[string]any{"path": "/secure", "key": "secure_utility"},
		},
	}

	hidden := resolveFallbackMenuItems(context.Background(), adm, items, "en", admin.NavigationPermissionDeniedModeHide)
	if len(hidden) != 0 {
		t.Fatalf("expected denied fallback item hidden in hide mode, got %+v", hidden)
	}

	disabled := resolveFallbackMenuItems(context.Background(), adm, items, "en", admin.NavigationPermissionDeniedModeDisable)
	if len(disabled) != 1 {
		t.Fatalf("expected denied fallback item retained in disable mode, got %+v", disabled)
	}
	got := disabled[0]
	if got.Enabled == nil || *got.Enabled || !got.Disabled {
		t.Fatalf("expected disabled metadata on fallback item, got %+v", got)
	}
	if got.MissingPermission != "admin.utility.secure" {
		t.Fatalf("expected missing permission metadata, got %q", got.MissingPermission)
	}
}

func TestBuildNavItemsCMSBackedPermissionPolicyRegression(t *testing.T) {
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	adm := newAdminWithCMSNavigationRegressionFixture(t, cfg, true)
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})

	superItems := BuildNavItems(adm, cfg, context.Background(), "")
	if findNavEntryByKey(superItems, "translation_dashboard") == nil {
		t.Fatalf("expected super-admin translation dashboard entry, got %+v", superItems)
	}
	if findNavEntryByKey(superItems, "debug") == nil {
		t.Fatalf("expected super-admin debug entry, got %+v", superItems)
	}

	adm.WithAuthorizer(denyDebugQuickstartAuthorizer{})
	hiddenItems := BuildNavItems(adm, cfg, context.Background(), "")
	if findNavEntryByKey(hiddenItems, "debug") != nil {
		t.Fatalf("expected debug hidden in hide mode, got %+v", hiddenItems)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeDisable
	disabledItems := BuildNavItems(adm, cfg, context.Background(), "")
	debug := findNavEntryByKey(disabledItems, "debug")
	if debug == nil {
		t.Fatalf("expected debug visible in disable mode, got %+v", disabledItems)
	}
	if debug["enabled"] != false || debug["disabled"] != true || debug["disabled_reason_code"] != admin.NavigationDisabledReasonCodePermissionDenied {
		t.Fatalf("expected debug disabled metadata, got %+v", debug)
	}

	adm.WithAuthorizer(denyTranslationPermissionAuthorizer{})
	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeHide
	translationHidden := BuildNavItems(adm, cfg, context.Background(), "")
	if findNavEntryByKey(translationHidden, "translation_dashboard") != nil {
		t.Fatalf("expected translation dashboard hidden in hide mode, got %+v", translationHidden)
	}

	cfg.NavPermissionDeniedMode = admin.NavigationPermissionDeniedModeDisable
	translationDisabled := BuildNavItems(adm, cfg, context.Background(), "")
	dashboard := findNavEntryByKey(translationDisabled, "translation_dashboard")
	if dashboard == nil {
		t.Fatalf("expected translation dashboard visible in disable mode, got %+v", translationDisabled)
	}
	if dashboard["enabled"] != false || dashboard["disabled"] != true || dashboard["disabled_reason_code"] != admin.ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected translation dashboard disabled metadata, got %+v", dashboard)
	}
	if dashboard["missing_permission"] != admin.PermAdminTranslationsView {
		t.Fatalf("expected translation dashboard missing permission metadata, got %+v", dashboard["missing_permission"])
	}

	capabilityCfg := NewAdminConfig("/admin", "Admin", "en", WithNavPermissionDeniedMode(admin.NavigationPermissionDeniedModeDisable))
	capabilityAdm := newAdminWithCMSNavigationRegressionFixture(t, capabilityCfg, false)
	capabilityAdm.WithAuthorizer(denyTranslationPermissionAuthorizer{})
	capabilityItems := BuildNavItems(capabilityAdm, capabilityCfg, context.Background(), "")
	if findNavEntryByKey(capabilityItems, "translation_exchange") != nil {
		t.Fatalf("expected capability-disabled exchange entry absent, got %+v", capabilityItems)
	}
}

func TestBuildNavEntryTransientMetadataOverridesStaleTargetMetadata(t *testing.T) {
	item := admin.NavigationItem{
		ID:          "settings",
		Label:       "Settings",
		Target:      map[string]any{"path": "/settings", "enabled": false, "disabled_reason": "stale", "disabled_reason_code": "stale_code", "missing_permission": "stale.permission"},
		Permissions: []string{"admin.settings.view"},
	}
	item.MarkEnabled()

	entry, _ := buildNavEntry(item, "/admin", nil, "", navRequestScope{})
	if entry == nil {
		t.Fatalf("expected nav entry")
	}
	if entry["enabled"] != true {
		t.Fatalf("expected explicit enabled metadata to override stale target enabled=false, got %+v", entry["enabled"])
	}
	for _, key := range []string{"disabled", "aria_disabled", "disabled_reason", "disabled_reason_code", "missing_permission"} {
		if _, ok := entry[key]; ok {
			t.Fatalf("expected stale %s metadata to be cleared, got %+v", key, entry)
		}
	}
}

func TestMenuItemAsNavigationItemPreservesCode(t *testing.T) {
	item := menuItemAsNavigationItem(admin.MenuItem{
		ID:    "docs",
		Code:  "docs-code",
		Label: "Docs",
	})

	if item.Code != "docs-code" {
		t.Fatalf("expected code to be preserved, got %q", item.Code)
	}
}

func newAdminWithCMSNavigationRegressionFixture(t *testing.T, cfg admin.Config, exchangeEnabled bool) *admin.Admin {
	t.Helper()

	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: exchangeEnabled,
				Store:   &moduleRegistrarExchangeStoreStub{},
			},
			Queue: &TranslationQueueConfig{
				Enabled:          true,
				Repository:       newQuickstartTranslationQueueRepo(),
				SupportedLocales: []string{"en", "es"},
			},
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:  adm.MenuService(),
		MenuCode: cfg.NavMenuCode,
		Locale:   cfg.DefaultLocale,
		Items: []admin.MenuItem{
			{
				ID:          "translations",
				Type:        admin.MenuItemTypeGroup,
				Label:       "Translations",
				GroupTitle:  "Translations",
				Collapsible: true,
			},
			{
				ID:       "translation_dashboard",
				ParentID: "translations",
				Type:     admin.MenuItemTypeItem,
				Label:    "Dashboard",
				Target:   map[string]any{"type": "url", "path": "/admin/translations/dashboard", "key": "translation_dashboard"},
			},
			{
				ID:       "translation_queue",
				ParentID: "translations",
				Type:     admin.MenuItemTypeItem,
				Label:    "Queue",
				Target:   map[string]any{"type": "url", "path": "/admin/translations/queue", "key": "translation_queue"},
			},
			{
				ID:       "translation_exchange",
				ParentID: "translations",
				Type:     admin.MenuItemTypeItem,
				Label:    "Exchange",
				Target:   map[string]any{"type": "url", "path": "/admin/translations/exchange", "key": "translation_exchange"},
			},
			{
				ID:         "tools",
				Type:       admin.MenuItemTypeGroup,
				Label:      "Tools",
				GroupTitle: "Tools",
			},
			{
				ID:          "debug",
				ParentID:    "tools",
				Type:        admin.MenuItemTypeItem,
				Label:       "Debug",
				Target:      map[string]any{"type": "url", "path": "/admin/debug", "key": "debug"},
				Permissions: []string{"admin.debug.view"},
			},
		},
	}); err != nil {
		t.Fatalf("SeedNavigation: %v", err)
	}
	adm.Navigation().UseCMS(true)
	return adm
}

func TestTranslationEntrypointDegradationRespectsPermissionDeniedMode(t *testing.T) {
	exposure := translationModuleExposureSnapshot{
		Queue: translationModuleExposure{
			Module:            "queue",
			CapabilityEnabled: true,
			EntryEnabled:      false,
			Reason:            "missing permission: admin.translations.view",
			ReasonCode:        admin.ActionDisabledReasonCodePermissionDenied,
			MissingPermission: admin.PermAdminTranslationsView,
		},
		Exchange: translationModuleExposure{
			Module:            "exchange",
			CapabilityEnabled: false,
			EntryEnabled:      false,
		},
	}

	hidden := applyTranslationEntrypointDegradation(translationEntrypointFixture(), exposure, admin.NavigationPermissionDeniedModeHide)
	if findNavEntryByKey(hidden, "translation_dashboard") != nil || findNavEntryByKey(hidden, "translation_queue") != nil {
		t.Fatalf("expected denied translation entrypoints hidden in hide mode, got %+v", hidden)
	}
	if findNavEntryByKey(hidden, "translation_exchange") != nil {
		t.Fatalf("expected capability-disabled exchange hidden in hide mode, got %+v", hidden)
	}
	if findNavEntryByKey(hidden, "translation_settings") == nil {
		t.Fatalf("expected unrelated child to keep Translations group alive in hide mode, got %+v", hidden)
	}

	disabled := applyTranslationEntrypointDegradation(translationEntrypointFixture(), exposure, admin.NavigationPermissionDeniedModeDisable)
	dashboard := findNavEntryByKey(disabled, "translation_dashboard")
	if dashboard == nil {
		t.Fatalf("expected denied dashboard visible in disable mode, got %+v", disabled)
	}
	if dashboard["enabled"] != false || dashboard["disabled"] != true || dashboard["aria_disabled"] != true {
		t.Fatalf("expected dashboard disabled metadata, got %+v", dashboard)
	}
	if dashboard["disabled_reason_code"] != admin.ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected dashboard permission denied reason code, got %+v", dashboard["disabled_reason_code"])
	}
	if dashboard["missing_permission"] != admin.PermAdminTranslationsView {
		t.Fatalf("expected dashboard missing permission metadata, got %+v", dashboard["missing_permission"])
	}
	if findNavEntryByKey(disabled, "translation_exchange") != nil {
		t.Fatalf("expected capability-disabled exchange hidden in disable mode, got %+v", disabled)
	}
	if findNavEntryByKey(disabled, "translations") == nil {
		t.Fatalf("expected Translations container to remain a container, got %+v", disabled)
	}
}

func TestTranslationEntrypointDegradationClearsStaleMetadataWhenAllowed(t *testing.T) {
	exposure := translationModuleExposureSnapshot{
		Queue: translationModuleExposure{
			Module:            "queue",
			CapabilityEnabled: true,
			EntryEnabled:      true,
		},
	}
	entries := []map[string]any{
		{
			"key":                  "translation_queue",
			"enabled":              false,
			"disabled":             true,
			"aria_disabled":        true,
			"disabled_reason":      "stale",
			"disabled_reason_code": "stale_code",
			"missing_permission":   "admin.translations.view",
		},
	}

	out := applyTranslationEntrypointDegradation(entries, exposure, admin.NavigationPermissionDeniedModeDisable)
	queue := findNavEntryByKey(out, "translation_queue")
	if queue == nil {
		t.Fatalf("expected queue entry, got %+v", out)
	}
	if queue["enabled"] != true {
		t.Fatalf("expected queue enabled=true, got %+v", queue["enabled"])
	}
	for _, key := range []string{"disabled", "aria_disabled", "disabled_reason", "disabled_reason_code", "missing_permission"} {
		if _, ok := queue[key]; ok {
			t.Fatalf("expected stale %s cleared, got %+v", key, queue)
		}
	}
}

func hasNavItemByGroupTitle(items []map[string]any, title string) bool {
	title = strings.TrimSpace(title)
	if title == "" {
		return false
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toNavString(item["group_title"])), title) {
			return true
		}
		children := navEntryChildren(item["children"])
		if hasNavItemByGroupTitle(children, title) {
			return true
		}
	}
	return false
}

func translationEntrypointFixture() []map[string]any {
	return []map[string]any{
		{
			"id":           "translations",
			"key":          "translations",
			"type":         admin.MenuItemTypeGroup,
			"group_title":  "Translations",
			"has_children": true,
			"children": []map[string]any{
				{"id": "translation_dashboard", "key": "translation_dashboard", "label": "Dashboard"},
				{"id": "translation_queue", "key": "translation_queue", "label": "Queue"},
				{"id": "translation_exchange", "key": "translation_exchange", "label": "Exchange"},
				{"id": "translation_settings", "key": "translation_settings", "label": "Settings"},
			},
		},
	}
}

func findNavEntryByKey(items []map[string]any, key string) map[string]any {
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toNavString(item["key"])), key) || strings.EqualFold(strings.TrimSpace(toNavString(item["id"])), key) {
			return item
		}
		children := navEntryChildren(item["children"])
		if child := findNavEntryByKey(children, key); child != nil {
			return child
		}
	}
	return nil
}
