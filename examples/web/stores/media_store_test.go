package stores

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
	"github.com/stretchr/testify/require"
)

func TestMediaStoreLibraryPreservesSizeAcrossReadPaths(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	created, err := store.Create(ctx, map[string]any{
		"filename":  "sized-asset.png",
		"url":       "/uploads/sized-asset.png",
		"type":      "image",
		"mime_type": "image/png",
		"size":      int64(54321),
		"metadata":  map[string]any{"alt_text": "Sized asset"},
	})
	require.NoError(t, err)
	id := fmt.Sprint(created["id"])
	require.NotEmpty(t, id)

	lib := store.MediaLibrary()
	queryProvider, ok := lib.(admin.MediaQueryProvider)
	require.True(t, ok, "persistent media library should support query media")
	getter, ok := lib.(admin.MediaGetter)
	require.True(t, ok, "persistent media library should support get media")
	resolver, ok := lib.(admin.MediaResolver)
	require.True(t, ok, "persistent media library should support resolve media")

	page, err := queryProvider.QueryMedia(ctx, admin.MediaQuery{Search: "sized-asset", Limit: 10})
	require.NoError(t, err)
	require.Equal(t, 1, page.Total)
	require.Len(t, page.Items, 1)
	require.Equal(t, int64(54321), page.Items[0].Size)

	item, err := getter.GetMedia(ctx, id)
	require.NoError(t, err)
	require.Equal(t, int64(54321), item.Size)

	resolved, err := resolver.ResolveMedia(ctx, admin.MediaReference{URL: "/uploads/sized-asset.png"})
	require.NoError(t, err)
	require.Equal(t, int64(54321), resolved.Size)
	require.Equal(t, "Sized asset", fmt.Sprint(resolved.Metadata["alt_text"]))
}

func TestMediaStoreLibraryPreservesSizeAcrossMutationPaths(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	assetsDir := t.TempDir()
	lib := store.MediaLibraryWithUploads(DefaultMediaLibraryUploadConfig("/admin", assetsDir))

	uploader, ok := lib.(admin.MediaUploader)
	require.True(t, ok, "persistent media library should support upload media")
	updater, ok := lib.(admin.MediaUpdater)
	require.True(t, ok, "persistent media library should support update media")

	uploaded, err := uploader.UploadMedia(ctx, admin.MediaUploadInput{
		MediaUploadRequest: admin.MediaUploadRequest{
			Name:        "payload.txt",
			FileName:    "payload.txt",
			ContentType: "text/plain",
			Metadata:    map[string]any{"alt_text": "Payload"},
		},
		Reader: strings.NewReader("payload"),
	})
	require.NoError(t, err)
	require.Equal(t, int64(len("payload")), uploaded.Size)
	require.True(t, strings.HasPrefix(uploaded.URL, "/admin/assets/uploads/media/library/"))
	writtenPath := filepath.Join(assetsDir, filepath.FromSlash(strings.TrimPrefix(uploaded.URL, "/admin/assets/")))
	written, err := os.ReadFile(writtenPath)
	require.NoError(t, err)
	require.Equal(t, "payload", string(written))

	updated, err := updater.UpdateMedia(ctx, uploaded.ID, admin.MediaUpdateInput{
		Metadata: map[string]any{"caption": "Updated without size loss"},
	})
	require.NoError(t, err)
	require.Equal(t, uploaded.Size, updated.Size)
	require.Equal(t, "Updated without size loss", fmt.Sprint(updated.Metadata["caption"]))
}

func TestMediaStoreLibraryDoesNotAdvertiseUploadWithoutStorage(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	lib := store.MediaLibrary()
	_, ok := lib.(admin.MediaUploader)
	require.False(t, ok, "base persistent media library should not advertise upload without storage")
}

func TestMediaStoreLibraryThumbnailSemantics(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	for _, record := range []map[string]any{
		{
			"filename":  "hero.png",
			"url":       "/uploads/hero.png",
			"type":      "image",
			"mime_type": "image/png",
		},
		{
			"filename":  "demo.mp4",
			"url":       "/uploads/demo.mp4",
			"type":      "video",
			"mime_type": "video/mp4",
		},
		{
			"filename":  "guide.pdf",
			"url":       "/uploads/guide.pdf",
			"type":      "document",
			"mime_type": "application/pdf",
		},
	} {
		_, err := store.Create(ctx, record)
		require.NoError(t, err)
	}

	page, err := store.MediaLibrary().QueryMedia(ctx, admin.MediaQuery{Limit: 10})
	require.NoError(t, err)
	byName := map[string]admin.MediaItem{}
	for _, item := range page.Items {
		byName[item.Name] = item
	}

	require.Equal(t, "/uploads/hero.png", byName["hero.png"].Thumbnail)
	require.Empty(t, byName["demo.mp4"].Thumbnail)
	require.Empty(t, byName["guide.pdf"].Thumbnail)
}

func TestMediaStoreLibraryMIMEFamilyMatchesEffectiveFamily(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	for _, record := range []map[string]any{
		{
			"filename":  "mime-audio.mp3",
			"url":       "/uploads/mime-audio.mp3",
			"type":      "binary",
			"mime_type": "audio/mpeg",
		},
		{
			"filename":  "typed-audio.bin",
			"url":       "/uploads/typed-audio.bin",
			"type":      "audio",
			"mime_type": "",
		},
		{
			"filename":  "mime-video.mp4",
			"url":       "/uploads/mime-video.mp4",
			"type":      "file",
			"mime_type": "video/mp4",
		},
		{
			"filename":  "guide.pdf",
			"url":       "/uploads/guide.pdf",
			"type":      "document",
			"mime_type": "application/pdf",
		},
		{
			"filename":  "mime-vector.svg",
			"url":       "/uploads/mime-vector.svg",
			"type":      "asset",
			"mime_type": "image/svg+xml",
		},
		{
			"filename":  "typed-vector.svg",
			"url":       "/uploads/typed-vector.svg",
			"type":      "vector",
			"mime_type": "image/svg+xml",
		},
		{
			"filename":  "raster.png",
			"url":       "/uploads/raster.png",
			"type":      "asset",
			"mime_type": "image/png",
		},
	} {
		_, err := store.Create(ctx, record)
		require.NoError(t, err)
	}

	queryProvider, ok := store.MediaLibrary().(admin.MediaQueryProvider)
	require.True(t, ok)

	audioPage, err := queryProvider.QueryMedia(ctx, admin.MediaQuery{MIMEFamily: "audio", Limit: 10})
	require.NoError(t, err)
	require.Equal(t, 2, audioPage.Total)
	require.ElementsMatch(t, []string{"mime-audio.mp3", "typed-audio.bin"}, mediaItemNames(audioPage.Items))

	videoPage, err := queryProvider.QueryMedia(ctx, admin.MediaQuery{MIMEFamily: "video", Limit: 10})
	require.NoError(t, err)
	require.Equal(t, 1, videoPage.Total)
	require.Equal(t, "mime-video.mp4", videoPage.Items[0].Name)

	vectorPage, err := queryProvider.QueryMedia(ctx, admin.MediaQuery{MIMEFamily: "vector", Limit: 10})
	require.NoError(t, err)
	require.Equal(t, 2, vectorPage.Total)
	require.ElementsMatch(t, []string{"mime-vector.svg", "typed-vector.svg"}, mediaItemNames(vectorPage.Items))

	imagePage, err := queryProvider.QueryMedia(ctx, admin.MediaQuery{MIMEFamily: "image", Limit: 10})
	require.NoError(t, err)
	require.Equal(t, 1, imagePage.Total)
	require.Equal(t, "raster.png", imagePage.Items[0].Name)
}

func TestMediaStoreSeedShowcaseRecordsCoverPreviewFamilies(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	require.NoError(t, store.SeedWithContext(ctx))

	page, err := store.MediaLibrary().QueryMedia(ctx, admin.MediaQuery{Limit: 20})
	require.NoError(t, err)
	byName := map[string]admin.MediaItem{}
	for _, item := range page.Items {
		byName[item.Name] = item
	}

	expected := map[string]string{
		"dashboard-screenshot.png": "image",
		"brand-mark.svg":           "vector",
		"product-demo.mp4":         "video",
		"narration.mp3":            "audio",
		"operator-guide.pdf":       "document",
		"generic-vector.svg":       "vector",
	}
	for name, family := range expected {
		item, ok := byName[name]
		require.True(t, ok, "missing seeded media %s", name)
		require.NotEmpty(t, item.URL, "seeded media %s should expose a local URL", name)
		assertExampleAssetURLExists(t, item.URL)
		switch family {
		case "audio":
			require.Equal(t, "binary", item.Type, "audio seed should exercise generic-type MIME inference")
			require.Equal(t, "audio/mpeg", item.MIMEType)
			require.Empty(t, item.Thumbnail)
		case "video":
			require.Equal(t, "video", item.Type)
			require.Equal(t, "video/mp4", item.MIMEType)
			require.Empty(t, item.Thumbnail)
		case "document":
			require.Equal(t, "document", item.Type)
			require.Empty(t, item.Thumbnail)
		case "vector":
			require.Equal(t, "image/svg+xml", item.MIMEType)
			require.NotEmpty(t, item.Thumbnail)
		case "image":
			require.Equal(t, "image/png", item.MIMEType)
			require.NotEmpty(t, item.Thumbnail)
		}
	}

	seedFixture, err := os.ReadFile(filepath.Join(repoRootForMediaTest(t), "examples", "web", "data", "sql", "seeds", "cms", "media.yml"))
	require.NoError(t, err)
	for name := range expected {
		require.Contains(t, string(seedFixture), name, "SQL/YAML media seed should include %s", name)
	}
	for _, url := range []string{
		mediaShowcaseImageURL,
		mediaShowcaseVectorURL,
		mediaShowcaseGenericVectorURL,
		mediaShowcaseVideoURL,
		mediaShowcaseAudioURL,
		mediaShowcaseDocumentURL,
	} {
		require.Contains(t, string(seedFixture), url, "SQL/YAML media seed should include URL %s", url)
	}
}

func TestMediaStoreSeedReconcilesStaleStaticMediaRows(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)

	for _, record := range []map[string]any{
		{
			"filename":  "logo.png",
			"url":       "/static/media/logo.png",
			"type":      "image",
			"mime_type": "image/png",
		},
		{
			"filename":  "banner.jpg",
			"url":       "/static/media/banner.jpg",
			"type":      "image",
			"mime_type": "image/jpeg",
		},
		{
			"filename":  "user-upload.png",
			"url":       "/admin/assets/uploads/media/library/user-upload.png",
			"type":      "image",
			"mime_type": "image/png",
		},
	} {
		_, err := store.Create(ctx, record)
		require.NoError(t, err)
	}

	require.NoError(t, store.SeedWithContext(ctx))

	page, err := store.MediaLibrary().QueryMedia(ctx, admin.MediaQuery{Limit: 20})
	require.NoError(t, err)
	byURL := map[string]admin.MediaItem{}
	byName := map[string]admin.MediaItem{}
	for _, item := range page.Items {
		byURL[item.URL] = item
		byName[item.Name] = item
	}

	for _, staleURL := range staleMediaShowcaseURLs {
		require.NotContains(t, byURL, staleURL, "stale local media URL should be removed during seed reconciliation")
	}
	require.Contains(t, byURL, "/admin/assets/uploads/media/library/user-upload.png", "unrelated local media should be preserved")

	for _, expectedURL := range []string{
		mediaShowcaseImageURL,
		mediaShowcaseVectorURL,
		mediaShowcaseGenericVectorURL,
		mediaShowcaseVideoURL,
		mediaShowcaseAudioURL,
		mediaShowcaseDocumentURL,
	} {
		require.Contains(t, byURL, expectedURL, "current showcase URL should be available after stale reconciliation")
	}
	require.Contains(t, byName, "product-demo.mp4")
	require.Contains(t, byName, "narration.mp3")
	require.Contains(t, byName, "operator-guide.pdf")
	require.Empty(t, byName["product-demo.mp4"].Thumbnail)
	require.Empty(t, byName["narration.mp3"].Thumbnail)
	require.Empty(t, byName["operator-guide.pdf"].Thumbnail)
}

func TestContentSeedsReferenceSeededMediaShowcase(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db")
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)
	db, err := SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	mediaStore, err := NewMediaStore(db)
	require.NoError(t, err)
	postStore, err := NewPostStore(db)
	require.NoError(t, err)

	require.NoError(t, mediaStore.SeedWithContext(ctx))
	postStore.Seed()
	mediaURLs := seededMediaURLSet(t, ctx, mediaStore)

	posts, _, err := postStore.List(ctx, admin.ListOptions{PerPage: 100})
	require.NoError(t, err)
	for _, post := range posts {
		featured := strings.TrimSpace(fmt.Sprint(post["featured_image"]))
		if featured == "" || featured == "<nil>" {
			continue
		}
		require.Contains(t, mediaURLs, featured, "post %s featured_image should reference seeded media", post["slug"])
	}

	fixture, err := os.ReadFile(filepath.Join(repoRootForMediaTest(t), "examples", "web", "data", "sql", "seeds", "content", "content.yml"))
	require.NoError(t, err)
	require.NotContains(t, string(fixture), "/static/media/")
	require.GreaterOrEqual(t, strings.Count(string(fixture), "_type: \"media_gallery\""), 3)
	require.Contains(t, string(fixture), mediaShowcaseImageURL)
	require.Contains(t, string(fixture), mediaShowcaseVectorURL)
	require.Contains(t, string(fixture), mediaShowcaseGenericVectorURL)
	first := strings.Index(string(fixture), mediaShowcaseImageURL)
	second := strings.Index(string(fixture), mediaShowcaseVectorURL)
	third := strings.Index(string(fixture), mediaShowcaseGenericVectorURL)
	require.True(t, first > -1 && second > first && third > second, "expected media gallery seed order to be image, vector, generic vector")
}

func TestMediaStoreLibraryUpdateCanClearMetadata(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	created, err := store.Create(ctx, map[string]any{
		"filename": "meta.png",
		"url":      "/uploads/meta.png",
		"type":     "image",
		"size":     int64(123),
		"metadata": map[string]any{
			"alt_text": "Remove me",
			"caption":  "Keep me",
		},
	})
	require.NoError(t, err)

	updater, ok := store.MediaLibrary().(admin.MediaUpdater)
	require.True(t, ok)
	updated, err := updater.UpdateMedia(ctx, fmt.Sprint(created["id"]), admin.MediaUpdateInput{
		Metadata: map[string]any{"caption": "Keep me"},
	})
	require.NoError(t, err)
	require.Equal(t, int64(123), updated.Size)
	require.Equal(t, "Keep me", fmt.Sprint(updated.Metadata["caption"]))
	require.NotContains(t, updated.Metadata, "alt_text")

	record, err := store.Get(ctx, fmt.Sprint(created["id"]))
	require.NoError(t, err)
	require.Equal(t, "Keep me", fmt.Sprint(record["caption"]))
	require.NotContains(t, record, "alt_text")
}

func TestMediaStoreLibraryListReturnsAllRecords(t *testing.T) {
	ctx := context.Background()
	store := newTestMediaStore(t, ctx)
	for i := 0; i < 55; i++ {
		_, err := store.Create(ctx, map[string]any{
			"filename": fmt.Sprintf("asset-%02d.txt", i),
			"url":      path.Join("/uploads", fmt.Sprintf("asset-%02d.txt", i)),
			"type":     "document",
			"size":     int64(i + 1),
		})
		require.NoError(t, err)
	}

	page, err := store.MediaLibrary().QueryMedia(ctx, admin.MediaQuery{Limit: 100})
	require.NoError(t, err)
	require.Len(t, page.Items, 55)
	require.Equal(t, 55, page.Total)
}

func mediaItemNames(items []admin.MediaItem) []string {
	names := make([]string, 0, len(items))
	for _, item := range items {
		names = append(names, item.Name)
	}
	return names
}

func seededMediaURLSet(t *testing.T, ctx context.Context, store *MediaStore) map[string]struct{} {
	t.Helper()
	page, err := store.MediaLibrary().QueryMedia(ctx, admin.MediaQuery{Limit: 100})
	require.NoError(t, err)
	out := make(map[string]struct{}, len(page.Items))
	for _, item := range page.Items {
		if strings.TrimSpace(item.URL) != "" {
			out[item.URL] = struct{}{}
		}
	}
	return out
}

func assertExampleAssetURLExists(t *testing.T, rawURL string) {
	t.Helper()
	const adminAssetsPrefix = "/admin/assets/"
	require.True(t, strings.HasPrefix(rawURL, adminAssetsPrefix), "expected %s to use admin asset prefix", rawURL)
	rel := strings.TrimPrefix(rawURL, adminAssetsPrefix)
	path := filepath.Join(repoRootForMediaTest(t), "pkg", "client", "assets", filepath.FromSlash(rel))
	info, err := os.Stat(path)
	require.NoError(t, err, "expected seeded media URL %s to resolve to %s", rawURL, path)
	require.False(t, info.IsDir(), "seeded media URL %s resolved to a directory", rawURL)
}

func repoRootForMediaTest(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	require.NoError(t, err)
	return filepath.Clean(filepath.Join(wd, "..", "..", ".."))
}

func newTestMediaStore(t *testing.T, ctx context.Context) *MediaStore {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db")
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)
	db, err := SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	store, err := NewMediaStore(db)
	require.NoError(t, err)
	return store
}
