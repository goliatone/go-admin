package handlers

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
)

func TestNavUsesCMSMenuWhenEnabled(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	menuSvc := admin.NewInMemoryMenuService()
	err := menuSvc.AddMenuItem(ctx, setup.SiteNavigationMenuCode, admin.MenuItem{
		ID:       "site.home",
		Label:    "Home",
		Target:   map[string]any{"path": "/"},
		Position: 1,
	})
	if err != nil {
		t.Fatalf("add menu item: %v", err)
	}
	err = menuSvc.AddMenuItem(ctx, setup.SiteNavigationMenuCode, admin.MenuItem{
		ID:       "site.about",
		Label:    "About",
		Target:   map[string]any{"path": "/about"},
		Position: 2,
	})
	if err != nil {
		t.Fatalf("add menu item: %v", err)
	}

	nav := admin.NewNavigation(menuSvc, nil)
	nav.SetDefaultMenuCode(setup.SiteNavigationMenuCode)
	nav.UseCMS(true)

	h := NewSiteHandlers(SiteHandlersConfig{
		Nav:           nav,
		Pages:         &stubPageRepo{pages: []map[string]any{{"title": "Fallback", "path": "/fallback", "status": "published"}}},
		DefaultLocale: "en",
		MenuCode:      setup.SiteNavigationMenuCode,
		AdminBasePath: "/admin",
		AssetBasePath: "/admin",
		CMSEnabled:    true,
	})

	items := h.navItems(ctx, "en", "/about")
	if len(items) != 2 {
		t.Fatalf("expected 2 cms nav items, got %d", len(items))
	}
	if items[0].Label != "Home" || items[1].Label != "About" {
		t.Fatalf("unexpected nav labels: %+v", items)
	}
	if !items[1].Active {
		t.Fatalf("expected active item for /about, got %+v", items[1])
	}
}

func TestNavFallsBackWhenCMSDisabled(t *testing.T) {
	t.Helper()

	pageRepo := &stubPageRepo{pages: []map[string]any{
		{"title": "About", "path": "/about", "status": "published"},
		{"title": "Draft", "path": "/draft", "status": "draft"},
	}}
	h := NewSiteHandlers(SiteHandlersConfig{
		Pages:         pageRepo,
		DefaultLocale: "en",
		AdminBasePath: "/admin",
		AssetBasePath: "/admin",
		CMSEnabled:    false,
	})

	items := h.navItems(context.Background(), "en", "/about")
	if len(items) != 1 {
		t.Fatalf("expected fallback nav to include 1 published page, got %d", len(items))
	}
	if items[0].Label != "About" || items[0].Href != "/about" {
		t.Fatalf("unexpected fallback nav item: %+v", items[0])
	}
}

func TestResolvePageMatchesPath(t *testing.T) {
	t.Helper()

	pageRepo := &stubPageRepo{pages: []map[string]any{
		{"title": "About Us", "path": "/about", "status": "published", "updated_at": time.Now()},
	}}
	h := NewSiteHandlers(SiteHandlersConfig{
		Pages:         pageRepo,
		DefaultLocale: "en",
		AdminBasePath: "/admin",
	})

	page, err := h.resolvePage(context.Background(), "/about/", "en")
	if err != nil {
		t.Fatalf("resolve page: %v", err)
	}
	if page == nil || page.Title != "About Us" {
		t.Fatalf("unexpected page: %+v", page)
	}
	if pageRepo.lastListOpts.Filters == nil || pageRepo.lastListOpts.Filters["locale"] != "en" {
		t.Fatalf("expected locale filter to be applied, got %+v", pageRepo.lastListOpts.Filters)
	}
}

func TestResolvePostMatchesSlugAndPath(t *testing.T) {
	t.Helper()

	postRepo := &stubPostRepo{posts: []map[string]any{
		{"title": "Hello World", "slug": "hello-world", "path": "/posts/hello-world", "status": "published", "published_at": time.Now()},
	}}
	h := NewSiteHandlers(SiteHandlersConfig{
		Posts:         postRepo,
		DefaultLocale: "en",
		AdminBasePath: "/admin",
	})

	post, err := h.resolvePost(context.Background(), "/posts/hello-world", "en", "hello-world")
	if err != nil {
		t.Fatalf("resolve post: %v", err)
	}
	if post == nil || post.Title != "Hello World" {
		t.Fatalf("unexpected post: %+v", post)
	}
	if postRepo.lastListOpts.Filters == nil || postRepo.lastListOpts.Filters["locale"] != "en" {
		t.Fatalf("expected locale filter to be applied, got %+v", postRepo.lastListOpts.Filters)
	}
}

type stubPageRepo struct {
	pages        []map[string]any
	lastListOpts admin.ListOptions
}

func (s *stubPageRepo) Seed()                               {}
func (s *stubPageRepo) WithActivitySink(admin.ActivitySink) {}
func (s *stubPageRepo) List(_ context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.lastListOpts = opts
	out := make([]map[string]any, 0, len(s.pages))
	for _, p := range s.pages {
		out = append(out, cloneMap(p))
	}
	return out, len(out), nil
}
func (s *stubPageRepo) Get(context.Context, string) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPageRepo) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPageRepo) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPageRepo) Delete(context.Context, string) error { return admin.ErrNotFound }
func (s *stubPageRepo) Publish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPageRepo) Unpublish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}

type stubPostRepo struct {
	posts        []map[string]any
	lastListOpts admin.ListOptions
}

func (s *stubPostRepo) Seed()                               {}
func (s *stubPostRepo) WithActivitySink(admin.ActivitySink) {}
func (s *stubPostRepo) List(_ context.Context, opts admin.ListOptions) ([]map[string]any, int, error) {
	s.lastListOpts = opts
	out := make([]map[string]any, 0, len(s.posts))
	for _, p := range s.posts {
		out = append(out, cloneMap(p))
	}
	return out, len(out), nil
}
func (s *stubPostRepo) Get(context.Context, string) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Create(context.Context, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Delete(context.Context, string) error { return admin.ErrNotFound }
func (s *stubPostRepo) Publish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Unpublish(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Schedule(context.Context, []string, time.Time) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}
func (s *stubPostRepo) Archive(context.Context, []string) ([]map[string]any, error) {
	return nil, admin.ErrNotFound
}

func cloneMap(src map[string]any) map[string]any {
	if src == nil {
		return map[string]any{}
	}
	dst := make(map[string]any, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
