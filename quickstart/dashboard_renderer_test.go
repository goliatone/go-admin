package quickstart

import (
	"io"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"
	"unsafe"

	"github.com/goliatone/go-admin/admin"
)

func TestDashboardRendererUsesEmbeddedTemplates(t *testing.T) {
	renderer, err := newDashboardTemplateRenderer()
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	layout := admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{Code: "admin.dashboard.main", Title: "Main", Widgets: []*admin.ResolvedWidget{}},
		},
	}
	html, err := renderer.Render("dashboard_ssr.html", &layout)
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
	html, err := renderer.Render("dashboard_ssr.html", &admin.DashboardLayout{})
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

func TestNormalizeDashboardTemplateData_RejectsMapPayload(t *testing.T) {
	_, err := normalizeDashboardTemplateData(map[string]any{
		"areas": []any{},
	})
	if err == nil {
		t.Fatalf("expected map payload to be rejected")
	}
}

func TestNormalizeDashboardTemplateData_PreservesIntegerSpan(t *testing.T) {
	layout := admin.DashboardLayout{
		BasePath: "/admin",
		Areas: []*admin.WidgetArea{
			{
				Code:  "admin.dashboard.main",
				Title: "Main",
				Widgets: []*admin.ResolvedWidget{
					{
						ID:         "widget-1",
						Definition: WidgetUserStats,
						Area:       "admin.dashboard.main",
						Span:       6,
					},
				},
			},
		},
	}

	ctx, err := normalizeDashboardTemplateData(&layout)
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

	layout := admin.DashboardLayout{
		BasePath: "/admin",
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{
						ID:         "widget-1",
						Definition: WidgetUserStats,
						Area:       "admin.dashboard.main",
						Span:       6,
					},
				},
			},
		},
	}

	html, err := renderer.Render("dashboard_ssr.html", &layout)
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

	layout := admin.DashboardLayout{
		Areas: []*admin.WidgetArea{
			{
				Code: "admin.dashboard.main",
				Widgets: []*admin.ResolvedWidget{
					{
						ID:         "widget-1",
						Definition: WidgetTranslationProgress,
						Area:       "admin.dashboard.main",
						Data: map[string]any{
							"status_counts": map[string]any{
								"pending": 1.0,
							},
						},
						Metadata: &admin.WidgetMetadata{Layout: &admin.WidgetLayout{Width: 12}},
					},
				},
			},
		},
	}

	html, err := renderer.Render("dashboard_ssr.html", &layout)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if strings.Contains(html, "1.000000") {
		t.Fatalf("expected normalized integer-like number in widget template data, got %q", html)
	}
}

type dashboardStubRenderer struct{}

func (dashboardStubRenderer) Render(name string, data any, out ...io.Writer) (string, error) {
	_ = name
	_ = data
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
