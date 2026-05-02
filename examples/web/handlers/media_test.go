package handlers

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestMediaPageEndpointContextUsesAdminMediaRoutes(t *testing.T) {
	ctx := mediaPageEndpointContext(admin.Config{BasePath: "/admin"}, "grid")

	expected := map[string]string{
		"media_view":               "grid",
		"media_gallery_path":       "/admin/content/media?view=grid",
		"media_list_path":          "/admin/content/media?view=list",
		"media_library_path":       "/admin/api/media/library",
		"media_item_path":          "/admin/api/media/library/:id",
		"media_resolve_path":       "/admin/api/media/resolve",
		"media_upload_path":        "/admin/api/media/upload",
		"media_presign_path":       "/admin/api/media/presign",
		"media_confirm_path":       "/admin/api/media/confirm",
		"media_capabilities_path":  "/admin/api/media/capabilities",
		"media_default_value_mode": "url",
	}
	for key, want := range expected {
		if got := ctx[key]; got != want {
			t.Fatalf("expected %s to be %q, got %v", key, want, got)
		}
	}
}

func TestNormalizeMediaViewQueryDefaultsToList(t *testing.T) {
	for _, value := range []string{"", "list", "cards"} {
		if got := normalizeMediaViewQuery(value); got != "list" {
			t.Fatalf("expected %q to normalize to list, got %q", value, got)
		}
	}
	if got := normalizeMediaViewQuery(" GRID "); got != "grid" {
		t.Fatalf("expected grid query to normalize to grid, got %q", got)
	}
}
