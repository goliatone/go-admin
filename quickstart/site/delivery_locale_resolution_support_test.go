package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestResolveLocaleRecordPrefersPreviewScopedCandidateWithinLocale(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	state := RequestState{
		Locale:            "es",
		DefaultLocale:     "en",
		SupportedLocales:  []string{"en", "es"},
		PreviewTokenValid: true,
		PreviewContentID:  "post-es-draft",
		PreviewEntityType: "posts",
	}
	candidates := []admin.CMSContent{
		{
			ID:          "post-es-published",
			Slug:        "hola",
			Locale:      "es",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/hola"},
		},
		{
			ID:          "post-es-draft",
			Slug:        "hola",
			Locale:      "es",
			Status:      "draft",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/hola"},
		},
	}

	selected, missing, available, fallbackUsed := resolveLocaleRecord(candidates, state, capability, true, "en")
	if missing {
		t.Fatalf("expected no locale-missing error, got missing=%v", missing)
	}
	if fallbackUsed {
		t.Fatalf("expected exact locale match without fallback, got fallbackUsed=%v", fallbackUsed)
	}
	if selected.ID != "post-es-draft" {
		t.Fatalf("expected preview-scoped draft record selected, got %+v", selected)
	}
	if selected.ResolvedLocale != "es" || selected.RequestedLocale != "es" {
		t.Fatalf("expected locale metadata on selected record, got %+v", selected)
	}
	if len(available) != 1 || available[0] != "es" {
		t.Fatalf("expected available locales [es], got %+v", available)
	}
}

func TestResolveLocaleRecordsForListGroupsByIdentityAndSorts(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "collection"}
	state := RequestState{
		Locale:           "es",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}
	records := []admin.CMSContent{
		{
			ID:          "welcome-en",
			FamilyID:    "welcome-family",
			Slug:        "welcome",
			Title:       "Welcome",
			Locale:      "en",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/welcome"},
		},
		{
			ID:          "welcome-es",
			FamilyID:    "welcome-family",
			Slug:        "bienvenido",
			Title:       "Bienvenido",
			Locale:      "es",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/bienvenido"},
		},
		{
			ID:          "archive-en",
			FamilyID:    "archive-family",
			Slug:        "archive",
			Title:       "Archive",
			Locale:      "en",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/archive"},
		},
	}

	selected := resolveLocaleRecordsForList(records, state, capability, true, "en")
	if len(selected) != 2 {
		t.Fatalf("expected 2 grouped list records, got %+v", selected)
	}
	if selected[0].ID != "archive-en" || selected[1].ID != "welcome-es" {
		t.Fatalf("expected records sorted by path with locale selection applied, got %+v", selected)
	}
	if selected[0].MissingRequestedLocale != true || selected[0].RequestedLocale != "es" || selected[0].ResolvedLocale != "en" {
		t.Fatalf("expected archive record to carry fallback metadata, got %+v", selected[0])
	}
	if selected[1].MissingRequestedLocale || selected[1].ResolvedLocale != "es" {
		t.Fatalf("expected localized record without fallback metadata, got %+v", selected[1])
	}
}

func TestContentIdentityKeyPrefersFamilySlugPathAndID(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}

	if got := contentIdentityKey(admin.CMSContent{
		ID:       "post-1",
		FamilyID: "Family-One",
		Slug:     "hello",
		Data:     map[string]any{"path": "/posts/hello"},
	}, capability); got != "family-one" {
		t.Fatalf("expected family id priority, got %q", got)
	}
	if got := contentIdentityKey(admin.CMSContent{
		ID:   "post-2",
		Slug: "hello",
	}, capability); got != "post:hello" {
		t.Fatalf("expected slug identity fallback, got %q", got)
	}
	if got := contentIdentityKey(admin.CMSContent{
		ID:   "post-3",
		Data: map[string]any{"path": "/posts/hello"},
	}, capability); got != "post:/posts/hello" {
		t.Fatalf("expected path identity fallback, got %q", got)
	}
	if got := contentIdentityKey(admin.CMSContent{
		ID: "post-4",
	}, capability); got != "post:post-4" {
		t.Fatalf("expected id identity fallback, got %q", got)
	}
}

func TestLocalizedPathsFromGroupUsesFirstPathPerLocale(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	group := []admin.CMSContent{
		{
			ID:          "post-en",
			Slug:        "hello",
			Locale:      "en",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/posts/hello"},
		},
		{
			ID:          "post-es",
			Slug:        "hola",
			Locale:      "es",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/es/publicaciones/hola"},
		},
		{
			ID:          "post-es-duplicate",
			Slug:        "hola-otro",
			Locale:      "es",
			Status:      "published",
			ContentType: "post",
			Data:        map[string]any{"path": "/es/publicaciones/hola-otro"},
		},
	}

	paths := localizedPathsFromGroup(group, capability)
	if len(paths) != 2 {
		t.Fatalf("expected localized paths for two locales, got %+v", paths)
	}
	if paths["en"] != "/posts/hello" {
		t.Fatalf("expected en path /posts/hello, got %+v", paths)
	}
	if paths["es"] != "/posts/hola" {
		t.Fatalf("expected first es canonical path preserved, got %+v", paths)
	}
}

func TestDeliverySlugMatchesSlugAndCanonicalPath(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "post", Kind: "detail"}
	record := admin.CMSContent{
		ID:          "post-1",
		Slug:        "hello-world",
		Status:      "published",
		ContentType: "post",
		Data:        map[string]any{"path": "/posts/hello-world"},
	}

	if !deliverySlugMatches(record, "hello-world", capability) {
		t.Fatalf("expected direct slug match")
	}
	if !deliverySlugMatches(record, "posts/hello-world", capability) {
		t.Fatalf("expected canonical path fallback match")
	}
	if deliverySlugMatches(record, "different", capability) {
		t.Fatalf("expected non-matching slug to return false")
	}
}
