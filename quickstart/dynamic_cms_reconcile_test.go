package quickstart

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/registry"
	router "github.com/goliatone/go-router"
)

func TestRegisterContentEntryUIRoutesUsesReconciledDynamicPanels(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := NewAdminConfig("/admin", "Admin", "en")
		cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

		adm, _, err := NewAdmin(
			cfg,
			AdapterHooks{},
			WithFeatureDefaults(map[string]bool{
				string(admin.FeatureCMS):      true,
				string(admin.FeatureCommands): true,
			}),
		)
		if err != nil {
			t.Fatalf("NewAdmin: %v", err)
		}
		defer adm.Commands().Reset()
		adm.UseCMS(admin.NewNoopCMSContainer())
		if err = adm.RegisterModule(NewContentTypeBuilderModule(cfg, "")); err != nil {
			t.Fatalf("register content type builder module: %v", err)
		}

		adm.AddCMSBootstrapHook(func(ctx context.Context, adm *admin.Admin) error {
			for _, item := range []admin.CMSContentType{
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
				if _, err = adm.ContentTypeService().CreateContentType(ctx, item); err != nil {
					return err
				}
			}
			return nil
		})

		if err := adm.Initialize(newContentEntryRouteCaptureRouter()); err != nil {
			t.Fatalf("initialize: %v", err)
		}

		capture := newContentEntryRouteCaptureRouter()
		if err := RegisterContentEntryUIRoutes(capture, cfg, adm, nil); err != nil {
			t.Fatalf("RegisterContentEntryUIRoutes: %v", err)
		}

		for _, path := range []string{"/admin/quotes", "/admin/news"} {
			if !capture.paths[path] {
				t.Fatalf("expected canonical route %q to be registered, got %v", path, sortedRoutePaths(capture.paths))
			}
		}
	})
}

func TestRegisterContentEntryUIRoutesSkipsCanonicalPanelsOwnedByAdminAliases(t *testing.T) {
	registry.WithTestRegistry(func() {
		cfg := NewAdminConfig("/admin", "Admin", "en")
		cfg.AuthConfig = &admin.AuthConfig{AllowUnauthenticatedRoutes: true}

		adm, _, err := NewAdmin(
			cfg,
			AdapterHooks{},
			WithFeatureDefaults(map[string]bool{
				string(admin.FeatureCMS):      true,
				string(admin.FeatureCommands): true,
			}),
		)
		if err != nil {
			t.Fatalf("NewAdmin: %v", err)
		}
		defer adm.Commands().Reset()
		adm.UseCMS(admin.NewNoopCMSContainer())
		if registerErr := adm.RegisterModule(NewContentTypeBuilderModule(cfg, "")); registerErr != nil {
			t.Fatalf("register content type builder module: %v", registerErr)
		}

		adm.AddCMSBootstrapHook(func(ctx context.Context, adm *admin.Admin) error {
			for _, item := range []admin.CMSContentType{
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
				if _, createErr := adm.ContentTypeService().CreateContentType(ctx, item); createErr != nil {
					return createErr
				}
			}
			return nil
		})

		server, rt := NewFiberServer(nil, cfg, adm, false, WithFiberLogger(false))
		if err = adm.Initialize(rt); err != nil {
			t.Fatalf("initialize: %v", err)
		}
		defer func() {
			if recovered := recover(); recovered != nil {
				t.Fatalf("RegisterContentEntryUIRoutes panicked: %v", recovered)
			}
		}()
		if err = RegisterContentEntryUIRoutes(rt, cfg, adm, nil); err != nil {
			t.Fatalf("RegisterContentEntryUIRoutes: %v", err)
		}

		if !hasRoute(rt.Routes(), router.GET, "/admin/content/:name") {
			t.Fatalf("expected generic content entry route to remain registered")
		}

		res, err := server.WrappedRouter().Test(httptest.NewRequest(http.MethodGet, "/admin/news", nil), -1)
		if err != nil {
			t.Fatalf("news alias request: %v", err)
		}
		if res.StatusCode != http.StatusFound {
			t.Fatalf("expected alias redirect status %d, got %d", http.StatusFound, res.StatusCode)
		}
		if got := res.Header.Get("Location"); got != "/admin/content/news" {
			t.Fatalf("expected alias redirect to /admin/content/news, got %q", got)
		}
	})
}
