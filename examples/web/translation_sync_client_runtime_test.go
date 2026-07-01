package main

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	appcfg "github.com/goliatone/go-admin/examples/web/config"
	"github.com/goliatone/go-admin/pkg/client"
	syncdata "github.com/goliatone/go-admin/pkg/go-sync/data"
	"github.com/goliatone/go-admin/quickstart"
	router "github.com/goliatone/go-router"
)

func TestExampleTranslationEditorServesAdvertisedSyncClientRuntime(t *testing.T) {
	enabled := true
	adm, cfg := newExampleTranslationAdmin(t, quickstart.TranslationProfileFull, appcfg.TranslationConfig{
		Profile:  "full",
		Exchange: &enabled,
		Queue:    &enabled,
	})

	viewEngine, err := quickstart.NewViewEngine(
		client.FS(),
		quickstart.WithViewBasePath(cfg.BasePath),
		quickstart.WithViewURLResolver(adm.URLs()),
	)
	if err != nil {
		t.Fatalf("new view engine: %v", err)
	}

	server, r := quickstart.NewFiberServer(
		viewEngine,
		cfg,
		adm,
		true,
		quickstart.WithFiberLogger(false),
		quickstart.WithFiberAdapterConfig(func(adapterCfg *router.FiberAdapterConfig) {
			if adapterCfg == nil {
				return
			}
			adapterCfg.PathConflictMode = router.PathConflictModePreferStatic
		}),
	)
	host := quickstart.NewHostRouter(r, cfg)
	quickstart.RegisterSyncClientAssets(host.Static(), cfg, syncdata.ClientSyncCoreFS())
	if err := quickstart.RegisterAdminUIRoutes(
		host.AdminUI(),
		cfg,
		adm,
		nil,
		quickstart.WithUIDashboardRoute(false),
		quickstart.WithUITranslationDashboardRoute(true),
		quickstart.WithUITranslationExchangeRoute(true),
	); err != nil {
		t.Fatalf("register admin UI routes: %v", err)
	}
	host.PublicSite().Get("/*", func(c router.Context) error {
		c.Set("Content-Type", "text/html")
		return c.Status(http.StatusOK).SendString("<html>site fallback</html>")
	})

	server.Init()
	app := server.WrappedRouter()

	editorStatus, editorBody, _ := exampleRuntimeRequest(t, app, "/admin/translations/assignments/asg-1/edit?channel=staging")
	if editorStatus != http.StatusOK {
		t.Fatalf("expected editor shell 200, got %d body=%s", editorStatus, editorBody)
	}
	if !strings.Contains(editorBody, `data-sync-client-base-path="/admin/sync-client/sync-core"`) {
		t.Fatalf("expected editor shell to advertise sync-client base path, body=%s", editorBody)
	}

	runtimeStatus, runtimeBody, runtimeContentType := exampleRuntimeRequest(t, app, "/admin/sync-client/sync-core/index.js")
	if runtimeStatus != http.StatusOK {
		t.Fatalf("expected sync-core runtime 200, got %d body=%s", runtimeStatus, runtimeBody)
	}
	if strings.Contains(runtimeContentType, "text/html") {
		t.Fatalf("expected sync-core runtime to avoid fallback HTML content type, got %q", runtimeContentType)
	}
	if strings.Contains(runtimeBody, "site fallback") {
		t.Fatalf("expected sync-core runtime, got site fallback body=%s", runtimeBody)
	}
	if !strings.Contains(runtimeBody, "@goliatone/sync-core") {
		t.Fatalf("expected sync-core runtime marker, body=%s", runtimeBody)
	}
}

func exampleRuntimeRequest(t *testing.T, app *fiber.App, target string) (int, string, string) {
	t.Helper()

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, target, nil)
	req.Header.Set("Accept", "text/html")
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("GET %s failed: %v", target, err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read %s body: %v", target, err)
	}
	return resp.StatusCode, string(body), resp.Header.Get("Content-Type")
}
