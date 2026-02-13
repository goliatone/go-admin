package stores

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestCMSPageStorePageToRecordIncludesTranslationMetadata(t *testing.T) {
	store := &CMSPageStore{}
	record := store.pageToRecord(admin.CMSPage{
		ID:                     "page_1",
		Title:                  "Home",
		Slug:                   "home",
		Locale:                 "en",
		Status:                 "draft",
		TranslationGroupID:     "tg_pages_1",
		RequestedLocale:        "fr",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "es"},
		MissingRequestedLocale: true,
		Data: map[string]any{
			"path": "/home",
		},
	})

	if got := record["translation_group_id"]; got != "tg_pages_1" {
		t.Fatalf("expected translation_group_id tg_pages_1, got %#v", got)
	}
	if got := record["requested_locale"]; got != "fr" {
		t.Fatalf("expected requested_locale fr, got %#v", got)
	}
	if got := record["resolved_locale"]; got != "en" {
		t.Fatalf("expected resolved_locale en, got %#v", got)
	}
	if got, _ := record["missing_requested_locale"].(bool); !got {
		t.Fatalf("expected missing_requested_locale=true, got %#v", record["missing_requested_locale"])
	}
	if got, _ := record["fallback_used"].(bool); !got {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}

	available, ok := record["available_locales"].([]string)
	if !ok {
		t.Fatalf("expected available_locales []string, got %#v", record["available_locales"])
	}
	if len(available) != 2 || available[0] != "en" || available[1] != "es" {
		t.Fatalf("unexpected available_locales: %#v", available)
	}
}

func TestCMSPostStorePostToRecordIncludesTranslationMetadata(t *testing.T) {
	store := &CMSPostStore{}
	record := store.postToRecord(admin.CMSContent{
		ID:                     "post_1",
		Title:                  "Hello",
		Slug:                   "hello",
		Locale:                 "en",
		Status:                 "draft",
		ContentType:            "post",
		TranslationGroupID:     "tg_posts_1",
		RequestedLocale:        "fr",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "fr"},
		MissingRequestedLocale: false,
		Data: map[string]any{
			"path": "/posts/hello",
		},
	})

	if got := record["translation_group_id"]; got != "tg_posts_1" {
		t.Fatalf("expected translation_group_id tg_posts_1, got %#v", got)
	}
	if got := record["requested_locale"]; got != "fr" {
		t.Fatalf("expected requested_locale fr, got %#v", got)
	}
	if got := record["resolved_locale"]; got != "en" {
		t.Fatalf("expected resolved_locale en, got %#v", got)
	}
	if got, _ := record["missing_requested_locale"].(bool); !got {
		t.Fatalf("expected missing_requested_locale=true (inferred from fr->en fallback), got %#v", record["missing_requested_locale"])
	}
	if got, _ := record["fallback_used"].(bool); !got {
		t.Fatalf("expected fallback_used=true, got %#v", record["fallback_used"])
	}

	available, ok := record["available_locales"].([]string)
	if !ok {
		t.Fatalf("expected available_locales []string, got %#v", record["available_locales"])
	}
	if len(available) != 2 || available[0] != "en" || available[1] != "fr" {
		t.Fatalf("unexpected available_locales: %#v", available)
	}
}
