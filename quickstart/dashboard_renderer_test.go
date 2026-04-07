package quickstart

import (
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"
	"unsafe"

	"github.com/goliatone/go-admin/admin"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
)

func TestDashboardRendererUsesEmbeddedTemplates(t *testing.T) {
	renderer, err := newDashboardTemplateRenderer()
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{Code: "admin.dashboard.main", Title: "Main"},
			},
		},
	}
	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if !strings.Contains(html, "Dashboard") {
		t.Fatalf("expected dashboard title, got %q", html)
	}
	if !strings.Contains(html, "Main") {
		t.Fatalf("expected area title, got %q", html)
	}
}

func TestDashboardRendererOverrideTemplates(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {Data: []byte("custom-dashboard")},
	}
	renderer, err := newDashboardTemplateRenderer(
		WithDashboardTemplatesFS(customFS),
	)
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	html, err := renderer.RenderPage("dashboard_ssr.html", admin.AdminDashboardPage{})
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if html != "custom-dashboard" {
		t.Fatalf("expected custom template output, got %q", html)
	}
}

func TestDashboardRendererDisableEmbeddedRequiresTemplates(t *testing.T) {
	_, err := newDashboardTemplateRenderer(WithDashboardEmbeddedTemplates(false))
	if err == nil {
		t.Fatalf("expected error when embedded templates disabled and none provided")
	}
}

func TestWithDefaultDashboardRendererSkipsWhenAlreadySet(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	original := &dashboardStubRenderer{}
	adm.Dashboard().WithRenderer(original)

	if err := WithDefaultDashboardRenderer(adm, nil, cfg, WithDashboardEmbeddedTemplates(false)); err != nil {
		t.Fatalf("WithDefaultDashboardRenderer error: %v", err)
	}
	if got := getDashboardRenderer(adm); got != original {
		t.Fatalf("expected renderer unchanged")
	}
}

func TestWithDefaultDashboardRendererWiresRenderer(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	if err := WithDefaultDashboardRenderer(adm, nil, cfg); err != nil {
		t.Fatalf("WithDefaultDashboardRenderer error: %v", err)
	}
	if !adm.Dashboard().HasRenderer() {
		t.Fatalf("expected renderer to be set")
	}
}

func TestNormalizeDashboardTemplateData_RejectsUnsupportedPayload(t *testing.T) {
	_, err := normalizeDashboardTemplateData("invalid payload")
	if err == nil {
		t.Fatalf("expected unsupported payload to be rejected")
	}
}

func TestNormalizeDashboardTemplateData_AcceptsTypedAdminDashboardPage(t *testing.T) {
	ctx, err := normalizeDashboardTemplateData(admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "widget-1",
							Definition: admin.WidgetUserStats,
							Area:       "admin.dashboard.main",
							Span:       6,
							Data: map[string]any{
								"status_counts": map[string]any{"pending": 1.0},
							},
						},
					},
				},
			},
		},
		Chrome: admin.AdminChromeState{
			Title:    "Operations",
			BasePath: "/admin",
		},
	})
	if err != nil {
		t.Fatalf("expected typed admin dashboard page to normalize, got %v", err)
	}
	if ctx["title"] != "Operations" {
		t.Fatalf("expected title to round-trip, got %#v", ctx["title"])
	}
	if ctx["base_path"] != "/admin" {
		t.Fatalf("expected base path to round-trip, got %#v", ctx["base_path"])
	}
	layoutJSON, ok := ctx["layout_json"].(string)
	if !ok || !strings.Contains(layoutJSON, `"basePath":"/admin"`) {
		t.Fatalf("expected layout_json to be generated, got %#v", ctx["layout_json"])
	}
	areas, ok := ctx["areas"].([]any)
	if !ok || len(areas) != 1 {
		t.Fatalf("expected one normalized area, got %#v", ctx["areas"])
	}
	area, ok := areas[0].(map[string]any)
	if !ok {
		t.Fatalf("expected normalized area map, got %T", areas[0])
	}
	widgets, ok := area["widgets"].([]any)
	if !ok || len(widgets) != 1 {
		t.Fatalf("expected one normalized widget, got %#v", area["widgets"])
	}
	widget, ok := widgets[0].(map[string]any)
	if !ok {
		t.Fatalf("expected normalized widget map, got %T", widgets[0])
	}
	if widget["area"] != "admin.dashboard.main" {
		t.Fatalf("expected widget area to round-trip, got %#v", widget["area"])
	}
	if widget["span"] != int64(6) {
		t.Fatalf("expected integer span=6, got %#v", widget["span"])
	}
}

func TestNormalizeDashboardTemplateData_PreservesIntegerSpan(t *testing.T) {
	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code:  "admin.dashboard.main",
					Title: "Main",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "widget-1",
							Definition: admin.WidgetUserStats,
							Area:       "admin.dashboard.main",
							Span:       6,
						},
					},
				},
			},
		},
		Chrome: admin.AdminChromeState{
			BasePath: "/admin",
		},
	}

	ctx, err := normalizeDashboardTemplateData(page)
	if err != nil {
		t.Fatalf("normalizeDashboardTemplateData error: %v", err)
	}
	areas, ok := ctx["areas"].([]any)
	if !ok || len(areas) != 1 {
		t.Fatalf("expected one area in normalized payload")
	}
	area, ok := areas[0].(map[string]any)
	if !ok {
		t.Fatalf("expected area map")
	}
	widgets, ok := area["widgets"].([]any)
	if !ok || len(widgets) != 1 {
		t.Fatalf("expected one widget in area")
	}
	widget, ok := widgets[0].(map[string]any)
	if !ok {
		t.Fatalf("expected widget map")
	}
	if widget["span"] != int64(6) {
		t.Fatalf("expected integer span=6, got %#v", widget["span"])
	}
}

func TestNormalizeDashboardTemplateData_AcceptsTypedDashboardPage(t *testing.T) {
	ctx, err := normalizeDashboardTemplateData(dashcmp.Page{
		Title: "Dashboard",
		Areas: []dashcmp.PageArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []dashcmp.WidgetFrame{
					{
						ID:         "widget-1",
						Definition: admin.WidgetUserStats,
						Area:       "admin.dashboard.main",
						Span:       6,
					},
				},
			},
		},
	})
	if err != nil {
		t.Fatalf("normalizeDashboardTemplateData error: %v", err)
	}
	if ctx["title"] != "Dashboard" {
		t.Fatalf("expected title to round-trip, got %#v", ctx["title"])
	}
}

func TestDashboardRendererRender_DoesNotEmitFloatSpanInHTML(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}<article data-span="{{ formatNumber(widget.span) }}" style="--span: {{ formatNumber(widget.span) }}"></article>{% endfor %}{% endfor %}`),
		},
	}
	renderer, err := newDashboardTemplateRenderer(
		WithDashboardEmbeddedTemplates(false),
		WithDashboardTemplatesFS(customFS),
	)
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "widget-1",
							Definition: admin.WidgetUserStats,
							Area:       "admin.dashboard.main",
							Span:       6,
						},
					},
				},
			},
		},
		Chrome: admin.AdminChromeState{
			BasePath: "/admin",
		},
	}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}

	if !strings.Contains(html, `data-span="6"`) {
		t.Fatalf("expected integer span in rendered HTML, got %q", html)
	}
	if !strings.Contains(html, `style="--span: 6"`) {
		t.Fatalf("expected integer CSS span in rendered HTML, got %q", html)
	}
	if strings.Contains(html, ".000000") {
		t.Fatalf("expected no float-formatted spans in rendered HTML, got %q", html)
	}
}

func TestDashboardRendererNormalizesWidgetDataNumbersForTemplates(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}Pending: {{ formatNumber(widget.data.status_counts.pending) }}{% endfor %}{% endfor %}`),
		},
	}
	renderer, err := newDashboardTemplateRenderer(
		WithDashboardEmbeddedTemplates(false),
		WithDashboardTemplatesFS(customFS),
	)
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}

	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Areas: []dashcmp.PageArea{
				{
					Code: "admin.dashboard.main",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "widget-1",
							Definition: admin.WidgetTranslationProgress,
							Area:       "admin.dashboard.main",
							Span:       12,
							Data: map[string]any{
								"status_counts": map[string]any{
									"pending": 1.0,
								},
							},
						},
					},
				},
			},
		},
	}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if strings.Contains(html, "1.000000") {
		t.Fatalf("expected normalized integer-like number in widget template data, got %q", html)
	}
}

func TestDashboardHTMLRouteRendersWithQuickstartRenderer(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate: buildFeatureGate(cfg, map[string]bool{
			"dashboard":   true,
			"cms":         true,
			"preferences": true,
		}, admin.NewInMemoryPreferencesStore()),
	})
	if err != nil {
		t.Fatalf("admin.New error: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})

	renderer, err := newDashboardTemplateRenderer()
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	adm.Dashboard().WithRenderer(renderer)

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize error: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard?locale=en", nil)
	req.Header.Set("X-User-ID", "user-1")
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 from dashboard html route, got %d body=%s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "unsupported dashboard payload type") {
		t.Fatalf("expected typed dashboard page to render successfully, got %q", rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "Dashboard") {
		t.Fatalf("expected dashboard HTML response, got %q", rr.Body.String())
	}
}

type dashboardStubRenderer struct{}

func (dashboardStubRenderer) RenderPage(name string, page admin.AdminDashboardPage, out ...io.Writer) (string, error) {
	_ = name
	_ = page
	if len(out) > 0 && out[0] != nil {
		_, _ = out[0].Write([]byte("stub"))
	}
	return "stub", nil
}

func getDashboardRenderer(adm *admin.Admin) admin.DashboardRenderer {
	if adm == nil || adm.Dashboard() == nil {
		return nil
	}
	return unsafeDashboardRenderer(adm.Dashboard())
}

func unsafeDashboardRenderer(dash *admin.Dashboard) admin.DashboardRenderer {
	if dash == nil {
		return nil
	}
	val := reflect.ValueOf(dash).Elem()
	field := val.FieldByName("renderer")
	if !field.IsValid() {
		return nil
	}
	field = reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem()
	renderer, _ := field.Interface().(admin.DashboardRenderer)
	return renderer
}
