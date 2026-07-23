package quickstart

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	commandregistry "github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	urlkit "github.com/goliatone/go-urlkit"
)

type stubModule struct {
	id           string
	deps         []string
	featureFlags []string
	menuItems    []admin.MenuItem
}

type moduleRegistrarExchangeStoreStub struct{}

func cleanupModuleCommandRegistry(t *testing.T) {
	t.Helper()
	stopModuleCommandRegistry(t)
	t.Cleanup(func() {
		stopModuleCommandRegistry(t)
	})
}

func stopModuleCommandRegistry(t *testing.T) {
	t.Helper()
	if err := commandregistry.Stop(context.Background()); err != nil {
		t.Errorf("stop command registry: %v", err)
	}
}

func (m stubModule) Manifest() admin.ModuleManifest {
	return admin.ModuleManifest{ID: m.id, Dependencies: m.deps, FeatureFlags: m.featureFlags}
}

func (m stubModule) Register(ctx admin.ModuleContext) error {
	_ = ctx
	return nil
}

func (m stubModule) MenuItems(locale string) []admin.MenuItem {
	_ = locale
	if len(m.menuItems) == 0 {
		return nil
	}
	items := make([]admin.MenuItem, len(m.menuItems))
	copy(items, m.menuItems)
	return items
}

func (moduleRegistrarExchangeStoreStub) ExportRows(context.Context, admin.TranslationExportFilter) ([]admin.TranslationExchangeRow, error) {
	return nil, nil
}

func (moduleRegistrarExchangeStoreStub) ResolveLinkage(context.Context, admin.TranslationExchangeLinkageKey) (admin.TranslationExchangeLinkage, error) {
	return admin.TranslationExchangeLinkage{}, nil
}

func (moduleRegistrarExchangeStoreStub) ApplyTranslation(context.Context, admin.TranslationExchangeApplyRequest) error {
	return nil
}

func TestOrderModulesDeterministic(t *testing.T) {
	modA := stubModule{id: "alpha", deps: []string{"bravo"}}
	modB := stubModule{id: "bravo"}
	modC := stubModule{id: "charlie", deps: []string{"bravo"}}

	ordered, err := orderModules([]admin.Module{modA, modB, modC})
	if err != nil {
		t.Fatalf("orderModules error: %v", err)
	}
	if len(ordered) != 3 {
		t.Fatalf("expected 3 modules, got %d", len(ordered))
	}
	got := []string{
		ordered[0].Manifest().ID,
		ordered[1].Manifest().ID,
		ordered[2].Manifest().ID,
	}
	expected := []string{"bravo", "alpha", "charlie"}
	for i, id := range expected {
		if got[i] != id {
			t.Fatalf("expected order %v, got %v", expected, got)
		}
	}
}

func TestNewModuleRegistrarWrapsRegisterErrors(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	preRegistered := stubModule{id: "dup-module"}
	if err = adm.RegisterModule(preRegistered); err != nil {
		t.Fatalf("pre-register module: %v", err)
	}

	err = NewModuleRegistrar(adm, cfg, []admin.Module{preRegistered}, false, WithSeedNavigation(false))
	if err == nil {
		t.Fatalf("expected registration error")
	}
	if !strings.Contains(err.Error(), "register module dup-module") {
		t.Fatalf("expected wrapped error with module ID, got %v", err)
	}
}

func TestNewModuleRegistrarDoesNotDoubleRegisterContentTypeBuilder(t *testing.T) {
	resetCommandRegistryForTest(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	adm.UseCMS(admin.NewNoopCMSContainer())
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	modules := []admin.Module{
		NewContentTypeBuilderModule(cfg, ""),
	}
	if err := NewModuleRegistrar(adm, cfg, modules, false, WithSeedNavigation(false)); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("Initialize error: %v", err)
	}
}

func TestNewModuleRegistrarFeatureGatesSkipModules(t *testing.T) {
	cfg := admin.Config{
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}}
	modB := stubModule{id: "bravo", featureFlags: []string{"feature.b"}}
	gates := stubFeatureGate{flags: map[string]bool{"feature.a": true}}
	disabled := []string{}

	err = NewModuleRegistrar(
		adm,
		cfg,
		[]admin.Module{modA, modB},
		false,
		WithSeedNavigation(false),
		WithModuleFeatureGates(gates),
		WithModuleFeatureDisabledHandler(func(feature, moduleID string) error {
			disabled = append(disabled, feature+":"+moduleID)
			return nil
		}),
	)
	if err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}
	if _, ok := adm.Registry().Module("alpha"); !ok {
		t.Fatalf("expected module alpha registered")
	}
	if _, ok := adm.Registry().Module("bravo"); ok {
		t.Fatalf("expected module bravo skipped")
	}
	if len(disabled) != 1 || disabled[0] != "feature.b:bravo" {
		t.Fatalf("expected disabled handler called, got %v", disabled)
	}
}

func TestFilterModulesSkipsMissingDependencies(t *testing.T) {
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}}
	modB := stubModule{id: "bravo", deps: []string{"alpha"}}
	gates := stubFeatureGate{flags: map[string]bool{}}
	disabled := []string{}

	filtered, err := filterModulesForRegistrar(
		[]admin.Module{modA, modB},
		gates,
		func(feature, moduleID string) error {
			disabled = append(disabled, feature+":"+moduleID)
			return nil
		},
	)
	if err != nil {
		t.Fatalf("filterModulesForRegistrar error: %v", err)
	}
	if len(filtered) != 0 {
		t.Fatalf("expected all modules skipped, got %d", len(filtered))
	}
	if len(disabled) != 2 {
		t.Fatalf("expected two disabled entries, got %v", disabled)
	}
	if disabled[0] != "feature.a:alpha" || disabled[1] != "dependency:alpha:bravo" {
		t.Fatalf("unexpected disabled entries: %v", disabled)
	}
}

func TestBuildSeedMenuItemsRespectsGates(t *testing.T) {
	menuA := admin.MenuItem{ID: "menu-a"}
	menuB := admin.MenuItem{ID: "menu-b"}
	modA := stubModule{id: "alpha", featureFlags: []string{"feature.a"}, menuItems: []admin.MenuItem{menuA}}
	modB := stubModule{id: "bravo", featureFlags: []string{"feature.b"}, menuItems: []admin.MenuItem{menuB}}
	gates := stubFeatureGate{flags: map[string]bool{"feature.a": true}}

	filtered, err := filterModulesForRegistrar(
		[]admin.Module{modA, modB},
		gates,
		func(feature, moduleID string) error { return nil },
	)
	if err != nil {
		t.Fatalf("filterModulesForRegistrar error: %v", err)
	}
	items := buildSeedMenuItems("admin.main", "en", filtered, nil)
	foundA := false
	foundB := false
	for _, item := range items {
		switch item.ID {
		case "menu-a":
			foundA = true
		case "menu-b":
			foundB = true
		}
	}
	if !foundA {
		t.Fatalf("expected menu-a included")
	}
	if foundB {
		t.Fatalf("expected menu-b skipped")
	}
}

func TestNewModuleRegistrarSeedsTranslationCapabilityMenuItemsByDefault(t *testing.T) {
	resetCommandRegistryForTest(t)
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
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
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	if err = NewModuleRegistrar(adm, cfg, nil, false); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected seeded menu")
	}
	if queueItem := findMenuItemByRouteName(menu.Items, "admin.translations.queue"); queueItem == nil {
		t.Fatalf("expected queue menu seeded by default")
	}
	if dashboardItem := findMenuItemByRouteName(menu.Items, "admin.translations.dashboard"); dashboardItem == nil {
		t.Fatalf("expected dashboard menu seeded by default")
	}
	if exchangeItem := findMenuItemByRouteName(menu.Items, "admin.translations.exchange"); exchangeItem == nil {
		t.Fatalf("expected exchange menu seeded by default")
	}
}

func TestNewModuleRegistrarAppliesBaseItemTransformToTranslationDashboard(t *testing.T) {
	resetCommandRegistryForTest(t)
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
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
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	options := []ModuleRegistrarOption{
		WithMenuSeedParents(admin.MenuItem{
			ID:          "host.translations",
			Type:        admin.MenuItemTypeGroup,
			GroupTitle:  "Translations",
			Collapsible: true,
		}),
		WithMenuSeedTargetParentOverride("translation_dashboard", "host.translations"),
		WithMenuSeedBaseItemTransform(func(item *admin.MenuItem) {
			if item == nil || stringTargetValue(item.Target, "key") != "translation_dashboard" {
				return
			}
			if item.ParentID != "host.translations" {
				t.Fatalf("expected target parent override before base transform, got %q", item.ParentID)
			}
			item.Label = "Translations"
			item.LabelKey = "menu.translations.overview"
			item.Target["name"] = "admin.translations.overview"
			item.Target["breadcrumb_label"] = "Translation Center"
			item.Permissions = []string{"translations.view"}
		}),
	}
	if err = NewModuleRegistrar(adm, cfg, nil, false, options...); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}
	if err = NewModuleRegistrar(adm, cfg, nil, false, options...); err != nil {
		t.Fatalf("second NewModuleRegistrar error: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	dashboardItem := findMenuItemByTargetKeyForTest(menu.Items, "translation_dashboard")
	if dashboardItem == nil {
		t.Fatalf("expected translation dashboard menu item")
	}
	if count := countMenuItemsByTargetKey(menu.Items, "translation_dashboard"); count != 1 {
		t.Fatalf("expected one translation dashboard after repeated registration, got %d items=%#v", count, menu.Items)
	}
	if !strings.HasSuffix(dashboardItem.ParentID, "host.translations") {
		t.Fatalf("expected host parent, got %q", dashboardItem.ParentID)
	}
	if dashboardItem.Label != "Translations" {
		t.Fatalf("expected customized label, got %q", dashboardItem.Label)
	}
	if dashboardItem.LabelKey != "menu.translations.overview" {
		t.Fatalf("expected customized label key, got %q", dashboardItem.LabelKey)
	}
	if got := stringTargetValue(dashboardItem.Target, "name"); got != "admin.translations.overview" {
		t.Fatalf("expected customized target name, got %q", got)
	}
	if got := stringTargetValue(dashboardItem.Target, "breadcrumb_label"); got != "Translation Center" {
		t.Fatalf("expected customized breadcrumb, got %q", got)
	}
	if len(dashboardItem.Permissions) != 1 || dashboardItem.Permissions[0] != "translations.view" {
		t.Fatalf("expected customized permissions, got %#v", dashboardItem.Permissions)
	}
}

func TestResolveTranslationCapabilityMenuPathResolvesQueueAndAssignments(t *testing.T) {
	manager, err := urlkit.NewRouteManagerFromConfig(&urlkit.Config{
		Groups: []urlkit.GroupConfig{
			{
				Name:    "admin",
				BaseURL: "/control",
				Routes: map[string]string{
					"dashboard":              "/",
					"content.panel":          "/content/:panel",
					"translations.dashboard": "/translations/dashboard",
					"translations.exchange":  "/translations/exchange",
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("new route manager: %v", err)
	}

	if got := resolveTranslationCapabilityMenuPath(manager, "/admin", "translations.queue"); got != "/control/translations/queue" {
		t.Fatalf("expected queue fallback to dedicated translations queue path, got %q", got)
	}
	if got := resolveTranslationCapabilityMenuPath(manager, "/admin", "translations.assignments"); got != "/control/content/translations" {
		t.Fatalf("expected assignments fallback to canonical translations panel path, got %q", got)
	}
	if got := resolveTranslationCapabilityMenuPath(manager, "/admin", "translations.dashboard"); got != "/control/translations/dashboard" {
		t.Fatalf("expected dashboard path to resolve through URLKit, got %q", got)
	}
	if got := resolveTranslationCapabilityMenuPath(manager, "/admin", "translations.exchange"); got != "/control/translations/exchange" {
		t.Fatalf("expected exchange path to resolve through URLKit, got %q", got)
	}
}

func TestNewModuleRegistrarDoesNotSeedSidebarUtilityMenuItemsByDefault(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(adm, cfg, nil, false); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected seeded menu")
	}

	preferencesItem := findMenuItemByRouteName(menu.Items, "admin.preferences")
	if preferencesItem != nil {
		t.Fatalf("expected preferences menu item to be opt-in")
	}
}

func TestNewModuleRegistrarSeedsSidebarUtilityMenuItemsWhenOptedIn(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItems(true),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	utilityMenuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	utilityMenu, err := adm.MenuService().Menu(context.Background(), utilityMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	if utilityMenu == nil {
		t.Fatalf("expected seeded utility menu")
	}

	preferencesItem := findMenuItemByRouteName(utilityMenu.Items, "admin.preferences")
	if preferencesItem == nil {
		t.Fatalf("expected preferences utility menu item seeded")
	}
	assertMenuItemPermissions(t, preferencesItem, admin.PermAdminPreferencesView)
	if parent := strings.TrimSpace(preferencesItem.ParentID); parent != "" {
		t.Fatalf("expected preferences utility link to be top-level, got parent %q", parent)
	}

	profileItem := findMenuItemByRouteName(utilityMenu.Items, "admin.profile")
	if profileItem == nil {
		t.Fatalf("expected profile utility menu item seeded")
	}
	assertMenuItemPermissions(t, profileItem, admin.PermAdminProfileView)

	settingsItem := findMenuItemByRouteName(utilityMenu.Items, "admin.settings")
	if settingsItem == nil {
		t.Fatalf("expected settings utility menu item seeded")
	}
	assertMenuItemPermissions(t, settingsItem, admin.PermAdminSettingsView)

	if helpItem := findMenuItemByRouteName(utilityMenu.Items, "admin.help"); helpItem != nil {
		t.Fatalf("expected unowned help route to be absent, got %+v", helpItem)
	}

	mainMenu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve main menu: %v", err)
	}
	if mainMenu == nil {
		t.Fatalf("expected seeded main menu")
	}
	if item := findMenuItemByRouteName(mainMenu.Items, "admin.preferences"); item != nil {
		t.Fatalf("expected preferences not to be seeded into main menu")
	}
}

func TestNewModuleRegistrarUsesConfiguredSidebarUtilityPermissions(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	cfg.SettingsPermission = "custom.settings.view"
	cfg.PreferencesPermission = "custom.preferences.view"
	cfg.ProfilePermission = "custom.profile.view"
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(adm, cfg, nil, false, WithDefaultSidebarUtilityItems(true)); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	assertMenuItemPermissions(t, findMenuItemByRouteName(menu.Items, "admin.settings"), cfg.SettingsPermission)
	assertMenuItemPermissions(t, findMenuItemByRouteName(menu.Items, "admin.preferences"), cfg.PreferencesPermission)
	assertMenuItemPermissions(t, findMenuItemByRouteName(menu.Items, "admin.profile"), cfg.ProfilePermission)
}

func TestNewModuleRegistrarSelectsSidebarUtilityDefaults(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected Settings-only utility menu, got %+v", menu)
	}
	settings := findMenuItemByRouteName(menu.Items, "admin.settings")
	if settings == nil {
		t.Fatalf("expected Settings utility item, got %+v", menu.Items)
	}
	assertMenuItemPermissions(t, settings, admin.PermAdminSettingsView)
	for _, routeName := range []string{"admin.preferences", "admin.profile", "admin.help"} {
		if item := findMenuItemByRouteName(menu.Items, routeName); item != nil {
			t.Fatalf("expected %s absent from Settings-only utility menu, got %+v", routeName, item)
		}
	}
}

func TestNewModuleRegistrarRetiresOnlyOmittedStandardUtilityRows(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(adm, cfg, nil, false, WithDefaultSidebarUtilityItems(true)); err != nil {
		t.Fatalf("seed all defaults: %v", err)
	}

	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	if err := SeedNavigation(context.Background(), SeedNavigationOptions{
		MenuSvc:   adm.MenuService(),
		MenuCode:  menuCode,
		Locale:    cfg.DefaultLocale,
		Reconcile: true,
		Items: []admin.MenuItem{{
			ID:     "utility.help",
			Label:  "Legacy Help",
			Locale: cfg.DefaultLocale,
			Target: map[string]any{"type": "url", "path": "/admin/help", "key": "help"},
		}},
	}); err != nil {
		t.Fatalf("seed legacy help row: %v", err)
	}
	if err := adm.MenuService().AddMenuItem(context.Background(), menuCode, admin.MenuItem{
		ID:     "host.support",
		Label:  "Host Support",
		Locale: cfg.DefaultLocale,
		Target: map[string]any{"type": "url", "path": "/support", "key": "host_support"},
	}); err != nil {
		t.Fatalf("seed host-owned utility row: %v", err)
	}

	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("transition to settings-only defaults: %v", err)
	}
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve settings-only utility menu: %v", err)
	}
	if findMenuItemByRouteName(menu.Items, "admin.settings") == nil {
		t.Fatalf("expected settings to remain, got %+v", menu.Items)
	}
	for _, routeName := range []string{"admin.preferences", "admin.profile", "admin.help"} {
		if item := findMenuItemByRouteName(menu.Items, routeName); item != nil {
			t.Fatalf("expected omitted %s row retired, got %+v", routeName, item)
		}
	}
	if item := findMenuItemByTargetKeyForTest(menu.Items, "host_support"); item == nil {
		t.Fatalf("expected host-owned row preserved, got %+v", menu.Items)
	}

	if err = NewModuleRegistrar(adm, cfg, nil, false, WithDefaultSidebarUtilityItems(false)); err != nil {
		t.Fatalf("disable defaults: %v", err)
	}
	menu, err = adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve disabled utility menu: %v", err)
	}
	if item := findMenuItemByRouteName(menu.Items, "admin.settings"); item != nil {
		t.Fatalf("expected settings row retired when defaults disabled, got %+v", item)
	}
	if item := findMenuItemByTargetKeyForTest(menu.Items, "host_support"); item == nil {
		t.Fatalf("expected host-owned row preserved after disabling defaults, got %+v", menu.Items)
	}
}

func TestNewModuleRegistrarRetiresStandardUtilityRowWhenFeatureTurnsOff(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	gate := stubFeatureGate{flags: map[string]bool{string(admin.FeatureSettings): true}}
	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithAdminDependencies(admin.Dependencies{FeatureGate: gate}))
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	register := func() error {
		return NewModuleRegistrar(
			adm,
			cfg,
			nil,
			false,
			WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
		)
	}
	if err := register(); err != nil {
		t.Fatalf("seed enabled settings utility row: %v", err)
	}
	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil || findMenuItemByRouteName(menu.Items, "admin.settings") == nil {
		t.Fatalf("expected enabled settings utility row, menu=%+v err=%v", menu, err)
	}

	gate.flags[string(admin.FeatureSettings)] = false
	if err := register(); err != nil {
		t.Fatalf("reconcile disabled settings feature: %v", err)
	}
	menu, err = adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu after feature disable: %v", err)
	}
	if item := findMenuItemByRouteName(menu.Items, "admin.settings"); item != nil {
		t.Fatalf("expected feature-disabled settings row retired, got %+v", item)
	}
}

func TestNewModuleRegistrarSkipsSettingsUtilityItemWhenSettingsFeatureDisabled(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			"settings": false,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItems(true),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	utilityMenuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	utilityMenu, err := adm.MenuService().Menu(context.Background(), utilityMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	if utilityMenu == nil {
		t.Fatalf("expected seeded utility menu")
	}
	if settingsItem := findMenuItemByRouteName(utilityMenu.Items, "admin.settings"); settingsItem != nil {
		t.Fatalf("expected settings utility menu item to be omitted when settings feature is disabled")
	}
}

func TestNewModuleRegistrarSkipsFeatureDisabledSidebarUtilityItems(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithFeatureDefaults(map[string]bool{
			string(admin.FeatureSettings):    false,
			string(admin.FeaturePreferences): false,
			string(admin.FeatureProfile):     false,
		}),
	)
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithDefaultSidebarUtilityItems(true),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	for _, routeName := range []string{"admin.settings", "admin.preferences", "admin.profile", "admin.help"} {
		if item := findMenuItemByRouteName(menu.Items, routeName); item != nil {
			t.Fatalf("expected feature-disabled utility item %s absent, got %+v", routeName, item)
		}
	}
}

func TestCustomSidebarUtilityItemOverridesSelectedDefault(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	custom := admin.MenuItem{
		ID:          "utility.settings",
		Label:       "Workspace Settings",
		Permissions: []string{"workspace.settings.view"},
		Target: map[string]any{
			"type": "url",
			"path": "/workspace/settings",
			"name": "workspace.settings",
			"key":  "settings",
		},
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithSidebarUtilityMenuItems(custom),
		WithDefaultSidebarUtilityItemKeys(SidebarUtilityItemSettings),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menuCode := DefaultPlacements(cfg).MenuCodeFor(SidebarPlacementUtility, "")
	menu, err := adm.MenuService().Menu(context.Background(), menuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve utility menu: %v", err)
	}
	item := findMenuItemByRouteName(menu.Items, "workspace.settings")
	if item == nil {
		t.Fatalf("expected custom Settings item, got %+v", menu.Items)
	}
	if defaultItem := findMenuItemByRouteName(menu.Items, "admin.settings"); defaultItem != nil {
		t.Fatalf("expected selected default deduped behind custom item, got %+v", defaultItem)
	}
	assertMenuItemPermissions(t, item, "workspace.settings.view")
}

func TestNewModuleRegistrarSeedsToolsMenuItemsUnderToolsGroup(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(cfg, AdapterHooks{})
	if err != nil {
		t.Fatalf("NewAdmin error: %v", err)
	}
	if err = NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithToolsMenuItems(admin.MenuItem{
			ID:       "tools.audit-log",
			Type:     admin.MenuItemTypeItem,
			Label:    "Audit Log",
			LabelKey: "menu.audit_log",
			Target: map[string]any{
				"type": "url",
				"path": "/admin/audit-log",
				"name": "admin.audit_log",
				"key":  "audit_log",
			},
			Position: intPtr(65),
		}),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected seeded menu")
	}

	item := findMenuItemByRouteName(menu.Items, "admin.audit_log")
	if item == nil {
		t.Fatalf("expected tools menu item seeded")
	}
	if parent := strings.TrimSpace(item.ParentID); !strings.Contains(parent, NavigationGroupToolsID) {
		t.Fatalf("expected tools item parent to include %q, got %q", NavigationGroupToolsID, parent)
	}
}

func TestNewModuleRegistrarSeedsTranslationCapabilityMenuItemsWhenEnabled(t *testing.T) {
	tests := []struct {
		name            string
		productCfg      TranslationProductConfig
		expectDashboard bool
		expectQueue     bool
		expectExchange  bool
	}{
		{
			name: "core profile keeps translation menu hidden",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCore,
			},
			expectDashboard: false,
			expectQueue:     false,
			expectExchange:  false,
		},
		{
			name: "queue profile seeds queue menu only",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCoreQueue,
				Queue: &TranslationQueueConfig{
					Enabled:          true,
					Repository:       newQuickstartTranslationQueueRepo(),
					SupportedLocales: []string{"en", "es"},
				},
			},
			expectDashboard: true,
			expectQueue:     true,
			expectExchange:  false,
		},
		{
			name: "exchange profile seeds exchange menu only",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCoreExchange,
				Exchange: &TranslationExchangeConfig{
					Enabled: true,
					Store:   &moduleRegistrarExchangeStoreStub{},
				},
			},
			expectDashboard: false,
			expectQueue:     false,
			expectExchange:  true,
		},
		{
			name: "full profile seeds queue and exchange menus",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileFull,
				Exchange: &TranslationExchangeConfig{
					Enabled: true,
					Store:   &moduleRegistrarExchangeStoreStub{},
				},
				Queue: &TranslationQueueConfig{
					Enabled:          true,
					Repository:       newQuickstartTranslationQueueRepo(),
					SupportedLocales: []string{"en", "es"},
				},
			},
			expectDashboard: true,
			expectQueue:     true,
			expectExchange:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cleanupModuleCommandRegistry(t)

			cfg := NewAdminConfig("/admin", "Admin", "en")
			cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
			adm, _, err := NewAdmin(
				cfg,
				AdapterHooks{},
				WithTranslationProductConfig(tc.productCfg),
			)
			if err != nil {
				t.Fatalf("NewAdmin error: %v", err)
			}
			if adm.Commands() != nil {
				t.Cleanup(adm.Commands().Reset)
			}

			if err = NewModuleRegistrar(
				adm,
				cfg,
				nil,
				false,
				WithTranslationCapabilityMenuMode(TranslationCapabilityMenuModeTools),
			); err != nil {
				t.Fatalf("NewModuleRegistrar error: %v", err)
			}

			menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
			if err != nil {
				t.Fatalf("resolve menu: %v", err)
			}
			if menu == nil {
				t.Fatalf("expected seeded menu")
			}

			queueItem := findMenuItemByRouteName(menu.Items, "admin.translations.queue")
			if (queueItem != nil) != tc.expectQueue {
				t.Fatalf("expected queue menu=%t, got %t", tc.expectQueue, queueItem != nil)
			}
			if queueItem != nil {
				parent := strings.TrimSpace(queueItem.ParentID)
				if !strings.Contains(parent, "nav-group-translations") {
					t.Fatalf("expected queue item parent to include nav-group-translations, got %q", parent)
				}
				path := toString(queueItem.Target["path"])
				if !strings.Contains(strings.TrimSpace(path), "/translations/queue") {
					t.Fatalf("expected queue target path to include /translations/queue, got %q", path)
				}
				if len(queueItem.Permissions) != 0 {
					t.Fatalf("expected queue menu item to be module/profile-gated only, got permissions %v", queueItem.Permissions)
				}
				if got := strings.TrimSpace(queueItem.Icon); got != "language" {
					t.Fatalf("expected queue icon language, got %q", got)
				}
				assertNoPersistedTranslationPermissionState(t, queueItem)
			}
			assignmentsItem := findMenuItemByRouteName(menu.Items, "admin.translations.assignments")
			if (assignmentsItem != nil) != tc.expectQueue {
				t.Fatalf("expected assignments menu=%t, got %t", tc.expectQueue, assignmentsItem != nil)
			}
			if assignmentsItem != nil {
				path := toString(assignmentsItem.Target["path"])
				if !strings.Contains(strings.TrimSpace(path), "/content/translations") {
					t.Fatalf("expected assignments target path to include /content/translations, got %q", path)
				}
				if len(assignmentsItem.Permissions) != 0 {
					t.Fatalf("expected assignments menu item to be module/profile-gated only, got permissions %v", assignmentsItem.Permissions)
				}
				if got := strings.TrimSpace(assignmentsItem.Icon); got != "clipboard-check" {
					t.Fatalf("expected assignments icon clipboard-check, got %q", got)
				}
				assertNoPersistedTranslationPermissionState(t, assignmentsItem)
			}

			dashboardItem := findMenuItemByRouteName(menu.Items, "admin.translations.dashboard")
			if (dashboardItem != nil) != tc.expectDashboard {
				t.Fatalf("expected dashboard menu=%t, got %t", tc.expectDashboard, dashboardItem != nil)
			}
			if dashboardItem != nil {
				parent := strings.TrimSpace(dashboardItem.ParentID)
				if !strings.Contains(parent, "nav-group-translations") {
					t.Fatalf("expected dashboard item parent to include nav-group-translations, got %q", parent)
				}
				path := toString(dashboardItem.Target["path"])
				if !strings.Contains(strings.TrimSpace(path), "/translations/dashboard") {
					t.Fatalf("expected dashboard target path to include /translations/dashboard, got %q", path)
				}
				if len(dashboardItem.Permissions) != 0 {
					t.Fatalf("expected dashboard menu item to be module/profile-gated only, got permissions %v", dashboardItem.Permissions)
				}
				if got := strings.TrimSpace(dashboardItem.Icon); got != "dashboard-dots" {
					t.Fatalf("expected dashboard icon dashboard-dots, got %q", got)
				}
				assertNoPersistedTranslationPermissionState(t, dashboardItem)
			}

			exchangeItem := findMenuItemByRouteName(menu.Items, "admin.translations.exchange")
			if (exchangeItem != nil) != tc.expectExchange {
				t.Fatalf("expected exchange menu=%t, got %t", tc.expectExchange, exchangeItem != nil)
			}
			if exchangeItem != nil {
				parent := strings.TrimSpace(exchangeItem.ParentID)
				if !strings.Contains(parent, "nav-group-translations") {
					t.Fatalf("expected exchange item parent to include nav-group-translations, got %q", parent)
				}
				path := toString(exchangeItem.Target["path"])
				if !strings.Contains(strings.TrimSpace(path), "/translations/exchange") {
					t.Fatalf("expected exchange target path to include /translations/exchange, got %q", path)
				}
				if len(exchangeItem.Permissions) != 0 {
					t.Fatalf("expected exchange menu item to be module/profile-gated only, got permissions %v", exchangeItem.Permissions)
				}
				if got := strings.TrimSpace(exchangeItem.Icon); got != "translate" {
					t.Fatalf("expected exchange icon translate, got %q", got)
				}
				assertNoPersistedTranslationPermissionState(t, exchangeItem)
			}
		})
	}
}

func TestTranslationCapabilityMenuItemsVisibleWithoutTranslationPermissions(t *testing.T) {
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en", WithNavPermissionDeniedMode(admin.NavigationPermissionDeniedModeDisable))
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
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
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	if err := NewModuleRegistrar(
		adm,
		cfg,
		nil,
		false,
		WithTranslationCapabilityMenuMode(TranslationCapabilityMenuModeTools),
	); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	// Sidebar translation entrypoints are module/profile-gated; they should remain visible
	// even when translation operation permissions are denied for the current user.
	adm.WithAuthorizer(denyTranslationPermissionAuthorizer{})
	navItems := BuildNavItems(adm, cfg, context.Background(), "")
	if item := findNavItemByKey(navItems, "translation_queue"); item == nil {
		t.Fatalf("expected translation queue sidebar entrypoint")
	} else {
		href := strings.TrimSpace(toString(item["href"]))
		if !strings.Contains(href, "/translations/queue") {
			t.Fatalf("expected queue href to include /translations/queue, got %q", href)
		}
		if disabled := translationBool(item["disabled"]); !disabled {
			t.Fatalf("expected queue entrypoint visible-disabled when permission denied")
		}
		if enabled := translationBool(item["enabled"]); enabled {
			t.Fatalf("expected queue entrypoint enabled=false when permission denied")
		}
		if code := strings.TrimSpace(toString(item["disabled_reason_code"])); code != admin.ActionDisabledReasonCodePermissionDenied {
			t.Fatalf("expected queue disabled reason_code=%q, got %q", admin.ActionDisabledReasonCodePermissionDenied, code)
		}
	}
	dashboardItem := findNavItemByKey(navItems, "translation_dashboard")
	if dashboardItem == nil {
		t.Fatalf("expected translation dashboard sidebar entrypoint")
	}
	dashboardHref := strings.TrimSpace(toString(dashboardItem["href"]))
	if !strings.Contains(dashboardHref, "/translations/dashboard") {
		t.Fatalf("expected dashboard href to include /translations/dashboard, got %q", dashboardHref)
	}
	if disabled := translationBool(dashboardItem["disabled"]); !disabled {
		t.Fatalf("expected dashboard entrypoint visible-disabled when permission denied")
	}
	if enabled := translationBool(dashboardItem["enabled"]); enabled {
		t.Fatalf("expected dashboard entrypoint enabled=false when permission denied")
	}
	if code := strings.TrimSpace(toString(dashboardItem["disabled_reason_code"])); code != admin.ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected dashboard disabled reason_code=%q, got %q", admin.ActionDisabledReasonCodePermissionDenied, code)
	}
	exchangeItem := findNavItemByKey(navItems, "translation_exchange")
	if exchangeItem == nil {
		t.Fatalf("expected translation exchange sidebar entrypoint")
	}
	href := strings.TrimSpace(toString(exchangeItem["href"]))
	if !strings.Contains(href, "/translations/exchange") {
		t.Fatalf("expected exchange href to include /translations/exchange, got %q", href)
	}
	if disabled := translationBool(exchangeItem["disabled"]); !disabled {
		t.Fatalf("expected exchange entrypoint visible-disabled when permission denied")
	}
	if enabled := translationBool(exchangeItem["enabled"]); enabled {
		t.Fatalf("expected exchange entrypoint enabled=false when permission denied")
	}
	if code := strings.TrimSpace(toString(exchangeItem["disabled_reason_code"])); code != admin.ActionDisabledReasonCodePermissionDenied {
		t.Fatalf("expected exchange disabled reason_code=%q, got %q", admin.ActionDisabledReasonCodePermissionDenied, code)
	}

	routePath := strings.TrimSpace(resolveRoutePath(adm.URLs(), "admin", "translations.exchange"))
	if !strings.Contains(routePath, "/translations/exchange") {
		t.Fatalf("expected exchange route path to include /translations/exchange, got %q", routePath)
	}
	dashboardRoutePath := strings.TrimSpace(resolveRoutePath(adm.URLs(), "admin", "translations.dashboard"))
	if !strings.Contains(dashboardRoutePath, "/translations/dashboard") {
		t.Fatalf("expected dashboard route path to include /translations/dashboard, got %q", dashboardRoutePath)
	}
}

func TestTranslationCapabilityMenuItemsKeepQueueNavigationInvariant(t *testing.T) {
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
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
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	items, omissions := translationCapabilityMenuItemsWithDiagnostics(adm, cfg, cfg.NavMenuCode, cfg.DefaultLocale)
	keys := map[string]bool{}
	for _, item := range items {
		keys[stringTargetValue(item.Target, "key")] = true
	}
	for _, key := range []string{"translation_dashboard", "translation_queue", "translation_assignments"} {
		if !keys[key] {
			t.Fatalf("queue capability must include invariant nav key %s, got keys=%v omissions=%v items=%#v", key, keys, omissions, items)
		}
	}
	if !keys["translation_exchange"] {
		t.Fatalf("exchange capability must include translation_exchange, got keys=%v omissions=%v", keys, omissions)
	}
	for _, omitted := range omissions {
		if strings.HasPrefix(strings.TrimSpace(omitted), "translations.") {
			t.Fatalf("full profile should not omit translation nav item %q; omissions=%v", omitted, omissions)
		}
	}
}

func TestTranslationCapabilityMenuItemsClearStalePermissionDeniedStateWhenAllowed(t *testing.T) {
	cleanupModuleCommandRegistry(t)

	cfg := NewAdminConfig("/admin", "Admin", "en")
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}
	adm, _, err := NewAdmin(
		cfg,
		AdapterHooks{},
		WithTranslationProductConfig(TranslationProductConfig{
			SchemaVersion: TranslationProductSchemaVersionCurrent,
			Profile:       TranslationProfileFull,
			Exchange: &TranslationExchangeConfig{
				Enabled: true,
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
		t.Fatalf("NewAdmin error: %v", err)
	}
	if adm.Commands() != nil {
		t.Cleanup(adm.Commands().Reset)
	}

	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(admin.NavigationItem{
		ID:          NavigationGroupTranslationsID,
		Type:        admin.MenuItemTypeGroup,
		GroupTitle:  "Translations",
		Collapsible: true,
		Children: []admin.NavigationItem{
			staleDeniedTranslationNavItem("translation_dashboard", "/admin/translations/dashboard"),
			staleDeniedTranslationNavItem("translation_queue", "/admin/translations/queue"),
			staleDeniedTranslationNavItem("translation_exchange", "/admin/translations/exchange"),
		},
	})

	navItems := BuildNavItems(adm, cfg, context.Background(), "")
	for _, key := range []string{"translation_dashboard", "translation_queue", "translation_exchange"} {
		item := findNavItemByKey(navItems, key)
		if item == nil {
			t.Fatalf("expected %s sidebar entrypoint", key)
		}
		if enabled := translationBool(item["enabled"]); !enabled {
			t.Fatalf("expected %s enabled=true after allowed request degradation, got %#v", key, item["enabled"])
		}
		if disabled := translationBool(item["disabled"]); disabled {
			t.Fatalf("expected %s disabled flag cleared, got %#v", key, item)
		}
		if reason := strings.TrimSpace(toString(item["disabled_reason"])); reason != "" {
			t.Fatalf("expected %s disabled_reason cleared, got %q", key, reason)
		}
		if code := strings.TrimSpace(toString(item["disabled_reason_code"])); code != "" {
			t.Fatalf("expected %s disabled_reason_code cleared, got %q", key, code)
		}
	}
}

type stubFeatureGate struct {
	flags map[string]bool
}

func (s stubFeatureGate) Enabled(_ context.Context, key string, opts ...fggate.ResolveOption) (bool, error) {
	req := &fggate.ResolveRequest{}
	for _, opt := range opts {
		if opt != nil {
			opt(req)
		}
	}
	if req.ScopeChain == nil || !hasScopeKind(*req.ScopeChain, fggate.ScopeSystem) {
		return false, errors.New("feature gate scope required")
	}
	return s.flags[key], nil
}

func hasScopeKind(chain fggate.ScopeChain, kind fggate.ScopeKind) bool {
	for _, ref := range chain {
		if ref.Kind == kind {
			return true
		}
	}
	return false
}

func findMenuItemByRouteName(items []admin.MenuItem, routeName string) *admin.MenuItem {
	target := strings.TrimSpace(routeName)
	if target == "" {
		return nil
	}
	for i := range items {
		item := &items[i]
		if item.Target != nil {
			name := toString(item.Target["name"])
			if strings.EqualFold(strings.TrimSpace(name), target) {
				return item
			}
		}
		if child := findMenuItemByRouteName(item.Children, target); child != nil {
			return child
		}
	}
	return nil
}

func assertMenuItemPermissions(t *testing.T, item *admin.MenuItem, want ...string) {
	t.Helper()
	if item == nil {
		t.Fatalf("expected menu item with permissions %v", want)
	}
	if len(item.Permissions) != len(want) {
		t.Fatalf("expected permissions %v, got %v", want, item.Permissions)
	}
	for idx := range want {
		if item.Permissions[idx] != want[idx] {
			t.Fatalf("expected permissions %v, got %v", want, item.Permissions)
		}
	}
}

func countMenuItemsByTargetKey(items []admin.MenuItem, key string) int {
	target := strings.TrimSpace(key)
	if target == "" {
		return 0
	}
	count := 0
	for i := range items {
		if strings.EqualFold(strings.TrimSpace(stringTargetValue(items[i].Target, "key")), target) {
			count++
		}
		count += countMenuItemsByTargetKey(items[i].Children, target)
	}
	return count
}

func assertNoPersistedTranslationPermissionState(t *testing.T, item *admin.MenuItem) {
	t.Helper()
	if item == nil {
		t.Fatalf("expected menu item")
	}
	for _, key := range []string{"enabled", "disabled", "aria_disabled", "disabled_reason", "disabled_reason_code"} {
		if _, ok := item.Target[key]; ok {
			t.Fatalf("expected no persisted request-scoped permission state %q on %s target, got %+v", key, item.ID, item.Target)
		}
	}
}

func staleDeniedTranslationNavItem(key, href string) admin.NavigationItem {
	return admin.NavigationItem{
		ID:    key,
		Type:  admin.MenuItemTypeItem,
		Label: key,
		Target: map[string]any{
			"type":                 "url",
			"path":                 href,
			"key":                  key,
			"enabled":              false,
			"disabled_reason":      "missing permission: admin.translations.view",
			"disabled_reason_code": admin.ActionDisabledReasonCodePermissionDenied,
		},
	}
}

func findNavItemByKey(items []map[string]any, target string) map[string]any {
	target = strings.TrimSpace(target)
	if target == "" || len(items) == 0 {
		return nil
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toString(item["key"])), target) {
			return item
		}
		children := navEntryChildren(item["children"])
		if found := findNavItemByKey(children, target); found != nil {
			return found
		}
	}
	return nil
}

func toString(value any) string {
	if value == nil {
		return ""
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

type denyTranslationPermissionAuthorizer struct{}

func (denyTranslationPermissionAuthorizer) Can(_ context.Context, action string, _ string) bool {
	return !strings.HasPrefix(strings.ToLower(strings.TrimSpace(action)), "admin.translations.")
}
