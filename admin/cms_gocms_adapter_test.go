package admin

import (
	"context"
	"errors"
	"reflect"
	"sort"
	"testing"

	"github.com/google/uuid"
)

func TestGoCMSMenuAdapterAddsAndResolvesNavigation(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubGoCMSMenuService()
	adapter := NewGoCMSMenuAdapterFromAny(menuSvc)

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	menuVal := mustMenu(t, adapter, ctx, "admin.main")
	if id, ok := extractUUID(menuVal, "ID"); !ok {
		t.Fatalf("menu missing id")
	} else {
		t.Logf("menu id=%s", id)
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
}

func TestGoCMSMenuAdapterReordersAndUpdates(t *testing.T) {
	ctx := context.Background()
	menuSvc := newStubGoCMSMenuService()
	adapter := NewGoCMSMenuAdapterFromAny(menuSvc)

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	_ = mustMenu(t, adapter, ctx, "admin.main")
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
	menuSvc := newStubGoCMSMenuService()
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

	if err := adm.menuSvc.AddMenuItem(ctx, "admin.main", MenuItem{Label: "CMS Link", Locale: "en"}); err != nil {
		t.Fatalf("add menu item through adapter: %v", err)
	}

	items := adm.nav.Resolve(ctx, "en")
	if len(items) == 0 || items[0].Label != "CMS Link" {
		t.Fatalf("expected navigation from go-cms adapter, got %+v", items)
	}
}

func mustMenu(t *testing.T, adapter *GoCMSMenuAdapter, ctx context.Context, code string) reflect.Value {
	t.Helper()
	val, err := adapter.menu(ctx, code)
	if err != nil {
		t.Fatalf("menu lookup failed: %v", err)
	}
	idField := val.FieldByName("ID")
	t.Logf("resolved menu type=%s idValid=%v idKind=%s idType=%s", val.Type(), idField.IsValid(), idField.Kind(), idField.Type())
	return val
}

type stubGoCMSContainer struct {
	menu    *stubGoCMSMenuService
	widgets CMSWidgetService
}

func (s *stubGoCMSContainer) WidgetService() CMSWidgetService   { return s.widgets }
func (s *stubGoCMSContainer) MenuService() CMSMenuService       { return nil }
func (s *stubGoCMSContainer) ContentService() CMSContentService { return nil }
func (s *stubGoCMSContainer) GoCMSMenuService() any             { return s.menu }

type stubGoCMSMenuService struct {
	menus map[string]*stubGoCMSMenu
}

type stubGoCMSMenu struct {
	ID    uuid.UUID
	Code  string
	Items []*stubGoCMSMenuItem
}

type stubGoCMSMenuItem struct {
	ID           uuid.UUID
	MenuID       uuid.UUID
	ParentID     *uuid.UUID
	Position     int
	Target       map[string]any
	Translations []stubGoCMSMenuTranslation
	Children     []*stubGoCMSMenuItem
}

type stubGoCMSMenuTranslation struct {
	Locale string
	Label  string
}

type stubGoCMSNavigationNode struct {
	ID       uuid.UUID
	Label    string
	URL      string
	Target   map[string]any
	Children []stubGoCMSNavigationNode
}

type stubCreateMenuInput struct {
	Code      string
	CreatedBy uuid.UUID
	UpdatedBy uuid.UUID
}

type stubAddMenuItemInput struct {
	MenuID                   uuid.UUID
	ParentID                 *uuid.UUID
	Position                 int
	Target                   map[string]any
	CreatedBy                uuid.UUID
	UpdatedBy                uuid.UUID
	Translations             []stubMenuItemTranslationInput
	AllowMissingTranslations bool
}

type stubMenuItemTranslationInput struct {
	Locale string
	Label  string
}

type stubUpdateMenuItemInput struct {
	ItemID    uuid.UUID
	Target    map[string]any
	Position  *int
	ParentID  *uuid.UUID
	UpdatedBy uuid.UUID
}

type stubDeleteMenuItemRequest struct {
	ItemID          uuid.UUID
	CascadeChildren bool
	DeletedBy       uuid.UUID
}

type stubBulkReorderMenuItemsInput struct {
	MenuID    uuid.UUID
	Items     []stubItemOrder
	UpdatedBy uuid.UUID
}

type stubItemOrder struct {
	ItemID   uuid.UUID
	ParentID *uuid.UUID
	Position int
}

type stubAddMenuItemTranslationInput struct {
	ItemID      uuid.UUID
	Locale      string
	Label       string
	URLOverride *string
}

func newStubGoCMSMenuService() *stubGoCMSMenuService {
	return &stubGoCMSMenuService{menus: map[string]*stubGoCMSMenu{}}
}

func (s *stubGoCMSMenuService) CreateMenu(_ context.Context, input stubCreateMenuInput) (*stubGoCMSMenu, error) {
	menu := &stubGoCMSMenu{
		ID:    uuid.New(),
		Code:  input.Code,
		Items: []*stubGoCMSMenuItem{},
	}
	s.menus[input.Code] = menu
	return menu, nil
}

func (s *stubGoCMSMenuService) GetMenuByCode(_ context.Context, code string) (*stubGoCMSMenu, error) {
	if menu, ok := s.menus[code]; ok {
		return menu, nil
	}
	return nil, errors.New("menu not found")
}

func (s *stubGoCMSMenuService) AddMenuItem(_ context.Context, input stubAddMenuItemInput) (*stubGoCMSMenuItem, error) {
	menu := s.menuByID(input.MenuID)
	if menu == nil {
		return nil, errors.New("menu not found")
	}
	item := &stubGoCMSMenuItem{
		ID:           uuid.New(),
		MenuID:       input.MenuID,
		ParentID:     input.ParentID,
		Position:     input.Position,
		Target:       cloneAnyMap(input.Target),
		Translations: []stubGoCMSMenuTranslation{},
	}
	for _, t := range input.Translations {
		item.Translations = append(item.Translations, stubGoCMSMenuTranslation{Locale: t.Locale, Label: t.Label})
	}
	if input.ParentID != nil {
		parent := findMenuItem(menu.Items, *input.ParentID)
		if parent != nil {
			parent.Children = append(parent.Children, item)
		}
	} else {
		menu.Items = append(menu.Items, item)
	}
	return item, nil
}

func (s *stubGoCMSMenuService) UpdateMenuItem(_ context.Context, input stubUpdateMenuItemInput) (*stubGoCMSMenuItem, error) {
	item := s.findItem(input.ItemID)
	if item == nil {
		return nil, errors.New("item not found")
	}
	if input.Target != nil {
		item.Target = cloneAnyMap(input.Target)
	}
	if input.Position != nil {
		item.Position = *input.Position
	}
	if input.ParentID != nil {
		item.ParentID = input.ParentID
	}
	return item, nil
}

func (s *stubGoCMSMenuService) DeleteMenuItem(_ context.Context, req stubDeleteMenuItemRequest) error {
	for _, menu := range s.menus {
		if removeItem(&menu.Items, req.ItemID, req.CascadeChildren) {
			return nil
		}
	}
	return errors.New("item not found")
}

func (s *stubGoCMSMenuService) BulkReorderMenuItems(_ context.Context, input stubBulkReorderMenuItemsInput) ([]*stubGoCMSMenuItem, error) {
	menu := s.menuByID(input.MenuID)
	if menu == nil {
		return nil, errors.New("menu not found")
	}
	index := map[uuid.UUID]*stubGoCMSMenuItem{}
	flattenItems(menu.Items, index)
	for i := range menu.Items {
		menu.Items[i].Children = nil
	}
	for _, order := range input.Items {
		if item, ok := index[order.ItemID]; ok {
			item.ParentID = order.ParentID
			item.Position = order.Position
		}
	}
	menu.Items = rebuildTree(index)
	return nil, nil
}

func (s *stubGoCMSMenuService) AddMenuItemTranslation(_ context.Context, input stubAddMenuItemTranslationInput) (*stubGoCMSMenuTranslation, error) {
	item := s.findItem(input.ItemID)
	if item == nil {
		return nil, errors.New("item not found")
	}
	for idx, translation := range item.Translations {
		if translation.Locale == input.Locale {
			item.Translations[idx].Label = input.Label
			return &item.Translations[idx], nil
		}
	}
	item.Translations = append(item.Translations, stubGoCMSMenuTranslation{Locale: input.Locale, Label: input.Label})
	return &item.Translations[len(item.Translations)-1], nil
}

func (s *stubGoCMSMenuService) ResolveNavigation(_ context.Context, code string, locale string) ([]stubGoCMSNavigationNode, error) {
	menu := s.menus[code]
	if menu == nil {
		return nil, errors.New("menu not found")
	}
	nodes := []stubGoCMSNavigationNode{}
	for _, item := range menu.Items {
		nodes = append(nodes, buildNavNode(item, locale))
	}
	return nodes, nil
}

func (s *stubGoCMSMenuService) InvalidateCache(context.Context) error { return nil }

func (s *stubGoCMSMenuService) menuByID(id uuid.UUID) *stubGoCMSMenu {
	for _, menu := range s.menus {
		if menu.ID == id {
			return menu
		}
	}
	return nil
}

func (s *stubGoCMSMenuService) findItem(id uuid.UUID) *stubGoCMSMenuItem {
	for _, menu := range s.menus {
		if found := findMenuItem(menu.Items, id); found != nil {
			return found
		}
	}
	return nil
}

func findMenuItem(items []*stubGoCMSMenuItem, id uuid.UUID) *stubGoCMSMenuItem {
	for _, item := range items {
		if item.ID == id {
			return item
		}
		if found := findMenuItem(item.Children, id); found != nil {
			return found
		}
	}
	return nil
}

func buildNavNode(item *stubGoCMSMenuItem, locale string) stubGoCMSNavigationNode {
	node := stubGoCMSNavigationNode{
		ID:       item.ID,
		Target:   cloneAnyMap(item.Target),
		Children: []stubGoCMSNavigationNode{},
	}
	for _, translation := range item.Translations {
		if translation.Locale == locale {
			node.Label = translation.Label
			break
		}
	}
	if node.Label == "" && len(item.Translations) > 0 {
		node.Label = item.Translations[0].Label
	}
	if slug, ok := item.Target["slug"].(string); ok && slug != "" {
		node.URL = "/" + slug
	}
	for _, child := range item.Children {
		node.Children = append(node.Children, buildNavNode(child, locale))
	}
	return node
}

func removeItem(items *[]*stubGoCMSMenuItem, id uuid.UUID, cascade bool) bool {
	out := []*stubGoCMSMenuItem{}
	removed := false
	for _, item := range *items {
		if item.ID == id {
			removed = true
			if !cascade {
				out = append(out, item.Children...)
			}
			continue
		}
		if removeItem(&item.Children, id, cascade) {
			removed = true
		}
		out = append(out, item)
	}
	*items = out
	return removed
}

func flattenItems(items []*stubGoCMSMenuItem, dest map[uuid.UUID]*stubGoCMSMenuItem) {
	for _, item := range items {
		dest[item.ID] = item
		flattenItems(item.Children, dest)
	}
}

func rebuildTree(index map[uuid.UUID]*stubGoCMSMenuItem) []*stubGoCMSMenuItem {
	roots := []*stubGoCMSMenuItem{}
	for _, item := range index {
		item.Children = nil
	}
	for _, item := range index {
		if item.ParentID == nil {
			roots = append(roots, item)
			continue
		}
		if parent, ok := index[*item.ParentID]; ok {
			parent.Children = append(parent.Children, item)
		} else {
			roots = append(roots, item)
		}
	}
	sort.Slice(roots, func(i, j int) bool { return roots[i].Position < roots[j].Position })
	for _, item := range roots {
		sortChildren(item)
	}
	return roots
}

func sortChildren(item *stubGoCMSMenuItem) {
	if item == nil || len(item.Children) == 0 {
		return
	}
	sort.Slice(item.Children, func(i, j int) bool { return item.Children[i].Position < item.Children[j].Position })
	for _, child := range item.Children {
		sortChildren(child)
	}
}
