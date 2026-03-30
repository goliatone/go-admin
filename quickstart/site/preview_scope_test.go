package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestPreviewRecordMatchesEntityTypeSupportsSingularPluralMatching(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "posts", Kind: "detail"}
	record := admin.CMSContent{
		ContentType:     "post",
		ContentTypeSlug: "posts",
	}

	if !previewRecordMatchesEntityType("post", capability, record) {
		t.Fatalf("expected singular preview entity to match plural record/capability type")
	}
	if !previewRecordMatchesEntityType("posts", capability, record) {
		t.Fatalf("expected plural preview entity to match record/capability type")
	}
	if previewRecordMatchesEntityType("page", capability, record) {
		t.Fatalf("expected unrelated preview entity not to match")
	}
}

func TestPreviewEntityAllowsMenuDraftsSupportsKnownMenuEntities(t *testing.T) {
	cases := map[string]bool{
		"menu":               true,
		"menus":              true,
		"navigation":         true,
		"menu_binding":       true,
		"menu_bindings":      true,
		"menu_view_profile":  true,
		"menu_view_profiles": true,
		"pages":              false,
		"":                   false,
	}

	for raw, expected := range cases {
		if got := previewEntityAllowsMenuDrafts(raw); got != expected {
			t.Fatalf("previewEntityAllowsMenuDrafts(%q)=%v, expected %v", raw, got, expected)
		}
	}
}
