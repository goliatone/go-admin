package quickstart

import (
	"bytes"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

func TestFiberV3DashboardRendererParity(t *testing.T) {
	cfg := admin.Config{BasePath: "/admin", DefaultLocale: "en"}
	overlay := fstest.MapFS{"partials/breadcrumbs.html": {Data: []byte(`<nav data-v3-breadcrumbs>overlay</nav>`)}}
	var html [2]string
	for i, backend := range []string{"v2", "v3"} {
		adm, err := admin.New(cfg, admin.Dependencies{})
		if err != nil {
			t.Fatal(err)
		}
		var views router.Views
		opts := []ViewEngineOption{WithViewBasePath("/admin"), WithViewTemplatesFS(overlay), WithViewAdmin(adm), WithViewReload(false)}
		if backend == "v2" {
			views, err = NewViewEngine(client.Templates(), opts...)
		} else {
			views, err = NewFiberV3ViewEngine(client.Templates(), opts...)
		}
		if err != nil {
			t.Fatal(err)
		}
		if loadErr := views.Load(); loadErr != nil {
			t.Fatal(loadErr)
		}
		if backend == "v2" {
			err = WithDefaultDashboardRenderer(adm, views, cfg)
		} else {
			err = WithDefaultFiberV3DashboardRenderer(adm, views, cfg)
		}
		if err != nil {
			t.Fatal(err)
		}
		page := admin.AdminDashboardPage{Chrome: admin.AdminChromeState{Title: "Operations <unsafe>", PageHeader: admin.AdminPageHeader{Breadcrumbs: []admin.AdminPageHeaderBreadcrumb{{Label: "Dashboard", Current: true}}}, BasePath: "/admin", AssetBasePath: "/admin", CSRFTemplateHelpers: map[string]string{"csrf_meta": `<meta name="csrf-token" content="current-token">`}}}
		var out bytes.Buffer
		html[i], err = getDashboardRenderer(adm).RenderPage("dashboard_ssr.html", page, &out)
		if err != nil {
			t.Fatal(err)
		}
		if html[i] != out.String() {
			t.Fatal("writer differs")
		}
		for _, marker := range []string{"data-admin-shell", "data-admin-page-header", "data-widget-grid", "data-v3-breadcrumbs"} {
			if countRenderedHTMLAttribute(html[i], marker) != 1 {
				t.Fatalf("%s: expected one %s", backend, marker)
			}
		}
		if strings.Contains(html[i], "Operations <unsafe>") || !strings.Contains(html[i], "Operations &lt;unsafe&gt;") || !strings.Contains(html[i], `content="current-token"`) {
			t.Fatal("escaping/CSRF lost")
		}
	}
	if html[0] != html[1] {
		t.Fatal("dashboard HTML differs between native engines")
	}
}

func TestFiberV3DashboardRendererRegistration(t *testing.T) {
	cfg := admin.Config{}
	if err := WithDefaultFiberV3DashboardRenderer(nil, nil, cfg); err == nil {
		t.Fatal("missing admin accepted")
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatal(err)
	}
	if err := WithDefaultFiberV3DashboardRenderer(adm, nil, cfg, WithDashboardEmbeddedTemplates(false)); err == nil {
		t.Fatal("missing templates accepted")
	}
	if err := WithDefaultFiberV3DashboardRenderer(adm, nil, cfg); err != nil {
		t.Fatal(err)
	}
	original := getDashboardRenderer(adm)
	if err := WithDefaultFiberV3DashboardRenderer(adm, nil, cfg, WithDashboardEmbeddedTemplates(false)); err != nil {
		t.Fatal(err)
	}
	if original != getDashboardRenderer(adm) {
		t.Fatal("existing renderer replaced")
	}
}
