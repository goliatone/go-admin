package quickstart

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	commandregistry "github.com/goliatone/go-command/registry"
	fggate "github.com/goliatone/go-featuregate/gate"
)

type stubModule struct {
	id           string
	deps         []string
	featureFlags []string
	menuItems    []admin.MenuItem
}

type moduleRegistrarExchangeStoreStub struct{}

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
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	preRegistered := stubModule{id: "dup-module"}
	if err := adm.RegisterModule(preRegistered); err != nil {
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

func TestNewModuleRegistrarFeatureGatesSkipModules(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
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

func TestNewModuleRegistrarDoesNotSeedTranslationCapabilityMenuItemsByDefault(t *testing.T) {
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
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

	if err := NewModuleRegistrar(adm, cfg, nil, false); err != nil {
		t.Fatalf("NewModuleRegistrar error: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), cfg.NavMenuCode, cfg.DefaultLocale)
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected seeded menu")
	}
	if queueItem := findMenuItemByRouteName(menu.Items, "admin.translations.queue"); queueItem != nil {
		t.Fatalf("expected queue menu hidden by default, got %+v", *queueItem)
	}
	if exchangeItem := findMenuItemByRouteName(menu.Items, "admin.translations.exchange"); exchangeItem != nil {
		t.Fatalf("expected exchange menu hidden by default, got %+v", *exchangeItem)
	}
}

func TestNewModuleRegistrarSeedsTranslationCapabilityMenuItemsWhenEnabled(t *testing.T) {
	tests := []struct {
		name           string
		productCfg     TranslationProductConfig
		expectQueue    bool
		expectExchange bool
	}{
		{
			name: "core profile keeps translation menu hidden",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCore,
			},
			expectQueue:    false,
			expectExchange: false,
		},
		{
			name: "queue profile seeds queue menu only",
			productCfg: TranslationProductConfig{
				SchemaVersion: TranslationProductSchemaVersionCurrent,
				Profile:       TranslationProfileCoreQueue,
				Queue: &TranslationQueueConfig{
					Enabled:          true,
					SupportedLocales: []string{"en", "es"},
				},
			},
			expectQueue:    true,
			expectExchange: false,
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
			expectQueue:    false,
			expectExchange: true,
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
					SupportedLocales: []string{"en", "es"},
				},
			},
			expectQueue:    true,
			expectExchange: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

			cfg := NewAdminConfig("/admin", "Admin", "en")
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

			if err := NewModuleRegistrar(
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
				if !strings.Contains(parent, "nav-group-others") {
					t.Fatalf("expected queue item parent to include nav-group-others, got %q", parent)
				}
				path, _ := queueItem.Target["path"].(string)
				if !strings.Contains(strings.TrimSpace(path), "/content/translations") {
					t.Fatalf("expected queue target path to include /content/translations, got %q", path)
				}
				if len(queueItem.Permissions) != 0 {
					t.Fatalf("expected queue menu item to be module/profile-gated only, got permissions %v", queueItem.Permissions)
				}
			}

			exchangeItem := findMenuItemByRouteName(menu.Items, "admin.translations.exchange")
			if (exchangeItem != nil) != tc.expectExchange {
				t.Fatalf("expected exchange menu=%t, got %t", tc.expectExchange, exchangeItem != nil)
			}
			if exchangeItem != nil {
				parent := strings.TrimSpace(exchangeItem.ParentID)
				if !strings.Contains(parent, "nav-group-others") {
					t.Fatalf("expected exchange item parent to include nav-group-others, got %q", parent)
				}
				path, _ := exchangeItem.Target["path"].(string)
				if !strings.Contains(strings.TrimSpace(path), "/translations/exchange") {
					t.Fatalf("expected exchange target path to include /translations/exchange, got %q", path)
				}
				if len(exchangeItem.Permissions) != 0 {
					t.Fatalf("expected exchange menu item to be module/profile-gated only, got permissions %v", exchangeItem.Permissions)
				}
			}
		})
	}
}

func TestTranslationCapabilityMenuItemsVisibleWithoutTranslationPermissions(t *testing.T) {
	t.Cleanup(func() { _ = commandregistry.Stop(context.Background()) })

	cfg := NewAdminConfig("/admin", "Admin", "en")
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
	if item := findNavItemByKey(navItems, "translations"); item == nil {
		t.Fatalf("expected translation queue sidebar entrypoint")
	} else {
		href := strings.TrimSpace(toString(item["href"]))
		if !strings.Contains(href, "/content/translations") {
			t.Fatalf("expected queue href to include /content/translations, got %q", href)
		}
	}
	exchangeItem := findNavItemByKey(navItems, "translation_exchange")
	if exchangeItem == nil {
		t.Fatalf("expected translation exchange sidebar entrypoint")
	}
	href := strings.TrimSpace(toString(exchangeItem["href"]))
	if !strings.Contains(href, "/translations/exchange") {
		t.Fatalf("expected exchange href to include /translations/exchange, got %q", href)
	}

	routePath := strings.TrimSpace(resolveRoutePath(adm.URLs(), "admin", "translations.exchange"))
	if !strings.Contains(routePath, "/translations/exchange") {
		t.Fatalf("expected exchange route path to include /translations/exchange, got %q", routePath)
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
			name, _ := item.Target["name"].(string)
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

func findNavItemByKey(items []map[string]any, target string) map[string]any {
	target = strings.TrimSpace(target)
	if target == "" || len(items) == 0 {
		return nil
	}
	for _, item := range items {
		if strings.EqualFold(strings.TrimSpace(toString(item["key"])), target) {
			return item
		}
		children, _ := item["children"].([]map[string]any)
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
