package main

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/stretchr/testify/require"
)

func TestCMSRepositoriesExposeVirtualFieldsAndScopes(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ToLower(t.Name()))

	cmsOpts, err := setup.SetupPersistentCMS(ctx, "en", dsn)
	require.NoError(t, err, "setup persistent cms")
	if cmsOpts.Container == nil {
		t.Fatalf("expected CMS container")
	}
	contentSvc := cmsOpts.Container.ContentService()

	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err, "setup content database")

	postStore := stores.NewCMSPostStore(contentSvc, "en")
	mediaStore, err := stores.NewMediaStore(db)
	require.NoError(t, err, "media store")

	pageRepo := stores.NewPageRecordRepository(db)
	postRepo := stores.NewPostRecordRepository(db)

	pageAdapter := admin.NewBunRepositoryAdapter[*stores.PageRecord](
		pageRepo,
		admin.WithBunSearchColumns[*stores.PageRecord]("title", "slug", "path", "meta_title", "meta_description"),
	)
	postAdapter := admin.NewBunRepositoryAdapter[*stores.PostRecord](
		postRepo,
		admin.WithBunSearchColumns[*stores.PostRecord]("title", "slug", "category", "meta_title", "meta_description", "tags", "path"),
	)

	pageResults, totalPages, err := pageAdapter.List(ctx, admin.ListOptions{Search: "home"})
	require.NoError(t, err, "search pages by virtual meta title")
	require.GreaterOrEqual(t, totalPages, 1)
	require.NotEmpty(t, pageResults)
	require.NotEmpty(t, pageResults[0]["meta_title"])
	require.NotEmpty(t, pageResults[0]["path"])

	postPayload := map[string]any{
		"title":            "Scoped Story",
		"slug":             "contract-post",
		"status":           "draft",
		"locale":           "en",
		"path":             "/posts/contract-post",
		"meta_title":       "VirtualScopeMeta",
		"meta_description": "MetaSearchAttr",
		"tags":             []string{"repo", "virtual", "contractsuite"},
	}
	createdPost, err := postStore.Create(ctx, postPayload)
	require.NoError(t, err, "create post via cms store")
	postID := fmt.Sprint(createdPost["id"])
	require.NotEmpty(t, postID)

	postResults, postTotal, err := postAdapter.List(ctx, admin.ListOptions{
		Search: "VirtualScopeMeta",
		Filters: map[string]any{
			"status": "draft",
		},
	})
	require.NoError(t, err, "list posts by virtual meta field")
	require.Equal(t, 1, postTotal)
	require.NotEmpty(t, postResults)
	require.Equal(t, "contract-post", fmt.Sprint(postResults[0]["slug"]))

	tagResults, tagTotal, err := postAdapter.List(ctx, admin.ListOptions{Search: "contractsuite"})
	require.NoError(t, err, "search posts by tags virtual column")
	require.Equal(t, 1, tagTotal)
	require.NotEmpty(t, tagResults)
	require.Equal(t, "contract-post", fmt.Sprint(tagResults[0]["slug"]))

	crossResults, crossTotal, err := postAdapter.List(ctx, admin.ListOptions{Search: "contract-page"})
	require.NoError(t, err, "verify post scope excludes pages")
	require.Equal(t, 0, crossTotal, "page slug should not bleed into post scope")
	require.Len(t, crossResults, 0)

	updatedPost, err := postStore.Update(ctx, postID, map[string]any{"status": "scheduled"})
	require.NoError(t, err, "update post status")
	require.Equal(t, "scheduled", fmt.Sprint(updatedPost["status"]))

	createdMedia, err := mediaStore.Create(ctx, map[string]any{
		"filename":    "contract-asset.png",
		"url":         "/uploads/contract-asset.png",
		"type":        "image",
		"mime_type":   "image/png",
		"metadata":    map[string]any{"alt_text": "Contract Asset"},
		"uploaded_by": "cms-tests",
	})
	require.NoError(t, err, "create media")
	require.NotEmpty(t, fmt.Sprint(createdMedia["id"]))

	mediaResults, mediaTotal, err := mediaStore.List(ctx, admin.ListOptions{
		Search:  "contract-asset",
		Filters: map[string]any{"type": "image"},
	})
	require.NoError(t, err, "list media with search/filter")
	require.Equal(t, 1, mediaTotal)
	require.NotEmpty(t, mediaResults)
	require.Equal(t, "contract-asset.png", fmt.Sprint(mediaResults[0]["filename"]))
}
