package admin

import (
	"bytes"
	"context"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

type stubAuthorizer struct {
	allow bool
}

func (s stubAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = action
	_ = resource
	return s.allow
}

func TestDashboardProviderRegistersCommandAndResolvesInstances(t *testing.T) {
	registry.WithTestRegistry(func() {
		widgetSvc := NewInMemoryWidgetService()
		dash := NewDashboard()
		dash.WithWidgetService(widgetSvc)
		cmdBus := NewCommandBus(true)
		defer cmdBus.Reset()
		dash.WithCommandBus(cmdBus)
		dash.RegisterArea(WidgetAreaDefinition{Code: "admin.dashboard.main"})

		called := false
		dash.RegisterProvider(DashboardProviderSpec{
			Code:        "demo.widget",
			Name:        "Demo",
			DefaultArea: "admin.dashboard.main",
			CommandName: "dashboard.demo.widget",
			Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
				_ = ctx
				_ = cfg
				called = true
				return map[string]any{"ok": true}, nil
			},
		})

		widgets, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
		if err != nil {
			t.Fatalf("resolve failed: %v", err)
		}
		if len(widgets) != 1 {
			t.Fatalf("expected one widget, got %d", len(widgets))
		}
		if err := cmdBus.DispatchByName(context.Background(), "dashboard.demo.widget", nil, nil); err != nil {
			t.Fatalf("command dispatch failed: %v", err)
		}
		if !called {
			t.Fatalf("expected provider handler to be invoked by command")
		}
	})
}

func TestDashboardLateProviderRegistrationUpdatesComponents(t *testing.T) {
	widgetSvc := NewInMemoryWidgetService()
	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)
	dash.RegisterArea(WidgetAreaDefinition{Code: "admin.dashboard.main"})

	widgets, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
	if err != nil {
		t.Fatalf("initial resolve failed: %v", err)
	}
	if len(widgets) != 0 {
		t.Fatalf("expected no widgets before late registration, got %d", len(widgets))
	}

	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "late.widget",
		Name:        "Late Widget",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			_ = ctx
			_ = cfg
			return map[string]any{"ok": true}, nil
		},
	})

	widgets, err = dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
	if err != nil {
		t.Fatalf("resolve after late registration failed: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected one widget after late registration, got %d", len(widgets))
	}
	found := false
	for _, widget := range widgets {
		if widget["definition"] != "late.widget" {
			continue
		}
		found = true
		data, ok := widget["data"].(map[string]any)
		if !ok {
			t.Fatalf("expected widget data map, got %T", widget["data"])
		}
		if data["ok"] != true {
			t.Fatalf("expected widget data ok=true, got %+v", data)
		}
	}
	if !found {
		t.Fatalf("expected late.widget in results, got %+v", widgets)
	}
}

func TestDashboardVisibilityPermissionFilters(t *testing.T) {
	dash := NewDashboard()
	dash.WithWidgetService(NewInMemoryWidgetService())
	dash.WithAuthorizer(stubAuthorizer{allow: false})
	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "secure.widget",
		Name:        "Secure",
		DefaultArea: "admin.dashboard.main",
		Permission:  "admin.dashboard.view",
		Handler: func(ctx AdminContext, cfg map[string]any) (map[string]any, error) {
			_ = ctx
			_ = cfg
			return map[string]any{"value": 1}, nil
		},
	})
	widgets, err := dash.Resolve(AdminContext{Context: context.Background()})
	if err != nil {
		t.Fatalf("resolve failed: %v", err)
	}
	if len(widgets) != 0 {
		t.Fatalf("expected widget to be hidden by permission gate, got %d", len(widgets))
	}
}

func TestDashboardConfigRoutePersistsLayoutPerUser(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromKeys(FeatureDashboard, FeatureCMS, FeaturePreferences)})
	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	body := []byte(`{"area_order":{"admin.dashboard.main":["w1"]},"layout_rows":{"admin.dashboard.main":[{"widgets":[{"id":"w1","width":12}]}]},"hidden_widget_ids":["w1"]}`)
	req := httptest.NewRequest("POST", "/admin/api/dashboard/preferences", bytes.NewReader(body))
	req.Header.Set("X-User-ID", "user-1")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("preferences save status: %d body=%s", rr.Code, rr.Body.String())
	}

	saved := adm.PreferencesService().DashboardOverrides(context.Background(), "user-1")
	rows := saved.AreaRows["admin.dashboard.main"]
	if len(rows) != 1 || len(rows[0].Widgets) != 1 || rows[0].Widgets[0].ID != "w1" {
		t.Fatalf("expected overrides to persist, got %+v", saved.AreaRows)
	}
	if !saved.HiddenWidgets["w1"] {
		t.Fatalf("expected widget hidden flag to persist, got %+v", saved.HiddenWidgets)
	}

	req = httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("dashboard status: %d body=%s", rr.Code, rr.Body.String())
	}
}
