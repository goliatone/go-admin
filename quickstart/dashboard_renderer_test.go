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
