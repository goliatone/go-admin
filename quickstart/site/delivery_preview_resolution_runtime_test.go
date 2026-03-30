package site

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestPreviewFallbackCandidatesFilterByRecordIDAndEntityType(t *testing.T) {
	capability := deliveryCapability{TypeSlug: "page", Kind: "page"}
	state := RequestState{
		PreviewEntityType: "pages",
		PreviewContentID:  "page-draft-home",
	}
	records := []admin.CMSContent{
		{
			ID:              "page-draft-home",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "page-draft-home",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "page-other",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
	}

	candidates := previewFallbackCandidates(capability, records, state)
	if len(candidates) != 2 {
		t.Fatalf("expected two same-id preview fallback candidates, got %d", len(candidates))
	}
	for _, candidate := range candidates {
		if candidate.ID != "page-draft-home" || candidate.ContentTypeSlug != "page" {
			t.Fatalf("expected matching page candidates, got %+v", candidate)
		}
	}

	incompatibleState := state
	incompatibleState.PreviewEntityType = "posts"
	if incompatible := previewFallbackCandidates(capability, records, incompatibleState); len(incompatible) != 0 {
		t.Fatalf("expected incompatible preview entity type to skip candidates, got %+v", incompatible)
	}
}

func TestResolvePreviewFallbackByRecordIDReturnsTranslationMissingWhenFallbackDisabled(t *testing.T) {
	allowFallback := false
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{AllowLocaleFallback: &allowFallback}),
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: false,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "posts",
		PreviewContentID:    "post-draft-home",
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"post": {
			{
				ID:              "post-draft-home",
				Slug:            "hello-world",
				Locale:          "en",
				Status:          "draft",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/posts/hello-world"},
			},
		},
	}

	resolution, siteErr, matched := runtime.resolvePreviewFallbackByRecordID(capabilities, recordsByType, state)
	if !matched {
		t.Fatalf("expected preview fallback to match and surface translation-missing error")
	}
	if resolution != nil {
		t.Fatalf("expected nil resolution when translation-missing error is returned, got %+v", resolution)
	}
	if siteErr.Code != siteErrorCodeTranslationMissing || siteErr.Status != 404 {
		t.Fatalf("expected translation-missing site error, got %+v", siteErr)
	}
}

func TestResolvePreviewFallbackByRecordIDReturnsLocalizedPreviewResolution(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:              "es",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "posts",
		PreviewContentID:    "post-draft-home",
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "post", Kind: "detail", DetailRoute: "/posts/:slug"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"post": {
			{
				ID:              "post-draft-home",
				Slug:            "hello-world",
				Locale:          "en",
				Status:          "draft",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/posts/hello-world"},
			},
			{
				ID:              "post-draft-home",
				Slug:            "hola-mundo",
				Locale:          "es",
				Status:          "draft",
				ContentType:     "post",
				ContentTypeSlug: "post",
				Data:            map[string]any{"path": "/es/posts/hola-mundo"},
			},
		},
	}

	resolution, siteErr, matched := runtime.resolvePreviewFallbackByRecordID(capabilities, recordsByType, state)
	if !matched {
		t.Fatalf("expected preview fallback match")
	}
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("unexpected site error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil {
		t.Fatalf("expected preview fallback resolution, got %+v", resolution)
	}
	if resolution.Record.Locale != "es" || resolution.Record.ID != "post-draft-home" {
		t.Fatalf("expected localized preview record, got %+v", resolution.Record)
	}
	if resolution.ResolvedLocale != "es" || resolution.RequestedLocale != "es" {
		t.Fatalf("expected requested and resolved locale to stay es, got %+v", resolution)
	}
}

func TestResolvePreviewFallbackByRecordIDSkipsWhenPreviewStateInvalid(t *testing.T) {
	runtime := &deliveryRuntime{
		siteCfg: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
	}
	state := RequestState{
		Locale:            "en",
		DefaultLocale:     "en",
		SupportedLocales:  []string{"en"},
		PreviewTokenValid: true,
		IsPreview:         true,
		PreviewEntityType: "pages",
		PreviewContentID:  "page-draft-home",
	}
	capabilities := []deliveryCapability{
		{TypeSlug: "page", Kind: "page"},
	}
	recordsByType := map[string][]admin.CMSContent{
		"page": {
			{
				ID:              "page-draft-home",
				Locale:          "en",
				Status:          "draft",
				ContentType:     "page",
				ContentTypeSlug: "page",
			},
		},
	}

	resolution, siteErr, matched := runtime.resolvePreviewFallbackByRecordID(capabilities, recordsByType, state)
	if matched {
		t.Fatalf("expected invalid preview state to skip preview fallback, got resolution=%+v err=%+v", resolution, siteErr)
	}
}
