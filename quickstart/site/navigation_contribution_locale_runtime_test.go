package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationEnforceContributionLocalePolicyStrictFiltersFallbackContentTargets(t *testing.T) {
	contentSvc := &strictLocaleContentStub{
		records: map[string]admin.CMSContent{
			"content-es": {
				ID:                     "content-es",
				Locale:                 "es",
				ResolvedLocale:         "es",
				MissingRequestedLocale: false,
			},
			"content-fallback": {
				ID:                     "content-fallback",
				Locale:                 "en",
				ResolvedLocale:         "en",
				MissingRequestedLocale: true,
			},
		},
	}
	runtime := &navigationRuntime{contentSvc: contentSvc}
	items := []admin.MenuItem{
		{
			ID:     "home",
			Label:  "Home",
			Target: map[string]any{"type": "url", "path": "/"},
		},
		{
			ID:    "localized",
			Label: "Localized",
			Target: map[string]any{
				"type":       "content",
				"content_id": "content-es",
				"url":        "/es/localized",
			},
		},
		{
			ID:    "fallback",
			Label: "Fallback",
			Target: map[string]any{
				"type":       "content",
				"content_id": "content-fallback",
				"url":        "/fallback",
			},
		},
	}

	filtered := runtime.enforceContributionLocalePolicy(context.Background(), items, "es", ContributionLocalePolicyStrict)
	if len(filtered) != 2 {
		t.Fatalf("expected strict contribution locale policy to keep two items, got %+v", filtered)
	}
	if filtered[0].ID != "home" || filtered[1].ID != "localized" {
		t.Fatalf("unexpected filtered order/content: %+v", filtered)
	}
}

func TestNavigationEnforceContributionLocalePolicyStrictSharesContentCacheAcrossDuplicateTargets(t *testing.T) {
	contentSvc := &strictLocaleContentStub{
		records: map[string]admin.CMSContent{
			"content-es": {
				ID:                     "content-es",
				Locale:                 "es",
				ResolvedLocale:         "es",
				MissingRequestedLocale: false,
			},
		},
	}
	runtime := &navigationRuntime{contentSvc: contentSvc}
	items := []admin.MenuItem{
		{
			ID:    "localized-a",
			Label: "Localized A",
			Target: map[string]any{
				"type":       "content",
				"content_id": "content-es",
				"url":        "/es/a",
			},
		},
		{
			ID:    "localized-b",
			Label: "Localized B",
			Target: map[string]any{
				"type":       "content",
				"content_id": "content-es",
				"url":        "/es/b",
			},
		},
	}

	filtered := runtime.enforceContributionLocalePolicy(context.Background(), items, "es", ContributionLocalePolicyStrict)
	if len(filtered) != 2 {
		t.Fatalf("expected both localized items to survive strict filtering, got %+v", filtered)
	}
	if contentSvc.contentCalls[siteContentRecordCacheKey("content-es", "es")] != 1 {
		t.Fatalf("expected one cached content lookup for duplicate target, got %+v", contentSvc.contentCalls)
	}
}

func TestNavigationEnforceContributionLocalePolicyReturnsInputForNonStrictPolicy(t *testing.T) {
	runtime := &navigationRuntime{contentSvc: &strictLocaleContentStub{}}
	items := []admin.MenuItem{
		{ID: "one", Target: map[string]any{"type": "content", "content_id": "content-en"}},
	}

	filtered := runtime.enforceContributionLocalePolicy(context.Background(), items, "en", ContributionLocalePolicyFallback)
	if len(filtered) != 1 || filtered[0].ID != "one" {
		t.Fatalf("expected non-strict policy to preserve items, got %+v", filtered)
	}
}

func TestNavigationMenuItemMatchesRequestedLocaleTreatsNonContentTargetsAsPassthrough(t *testing.T) {
	if !menuItemMatchesRequestedLocale(
		context.Background(),
		&strictLocaleContentStub{},
		admin.MenuItem{ID: "home", Target: map[string]any{"type": "url", "path": "/"}},
		"en",
		nil,
		nil,
	) {
		t.Fatalf("expected non-content target to bypass locale matching")
	}
}

func TestNavigationMenuItemMatchesRequestedLocaleHandlesNilCachesForContentTargets(t *testing.T) {
	contentSvc := &strictLocaleContentStub{
		records: map[string]admin.CMSContent{
			"content-es": {
				ID:                     "content-es",
				Locale:                 "es",
				ResolvedLocale:         "es",
				MissingRequestedLocale: false,
			},
		},
	}

	if !menuItemMatchesRequestedLocale(
		context.Background(),
		contentSvc,
		admin.MenuItem{
			ID:    "localized",
			Label: "Localized",
			Target: map[string]any{
				"type":       "content",
				"content_id": "content-es",
			},
		},
		"es",
		nil,
		nil,
	) {
		t.Fatalf("expected content target to resolve with nil helper caches")
	}
}
