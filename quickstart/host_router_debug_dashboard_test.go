package quickstart

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	client "github.com/goliatone/go-admin/pkg/client"
	router "github.com/goliatone/go-router"
)

func TestDashboardEnabledHostKeepsAdminDebugConsoleRoute(t *testing.T) {
	resetCommandRegistryForTest(t)
	t.Cleanup(func() { resetCommandRegistryForTest(t) })
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{
			Enabled:    true,
			LayoutMode: admin.DebugLayoutAdmin,
			AllowedIPs: []string{"0.0.0.0", "127.0.0.1", "::1"},
			Panels:     []string{admin.DebugPanelRequests},
		}),
	)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithMinimalFeatures())
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	views, err := NewViewEngine(client.FS(), WithViewBasePath(cfg.BasePath))
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}
	server, rt := NewFiberServer(views, cfg, adm, false, WithFiberLogger(false))
	if err := adm.Initialize(rt); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	adminPage := readDebugConsoleResponse(t, server, "/admin/debug")
	if !strings.Contains(adminPage, `title="Debug Console"`) || !strings.Contains(adminPage, "debug_layout=standalone") {
		t.Fatalf("expected admin-framed Debug Console iframe, body=%s", adminPage)
	}
	if strings.Contains(adminPage, "data-widget-grid") {
		t.Fatalf("admin debug mode rendered dashboard widgets, body=%s", adminPage)
	}

	consolePage := readDebugConsoleResponse(t, server, "/admin/debug?debug_layout=standalone")
	if !strings.Contains(consolePage, "data-debug-console") || !strings.Contains(consolePage, "/admin/assets/dist/debug/index.js") {
		t.Fatalf("expected standalone Debug Console and assets, body=%s", consolePage)
	}
	if strings.Contains(consolePage, "data-widget-grid") {
		t.Fatalf("standalone debug console rendered dashboard widgets, body=%s", consolePage)
	}
}

func TestHostAdminRouterKeepsDebugDashboardAssetsOnStaticSurface(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: true, LayoutMode: admin.DebugLayoutDashboard}),
	)
	cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

	adm, _, err := NewAdmin(cfg, AdapterHooks{}, WithMinimalFeatures())
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(allowAllQuickstartAuthorizer{})
	if err := adm.RegisterModule(NewDebugModule(cfg.Debug)); err != nil {
		t.Fatalf("register debug module: %v", err)
	}

	server := router.NewFiberAdapterWithConfig(router.FiberAdapterConfig{
		PathConflictMode: router.PathConflictModePreferStatic,
		StrictRoutes:     true,
	})
	host := NewHostRouter(server.Router(), cfg)
	provider, ok := host.Admin().(admin.DashboardAssetOwnershipProvider)
	if !ok || !provider.DashboardAssetsManagedExternally() {
		t.Fatalf("expected host admin router to advertise host-managed dashboard assets")
	}

	NewStaticAssets(host.Static(), cfg, fstest.MapFS{
		"app.js": {Data: []byte("assets")},
	})
	if err := adm.Initialize(host.Admin()); err != nil {
		t.Fatalf("initialize through validated admin surface: %v", err)
	}
	server.Init()

	for _, route := range server.Router().Routes() {
		if strings.HasPrefix(route.Path, "/admin/dashboard/assets/") {
			t.Fatalf("dashboard asset route escaped onto admin surface: %s %s", route.Method, route.Path)
		}
	}

	assertDashboardAssetResponse(t, server, "/dashboard/assets/echarts/echarts.min.js")
	assertDashboardAssetResponse(t, server, "/dashboard/assets/shell/shell.css")
}

func assertDashboardAssetResponse(t *testing.T, server router.Server[*fiber.App], target string) {
	t.Helper()
	resp, err := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, target, nil))
	if err != nil {
		t.Fatalf("request %s: %v", target, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected %s to return 200, got %d", target, resp.StatusCode)
	}
}

func readDebugConsoleResponse(t *testing.T, server router.Server[*fiber.App], target string) string {
	t.Helper()
	resp, err := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, target, nil), 10_000)
	if err != nil {
		t.Fatalf("request %s: %v", target, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read %s: %v", target, err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected %s to return 200, got %d body=%s", target, resp.StatusCode, body)
	}
	return string(body)
}
