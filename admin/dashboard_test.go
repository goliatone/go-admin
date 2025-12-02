package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

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
	widgetSvc := NewInMemoryWidgetService()
	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)
	cmdReg := NewCommandRegistry(true)
	dash.WithCommandBus(cmdReg)

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
	if err := cmdReg.Dispatch(context.Background(), "dashboard.demo.widget"); err != nil {
		t.Fatalf("command dispatch failed: %v", err)
	}
	if !called {
		t.Fatalf("expected provider handler to be invoked by command")
	}
}

func TestDashboardVisibilityPermissionFilters(t *testing.T) {
	dash := NewDashboard()
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
		Features: Features{
			Dashboard: true,
		},
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	r := server.Router()
	if err := adm.Initialize(r); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	layoutPayload := map[string]any{
		"layout": []map[string]any{
			{
				"definition": "admin.widget.quick_actions",
				"area":       "admin.dashboard.main",
				"config":     map[string]any{"title": "My Actions"},
				"position":   1,
			},
		},
	}
	body, _ := json.Marshal(layoutPayload)
	req := httptest.NewRequest("POST", "/admin/api/dashboard/config", bytes.NewReader(body))
	req.Header.Set("X-User-ID", "user-1")
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("config save status: %d body=%s", rr.Code, rr.Body.String())
	}

	req = httptest.NewRequest("GET", "/admin/api/dashboard", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr = httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 200 {
		t.Fatalf("dashboard status: %d body=%s", rr.Code, rr.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	widgets, ok := resp["widgets"].([]any)
	if !ok || len(widgets) == 0 {
		t.Fatalf("expected widgets in response, got %v", resp["widgets"])
	}
	first := widgets[0].(map[string]any)
	if first["definition"] != "admin.widget.quick_actions" {
		t.Fatalf("expected saved layout to apply, got %+v", first)
	}
}
