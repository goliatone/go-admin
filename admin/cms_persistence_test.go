package admin

import (
	"context"
	"strings"
	"testing"

	cms "github.com/goliatone/go-cms"
)

func TestGoCMSContainerBackedNavigationAndDashboard(t *testing.T) {
	ctx := context.Background()
	cfg := cms.DefaultConfig()
	cfg.Features.Widgets = true

	module, err := cms.New(cfg)
	if err != nil {
		t.Fatalf("cms new: %v", err)
	}

	adm := mustNewAdmin(t, Config{
		DefaultLocale: "en",
		Features:      Features{CMS: true, Dashboard: true},
		CMS:           CMSOptions{Container: NewGoCMSContainerAdapter(module)},
	}, Dependencies{})

	if err := adm.Initialize(nilRouter{}); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	if _, err := adm.MenuService().CreateMenu(ctx, adm.navMenuCode); err != nil && !strings.Contains(err.Error(), "exists") {
		t.Fatalf("create menu: %v", err)
	}
	if err := adm.MenuService().AddMenuItem(ctx, adm.navMenuCode, MenuItem{Label: "GoCMS", Locale: "en", Target: map[string]any{"type": "url", "url": "/persist"}}); err != nil {
		t.Fatalf("add menu item: %v", err)
	}
	items := adm.Menu().Resolve(ctx, "en")
	if len(items) == 0 || items[0].Label != "GoCMS" {
		t.Fatalf("expected GoCMS navigation item, got %+v", items)
	}

	adm.Dashboard().RegisterProvider(DashboardProviderSpec{
		Code:   "stat",
		Name:   "Stat",
		Schema: map[string]any{"type": "object"},
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			return map[string]any{"value": 1}, nil
		},
	})
	if _, err := adm.widgetSvc.SaveInstance(ctx, WidgetInstance{DefinitionCode: "stat", Area: "admin.dashboard.main", Locale: "en", Config: map[string]any{"title": "Persisted"}}); err != nil {
		t.Fatalf("save instance: %v", err)
	}
	instances, err := adm.widgetSvc.ListInstances(ctx, WidgetInstanceFilter{})
	if err != nil {
		t.Fatalf("list instances: %v", err)
	}
	if len(instances) == 0 {
		t.Fatalf("expected widget instances from go-cms, got none")
	}
	widgets, err := adm.Dashboard().Resolve(AdminContext{Context: ctx, Locale: "en"})
	if err != nil {
		t.Fatalf("resolve dashboard: %v", err)
	}
	found := false
	for _, widget := range widgets {
		if widget["definition"] == "stat" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected widget from go-cms store, got %+v", widgets)
	}
}
