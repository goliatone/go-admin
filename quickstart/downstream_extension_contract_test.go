package quickstart

import (
	"bytes"
	"context"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
	client "github.com/goliatone/go-admin/pkg/client"
	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
)

func TestDownstreamExtensionComposesCanonicalShellAssetsAndDashboard(t *testing.T) {
	componentCSS, err := fs.ReadFile(client.Assets(), "src/styles/components.css")
	if err != nil {
		t.Fatalf("read canonical component CSS: %v", err)
	}
	modalModule, err := fs.ReadFile(client.Assets(), "dist/components/modal.js")
	if err != nil {
		t.Fatalf("read embedded modal module: %v", err)
	}

	hostTemplates := fstest.MapFS{
		"downstream/reports.html": {Data: []byte(`{% extends "layout.html" %}
{% block head_extra %}
<link rel="stylesheet" href="{{ asset_base_path }}/assets/vendor/go-admin-client/components.css" data-public-components>
<link rel="stylesheet" href="{{ asset_base_path }}/assets/dist/product/product.css" data-product-styles>
{% endblock %}
{% block content %}<section data-downstream-page><div class="go-admin-modal__surface">Reports</div></section>{% endblock %}
{% block scripts %}<script type="module">import { Modal } from '{{ asset_base_path }}/assets/vendor/go-admin-client/components/modal.js'; void Modal;</script>{% endblock %}`)},
		"themes/product/footer.html":             {Data: []byte(`<footer data-product-footer>Product footer</footer>`)},
		"dashboard/widgets/product/summary.html": {Data: []byte(`<div data-product-widget>{{ widget.data.label }}</div>`)},
	}
	if _, statErr := fs.Stat(hostTemplates, "layout.html"); statErr == nil {
		t.Fatal("downstream fixture must extend, not copy, the canonical shell")
	}

	views, err := NewViewEngine(
		client.Templates(),
		WithViewTemplatesFS(hostTemplates),
		WithViewBasePath("/admin"),
	)
	if err != nil {
		t.Fatalf("create shared view engine: %v", err)
	}
	if loadErr := views.Load(); loadErr != nil {
		t.Fatalf("load shared view engine: %v", loadErr)
	}

	partials := admin.DefaultAdminStructuralPartials()
	partials.Footer = "themes/product/footer.html"
	theme := map[string]map[string]string{"selection": {"variant": "dark"}}
	csrf := `<meta name="csrf-token" content="fixture-token">`
	viewBuilder := func(view router.ViewContext, _ string, _ router.Context) router.ViewContext {
		view["base_path"] = "/admin"
		view["asset_base_path"] = "/admin"
		view["nav_items"] = []any{}
		view["nav_utility_items"] = []any{}
		view["session_user"] = map[string]any{"id": "fixture-user"}
		view["theme"] = theme
		view["csrf_meta"] = csrf
		view["admin_partials"] = partials.TemplateContext()
		return view
	}
	extensionContext, err := buildAdminPageViewContext(nil, nil, AdminPageSpec{
		Title:  "Legacy Reports",
		Active: "reports",
		Chrome: admin.AdminPageChrome{
			Header: admin.AdminPageHeader{Title: "Typed Reports"},
			Active: "reports",
		},
	}, viewBuilder, "reports")
	if err != nil {
		t.Fatalf("build typed downstream view context: %v", err)
	}
	serializedExtensionContext, err := router.SerializeAsContext(extensionContext)
	if err != nil {
		t.Fatalf("serialize typed downstream view context: %v", err)
	}
	var extensionHTML bytes.Buffer
	if renderErr := views.Render(&extensionHTML, "downstream/reports", serializedExtensionContext); renderErr != nil {
		t.Fatalf("render downstream extension: %v", renderErr)
	}

	dashboardRenderer := &dashboardViewRenderer{views: views}
	dashboardHTML, err := dashboardRenderer.RenderPage("dashboard_ssr.html", admin.AdminDashboardPage{
		Dashboard: dashcmp.Page{Areas: []dashcmp.PageArea{{
			Slot: "main", Code: "admin.dashboard.main", Widgets: []dashcmp.WidgetFrame{{
				ID: "product-summary", Definition: "product.widget.summary", Name: "Summary",
				Template: "dashboard/widgets/product/summary.html", Area: "admin.dashboard.main", Span: 6,
				Data: map[string]any{"label": "Typed payload"},
			}},
		}}},
		Chrome: admin.AdminChromeState{
			Page: admin.AdminPageChrome{
				Header: admin.AdminPageHeader{Title: "Typed Dashboard"},
				Active: "dashboard",
			},
			BasePath:            "/admin",
			AssetBasePath:       "/admin",
			Theme:               theme,
			CSRFTemplateHelpers: map[string]string{"csrf_meta": csrf},
			AdminPartials:       partials,
		},
	})
	if err != nil {
		t.Fatalf("render dashboard through shared view engine: %v", err)
	}

	for name, html := range map[string]string{
		"extension": extensionHTML.String(),
		"dashboard": dashboardHTML,
	} {
		for _, expected := range []string{
			`data-admin-shell`, `data-theme="dark"`, `data-product-footer`, csrf,
		} {
			if !strings.Contains(html, expected) {
				t.Errorf("%s page is missing shared shell context %q: %s", name, expected, html)
			}
		}
		if strings.Count(strings.ToLower(html), "<!doctype html>") != 1 {
			t.Errorf("%s page must have exactly one document owner", name)
		}
	}
	for _, expected := range []string{
		`>Typed Reports</h1>`, `data-public-components`, `data-product-styles`,
		`import { Modal }`, `data-downstream-page`,
	} {
		if !strings.Contains(extensionHTML.String(), expected) {
			t.Errorf("downstream extension is missing %q: %s", expected, extensionHTML.String())
		}
	}
	for _, expected := range []string{`>Typed Dashboard</h1>`, `data-widget-grid`, `data-product-widget`, `Typed payload`} {
		if !strings.Contains(dashboardHTML, expected) {
			t.Errorf("dashboard is missing typed/package-owned contract %q: %s", expected, dashboardHTML)
		}
	}

	extraAssets := fstest.MapFS{
		"vendor/go-admin-client/components.css":      {Data: componentCSS},
		"vendor/go-admin-client/components/modal.js": {Data: modalModule},
		"dist/product/product.css":                   {Data: []byte(`.product-report{display:block}`)},
	}
	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	NewStaticAssets(server.Router(), admin.Config{BasePath: "/admin"}, client.Assets(), WithExtraAssetsFS(extraAssets))
	server.Init()
	for _, target := range []string{
		"/admin/assets/vendor/go-admin-client/components.css",
		"/admin/assets/vendor/go-admin-client/components/modal.js",
		"/admin/assets/dist/product/product.css",
	} {
		request := httptest.NewRequestWithContext(context.Background(), http.MethodGet, target, nil)
		response, err := server.WrappedRouter().Test(request)
		if err != nil {
			t.Fatalf("request downstream asset %s: %v", target, err)
		}
		closeResponseBody(t, response)
		if response.StatusCode != http.StatusOK {
			t.Errorf("downstream asset %s returned %d", target, response.StatusCode)
		}
	}
}
