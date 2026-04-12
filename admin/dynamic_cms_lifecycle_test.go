package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin/routing"
	router "github.com/goliatone/go-router"
)

type lifecycleReconcilerModule struct {
	registerCount  atomic.Int32
	reconcileCount atomic.Int32
}

func (m *lifecycleReconcilerModule) Manifest() ModuleManifest {
	return ModuleManifest{ID: "lifecycle_reconciler"}
}

func (m *lifecycleReconcilerModule) Register(ModuleContext) error {
	m.registerCount.Add(1)
	return nil
}

func (m *lifecycleReconcilerModule) RouteContract() routing.ModuleContract {
	return routing.ModuleContract{
		Slug: "lifecycle_reconciler",
		UIRoutes: map[string]string{
			"lifecycle_reconciler.index": "/",
		},
	}
}

func (m *lifecycleReconcilerModule) reconcileDynamicCMS(context.Context, *Admin) error {
	m.reconcileCount.Add(1)
	return nil
}

func TestInitializeReconcilesDynamicCMSBeforeAliasRoutes(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{
		FeatureGate: featureGateFromKeys(FeatureCMS, FeatureCommands),
	})
	adm.UseCMS(NewNoopCMSContainer())
	if err := adm.RegisterModule(NewContentTypeBuilderModule()); err != nil {
		t.Fatalf("register content type builder module: %v", err)
	}

	adm.AddCMSBootstrapHook(func(ctx context.Context, adm *Admin) error {
		for _, item := range []CMSContentType{
			{
				Name:   "Page",
				Slug:   "page",
				Status: "active",
				Schema: map[string]any{
					"$schema":    "https://json-schema.org/draft/2020-12/schema",
					"type":       "object",
					"properties": map[string]any{"title": map[string]any{"type": "string"}},
				},
				Capabilities: map[string]any{"panel_slug": "pages"},
			},
			{
				Name:   "Quote",
				Slug:   "quote",
				Status: "active",
				Schema: map[string]any{
					"$schema":    "https://json-schema.org/draft/2020-12/schema",
					"type":       "object",
					"properties": map[string]any{"title": map[string]any{"type": "string"}},
				},
				Capabilities: map[string]any{"panel_slug": "quotes"},
			},
			{
				Name:   "News",
				Slug:   "news",
				Status: "active",
				Schema: map[string]any{
					"$schema":    "https://json-schema.org/draft/2020-12/schema",
					"type":       "object",
					"properties": map[string]any{"title": map[string]any{"type": "string"}},
				},
				Capabilities: map[string]any{"panel_slug": "news"},
			},
		} {
			if _, err := adm.ContentTypeService().CreateContentType(ctx, item); err != nil {
				return err
			}
		}
		return nil
	})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	for _, panelName := range []string{"pages", "quotes", "news"} {
		if panel, ok := adm.Registry().Panel(panelName); !ok || panel == nil {
			t.Fatalf("expected panel %q to be registered after initialize", panelName)
		}
	}

	for _, path := range []string{"/admin/quotes", "/admin/news"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		res := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(res, req)
		if res.Code != http.StatusFound {
			t.Fatalf("expected alias redirect for %s, got %d", path, res.Code)
		}
		if got := res.Header().Get("Location"); got != "/admin/content"+path[len("/admin"):] {
			t.Fatalf("unexpected alias target for %s: %q", path, got)
		}
	}

	for _, typeKey := range []string{"quote", "quotes", "news"} {
		panelName, panel, err := adm.resolveContentNavigationPanel(context.Background(), typeKey)
		if err != nil {
			t.Fatalf("resolve content navigation panel for %q: %v", typeKey, err)
		}
		if panel == nil || panelName == "" {
			t.Fatalf("expected content navigation panel for %q", typeKey)
		}
	}
}

func TestLifecycleSerializationPreventsInterleavingBootAndReconcile(t *testing.T) {
	adm := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	module := &lifecycleReconcilerModule{}
	if err := adm.RegisterModule(module); err != nil {
		t.Fatalf("register lifecycle module: %v", err)
	}

	var initHookCount atomic.Int32
	adm.AddInitHook(func(AdminRouter) error {
		initHookCount.Add(1)
		return nil
	})

	hookStarted := make(chan struct{})
	releaseHook := make(chan struct{})
	var once sync.Once
	adm.AddCMSBootstrapHook(func(context.Context, *Admin) error {
		once.Do(func() { close(hookStarted) })
		<-releaseHook
		return nil
	})

	initDone := make(chan error, 1)
	go func() {
		initDone <- adm.Initialize(nilRouter{})
	}()

	<-hookStarted

	bootDone := make(chan error, 1)
	go func() {
		bootDone <- adm.Boot()
	}()

	reconcileDone := make(chan error, 1)
	go func() {
		reconcileDone <- adm.ReconcileDynamicCMS(context.Background())
	}()

	select {
	case err := <-bootDone:
		t.Fatalf("boot should block behind initialize, got %v", err)
	case err := <-reconcileDone:
		t.Fatalf("reconcile should block behind initialize, got %v", err)
	case <-time.After(50 * time.Millisecond):
	}

	close(releaseHook)

	if err := <-initDone; err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if err := <-bootDone; err != nil {
		t.Fatalf("boot after initialize: %v", err)
	}
	if err := <-reconcileDone; err != nil {
		t.Fatalf("reconcile after initialize: %v", err)
	}

	if got := initHookCount.Load(); got != 1 {
		t.Fatalf("expected init hooks to run once, got %d", got)
	}
	if got := module.registerCount.Load(); got != 1 {
		t.Fatalf("expected module register to run once, got %d", got)
	}
	if got := module.reconcileCount.Load(); got < 2 {
		t.Fatalf("expected reconcile to run during initialize and explicit follow-up, got %d", got)
	}
}
