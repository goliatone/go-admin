package quickstart

import (
	"encoding/json"
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
	html, err := renderer.Render("dashboard_ssr.html", map[string]any{})
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

func TestNormalizeDashboardTemplateData_ConvertsGoDashboardPayload(t *testing.T) {
	payload := map[string]any{
		"areas": map[string]any{
			"main": map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "w-1",
						"definition": "admin.widget.user_stats",
						"area_code":  "admin.dashboard.main",
						"metadata": map[string]any{
							"layout": map[string]any{"width": 6},
							"data":   map[string]any{"total": 12},
						},
					},
				},
			},
		},
		"base_path": "/admin",
	}

	ctx, err := normalizeDashboardTemplateData(payload)
	if err != nil {
		t.Fatalf("normalizeDashboardTemplateData error: %v", err)
	}

	areas, ok := ctx["areas"].([]any)
	if !ok || len(areas) != 1 {
		t.Fatalf("expected one area in normalized payload")
	}
	area, ok := areas[0].(map[string]any)
	if !ok {
		t.Fatalf("expected area map in normalized payload")
	}
	widgets, ok := area["widgets"].([]any)
	if !ok || len(widgets) != 1 {
		t.Fatalf("expected one widget in normalized payload")
	}
	widget, ok := widgets[0].(map[string]any)
	if !ok {
		t.Fatalf("expected widget map in normalized payload")
	}
	if widget["span"] != int64(6) {
		t.Fatalf("expected integer span=6, got %#v", widget["span"])
	}
}

func TestNormalizeTemplateValue_PreservesWholeNumbers(t *testing.T) {
	normalized := normalizeTemplateValue(map[string]any{
		"span": 12,
		"layout": map[string]any{
			"width": 6,
		},
		"ratio": 2.5,
	})

	out, ok := normalized.(map[string]any)
	if !ok {
		t.Fatalf("expected map output")
	}
	if _, ok := out["span"].(int64); !ok {
		t.Fatalf("expected span to normalize as int64, got %T", out["span"])
	}
	layout, ok := out["layout"].(map[string]any)
	if !ok {
		t.Fatalf("expected layout map")
	}
	if _, ok := layout["width"].(int64); !ok {
		t.Fatalf("expected layout.width to normalize as int64, got %T", layout["width"])
	}
	if _, ok := out["ratio"].(float64); !ok {
		t.Fatalf("expected ratio to remain float64, got %T", out["ratio"])
	}
}

func TestWidthFromMetadataSupportsJSONNumber(t *testing.T) {
	meta := map[string]any{
		"layout": map[string]any{
			"width": json.Number("8"),
		},
	}
	if width := widthFromMetadata(meta); width != 8 {
		t.Fatalf("expected width 8, got %d", width)
	}
}

func TestNormalizeDashboardTemplateData_CoercesSpanFloatToInt(t *testing.T) {
	payload := map[string]any{
		"areas": []any{
			map[string]any{
				"code":  "admin.dashboard.main",
				"title": "Main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-1",
						"definition": "admin.widget.user_stats",
						"area":       "admin.dashboard.main",
						"span":       6.0,
					},
				},
			},
		},
		"base_path": "/admin",
	}

	ctx, err := normalizeDashboardTemplateData(payload)
	if err != nil {
		t.Fatalf("normalizeDashboardTemplateData error: %v", err)
	}

	areas, ok := ctx["areas"].([]any)
	if !ok || len(areas) != 1 {
		t.Fatalf("expected one area after serialization")
	}
	area, ok := areas[0].(map[string]any)
	if !ok {
		t.Fatalf("expected serialized area map, got %T", areas[0])
	}

	widgets, ok := area["widgets"].([]any)
	if !ok || len(widgets) != 1 {
		t.Fatalf("expected one widget after serialization")
	}
	widget, ok := widgets[0].(map[string]any)
	if !ok {
		t.Fatalf("expected serialized widget map, got %T", widgets[0])
	}

	if _, ok := widget["span"].(int64); !ok {
		t.Fatalf("expected span to be int64 after serialization, got %T", widget["span"])
	}
	if widget["span"] != int64(6) {
		t.Fatalf("expected span=6 after serialization, got %#v", widget["span"])
	}
}

func TestDashboardRendererRender_DoesNotEmitFloatSpanInHTML(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}<article data-span="{{ widget.span }}" style="--span: {{ widget.span }}"></article>{% endfor %}{% endfor %}`),
		},
	}
	renderer, err := newDashboardTemplateRenderer(
		WithDashboardEmbeddedTemplates(false),
		WithDashboardTemplatesFS(customFS),
	)
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}

	payload := map[string]any{
		"areas": []any{
			map[string]any{
				"code": "admin.dashboard.main",
				"widgets": []any{
					map[string]any{
						"id":         "widget-1",
						"definition": "admin.widget.user_stats",
						"area":       "admin.dashboard.main",
						"span":       6.0,
					},
				},
			},
		},
		"base_path": "/admin",
	}

	html, err := renderer.Render("dashboard_ssr.html", payload)
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

func TestNormalizeWidgetData_StripsDeprecatedChartMarkupAndDocumentBlobs(t *testing.T) {
	normalized, ok := normalizeWidgetData(map[string]any{
		"chart_html":          "<html><body><script>alert(1)</script></body></html>",
		"chart_html_fragment": "<div>legacy</div>",
		"chart_options":       map[string]any{"series": []any{}},
		"title":               "Chart",
		"danger":              "<script>alert(1)</script>",
		"nested": map[string]any{
			"chart_html": "legacy",
			"label":      "<body>bad</body>",
			"safe":       "ok",
		},
	}).(map[string]any)
	if !ok {
		t.Fatalf("expected normalized widget data map")
	}

	if _, exists := normalized["chart_html"]; exists {
		t.Fatalf("expected chart_html to be stripped from canonical widget data")
	}
	if _, exists := normalized["chart_html_fragment"]; exists {
		t.Fatalf("expected chart_html_fragment to be stripped from canonical widget data")
	}
	if normalized["danger"] != "" {
		t.Fatalf("expected script payload to be scrubbed, got %#v", normalized["danger"])
	}

	nested, ok := normalized["nested"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested data map after normalization")
	}
	if _, exists := nested["chart_html"]; exists {
		t.Fatalf("expected nested chart_html to be stripped")
	}
	if nested["label"] != "" {
		t.Fatalf("expected nested html/document string to be scrubbed, got %#v", nested["label"])
	}
	if nested["safe"] != "ok" {
		t.Fatalf("expected safe nested value to be preserved")
	}
}

func TestDashboardRendererNormalizesWidgetDataNumbersForTemplates(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard_ssr.html": {
			Data: []byte(`{% for area in areas %}{% for widget in area.widgets %}Pending: {{ widget.data.status_counts.pending }}{% endfor %}{% endfor %}`),
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
						Definition: "admin.widget.translation_progress",
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
