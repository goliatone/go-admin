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
	// Seed corrupted content row: self-parent + clickable path target.
	if err := svc.AddMenuItem(ctx, menuCode, admin.MenuItem{
		ID:          NavigationSectionContent,
		Type:        admin.MenuItemTypeItem,
		Label:       "Pages",
		LabelKey:    "menu.content.pages",
		Menu:        menuCode,
		Locale:      locale,
		ParentID:    NavigationSectionContent,
		ParentCode:  NavigationSectionContent,
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
		ParentID:    NavigationSectionContent,
		ParentCode:  NavigationSectionContent,
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
