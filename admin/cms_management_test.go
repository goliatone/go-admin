package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin/internal/boot"
	router "github.com/goliatone/go-router"
)

type captureRouter struct {
	routes map[string]router.HandlerFunc
}

func (r *captureRouter) Handle(method router.HTTPMethod, path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	switch method {
	case router.GET:
		return r.Get(path, handler, mw...)
	case router.POST:
		return r.Post(path, handler, mw...)
	case router.PUT:
		return r.Put(path, handler, mw...)
	case router.DELETE:
		return r.Delete(path, handler, mw...)
	case router.PATCH:
		return r.Patch(path, handler, mw...)
	case router.HEAD:
		return r.Head(path, handler, mw...)
	default:
		return nil
	}
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

func (r *captureRouter) Patch(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
	return r.Get(path, handler, mw...)
}

func (r *captureRouter) Head(path string, handler router.HandlerFunc, mw ...router.MiddlewareFunc) router.RouteInfo {
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
	if _, ok := routerCapture.routes["/admin/api/content-tree"]; !ok {
		t.Fatalf("expected content tree route to be registered")
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
	treePanel, ok := adm.Registry().Panel("content_tree")
	if !ok || treePanel == nil || !treePanel.Schema().UseBlocks || !treePanel.Schema().UseSEO || !treePanel.Schema().TreeView {
		t.Fatalf("content tree panel missing CMS flags")
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

func TestWidgetInstanceRepositoryListSupportsFallbackLocalesFilter(t *testing.T) {
	svc := NewInMemoryWidgetService()
	repo := NewWidgetInstanceRepository(svc)
	if _, err := repo.Create(context.Background(), map[string]any{
		"definition_code": "stats",
		"area":            "admin.dashboard.main",
		"locale":          "en",
		"config":          map[string]any{"title": "Fallback"},
	}); err != nil {
		t.Fatalf("create fallback widget failed: %v", err)
	}

	list, total, err := repo.List(context.Background(), ListOptions{
		Filters: map[string]any{
			"area":             "admin.dashboard.main",
			"locale":           "fr",
			"fallback_locales": []string{"en"},
		},
	})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("expected fallback locale list result, got total=%d len=%d", total, len(list))
	}
	if got := list[0]["locale"]; got != "en" {
		t.Fatalf("expected fallback locale record, got %+v", list[0])
	}
}

func TestPanelBindingListUsesRouteLocaleForBlockDefinitionPanel(t *testing.T) {
	repo := NewCMSBlockDefinitionRepository(&adminBlockReadContentStub{
		defs: []CMSBlockDefinition{
			{ID: "hero-en", Name: "Hero EN", Type: "hero", Locale: "en"},
			{ID: "hero-es", Name: "Hero ES", Type: "hero", Locale: "es"},
		},
	}, nil)
	panel := &Panel{name: "block_definitions", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "block_definitions",
		panel: panel,
	}

	rows, total, _, _, _, err := binding.List(newPanelBindingMockContext(), "es", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one locale-scoped block definition, got total=%d len=%d", total, len(rows))
	}
	if rows[0]["locale"] != "es" {
		t.Fatalf("expected spanish block definition, got %+v", rows[0])
	}
}

func TestPanelBindingListUsesRouteLocaleForBlocksPanel(t *testing.T) {
	repo := NewCMSBlockRepository(&adminBlockReadContentStub{
		items: []CMSContent{
			{ID: "content-en", Locale: "en"},
			{ID: "content-es", Locale: "es"},
		},
		blocks: map[string][]CMSBlock{
			"content-en": {{
				ID:           "block-en",
				ContentID:    "content-en",
				DefinitionID: "hero",
				BlockType:    "hero",
				Locale:       "en",
			}},
			"content-es": {{
				ID:           "block-es",
				ContentID:    "content-es",
				DefinitionID: "hero",
				BlockType:    "hero",
				Locale:       "es",
			}},
		},
	})
	panel := &Panel{name: "blocks", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "blocks",
		panel: panel,
	}

	rows, total, _, _, _, err := binding.List(newPanelBindingMockContext(), "es", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one locale-scoped block, got total=%d len=%d", total, len(rows))
	}
	if rows[0]["locale"] != "es" || rows[0]["id"] != "block-es" {
		t.Fatalf("expected spanish block, got %+v", rows[0])
	}
}

func TestPanelBindingListUsesRouteLocaleForBlockConflictPanel(t *testing.T) {
	repo := NewCMSBlockConflictRepository(&adminBlockReadContentStub{
		items: []CMSContent{
			{
				ID:          "content-en",
				Title:       "Article EN",
				Slug:        "article-en",
				ContentType: "article",
				Locale:      "en",
				Data: map[string]any{
					"blocks": []map[string]any{{"type": "hero", "title": "embedded en"}},
				},
			},
			{
				ID:          "content-es",
				Title:       "Article ES",
				Slug:        "article-es",
				ContentType: "article",
				Locale:      "es",
				Data: map[string]any{
					"blocks": []map[string]any{{"type": "hero", "title": "embedded es"}},
				},
			},
		},
		blocks: map[string][]CMSBlock{
			"content-en": {{
				ID:           "legacy-en",
				ContentID:    "content-en",
				DefinitionID: "hero",
				BlockType:    "hero",
				Locale:       "en",
				Position:     1,
				Data:         map[string]any{"title": "legacy en"},
			}},
			"content-es": {{
				ID:           "legacy-es",
				ContentID:    "content-es",
				DefinitionID: "hero",
				BlockType:    "hero",
				Locale:       "es",
				Position:     1,
				Data:         map[string]any{"title": "legacy es"},
			}},
		},
	})
	panel := &Panel{name: "block_conflicts", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "block_conflicts",
		panel: panel,
	}

	rows, total, _, _, _, err := binding.List(newPanelBindingMockContext(), "es", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one locale-scoped conflict, got total=%d len=%d", total, len(rows))
	}
	if rows[0]["locale"] != "es" || rows[0]["entity_id"] != "content-es" {
		t.Fatalf("expected spanish conflict, got %+v", rows[0])
	}
}

func TestPanelBindingListUsesRouteLocaleForWidgetInstancesPanel(t *testing.T) {
	svc := NewInMemoryWidgetService()
	repo := NewWidgetInstanceRepository(svc)
	if _, err := repo.Create(context.Background(), map[string]any{
		"definition_code": "stats",
		"area":            "admin.dashboard.main",
		"locale":          "en",
	}); err != nil {
		t.Fatalf("create english widget failed: %v", err)
	}
	if _, err := repo.Create(context.Background(), map[string]any{
		"definition_code": "stats",
		"area":            "admin.dashboard.main",
		"locale":          "es",
	}); err != nil {
		t.Fatalf("create spanish widget failed: %v", err)
	}
	panel := &Panel{name: "widget_instances", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "widget_instances",
		panel: panel,
	}

	rows, total, _, _, _, err := binding.List(newPanelBindingMockContext(), "es", boot.ListOptions{Page: 1, PerPage: 10})
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one locale-scoped widget instance, got total=%d len=%d", total, len(rows))
	}
	if rows[0]["locale"] != "es" {
		t.Fatalf("expected spanish widget instance, got %+v", rows[0])
	}
}
