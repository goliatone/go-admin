package setup

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func TestEnsureDashboardFirstWithOptionsKeepsContentParentNonClickable(t *testing.T) {
	ctx := context.Background()
	menuCode := NavigationMenuCode
	locale := "en"
	svc := admin.NewInMemoryMenuService()

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:            NavigationGroupMain,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      admin.IntPtr(0),
		Menu:          menuCode,
		Locale:        locale,
	}); err != nil {
		t.Fatalf("add main group: %v", err)
	}
	// Insert Content before Dashboard to force ordering repair.
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Content",
		LabelKey:    "menu.content",
		Menu:        menuCode,
		Locale:      locale,
		ParentID:    NavigationGroupMain,
		Collapsible: true,
		Target: map[string]any{
			"type": "url",
			"key":  "content",
		},
		Position: admin.IntPtr(10),
	}); err != nil {
		t.Fatalf("add content item: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationSectionDashboard,
		Type:     admin.MenuItemTypeItem,
		Label:    "Dashboard",
		LabelKey: "menu.dashboard",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupMain,
		Target: map[string]any{
			"type": "url",
			"key":  "dashboard",
			"path": "/admin",
		},
		Position: admin.IntPtr(20),
	}); err != nil {
		t.Fatalf("add dashboard: %v", err)
	}

	if err := EnsureDashboardFirstWithOptions(ctx, svc, "/admin", menuCode, locale, EnsureDashboardFirstOptions{
		EnsureContentParentPath: false,
	}); err != nil {
		t.Fatalf("ensure dashboard first: %v", err)
	}

	menu, err := svc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		t.Fatalf("menu fetch failed: err=%v menu=%v", err, menu)
	}
	content := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationSectionContent))
	if content == nil {
		t.Fatalf("content parent not found")
	}
	if _, ok := content.Target["path"]; ok {
		t.Fatalf("expected content parent to remain non-clickable, got target %+v", content.Target)
	}
}

func TestRepairNavigationIntegrityRepairsSelfParentContentNode(t *testing.T) {
	ctx := context.Background()
	menuCode := NavigationMenuCode
	locale := "en"
	svc := admin.NewInMemoryMenuService()

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:            NavigationGroupMain,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      admin.IntPtr(0),
		Menu:          menuCode,
		Locale:        locale,
	}); err != nil {
		t.Fatalf("add main group: %v", err)
	}
	// Seed corrupted content row: orphan parent + clickable path target.
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Pages",
		LabelKey:    "menu.content.pages",
		Menu:        menuCode,
		Locale:      locale,
		ParentID:    "legacy.content.parent",
		ParentCode:  "legacy.content.parent",
		Collapsible: false,
		Target: map[string]any{
			"type": "url",
			"key":  "pages",
			"path": "/admin/content/pages",
		},
		Permissions: []string{"admin.pages.view"},
	}); err != nil {
		t.Fatalf("add corrupted content parent: %v", err)
	}

	report, err := RepairNavigationIntegrity(ctx, svc, menuCode, locale)
	if err != nil {
		t.Fatalf("repair navigation integrity: %v", err)
	}
	if report.RepairedCount == 0 {
		t.Fatalf("expected repair pass to modify corrupted menu")
	}
	if report.SelfParentCount != 0 {
		t.Fatalf("expected no self-parent rows after repair, got %+v", report)
	}

	menu, err := svc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		t.Fatalf("menu fetch failed: err=%v menu=%v", err, menu)
	}
	content := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationSectionContent))
	if content == nil {
		t.Fatalf("expected content parent to be visible after repair")
	}
	if strings.TrimSpace(content.ParentID) != strings.TrimSpace(NavigationGroupMain) {
		t.Fatalf("expected repaired content parent under %s, got %s", NavigationGroupMain, content.ParentID)
	}
	if strings.TrimSpace(content.LabelKey) != "menu.content" {
		t.Fatalf("expected content parent label key repaired, got %q", content.LabelKey)
	}
	if strings.TrimSpace(targetKey(content.Target)) != "content" {
		t.Fatalf("expected content parent target key repaired, got %+v", content.Target)
	}
	if _, ok := content.Target["path"]; ok {
		t.Fatalf("expected content parent path removed, got %+v", content.Target)
	}
	for _, permission := range quickstart.DefaultContentParentPermissions() {
		if !permissionIncluded(content.Permissions, permission) {
			t.Fatalf("expected repaired content parent permission %q in %+v", permission, content.Permissions)
		}
	}
}

func TestRepairNavigationIntegrityIsIdempotent(t *testing.T) {
	ctx := context.Background()
	menuCode := NavigationMenuCode
	locale := "en"
	svc := admin.NewInMemoryMenuService()

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:            NavigationGroupMain,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      admin.IntPtr(0),
		Menu:          menuCode,
		Locale:        locale,
	}); err != nil {
		t.Fatalf("add main group: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Pages",
		LabelKey:    "menu.content.pages",
		Menu:        menuCode,
		Locale:      locale,
		ParentID:    "legacy.content.parent",
		ParentCode:  "legacy.content.parent",
		Collapsible: false,
		Target: map[string]any{
			"type": "url",
			"key":  "pages",
			"path": "/admin/content/pages",
		},
		Permissions: []string{"admin.pages.view"},
	}); err != nil {
		t.Fatalf("add corrupted content parent: %v", err)
	}

	first, err := RepairNavigationIntegrity(ctx, svc, menuCode, locale)
	if err != nil {
		t.Fatalf("first repair pass failed: %v", err)
	}
	if first.RepairedCount == 0 {
		t.Fatalf("expected first repair pass to make changes")
	}

	second, err := RepairNavigationIntegrity(ctx, svc, menuCode, locale)
	if err != nil {
		t.Fatalf("second repair pass failed: %v", err)
	}
	if second.RepairedCount != 0 {
		t.Fatalf("expected second repair pass to be idempotent, got %+v", second)
	}
	if second.HasIssues() {
		t.Fatalf("expected no integrity issues after idempotent pass, got %+v", second)
	}
}

func TestRemoveLegacyTranslationToolsMenuItems(t *testing.T) {
	ctx := context.Background()
	menuCode := NavigationMenuCode
	locale := "en"
	svc := admin.NewInMemoryMenuService()

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:            NavigationGroupOthers,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Tools",
		GroupTitleKey: "menu.group.others",
		Position:      admin.IntPtr(90),
		Menu:          menuCode,
		Locale:        locale,
	}); err != nil {
		t.Fatalf("add others group: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationGroupOthers + ".translations.queue",
		Label:    "Translation Queue",
		LabelKey: "menu.translations.queue",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupOthers,
		Target: map[string]any{
			"type": "url",
			"key":  "translations",
		},
	}); err != nil {
		t.Fatalf("add translation queue tools item: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationGroupOthers + ".translations.exchange",
		Label:    "Translation Exchange",
		LabelKey: "menu.translations.exchange",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupOthers,
		Target: map[string]any{
			"type": "url",
			"key":  "translations",
		},
	}); err != nil {
		t.Fatalf("add translation exchange tools item: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationGroupOthers + ".feature_flags",
		Label:    "Feature Flags",
		LabelKey: "menu.feature_flags",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupOthers,
		Target: map[string]any{
			"type": "url",
			"key":  "feature_flags",
		},
	}); err != nil {
		t.Fatalf("add non-translation tools item: %v", err)
	}

	if err := RemoveLegacyTranslationToolsMenuItems(ctx, svc, menuCode, locale); err != nil {
		t.Fatalf("remove legacy translation tools items: %v", err)
	}

	menu, err := svc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		t.Fatalf("menu fetch failed: err=%v menu=%v", err, menu)
	}
	if item := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationGroupOthers+".translations.queue")); item != nil {
		t.Fatalf("expected translation queue tools item removed, got %+v", *item)
	}
	if item := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationGroupOthers+".translations.exchange")); item != nil {
		t.Fatalf("expected translation exchange tools item removed, got %+v", *item)
	}
	if item := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationGroupOthers+".feature_flags")); item == nil {
		t.Fatalf("expected non-translation tools item to remain")
	}
}

func TestRemovePrimarySettingsMenuItems(t *testing.T) {
	ctx := context.Background()
	menuCode := NavigationMenuCode
	locale := "en"
	svc := admin.NewInMemoryMenuService()

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:            NavigationGroupMain,
		Type:          admin.MenuItemTypeGroup,
		GroupTitle:    "Navigation",
		GroupTitleKey: "menu.group.main",
		Position:      admin.IntPtr(0),
		Menu:          menuCode,
		Locale:        locale,
	}); err != nil {
		t.Fatalf("add main group: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationGroupMain + ".settings",
		Label:    "Settings",
		LabelKey: "menu.settings",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupMain,
		Target: map[string]any{
			"type": "url",
			"path": "/admin/settings",
			"name": "admin.settings",
			"key":  "settings",
		},
	}); err != nil {
		t.Fatalf("add settings item: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:       NavigationGroupMain + ".dashboard",
		Label:    "Dashboard",
		LabelKey: "menu.dashboard",
		Menu:     menuCode,
		Locale:   locale,
		ParentID: NavigationGroupMain,
		Target: map[string]any{
			"type": "url",
			"path": "/admin",
			"key":  "dashboard",
		},
	}); err != nil {
		t.Fatalf("add dashboard item: %v", err)
	}

	if err := RemovePrimarySettingsMenuItems(ctx, svc, menuCode, locale); err != nil {
		t.Fatalf("remove primary settings items: %v", err)
	}

	menu, err := svc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		t.Fatalf("menu fetch failed: err=%v menu=%v", err, menu)
	}
	if item := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationGroupMain+".settings")); item != nil {
		t.Fatalf("expected primary settings item removed, got %+v", *item)
	}
	if item := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationGroupMain+".dashboard")); item == nil {
		t.Fatalf("expected non-settings item to remain")
	}
}
