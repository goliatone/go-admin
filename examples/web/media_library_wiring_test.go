package main

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"testing"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	"github.com/stretchr/testify/require"
)

func TestWirePersistentMediaLibraryUsesStoreAdapter(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), strings.ToLower(t.Name())+".db")
	dsn := fmt.Sprintf("file:%s?cache=shared&_fk=1", dbPath)
	db, err := stores.SetupContentDatabase(ctx, dsn)
	require.NoError(t, err)
	store, err := stores.NewMediaStore(db)
	require.NoError(t, err)
	_, err = store.Create(ctx, map[string]any{
		"filename":  "wired-asset.png",
		"url":       "/uploads/wired-asset.png",
		"type":      "image",
		"mime_type": "image/png",
		"size":      int64(67890),
	})
	require.NoError(t, err)

	adm, err := admin.New(admin.Config{BasePath: "/admin", DefaultLocale: "en"}, admin.Dependencies{})
	require.NoError(t, err)
	wirePersistentMediaLibrary(adm, store, stores.DefaultMediaLibraryUploadConfig("/admin", t.TempDir()))

	queryProvider, ok := adm.MediaLibrary().(coreadmin.MediaQueryProvider)
	require.True(t, ok, "wired media library should expose persistent query provider")
	_, ok = adm.MediaLibrary().(coreadmin.MediaUploader)
	require.True(t, ok, "wired media library should expose disk-backed upload support")
	page, err := queryProvider.QueryMedia(ctx, coreadmin.MediaQuery{Search: "wired-asset", Limit: 10})
	require.NoError(t, err)
	require.Len(t, page.Items, 1)
	require.Equal(t, int64(67890), page.Items[0].Size)
}
