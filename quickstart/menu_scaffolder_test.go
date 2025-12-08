package quickstart

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/google/uuid"
)

type allowAllNav struct{}

func (allowAllNav) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return true
}

// stubPersistentMenuService simulates a persistent backend that enforces UUID IDs/parents.
type stubPersistentMenuService struct {
	items map[string][]admin.MenuItem
	ids   map[string]map[string]string
}

func newStubPersistentMenuService() *stubPersistentMenuService {
	return &stubPersistentMenuService{
		items: map[string][]admin.MenuItem{},
		ids:   map[string]map[string]string{},
	}
}

func (s *stubPersistentMenuService) CreateMenu(_ context.Context, code string) (*admin.Menu, error) {
	slug := admin.NormalizeMenuSlug(code)
	if _, ok := s.items[slug]; !ok {
		s.items[slug] = []admin.MenuItem{}
	}
	if _, ok := s.ids[slug]; !ok {
		s.ids[slug] = map[string]string{}
	}
	return &admin.Menu{Code: slug, Slug: slug, ID: admin.MenuUUIDFromSlug(slug), Items: s.copy(slug)}, nil
}

func (s *stubPersistentMenuService) AddMenuItem(_ context.Context, menuCode string, item admin.MenuItem) error {
	slug := admin.NormalizeMenuSlug(menuCode)
	if _, ok := s.ids[slug]; !ok {
		s.ids[slug] = map[string]string{}
	}
	idMap := s.ids[slug]
	item.Menu = slug
	rawID := strings.TrimSpace(item.ID)
	if rawID == "" {
		rawID = strings.TrimSpace(item.Code)
		item.ID = rawID
	}
	if strings.TrimSpace(item.Code) == "" {
		item.Code = rawID
	}
	if mapped := idMap[rawID]; mapped != "" {
		item.ID = mapped
	} else if parsed, err := uuid.Parse(rawID); err == nil {
		item.ID = parsed.String()
		idMap[rawID] = item.ID
	} else {
		item.ID = uuid.NewString()
		idMap[rawID] = item.ID
	}
	parentRaw := strings.TrimSpace(item.ParentID)
	if parentRaw == "" {
		parentRaw = strings.TrimSpace(item.ParentCode)
		item.ParentID = parentRaw
	}
	if strings.TrimSpace(item.ParentCode) == "" {
		item.ParentCode = parentRaw
	}
	if parentRaw != "" {
		if mapped := idMap[parentRaw]; mapped != "" {
			item.ParentID = mapped
		} else if parsed, err := uuid.Parse(parentRaw); err == nil {
			item.ParentID = parsed.String()
			idMap[parentRaw] = item.ParentID
		} else {
			idMap[parentRaw] = uuid.NewString()
			item.ParentID = idMap[parentRaw]
		}
	}
	s.items[slug] = append(s.items[slug], item)
	return nil
}

func (s *stubPersistentMenuService) UpdateMenuItem(_ context.Context, _ string, _ admin.MenuItem) error {
	return nil
}

func (s *stubPersistentMenuService) DeleteMenuItem(_ context.Context, _ string, _ string) error {
	return nil
}

func (s *stubPersistentMenuService) ReorderMenu(_ context.Context, _ string, _ []string) error {
	return nil
}

func (s *stubPersistentMenuService) Menu(_ context.Context, code, _ string) (*admin.Menu, error) {
	slug := admin.NormalizeMenuSlug(code)
	return &admin.Menu{Code: slug, Slug: slug, ID: admin.MenuUUIDFromSlug(slug), Items: s.copy(slug)}, nil
}

func (s *stubPersistentMenuService) copy(code string) []admin.MenuItem {
	src := s.items[code]
	out := make([]admin.MenuItem, 0, len(src))
	for _, item := range src {
		out = append(out, item)
	}
	return out
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

func collectIDs(items []admin.MenuItem) map[string]string {
	out := map[string]string{}
	var walk func([]admin.MenuItem)
	walk = func(nodes []admin.MenuItem) {
		for _, n := range nodes {
			id := strings.TrimSpace(n.ID)
			if id != "" {
				out[id] = n.ID
				out[strings.ToLower(id)] = n.ID
				out[admin.EnsureMenuUUID(id)] = n.ID
			}
			if code := strings.TrimSpace(n.Code); code != "" {
				out[code] = n.ID
				out[strings.ToLower(code)] = n.ID
				out[admin.EnsureMenuUUID(code)] = n.ID
			}
			if lk := strings.TrimSpace(n.LabelKey); lk != "" {
				out[lk] = n.ID
				out[strings.ToLower(lk)] = n.ID
			}
			if gt := strings.TrimSpace(n.GroupTitleKey); gt != "" {
				out[gt] = n.ID
				out[strings.ToLower(gt)] = n.ID
			}
			if len(n.Children) > 0 {
				walk(n.Children)
			}
		}
	}
	walk(items)
	return out
}

func TestEnsureDefaultMenuParentsNestsChildren(t *testing.T) {
	ctx := context.Background()
	backends := map[string]admin.CMSMenuService{
		"in-memory":  admin.NewInMemoryMenuService(),
		"persistent": newStubPersistentMenuService(),
	}

	for name, svc := range backends {
		t.Run(name, func(t *testing.T) {
			menuCode := "admin.main"
			if err := EnsureDefaultMenuParents(ctx, svc, menuCode, ""); err != nil {
				t.Fatalf("ensure parents failed: %v", err)
			}
			// Idempotent second call.
			if err := EnsureDefaultMenuParents(ctx, svc, menuCode, ""); err != nil {
				t.Fatalf("second ensure parents failed: %v", err)
			}

			menu, _ := svc.Menu(ctx, admin.NormalizeMenuSlug(menuCode), "")
			ids := collectIDs(menu.Items)
			mainID := ids["nav.group.main"]
			contentID := ids["nav.section.content"]
			othersID := ids["nav.group.others"]
			if mainID == "" || contentID == "" || othersID == "" {
				t.Fatalf("missing scaffolded ids: main=%s content=%s others=%s", mainID, contentID, othersID)
			}

			children := []admin.MenuItem{
				{ID: "nav.section.content.pages", Label: "Pages", ParentID: contentID, Menu: menuCode},
				{ID: "nav.group.others.notifications", Label: "Notifications", ParentID: othersID, Menu: menuCode},
			}
			for _, child := range children {
				if err := svc.AddMenuItem(ctx, admin.NormalizeMenuSlug(menuCode), child); err != nil {
					t.Fatalf("add child %s failed: %v", child.Label, err)
				}
			}

			nav := admin.NewNavigation(svc, allowAllNav{})
			nav.UseCMS(true)
			items := nav.Resolve(ctx, "")

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
				if n.ID == othersID {
					return true
				}
				return strings.EqualFold(n.GroupTitleKey, "menu.group.others") || strings.EqualFold(n.GroupTitle, "Others")
			})
			if others == nil {
				t.Fatalf("others group not found")
			}
			if len(others.Children) != 1 || others.Children[0].Label != "Notifications" {
				t.Fatalf("others children unexpected: %+v", others.Children)
			}
		})
	}
}
