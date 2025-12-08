package admin

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
)

// stubPersistentMenuService simulates a persistent CMS backend that ignores string IDs,
// assigns new UUIDs, and drops non-UUID ParentIDs (mirrors go-cms constraints).
type stubPersistentMenuService struct {
	items map[string][]MenuItem
}

func newStubPersistentMenuService() *stubPersistentMenuService {
	return &stubPersistentMenuService{items: map[string][]MenuItem{}}
}

func (s *stubPersistentMenuService) CreateMenu(_ context.Context, code string) (*Menu, error) {
	if _, ok := s.items[code]; !ok {
		s.items[code] = []MenuItem{}
	}
	return &Menu{Code: code, Items: s.copy(code)}, nil
}

func (s *stubPersistentMenuService) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	item.Menu = menuCode
	if parsed, err := uuid.Parse(strings.TrimSpace(item.ID)); err == nil {
		item.ID = parsed.String()
	} else {
		item.ID = uuid.NewString()
	}
	if parsed, err := uuid.Parse(strings.TrimSpace(item.ParentID)); err == nil {
		item.ParentID = parsed.String()
	} else {
		item.ParentID = ""
	}
	s.items[menuCode] = append(s.items[menuCode], item)
	return nil
}

func (s *stubPersistentMenuService) UpdateMenuItem(_ context.Context, _ string, _ MenuItem) error {
	return nil
}
func (s *stubPersistentMenuService) DeleteMenuItem(_ context.Context, _ string, _ string) error {
	return nil
}
func (s *stubPersistentMenuService) ReorderMenu(_ context.Context, _ string, _ []string) error {
	return nil
}

func (s *stubPersistentMenuService) Menu(_ context.Context, code, locale string) (*Menu, error) {
	return &Menu{Code: code, Items: s.copy(code)}, nil
}

func (s *stubPersistentMenuService) copy(code string) []MenuItem {
	src := s.items[code]
	out := make([]MenuItem, 0, len(src))
	for _, item := range src {
		out = append(out, item)
	}
	return out
}

func TestAddMenuItemsDedupesPersistentMenus(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubPersistentMenuService()
	container := &stubCMSContainer{menu: menuSvc}
	adm := New(Config{
		DefaultLocale: "en",
		NavMenuCode:   "admin.main",
		Features:      Features{CMS: true},
	})
	adm.UseCMS(container)

	items := []MenuItem{
		{
			ID:          "nav.section.content",
			Label:       "Content",
			ParentID:    "nav.group.main",
			Collapsible: true,
			Menu:        "admin.main",
		},
		{
			ID:       "nav.section.content.pages",
			Label:    "Pages",
			ParentID: "nav.section.content",
			Target: map[string]any{
				"type": "url",
				"path": "/admin/pages",
				"key":  "pages",
			},
			Menu: "admin.main",
		},
	}

	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("first addMenuItems failed: %v", err)
	}
	if err := adm.addMenuItems(ctx, items); err != nil {
		t.Fatalf("second addMenuItems failed: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("menu fetch failed: %v", err)
	}
	if got := len(menu.Items); got != 2 {
		t.Fatalf("expected deduped menu items, got %d", got)
	}
	for _, it := range menu.Items {
		if _, err := uuid.Parse(it.ID); err != nil {
			t.Fatalf("expected UUID-mapped IDs, got %s", it.ID)
		}
	}

	navItems := adm.Navigation().Resolve(ctx, "en")
	if got := len(navItems); got != 1 {
		t.Fatalf("expected filtered navigation to remain stable (1 root), got %d", got)
	}
	if navItems[0].Label != "Content" {
		t.Fatalf("expected Content parent to survive filtering, got %s", navItems[0].Label)
	}
	if len(navItems[0].Children) != 1 || navItems[0].Children[0].Label != "Pages" {
		t.Fatalf("expected Pages child under Content, got %+v", navItems[0].Children)
	}
}
