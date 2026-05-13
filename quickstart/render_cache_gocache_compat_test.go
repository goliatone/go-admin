package quickstart_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	gocache "github.com/goliatone/go-cache"
	"github.com/goliatone/go-cache/stores/memory"

	"github.com/goliatone/go-admin/quickstart/site"
)

func TestGoCacheMemoryStoreSatisfiesSiteRenderCacheStore(t *testing.T) {
	var _ gocache.Cache[string, site.RenderedSiteResponse] = (*memory.Store[string, site.RenderedSiteResponse])(nil)
	var _ site.RenderCacheStore = (*memory.Store[string, site.RenderedSiteResponse])(nil)
	var _ site.RenderCacheTagInvalidator = (*memory.Store[string, site.RenderedSiteResponse])(nil)
	var _ site.RenderCachePrefixInvalidator = (*memory.Store[string, site.RenderedSiteResponse])(nil)

	store, err := memory.NewStore[string, site.RenderedSiteResponse]()
	if err != nil {
		t.Fatalf("new go-cache memory store: %v", err)
	}

	now := time.Now().UTC()
	value := site.RenderedSiteResponse{
		Status:      http.StatusOK,
		ContentType: "text/html; charset=utf-8",
		Headers:     map[string][]string{"ETag": {"site-render-1"}},
		Body:        []byte("<html>cached</html>"),
		CreatedAt:   now,
		FreshUntil:  now.Add(time.Minute),
		Tags:        []string{"site:render", "site:content:about"},
	}

	ctx := context.Background()
	if err := store.Set(ctx, "site-render:test", value, time.Minute); err != nil {
		t.Fatalf("set rendered response: %v", err)
	}
	if err := store.AddTagsForKey(ctx, "site-render:test", value.Tags); err != nil {
		t.Fatalf("add tags: %v", err)
	}

	got, hit, err := store.Get(ctx, "site-render:test")
	if err != nil {
		t.Fatalf("get rendered response: %v", err)
	}
	if !hit {
		t.Fatal("expected cache hit")
	}
	if got.Status != value.Status || got.ContentType != value.ContentType || string(got.Body) != string(value.Body) {
		t.Fatalf("unexpected rendered response: %+v", got)
	}

	if err := store.InvalidateTags(ctx, []string{"site:content:about"}); err != nil {
		t.Fatalf("invalidate tag: %v", err)
	}
	if _, hit, err := store.Get(ctx, "site-render:test"); err != nil {
		t.Fatalf("get after invalidate: %v", err)
	} else if hit {
		t.Fatal("expected tag invalidation to remove rendered response")
	}
}
