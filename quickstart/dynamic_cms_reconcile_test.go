package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-command/registry"
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
		if err := adm.RegisterModule(NewContentTypeBuilderModule(cfg, "")); err != nil {
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
				if _, err := adm.ContentTypeService().CreateContentType(ctx, item); err != nil {
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
