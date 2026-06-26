package quickstart

import (
	"bytes"
	"context"
	"io"
	"maps"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/pkg/client"
	dashboardcmp "github.com/goliatone/go-dashboard/components/dashboard"
	router "github.com/goliatone/go-router"
)

func TestContentTypesDashboardShellContract(t *testing.T) {
	shell, err := contentTypesDashboardShell().Normalize()
	if err != nil {
		t.Fatalf("normalize content types shell: %v", err)
	}
	if shell.SurfaceID != "content-types" {
		t.Fatalf("expected content-types surface, got %q", shell.SurfaceID)
	}
	if got := shell.Storage.StorageKey(shell.SurfaceID); got != "go-dashboard:shell:v1:content-types:viewer:anonymous" {
		t.Fatalf("unexpected storage key %q", got)
	}
	assertShellRegion(t, shell, "list", dashboardcmp.ShellRegionRoleNavigation, dashboardcmp.ShellRegionPlacementLeading, 240, 320, 420)
	assertShellRegion(t, shell, "builder", dashboardcmp.ShellRegionRoleMain, dashboardcmp.ShellRegionPlacementMain, 0, 0, 0)
	assertShellRegion(t, shell, "preview", dashboardcmp.ShellRegionRolePreview, dashboardcmp.ShellRegionPlacementTrailing, 320, 400, 720)
}

func TestBlockLibraryDashboardShellContract(t *testing.T) {
	shell, err := blockLibraryDashboardShell().Normalize()
	if err != nil {
		t.Fatalf("normalize block library shell: %v", err)
	}
	if shell.SurfaceID != "block-library" {
		t.Fatalf("expected block-library surface, got %q", shell.SurfaceID)
	}
	if got := shell.Storage.StorageKey(shell.SurfaceID); got != "go-dashboard:shell:v1:block-library:viewer:anonymous" {
		t.Fatalf("unexpected storage key %q", got)
	}
	assertShellRegion(t, shell, "list", dashboardcmp.ShellRegionRoleNavigation, dashboardcmp.ShellRegionPlacementLeading, 200, 240, 380)
	assertShellRegion(t, shell, "builder", dashboardcmp.ShellRegionRoleMain, dashboardcmp.ShellRegionPlacementMain, 0, 0, 0)
	assertShellRegion(t, shell, "palette", dashboardcmp.ShellRegionRolePalette, dashboardcmp.ShellRegionPlacementTrailing, 220, 260, 400)
}

func TestDashboardShellTemplateContextIncludesStorageKey(t *testing.T) {
	payload, err := dashboardShellTemplateContext(contentTypesDashboardShell())
	if err != nil {
		t.Fatalf("build shell template context: %v", err)
	}
	storage, ok := payload["storage"].(map[string]any)
	if !ok {
		t.Fatalf("expected storage payload, got %#v", payload["storage"])
	}
	if got := storage["key"]; got != "go-dashboard:shell:v1:content-types:viewer:anonymous" {
		t.Fatalf("unexpected storage key %v", got)
	}
}

func TestContentBuilderShellContextUsesConfiguredShellPrefix(t *testing.T) {
	h := newContentTypeBuilderHandlers(nil, admin.Config{}, nil, "", "")
	h.shellAssetsPrefix = normalizeContentBuilderShellAssetsPrefix("/charts/shell/")

	viewCtx := router.ViewContext{}
	h.addContentBuilderShellContext(viewCtx, "content-types")

	assertStringSlice(t, viewCtx["dashboard_shell_css"], []string{"/charts/shell/shell.css"})
	assertStringSlice(t, viewCtx["dashboard_shell_js"], []string{"/charts/shell/shell.js"})
}

func TestContentBuilderUIStaticAssetOptionsDerivesConfiguredShellPrefix(t *testing.T) {
	opts := contentTypeBuilderUIOptions{}
	WithContentTypeBuilderUIStaticAssetOptions(
		admin.Config{BasePath: "/admin"},
		WithDashboardShellPrefix("/ops/shell/"),
	)(&opts)

	if got := normalizeContentBuilderShellAssetsPrefix(opts.shellAssetsPrefix); got != "/ops/shell" {
		t.Fatalf("expected shell prefix from static asset options, got %q", got)
	}
}

func TestContentBuilderTemplatesUseSharedDashboardShellContract(t *testing.T) {
	files := []string{
		filepath.Join("..", "pkg", "client", "templates", "resources", "content-types", "editor.html"),
		filepath.Join("..", "pkg", "client", "templates", "resources", "block-definitions", "index.html"),
	}
	for _, file := range files {
		t.Run(filepath.Base(filepath.Dir(file))+"/"+filepath.Base(file), func(t *testing.T) {
			data, err := os.ReadFile(file)
			if err != nil {
				t.Fatalf("read template: %v", err)
			}
			html := string(data)
			if !strings.Contains(html, "data-dashboard-shell") {
				t.Fatalf("expected shared dashboard shell marker in %s", file)
			}
			if strings.Count(html, "shell.css") != 0 || strings.Count(html, "shell.js") != 0 {
				t.Fatalf("expected shell assets to be data-driven, not hardcoded in %s", file)
			}
			for _, retired := range []string{"data-content-modeling-shell", "data-pane-", "cm-shell", "cm-rail", "cm-splitter", "cm-icon-btn"} {
				if strings.Contains(html, retired) {
					t.Fatalf("template %s still contains retired shell marker %q", file, retired)
				}
			}
		})
	}
}

func TestContentBuilderTemplatesRenderSharedShellAssetsOnce(t *testing.T) {
	tests := []struct {
		name     string
		template string
		context  router.ViewContext
		surface  string
	}{
		{
			name:     "content-types",
			template: "resources/content-types/editor",
			surface:  "content-types",
			context: router.ViewContext{
				"title":                            "Admin",
				"base_path":                        "/admin",
				"api_base_path":                    "/admin/api/v1",
				"resource":                         "content_types",
				"content_types":                    []map[string]any{},
				"content_types_effective_channel":  "staging",
				"content_types_requested_channel":  "staging",
				"content_types_available_channels": []string{"default", "staging"},
			},
		},
		{
			name:     "block-library",
			template: "resources/block-definitions/index",
			surface:  "block-library",
			context: router.ViewContext{
				"title":                            "Admin",
				"base_path":                        "/admin",
				"api_base_path":                    "/admin/api/v1",
				"resource":                         "block_definitions",
				"block_definitions":                []map[string]any{},
				"block_library_effective_channel":  "staging",
				"block_library_requested_channel":  "staging",
				"block_library_available_channels": []string{"default", "staging"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := newContentTypeBuilderHandlers(nil, admin.Config{}, nil, "", "")
			h.shellAssetsPrefix = normalizeContentBuilderShellAssetsPrefix("/charts/shell")
			h.addContentBuilderShellContext(tt.context, tt.surface)

			html := renderContentBuilderTemplate(t, tt.template, tt.context)
			assertCount(t, html, `href="/charts/shell/shell.css"`, 1)
			assertCount(t, html, `src="/charts/shell/shell.js"`, 1)
			if !strings.Contains(html, "data-dashboard-shell") {
				t.Fatalf("expected rendered HTML to include shared shell root")
			}
			assertAbsent(t, html, "data-content-modeling-shell")
			assertAbsent(t, html, "data-pane-")
			assertAbsent(t, html, "content-modeling-shell")
		})
	}
}

func TestContentBuilderRegisteredRoutesRenderSharedShellAssetsOnce(t *testing.T) {
	server := newContentBuilderRouteTestServer(t, "/ops/shell")
	tests := []struct {
		name string
		path string
	}{
		{name: "content-types", path: "/admin/content/types"},
		{name: "block-library", path: "/admin/content/block-library"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			html := requestContentBuilderRoute(t, server, tt.path)
			assertCount(t, html, `href="/ops/shell/shell.css"`, 1)
			assertCount(t, html, `src="/ops/shell/shell.js"`, 1)
			assertDashboardShellRootCount(t, html, 1)
			assertStaticAssetServed(t, server, "/ops/shell/shell.css", "dashboard-shell")
			assertStaticAssetServed(t, server, "/ops/shell/shell.js", "DashboardShell")
			assertAbsent(t, html, `href="/dashboard/assets/shell/shell.css"`)
			assertAbsent(t, html, `src="/dashboard/assets/shell/shell.js"`)
			assertAbsent(t, html, "data-content-modeling-shell")
			assertAbsent(t, html, "data-pane-")
			assertAbsent(t, html, "content-modeling-shell")
		})
	}
}

func TestBlockLibraryTemplatePreservesChannelInModeLinks(t *testing.T) {
	h := newContentTypeBuilderHandlers(nil, admin.Config{}, nil, "", "")
	viewCtx := router.ViewContext{
		"title":                            "Admin",
		"base_path":                        "/admin",
		"api_base_path":                    "/admin/api/v1",
		"resource":                         "block_definitions",
		"block_definitions":                []map[string]any{},
		"block_library_effective_channel":  "staging",
		"block_library_requested_channel":  "staging",
		"block_library_available_channels": []string{"default", "staging"},
	}
	h.addContentBuilderShellContext(viewCtx, "block-library")

	html := renderContentBuilderTemplate(t, "resources/block-definitions/index", viewCtx)
	if !strings.Contains(html, `href="/admin/content/types?channel=staging"`) {
		t.Fatalf("expected Content Types mode link to preserve channel, got:\n%s", html)
	}
	if !strings.Contains(html, `href="/admin/content/block-library?channel=staging"`) {
		t.Fatalf("expected Block Library mode link to preserve channel, got:\n%s", html)
	}
}

type contentBuilderRouteAuthorizer struct{}

func (contentBuilderRouteAuthorizer) Can(context.Context, string, string) bool {
	return true
}

func newContentBuilderRouteTestServer(t *testing.T, shellPrefix string) router.Server[*fiber.App] {
	t.Helper()

	cfg := admin.Config{BasePath: "/admin", Title: "Admin", DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	adm.WithAuthorizer(contentBuilderRouteAuthorizer{})
	seedContentBuilderPanel(t, adm, "content_types", map[string]any{
		"name":   "Article",
		"slug":   "article",
		"status": "active",
	})
	seedContentBuilderPanel(t, adm, "block_definitions", map[string]any{
		"name":     "Hero",
		"slug":     "hero",
		"type":     "hero",
		"category": "content",
		"status":   "active",
	})

	views, err := NewViewEngine(client.FS(), WithViewBasePath("/admin"))
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}
	server, r := NewFiberServer(views, cfg, adm, false, WithFiberLogger(false))
	NewStaticAssets(r, cfg, client.Assets(), WithDashboardShellPrefix(shellPrefix))
	if err := RegisterContentTypeBuilderUIRoutes(
		r,
		cfg,
		adm,
		nil,
		WithContentTypeBuilderUIPermission("content-builder.read"),
		WithContentTypeBuilderUIStaticAssetOptions(cfg, WithDashboardShellPrefix(shellPrefix)),
	); err != nil {
		t.Fatalf("register content builder UI routes: %v", err)
	}
	return server
}

func seedContentBuilderPanel(t *testing.T, adm *admin.Admin, name string, record map[string]any) {
	t.Helper()
	repo := admin.NewMemoryRepository()
	if _, err := repo.Create(context.Background(), record); err != nil {
		t.Fatalf("seed %s panel: %v", name, err)
	}
	if _, err := adm.RegisterPanel(name, (&admin.PanelBuilder{}).WithRepository(repo)); err != nil {
		t.Fatalf("register %s panel: %v", name, err)
	}
}

func requestContentBuilderRoute(t *testing.T, server router.Server[*fiber.App], path string) string {
	t.Helper()
	resp, err := server.WrappedRouter().Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil), -1)
	if err != nil {
		t.Fatalf("request %s: %v", path, err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close %s response body: %v", path, closeErr)
		}
	}()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read %s response: %v", path, err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected %s status 200, got %d body=%s", path, resp.StatusCode, string(body))
	}
	return string(body)
}

func assertShellRegion(t *testing.T, shell dashboardcmp.Shell, id, role, placement string, min, def, max int) {
	t.Helper()
	for _, region := range shell.Regions {
		if region.ID != id {
			continue
		}
		if region.Role != role || region.Placement != placement {
			t.Fatalf("region %s expected role/place %s/%s, got %s/%s", id, role, placement, region.Role, region.Placement)
		}
		if min > 0 || def > 0 || max > 0 {
			if region.Sizing.Min != min || region.Sizing.Default != def || region.Sizing.Max != max {
				t.Fatalf("region %s expected sizing %d/%d/%d, got %+v", id, min, def, max, region.Sizing)
			}
		}
		return
	}
	t.Fatalf("missing region %s", id)
}

func renderContentBuilderTemplate(t *testing.T, name string, viewCtx router.ViewContext) string {
	t.Helper()
	views, err := NewViewEngine(client.FS(), WithViewBasePath("/admin"))
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}
	var buf bytes.Buffer
	binding := make(map[string]any, len(viewCtx))
	maps.Copy(binding, viewCtx)
	if err := views.Render(&buf, name, binding); err != nil {
		t.Fatalf("render %s: %v", name, err)
	}
	return buf.String()
}

func assertStringSlice(t *testing.T, got any, want []string) {
	t.Helper()
	values, ok := got.([]string)
	if !ok {
		t.Fatalf("expected []string, got %#v", got)
	}
	if len(values) != len(want) {
		t.Fatalf("expected %v, got %v", want, values)
	}
	for i := range want {
		if values[i] != want[i] {
			t.Fatalf("expected %v, got %v", want, values)
		}
	}
}

func assertCount(t *testing.T, html, needle string, want int) {
	t.Helper()
	if got := strings.Count(html, needle); got != want {
		t.Fatalf("expected %q count %d, got %d in rendered HTML prefix:\n%.1000s", needle, want, got, html)
	}
}

func assertDashboardShellRootCount(t *testing.T, html string, want int) {
	t.Helper()
	pattern := regexp.MustCompile(`(?:^|\s)data-dashboard-shell(?:\s|=|>)`)
	if got := len(pattern.FindAllStringIndex(html, -1)); got != want {
		t.Fatalf("expected data-dashboard-shell root count %d, got %d in rendered HTML prefix:\n%.1000s", want, got, html)
	}
}

func assertStaticAssetServed(t *testing.T, server router.Server[*fiber.App], path string, marker string) {
	t.Helper()
	resp, err := server.WrappedRouter().Test(httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, nil), -1)
	if err != nil {
		t.Fatalf("request static asset %s: %v", path, err)
	}
	defer func() {
		if closeErr := resp.Body.Close(); closeErr != nil {
			t.Fatalf("close static asset %s response body: %v", path, closeErr)
		}
	}()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read static asset %s response: %v", path, err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected static asset %s status 200, got %d body=%s", path, resp.StatusCode, string(body))
	}
	if marker != "" && !strings.Contains(string(body), marker) {
		t.Fatalf("expected static asset %s to contain %q, got prefix:\n%.1000s", path, marker, string(body))
	}
}

func assertAbsent(t *testing.T, html, needle string) {
	t.Helper()
	if strings.Contains(html, needle) {
		t.Fatalf("did not expect rendered HTML to contain %q", needle)
	}
}
