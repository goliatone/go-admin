package main

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/goliatone/go-admin/examples/web/setup"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/stretchr/testify/require"
	"path/filepath"
)

func TestCMSRepositoriesExposeVirtualFieldsAndScopes(t *testing.T) {
	t.Helper()

	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db")
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)

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
	pageStore := stores.NewCMSPageStore(contentSvc, "en")
	require.NotNil(t, pageStore, "page store")

	totalPageRows, err := db.NewSelect().Table("admin_page_records").Count(ctx)
	require.NoError(t, err, "count existing page rows")
	require.Greater(t, totalPageRows, 0, "page view should be hydrated by seeds")

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

	pagePayload := map[string]any{
		"title":            "Contract Scope Page",
		"slug":             "contract-page",
		"status":           "draft",
		"locale":           "en",
		"path":             "/contract-page",
		"meta_title":       "PageVirtualScope",
		"meta_description": "PageVirtualScope",
	}
	createdPage, err := pageStore.Create(ctx, pagePayload)
	require.NoError(t, err, "create page via cms store")
	pageID := fmt.Sprint(createdPage["id"])
	require.NotEmpty(t, pageID)

	var pageRow struct {
		ID        string `bun:"id"`
		ContentID string `bun:"content_id"`
	}
	err = db.NewSelect().
		Table("pages").
		Column("id", "content_id").
		Where("slug = ?", "contract-page").
		Scan(ctx, &pageRow)
	require.NoError(t, err, "fetch contract page row")
	require.NotEmpty(t, pageRow.ID)
	require.NotEmpty(t, pageRow.ContentID)

	var contentTranslations []string
	err = db.NewSelect().
		Table("content_translations").
		Column("locale_id").
		Where("content_id = ?", pageRow.ContentID).
		Scan(ctx, &contentTranslations)
	require.NoError(t, err, "load content translations for contract page")
	require.NotEmpty(t, contentTranslations, "content translations should exist for contract page")

	var pageTranslations []string
	err = db.NewSelect().
		Table("page_translations").
		Column("locale_id").
		Where("page_id = ?", pageRow.ID).
		Scan(ctx, &pageTranslations)
	require.NoError(t, err, "load page translations for contract page")
	require.NotEmpty(t, pageTranslations, "page translations should exist for contract page")

	pageCount, err := db.NewSelect().
		Table("admin_page_records").
		Where("slug = ?", "contract-page").
		Count(ctx)
	require.NoError(t, err, "count contract page rows")
	require.Equalf(t, 1, pageCount, "contract page should exist in admin_page_records view (content translations: %d, page translations: %d)", len(contentTranslations), len(pageTranslations))

	pageScopedResults, pageScopedTotal, err := pageAdapter.List(ctx, admin.ListOptions{
		Filters: map[string]any{"slug": "contract-page"},
		PerPage: 5,
	})
	require.NoError(t, err, "list pages by slug")
	require.Equal(t, 1, pageScopedTotal)
	require.Len(t, pageScopedResults, 1)
	require.NotEmpty(t, pageScopedResults[0]["path"])
	require.Equal(t, "PageVirtualScope", fmt.Sprint(pageScopedResults[0]["meta_title"]))

	updatedPage, err := pageStore.Update(ctx, pageID, map[string]any{"status": "published"})
	require.NoError(t, err, "update page status")
	require.Equal(t, "published", fmt.Sprint(updatedPage["status"]))

	err = pageStore.Delete(ctx, pageID)
	require.NoError(t, err, "delete page")

	deletedResults, deletedTotal, err := pageAdapter.List(ctx, admin.ListOptions{
		Filters: map[string]any{"slug": "contract-page"},
		PerPage: 5,
	})
	require.NoError(t, err, "list pages after delete")
	require.Equal(t, 0, deletedTotal)
	require.Len(t, deletedResults, 0)

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

	sortPostA, err := postStore.Create(ctx, map[string]any{
		"title":            "Sort Alpha Story",
		"slug":             "sort-alpha",
		"status":           "draft",
		"locale":           "en",
		"path":             "/posts/sort-alpha",
		"meta_title":       "AlphaSort",
		"meta_description": "virtual-sort-check",
	})
	require.NoError(t, err, "create sort alpha post")
	require.NotEmpty(t, fmt.Sprint(sortPostA["id"]))

	sortPostB, err := postStore.Create(ctx, map[string]any{
		"title":            "Sort Zeta Story",
		"slug":             "sort-zeta",
		"status":           "draft",
		"locale":           "en",
		"path":             "/posts/sort-zeta",
		"meta_title":       "ZetaSort",
		"meta_description": "virtual-sort-check",
	})
	require.NoError(t, err, "create sort zeta post")
	require.NotEmpty(t, fmt.Sprint(sortPostB["id"]))

	sortResults, sortTotal, err := postAdapter.List(ctx, admin.ListOptions{
		Search:   "virtual-sort-check",
		SortBy:   "meta_title",
		SortDesc: true,
	})
	require.NoError(t, err, "sort posts by virtual meta title")
	require.Equal(t, 2, sortTotal)
	require.Len(t, sortResults, 2)
	require.Equal(t, "sort-zeta", fmt.Sprint(sortResults[0]["slug"]))
	require.Equal(t, "sort-alpha", fmt.Sprint(sortResults[1]["slug"]))

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
