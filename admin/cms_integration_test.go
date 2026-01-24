package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

type stubCMSContainer struct {
	menu    CMSMenuService
	widgets CMSWidgetService
}

func (s *stubCMSContainer) WidgetService() CMSWidgetService { return s.widgets }
func (s *stubCMSContainer) MenuService() CMSMenuService     { return s.menu }
func (s *stubCMSContainer) ContentService() CMSContentService {
	return nil
}

type stubMenuService struct {
	items []MenuItem
}

func (s *stubMenuService) CreateMenu(_ context.Context, code string) (*Menu, error) {
	slug := NormalizeMenuSlug(code)
	return &Menu{Code: slug, Slug: slug, ID: MenuUUIDFromSlug(slug), Items: s.items}, nil
}

func (s *stubMenuService) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	item.Menu = menuCode
	s.items = append(s.items, item)
	return nil
}

func (s *stubMenuService) UpdateMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	for idx, existing := range s.items {
		if existing.ID == item.ID && (existing.Menu == menuCode || existing.Menu == "") {
			item.Menu = menuCode
			s.items[idx] = item
			return nil
		}
	}
	return nil
}

func (s *stubMenuService) DeleteMenuItem(_ context.Context, menuCode, id string) error {
	filtered := []MenuItem{}
	for _, item := range s.items {
		if item.ID == id && (item.Menu == menuCode || item.Menu == "") {
			continue
		}
		filtered = append(filtered, item)
	}
	s.items = filtered
	return nil
}

func (s *stubMenuService) ReorderMenu(_ context.Context, _ string, _ []string) error {
	return nil
}

func (s *stubMenuService) Menu(_ context.Context, code, locale string) (*Menu, error) {
	out := []MenuItem{}
	for _, item := range s.items {
		if item.Menu == code || item.Menu == "" {
			item.Locale = locale
			out = append(out, item)
		}
	}
	slug := NormalizeMenuSlug(code)
	return &Menu{Code: slug, Slug: slug, ID: MenuUUIDFromSlug(slug), Items: out}, nil
}

func (s *stubMenuService) MenuByLocation(ctx context.Context, location, locale string) (*Menu, error) {
	return s.Menu(ctx, location, locale)
}

type stubWidgetService struct{}

func (stubWidgetService) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	return nil
}
func (stubWidgetService) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	return nil
}
func (stubWidgetService) DeleteDefinition(ctx context.Context, code string) error {
	return nil
}
func (stubWidgetService) Areas() []WidgetAreaDefinition   { return nil }
func (stubWidgetService) Definitions() []WidgetDefinition { return nil }
func (stubWidgetService) SaveInstance(ctx context.Context, instance WidgetInstance) (*WidgetInstance, error) {
	return &instance, nil
}
func (stubWidgetService) DeleteInstance(ctx context.Context, id string) error { return nil }
func (stubWidgetService) ListInstances(ctx context.Context, filter WidgetInstanceFilter) ([]WidgetInstance, error) {
	return []WidgetInstance{}, nil
}

func TestUseCMSOverridesNavigationSource(t *testing.T) {
	menuSvc := &stubMenuService{}
	container := &stubCMSContainer{menu: menuSvc, widgets: stubWidgetService{}}
	adm := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS)})
	adm.UseCMS(container)
	menuSvc.AddMenuItem(context.Background(), "admin.main", MenuItem{Label: "CMS Item"})
	if len(menuSvc.items) != 1 {
		t.Fatalf("expected item stored before init, got %d", len(menuSvc.items))
	}
	if err := adm.Initialize(nilRouter{}); err != nil {
		t.Fatalf("init failed: %v", err)
	}
	t.Logf("admin menu svc type=%T", adm.menuSvc)
	if adm.nav.MenuService() == nil {
		t.Fatalf("nav menu service not set")
	}
	if adm.nav.DefaultMenuCode() != "admin.main" {
		t.Fatalf("unexpected default menu code %s", adm.nav.DefaultMenuCode())
	}
	menu, err := adm.menuSvc.Menu(context.Background(), "admin.main", "en")
	if err != nil {
		t.Fatalf("menu error: %v", err)
	}
	t.Logf("menu items via svc: %d", len(menu.Items))
	items := adm.nav.Resolve(context.Background(), "en")
	found := false
	for _, item := range items {
		if item.Label == "CMS Item" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected CMS-provided menu, got %+v", items)
	}
}

type nilRouter struct{}

func (nilRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}
func (nilRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}
func (nilRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}
func (nilRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return nil
}
