package dashboard

import (
	"testing"

	dashcmp "github.com/goliatone/go-dashboard/components/dashboard"
)

func TestOrderedAreaCodesPrefersCanonicalOrderThenSortedExtras(t *testing.T) {
	areas := map[string][]dashcmp.WidgetInstance{
		"admin.dashboard.footer":  nil,
		"custom.zeta":             nil,
		"admin.dashboard.main":    nil,
		"custom.alpha":            nil,
		"admin.dashboard.sidebar": nil,
	}

	got := OrderedAreaCodes(areas)
	want := []string{
		"admin.dashboard.main",
		"admin.dashboard.sidebar",
		"admin.dashboard.footer",
		"custom.alpha",
		"custom.zeta",
	}
	if len(got) != len(want) {
		t.Fatalf("expected %d area codes, got %d (%v)", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected area %d to be %q, got %q", i, want[i], got[i])
		}
	}
}

func TestLayoutMetadataHelpers(t *testing.T) {
	meta := map[string]any{
		"layout": map[string]any{"width": "6"},
		"hidden": true,
		"order":  "4",
		"locale": "es",
		"data":   dashcmp.WidgetData{"ok": true},
	}

	if got := SpanFromMetadata(meta); got != 6 {
		t.Fatalf("expected span 6, got %d", got)
	}
	if !HiddenFromMetadata(meta) {
		t.Fatalf("expected hidden metadata to be true")
	}
	if got := OrderFromMetadata(meta); got != 4 {
		t.Fatalf("expected order 4, got %d", got)
	}
	if got := LocaleFromMetadata(meta); got != "es" {
		t.Fatalf("expected locale es, got %q", got)
	}
	data := ExtractWidgetData(meta)
	if data["ok"] != true {
		t.Fatalf("expected widget data preserved, got %#v", data)
	}
	if got := NumericToInt("12"); got != 12 {
		t.Fatalf("expected numeric string to parse as 12, got %d", got)
	}
	if got := NumericToInt(""); got != -1 {
		t.Fatalf("expected blank string to return -1, got %d", got)
	}
}
