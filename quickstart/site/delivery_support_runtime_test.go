package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestMatchRoutePatternNormalizesAndCapturesSlug(t *testing.T) {
	params, ok := matchRoutePattern("/blog/:slug", "blog/Hello-World/")
	if !ok {
		t.Fatalf("expected route pattern to match normalized path")
	}
	if got := params["slug"]; got != "Hello-World" {
		t.Fatalf("expected slug param Hello-World, got %q", got)
	}
}

func TestFilterByLocalePrefersResolvedLocaleMetadata(t *testing.T) {
	records := []admin.CMSContent{
		{ID: "fallback", Locale: "en", ResolvedLocale: "es"},
		{ID: "source", Locale: "en"},
	}

	filtered := filterByLocale(records, "es")
	if len(filtered) != 1 || filtered[0].ID != "fallback" {
		t.Fatalf("expected resolved-locale filter to keep only fallback record, got %+v", filtered)
	}
}

func TestMatchesCapabilityTypeNormalizesSingularAndPluralForms(t *testing.T) {
	record := admin.CMSContent{
		ContentType:     "posts",
		ContentTypeSlug: "post",
	}

	if !matchesCapabilityType(record, "post") {
		t.Fatalf("expected singular capability type to match record")
	}
	if !matchesCapabilityType(record, "posts") {
		t.Fatalf("expected plural capability type to match record")
	}
	if matchesCapabilityType(record, "page") {
		t.Fatalf("expected unrelated capability type not to match record")
	}
}

func TestPickPreferredRecordUsesPreviewScopedMatchBeforePublishedFallback(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	records := []admin.CMSContent{
		{ID: "published", Status: "published", ContentType: "post", ContentTypeSlug: "post"},
		{ID: "draft", Status: "draft", ContentType: "post", ContentTypeSlug: "post"},
	}
	state := RequestState{
		PreviewTokenValid: true,
		PreviewEntityType: "posts",
		PreviewContentID:  "draft",
	}

	selected := pickPreferredRecord(records, state, capability)
	if selected.ID != "draft" {
		t.Fatalf("expected preview-scoped draft to win, got %+v", selected)
	}
}

func TestUniqueLocaleOrderDeduplicatesAndNormalizesGroups(t *testing.T) {
	locales := uniqueLocaleOrder(
		[]string{" EN ", "es"},
		[]string{"", "es", "fr"},
		[]string{"fr", "en", "pt"},
	)

	expected := []string{"en", "es", "fr", "pt"}
	if len(locales) != len(expected) {
		t.Fatalf("expected locale order %+v, got %+v", expected, locales)
	}
	for i, want := range expected {
		if locales[i] != want {
			t.Fatalf("expected locale order %+v, got %+v", expected, locales)
		}
	}
}
