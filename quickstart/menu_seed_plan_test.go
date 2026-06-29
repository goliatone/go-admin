package quickstart

import (
	"context"
	"reflect"
	"slices"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestBuildMenuSeedPlanSupportsHostLayoutOverrides(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode: "admin.main",
		Locale:   "en",
		ParentItems: []admin.MenuItem{
			{
				ID:          "host.nav",
				Type:        admin.MenuItemTypeGroup,
				GroupTitle:  "Host Navigation",
				Collapsible: true,
			},
		},
		ReplaceDefaultParents: true,
		TargetParentOverrides: map[string]string{"reports": "host.nav"},
		Modules: []admin.Module{
			stubModule{
				id: "reports",
				menuItems: []admin.MenuItem{
					{
						ID:    "reports",
						Label: "Reports",
						Target: map[string]any{
							"type": "url",
							"path": "/admin/reports",
							"key":  "reports",
						},
					},
				},
			},
		},
		ItemTransforms: []MenuSeedItemTransform{
			func(moduleID string, item *admin.MenuItem) {
				if moduleID == "reports" && item != nil {
					item.Label = "Analytics"
				}
			},
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	if len(plan.Items) != 2 {
		t.Fatalf("expected host parent plus module item, got %d items: %#v", len(plan.Items), plan.Items)
	}
	if item := findPlanItemByTargetKey(plan.Items, "content"); item != nil {
		t.Fatalf("expected default quickstart parents to be replaced, got content parent %#v", item)
	}
	item := findPlanItemByTargetKey(plan.Items, "reports")
	if item == nil {
		t.Fatalf("expected reports item in plan")
	}
	if item.Label != "Analytics" {
		t.Fatalf("expected transform to update label, got %q", item.Label)
	}
	if item.ParentID != "host.nav" {
		t.Fatalf("expected target parent override host.nav, got %q", item.ParentID)
	}
}

func TestBuildMenuSeedPlanAppliesTargetParentOverridesToBaseItems(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode:              "admin.main",
		Locale:                "en",
		ReplaceDefaultParents: true,
		ParentItems: []admin.MenuItem{
			{ID: "host.translations", Type: admin.MenuItemTypeGroup, GroupTitle: "Translations"},
		},
		BaseItems: []admin.MenuItem{
			testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
		},
		TargetParentOverrides: map[string]string{
			"translation_queue": "host.translations",
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	item := findPlanItemByTargetKey(plan.Items, "translation_queue")
	if item == nil {
		t.Fatalf("expected translation queue base item")
	}
	if item.ParentID != "host.translations" {
		t.Fatalf("expected base item parent override, got %q", item.ParentID)
	}
}

func TestBuildMenuSeedPlanAppliesBaseItemTransformsAfterParentOverrides(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode:              "admin.main",
		Locale:                "en",
		ReplaceDefaultParents: true,
		ParentItems: []admin.MenuItem{
			{ID: "host.translations", Type: admin.MenuItemTypeGroup, GroupTitle: "Translations"},
		},
		BaseItems: []admin.MenuItem{
			testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49),
		},
		TargetParentOverrides: map[string]string{
			"translation_dashboard": "host.translations",
		},
		BaseItemTransforms: []MenuSeedBaseItemTransform{
			func(item *admin.MenuItem) {
				if item == nil || stringTargetValue(item.Target, "key") != "translation_dashboard" {
					return
				}
				if item.ParentID != "host.translations" {
					t.Fatalf("expected parent override before base transform, got %q", item.ParentID)
				}
				item.Label = "Translations"
				item.LabelKey = "menu.translations.overview"
				item.Target["name"] = "admin.translations.overview"
				item.Target["breadcrumb_label"] = "Translation Center"
				item.Permissions = []string{"translations.view"}
			},
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	item := findPlanItemByTargetKey(plan.Items, "translation_dashboard")
	if item == nil {
		t.Fatalf("expected translation dashboard base item")
	}
	if item.Label != "Translations" {
		t.Fatalf("expected base transform label, got %q", item.Label)
	}
	if item.LabelKey != "menu.translations.overview" {
		t.Fatalf("expected base transform label key, got %q", item.LabelKey)
	}
	if got := stringTargetValue(item.Target, "name"); got != "admin.translations.overview" {
		t.Fatalf("expected base transform target name, got %q", got)
	}
	if got := stringTargetValue(item.Target, "breadcrumb_label"); got != "Translation Center" {
		t.Fatalf("expected base transform breadcrumb, got %q", got)
	}
	if !reflect.DeepEqual(item.Permissions, []string{"translations.view"}) {
		t.Fatalf("expected base transform permissions, got %#v", item.Permissions)
	}
	if item.ParentID != "host.translations" {
		t.Fatalf("expected parent override to remain compatible, got %q", item.ParentID)
	}
}

func TestBuildMenuSeedPlanMapsSemanticPlacementSlots(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode:              "admin.main",
		Locale:                "en",
		ReplaceDefaultParents: true,
		ParentItems: []admin.MenuItem{
			{ID: "host.content", Type: admin.MenuItemTypeGroup, GroupTitle: "Content"},
		},
		SlotParentOverrides: map[string]string{"content": "host.content"},
		Modules: []admin.Module{
			stubModule{
				id: "articles",
				menuItems: []admin.MenuItem{
					{
						ID:            "articles",
						Label:         "Articles",
						PlacementSlot: "content",
						Target: map[string]any{
							"type": "url",
							"path": "/admin/articles",
							"key":  "articles",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	item := findPlanItemByTargetKey(plan.Items, "articles")
	if item == nil {
		t.Fatalf("expected articles item in plan")
	}
	if item.ParentID != "host.content" {
		t.Fatalf("expected placement slot parent host.content, got %q", item.ParentID)
	}
}

func TestBuildMenuSeedPlanMapsTargetPlacementSlot(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode:              "admin.main",
		Locale:                "en",
		ReplaceDefaultParents: true,
		ParentItems: []admin.MenuItem{
			{ID: "host.tools", Type: admin.MenuItemTypeGroup, GroupTitle: "Tools"},
		},
		SlotParentOverrides: map[string]string{"tools": "host.tools"},
		Modules: []admin.Module{
			stubModule{
				id: "exports",
				menuItems: []admin.MenuItem{
					{
						ID:    "exports",
						Label: "Exports",
						Target: map[string]any{
							"type":                     "url",
							"path":                     "/admin/exports",
							"key":                      "exports",
							MenuTargetPlacementSlotKey: "tools",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	item := findPlanItemByTargetKey(plan.Items, "exports")
	if item == nil {
		t.Fatalf("expected exports item in plan")
	}
	if item.ParentID != "host.tools" {
		t.Fatalf("expected target placement slot parent host.tools, got %q", item.ParentID)
	}
}

func TestBuildMenuSeedPlanTargetParentOverrideWinsOverSlot(t *testing.T) {
	t.Parallel()

	plan, err := BuildMenuSeedPlan(MenuSeedPlanOptions{
		MenuCode:              "admin.main",
		Locale:                "en",
		ReplaceDefaultParents: true,
		ParentItems: []admin.MenuItem{
			{ID: "host.content", Type: admin.MenuItemTypeGroup, GroupTitle: "Content"},
			{ID: "host.users", Type: admin.MenuItemTypeGroup, GroupTitle: "Users"},
		},
		SlotParentOverrides:   map[string]string{"content": "host.content"},
		TargetParentOverrides: map[string]string{"users": "host.users"},
		Modules: []admin.Module{
			stubModule{
				id: "users",
				menuItems: []admin.MenuItem{
					{
						ID:            "users",
						Label:         "Users",
						PlacementSlot: "content",
						Target: map[string]any{
							"type": "url",
							"path": "/admin/users",
							"key":  "users",
						},
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("BuildMenuSeedPlan error: %v", err)
	}
	item := findPlanItemByTargetKey(plan.Items, "users")
	if item == nil {
		t.Fatalf("expected users item in plan")
	}
	if item.ParentID != "host.users" {
		t.Fatalf("expected target parent override host.users, got %q", item.ParentID)
	}
}

func TestNormalizeSeedMenuItemPromotesTargetPlacementSlot(t *testing.T) {
	t.Parallel()

	item, err := normalizeSeedMenuItem("admin.main", "en", admin.MenuItem{
		ID:    "exports",
		Label: "Exports",
		Target: map[string]any{
			"type":                     "url",
			"path":                     "/admin/exports",
			"key":                      "exports",
			MenuTargetPlacementSlotKey: "tools",
		},
	})
	if err != nil {
		t.Fatalf("normalizeSeedMenuItem error: %v", err)
	}
	if item.PlacementSlot != "tools" {
		t.Fatalf("expected placement slot tools, got %q", item.PlacementSlot)
	}
	if got := stringTargetValue(item.Target, MenuTargetPlacementSlotKey); got != "tools" {
		t.Fatalf("expected target placement slot tools, got %q", got)
	}
}

func TestReconcileGeneratedNavigationDryRunAndApplyRepairsMissingRows(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	if err := menuSvc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:          NavigationGroupTranslationsID,
		Type:        admin.MenuItemTypeGroup,
		GroupTitle:  "Translations",
		Collapsible: true,
		Locale:      locale,
	}); err != nil {
		t.Fatalf("seed stale parent: %v", err)
	}

	expected := []admin.MenuItem{
		{
			ID:          NavigationGroupTranslationsID,
			Type:        admin.MenuItemTypeGroup,
			GroupTitle:  "Translations",
			Collapsible: true,
		},
		testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
	}
	dryRun, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
	})
	if err != nil {
		t.Fatalf("dry-run reconcile: %v", err)
	}
	if !containsStringWithSuffix(dryRun.Creates, "translations.queue") {
		t.Fatalf("expected dry-run create for translation queue, got %#v", dryRun.Creates)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after dry-run: %v", err)
	}
	if item := findMenuItemByTargetKeyForTest(menu.Items, "translation_queue"); item != nil {
		t.Fatalf("dry-run should not mutate menu, got %#v", item)
	}

	applied, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("apply reconcile: %v", err)
	}
	if len(applied.Creates) == 0 {
		t.Fatalf("expected applied create report, got %#v", applied)
	}
	menu, err = menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after apply: %v", err)
	}
	if item := findMenuItemByTargetKeyForTest(menu.Items, "translation_queue"); item == nil {
		t.Fatalf("expected translation queue after apply, got %#v", menu.Items)
	}

}

func TestReconcileGeneratedNavigationUsesScopedRawInventoryOptions(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin.main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50)
	menuSvc := &rawInventoryMenuService{InMemoryMenuService: admin.NewInMemoryMenuService()}
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}

	_, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		RawInventory: admin.NavigationRawInventoryOptions{
			Environment:       "preview",
			EnvironmentSource: "test",
		},
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if menuSvc.rawOptions.MenuCode != "admin_main" || menuSvc.rawOptions.Environment != "preview" || menuSvc.rawOptions.EnvironmentSource != "test" {
		t.Fatalf("expected scoped raw inventory options, got %#v", menuSvc.rawOptions)
	}
}

func TestReconcileGeneratedNavigationApplyUsesConvergenceCoordinator(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin.main"
	locale := "en"
	menuSvc := &coordinatedNavigationMenuService{InMemoryMenuService: admin.NewInMemoryMenuService()}
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	expected := testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50)

	if _, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
		RawInventory: admin.NavigationRawInventoryOptions{
			Environment:       "preview",
			EnvironmentSource: "test",
		},
	}); err != nil {
		t.Fatalf("apply reconcile: %v", err)
	}
	if menuSvc.coordinationCalls != 1 {
		t.Fatalf("expected one coordination call, got %d", menuSvc.coordinationCalls)
	}
	if menuSvc.lastScope.MenuCode != "admin_main" || menuSvc.lastScope.Environment != "preview" || menuSvc.lastScope.EnvironmentSource != "test" {
		t.Fatalf("expected scoped convergence call, got %#v", menuSvc.lastScope)
	}
	if menuSvc.lastScope.EngineIdentity == "" || menuSvc.lastScope.EngineVersion == "" {
		t.Fatalf("expected engine stamp in convergence scope, got %#v", menuSvc.lastScope)
	}
}

func TestReconcileGeneratedNavigationRepairsMissingTranslationDashboardWithSiblingsPresent(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin_main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}

	expected := []admin.MenuItem{
		{
			ID:          NavigationGroupTranslationsID,
			Type:        admin.MenuItemTypeGroup,
			GroupTitle:  "Translations",
			Collapsible: true,
		},
		testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49),
		testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
		testGeneratedMenuItem("translations.assignments", NavigationGroupTranslationsID, "Translation Assignments", "translation_assignments", "/admin/content/translations", 51),
		testGeneratedMenuItem("translations.exchange", NavigationGroupTranslationsID, "Translation Exchange", "translation_exchange", "/admin/translations/exchange", 52),
	}
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	if addErr := menuSvc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       "admin_main.dashboard",
		Label:    "Dashboard",
		Locale:   locale,
		Target:   map[string]any{"type": "url", "path": "/admin/dashboard", "key": "dashboard"},
		Position: intPtr(0),
	}); addErr != nil {
		t.Fatalf("seed root dashboard: %v", addErr)
	}
	for _, item := range seedItems {
		if strings.EqualFold(stringTargetValue(item.Target, "key"), "translation_dashboard") {
			continue
		}
		if addErr := menuSvc.AddMenuItem(ctx, menuCode, item); addErr != nil {
			t.Fatalf("seed existing item %s: %v", item.ID, addErr)
		}
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("apply reconcile: %v", err)
	}
	if !containsStringWithSuffix(report.Creates, "translations.dashboard") {
		t.Fatalf("expected create for missing translation dashboard, got %#v", report)
	}
	if !containsStringWithSuffix(report.PersistedMissing, "translations.dashboard") {
		t.Fatalf("expected persisted-missing for translation dashboard, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after apply: %v", err)
	}
	if item := findMenuItemByTargetKeyForTest(menu.Items, "translation_dashboard"); item == nil {
		t.Fatalf("expected translation dashboard after apply, got %#v", menu.Items)
	}
	for _, key := range []string{"translation_queue", "translation_assignments", "translation_exchange"} {
		if item := findMenuItemByTargetKeyForTest(menu.Items, key); item == nil {
			t.Fatalf("expected sibling %s to remain after apply, got %#v", key, menu.Items)
		}
	}
}

func TestReconcileGeneratedNavigationPostApplyCreatesMissingExactGeneratedRow(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin_main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	expectedDashboard := findPlanItemByTargetKey(seedItems, "translation_dashboard")
	if expectedDashboard == nil {
		t.Fatalf("expected generated translation dashboard seed item, got %#v", seedItems)
	}

	weakMatch := *expectedDashboard
	weakMatch.ID = "admin_main.legacy.translations.dashboard"
	weakMatch.Code = weakMatch.ID
	delete(weakMatch.Target, MenuTargetGeneratedIDKey)
	menuSvc := &noopUpdateMenuService{staleTargetMenuService: &staleTargetMenuService{
		code:   menuCode,
		locale: locale,
		items:  []admin.MenuItem{weakMatch},
	}}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("apply reconcile: %v", err)
	}
	if containsStringWithSuffix(report.PersistedPresent, "translations.dashboard") {
		t.Fatalf("expected weak match not to remain persisted-present after exact replacement, got %#v", report)
	}
	if !containsStringWithSuffix(report.Creates, "translations.dashboard") {
		t.Fatalf("expected post-apply exact create for dashboard, got %#v", report)
	}
	if !containsStringWithSuffix(report.DestructiveCandidates, "legacy.translations.dashboard") {
		t.Fatalf("expected weak legacy dashboard to be reported as destructive candidate, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after apply: %v", err)
	}
	if !exactGeneratedNavigationItemPresent(*expectedDashboard, menu.Items) {
		t.Fatalf("expected canonical dashboard row after post-apply verification, got %#v", menu.Items)
	}
	if legacy := findMenuItemByIDForTest(menu.Items, "admin_main.legacy.translations.dashboard"); legacy == nil {
		t.Fatalf("expected weak legacy dashboard row to be preserved without destructive apply, got %#v", menu.Items)
	}

	report, err = ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:          menuSvc,
		MenuCode:         menuCode,
		Locale:           locale,
		Items:            []admin.MenuItem{expected},
		Apply:            true,
		AllowDestructive: true,
	})
	if err != nil {
		t.Fatalf("destructive reconcile: %v", err)
	}
	if !containsStringWithSuffix(report.DestructiveCandidates, "legacy.translations.dashboard") {
		t.Fatalf("expected destructive reconcile to report weak legacy dashboard candidate, got %#v", report)
	}
	menu, err = menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after destructive reconcile: %v", err)
	}
	if legacy := findMenuItemByIDForTest(menu.Items, "admin_main.legacy.translations.dashboard"); legacy != nil {
		t.Fatalf("expected destructive reconcile to remove weak legacy dashboard row, got %#v", legacy)
	}
}

func TestReconcileGeneratedNavigationReturnsErrorWhenCreateDoesNotPersist(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin_main"
	locale := "en"
	expected := []admin.MenuItem{
		testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49),
	}
	menuSvc := &noopAddMenuService{staleTargetMenuService: &staleTargetMenuService{code: menuCode, locale: locale}}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	})
	if err == nil {
		t.Fatalf("expected error when generated create does not persist, report=%#v", report)
	}
	if !strings.Contains(err.Error(), "still missing after apply") {
		t.Fatalf("expected post-apply missing error, got %v", err)
	}
}

func TestReconcileGeneratedNavigationKeepsWeakRowWhenReplacementWouldNotRender(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin_main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	expectedDashboard := findPlanItemByTargetKey(seedItems, "translation_dashboard")
	if expectedDashboard == nil {
		t.Fatalf("expected generated translation dashboard seed item, got %#v", seedItems)
	}

	weakMatch := *expectedDashboard
	weakMatch.ID = "admin_main.legacy.translations.dashboard"
	weakMatch.Code = weakMatch.ID
	delete(weakMatch.Target, MenuTargetGeneratedIDKey)
	menuSvc := &noopAddMenuService{staleTargetMenuService: &staleTargetMenuService{
		code:   menuCode,
		locale: locale,
		items:  []admin.MenuItem{weakMatch},
	}}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("safe replacement reconcile: %v", err)
	}
	if !containsStringWithSuffix(report.Updates, "translations.dashboard") {
		t.Fatalf("expected weak generated row to be updated in place, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after safe replace: %v", err)
	}
	if legacy := findMenuItemByIDForTest(menu.Items, "admin_main.legacy.translations.dashboard"); legacy == nil {
		t.Fatalf("expected weak legacy dashboard row to remain without destructive apply, got %#v", menu.Items)
	}
}

func TestReconcileGeneratedNavigationErrorsWhenExactGeneratedRowOnlyInRawInventoryApplyMode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin_main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.dashboard", "", "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	expectedDashboard := findPlanItemByTargetKey(seedItems, "translation_dashboard")
	if expectedDashboard == nil {
		t.Fatalf("expected generated translation dashboard seed item, got %#v", seedItems)
	}
	menuSvc := &rawInventoryMenuService{
		InMemoryMenuService: admin.NewInMemoryMenuService(),
		raw:                 []admin.MenuItem{*expectedDashboard},
	}
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err == nil {
		t.Fatalf("expected raw-only rendered absence error, report=%#v", report)
	}
	if !strings.Contains(err.Error(), "still not rendered after apply") {
		t.Fatalf("expected rendered absence error, got %v", err)
	}
	if !containsStringWithSuffix(report.RawPresentButNotRendered, "translations.dashboard") {
		t.Fatalf("expected raw-present-but-not-rendered diagnostic, got %#v", report)
	}
}

func TestReconcileGeneratedNavigationReportsAmbiguousWeakGeneratedReplacement(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin_main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.dashboard", NavigationGroupTranslationsID, "Translation Dashboard", "translation_dashboard", "/admin/translations/dashboard", 49)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	expectedDashboard := findPlanItemByTargetKey(seedItems, "translation_dashboard")
	if expectedDashboard == nil {
		t.Fatalf("expected generated translation dashboard seed item, got %#v", seedItems)
	}

	weakA := *expectedDashboard
	weakA.ID = "admin_main.legacy-a.translations.dashboard"
	weakA.Code = weakA.ID
	delete(weakA.Target, MenuTargetGeneratedIDKey)
	weakB := *expectedDashboard
	weakB.ID = "admin_main.legacy-b.translations.dashboard"
	weakB.Code = weakB.ID
	delete(weakB.Target, MenuTargetGeneratedIDKey)
	menuSvc := &staleTargetMenuService{code: menuCode, locale: locale, items: []admin.MenuItem{weakA, weakB}}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("ambiguous weak generated replacement should not fail safe apply: %v", err)
	}
	if !containsStringWithPrefix(report.DuplicateIdentities, "ambiguous_exact_replacement:") {
		t.Fatalf("expected ambiguous exact replacement diagnostic, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu after ambiguous replacement: %v", err)
	}
	if !exactGeneratedNavigationItemPresent(*expectedDashboard, menu.Items) {
		t.Fatalf("expected canonical dashboard row after ambiguous replacement, got %#v", menu.Items)
	}
	if findMenuItemByIDForTest(menu.Items, weakA.ID) == nil || findMenuItemByIDForTest(menu.Items, weakB.ID) == nil {
		t.Fatalf("expected ambiguous weak rows to remain without destructive apply, got %#v", menu.Items)
	}
}

func TestReconcileGeneratedNavigationPreservesExtendedMenuFields(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}

	urlOverride := "/admin/translations/queue?layout=compact"
	expectedBadge := map[string]any{"label": "Beta", "tone": "warning"}
	expectedClasses := []string{"nav-translations", "is-emphasized"}
	expectedStyles := map[string]string{"--accent": "#f80"}
	item := testGeneratedMenuItem("translations.queue", "", "Translation Queue", "translation_queue", "/admin/translations/queue", 50)
	item.URLOverride = &urlOverride
	item.Badge = expectedBadge
	item.Classes = expectedClasses
	item.Styles = expectedStyles

	if _, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{item},
		Apply:    true,
	}); err != nil {
		t.Fatalf("apply reconcile: %v", err)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	got := findMenuItemByTargetKeyForTest(menu.Items, "translation_queue")
	if got == nil {
		t.Fatalf("expected translation queue row, got %#v", menu.Items)
	}
	if got.URLOverride == nil || *got.URLOverride != urlOverride {
		t.Fatalf("expected URLOverride %q, got %#v", urlOverride, got.URLOverride)
	}
	if !reflect.DeepEqual(got.Badge, expectedBadge) {
		t.Fatalf("expected badge %#v, got %#v", expectedBadge, got.Badge)
	}
	if !reflect.DeepEqual(got.Classes, expectedClasses) {
		t.Fatalf("expected classes %#v, got %#v", expectedClasses, got.Classes)
	}
	if !reflect.DeepEqual(got.Styles, expectedStyles) {
		t.Fatalf("expected styles %#v, got %#v", expectedStyles, got.Styles)
	}
}

func TestReconcileGeneratedNavigationSecondPassIsIdempotent(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	expected := []admin.MenuItem{
		{
			ID:          NavigationGroupTranslationsID,
			Type:        admin.MenuItemTypeGroup,
			GroupTitle:  "Translations",
			Collapsible: true,
		},
		testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
	}
	if _, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	}); err != nil {
		t.Fatalf("first apply reconcile: %v", err)
	}

	second, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("second apply reconcile: %v", err)
	}
	if len(second.Creates) != 0 || len(second.Updates) != 0 || len(second.DestructiveCandidates) != 0 || len(second.DuplicateIdentities) != 0 || len(second.StaleTargetStateCleanup) != 0 {
		t.Fatalf("expected second pass to be normalized-idempotent, got %#v", second)
	}
}

func TestReconcileGeneratedNavigationDoesNotOverwriteUserRowWithMatchingTarget(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	if err := menuSvc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:     "custom.translations.queue",
		Label:  "Custom Queue",
		Locale: locale,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/translations/queue",
			"key":  "translation_queue",
		},
	}); err != nil {
		t.Fatalf("seed custom row: %v", err)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("translations.queue", "", "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
		},
		Apply: true,
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if len(report.PreservedUserRows) == 0 {
		t.Fatalf("expected matching user row to be preserved, got %#v", report)
	}
	if len(report.Creates) == 0 {
		t.Fatalf("expected generated row create beside preserved user row, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	custom := findMenuItemByIDForTest(menu.Items, "custom.translations.queue")
	if custom == nil {
		t.Fatalf("expected custom row to remain")
	}
	if custom.Label != "Custom Queue" {
		t.Fatalf("expected custom row label preserved, got %q", custom.Label)
	}
	generated := findMenuItemByIDForTest(menu.Items, "admin_main.translations.queue")
	if generated == nil {
		t.Fatalf("expected generated queue row to be created, got %#v", menu.Items)
	}
}

func TestReconcileGeneratedNavigationDoesNotOverwriteSameParentUserShortcut(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	if err := menuSvc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       "custom.translation.queue",
		Label:    "Custom Queue",
		Locale:   locale,
		ParentID: "admin_main." + NavigationGroupTranslationsID,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/translations/queue",
			"key":  "translation_queue",
			"name": "admin.translations.queue",
		},
	}); err != nil {
		t.Fatalf("seed custom row: %v", err)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			{
				ID:          NavigationGroupTranslationsID,
				Type:        admin.MenuItemTypeGroup,
				GroupTitle:  "Translations",
				Collapsible: true,
			},
			testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
		},
		Apply: true,
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if !containsStringWithSuffix(report.Creates, "translations.queue") {
		t.Fatalf("expected generated queue to be created beside same-parent user shortcut, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	custom := findMenuItemByIDForTest(menu.Items, "custom.translation.queue")
	if custom == nil {
		t.Fatalf("expected custom row to remain")
	}
	if custom.Label != "Custom Queue" {
		t.Fatalf("expected custom row label preserved, got %q", custom.Label)
	}
	generated := findMenuItemByIDForTest(menu.Items, "admin_main.translations.queue")
	if generated == nil {
		t.Fatalf("expected generated queue row to be created, got %#v", menu.Items)
	}
}

func TestReconcileGeneratedNavigationSkipsAmbiguousLegacyMatchesInApplyMode(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, err := menuSvc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("CreateMenu: %v", err)
	}
	for _, item := range []admin.MenuItem{
		{ID: "legacy.queue.a", Label: "Legacy Queue A", Locale: locale, Target: map[string]any{"type": "url", "path": "/admin/translations/queue", "key": "translation_queue", MenuTargetGeneratedIDKey: "admin_main.translations.queue"}},
		{ID: "legacy.queue.b", Label: "Legacy Queue B", Locale: locale, Target: map[string]any{"type": "url", "path": "/admin/translations/queue", "key": "translation_queue", MenuTargetGeneratedIDKey: "admin_main.translations.queue"}},
	} {
		if err := menuSvc.AddMenuItem(ctx, menuCode, item); err != nil {
			t.Fatalf("seed legacy row %s: %v", item.ID, err)
		}
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("translations.queue", "", "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
		},
		Apply: true,
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if !containsStringWithPrefix(report.DuplicateIdentities, "ambiguous:") {
		t.Fatalf("expected ambiguous duplicate diagnostic, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	if item := findMenuItemByIDForTest(menu.Items, "legacy.queue.a"); item == nil || item.Label != "Legacy Queue A" {
		t.Fatalf("expected first legacy row untouched, got %#v", item)
	}
	if item := findMenuItemByIDForTest(menu.Items, "legacy.queue.b"); item == nil || item.Label != "Legacy Queue B" {
		t.Fatalf("expected second legacy row untouched, got %#v", item)
	}
}

func TestReconcileGeneratedNavigationUpgradesExactLegacyParentOwnership(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	expected := admin.MenuItem{
		ID:          NavigationGroupTranslationsID,
		Type:        admin.MenuItemTypeGroup,
		GroupTitle:  "Translations",
		Collapsible: true,
	}
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	legacy := seedItems[0]
	legacy.Target = nil
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	if addErr := menuSvc.AddMenuItem(ctx, menuCode, legacy); addErr != nil {
		t.Fatalf("seed legacy parent: %v", addErr)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if len(report.Updates) == 0 {
		t.Fatalf("expected legacy parent ownership update, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	updated := findMenuItemByIDForTest(menu.Items, legacy.ID)
	if updated == nil {
		t.Fatalf("expected parent after reconcile")
	}
	if got := stringTargetValue(updated.Target, MenuTargetGeneratedByKey); got != MenuTargetGeneratedOwner {
		t.Fatalf("expected generated owner metadata, got target %#v", updated.Target)
	}
}

func TestReconcileGeneratedNavigationReportsCapabilityAndPermissionDiagnostics(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, err := menuSvc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("CreateMenu: %v", err)
	}
	item := testGeneratedMenuItem("secure.item", "", "Secure", "secure", "/admin/secure", 10)
	item.Permissions = []string{"admin.secure.view"}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:             menuSvc,
		MenuCode:            menuCode,
		Locale:              locale,
		Items:               []admin.MenuItem{item},
		CapabilityOmissions: []string{"translations.exchange"},
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if !containsMenuSeedPlanString(report.CapabilityOmissions, "translations.exchange") {
		t.Fatalf("expected capability omission diagnostic, got %#v", report)
	}
	if !containsStringWithSuffix(report.PermissionFilteredItems, "secure.item") {
		t.Fatalf("expected permission filtered diagnostic, got %#v", report)
	}
}

func TestReconcileGeneratedNavigationUpdatesStaleGeneratedRows(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	stale := testGeneratedMenuItem("translations.queue", "", "Old Queue", "translation_queue", "/old", 50)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{stale},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	stale = seedItems[0]
	stale.ID = "admin_main.translations.queue"
	stale.Code = stale.ID
	stale.Label = "Old Queue"
	stale.Target["path"] = "/old"
	stale.Target[MenuTargetGeneratedIDKey] = stale.ID
	stale.Target["disabled_reason"] = "Permission denied"
	stale.Locale = locale
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("create menu: %v", createErr)
	}
	if addErr := menuSvc.AddMenuItem(ctx, menuCode, stale); addErr != nil {
		t.Fatalf("seed stale row: %v", addErr)
	}

	expected := []admin.MenuItem{
		testGeneratedMenuItem("translations.queue", "", "Translation Queue", "translation_queue", "/admin/translations/queue", 50),
	}
	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    expected,
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("reconcile stale row: %v", err)
	}
	if len(report.Updates) == 0 {
		t.Fatalf("expected update for stale generated row, got %#v", report)
	}
	if len(report.StaleTargetStateCleanup) != 0 {
		t.Fatalf("expected in-memory persistence boundary to strip target-state cleanup before reconcile, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	item := findMenuItemByTargetKeyForTest(menu.Items, "translation_queue")
	if item == nil {
		t.Fatalf("expected reconciled queue row")
	}
	if item.Label != "Translation Queue" {
		t.Fatalf("expected label update, got %q", item.Label)
	}
	if got := strings.TrimSpace(toString(item.Target["path"])); got != "/admin/translations/queue" {
		t.Fatalf("expected path update, got %q", got)
	}
	if _, ok := item.Target["disabled_reason"]; ok {
		t.Fatalf("expected transient disabled_reason cleared, got %#v", item.Target)
	}
}

func TestReconcileGeneratedNavigationAppliesStaleTargetStateCleanup(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin.main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.queue", "", "Translation Queue", "translation_queue", "/admin/translations/queue", 50)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	stale := seedItems[0]
	stale.Target["disabled_reason"] = "Permission denied"
	stale.Target["disabled_reason_code"] = "permission_denied"
	menuSvc := &staleTargetMenuService{code: menuCode, locale: locale, items: []admin.MenuItem{stale}}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("reconcile stale target state: %v", err)
	}
	if len(report.Updates) == 0 {
		t.Fatalf("expected stale target cleanup update, got %#v", report)
	}
	if !containsStringWithSuffix(report.StaleTargetStateCleanup, "translations.queue") {
		t.Fatalf("expected stale target cleanup diagnostic, got %#v", report)
	}
	updated := findMenuItemByTargetKeyForTest(menuSvc.items, "translation_queue")
	if updated == nil {
		t.Fatalf("expected updated translation queue row")
	}
	if _, ok := updated.Target["disabled_reason"]; ok {
		t.Fatalf("expected disabled_reason to be removed, got target %#v", updated.Target)
	}
	if _, ok := updated.Target["disabled_reason_code"]; ok {
		t.Fatalf("expected disabled_reason_code to be removed, got target %#v", updated.Target)
	}
}

func TestSeedNavigationCompactsSparseGeneratedPositionsByParent(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   "en",
		Items: []admin.MenuItem{
			{
				ID:          "content",
				Type:        admin.MenuItemTypeGroup,
				GroupTitle:  "Content",
				Collapsible: true,
				Position:    intPtr(10),
			},
			testGeneratedMenuItem("content.media", "content", "Media", "media", "/admin/media", 35),
			testGeneratedMenuItem("content.events", "content", "Events", "events", "/admin/events", 36),
			testGeneratedMenuItem("content.sessions", "content", "Sessions", "sessions", "/admin/sessions", 37),
			{
				ID:          "utility",
				Type:        admin.MenuItemTypeGroup,
				GroupTitle:  "Utility",
				Collapsible: true,
				Position:    intPtr(90),
			},
		},
	})

	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}

	assertSeedPosition(t, seedItems, "admin_main.content", 0)
	assertSeedPosition(t, seedItems, "admin_main.utility", 1)
	assertSeedPosition(t, seedItems, "admin_main.content.media", 0)
	assertSeedPosition(t, seedItems, "admin_main.content.events", 1)
	assertSeedPosition(t, seedItems, "admin_main.content.sessions", 2)
	assertGeneratedSortOrder(t, seedItems, "admin_main.content.media", 35)
	assertGeneratedSortOrder(t, seedItems, "admin_main.content.events", 36)
	assertGeneratedSortOrder(t, seedItems, "admin_main.content.sessions", 37)
}

func TestReconcileGeneratedNavigationRepairsSparseSiblingPositions(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if _, err := menuSvc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("CreateMenu: %v", err)
	}

	items := []admin.MenuItem{
		{
			ID:          "nav.content",
			Type:        admin.MenuItemTypeGroup,
			GroupTitle:  "Content",
			Collapsible: true,
			Position:    intPtr(10),
		},
		testGeneratedMenuItem("nav.content.media", "nav.content", "Media", "media", "/admin/media", 35),
		testGeneratedMenuItem("nav.content.events", "nav.content", "Events", "events", "/admin/events", 36),
	}
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    items,
	})
	stale, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	for _, item := range stale {
		if item.ID == "admin_main.nav.content.media" {
			item.Position = intPtr(35)
		}
		if item.ID == "admin_main.nav.content.events" {
			item.Position = intPtr(35)
		}
		if addErr := menuSvc.AddMenuItem(ctx, menuCode, item); addErr != nil {
			t.Fatalf("seed stale row %s: %v", item.ID, addErr)
		}
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    items,
		Apply:    true,
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if len(report.Updates) == 0 {
		t.Fatalf("expected stale position updates, got %#v", report)
	}

	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("read menu: %v", err)
	}
	media := findMenuItemByTargetKeyForTest(menu.Items, "media")
	events := findMenuItemByTargetKeyForTest(menu.Items, "events")
	if media == nil || media.Position == nil || *media.Position != 0 {
		t.Fatalf("expected media compact position 0, got %#v", media)
	}
	if events == nil || events.Position == nil || *events.Position != 1 {
		t.Fatalf("expected events compact position 1, got %#v", events)
	}
}

func TestReconcileGeneratedNavigationUsesRawInventoryWhenRenderedMenuHidesRow(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin.main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}

	rawOnly := seedItems[0]
	rawOnly.ID = "admin_main.legacy.translation.queue"
	rawOnly.Code = rawOnly.ID
	rawOnly.ParentID = "admin_main." + NavigationGroupTranslationsID
	rawOnly.ParentCode = rawOnly.ParentID
	rawOnly.Target["path"] = ""

	menuSvc := &rawInventoryMenuService{
		InMemoryMenuService: admin.NewInMemoryMenuService(),
		raw:                 []admin.MenuItem{rawOnly},
	}
	if _, createErr := menuSvc.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if containsStringWithSuffix(report.Creates, "translations.queue") {
		t.Fatalf("expected raw row to prevent duplicate queue create, got %#v", report.Creates)
	}
	if !containsStringWithSuffix(report.Updates, "translations.queue") {
		t.Fatalf("expected raw row to be reported as update candidate, got %#v", report)
	}
	if !containsStringWithSuffix(report.RawPresentButNotRendered, "legacy.translation.queue") {
		t.Fatalf("expected raw-present diagnostic, got %#v", report.RawPresentButNotRendered)
	}
	if !containsStringWithSuffix(report.PersistedPresent, "translations.queue") {
		t.Fatalf("expected persisted-present diagnostic, got %#v", report.PersistedPresent)
	}
}

func TestReconcileGeneratedNavigationKeepsRawGeneratedRowWhenRenderedUserRowSharesTarget(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuCode := "admin.main"
	locale := "en"
	expected := testGeneratedMenuItem("translations.queue", NavigationGroupTranslationsID, "Translation Queue", "translation_queue", "/admin/translations/queue", 50)
	runtime := newSeedNavigationRuntime(ctx, SeedNavigationOptions{
		MenuSvc:  admin.NewInMemoryMenuService(),
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	seedItems, err := runtime.seedItems()
	if err != nil {
		t.Fatalf("seedItems: %v", err)
	}
	rawGenerated := seedItems[0]
	rawGenerated.Target["path"] = ""

	rendered := admin.NewInMemoryMenuService()
	if _, createErr := rendered.CreateMenu(ctx, menuCode); createErr != nil {
		t.Fatalf("CreateMenu: %v", createErr)
	}
	if addErr := rendered.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       "custom.translation.queue",
		Label:    "Custom Queue",
		Locale:   locale,
		ParentID: "admin_main." + NavigationGroupTranslationsID,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/translations/queue",
			"key":  "translation_queue",
		},
	}); addErr != nil {
		t.Fatalf("seed rendered user row: %v", addErr)
	}
	menuSvc := &rawInventoryMenuService{
		InMemoryMenuService: rendered,
		raw:                 []admin.MenuItem{rawGenerated},
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items:    []admin.MenuItem{expected},
	})
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if containsStringWithSuffix(report.Creates, "translations.queue") {
		t.Fatalf("expected raw generated row to prevent duplicate queue create, got %#v", report.Creates)
	}
	if !containsStringWithSuffix(report.Updates, "translations.queue") {
		t.Fatalf("expected raw generated row to drive update candidate, got %#v", report)
	}
	if !containsStringWithSuffix(report.RawPresentButNotRendered, "translations.queue") {
		t.Fatalf("expected raw-present diagnostic for hidden generated row, got %#v", report.RawPresentButNotRendered)
	}
}

func TestReconcileGeneratedNavigationPreservesUserRowsAndReportsDestructiveCandidates(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("legacy.generated", "", "Legacy", "legacy_generated", "/admin/legacy", 70),
			{ID: "custom.link", Label: "Custom", Target: map[string]any{"type": "url", "path": "/custom", "key": "custom"}},
		},
	}); err != nil {
		t.Fatalf("seed existing rows: %v", err)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("current.generated", "", "Current", "current_generated", "/admin/current", 70),
		},
	})
	if err != nil {
		t.Fatalf("reconcile dry-run: %v", err)
	}
	if len(report.DestructiveCandidates) == 0 {
		t.Fatalf("expected stale generated row destructive candidate, got %#v", report)
	}
	if len(report.PreservedUserRows) == 0 {
		t.Fatalf("expected custom user row preserved, got %#v", report)
	}
}

func TestReconcileGeneratedNavigationAppliesManagedExclusionsOnlyForOwnedRows(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("admin_main.nav-group-main.settings", "", "Settings", "settings", "/admin/settings", 80),
		},
	}); err != nil {
		t.Fatalf("seed generated settings row: %v", err)
	}
	if err := menuSvc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:     "custom.settings",
		Label:  "Custom Settings",
		Locale: locale,
		Target: map[string]any{"type": "url", "path": "/custom/settings", "key": "settings"},
	}); err != nil {
		t.Fatalf("seed custom settings row: %v", err)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:           menuSvc,
		MenuCode:          menuCode,
		Locale:            locale,
		Apply:             true,
		AllowDestructive:  true,
		ManagedExclusions: []NavigationManagedExclusion{{ID: "admin_main.nav-group-main.settings"}},
	})
	if err != nil {
		t.Fatalf("reconcile exclusions: %v", err)
	}
	if !containsMenuSeedPlanString(report.RetiredManagedItems, "admin_main.nav-group-main.settings") {
		t.Fatalf("expected retired generated row in report, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if item := findMenuItemByIDForTest(menu.Items, "admin_main.nav-group-main.settings"); item != nil {
		t.Fatalf("expected owned retired settings row removed, got %+v", *item)
	}
	if item := findMenuItemByIDForTest(menu.Items, "custom.settings"); item == nil {
		t.Fatalf("expected custom settings row preserved")
	}
}

func TestReconcileGeneratedNavigationReportsManagedExclusionWithoutDestructiveApply(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	menuCode := "admin.main"
	locale := "en"
	if err := SeedNavigation(ctx, SeedNavigationOptions{
		MenuSvc:  menuSvc,
		MenuCode: menuCode,
		Locale:   locale,
		Items: []admin.MenuItem{
			testGeneratedMenuItem("admin_main.nav-group-main.settings", "", "Settings", "settings", "/admin/settings", 80),
		},
	}); err != nil {
		t.Fatalf("seed generated settings row: %v", err)
	}

	report, err := ReconcileGeneratedNavigation(ctx, NavigationReconcileOptions{
		MenuSvc:           menuSvc,
		MenuCode:          menuCode,
		Locale:            locale,
		Apply:             true,
		AllowDestructive:  false,
		ManagedExclusions: []NavigationManagedExclusion{{ID: "admin_main.nav-group-main.settings"}},
	})
	if err != nil {
		t.Fatalf("reconcile exclusions: %v", err)
	}
	if !containsMenuSeedPlanString(report.RetiredManagedItems, "admin_main.nav-group-main.settings") {
		t.Fatalf("expected retired generated row in report, got %#v", report)
	}
	menu, err := menuSvc.Menu(ctx, menuCode, locale)
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	if item := findMenuItemByIDForTest(menu.Items, "admin_main.nav-group-main.settings"); item == nil {
		t.Fatalf("expected retired row to remain without destructive apply")
	}
}

type rawInventoryMenuService struct {
	*admin.InMemoryMenuService
	raw        []admin.MenuItem
	rawOptions admin.NavigationRawInventoryOptions
}

func (s *rawInventoryMenuService) RawMenuItems(context.Context, string) ([]admin.MenuItem, error) {
	return append([]admin.MenuItem{}, s.raw...), nil
}

func (s *rawInventoryMenuService) RawMenuItemsWithOptions(_ context.Context, opts admin.NavigationRawInventoryOptions) ([]admin.MenuItem, error) {
	s.rawOptions = opts
	return append([]admin.MenuItem{}, s.raw...), nil
}

type coordinatedNavigationMenuService struct {
	*admin.InMemoryMenuService
	coordinationCalls int
	lastScope         admin.NavigationConvergenceScope
}

func (s *coordinatedNavigationMenuService) NavigationCoordinationReport() admin.NavigationCoordinationReport {
	return admin.NavigationCoordinationReport{
		Backend:   "test",
		Scope:     "test-menu",
		Supported: true,
	}
}

func (s *coordinatedNavigationMenuService) WithNavigationConvergence(ctx context.Context, scope admin.NavigationConvergenceScope, fn func(context.Context) error) error {
	s.coordinationCalls++
	s.lastScope = scope
	if fn == nil {
		return nil
	}
	return fn(ctx)
}

type staleTargetMenuService struct {
	code   string
	locale string
	items  []admin.MenuItem
}

type noopUpdateMenuService struct {
	*staleTargetMenuService
}

func (s *noopUpdateMenuService) UpdateMenuItem(context.Context, string, admin.MenuItem) error {
	return nil
}

type noopAddMenuService struct {
	*staleTargetMenuService
}

func (s *noopAddMenuService) AddMenuItem(context.Context, string, admin.MenuItem) error {
	return nil
}

func (s *staleTargetMenuService) CreateMenu(context.Context, string) (*admin.Menu, error) {
	return &admin.Menu{Code: s.code, Slug: s.code, ID: s.code, Location: s.code}, nil
}

func (s *staleTargetMenuService) AddMenuItem(_ context.Context, _ string, item admin.MenuItem) error {
	s.items = append(s.items, item)
	return nil
}

func (s *staleTargetMenuService) UpdateMenuItem(_ context.Context, _ string, item admin.MenuItem) error {
	for idx := range s.items {
		if strings.EqualFold(strings.TrimSpace(s.items[idx].ID), strings.TrimSpace(item.ID)) {
			s.items[idx] = item
			return nil
		}
	}
	return admin.ErrNotFound
}

func (s *staleTargetMenuService) DeleteMenuItem(_ context.Context, _ string, id string) error {
	for idx := range s.items {
		if strings.EqualFold(strings.TrimSpace(s.items[idx].ID), strings.TrimSpace(id)) {
			s.items = append(s.items[:idx], s.items[idx+1:]...)
			return nil
		}
	}
	return admin.ErrNotFound
}

func (s *staleTargetMenuService) ReorderMenu(context.Context, string, []string) error {
	return nil
}

func (s *staleTargetMenuService) Menu(context.Context, string, string) (*admin.Menu, error) {
	return &admin.Menu{Code: s.code, Slug: s.code, ID: s.code, Location: s.code, Items: append([]admin.MenuItem{}, s.items...)}, nil
}

func (s *staleTargetMenuService) MenuByLocation(ctx context.Context, location, locale string) (*admin.Menu, error) {
	return s.Menu(ctx, location, locale)
}

func testGeneratedMenuItem(id, parent, label, key, itemPath string, position int) admin.MenuItem {
	return admin.MenuItem{
		ID:       id,
		ParentID: parent,
		Type:     admin.MenuItemTypeItem,
		Label:    label,
		Target: map[string]any{
			"type": "url",
			"path": itemPath,
			"key":  key,
		},
		Position: intPtr(position),
	}
}

func findPlanItemByTargetKey(items []admin.MenuItem, key string) *admin.MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(stringTargetValue(items[idx].Target, "key")), key) {
			return &items[idx]
		}
	}
	return nil
}

func findMenuItemByTargetKeyForTest(items []admin.MenuItem, key string) *admin.MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(stringTargetValue(items[idx].Target, "key")), key) {
			return &items[idx]
		}
		if child := findMenuItemByTargetKeyForTest(items[idx].Children, key); child != nil {
			return child
		}
	}
	return nil
}

func findMenuItemByIDForTest(items []admin.MenuItem, id string) *admin.MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(items[idx].ID), strings.TrimSpace(id)) {
			return &items[idx]
		}
		if child := findMenuItemByIDForTest(items[idx].Children, id); child != nil {
			return child
		}
	}
	return nil
}

func assertSeedPosition(t *testing.T, items []admin.MenuItem, id string, want int) {
	t.Helper()
	item := findSeedItemByIDForTest(items, id)
	if item == nil {
		t.Fatalf("expected seed item %s", id)
	}
	if item.Position == nil || *item.Position != want {
		t.Fatalf("expected %s position %d, got %#v", id, want, item.Position)
	}
}

func assertGeneratedSortOrder(t *testing.T, items []admin.MenuItem, id string, want int) {
	t.Helper()
	item := findSeedItemByIDForTest(items, id)
	if item == nil {
		t.Fatalf("expected seed item %s", id)
	}
	got, ok := intTargetValue(item.Target, MenuTargetGeneratedSortOrderKey)
	if !ok || got != want {
		t.Fatalf("expected %s generated sort order %d, got target %#v", id, want, item.Target)
	}
}

func findSeedItemByIDForTest(items []admin.MenuItem, id string) *admin.MenuItem {
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(items[idx].ID), strings.TrimSpace(id)) {
			return &items[idx]
		}
	}
	return nil
}

func containsMenuSeedPlanString(values []string, want string) bool {
	return slices.Contains(values, want)
}

func containsStringWithPrefix(values []string, prefix string) bool {
	for _, value := range values {
		if strings.HasPrefix(value, prefix) {
			return true
		}
	}
	return false
}

func containsStringWithSuffix(values []string, suffix string) bool {
	for _, value := range values {
		if strings.HasSuffix(value, suffix) {
			return true
		}
	}
	return false
}
