package setup

import (
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestBuildAdminNavigationSpecIncludesCoreContentRows(t *testing.T) {
	items := buildAdminNavigationSpec("/admin", "demo_main", "en", nil, nil)

	pages := findNavigationSeedTestItemByTargetKey(items, "pages")
	if pages == nil {
		t.Fatalf("expected pages content row in seed plan")
	}
	if pages.ID != "demo_main.nav-group-main.content.pages" {
		t.Fatalf("expected pages row to be scoped to menu code, got %q", pages.ID)
	}
	if pages.ParentID != "demo_main.nav-group-main.content" {
		t.Fatalf("expected pages parent under content group, got %q", pages.ParentID)
	}
	if !navigationSeedTestStringSliceContains(pages.Permissions, admin.PermAdminPagesView) {
		t.Fatalf("expected pages permission, got %#v", pages.Permissions)
	}

	posts := findNavigationSeedTestItemByTargetKey(items, "posts")
	if posts == nil {
		t.Fatalf("expected posts content row in seed plan")
	}
	if posts.ID != "demo_main.nav-group-main.content.posts" {
		t.Fatalf("expected posts row to be scoped to menu code, got %q", posts.ID)
	}
	if posts.ParentID != "demo_main.nav-group-main.content" {
		t.Fatalf("expected posts parent under content group, got %q", posts.ParentID)
	}
	if !navigationSeedTestStringSliceContains(posts.Permissions, admin.PermAdminPostsView) {
		t.Fatalf("expected posts permission, got %#v", posts.Permissions)
	}
}

func findNavigationSeedTestItemByTargetKey(items []admin.MenuItem, key string) *admin.MenuItem {
	key = strings.TrimSpace(key)
	for idx := range items {
		if strings.EqualFold(strings.TrimSpace(navigationSeedTestTargetString(items[idx].Target, "key")), key) {
			return &items[idx]
		}
	}
	return nil
}

func navigationSeedTestTargetString(target map[string]any, key string) string {
	if target == nil {
		return ""
	}
	value, _ := target[key].(string)
	return value
}

func navigationSeedTestStringSliceContains(values []string, want string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == want {
			return true
		}
	}
	return false
}
