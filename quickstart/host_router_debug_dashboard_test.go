package quickstart

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
)

func TestHostAdminRouterKeepsDebugDashboardAssetsOnStaticSurface(t *testing.T) {
	cfg := NewAdminConfig(
		"/admin",
		"Admin",
		"en",
		WithDebugConfig(admin.DebugConfig{Enabled: true}),
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
