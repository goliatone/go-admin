package quickstart

import (
	"context"
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
	if len(report.StaleTargetStateCleanup) == 0 {
		t.Fatalf("expected stale target-state cleanup diagnostic, got %#v", report)
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

type rawInventoryMenuService struct {
	*admin.InMemoryMenuService
	raw []admin.MenuItem
}

func (s *rawInventoryMenuService) RawMenuItems(context.Context, string) ([]admin.MenuItem, error) {
	return append([]admin.MenuItem{}, s.raw...), nil
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
