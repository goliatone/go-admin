package setup

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/quickstart"
)

func TestEnsureContentParentPermissionsReconcilesExistingMenuNode(t *testing.T) {
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
		Label:       "Content",
		LabelKey:    "menu.content",
		Menu:        menuCode,
		Locale:      locale,
		ParentID:    NavigationGroupMain,
		Collapsible: true,
		Permissions: []string{"admin.pages.view", "admin.posts.view"},
		Target: map[string]any{
			"type": "url",
			"key":  "content",
			"path": "/admin/content/pages",
		},
	}); err != nil {
		t.Fatalf("add content parent: %v", err)
	}

	if err := EnsureContentParentPermissions(ctx, svc, menuCode, locale); err != nil {
		t.Fatalf("ensure content permissions: %v", err)
	}

	menu, err := svc.Menu(ctx, menuCode, locale)
	if err != nil || menu == nil {
		t.Fatalf("menu fetch failed: err=%v menu=%v", err, menu)
	}
	content := findMenuItemByID(menu.Items, strings.TrimSpace(NavigationSectionContent))
	if content == nil {
		t.Fatalf("content parent not found")
	}

	for _, permission := range quickstart.DefaultContentParentPermissions() {
		if !permissionIncluded(content.Permissions, permission) {
			t.Fatalf("expected content parent to include %q, got %v", permission, content.Permissions)
		}
	}
}

func findMenuItemByID(items []admin.MenuItem, id string) *admin.MenuItem {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil
	}
	for idx := range items {
		if strings.TrimSpace(items[idx].ID) == id {
			return &items[idx]
		}
		if child := findMenuItemByID(items[idx].Children, id); child != nil {
			return child
		}
	}
	return nil
}
