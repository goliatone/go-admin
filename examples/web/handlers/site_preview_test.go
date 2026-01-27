package handlers

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type previewPageRepo struct {
	draft map[string]any
}

func (p *previewPageRepo) Seed()                               {}
func (p *previewPageRepo) WithActivitySink(admin.ActivitySink) {}
func (p *previewPageRepo) List(_ context.Context, _ admin.ListOptions) ([]map[string]any, int, error) {
	return []map[string]any{}, 0, nil
}
func (p *previewPageRepo) Get(_ context.Context, id string) (map[string]any, error) {
	if p.draft != nil && p.draft["id"] == id {
		return cloneMap(p.draft), nil
	}
	return nil, admin.ErrNotFound
}
func (p *previewPageRepo) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (p *previewPageRepo) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (p *previewPageRepo) Delete(context.Context, string) error { return admin.ErrNotFound }
func (p *previewPageRepo) Publish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (p *previewPageRepo) Unpublish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}

func TestSiteHandlersPagePreviewTokenBypassesPublishFilter(t *testing.T) {
	adm, err := admin.New(admin.Config{DefaultLocale: "en", PreviewSecret: "secret"}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin init: %v", err)
	}
	token, err := adm.Preview().Generate("pages", "page-1", 0)
	if err != nil {
		t.Fatalf("preview token: %v", err)
	}

	repo := &previewPageRepo{
		draft: map[string]any{
			"id":     "page-1",
			"title":  "Draft Page",
			"path":   "/draft",
			"status": "draft",
		},
	}

	h := NewSiteHandlers(SiteHandlersConfig{
		Admin:         adm,
		Pages:         repo,
		DefaultLocale: "en",
		AdminBasePath: "/admin",
		AssetBasePath: "/admin",
		CMSEnabled:    false,
	})

	ctx := router.NewMockContext()
	ctx.On("Context").Return(context.Background())
	ctx.On("Path").Return("/draft")
	ctx.QueriesM["preview_token"] = token
	ctx.On("Render", "site/page", mock.Anything).Run(func(args mock.Arguments) {
		viewCtx := args.Get(1).(router.ViewContext)
		if preview, ok := viewCtx["is_preview"].(bool); !ok || !preview {
			t.Fatalf("expected preview flag set, got %v", viewCtx["is_preview"])
		}
		if page, ok := viewCtx["page"].(*sitePage); !ok || page.Title != "Draft Page" {
			t.Fatalf("expected draft page in view context, got %+v", viewCtx["page"])
		}
	}).Return(nil)

	if err := h.Page(ctx); err != nil {
		t.Fatalf("page handler: %v", err)
	}
}
