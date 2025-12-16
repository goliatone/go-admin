package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	cms "github.com/goliatone/go-cms"
)

type allowAllNav struct{}

func (allowAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

func findNavItem(items []admin.NavigationItem, match func(admin.NavigationItem) bool) *admin.NavigationItem {
	for idx := range items {
		if match(items[idx]) {
			return &items[idx]
		}
		if child := findNavItem(items[idx].Children, match); child != nil {
			return child
		}
	}
	return nil
}

func TestEnsureDefaultMenuParentsNestsChildren(t *testing.T) {
	ctx := context.Background()
	menuCode := "admin.main"
	code := cms.CanonicalMenuCode(menuCode)

	svc := admin.NewInMemoryMenuService()

	if err := EnsureDefaultMenuParents(ctx, svc, menuCode, "en"); err != nil {
		t.Fatalf("ensure parents failed: %v", err)
	}
	// Idempotent second call.
	if err := EnsureDefaultMenuParents(ctx, svc, menuCode, "en"); err != nil {
		t.Fatalf("second ensure parents failed: %v", err)
	}

	menu, err := svc.Menu(ctx, menuCode, "en")
	if err != nil {
		t.Fatalf("menu fetch failed: %v", err)
	}

	mainID := code + ".nav-group-main"
	contentID := mainID + ".content"
	othersID := code + ".nav-group-others"

	seen := map[string]bool{}
	var walk func(items []admin.MenuItem)
	walk = func(items []admin.MenuItem) {
		for _, it := range items {
			seen[it.ID] = true
			if len(it.Children) > 0 {
				walk(it.Children)
			}
		}
	}
	walk(menu.Items)
	if !seen[mainID] || !seen[contentID] || !seen[othersID] {
		t.Fatalf("missing scaffolded ids: main=%v content=%v others=%v", seen[mainID], seen[contentID], seen[othersID])
	}

	children := []admin.MenuItem{
		{ID: contentID + ".pages", Label: "Pages", ParentID: contentID, Menu: menuCode, Locale: "en"},
		{ID: othersID + ".notifications", Label: "Notifications", ParentID: othersID, Menu: menuCode, Locale: "en"},
	}
	for _, child := range children {
		if err := svc.AddMenuItem(ctx, menuCode, child); err != nil {
			t.Fatalf("add child %s failed: %v", child.Label, err)
		}
	}

	nav := admin.NewNavigation(svc, allowAllNav{})
	nav.UseCMS(true)
	items := nav.Resolve(ctx, "en")

	main := findNavItem(items, func(n admin.NavigationItem) bool {
		return n.ID == mainID || strings.EqualFold(n.GroupTitleKey, "menu.group.main") || strings.EqualFold(n.GroupTitle, "Main Menu")
	})
	if main == nil {
		t.Fatalf("main group not found")
	}
	content := findNavItem(main.Children, func(n admin.NavigationItem) bool {
		return n.ID == contentID || strings.EqualFold(n.LabelKey, "menu.content") || strings.EqualFold(n.Label, "Content")
	})
	if content == nil {
		t.Fatalf("content parent missing under main")
	}
	if !content.Collapsible {
		t.Fatalf("expected content to be collapsible")
	}
	if len(content.Children) != 1 || content.Children[0].Label != "Pages" {
		t.Fatalf("content children unexpected: %+v", content.Children)
	}

	others := findNavItem(items, func(n admin.NavigationItem) bool {
		return n.ID == othersID || strings.EqualFold(n.GroupTitleKey, "menu.group.others") || strings.EqualFold(n.GroupTitle, "Others")
	})
	if others == nil {
		t.Fatalf("others group not found")
	}
	if len(others.Children) != 1 || others.Children[0].Label != "Notifications" {
		t.Fatalf("others children unexpected: %+v", others.Children)
	}
}
