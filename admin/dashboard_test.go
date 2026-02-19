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
			Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
				_ = ctx
				_ = cfg
				called = true
				return WidgetPayloadOf(struct {
					OK bool `json:"ok"`
				}{OK: true}), nil
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

func TestDashboardProviderCommandRegistrationIsIdempotent(t *testing.T) {
	registry.WithTestRegistry(func() {
		widgetSvc := NewInMemoryWidgetService()
		dash := NewDashboard()
		dash.WithWidgetService(widgetSvc)
		cmdBus := NewCommandBus(true)
		defer cmdBus.Reset()
		dash.WithCommandBus(cmdBus)
		dash.RegisterArea(WidgetAreaDefinition{Code: "admin.dashboard.main"})

		hits := 0
		spec := DashboardProviderSpec{
			Code:        "demo.widget",
			Name:        "Demo",
			DefaultArea: "admin.dashboard.main",
			CommandName: "dashboard.demo.widget",
			Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
				_ = ctx
				_ = cfg
				hits++
				return WidgetPayloadOf(struct {
					OK bool `json:"ok"`
				}{OK: true}), nil
			},
		}
		dash.RegisterProvider(spec)
		dash.RegisterProvider(spec)

		if got := len(cmdBus.factories); got != 1 {
			t.Fatalf("expected one command factory, got %d", got)
		}
		if got := len(cmdBus.dispatchers); got != 1 {
			t.Fatalf("expected one command dispatcher, got %d", got)
		}

		if err := cmdBus.DispatchByName(context.Background(), "dashboard.demo.widget", nil, nil); err != nil {
			t.Fatalf("command dispatch failed: %v", err)
		}
		if hits != 1 {
			t.Fatalf("expected one provider invocation after dispatch, got %d", hits)
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
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				OK bool `json:"ok"`
			}{OK: true}), nil
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

func TestDashboardResolveIncludesRegisteredCustomAreas(t *testing.T) {
	widgetSvc := NewInMemoryWidgetService()
	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)
	dash.RegisterArea(WidgetAreaDefinition{Code: "admin.users.detail.profile", Name: "User Profile", Scope: "users.detail"})
	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "custom.profile",
		Name:        "Custom Profile Widget",
		DefaultArea: "admin.users.detail.profile",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				OK bool `json:"ok"`
			}{OK: true}), nil
		},
	})

	widgets, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
	if err != nil {
		t.Fatalf("resolve failed: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected one widget in custom area, got %d (%+v)", len(widgets), widgets)
	}
	if got := widgets[0]["area"]; got != "admin.users.detail.profile" {
		t.Fatalf("expected custom area widget, got area=%v", got)
	}
}

func TestDashboardLateAreaRegistrationRebuildsLayoutAreas(t *testing.T) {
	widgetSvc := NewInMemoryWidgetService()
	dash := NewDashboard()
	dash.WithWidgetService(widgetSvc)

	// Build components once with default areas.
	if _, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"}); err != nil {
		t.Fatalf("initial resolve failed: %v", err)
	}

	// Register a new non-default area and a widget after initialization.
	dash.RegisterArea(WidgetAreaDefinition{Code: "admin.users.detail.activity", Name: "User Activity", Scope: "users.detail"})
	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "custom.activity",
		Name:        "Custom Activity Widget",
		DefaultArea: "admin.users.detail.activity",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				OK bool `json:"ok"`
			}{OK: true}), nil
		},
	})

	widgets, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
	if err != nil {
		t.Fatalf("resolve after late area registration failed: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected one widget in late-registered area, got %d (%+v)", len(widgets), widgets)
	}
	if got := widgets[0]["area"]; got != "admin.users.detail.activity" {
		t.Fatalf("expected activity area widget, got area=%v", got)
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
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				Value int `json:"value"`
			}{Value: 1}), nil
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

func TestSanitizeDashboardWidgetData_StripsBlockedKeysAndDocumentBlobs(t *testing.T) {
	out := sanitizeDashboardWidgetData(map[string]any{
		"chart_html":          "<html><body>legacy</body></html>",
		"chart_html_fragment": "<div>legacy</div>",
		"title":               "Safe",
		"danger":              "<script>alert(1)</script>",
		"nested": map[string]any{
			"chart_html": "legacy",
			"safe":       "ok",
			"bad":        "<body>x</body>",
		},
	})

	if _, exists := out["chart_html"]; exists {
		t.Fatalf("expected chart_html to be stripped")
	}
	if _, exists := out["chart_html_fragment"]; exists {
		t.Fatalf("expected chart_html_fragment to be stripped")
	}
	if out["danger"] != "" {
		t.Fatalf("expected script payload to be scrubbed, got %#v", out["danger"])
	}
	nested, ok := out["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested map, got %T", out["nested"])
	}
	if _, exists := nested["chart_html"]; exists {
		t.Fatalf("expected nested chart_html to be stripped")
	}
	if nested["bad"] != "" {
		t.Fatalf("expected nested html payload to be scrubbed")
	}
	if nested["safe"] != "ok" {
		t.Fatalf("expected safe nested value preserved")
	}
}

func TestDashboardResolve_SanitizesProviderPayload(t *testing.T) {
	dash := NewDashboard()
	dash.WithWidgetService(NewInMemoryWidgetService())
	dash.RegisterArea(WidgetAreaDefinition{Code: "admin.dashboard.main"})
	dash.RegisterProvider(DashboardProviderSpec{
		Code:        "sanitized.widget",
		Name:        "Sanitized",
		DefaultArea: "admin.dashboard.main",
		Handler: func(ctx AdminContext, cfg map[string]any) (WidgetPayload, error) {
			_ = ctx
			_ = cfg
			return WidgetPayloadOf(struct {
				ChartHTML      string         `json:"chart_html"`
				ChartOptions   map[string]any `json:"chart_options"`
				FooterNote     string         `json:"footer_note"`
				Subtitle       string         `json:"subtitle"`
				ChartAssetsURL string         `json:"chart_assets_host"`
			}{
				ChartHTML:      "<html><body>bad</body></html>",
				ChartOptions:   map[string]any{"series": []any{}},
				FooterNote:     "<script>alert('x')</script>",
				Subtitle:       "ok",
				ChartAssetsURL: "/dashboard/assets/echarts/",
			}), nil
		},
	})

	widgets, err := dash.Resolve(AdminContext{Context: context.Background(), Locale: "en"})
	if err != nil {
		t.Fatalf("resolve failed: %v", err)
	}
	if len(widgets) != 1 {
		t.Fatalf("expected one widget, got %d", len(widgets))
	}

	data, ok := widgets[0]["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected widget data map, got %T", widgets[0]["data"])
	}
	if _, exists := data["chart_html"]; exists {
		t.Fatalf("expected chart_html stripped from resolved widget payload")
	}
	if data["footer_note"] != "" {
		t.Fatalf("expected script-like footer_note scrubbed, got %#v", data["footer_note"])
	}
	if _, ok := data["chart_options"].(map[string]any); !ok {
		t.Fatalf("expected chart_options preserved in sanitized payload")
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
