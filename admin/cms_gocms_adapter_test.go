package admin

import (
	"context"
	"strings"
	"testing"

	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func TestGoCMSMenuAdapterAddsAndResolvesNavigation(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubCMSMenuService()
	adapter := NewGoCMSMenuAdapterFromAny(menuSvc)

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}

	item := MenuItem{
		Label:       "Home",
		Locale:      "en",
		Icon:        "hero",
		Badge:       map[string]any{"text": "new"},
		Permissions: []string{"nav.view"},
		Classes:     []string{"a", "b"},
		Styles:      map[string]string{"color": "red"},
		Target: map[string]any{
			"type":        "page",
			"slug":        "home",
			"permissions": []string{"nav.view"},
			"classes":     []any{"a", "b"},
			"styles":      map[string]any{"color": "red"},
			"badge":       map[string]any{"text": "new"},
			"icon":        "hero",
		},
	}
	if err := adapter.AddMenuItem(ctx, "admin.main", item); err != nil {
		t.Fatalf("add menu item: %v", err)
	}

	menu, err := adapter.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if len(menu.Items) != 1 {
		t.Fatalf("expected 1 menu item, got %d", len(menu.Items))
	}
	got := menu.Items[0]
	if got.ID == "" || got.ID != "admin_main.home" {
		t.Fatalf("expected derived path ID admin_main.home, got %q", got.ID)
	}
	if got.Label != "Home" || got.Icon != "hero" {
		t.Fatalf("unexpected item mapping: %+v", got)
	}
	if got.Badge["text"] != "new" {
		t.Fatalf("expected badge metadata to round-trip, got %+v", got.Badge)
	}
	if len(got.Permissions) != 1 || got.Permissions[0] != "nav.view" {
		t.Fatalf("permissions did not map: %+v", got.Permissions)
	}
	if len(got.Classes) != 2 || got.Classes[0] != "a" || got.Classes[1] != "b" {
		t.Fatalf("classes did not map: %+v", got.Classes)
	}
	if color := got.Styles["color"]; color != "red" {
		t.Fatalf("styles did not map: %+v", got.Styles)
	}
	if url, ok := got.Target["url"].(string); !ok || url == "" {
		t.Fatalf("expected url injected into target, got %+v", got.Target)
	}
	if key, ok := got.Target["key"].(string); !ok || key == "" {
		t.Fatalf("expected key present in target, got %+v", got.Target)
	}
}

func TestGoCMSMenuAdapterReordersAndUpdates(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubCMSMenuService()
	adapter := NewGoCMSMenuAdapterFromAny(menuSvc)

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := adapter.AddMenuItem(ctx, "admin.main", MenuItem{Label: "First", Locale: "en", Target: map[string]any{"slug": "first"}}); err != nil {
		t.Fatalf("add first: %v", err)
	}
	if err := adapter.AddMenuItem(ctx, "admin.main", MenuItem{Label: "Second", Locale: "en", Target: map[string]any{"slug": "second"}}); err != nil {
		t.Fatalf("add second: %v", err)
	}

	menu, err := adapter.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if len(menu.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(menu.Items))
	}
	firstID := menu.Items[0].ID
	secondID := menu.Items[1].ID

	if err := adapter.ReorderMenu(ctx, "admin.main", []string{secondID, firstID}); err != nil {
		t.Fatalf("reorder: %v", err)
	}
	updated, err := adapter.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve updated: %v", err)
	}
	if updated.Items[0].ID != secondID {
		t.Fatalf("expected second item first after reorder, got %+v", updated.Items)
	}

	if err := adapter.UpdateMenuItem(ctx, "admin.main", MenuItem{ID: secondID, Label: "Second Updated", Locale: "en", Target: map[string]any{"slug": "second"}}); err != nil {
		t.Fatalf("update: %v", err)
	}
	menuAfterUpdate, err := adapter.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("resolve after update: %v", err)
	}
	if menuAfterUpdate.Items[0].Label != "Second Updated" {
		t.Fatalf("expected updated label, got %s", menuAfterUpdate.Items[0].Label)
	}
}

func TestUseCMSWrapsGoCMSMenuService(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubCMSMenuService()
	container := &stubGoCMSContainer{
		menu:    menuSvc,
		widgets: NewInMemoryWidgetService(),
	}

	cfg := Config{DefaultLocale: "en", Features: Features{CMS: true}}
	adm := mustNewAdmin(t, cfg, Dependencies{})
	adm.UseCMS(container)
	if err := adm.Initialize(nilRouter{}); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if err := adm.menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "CMS Link", Locale: "en", Target: map[string]any{"slug": "cms-link"}}); err != nil {
		t.Fatalf("add menu item through adapter: %v", err)
	}

	items := adm.nav.Resolve(ctx, "en")
	if len(items) == 0 || items[0].Label != "CMS Link" {
		t.Fatalf("expected navigation from go-cms adapter, got %+v", items)
	}
}

type stubGoCMSContainer struct {
	menu    *stubCMSMenuService
	widgets CMSWidgetService
}

func (s *stubGoCMSContainer) WidgetService() CMSWidgetService   { return s.widgets }
func (s *stubGoCMSContainer) MenuService() CMSMenuService       { return nil }
func (s *stubGoCMSContainer) ContentService() CMSContentService { return nil }
func (s *stubGoCMSContainer) GoCMSMenuService() any             { return s.menu }

type stubCMSMenuService struct {
	menus map[string]*stubCMSMenu
}

type stubCMSMenu struct {
	code  string
	items map[string]*stubCMSMenuItem
}

type stubCMSMenuItem struct {
	path       string
	parentPath string
	position   int
	typeName   string
	target     map[string]any
	icon       string
	badge      map[string]any
	perms      []string
	classes    []string
	styles     map[string]string
	meta       map[string]any
	tr         map[string]cms.MenuItemTranslationInput
	collapsible bool
	collapsed   bool
}

func newStubCMSMenuService() *stubCMSMenuService {
	return &stubCMSMenuService{menus: map[string]*stubCMSMenu{}}
}

func (s *stubCMSMenuService) GetOrCreateMenu(ctx context.Context, code string, description *string, actor uuid.UUID) (*cms.MenuInfo, error) {
	return s.UpsertMenu(ctx, code, description, actor)
}

func (s *stubCMSMenuService) UpsertMenu(_ context.Context, code string, _ *string, _ uuid.UUID) (*cms.MenuInfo, error) {
	if s.menus[code] == nil {
		s.menus[code] = &stubCMSMenu{code: code, items: map[string]*stubCMSMenuItem{}}
	}
	return &cms.MenuInfo{Code: code}, nil
}

func (s *stubCMSMenuService) GetMenuByCode(_ context.Context, code string) (*cms.MenuInfo, error) {
	if s.menus[code] == nil {
		return nil, cms.ErrMenuNotFound
	}
	return &cms.MenuInfo{Code: code}, nil
}

func (s *stubCMSMenuService) ResolveNavigation(_ context.Context, menuCode string, locale string) ([]cms.NavigationNode, error) {
	menu := s.menus[menuCode]
	if menu == nil {
		return nil, cms.ErrMenuNotFound
	}
	roots := []*stubCMSMenuItem{}
	for _, item := range menu.items {
		if item.parentPath == "" || item.parentPath == menuCode {
			roots = append(roots, item)
		}
	}
	sortByPosition(roots)

	out := make([]cms.NavigationNode, 0, len(roots))
	for _, root := range roots {
		out = append(out, buildNode(menu, root, menuCode, locale))
	}
	return out, nil
}

func (s *stubCMSMenuService) ResetMenuByCode(_ context.Context, code string, _ uuid.UUID, _ bool) error {
	if s.menus[code] == nil {
		return nil
	}
	s.menus[code].items = map[string]*stubCMSMenuItem{}
	return nil
}

func (s *stubCMSMenuService) UpsertMenuItemByPath(_ context.Context, input cms.UpsertMenuItemByPathInput) (*cms.MenuItemInfo, error) {
	parsed, err := cms.ParseMenuItemPath(input.Path)
	if err != nil {
		return nil, err
	}
	menu := s.menus[parsed.MenuCode]
	if menu == nil {
		menu = &stubCMSMenu{code: parsed.MenuCode, items: map[string]*stubCMSMenuItem{}}
		s.menus[parsed.MenuCode] = menu
	}

	parent := strings.TrimSpace(input.ParentPath)
	if parent == "" {
		parent = parsed.ParentPath
	}

	position := 0
	if input.Position != nil {
		position = *input.Position
	}

	item := menu.items[parsed.Path]
	if item == nil {
		item = &stubCMSMenuItem{path: parsed.Path, tr: map[string]cms.MenuItemTranslationInput{}}
		menu.items[parsed.Path] = item
		if position == 0 {
			position = len(menu.items)
		}
	}
	if position == 0 {
		position = item.position
	}
	item.parentPath = parent
	item.position = position
	item.typeName = input.Type
	item.target = cloneAnyMap(input.Target)
	item.icon = input.Icon
	item.badge = cloneAnyMap(input.Badge)
	item.perms = append([]string{}, input.Permissions...)
	item.classes = append([]string{}, input.Classes...)
	item.styles = cloneStringMap(input.Styles)
	item.meta = cloneAnyMap(input.Metadata)
	item.collapsible = input.Collapsible
	item.collapsed = input.Collapsed
	for _, tr := range input.Translations {
		item.tr[tr.Locale] = tr
	}

	return &cms.MenuItemInfo{Path: parsed.Path, Type: input.Type, Target: cloneAnyMap(input.Target)}, nil
}

func (s *stubCMSMenuService) UpdateMenuItemByPath(_ context.Context, menuCode string, path string, input cms.UpdateMenuItemByPathInput) (*cms.MenuItemInfo, error) {
	parsed, err := cms.ParseMenuItemPathForMenu(menuCode, path)
	if err != nil {
		return nil, err
	}
	menu := s.menus[menuCode]
	if menu == nil {
		return nil, cms.ErrMenuNotFound
	}
	item := menu.items[parsed.Path]
	if item == nil {
		return nil, cms.ErrMenuNotFound
	}
	if input.Position != nil {
		item.position = *input.Position
	}
	if input.ParentPath != nil {
		item.parentPath = strings.TrimSpace(*input.ParentPath)
	}
	if input.Type != nil {
		item.typeName = *input.Type
	}
	if input.Target != nil {
		item.target = cloneAnyMap(input.Target)
	}
	if input.Icon != nil {
		item.icon = *input.Icon
	}
	if input.Badge != nil {
		item.badge = cloneAnyMap(input.Badge)
	}
	if input.Permissions != nil {
		item.perms = append([]string{}, input.Permissions...)
	}
	if input.Classes != nil {
		item.classes = append([]string{}, input.Classes...)
	}
	if input.Styles != nil {
		item.styles = cloneStringMap(input.Styles)
	}
	if input.Metadata != nil {
		item.meta = cloneAnyMap(input.Metadata)
	}
	if input.Collapsible != nil {
		item.collapsible = *input.Collapsible
	}
	if input.Collapsed != nil {
		item.collapsed = *input.Collapsed
	}
	return &cms.MenuItemInfo{Path: parsed.Path, Type: item.typeName, Target: cloneAnyMap(item.target)}, nil
}

func (s *stubCMSMenuService) DeleteMenuItemByPath(_ context.Context, menuCode string, path string, _ uuid.UUID, cascadeChildren bool) error {
	parsed, err := cms.ParseMenuItemPathForMenu(menuCode, path)
	if err != nil {
		return err
	}
	menu := s.menus[menuCode]
	if menu == nil {
		return cms.ErrMenuNotFound
	}
	delete(menu.items, parsed.Path)
	if cascadeChildren {
		for key, item := range menu.items {
			if item != nil && strings.HasPrefix(key, parsed.Path+".") {
				delete(menu.items, key)
			}
		}
	}
	return nil
}

func (s *stubCMSMenuService) UpsertMenuItemTranslationByPath(_ context.Context, menuCode string, path string, input cms.MenuItemTranslationInput) error {
	parsed, err := cms.ParseMenuItemPathForMenu(menuCode, path)
	if err != nil {
		return err
	}
	menu := s.menus[menuCode]
	if menu == nil {
		return cms.ErrMenuNotFound
	}
	item := menu.items[parsed.Path]
	if item == nil {
		return cms.ErrMenuNotFound
	}
	if item.tr == nil {
		item.tr = map[string]cms.MenuItemTranslationInput{}
	}
	item.tr[input.Locale] = input
	return nil
}

func buildNode(menu *stubCMSMenu, item *stubCMSMenuItem, menuCode, locale string) cms.NavigationNode {
	label := ""
	labelKey := ""
	groupTitle := ""
	groupTitleKey := ""
	if item.tr != nil {
		if tr, ok := item.tr[locale]; ok {
			label = tr.Label
			labelKey = tr.LabelKey
			groupTitle = tr.GroupTitle
			groupTitleKey = tr.GroupTitleKey
		}
	}
	url := ""
	if item.target != nil {
		if slug, ok := item.target["slug"].(string); ok && slug != "" {
			url = "/" + slug
		}
	}

	node := cms.NavigationNode{
		Type:          item.typeName,
		Label:         label,
		LabelKey:      labelKey,
		GroupTitle:    groupTitle,
		GroupTitleKey: groupTitleKey,
		URL:           url,
		Target:        cloneAnyMap(item.target),
		Icon:          item.icon,
		Badge:         cloneAnyMap(item.badge),
		Permissions:   append([]string{}, item.perms...),
		Classes:       append([]string{}, item.classes...),
		Styles:        cloneStringMap(item.styles),
		Collapsible:   item.collapsible,
		Collapsed:     item.collapsed,
		Metadata:      cloneAnyMap(item.meta),
	}

	children := []*stubCMSMenuItem{}
	for _, child := range menu.items {
		if child != nil && child.parentPath == item.path {
			children = append(children, child)
		}
	}
	sortByPosition(children)
	if len(children) > 0 {
		node.Children = make([]cms.NavigationNode, 0, len(children))
		for _, child := range children {
			node.Children = append(node.Children, buildNode(menu, child, menuCode, locale))
		}
	}
	return node
}

func sortByPosition(items []*stubCMSMenuItem) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].position < items[i].position {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}
