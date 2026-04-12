package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestCloneLocalizedPathsNormalizesAndSkipsBlankEntries(t *testing.T) {
	got := cloneLocalizedPaths(map[string]string{
		" EN ": " /about ",
		"es":   "",
		"":     "/ignored",
		"fr":   "a-propos",
	})

	if len(got) != 2 {
		t.Fatalf("expected two normalized entries, got %#v", got)
	}
	if got["en"] != "/about" {
		t.Fatalf("expected normalized en path /about, got %#v", got)
	}
	if got["fr"] != "/a-propos" {
		t.Fatalf("expected normalized fr path /a-propos, got %#v", got)
	}
}

func TestResolveLocalizedPathsByLocaleClonesAndCompletesMissingLocales(t *testing.T) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			EnableI18N: new(true),
		},
	})
	stub := &localeScopedContentListStub{
		CMSContentService: admin.NewInMemoryContentService(),
		byLocale: map[string][]admin.CMSContent{
			"en": {{
				ID:              "page-record",
				FamilyID:        "page-family",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/about"},
			}},
			"es": {{
				ID:              "page-record",
				FamilyID:        "page-family",
				Slug:            "about",
				Locale:          "es",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/sobre"},
			}},
		},
	}
	runtime := &deliveryRuntime{
		siteCfg:    cfg,
		contentSvc: stub,
	}
	state := RequestState{
		Locale:           "en",
		DefaultLocale:    "en",
		SupportedLocales: []string{"en", "es"},
	}
	record := admin.CMSContent{
		ID:               "page-record",
		FamilyID:         "page-family",
		Slug:             "about",
		Locale:           "en",
		Status:           "published",
		ContentType:      "page",
		ContentTypeSlug:  "page",
		AvailableLocales: []string{"en", "es"},
		Data:             map[string]any{"path": "/about"},
	}
	existing := map[string]string{"en": " /about "}

	got := runtime.resolveLocalizedPathsByLocale(
		context.Background(),
		state,
		deliveryCapability{TypeSlug: "page", Kind: "page"},
		record,
		existing,
		newSiteContentCache(),
	)

	if got["en"] != "/about" || got["es"] != "/sobre" {
		t.Fatalf("expected normalized localized paths, got %#v", got)
	}
	if existing["en"] != " /about " {
		t.Fatalf("expected existing map unchanged, got %#v", existing)
	}
}

func TestLocalizedAvailableLocalesIncludesLocalizedPathLocales(t *testing.T) {
	got := localizedAvailableLocales(
		[]string{"zh"},
		map[string]string{
			"en": "/?locale=en",
			"bo": "/bo",
			"zh": "/zh",
			"fr": "/fr",
			"es": "",
		},
		[]string{"en", "bo", "zh"},
	)

	if len(got) != 3 || got[0] != "bo" || got[1] != "en" || got[2] != "zh" {
		t.Fatalf("expected available locales enriched from localized paths, got %#v", got)
	}
}

func TestMapDeliveryRecordProjectsFieldsAndClonesData(t *testing.T) {
	record := admin.CMSContent{
		ID:                     "post-1",
		Title:                  "Site Runtime Rollout",
		Slug:                   "site-runtime-rollout",
		Status:                 "published",
		Locale:                 "en",
		RequestedLocale:        "es",
		ResolvedLocale:         "en",
		AvailableLocales:       []string{"en", "es"},
		FamilyID:               "post-family-1",
		MissingRequestedLocale: true,
		ContentType:            "post",
		ContentTypeSlug:        "post",
		Data: map[string]any{
			"path":             "/posts/site-runtime-rollout",
			"excerpt":          "Short summary",
			"body":             "Full content",
			"meta_title":       "Meta Title",
			"meta_description": "Meta Description",
			"preview_url":      "https://preview.example.com/posts/site-runtime-rollout",
		},
	}

	mapped := mapDeliveryRecord(record, deliveryCapability{TypeSlug: "post", Kind: "detail"})
	data, ok := mapped["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected projected data map, got %#v", mapped["data"])
	}
	data["excerpt"] = "mutated"

	if got := anyString(record.Data["excerpt"]); got != "Short summary" {
		t.Fatalf("expected original record data unchanged, got %q", got)
	}
	if got := anyString(mapped["path"]); got != "/posts/site-runtime-rollout" {
		t.Fatalf("expected projected path, got %q", got)
	}
	if got := anyString(mapped["summary"]); got != "Short summary" {
		t.Fatalf("expected projected summary, got %q", got)
	}
	if got := anyString(mapped["content"]); got != "Full content" {
		t.Fatalf("expected projected content, got %q", got)
	}
	if got := anyString(mapped["meta_title"]); got != "Meta Title" {
		t.Fatalf("expected projected meta title, got %q", got)
	}
	if got := anyString(mapped["preview_url"]); got != "https://preview.example.com/posts/site-runtime-rollout" {
		t.Fatalf("expected projected preview URL, got %q", got)
	}
	if got := anyString(mapped["family_id"]); got != "post-family-1" {
		t.Fatalf("expected projected family ID, got %q", got)
	}
}

func TestRecordDeliveryPathPrefersCanonicalContentPathFromMetadata(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "page", Kind: "page"}
	record := admin.CMSContent{
		Slug:     "home",
		Data:     map[string]any{},
		Metadata: map[string]any{"path": "/"},
	}
	if got := recordDeliveryPath(record, capability); got != "/" {
		t.Fatalf("expected canonical metadata path /, got %q", got)
	}
}

func TestRecordDeliveryPathAppliesContentTypePathPolicy(t *testing.T) {
	capability, ok := capabilityFromContentType(admin.CMSContentType{
		Name: "news",
		Slug: "news",
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "detail",
				"routes": map[string]any{
					"detail": "/news/:slug",
				},
				"path_policy": map[string]any{
					"allow_root":       false,
					"allowed_prefixes": []string{"/news"},
				},
			},
		},
	})
	if !ok {
		t.Fatalf("expected delivery capability to resolve")
	}

	externalPath := admin.CMSContent{
		Slug: "site-runtime-rollout",
		Data: map[string]any{"path": "https://example.com/phish"},
	}
	if got := recordDeliveryPath(externalPath, capability); got != "/news/site-runtime-rollout" {
		t.Fatalf("expected external URL path to be ignored and fallback to route path, got %q", got)
	}

	offPrefixPath := admin.CMSContent{
		Slug: "site-runtime-rollout",
		Data: map[string]any{"path": "/admin/secret"},
	}
	if got := recordDeliveryPath(offPrefixPath, capability); got != "/news/site-runtime-rollout" {
		t.Fatalf("expected disallowed prefix path to fallback to route path, got %q", got)
	}

	unrecoverable := admin.CMSContent{
		Data: map[string]any{"path": "/admin/secret"},
	}
	if got := recordDeliveryPath(unrecoverable, capability); got != "" {
		t.Fatalf("expected unrecoverable invalid path to be dropped, got %q", got)
	}
}
