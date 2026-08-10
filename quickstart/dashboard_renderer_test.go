package quickstart

import (
	"context"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"testing/fstest"
	"unsafe"

	"github.com/goliatone/go-admin/admin"
	client "github.com/goliatone/go-admin/pkg/client"
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
	if !strings.Contains(html, `data-widget-grid`) ||
		!strings.Contains(html, `assets/dist/styles/widgets.css`) {
		t.Fatalf("default renderer did not use the canonical admin dashboard shell: %q", html)
	}
	for _, marker := range []string{"data-admin-shell", "data-admin-page-header", "data-admin-shell-content"} {
		if !strings.Contains(html, marker) {
			t.Fatalf("default renderer omitted canonical shell marker %q: %q", marker, html)
		}
	}
}

func TestDashboardRendererUsesDebugAreaSlotAndAdminAssetBasePath(t *testing.T) {
	renderer, err := newDashboardTemplateRenderer(WithDashboardTemplatesFS(client.Templates()))
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	page := admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{
			Title: "Debug Console",
			Areas: []dashcmp.PageArea{
				{
					Slot: "main",
					Code: "admin.debug",
					Widgets: []dashcmp.WidgetFrame{
						{
							ID:         "debug-requests",
							Definition: "admin.debug.panel.requests",
							Area:       "admin.debug",
							Span:       12,
							Data:       map[string]any{"panel": "requests"},
						},
					},
				},
			},
		},
		Chrome: admin.AdminChromeState{
			Title:         "Debug Console",
			BasePath:      "/admin",
			AssetBasePath: "/admin",
			APIBasePath:   "/admin/debug/api",
		},
	}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	for _, expected := range []string{
		`href="/admin/assets/dist/styles/widgets.css"`,
		`from '/admin/assets/dist/dashboard/index.js'`,
		`data-area-code="admin.debug"`,
		`data-area-grid="admin.debug"`,
		`const apiBasePath = '/admin/debug/api'`,
		`data-widget="debug-requests"`,
		`dashboardState.areas.map((area) => area.code).filter(Boolean)`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected rendered debug dashboard to contain %q, got %q", expected, html)
		}
	}
	if strings.Contains(html, `data-area-code="admin.dashboard.main"`) {
		t.Fatalf("debug dashboard rendered the normal main area: %q", html)
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

func TestDashboardRendererUsesRegisteredCustomWidgetTemplate(t *testing.T) {
	customFS := fstest.MapFS{
		"dashboard/widgets/showcase/record_metric.html": {
			Data: []byte(`<div data-custom-metric>{{ formatNumber(widget.data.value) }}</div>`),
		},
	}
	renderer, err := newDashboardTemplateRenderer(
		WithDashboardTemplatesFS(customFS),
	)
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	page := admin.AdminDashboardPage{Dashboard: dashcmp.Page{
		Areas: []dashcmp.PageArea{{
			Slot: "main",
			Code: "admin.dashboard.main",
			Widgets: []dashcmp.WidgetFrame{{
				ID:         "metric",
				Definition: "showcase.widget.record_metric",
				Name:       "Record Metrics",
				Template:   "dashboard/widgets/showcase/record_metric.html",
				Area:       "admin.dashboard.main",
				Span:       12,
				Data:       map[string]any{"value": 7},
			}},
		}},
	}}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	for _, expected := range []string{"Record Metrics", `data-custom-metric`, ">7<"} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected custom widget output %q, got %q", expected, html)
		}
	}
	if strings.Contains(html, `<pre class="text-xs text-gray-600 overflow-auto">`) {
		t.Fatalf("custom widget fell through to raw JSON: %q", html)
	}
}

func TestDashboardRendererUnknownWidgetRetainsEscapedJSONFallback(t *testing.T) {
	renderer, err := newDashboardTemplateRenderer()
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	page := admin.AdminDashboardPage{Dashboard: dashcmp.Page{
		Areas: []dashcmp.PageArea{{
			Slot: "main",
			Code: "admin.dashboard.main",
			Widgets: []dashcmp.WidgetFrame{{
				ID:         "unknown",
				Definition: "unknown.widget",
				Area:       "admin.dashboard.main",
				Span:       12,
				Data:       map[string]any{"unsafe": "<script>alert(1)</script>"},
			}},
		}},
	}}

	html, err := renderer.RenderPage("dashboard_ssr.html", page)
	if err != nil {
		t.Fatalf("Render error: %v", err)
	}
	if !strings.Contains(html, `<pre class="text-xs text-gray-600 overflow-auto">`) ||
		!strings.Contains(html, `&quot;unsafe&quot;`) ||
		!strings.Contains(html, `\u003cscript\u003ealert(1)\u003c/script\u003e`) {
		t.Fatalf("expected escaped JSON fallback, got %q", html)
	}
	if strings.Contains(html, "<script>alert(1)</script>") {
		t.Fatalf("unknown widget fallback emitted executable markup: %q", html)
	}
}

func TestDashboardRendererReportsMissingRegisteredWidgetTemplate(t *testing.T) {
	renderer, err := newDashboardTemplateRenderer()
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer error: %v", err)
	}
	page := admin.AdminDashboardPage{Dashboard: dashcmp.Page{
		Areas: []dashcmp.PageArea{{
			Slot: "main",
			Code: "admin.dashboard.main",
			Widgets: []dashcmp.WidgetFrame{{
				ID:         "missing",
				Definition: "showcase.widget.missing",
				Template:   "dashboard/widgets/showcase/missing.html",
				Area:       "admin.dashboard.main",
				Span:       12,
			}},
		}},
	}}

	if _, err := renderer.RenderPage("dashboard_ssr.html", page); err == nil {
		t.Fatal("expected a missing registered widget template to fail rendering")
	}
}

func TestDashboardRendererDisableEmbeddedRequiresTemplates(t *testing.T) {
	_, err := newDashboardTemplateRenderer(WithDashboardEmbeddedTemplates(false))
	if err == nil {
		t.Fatalf("expected error when embedded templates disabled and none provided")
	}
}

func TestDashboardRendererDisableEmbeddedRejectsIncompleteShell(t *testing.T) {
	_, err := newDashboardTemplateRenderer(
		WithDashboardTemplatesFS(fstest.MapFS{
			"dashboard_ssr.html": {Data: []byte("custom-dashboard")},
		}),
		WithDashboardEmbeddedTemplates(false),
	)
	if err == nil {
		t.Fatal("expected an incomplete isolated dashboard shell to fail")
	}
	if !strings.Contains(err.Error(), "isolated dashboard template set is incomplete") ||
		!strings.Contains(err.Error(), "layout.html") {
		t.Fatalf("expected missing canonical shell error, got %v", err)
	}
}

func TestDashboardRendererDisableEmbeddedRejectsMalformedShell(t *testing.T) {
	_, err := newDashboardTemplateRenderer(
		WithDashboardTemplatesFS(fstest.MapFS{
			"layout.html": {Data: []byte(`{% if %}`)},
		}),
		WithDashboardTemplatesFS(client.Templates()),
		WithDashboardEmbeddedTemplates(false),
	)
	if err == nil || !strings.Contains(err.Error(), "cannot render the canonical entry point") {
		t.Fatalf("expected malformed isolated shell render failure, got %v", err)
	}
}

func TestDashboardRendererDisableEmbeddedRejectsIncompatibleShell(t *testing.T) {
	_, err := newDashboardTemplateRenderer(
		WithDashboardTemplatesFS(fstest.MapFS{
			"layout.html": {Data: []byte(`<!doctype html><html><body>{% block content %}{% endblock %}</body></html>`)},
		}),
		WithDashboardTemplatesFS(client.Templates()),
		WithDashboardEmbeddedTemplates(false),
	)
	if err == nil || !strings.Contains(err.Error(), "isolated dashboard template set is incompatible") ||
		!strings.Contains(err.Error(), "admin shell") {
		t.Fatalf("expected incompatible isolated shell contract failure, got %v", err)
	}
}

func TestDashboardTemplatesFSReturnsCanonicalAdminShell(t *testing.T) {
	template, err := fs.ReadFile(DashboardTemplatesFS(), "layout.html")
	if err != nil {
		t.Fatalf("read canonical dashboard layout: %v", err)
	}
	for _, marker := range []string{"data-admin-shell", "data-admin-page-header", "data-admin-shell-content"} {
		if !strings.Contains(string(template), marker) {
			t.Fatalf("expected canonical dashboard layout marker %q", marker)
		}
	}
}

func TestWithDefaultDashboardRendererSkipsWhenAlreadySet(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, adminErr := admin.New(cfg, admin.Dependencies{})
	if adminErr != nil {
		t.Fatalf("admin.New error: %v", adminErr)
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
	adm, adminErr := admin.New(cfg, admin.Dependencies{})
	if adminErr != nil {
		t.Fatalf("admin.New error: %v", adminErr)
	}
	if err := WithDefaultDashboardRenderer(adm, nil, cfg); err != nil {
		t.Fatalf("WithDefaultDashboardRenderer error: %v", err)
	}
	if !adm.Dashboard().HasRenderer() {
		t.Fatalf("expected renderer to be set")
	}
}

func TestWithDefaultDashboardRendererUsesSharedViewEngine(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, adminErr := admin.New(cfg, admin.Dependencies{})
	if adminErr != nil {
		t.Fatalf("admin.New error: %v", adminErr)
	}
	views := &dashboardStubViews{output: "host-dashboard-shell"}

	if err := WithDefaultDashboardRenderer(
		adm,
		views,
		cfg,
		WithDashboardEmbeddedTemplates(false),
	); err != nil {
		t.Fatalf("WithDefaultDashboardRenderer error: %v", err)
	}

	renderer := getDashboardRenderer(adm)
	html, err := renderer.RenderPage("dashboard_ssr.html", admin.AdminDashboardPage{
		Chrome: admin.AdminChromeState{
			Title:    "Operations",
			BasePath: "/admin",
		},
	})
	if err != nil {
		t.Fatalf("RenderPage error: %v", err)
	}
	if html != "host-dashboard-shell" {
		t.Fatalf("expected shared view output, got %q", html)
	}
	if views.name != "dashboard_ssr" {
		t.Fatalf("expected dashboard template name, got %q", views.name)
	}
	data, ok := views.data.(map[string]any)
	if !ok || data["title"] != "Operations" || data["base_path"] != "/admin" {
		t.Fatalf("expected normalized shared view context, got %#v", views.data)
	}
}

func TestDefaultDashboardRendererHonorsHostShellOverlayAndRequestContext(t *testing.T) {
	hostTemplates := fstest.MapFS{
		"layout.html": {
			Data: []byte(`<!doctype html><html data-host-shell><head>{{ csrf_meta|safe }}<script src="{{ external_assets.echarts_js }}"></script></head><body data-collapse="{{ sidebar_collapse_placement }}">{% block content %}{% endblock %}</body></html>`),
		},
	}
	views, viewErr := NewViewEngine(
		client.FS(),
		WithViewTemplatesFS(hostTemplates),
		WithViewTemplateFuncs(DefaultTemplateFuncs(WithTemplateBasePath("/admin"))),
		WithViewReload(false),
	)
	if viewErr != nil {
		t.Fatalf("NewViewEngine error: %v", viewErr)
	}
	if err := views.Load(); err != nil {
		t.Fatalf("load view engine: %v", err)
	}
	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}
	adm, adminErr := admin.New(cfg, admin.Dependencies{})
	if adminErr != nil {
		t.Fatalf("admin.New error: %v", adminErr)
	}
	if err := WithDefaultDashboardRenderer(adm, views, cfg); err != nil {
		t.Fatalf("WithDefaultDashboardRenderer error: %v", err)
	}

	html, err := getDashboardRenderer(adm).RenderPage("dashboard_ssr.html", admin.AdminDashboardPage{
		Chrome: admin.AdminChromeState{
			Title:                    "Operations",
			BasePath:                 "/admin",
			AssetBasePath:            "/admin",
			ExternalAssets:           map[string]string{"echarts_js": "/host/echarts.js"},
			CSRFTemplateHelpers:      map[string]string{"csrf_meta": `<meta name="csrf-token" content="request-token">`},
			SidebarCollapsePlacement: admin.SidebarCollapsePlacementFooter,
		},
	})
	if err != nil {
		t.Fatalf("RenderPage error: %v", err)
	}
	for _, expected := range []string{
		`data-host-shell`,
		`<meta name="csrf-token" content="request-token">`,
		`src="/host/echarts.js"`,
		`data-collapse="footer"`,
		`data-widget-grid`,
	} {
		if !strings.Contains(html, expected) {
			t.Fatalf("expected shared dashboard shell to contain %q, got %q", expected, html)
		}
	}
}

func TestDashboardRenderersHonorThemeSelectedBreadcrumbPartial(t *testing.T) {
	hostTemplates := fstest.MapFS{
		"themes/acme/breadcrumbs.html": {
			Data: []byte(`<nav aria-label="Breadcrumb" data-host-breadcrumbs="dashboard">dashboard</nav>`),
		},
	}
	selection := admin.DefaultAdminStructuralPartials()
	selection.Breadcrumbs = "themes/acme/breadcrumbs.html"
	page := admin.AdminDashboardPage{
		Chrome: admin.AdminChromeState{
			Title:         "Operations",
			BasePath:      "/admin",
			AssetBasePath: "/admin",
			AdminPartials: selection,
			PageHeader: admin.AdminPageHeader{Breadcrumbs: []admin.AdminPageHeaderBreadcrumb{
				{Label: "Dashboard", Current: true},
			}},
		},
	}

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplatesFS(hostTemplates),
		WithViewBasePath("/admin"),
	)
	if err != nil {
		t.Fatalf("NewViewEngine: %v", err)
	}
	if loadErr := views.Load(); loadErr != nil {
		t.Fatalf("load views: %v", loadErr)
	}
	shared := &dashboardViewRenderer{views: views}
	standalone, err := newDashboardTemplateRenderer(WithDashboardTemplatesFS(hostTemplates))
	if err != nil {
		t.Fatalf("newDashboardTemplateRenderer: %v", err)
	}

	for name, renderer := range map[string]admin.DashboardRenderer{
		"shared view": shared,
		"standalone":  standalone,
	} {
		t.Run(name, func(t *testing.T) {
			html, err := renderer.RenderPage("dashboard_ssr.html", page)
			if err != nil {
				t.Fatalf("RenderPage: %v", err)
			}
			if !strings.Contains(html, `data-host-breadcrumbs="dashboard"`) ||
				strings.Count(html, `aria-label="Breadcrumb"`) != 1 {
				t.Fatalf("dashboard renderer did not use selected breadcrumb leaf: %q", html)
			}
		})
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
			Title:                        "Operations",
			BasePath:                     "/admin",
			Active:                       "/admin/dashboard",
			ExternalAssets:               map[string]string{"echarts_js": "/admin/assets/echarts.js"},
			CSRFTemplateHelpers:          map[string]string{"csrf_meta": `<meta name="csrf-token" content="request-token">`},
			SidebarHideSearch:            true,
			SidebarCollapsePlacement:     admin.SidebarCollapsePlacementFooter,
			SidebarCompactFooter:         true,
			SidebarHidePresence:          true,
			SidebarHideUserMenuIndicator: true,
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
	for key, expected := range map[string]any{
		"active":                           "/admin/dashboard",
		"sidebar_hide_search":              true,
		"sidebar_collapse_placement":       "footer",
		"sidebar_compact_footer":           true,
		"sidebar_hide_presence":            true,
		"sidebar_hide_user_menu_indicator": true,
		"csrf_meta":                        `<meta name="csrf-token" content="request-token">`,
	} {
		if ctx[key] != expected {
			t.Fatalf("expected %s=%#v, got %#v", key, expected, ctx[key])
		}
	}
	externalAssets, ok := ctx["external_assets"].(map[string]any)
	if !ok || externalAssets["echarts_js"] != "/admin/assets/echarts.js" {
		t.Fatalf("expected external assets to round-trip, got %#v", ctx["external_assets"])
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/admin/dashboard?locale=en", nil)
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
		if _, err := out[0].Write([]byte("stub")); err != nil {
			return "", err
		}
	}
	return "stub", nil
}

type dashboardStubViews struct {
	name   string
	data   any
	output string
}

func (v *dashboardStubViews) Load() error {
	return nil
}

func (v *dashboardStubViews) Render(out io.Writer, name string, data any, _ ...string) error {
	v.name = name
	v.data = data
	_, err := io.WriteString(out, v.output)
	return err
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
	renderer, ok := field.Interface().(admin.DashboardRenderer)
	if !ok {
		return nil
	}
	return renderer
}
