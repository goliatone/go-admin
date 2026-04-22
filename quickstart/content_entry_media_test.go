package quickstart

import (
	"context"
	"net/url"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	fggate "github.com/goliatone/go-featuregate/gate"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type contentEntryStaticFeatureGate map[string]bool

func (g contentEntryStaticFeatureGate) Enabled(_ context.Context, key string, _ ...fggate.ResolveOption) (bool, error) {
	return g[key], nil
}

func TestRenderFormEnrichesContentEntryMediaSchemaHints(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate: contentEntryStaticFeatureGate{string(admin.FeatureMedia): true},
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.MatchedBy(func(arg any) bool {
		viewCtx, ok := arg.(router.ViewContext)
		if !ok {
			return false
		}
		html := strings.TrimSpace(anyToString(viewCtx["form_html"]))
		return strings.Contains(html, `data-component="media_picker"`) &&
			strings.Contains(html, `/admin/api/media/library`) &&
			strings.Contains(html, `capabilitiesEndpoint`) &&
			strings.Contains(html, `multiple`)
	})).Return(nil).Once()

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}

	err = handler.renderForm(
		ctx,
		"pages",
		nil,
		&admin.CMSContentType{
			Name: "Page",
			Slug: "page",
			Schema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"gallery": map[string]any{
						"type": "array",
						"items": map[string]any{
							"type": "string",
						},
						"x-formgen": map[string]any{
							"widget": "media-picker",
							"componentOptions": map[string]any{
								"multiple": true,
							},
						},
					},
				},
			},
		},
		admin.AdminContext{Context: context.Background()},
		map[string]any{},
		nil,
		false,
		"",
	)
	if err != nil {
		t.Fatalf("render form: %v", err)
	}
	ctx.AssertExpectations(t)
}

func TestRenderFormMediaHintsDoNotMutateStoredContentTypeSchema(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		FeatureGate: contentEntryStaticFeatureGate{string(admin.FeatureMedia): true},
	})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	validator, err := admin.NewFormgenSchemaValidatorWithAPIBase("/admin", "/admin/api")
	if err != nil {
		t.Fatalf("validator init failed: %v", err)
	}
	contentType := &admin.CMSContentType{
		Name: "Page",
		Slug: "page",
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"gallery": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "string",
					},
					"x-formgen": map[string]any{
						"component.config": map[string]any{
							"variant":   "media-picker",
							"multiple":  true,
							"valueMode": "url",
						},
					},
				},
			},
		},
	}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Render", "resources/content/form", mock.Anything).Return(nil).Once()

	handler := &contentEntryHandlers{
		admin:        adm,
		cfg:          cfg,
		formTemplate: "resources/content/form",
		formRenderer: validator,
		templateExists: func(name string) bool {
			return name == "resources/content/form"
		},
	}

	if err := handler.renderForm(ctx, "pages", nil, contentType, admin.AdminContext{Context: context.Background()}, map[string]any{}, nil, false, ""); err != nil {
		t.Fatalf("render form: %v", err)
	}
	prop := contentType.Schema["properties"].(map[string]any)["gallery"].(map[string]any)
	if _, ok := prop["x-admin"]; ok {
		t.Fatalf("did not expect render-time media hints to mutate stored schema: %+v", prop)
	}
	formgen := prop["x-formgen"].(map[string]any)
	config := formgen["component.config"].(map[string]any)
	if _, ok := config["libraryPath"]; ok {
		t.Fatalf("did not expect endpoint hints in stored component.config: %+v", config)
	}
	ctx.AssertExpectations(t)
}

func TestContentEntryRoutesPersistAndReopenMediaPickerValues(t *testing.T) {
	cfg := admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
	}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	repo := admin.NewMemoryRepository()
	if _, err := adm.RegisterPanel("pages", (&admin.PanelBuilder{}).
		WithRepository(repo).
		FormSchema(map[string]any{
			"type": "object",
			"properties": map[string]any{
				"hero": map[string]any{
					"type": "string",
					"x-formgen": map[string]any{
						"widget": "media-picker",
					},
				},
				"gallery": map[string]any{
					"type": "array",
					"items": map[string]any{
						"type": "string",
					},
					"x-formgen": map[string]any{
						"widget": "media-picker",
						"componentOptions": map[string]any{
							"multiple": true,
						},
					},
				},
			},
		})); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	h := &contentEntryHandlers{admin: adm, cfg: cfg}
	createCtx := router.NewMockContext()
	createCtx.ParamsM["name"] = "pages"
	createCtx.HeadersM["Content-Type"] = "application/x-www-form-urlencoded"
	createCtx.On("Context").Return(context.Background())
	createCtx.On("Body").Return([]byte(url.Values{
		"hero":      []string{"/media/hero.jpg"},
		"gallery[]": []string{"/media/1.jpg", "/media/2.jpg"},
	}.Encode()))
	createCtx.On("Redirect", mock.Anything).Return(nil).Once()
	if err := h.createForPanel(createCtx, ""); err != nil {
		t.Fatalf("create content: %v", err)
	}

	created, err := repo.Get(context.Background(), "1")
	if err != nil {
		t.Fatalf("get created record: %v", err)
	}
	if got := created["hero"]; got != "/media/hero.jpg" {
		t.Fatalf("expected hero media value, got %#v", got)
	}
	gallery, ok := created["gallery"].([]any)
	if !ok || len(gallery) != 2 || gallery[0] != "/media/1.jpg" || gallery[1] != "/media/2.jpg" {
		t.Fatalf("expected ordered gallery array, got %#v", created["gallery"])
	}

	updateCtx := router.NewMockContext()
	updateCtx.ParamsM["name"] = "pages"
	updateCtx.ParamsM["id"] = "1"
	updateCtx.HeadersM["Content-Type"] = "application/x-www-form-urlencoded"
	updateCtx.On("Context").Return(context.Background())
	updateCtx.On("Body").Return([]byte(url.Values{
		"hero":      []string{"media-id-1"},
		"gallery[]": []string{"media-id-2"},
	}.Encode()))
	updateCtx.On("Redirect", mock.Anything).Return(nil).Once()
	if err := h.updateForPanel(updateCtx, ""); err != nil {
		t.Fatalf("update content: %v", err)
	}

	updated, err := repo.Get(context.Background(), "1")
	if err != nil {
		t.Fatalf("get updated record: %v", err)
	}
	if got := updated["hero"]; got != "media-id-1" {
		t.Fatalf("expected updated hero media value, got %#v", got)
	}
	updatedGallery, ok := updated["gallery"].([]any)
	if !ok || len(updatedGallery) != 1 || updatedGallery[0] != "media-id-2" {
		t.Fatalf("expected updated one-item gallery array, got %#v", updated["gallery"])
	}
	reopened := contentEntryValues(updated)
	if reopenedGallery, ok := reopened["gallery"].([]any); !ok || len(reopenedGallery) != 1 || reopenedGallery[0] != "media-id-2" {
		t.Fatalf("expected reopened gallery values to hydrate as array, got %#v", reopened["gallery"])
	}
}
