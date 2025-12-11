package helpers

import (
	"testing"

	navinternal "github.com/goliatone/go-admin/admin/internal/navigation"
)

func TestJoinPath(t *testing.T) {
	got := JoinPath("/admin", "settings")
	if got != "/admin/settings" {
		t.Fatalf("expected /admin/settings, got %s", got)
	}

	got = JoinPath("admin", "/health")
	if got != "/admin/health" {
		t.Fatalf("expected /admin/health, got %s", got)
	}
}

func TestMenuHelpersNormalizeAndDedupe(t *testing.T) {
	item := navinternal.MenuItem{Label: "Settings", Target: map[string]any{"key": "settings"}}
	normalized := NormalizeMenuItem(item, "admin.main")
	if normalized.Code == "" || normalized.Menu != "admin.main" {
		t.Fatalf("expected menu code set, got code=%s menu=%s", normalized.Code, normalized.Menu)
	}
	if normalized.ID == "" {
		t.Fatalf("expected ID to be derived when missing")
	}

	items := []navinternal.MenuItem{
		normalized,
		{ID: "duplicate", Target: map[string]any{"key": "settings"}},
	}
	deduped := DedupeMenuItems(items)
	if len(deduped) != 1 {
		t.Fatalf("expected duplicates removed, got %d items", len(deduped))
	}
	if !TargetMatches(deduped[0].Target, "settings", "") {
		t.Fatalf("expected target to match settings key")
	}
}
