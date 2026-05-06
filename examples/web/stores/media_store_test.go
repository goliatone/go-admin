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

	items, err := store.MediaLibrary().List(ctx)
	require.NoError(t, err)
	require.Len(t, items, 55)
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
