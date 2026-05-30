package site

import (
	"context"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

type fixedContentTypeService struct {
	admin.CMSContentTypeService
	items []admin.CMSContentType
}

func (s *fixedContentTypeService) ContentTypes(context.Context) ([]admin.CMSContentType, error) {
	return append([]admin.CMSContentType{}, s.items...), nil
}

type quicksiteContentReadCall struct {
	locale        string
	contentTypeID string
	unscoped      bool
}

type trackingQuicksiteContentService struct {
	admin.CMSContentService
	typeIDToSlug map[string]string
	records      []admin.CMSContent
	calls        []quicksiteContentReadCall
	contentCalls int
}

func (s *trackingQuicksiteContentService) Contents(ctx context.Context, locale string) ([]admin.CMSContent, error) {
	s.calls = append(s.calls, quicksiteContentReadCall{locale: strings.TrimSpace(locale), unscoped: true})
	return s.filteredRecords("", locale), nil
}

func (s *trackingQuicksiteContentService) ContentsWithOptions(ctx context.Context, locale string, opts ...admin.CMSContentListOption) ([]admin.CMSContent, error) {
	contentTypeID := quicksiteContentTypeIDOption(opts)
	s.calls = append(s.calls, quicksiteContentReadCall{
		locale:        strings.TrimSpace(locale),
		contentTypeID: contentTypeID,
		unscoped:      contentTypeID == "",
	})
	return s.filteredRecords(contentTypeID, locale), nil
}

func (s *trackingQuicksiteContentService) Content(ctx context.Context, id, locale string) (*admin.CMSContent, error) {
	s.contentCalls++
	id = strings.TrimSpace(id)
	locale = strings.TrimSpace(locale)
	for _, record := range s.records {
		if strings.TrimSpace(record.ID) != id {
			continue
		}
		if locale != "" && record.Locale != "" && record.Locale != locale {
			continue
		}
		cp := record
		return &cp, nil
	}
	return nil, admin.ErrNotFound
}

func (s *trackingQuicksiteContentService) filteredRecords(contentTypeID, locale string) []admin.CMSContent {
	out := []admin.CMSContent{}
	for _, record := range s.records {
		if locale != "" && record.Locale != "" && record.Locale != locale {
			continue
		}
		if contentTypeID != "" && !s.recordMatchesContentTypeID(record, contentTypeID) {
			continue
		}
		out = append(out, record)
	}
	return out
}

func (s *trackingQuicksiteContentService) unscopedListCalls() []quicksiteContentReadCall {
	out := []quicksiteContentReadCall{}
	for _, call := range s.calls {
		if call.unscoped {
			out = append(out, call)
		}
	}
	return out
}

func quicksiteContentTypeIDOption(opts []admin.CMSContentListOption) string {
	const prefix = "content:list:content_type:"
	for _, opt := range opts {
		token := strings.TrimSpace(opt)
		if after, ok := strings.CutPrefix(token, prefix); ok {
			return strings.TrimSpace(after)
		}
	}
	return ""
}

func (s *trackingQuicksiteContentService) recordMatchesContentTypeID(record admin.CMSContent, contentTypeID string) bool {
	contentTypeID = strings.TrimSpace(contentTypeID)
	if contentTypeID == "" {
		return true
	}
	if strings.EqualFold(strings.TrimSpace(record.ContentType), contentTypeID) ||
		strings.EqualFold(strings.TrimSpace(record.ContentTypeSlug), contentTypeID) {
		return true
	}
	if s != nil {
		slug := strings.TrimSpace(s.typeIDToSlug[contentTypeID])
		return slug != "" && (strings.EqualFold(strings.TrimSpace(record.ContentType), slug) ||
			strings.EqualFold(strings.TrimSpace(record.ContentTypeSlug), slug))
	}
	return false
}

func quicksiteDeliveryContentType(id, slug, kind, listRoute, detailRoute string) admin.CMSContentType {
	return admin.CMSContentType{
		ID:   id,
		Name: slug,
		Slug: slug,
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    kind,
				"routes": map[string]any{
					"list":   listRoute,
					"detail": detailRoute,
				},
			},
		},
	}
}

func TestDeliveryCapabilitiesSortsAndSkipsDisabledEntries(t *testing.T) {
	runtime := &deliveryRuntime{
		contentTypeSvc: &fixedContentTypeService{
			items: []admin.CMSContentType{
				{
					Name: "post",
					Slug: "post",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "hybrid",
						},
					},
				},
				{
					Name: "page",
					Slug: "page",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": false,
							"kind":    "page",
						},
					},
				},
				{
					Name: "news",
					Slug: "news",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "collection",
						},
					},
				},
				{
					Name: "article",
					Slug: "article",
					Capabilities: map[string]any{
						"delivery": map[string]any{
							"enabled": true,
							"kind":    "detail",
						},
					},
				},
			},
		},
	}

	got, err := runtime.capabilities(context.Background())
	if err != nil {
		t.Fatalf("capabilities returned error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected three enabled delivery capabilities, got %+v", got)
	}
	if got[0].TypeSlug != "article" || got[1].TypeSlug != "news" || got[2].TypeSlug != "post" {
		t.Fatalf("expected capabilities sorted by type slug, got %+v", got)
	}
}

func TestDeliveryRecordsByTypeFiltersByCapabilityAndVisibility(t *testing.T) {
	runtime := &deliveryRuntime{}
	capabilities := []deliveryCapability{
		{TypeSlug: "page", Kind: "page"},
		{TypeSlug: "post", Kind: "detail"},
	}
	contents := []admin.CMSContent{
		{
			ID:              "page-published",
			Slug:            "about",
			Locale:          "en",
			Status:          "published",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "page-draft",
			Slug:            "draft",
			Locale:          "en",
			Status:          "draft",
			ContentType:     "page",
			ContentTypeSlug: "page",
		},
		{
			ID:              "post-published",
			Slug:            "hello",
			Locale:          "en",
			Status:          "published",
			ContentType:     "post",
			ContentTypeSlug: "post",
		},
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
	}

	got := runtime.recordsByType(capabilities, contents, state)

	if len(got["page"]) != 1 || got["page"][0].ID != "page-published" {
		t.Fatalf("expected only visible page record, got %+v", got["page"])
	}
	if len(got["post"]) != 1 || got["post"][0].ID != "post-published" {
		t.Fatalf("expected visible post record, got %+v", got["post"])
	}
}

func TestDeliveryCandidateCapabilitiesClassifyWithoutLoadingRecords(t *testing.T) {
	capabilities := []deliveryCapability{
		{TypeID: "ct-page", TypeSlug: "page", Kind: "page"},
		{TypeID: "ct-guide", TypeSlug: "guide", Kind: "hybrid", ListRoute: "/guides", DetailRoute: "/guides/:slug"},
		{TypeID: "ct-event", TypeSlug: "event", Kind: "detail", DetailRoute: "/events/:slug"},
		{TypeID: "ct-news", TypeSlug: "news", Kind: "collection", ListRoute: "/news"},
	}

	pageCandidates := pageCandidateCapabilities(capabilities, "/guides/start")
	if len(pageCandidates) != 1 || pageCandidates[0].TypeSlug != "page" {
		t.Fatalf("expected only page candidate, got %+v", pageCandidates)
	}

	detailCandidates := detailCandidateCapabilities(capabilities, "/guides/start")
	if len(detailCandidates) != 1 || detailCandidates[0].TypeSlug != "guide" {
		t.Fatalf("expected guide detail candidate, got %+v", detailCandidates)
	}

	collectionCandidates := collectionCandidateCapabilities(capabilities, "/guides")
	if len(collectionCandidates) != 1 || collectionCandidates[0].TypeSlug != "guide" {
		t.Fatalf("expected guide collection candidate, got %+v", collectionCandidates)
	}

	unmatchedDetail := detailCandidateCapabilities(capabilities, "/missing")
	if len(unmatchedDetail) != 0 {
		t.Fatalf("expected no detail candidates for unmatched path, got %+v", unmatchedDetail)
	}
}

func TestPreviewCandidateCapabilitiesMatchPreviewEntity(t *testing.T) {
	capabilities := []deliveryCapability{
		{TypeID: "ct-page", TypeSlug: "page", Kind: "page"},
		{TypeID: "ct-guide", TypeSlug: "guide", Kind: "hybrid"},
	}
	state := RequestState{
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "guides",
		PreviewContentID:    "guide-draft",
	}

	candidates := previewCandidateCapabilities(capabilities, state)
	if len(candidates) != 1 || candidates[0].TypeSlug != "guide" {
		t.Fatalf("expected guide preview candidate, got %+v", candidates)
	}

	state.PreviewTokenValid = false
	if invalid := previewCandidateCapabilities(capabilities, state); len(invalid) != 0 {
		t.Fatalf("expected invalid preview state to produce no candidates, got %+v", invalid)
	}
}

func TestDeliveryResolveUsesPreviewFallbackAfterRouteMisses(t *testing.T) {
	content := admin.NewInMemoryContentService()
	_, err := content.CreateContentType(context.Background(), admin.CMSContentType{
		ID:   "page-type",
		Name: "page",
		Slug: "page",
		Schema: map[string]any{
			"type":       "object",
			"properties": map[string]any{},
		},
		Capabilities: map[string]any{
			"delivery": map[string]any{
				"enabled": true,
				"kind":    "page",
			},
		},
	})
	if err != nil {
		t.Fatalf("create content type page: %v", err)
	}
	_, err = content.CreateContent(context.Background(), admin.CMSContent{
		ID:              "page-draft-home",
		Slug:            "home",
		Title:           "Home Draft",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
	})
	if err != nil {
		t.Fatalf("create content page-draft-home: %v", err)
	}

	runtime := newDeliveryRuntime(
		ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		nil,
		content,
		content,
	)
	if runtime == nil {
		t.Fatalf("expected delivery runtime instance")
	}
	state := RequestState{
		Locale:              "en",
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en"},
		AllowLocaleFallback: true,
		PreviewTokenPresent: true,
		PreviewTokenValid:   true,
		IsPreview:           true,
		PreviewEntityType:   "pages",
		PreviewContentID:    "page-draft-home",
	}

	resolution, siteErr := runtime.resolve(context.Background(), state, "/", newSiteContentCache())
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve / unexpected error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "page-draft-home" {
		t.Fatalf("expected preview fallback resolution, got %+v", resolution)
	}
}

func TestDeliveryResolveAvoidsUnscopedContentListsForPublicRoutes(t *testing.T) {
	tests := []struct {
		name        string
		requestPath string
		state       RequestState
		wantMode    string
	}{
		{
			name:        "homepage",
			requestPath: "/",
			state:       quicksiteScopedReadState("en"),
			wantMode:    "homepage",
		},
		{
			name:        "detail",
			requestPath: "/guides/start",
			state:       quicksiteScopedReadState("en"),
			wantMode:    "detail",
		},
		{
			name:        "collection",
			requestPath: "/guides",
			state:       quicksiteScopedReadState("en"),
			wantMode:    "collection",
		},
		{
			name:        "not-found",
			requestPath: "/missing",
			state:       quicksiteScopedReadState("en"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			runtime, tracker := newQuicksiteScopedReadRuntime(false)
			resolution, siteErr := runtime.resolve(context.Background(), tc.state, tc.requestPath, newSiteContentCache())
			if hasSiteRuntimeError(siteErr) {
				t.Fatalf("resolve %s unexpected error %+v", tc.requestPath, siteErr)
			}
			if tc.wantMode != "" {
				if resolution == nil || resolution.Mode != tc.wantMode {
					t.Fatalf("expected %s resolution, got %+v", tc.wantMode, resolution)
				}
			} else if resolution != nil {
				t.Fatalf("expected no resolution for not-found path, got %+v", resolution)
			}
			if calls := tracker.unscopedListCalls(); len(calls) != 0 {
				t.Fatalf("expected no unscoped content list calls, got %+v", calls)
			}
		})
	}
}

func TestDeliveryResolveAvoidsUnscopedContentListsForPreviewFallback(t *testing.T) {
	runtime, tracker := newQuicksiteScopedReadRuntime(false)
	state := quicksiteScopedReadState("en")
	state.PreviewTokenPresent = true
	state.PreviewTokenValid = true
	state.IsPreview = true
	state.PreviewEntityType = "guides"
	state.PreviewContentID = "guide-draft"

	resolution, siteErr := runtime.resolve(context.Background(), state, "/not-a-preview-route", newSiteContentCache())
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve preview fallback unexpected error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "guide-draft" {
		t.Fatalf("expected guide preview resolution, got %+v", resolution)
	}
	if calls := tracker.unscopedListCalls(); len(calls) != 0 {
		t.Fatalf("expected no unscoped content list calls, got %+v", calls)
	}
	if tracker.contentCalls != 1 {
		t.Fatalf("expected direct preview content lookup, got %d calls", tracker.contentCalls)
	}
}

func TestDeliveryResolveAvoidsUnscopedContentListsForLocalizedAliasFallback(t *testing.T) {
	runtime, tracker := newQuicksiteScopedReadRuntime(true)
	state := quicksiteScopedReadState("es")
	state.DefaultLocale = "en"
	state.SupportedLocales = []string{"en", "es"}

	resolution, siteErr := runtime.resolve(context.Background(), state, "/about", newSiteContentCache())
	if hasSiteRuntimeError(siteErr) {
		t.Fatalf("resolve localized alias unexpected error %+v", siteErr)
	}
	if resolution == nil || resolution.Record == nil || resolution.Record.ID != "page-about-es" {
		t.Fatalf("expected localized alias to resolve es page, got %+v", resolution)
	}
	if calls := tracker.unscopedListCalls(); len(calls) != 0 {
		t.Fatalf("expected no unscoped content list calls, got %+v", calls)
	}
}

func newQuicksiteScopedReadRuntime(enableI18N bool) (*deliveryRuntime, *trackingQuicksiteContentService) {
	cfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		SupportedLocales: []string{"en", "es"},
		Features: SiteFeatures{
			EnableI18N: &enableI18N,
		},
	})
	contentTypes := []admin.CMSContentType{
		quicksiteDeliveryContentType("ct-page", "page", "page", "", ""),
		quicksiteDeliveryContentType("ct-guide", "guide", "hybrid", "/guides", "/guides/:slug"),
		quicksiteDeliveryContentType("ct-event", "event", "detail", "/events", "/events/:slug"),
		quicksiteDeliveryContentType("ct-session", "session", "detail", "/sessions", "/sessions/:slug"),
	}
	tracker := &trackingQuicksiteContentService{
		typeIDToSlug: map[string]string{
			"ct-page":    "page",
			"ct-guide":   "guide",
			"ct-event":   "event",
			"ct-session": "session",
		},
		records: []admin.CMSContent{
			{
				ID:              "page-home",
				Slug:            "home",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				Data:            map[string]any{"path": "/"},
			},
			{
				ID:              "page-about-es",
				FamilyID:        "page-about",
				Slug:            "sobre",
				Locale:          "es",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				RouteKey:        "pages/about",
				Data:            map[string]any{"path": "/sobre"},
			},
			{
				ID:              "page-about-en",
				FamilyID:        "page-about",
				Slug:            "about",
				Locale:          "en",
				Status:          "published",
				ContentType:     "page",
				ContentTypeSlug: "page",
				RouteKey:        "pages/about",
				Data:            map[string]any{"path": "/about"},
			},
			{
				ID:              "guide-start",
				Slug:            "start",
				Locale:          "en",
				Status:          "published",
				ContentType:     "guide",
				ContentTypeSlug: "guide",
				Data:            map[string]any{"path": "/guides/start"},
			},
			{
				ID:              "guide-draft",
				Slug:            "draft",
				Locale:          "en",
				Status:          "draft",
				ContentType:     "guide",
				ContentTypeSlug: "guide",
				Data:            map[string]any{"path": "/guides/draft"},
			},
			{
				ID:              "event-large-archive",
				Slug:            "archive",
				Locale:          "en",
				Status:          "published",
				ContentType:     "event",
				ContentTypeSlug: "event",
				Data:            map[string]any{"path": "/events/archive"},
			},
			{
				ID:              "session-large-archive",
				Slug:            "archive-session",
				Locale:          "en",
				Status:          "published",
				ContentType:     "session",
				ContentTypeSlug: "session",
				Data:            map[string]any{"path": "/sessions/archive-session"},
			},
		},
	}
	return &deliveryRuntime{
		siteCfg:        cfg,
		contentSvc:     tracker,
		contentTypeSvc: &fixedContentTypeService{items: contentTypes},
	}, tracker
}

func quicksiteScopedReadState(locale string) RequestState {
	return RequestState{
		Locale:              locale,
		DefaultLocale:       "en",
		SupportedLocales:    []string{"en", "es"},
		AllowLocaleFallback: true,
	}
}
