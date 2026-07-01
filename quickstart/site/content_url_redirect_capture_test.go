package site

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestCaptureContentURLRedirectRecordsPublishedPathChange(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	oldContent := testRedirectCaptureContent("page-1", "page", "/old")
	newContent := testRedirectCaptureContent("page-1", "page", "/new")

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:    ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:    oldContent,
		NewContent:    newContent,
		ContentType:   testDeliveryPathContentType("page-type", "page", "page", "", ""),
		StatusCode:    http.StatusFound,
		Reason:        "content_update",
		Recorder:      recorder,
		Metadata:      map[string]any{"source": "test"},
		IncludeBase:   true,
		IncludeLocale: true,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Recorded || result.Skipped {
		t.Fatalf("expected recorded redirect, got %+v", result)
	}
	if recorder.calls != 1 {
		t.Fatalf("expected one recorder call, got %d", recorder.calls)
	}
	if recorder.lastChange.OldPath != "/old" || recorder.lastChange.NewPath != "/new" {
		t.Fatalf("expected old/new paths /old -> /new, got %+v", recorder.lastChange)
	}
	if recorder.lastChange.StatusCode != http.StatusFound {
		t.Fatalf("expected stored status 302, got %d", recorder.lastChange.StatusCode)
	}
	if recorder.lastChange.Metadata["source"] != "test" {
		t.Fatalf("expected metadata to be copied, got %+v", recorder.lastChange.Metadata)
	}
}

func TestCaptureContentURLRedirectDefaultsToRuntimePublicPaths(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	enabled := true
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{
		BasePath:         "/site",
		SupportedLocales: []string{"en", "es"},
		LocalePrefixMode: LocalePrefixAlways,
		Features: SiteFeatures{
			EnableI18N: &enabled,
		},
	})
	oldContent := testRedirectCaptureContent("page-1", "page", "/old")
	oldContent.Locale = "es"
	newContent := testRedirectCaptureContent("page-1", "page", "/new")
	newContent.Locale = "es"

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:  siteCfg,
		OldContent:  oldContent,
		NewContent:  newContent,
		ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:    recorder,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Recorded {
		t.Fatalf("expected redirect to be recorded, got %+v", result)
	}
	if recorder.lastChange.OldPath != "/site/es/old" || recorder.lastChange.NewPath != "/site/es/new" {
		t.Fatalf("expected runtime-public redirect /site/es/old -> /site/es/new, got %+v", recorder.lastChange)
	}
}

func TestCaptureContentURLRedirectExplicitPathShapeUsesCallerFlags(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	siteCfg := ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{BasePath: "/site"})

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:  siteCfg,
		OldContent:  testRedirectCaptureContent("page-1", "page", "/old"),
		NewContent:  testRedirectCaptureContent("page-1", "page", "/new"),
		ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
		PathShape:   ContentURLRedirectPathExplicit,
		Recorder:    recorder,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Recorded {
		t.Fatalf("expected redirect to be recorded, got %+v", result)
	}
	if recorder.lastChange.OldPath != "/old" || recorder.lastChange.NewPath != "/new" {
		t.Fatalf("expected explicit canonical-shape redirect /old -> /new, got %+v", recorder.lastChange)
	}
}

func TestCaptureContentURLRedirectSkipsUnchangedAndNonPublicChanges(t *testing.T) {
	for _, tt := range []struct {
		name       string
		oldContent admin.CMSContent
		newContent admin.CMSContent
		reason     string
	}{
		{
			name:       "unchanged",
			oldContent: testRedirectCaptureContent("page-1", "page", "/same"),
			newContent: testRedirectCaptureContent("page-1", "page", "/same"),
			reason:     "unchanged_path",
		},
		{
			name:       "draft",
			oldContent: testRedirectCaptureContent("page-1", "page", "/old"),
			newContent: func() admin.CMSContent {
				content := testRedirectCaptureContent("page-1", "page", "/new")
				content.Status = "draft"
				return content
			}(),
			reason: "not_public",
		},
		{
			name:       "reserved",
			oldContent: testRedirectCaptureContent("page-1", "page", "/admin/old"),
			newContent: testRedirectCaptureContent("page-1", "page", "/new"),
			reason:     "not_public_routable",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			recorder := &recordingContentURLRedirectRecorder{}
			result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
				SiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
				OldContent:  tt.oldContent,
				NewContent:  tt.newContent,
				ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
				Recorder:    recorder,
			})
			if err != nil {
				t.Fatalf("capture redirect: %v", err)
			}
			if !result.Skipped || result.SkipReason != tt.reason {
				t.Fatalf("expected skip reason %q, got %+v", tt.reason, result)
			}
			if recorder.calls != 0 {
				t.Fatalf("expected skipped capture not to call recorder, got %d", recorder.calls)
			}
		})
	}
}

func TestCaptureContentURLRedirectRecorderErrorPolicy(t *testing.T) {
	recorderErr := errors.New("recorder offline")
	oldContent := testRedirectCaptureContent("page-1", "page", "/old")
	newContent := testRedirectCaptureContent("page-1", "page", "/new")

	_, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:  oldContent,
		NewContent:  newContent,
		ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:    &recordingContentURLRedirectRecorder{err: recorderErr},
	})
	if !errors.Is(err, recorderErr) {
		t.Fatalf("expected recorder error to be returned, got %v", err)
	}

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:              ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:              oldContent,
		NewContent:              newContent,
		ContentType:             testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:                &recordingContentURLRedirectRecorder{err: recorderErr},
		ContinueOnRecorderError: true,
	})
	if err != nil {
		t.Fatalf("expected continue-on-error to suppress recorder error, got %v", err)
	}
	if !errors.Is(result.RecordError, recorderErr) {
		t.Fatalf("expected result to carry recorder error, got %+v", result)
	}
}

func TestCaptureContentURLRedirectCallsChainUpdaterWhenAvailable(t *testing.T) {
	chain := &recordingContentURLRedirectChainUpdater{}
	oldContent := testRedirectCaptureContent("page-1", "page", "/old")
	newContent := testRedirectCaptureContent("page-1", "page", "/new")

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:   ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:   oldContent,
		NewContent:   newContent,
		ContentType:  testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:     &recordingContentURLRedirectRecorder{},
		ChainUpdater: chain,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Recorded || result.ChainStatus != "flattened" {
		t.Fatalf("expected recorded redirect with flattened chain status, got %+v", result)
	}
	if chain.calls != 1 || chain.lastChange.OldPath != "/old" || chain.lastChange.NewPath != "/new" {
		t.Fatalf("expected chain updater to receive /old -> /new, got calls=%d change=%+v", chain.calls, chain.lastChange)
	}

	result, err = CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:  oldContent,
		NewContent:  newContent,
		ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:    &recordingContentURLRedirectRecorder{},
	})
	if err != nil {
		t.Fatalf("capture redirect without chain updater: %v", err)
	}
	if !result.Recorded || result.ChainStatus != "skipped" {
		t.Fatalf("expected missing chain updater to skip by capability without blocking, got %+v", result)
	}
}

func TestCaptureContentURLRedirectRequiresChainUpdaterWhenConfigured(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:  testRedirectCaptureContent("page-1", "page", "/old"),
		NewContent:  testRedirectCaptureContent("page-1", "page", "/new"),
		ContentType: testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:    recorder,
		ChainPolicy: ContentURLRedirectChainRequired,
	})
	if !errors.Is(err, ErrContentURLRedirectChainUpdaterRequired) {
		t.Fatalf("expected missing required chain updater error, got %v", err)
	}
	if result.Recorded || result.ChainStatus != "required_missing" || !errors.Is(result.ChainError, ErrContentURLRedirectChainUpdaterRequired) {
		t.Fatalf("expected unrecorded required-chain failure, got %+v", result)
	}
	if recorder.calls != 0 {
		t.Fatalf("expected required-chain failure to avoid recorder call, got %d", recorder.calls)
	}
}

func TestCaptureContentURLRedirectReportsSourceOwnerConflict(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	ownerLookup := &recordingContentURLRedirectSourceOwnerLookup{
		owner: &ContentURLRedirectSourceOwner{
			ContentID:       "other-page",
			ContentTypeSlug: "page",
			Locale:          "en",
		},
	}

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:        testRedirectCaptureContent("page-1", "page", "/old"),
		NewContent:        testRedirectCaptureContent("page-1", "page", "/new"),
		ContentType:       testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:          recorder,
		SourceOwnerLookup: ownerLookup,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Skipped || result.SkipReason != "source_owner_conflict" {
		t.Fatalf("expected source owner conflict skip, got %+v", result)
	}
	if result.SourceOwner == nil || result.SourceOwner.ContentID != "other-page" {
		t.Fatalf("expected conflicting owner metadata, got %+v", result.SourceOwner)
	}
	if recorder.calls != 0 {
		t.Fatalf("expected conflict to avoid recorder call, got %d", recorder.calls)
	}
	if ownerLookup.calls != 1 || ownerLookup.lastLookup.Path != "/old" {
		t.Fatalf("expected owner lookup for /old, got calls=%d lookup=%+v", ownerLookup.calls, ownerLookup.lastLookup)
	}
}

func TestCaptureContentURLRedirectReportsSourceOwnerScopeConflict(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	ownerLookup := &recordingContentURLRedirectSourceOwnerLookup{
		owner: &ContentURLRedirectSourceOwner{
			ContentID:       "page-1",
			ContentTypeSlug: "page",
			Locale:          "fr",
			ContentChannel:  "live",
		},
	}

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:        testRedirectCaptureContent("page-1", "page", "/old"),
		NewContent:        testRedirectCaptureContent("page-1", "page", "/new"),
		ContentType:       testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Locale:            "en",
		ContentChannel:    "live",
		Recorder:          recorder,
		SourceOwnerLookup: ownerLookup,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Skipped || result.SkipReason != "source_owner_conflict" {
		t.Fatalf("expected same-id different-locale owner conflict, got %+v", result)
	}
	if recorder.calls != 0 {
		t.Fatalf("expected scope conflict to avoid recorder call, got %d", recorder.calls)
	}
}

func TestCaptureContentURLRedirectSourceOwnerKnownIdentityRequiresChangeProof(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	ownerLookup := &recordingContentURLRedirectSourceOwnerLookup{
		owner: &ContentURLRedirectSourceOwner{
			ContentID:       "page-1",
			ContentTypeSlug: "page",
			Locale:          "en",
		},
	}

	result, err := CaptureContentURLRedirect(context.Background(), ContentURLRedirectCaptureInput{
		SiteConfig:        ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		OldContent:        testRedirectCaptureContent("", "page", "/old"),
		NewContent:        testRedirectCaptureContent("", "page", "/new"),
		ContentType:       testDeliveryPathContentType("page-type", "page", "page", "", ""),
		Recorder:          recorder,
		SourceOwnerLookup: ownerLookup,
	})
	if err != nil {
		t.Fatalf("capture redirect: %v", err)
	}
	if !result.Skipped || result.SkipReason != "source_owner_conflict" {
		t.Fatalf("expected missing content ID proof to conflict, got %+v", result)
	}
	if recorder.calls != 0 {
		t.Fatalf("expected source owner conflict to avoid recorder call, got %d", recorder.calls)
	}
}

func TestCaptureContentURLRedirectBulkRecordsRouteTemplateChanges(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	oldType := testDeliveryPathContentType("post-type", "post", "detail", "", "/posts/:slug")
	newType := testDeliveryPathContentType("post-type", "post", "detail", "", "/articles/:slug")
	content := admin.CMSContent{
		ID:              "post-1",
		Slug:            "hello",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
	}

	result, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		AfterSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		Recorder:         recorder,
		Mode:             ContentURLRedirectBulkBestEffort,
		Reason:           "route_template_change",
		Items: []ContentURLRedirectBulkItem{{
			OldContent:     content,
			NewContent:     content,
			OldContentType: oldType,
			NewContentType: newType,
		}},
	})
	if err != nil {
		t.Fatalf("bulk capture: %v", err)
	}
	if result.Recorded != 1 || result.Processed != 1 || len(result.Items) != 1 {
		t.Fatalf("expected one recorded item, got %+v", result)
	}
	if recorder.lastChange.OldPath != "/posts/hello" || recorder.lastChange.NewPath != "/articles/hello" {
		t.Fatalf("expected route-template redirect /posts/hello -> /articles/hello, got %+v", recorder.lastChange)
	}
}

func TestCaptureContentURLRedirectBulkRecordsBasePathChanges(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	contentType := testDeliveryPathContentType("page-type", "page", "page", "", "")
	content := testRedirectCaptureContent("page-1", "page", "/about")

	result, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{BasePath: "/old-site"}),
		AfterSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{BasePath: "/new-site"}),
		Recorder:         recorder,
		Mode:             ContentURLRedirectBulkBestEffort,
		Items: []ContentURLRedirectBulkItem{{
			OldContent:     content,
			NewContent:     content,
			OldContentType: contentType,
			NewContentType: contentType,
		}},
	})
	if err != nil {
		t.Fatalf("bulk capture: %v", err)
	}
	if result.Recorded != 1 {
		t.Fatalf("expected base-path move to be recorded, got %+v", result)
	}
	if recorder.lastChange.OldPath != "/old-site/about" || recorder.lastChange.NewPath != "/new-site/about" {
		t.Fatalf("expected base-path redirect /old-site/about -> /new-site/about, got %+v", recorder.lastChange)
	}
}

func TestCaptureContentURLRedirectBulkRecordsContentChannelMoves(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	ownerLookup := &recordingContentURLRedirectSourceOwnerLookup{}
	oldType := testDeliveryPathContentType("post-type", "post", "detail", "", "/legacy/:slug")
	newType := testDeliveryPathContentType("post-type", "post", "detail", "", "/live/:slug")
	content := admin.CMSContent{
		ID:              "post-1",
		Slug:            "hello",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
	}

	result, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{ContentChannel: "legacy"}),
		AfterSiteConfig:   ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{ContentChannel: "live"}),
		Recorder:          recorder,
		SourceOwnerLookup: ownerLookup,
		Mode:              ContentURLRedirectBulkBestEffort,
		Items: []ContentURLRedirectBulkItem{{
			OldContent:     content,
			NewContent:     content,
			OldContentType: oldType,
			NewContentType: newType,
		}},
	})
	if err != nil {
		t.Fatalf("bulk capture: %v", err)
	}
	if result.Recorded != 1 {
		t.Fatalf("expected channel move to be recorded, got %+v", result)
	}
	if recorder.lastChange.OldPath != "/legacy/hello" || recorder.lastChange.NewPath != "/live/hello" {
		t.Fatalf("expected channel move redirect /legacy/hello -> /live/hello, got %+v", recorder.lastChange)
	}
	if recorder.lastChange.OldContentChannel != "legacy" || recorder.lastChange.NewContentChannel != "live" || recorder.lastChange.ContentChannel != "live" {
		t.Fatalf("expected channel move metadata legacy -> live, got %+v", recorder.lastChange)
	}
	if ownerLookup.calls != 2 || len(ownerLookup.lookups) != 2 {
		t.Fatalf("expected owner lookup in both channel scopes, got calls=%d lookups=%+v", ownerLookup.calls, ownerLookup.lookups)
	}
	if ownerLookup.lookups[0].ContentChannel != "legacy" || ownerLookup.lookups[1].ContentChannel != "live" {
		t.Fatalf("expected owner lookup channels legacy and live, got %+v", ownerLookup.lookups)
	}
}

func TestCaptureContentURLRedirectBulkRequiresChainUpdaterWhenConfigured(t *testing.T) {
	recorder := &recordingContentURLRedirectRecorder{}
	oldType := testDeliveryPathContentType("post-type", "post", "detail", "", "/posts/:slug")
	newType := testDeliveryPathContentType("post-type", "post", "detail", "", "/articles/:slug")
	content := admin.CMSContent{
		ID:              "post-1",
		Slug:            "hello",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
	}

	result, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		AfterSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		Recorder:         recorder,
		Mode:             ContentURLRedirectBulkBestEffort,
		ChainPolicy:      ContentURLRedirectChainRequired,
		Items: []ContentURLRedirectBulkItem{{
			OldContent:     content,
			NewContent:     content,
			OldContentType: oldType,
			NewContentType: newType,
		}},
	})
	if err != nil {
		t.Fatalf("best-effort bulk capture should report item failure without returning error, got %v", err)
	}
	if result.Failed != 1 || result.Recorded != 0 || len(result.Items) != 1 {
		t.Fatalf("expected required-chain item failure, got %+v", result)
	}
	if !errors.Is(result.Items[0].Error, ErrContentURLRedirectChainUpdaterRequired) {
		t.Fatalf("expected item to carry required-chain error, got %+v", result.Items[0])
	}
	if recorder.calls != 0 {
		t.Fatalf("expected required-chain failure to avoid recorder call, got %d", recorder.calls)
	}
}

func TestCaptureContentURLRedirectBulkBestEffortAndFailFast(t *testing.T) {
	oldType := testDeliveryPathContentType("post-type", "post", "detail", "", "/posts/:slug")
	newType := testDeliveryPathContentType("post-type", "post", "detail", "", "/articles/:slug")
	validContent := admin.CMSContent{
		ID:              "post-1",
		Slug:            "hello",
		Locale:          "en",
		Status:          "published",
		ContentType:     "post",
		ContentTypeSlug: "post",
	}
	invalidType := admin.CMSContentType{ID: "invalid", Slug: "invalid"}
	items := []ContentURLRedirectBulkItem{
		{OldContent: validContent, NewContent: validContent, OldContentType: oldType, NewContentType: newType},
		{OldContent: validContent, NewContent: validContent, OldContentType: invalidType, NewContentType: invalidType},
		{OldContent: validContent, NewContent: validContent, OldContentType: oldType, NewContentType: newType},
	}

	bestEffort, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		AfterSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		Recorder:         &recordingContentURLRedirectRecorder{},
		Mode:             ContentURLRedirectBulkBestEffort,
		Items:            items,
	})
	if err != nil {
		t.Fatalf("best-effort bulk capture should not return item error, got %v", err)
	}
	if bestEffort.Processed != 3 || bestEffort.Recorded != 2 || bestEffort.Failed != 1 {
		t.Fatalf("expected best-effort to continue after failure, got %+v", bestEffort)
	}

	failFast, err := CaptureContentURLRedirectBulk(context.Background(), ContentURLRedirectBulkCaptureInput{
		BeforeSiteConfig: ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		AfterSiteConfig:  ResolveSiteConfig(admin.Config{DefaultLocale: "en"}, SiteConfig{}),
		Recorder:         &recordingContentURLRedirectRecorder{},
		Mode:             ContentURLRedirectBulkFailFast,
		Items:            items,
	})
	if err == nil {
		t.Fatalf("expected fail-fast bulk capture to return item error")
	}
	if failFast.Processed != 2 || len(failFast.Items) != 2 {
		t.Fatalf("expected fail-fast to stop on second item, got %+v", failFast)
	}
}

func testRedirectCaptureContent(id, typeSlug, path string) admin.CMSContent {
	return admin.CMSContent{
		ID:              id,
		Slug:            strings.Trim(strings.TrimPrefix(path, "/"), "/"),
		Locale:          "en",
		Status:          "published",
		ContentType:     typeSlug,
		ContentTypeSlug: typeSlug,
		Data:            map[string]any{"path": path},
	}
}

type recordingContentURLRedirectRecorder struct {
	calls      int
	lastChange ContentURLRedirectChange
	err        error
}

func (r *recordingContentURLRedirectRecorder) RecordContentURLRedirect(_ context.Context, change ContentURLRedirectChange) (*ContentURLRedirect, error) {
	r.calls++
	r.lastChange = change
	if r.err != nil {
		return nil, r.err
	}
	return &ContentURLRedirect{
		SourcePath: change.OldPath,
		TargetPath: change.NewPath,
		StatusCode: change.StatusCode,
		Active:     true,
	}, nil
}

type recordingContentURLRedirectChainUpdater struct {
	calls      int
	lastChange ContentURLRedirectChange
	err        error
}

func (r *recordingContentURLRedirectChainUpdater) FlattenContentURLRedirectChain(_ context.Context, change ContentURLRedirectChange) error {
	r.calls++
	r.lastChange = change
	return r.err
}

type recordingContentURLRedirectSourceOwnerLookup struct {
	calls      int
	lastLookup ContentURLRedirectSourceOwnerLookup
	lookups    []ContentURLRedirectSourceOwnerLookup
	owner      *ContentURLRedirectSourceOwner
	err        error
}

func (r *recordingContentURLRedirectSourceOwnerLookup) LookupContentURLRedirectSourceOwner(_ context.Context, lookup ContentURLRedirectSourceOwnerLookup) (*ContentURLRedirectSourceOwner, error) {
	r.calls++
	r.lastLookup = lookup
	r.lookups = append(r.lookups, lookup)
	if r.err != nil {
		return nil, r.err
	}
	return r.owner, nil
}
