package admin

import (
	"context"
	"testing"

	router "github.com/goliatone/go-router"
)

type captureRouter struct {
	routes map[string]router.HandlerFunc
}

func (r *captureRouter) Get(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	if r.routes == nil {
		r.routes = map[string]router.HandlerFunc{}
	}
	r.routes[path] = handler
	return nil
}
func (r *captureRouter) Post(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Get(path, handler, mw...)
}
func (r *captureRouter) Put(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Get(path, handler, mw...)
}
func (r *captureRouter) Delete(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Get(path, handler, mw...)
}

func TestRegisterCMSDemoPanelsRoutesAndLocale(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureCMS, FeatureDashboard)})
	routerCapture := &captureRouter{}
	adm.router = routerCapture

	if err := adm.RegisterCMSDemoPanels(); err != nil {
		t.Fatalf("register cms demo panels failed: %v", err)
	}

	if _, ok := routerCapture.routes["/admin/api/content/:id/blocks"]; !ok {
		t.Fatalf("expected content blocks route to be registered")
	}
	if _, ok := routerCapture.routes["/admin/api/pages-tree"]; !ok {
		t.Fatalf("expected page tree route to be registered")
	}
	panel, ok := adm.Registry().Panel("content")
	if !ok || panel == nil {
		t.Fatalf("content panel not registered")
	}
	ctx := AdminContext{Context: context.Background(), Locale: "es"}
	records, total, err := panel.List(ctx, ListOptions{Filters: map[string]any{"locale": "es"}, PerPage: 5})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total == 0 || len(records) == 0 || records[0]["locale"] != "es" {
		t.Fatalf("expected spanish content, got %+v", records)
	}
	pagePanel, ok := adm.Registry().Panel("pages")
	if !ok || pagePanel == nil || !pagePanel.Schema().UseBlocks || !pagePanel.Schema().UseSEO || !pagePanel.Schema().TreeView {
		t.Fatalf("page panel missing CMS flags")
	}
}

func TestCMSMenuRepositoryLocaleAndReorder(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	repo := NewCMSMenuRepository(menuSvc, "admin.main")
	_, _ = repo.Create(context.Background(), map[string]any{"label": "Dashboard", "locale": "en", "position": 2})
	second, _ := repo.Create(context.Background(), map[string]any{"label": "Contenido", "locale": "es", "position": 1})

	listEs, total, err := repo.List(context.Background(), ListOptions{Filters: map[string]any{"locale": "es"}})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || listEs[0]["label"] != "Contenido" {
		t.Fatalf("expected locale filter to return spanish item, got %+v", listEs)
	}

	_, err = repo.Update(context.Background(), second["id"].(string), map[string]any{
		"label":    "Contenido",
		"locale":   "es",
		"position": 3,
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	listAll, _, _ := repo.List(context.Background(), ListOptions{})
	if len(listAll) != 2 {
		t.Fatalf("expected two items")
	}
	if listAll[0]["label"] == "Contenido" {
		t.Fatalf("expected reorder to move spanish item after dashboard, got %+v", listAll)
	}
}

func TestWidgetInstanceRepositoryConfigRoundTrip(t *testing.T) {
	svc := NewInMemoryWidgetService()
	repo := NewWidgetInstanceRepository(svc)
	created, err := repo.Create(context.Background(), map[string]any{
		"definition_code": "stats",
		"area":            "admin.dashboard.main",
		"locale":          "en",
		"config":          map[string]any{"title": "Stats"},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	list, total, err := repo.List(context.Background(), ListOptions{})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || list[0]["id"] != created["id"] {
		t.Fatalf("unexpected list result %+v", list)
	}
	cfg, ok := list[0]["config"].(map[string]any)
	if !ok || cfg["title"] != "Stats" {
		t.Fatalf("expected config to round trip, got %+v", list[0]["config"])
	}
}
