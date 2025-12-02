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
	return &Menu{Code: code, Items: s.items}, nil
}

func (s *stubMenuService) AddMenuItem(_ context.Context, menuCode string, item MenuItem) error {
	item.Menu = menuCode
	s.items = append(s.items, item)
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
	return &Menu{Code: code, Items: out}, nil
}

type stubWidgetService struct{}

func (stubWidgetService) RegisterAreaDefinition(ctx context.Context, def WidgetAreaDefinition) error {
	return nil
}
func (stubWidgetService) RegisterDefinition(ctx context.Context, def WidgetDefinition) error {
	return nil
}
func (stubWidgetService) Areas() []WidgetAreaDefinition   { return nil }
func (stubWidgetService) Definitions() []WidgetDefinition { return nil }

func TestUseCMSOverridesNavigationSource(t *testing.T) {
	menuSvc := &stubMenuService{}
	container := &stubCMSContainer{menu: menuSvc, widgets: stubWidgetService{}}
	adm := New(Config{DefaultLocale: "en", Features: Features{CMS: true}})
	adm.UseCMS(container)
	menuSvc.AddMenuItem(context.Background(), "admin.main", MenuItem{Label: "CMS Item"})
	if err := adm.Initialize(nilRouter{}); err != nil {
		t.Fatalf("init failed: %v", err)
	}
	items := adm.nav.Resolve(context.Background(), "en")
	if len(items) != 1 || items[0].Label != "CMS Item" {
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
