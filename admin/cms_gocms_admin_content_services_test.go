package admin

import (
	"context"
	"errors"
	"strings"
	"testing"

	auth "github.com/goliatone/go-auth"
	cms "github.com/goliatone/go-cms"
	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type stubGoCMSAdminContentReadService struct {
	listResp   []cms.AdminContentRecord
	familyResp cms.AdminContentFamilyListResult
	getResp    *cms.AdminContentRecord
	listOpts   cms.AdminContentListOptions
	familyOpts cms.AdminContentFamilyListOptions
	getOpts    cms.AdminContentGetOptions
	listErr    error
	familyErr  error
	getErr     error
	listCnt    int
	familyCnt  int
	getCnt     int
}

func mustGoCMSContentAdapter(t *testing.T, svc CMSContentService) *GoCMSContentAdapter {
	t.Helper()
	adapter, ok := svc.(*GoCMSContentAdapter)
	if !ok {
		t.Fatalf("expected *GoCMSContentAdapter, got %T", svc)
	}
	return adapter
}

func (s *stubGoCMSAdminContentReadService) List(_ context.Context, opts cms.AdminContentListOptions) ([]cms.AdminContentRecord, int, error) {
	s.listCnt++
	s.listOpts = opts
	if s.listErr != nil {
		return nil, 0, s.listErr
	}
	return append([]cms.AdminContentRecord{}, s.listResp...), len(s.listResp), nil
}

func (s *stubGoCMSAdminContentReadService) ListFamilies(_ context.Context, opts cms.AdminContentFamilyListOptions) (cms.AdminContentFamilyListResult, error) {
	s.familyCnt++
	s.familyOpts = opts
	if s.familyErr != nil {
		return cms.AdminContentFamilyListResult{}, s.familyErr
	}
	return s.familyResp, nil
}

func (s *stubGoCMSAdminContentReadService) Get(_ context.Context, _ string, opts cms.AdminContentGetOptions) (*cms.AdminContentRecord, error) {
	s.getCnt++
	s.getOpts = opts
	if s.getErr != nil {
		return nil, s.getErr
	}
	if s.getResp == nil {
		return nil, nil
	}
	record := *s.getResp
	return &record, nil
}

type stubGoCMSAdminContentWriteService struct {
	createResp            *cms.AdminContentRecord
	updateResp            *cms.AdminContentRecord
	updateTranslationResp *cms.AdminContentRecord
	createTranslationResp *cms.AdminContentRecord
	createReq             cms.AdminContentCreateRequest
	updateReq             cms.AdminContentUpdateRequest
	updateTranslationReq  cms.AdminContentUpdateTranslationRequest
	deleteReq             cms.AdminContentDeleteRequest
	createTranslationReq  cms.AdminContentCreateTranslationRequest
	createErr             error
	updateErr             error
	updateTranslationErr  error
	deleteErr             error
	createTranslationErr  error
	createCnt             int
	updateCnt             int
	updateTranslationCnt  int
	deleteCnt             int
	createTranslationCnt  int
}

func (s *stubGoCMSAdminContentWriteService) Create(_ context.Context, req cms.AdminContentCreateRequest) (*cms.AdminContentRecord, error) {
	s.createCnt++
	s.createReq = req
	if s.createErr != nil {
		return nil, s.createErr
	}
	if s.createResp == nil {
		return nil, nil
	}
	record := *s.createResp
	return &record, nil
}

func (s *stubGoCMSAdminContentWriteService) Update(_ context.Context, req cms.AdminContentUpdateRequest) (*cms.AdminContentRecord, error) {
	s.updateCnt++
	s.updateReq = req
	if s.updateErr != nil {
		return nil, s.updateErr
	}
	if s.updateResp == nil {
		return nil, nil
	}
	record := *s.updateResp
	return &record, nil
}

func (s *stubGoCMSAdminContentWriteService) UpdateTranslation(_ context.Context, req cms.AdminContentUpdateTranslationRequest) (*cms.AdminContentRecord, error) {
	s.updateTranslationCnt++
	s.updateTranslationReq = req
	if s.updateTranslationErr != nil {
		return nil, s.updateTranslationErr
	}
	if s.updateTranslationResp == nil {
		return nil, nil
	}
	record := *s.updateTranslationResp
	return &record, nil
}

func (s *stubGoCMSAdminContentWriteService) Delete(_ context.Context, req cms.AdminContentDeleteRequest) error {
	s.deleteCnt++
	s.deleteReq = req
	return s.deleteErr
}

func (s *stubGoCMSAdminContentWriteService) CreateTranslation(_ context.Context, req cms.AdminContentCreateTranslationRequest) (*cms.AdminContentRecord, error) {
	s.createTranslationCnt++
	s.createTranslationReq = req
	if s.createTranslationErr != nil {
		return nil, s.createTranslationErr
	}
	if s.createTranslationResp == nil {
		return nil, nil
	}
	record := *s.createTranslationResp
	return &record, nil
}

type stubGoCMSAdminContentWriteServiceWithoutTranslation struct {
	inner *stubGoCMSAdminContentWriteService
}

func (s *stubGoCMSAdminContentWriteServiceWithoutTranslation) Create(ctx context.Context, req cms.AdminContentCreateRequest) (*cms.AdminContentRecord, error) {
	return s.inner.Create(ctx, req)
}

func (s *stubGoCMSAdminContentWriteServiceWithoutTranslation) Update(ctx context.Context, req cms.AdminContentUpdateRequest) (*cms.AdminContentRecord, error) {
	return s.inner.Update(ctx, req)
}

func (s *stubGoCMSAdminContentWriteServiceWithoutTranslation) Delete(ctx context.Context, req cms.AdminContentDeleteRequest) error {
	return s.inner.Delete(ctx, req)
}

func (s *stubGoCMSAdminContentWriteServiceWithoutTranslation) CreateTranslation(ctx context.Context, req cms.AdminContentCreateTranslationRequest) (*cms.AdminContentRecord, error) {
	return s.inner.CreateTranslation(ctx, req)
}

type stubGoCMSBlockInstancesService struct {
	instances []*cmsblocks.Instance
}

func (stubGoCMSBlockInstancesService) ListDefinitions(context.Context, ...string) ([]*cmsblocks.Definition, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) RegisterDefinition(context.Context, cmsblocks.RegisterDefinitionInput) (*cmsblocks.Definition, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) UpdateDefinition(context.Context, cmsblocks.UpdateDefinitionInput) (*cmsblocks.Definition, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) DeleteDefinition(context.Context, cmsblocks.DeleteDefinitionRequest) error {
	return nil
}
func (stubGoCMSBlockInstancesService) ListDefinitionVersions(context.Context, uuid.UUID) ([]*cmsblocks.DefinitionVersion, error) {
	return nil, nil
}
func (s stubGoCMSBlockInstancesService) ListPageInstances(context.Context, uuid.UUID) ([]*cmsblocks.Instance, error) {
	return s.instances, nil
}
func (stubGoCMSBlockInstancesService) CreateInstance(context.Context, cmsblocks.CreateInstanceInput) (*cmsblocks.Instance, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) UpdateInstance(context.Context, cmsblocks.UpdateInstanceInput) (*cmsblocks.Instance, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) DeleteInstance(context.Context, cmsblocks.DeleteInstanceRequest) error {
	return nil
}
func (stubGoCMSBlockInstancesService) UpdateTranslation(context.Context, cmsblocks.UpdateTranslationInput) (*cmsblocks.Translation, error) {
	return nil, nil
}
func (stubGoCMSBlockInstancesService) AddTranslation(context.Context, cmsblocks.AddTranslationInput) (*cmsblocks.Translation, error) {
	return nil, nil
}

func TestGoCMSContentAdapterContentsUsesAdminContentReadService(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:                     contentID,
			FamilyID:               &familyID,
			Title:                  "Bonjour",
			Slug:                   "bonjour",
			Locale:                 "fr",
			RequestedLocale:        "fr",
			ResolvedLocale:         "fr",
			AvailableLocales:       []string{"en", "fr"},
			Navigation:             map[string]string{"header": "show"},
			EffectiveMenuLocations: []string{"header"},
			ContentType:            "page",
			ContentTypeSlug:        "page",
			Status:                 "draft",
			SchemaVersion:          "page/v1",
			Data:                   map[string]any{"body": "bonjour"},
			Metadata:               map[string]any{"path": "/bonjour"},
		}},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	items, err := adapter.Contents(ctx, "fr")
	if err != nil {
		t.Fatalf("contents failed: %v", err)
	}
	if adminRead.listCnt != 1 {
		t.Fatalf("expected one admin read call, got %d", adminRead.listCnt)
	}
	if len(contentSvc.listOptions) != 0 {
		t.Fatalf("expected raw list path to stay unused, got %v", contentSvc.listOptions)
	}
	if len(items) != 1 {
		t.Fatalf("expected one item, got %d", len(items))
	}
	if items[0].ID != contentID.String() {
		t.Fatalf("expected id %s, got %s", contentID.String(), items[0].ID)
	}
	if items[0].FamilyID != familyID.String() {
		t.Fatalf("expected family id %s, got %s", familyID.String(), items[0].FamilyID)
	}
	if items[0].Data["path"] != "/bonjour" {
		t.Fatalf("expected path injected into data, got %v", items[0].Data["path"])
	}
	if items[0].Data["_schema"] != "page/v1" {
		t.Fatalf("expected schema version in data, got %v", items[0].Data["_schema"])
	}
}

func TestGoCMSContentAdapterContentsWithContentTypeIDUsesAdminReadScope(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:              uuid.New(),
			Slug:            "home",
			Locale:          "en",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Status:          "published",
		}},
	}
	contentSvc := &stubGoCMSContentService{}
	typeSvc := newStubContentTypeService(CMSContentType{ID: contentTypeID.String(), Slug: "page"})
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	items, err := adapter.ContentsWithOptions(ctx, "en", WithTranslations(), WithContentTypeID(contentTypeID.String()))
	if err != nil {
		t.Fatalf("list scoped contents: %v", err)
	}
	if adminRead.listCnt != 1 {
		t.Fatalf("expected scoped content type read to use adminRead.List, got %d calls", adminRead.listCnt)
	}
	if got := strings.TrimSpace(adminRead.listOpts.ContentTypeID); got != contentTypeID.String() {
		t.Fatalf("expected admin read content type scope %s, got %q", contentTypeID, got)
	}
	if len(contentSvc.listOptions) != 0 {
		t.Fatalf("expected lower-level list to stay unused, got %v", contentSvc.listOptions)
	}
	if len(items) != 1 || items[0].ContentTypeSlug != "page" {
		t.Fatalf("expected only page content from scoped admin read, got %+v", items)
	}
}

func TestGoCMSContentAdapterUpdateContentUsesAdminTranslationWrite(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	contentTypeID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{
		updateTranslationResp: &cms.AdminContentRecord{
			ID:              contentID,
			FamilyID:        &familyID,
			Title:           "Updated BO",
			Locale:          "bo",
			ContentType:     "teaching_topic",
			ContentTypeSlug: "teaching_topic",
			Status:          "draft",
			Data:            map[string]any{"label": "Updated BO"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	typeSvc := newStubContentTypeService(CMSContentType{ID: contentTypeID.String(), Slug: "teaching_topic"})
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	updated, err := adapter.UpdateContent(ctx, CMSContent{
		ID:              contentID.String(),
		FamilyID:        familyID.String(),
		Locale:          "bo",
		Title:           "Updated BO",
		ContentType:     "teaching_topic",
		ContentTypeSlug: "teaching_topic",
		Data:            map[string]any{"label": "Updated BO"},
	})
	if err != nil {
		t.Fatalf("update content: %v", err)
	}
	if adminWrite.updateTranslationCnt != 1 {
		t.Fatalf("expected one admin translation update, got %d", adminWrite.updateTranslationCnt)
	}
	if adminWrite.updateCnt != 0 {
		t.Fatalf("expected full admin update to stay unused, got %d", adminWrite.updateCnt)
	}
	if got := adminWrite.updateTranslationReq.Locale; got != "bo" {
		t.Fatalf("expected bo locale update, got %q", got)
	}
	if got := updated.Title; got != "Updated BO" {
		t.Fatalf("expected updated projection title, got %q", got)
	}
}

func TestGoCMSContentAdapterUpdateContentWithoutAdminTranslationWriteUsesMergedLegacyUpdate(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	adminWriteInner := &stubGoCMSAdminContentWriteService{}
	adminWrite := &stubGoCMSAdminContentWriteServiceWithoutTranslation{inner: adminWriteInner}
	rawContent := &stubGoCMSContentService{
		getResp: &cmscontent.Content{
			ID:     contentID,
			Slug:   "lojong",
			Status: "draft",
			Type:   &cmscontent.ContentType{Slug: "teaching_topic"},
			Translations: []*cmscontent.ContentTranslation{
				{Locale: &cmscontent.Locale{Code: "en"}, FamilyID: &familyID, Title: "Lojong", Content: map[string]any{"label": "Lojong"}},
				{Locale: &cmscontent.Locale{Code: "bo"}, FamilyID: &familyID, Title: "Lojong BO", Content: map[string]any{"label": "Lojong BO"}},
				{Locale: &cmscontent.Locale{Code: "zh"}, FamilyID: &familyID, Title: "Lojong ZH", Content: map[string]any{"label": "Lojong ZH"}},
			},
		},
	}
	contentSvc := &stubGoCMSContentServiceWithoutTranslation{inner: rawContent}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, err := adapter.UpdateContent(ctx, CMSContent{
		ID:              contentID.String(),
		FamilyID:        familyID.String(),
		Locale:          "bo",
		Title:           "Updated BO",
		ContentType:     "teaching_topic",
		ContentTypeSlug: "teaching_topic",
		Data:            map[string]any{"label": "Updated BO"},
	})
	if err != nil {
		t.Fatalf("update content: %v", err)
	}
	if adminWriteInner.updateCnt != 0 {
		t.Fatalf("expected destructive admin update to stay unused, got %d", adminWriteInner.updateCnt)
	}
	if rawContent.updateReq.ID != contentID {
		t.Fatalf("expected merged legacy update for content %s, got %s", contentID, rawContent.updateReq.ID)
	}
	if len(rawContent.updateReq.Translations) != 3 {
		t.Fatalf("expected merged sibling translations, got %#v", rawContent.updateReq.Translations)
	}
	titles := map[string]string{}
	for _, translation := range rawContent.updateReq.Translations {
		titles[strings.ToLower(strings.TrimSpace(translation.Locale))] = translation.Title
	}
	if titles["en"] != "Lojong" || titles["bo"] != "Updated BO" || titles["zh"] != "Lojong ZH" {
		t.Fatalf("merged translation titles = %#v", titles)
	}
}

func TestGoCMSContentAdapterListContentTypeRecordsNormalizesLocaleWildcard(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:              uuid.New(),
			Slug:            "home",
			Locale:          "en",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Status:          "draft",
		}},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	rows, total, err := adapter.ListContentTypeRecords(ctx, CMSContentType{ID: contentTypeID.String(), Slug: "page"}, ListOptions{
		Page:    2,
		PerPage: 10,
		SortBy:  "slug",
		Search:  "home",
		Filters: map[string]any{
			"locale": "all",
			"status": "draft",
		},
	})
	if err != nil {
		t.Fatalf("list content type records: %v", err)
	}
	if adminRead.listCnt != 1 {
		t.Fatalf("expected one admin read call, got %d", adminRead.listCnt)
	}
	if adminRead.listOpts.Locale != "" {
		t.Fatalf("expected wildcard locale to be omitted, got %q", adminRead.listOpts.Locale)
	}
	if _, ok := adminRead.listOpts.Filters["locale"]; ok {
		t.Fatalf("expected locale filter to be omitted, got %+v", adminRead.listOpts.Filters)
	}
	if got := toString(adminRead.listOpts.Filters["status"]); got != "draft" {
		t.Fatalf("expected status filter to remain, got %q", got)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one row and total, got rows=%d total=%d", len(rows), total)
	}
}

func TestGoCMSContentAdapterListContentTypeRecordsPassesExplicitPredicatesToOptimizedRead(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, _, err := adapter.ListContentTypeRecords(ctx, CMSContentType{ID: contentTypeID.String(), Slug: "news"}, ListOptions{
		Filters: map[string]any{
			"locale":   "all",
			"status":   "archived",
			"group_by": "family_id",
		},
		Predicates: []ListPredicate{
			{Field: "locale", Operator: "eq", Values: []string{"en"}},
			{Field: "status", Operator: "in", Values: []string{"draft,published"}},
			{Field: "path", Operator: "ilike", Values: []string{"/bo/news"}},
			{Field: "group_by", Operator: "eq", Values: []string{"family_id"}},
		},
	})
	if err != nil {
		t.Fatalf("list content type records: %v", err)
	}
	if adminRead.listOpts.Locale != "en" {
		t.Fatalf("expected locale from explicit predicate, got %q", adminRead.listOpts.Locale)
	}
	if got := toString(adminRead.listOpts.Filters["locale"]); got != "en" {
		t.Fatalf("expected canonical locale filter from explicit predicate, got %q", got)
	}
	if _, ok := adminRead.listOpts.Filters["group_by"]; ok {
		t.Fatalf("expected group_by to stay out of optimized filters, got %+v", adminRead.listOpts.Filters)
	}
	statusValues, ok := adminRead.listOpts.Filters["status__in"].([]string)
	if !ok || strings.Join(statusValues, ",") != "draft,published" {
		t.Fatalf("expected canonical status__in values, got %#v", adminRead.listOpts.Filters["status__in"])
	}
	if got := toString(adminRead.listOpts.Filters["path__ilike"]); got != "/bo/news" {
		t.Fatalf("expected canonical path__ilike filter, got %q", got)
	}
	if got := toString(adminRead.listOpts.Filters["status"]); got != "" {
		t.Fatalf("expected raw filter map to be ignored when predicates are explicit, got %q", got)
	}
}

func TestGoCMSContentAdapterListContentTypeRecordsUsesPanelSlugForRowContentType(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:              uuid.New(),
			Slug:            "archive-event",
			Locale:          "en",
			ContentType:     "archive-event",
			ContentTypeSlug: "archive-event",
			Status:          "draft",
		}},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	rows, total, err := adapter.ListContentTypeRecords(ctx, CMSContentType{
		ID:   contentTypeID.String(),
		Slug: "archive-event",
		Capabilities: map[string]any{
			ContentTypeCapabilityKeyPanelSlug:     "archive_event",
			ContentTypeCapabilityKeySearchContent: "archive_event",
		},
	}, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list content type records: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one row, got total=%d rows=%#v", total, rows)
	}
	if got := toString(rows[0]["content_type"]); got != "archive_event" {
		t.Fatalf("expected canonical content_type archive_event, got %q", got)
	}
	if got := toString(rows[0]["content_type_slug"]); got != "archive_event" {
		t.Fatalf("expected canonical content_type_slug archive_event, got %q", got)
	}
}

func TestGoCMSContentAdapterListContentTypeRecordsDeclinesUnsupportedOptimizedRead(t *testing.T) {
	ctx := context.Background()
	adminRead := &stubGoCMSAdminContentReadService{
		listErr: cms.AdminContentFamilyReadUnsupportedError{Reason: "unsupported filter operator"},
	}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, _, err := adapter.ListContentTypeRecords(ctx, CMSContentType{
		ID:   uuid.New().String(),
		Slug: "news",
	}, ListOptions{
		Filters: map[string]any{"path__contains": "archive"},
	})
	if !errors.Is(err, errCountCapableContentTypeListUnsupported) {
		t.Fatalf("expected count-capable fallback error, got %v", err)
	}
}

func TestGoCMSContentAdapterListContentTypeFamiliesNormalizesLocaleWildcard(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		familyResp: cms.AdminContentFamilyListResult{FamilyTotal: 42},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	rows, total, err := adapter.ListContentTypeFamilies(ctx, CMSContentType{ID: contentTypeID.String(), Slug: "page"}, ListOptions{
		Page:    2,
		PerPage: 10,
		Filters: map[string]any{
			"locale": "all",
			"status": "draft",
		},
	})
	if err != nil {
		t.Fatalf("list content type families: %v", err)
	}
	if adminRead.familyCnt != 1 {
		t.Fatalf("expected one family read call, got %d", adminRead.familyCnt)
	}
	if adminRead.familyOpts.Locale != "" {
		t.Fatalf("expected wildcard locale to be omitted, got %q", adminRead.familyOpts.Locale)
	}
	if _, ok := adminRead.familyOpts.Filters["locale"]; ok {
		t.Fatalf("expected locale filter to be omitted, got %+v", adminRead.familyOpts.Filters)
	}
	if got := toString(adminRead.familyOpts.Filters["status"]); got != "draft" {
		t.Fatalf("expected status filter to remain, got %q", got)
	}
	if total != 42 || len(rows) != 0 {
		t.Fatalf("expected no rows and family total 42, got rows=%d total=%d", len(rows), total)
	}
}

func TestGoCMSContentAdapterListContentTypeFamiliesPassesExplicitPredicatesToOptimizedRead(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		familyResp: cms.AdminContentFamilyListResult{FamilyTotal: 1},
	}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, _, err := adapter.ListContentTypeFamilies(ctx, CMSContentType{ID: contentTypeID.String(), Slug: "news"}, ListOptions{
		Predicates: []ListPredicate{
			{Field: "locale", Operator: "eq", Values: []string{"bo"}},
			{Field: "path", Operator: "ilike", Values: []string{"/bo/news/archive"}},
			{Field: "group_by", Operator: "eq", Values: []string{"family_id"}},
		},
	})
	if err != nil {
		t.Fatalf("list content type families: %v", err)
	}
	if adminRead.familyOpts.Locale != "bo" {
		t.Fatalf("expected locale from explicit predicate, got %q", adminRead.familyOpts.Locale)
	}
	if _, ok := adminRead.familyOpts.Filters["group_by"]; ok {
		t.Fatalf("expected group_by to stay out of optimized family filters, got %+v", adminRead.familyOpts.Filters)
	}
	if got := toString(adminRead.familyOpts.Filters["path__ilike"]); got != "/bo/news/archive" {
		t.Fatalf("expected canonical path__ilike family filter, got %q", got)
	}
}

func TestGoCMSContentAdapterListContentTypeFamiliesUsesPanelSlugForGroupedRows(t *testing.T) {
	ctx := context.Background()
	contentTypeID := uuid.New()
	familyID := uuid.New().String()
	adminRead := &stubGoCMSAdminContentReadService{
		familyResp: cms.AdminContentFamilyListResult{
			FamilyTotal: 1,
			Families: []cms.AdminContentFamilyRecord{{
				FamilyID: familyID,
				Variants: []cms.AdminContentRecord{
					{
						ID:              uuid.New(),
						Slug:            "archive-event-en",
						Locale:          "en",
						ContentType:     "archive-event",
						ContentTypeSlug: "archive-event",
						Status:          "draft",
					},
					{
						ID:              uuid.New(),
						Slug:            "archive-event-bo",
						Locale:          "bo",
						ContentType:     "archive-event",
						ContentTypeSlug: "archive-event",
						Status:          "draft",
					},
				},
			}},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	rows, total, err := adapter.ListContentTypeFamilies(ctx, CMSContentType{
		ID:   contentTypeID.String(),
		Slug: "archive-event",
		Capabilities: map[string]any{
			ContentTypeCapabilityKeyPanelSlug:     "archive_event",
			ContentTypeCapabilityKeySearchContent: "archive_event",
		},
	}, ListOptions{Filters: map[string]any{"locale": "en"}})
	if err != nil {
		t.Fatalf("list content type families: %v", err)
	}
	if total != 1 || len(rows) != 1 {
		t.Fatalf("expected one grouped row, got total=%d rows=%#v", total, rows)
	}
	if got := toString(rows[0]["content_type"]); got != "archive_event" {
		t.Fatalf("expected grouped content_type archive_event, got %q", got)
	}
	if got := toString(rows[0]["content_type_slug"]); got != "archive_event" {
		t.Fatalf("expected grouped content_type_slug archive_event, got %q", got)
	}
	children, ok := rows[0]["children"].([]map[string]any)
	if !ok || len(children) != 2 {
		t.Fatalf("expected two canonical children, got %#v", rows[0]["children"])
	}
	for _, child := range children {
		if got := toString(child["content_type"]); got != "archive_event" {
			t.Fatalf("expected child content_type archive_event, got %q", got)
		}
		if got := toString(child["content_type_slug"]); got != "archive_event" {
			t.Fatalf("expected child content_type_slug archive_event, got %q", got)
		}
	}
}

func TestGoCMSContentAdapterContentsWithSupportedOptionsUsesAdminRead(t *testing.T) {
	ctx := context.Background()
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:              uuid.New(),
			Slug:            "home",
			Locale:          "en",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Status:          "published",
		}},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	if _, err := adapter.ContentsWithOptions(ctx, "en", WithTranslations(), WithDerivedFields()); err != nil {
		t.Fatalf("list contents with supported options: %v", err)
	}
	if adminRead.listCnt != 1 {
		t.Fatalf("expected supported option read to use adminRead.List, got %d calls", adminRead.listCnt)
	}
	if len(contentSvc.listOptions) != 0 {
		t.Fatalf("expected lower-level list to stay unused, got %v", contentSvc.listOptions)
	}
}

type optionAwareGoCMSContentService struct {
	*stubGoCMSContentService
}

func (s *optionAwareGoCMSContentService) SupportsContentListOption(option cmscontent.ContentListOption) bool {
	return strings.HasPrefix(string(option), "content:list:families:") &&
		!strings.HasSuffix(string(option), "families:")
}

func TestGoCMSContentAdapterNegotiatesDownstreamListOptionSupport(t *testing.T) {
	unsupported := mustGoCMSContentAdapter(t, newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, nil, nil))
	option := WithFamilyIDs(uuid.New().String(), uuid.New().String())
	if unsupported.SupportsContentListOption(option) {
		t.Fatal("adapter must not advertise an option absent from its downstream service")
	}

	supportedService := &optionAwareGoCMSContentService{stubGoCMSContentService: &stubGoCMSContentService{}}
	supported := mustGoCMSContentAdapter(t, newGoCMSContentAdapter(supportedService, nil, nil, nil, nil, nil, nil, nil))
	if !supported.SupportsContentListOption(option) {
		t.Fatal("adapter did not advertise downstream multi-family support")
	}
	if supported.SupportsContentListOption("content:list:families:") {
		t.Fatal("adapter advertised malformed multi-family option")
	}
}

func TestGoCMSContentAdapterContentsWithLocaleVariantsStillBypassesAdminRead(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	familyID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		listResp: []cms.AdminContentRecord{{
			ID:              uuid.New(),
			Slug:            "admin-fast-path",
			Locale:          "en",
			ContentType:     "news",
			ContentTypeSlug: "news",
			Status:          "published",
		}},
	}
	contentSvc := &stubGoCMSContentService{
		listWithDerived: []*cmscontent.Content{{
			ID:       contentID,
			Slug:     "breaking-news",
			Status:   "published",
			Type:     &cmscontent.ContentType{Slug: "news"},
			Metadata: map[string]any{"family_id": familyID.String()},
			Translations: []*cmscontent.ContentTranslation{
				{
					Locale:   &cmscontent.Locale{Code: "en"},
					FamilyID: &familyID,
					Title:    "Breaking News",
					Content:  map[string]any{"path": "/news/breaking-news"},
				},
				{
					Locale:   &cmscontent.Locale{Code: "es"},
					FamilyID: &familyID,
					Title:    "Noticias",
					Content:  map[string]any{"path": "/es/news/breaking-news"},
				},
			},
		}},
	}
	typeSvc := newStubContentTypeService(CMSContentType{ID: uuid.New().String(), Slug: "news"})
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	items, err := adapter.ContentsWithOptions(ctx, "all", WithTranslations(), WithDerivedFields(), WithLocaleVariants())
	if err != nil {
		t.Fatalf("list locale variants: %v", err)
	}
	if adminRead.listCnt != 0 {
		t.Fatalf("expected locale-variant read to bypass adminRead.List, got %d calls", adminRead.listCnt)
	}
	if len(items) != 2 {
		t.Fatalf("expected two locale variants from lower-level list, got %+v", items)
	}
	if !hasTranslationListOption(contentSvc.listOptions) || !hasDerivedProjectionListOption(contentSvc.listOptions) {
		t.Fatalf("expected translation and derived options on lower-level list, got %v", contentSvc.listOptions)
	}
}

func TestGoCMSContentAdapterContentAppliesLegacyFallbackAfterAdminRead(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	blockID := uuid.New()
	defID := uuid.New()
	adminRead := &stubGoCMSAdminContentReadService{
		getResp: &cms.AdminContentRecord{
			ID:              contentID,
			Title:           "Hello",
			Slug:            "hello",
			Locale:          "en",
			ContentType:     "post",
			ContentTypeSlug: "post",
			Status:          "draft",
			Data:            map[string]any{"body": "hello"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	blockSvc := stubGoCMSBlockInstancesService{
		instances: []*cmsblocks.Instance{{
			ID:           blockID,
			DefinitionID: defID,
			PageID:       &contentID,
			Region:       "main",
			Position:     1,
			Translations: []*cmsblocks.Translation{{
				Content: map[string]any{"headline": "Hero"},
			}},
		}},
	}
	svc := newGoCMSContentAdapter(contentSvc, blockSvc, nil, nil, adminRead, nil, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)
	adapter.blockDefinitionCache.Publish(map[string]uuid.UUID{"hero": defID}, map[uuid.UUID]string{defID: "hero"})

	item, err := adapter.Content(ctx, contentID.String(), "en")
	if err != nil {
		t.Fatalf("content failed: %v", err)
	}
	if item == nil {
		t.Fatalf("expected content")
	}
	if len(item.EmbeddedBlocks) != 1 {
		t.Fatalf("expected legacy fallback block, got %d", len(item.EmbeddedBlocks))
	}
	if item.Data["blocks"] == nil {
		t.Fatalf("expected embedded blocks injected after fallback")
	}
}

func TestGoCMSContentAdapterCreateContentUsesAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	typeID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           typeID.String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	adminWrite := &stubGoCMSAdminContentWriteService{
		createResp: &cms.AdminContentRecord{
			ID:                     uuid.New(),
			Title:                  "Home",
			Slug:                   "home",
			Locale:                 "en",
			ContentType:            "page",
			ContentTypeSlug:        "page",
			Status:                 "draft",
			Navigation:             map[string]string{"header": "show"},
			EffectiveMenuLocations: []string{"header"},
			SchemaVersion:          "page/v1",
			Data:                   map[string]any{"body": "hello"},
			Metadata:               map[string]any{"path": "/home"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	created, err := adapter.CreateContent(ctx, CMSContent{
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "draft",
		SchemaVersion:   "page/v1",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path":  "/home",
			"body":  "hello",
			"order": 3,
		},
	})
	if err != nil {
		t.Fatalf("create content failed: %v", err)
	}
	if adminWrite.createCnt != 1 {
		t.Fatalf("expected one admin write create, got %d", adminWrite.createCnt)
	}
	if len(contentSvc.createReq.Translations) != 0 {
		t.Fatalf("expected raw create path to stay unused")
	}
	if adminWrite.createReq.ContentTypeID != typeID {
		t.Fatalf("expected content type id %s, got %s", typeID.String(), adminWrite.createReq.ContentTypeID.String())
	}
	if adminWrite.createReq.Metadata["path"] != "/home" {
		t.Fatalf("expected metadata path /home, got %v", adminWrite.createReq.Metadata["path"])
	}
	if _, ok := adminWrite.createReq.Data["path"]; ok {
		t.Fatalf("expected structural path removed from request data")
	}
	if adminWrite.createReq.Data["_schema"] != "page/v1" {
		t.Fatalf("expected schema version in request data, got %v", adminWrite.createReq.Data["_schema"])
	}
	if created == nil || created.Data["path"] != "/home" {
		t.Fatalf("expected created content to rehydrate path, got %#v", created)
	}
}

func TestGoCMSContentAdapterUpdateContentUsesAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	contentID := uuid.New()
	typeID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           typeID.String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	adminWrite := &stubGoCMSAdminContentWriteService{
		updateTranslationResp: &cms.AdminContentRecord{
			ID:              contentID,
			Title:           "Home Updated",
			Slug:            "home",
			Locale:          "en",
			ContentType:     "page",
			ContentTypeSlug: "page",
			Status:          "published",
			Data:            map[string]any{"body": "updated"},
			Metadata:        map[string]any{"path": "/home"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, typeSvc, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	updated, err := adapter.UpdateContent(ctx, CMSContent{
		ID:              contentID.String(),
		Title:           "Home Updated",
		Slug:            "home",
		Locale:          "en",
		Status:          "published",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path": "/home",
			"body": "updated",
		},
	})
	if err != nil {
		t.Fatalf("update content failed: %v", err)
	}
	if adminWrite.updateTranslationCnt != 1 {
		t.Fatalf("expected one admin translation write update, got %d", adminWrite.updateTranslationCnt)
	}
	if adminWrite.updateCnt != 0 {
		t.Fatalf("expected full admin write update to stay unused, got %d", adminWrite.updateCnt)
	}
	if contentSvc.updateReq.ID != uuid.Nil {
		t.Fatalf("expected raw update path to stay unused, got %s", contentSvc.updateReq.ID)
	}
	if adminWrite.updateTranslationReq.ID != contentID {
		t.Fatalf("expected update id %s, got %s", contentID, adminWrite.updateTranslationReq.ID)
	}
	if adminWrite.updateTranslationReq.ContentTypeID != typeID {
		t.Fatalf("expected content type id %s, got %s", typeID, adminWrite.updateTranslationReq.ContentTypeID)
	}
	if adminWrite.updateTranslationReq.Metadata["path"] != "/home" {
		t.Fatalf("expected metadata path /home, got %v", adminWrite.updateTranslationReq.Metadata["path"])
	}
	if updated == nil || updated.Data["path"] != "/home" {
		t.Fatalf("expected updated content to rehydrate path, got %#v", updated)
	}
}

func TestGoCMSContentAdapterDeleteContentUsesAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	adminWrite := &stubGoCMSAdminContentWriteService{}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)
	contentID := uuid.New()

	if err := adapter.DeleteContent(ctx, contentID.String()); err != nil {
		t.Fatalf("delete content failed: %v", err)
	}
	if adminWrite.deleteCnt != 1 {
		t.Fatalf("expected one admin write delete, got %d", adminWrite.deleteCnt)
	}
	if adminWrite.deleteReq.ID != contentID {
		t.Fatalf("expected delete id %s, got %s", contentID.String(), adminWrite.deleteReq.ID.String())
	}
	if !adminWrite.deleteReq.HardDelete {
		t.Fatalf("expected hard delete")
	}
}

func TestGoCMSContentAdapterCreateTranslationUsesAdminContentWriteServiceForSupportedShape(t *testing.T) {
	actorID := uuid.New()
	ctx := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: actorID.String()})
	sourceID := uuid.New()
	familyID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{
		createTranslationResp: &cms.AdminContentRecord{
			ID:              uuid.New(),
			FamilyID:        &familyID,
			Title:           "Bonjour",
			Slug:            "bonjour",
			Locale:          "fr",
			ContentType:     "posts",
			ContentTypeSlug: "posts",
			Status:          "draft",
			Data:            map[string]any{"body": "bonjour"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	created, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID:    sourceID.String(),
		Locale:      "fr",
		Environment: "staging",
		Status:      "draft",
		Path:        "/bonjour",
		RouteKey:    "posts/bonjour",
		Metadata: map[string]any{
			"family_id": familyID.String(),
			"source":    "translation-ui",
		},
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if adminWrite.createTranslationCnt != 1 {
		t.Fatalf("expected one admin translation create, got %d", adminWrite.createTranslationCnt)
	}
	if contentSvc.createTranslationCnt != 0 {
		t.Fatalf("expected reflective path to stay unused, got %d calls", contentSvc.createTranslationCnt)
	}
	if adminWrite.createTranslationReq.SourceID != sourceID {
		t.Fatalf("expected source id %s, got %s", sourceID.String(), adminWrite.createTranslationReq.SourceID.String())
	}
	if adminWrite.createTranslationReq.TargetLocale != "fr" {
		t.Fatalf("expected target locale fr, got %q", adminWrite.createTranslationReq.TargetLocale)
	}
	if adminWrite.createTranslationReq.EnvironmentKey != "staging" {
		t.Fatalf("expected environment staging, got %q", adminWrite.createTranslationReq.EnvironmentKey)
	}
	if adminWrite.createTranslationReq.Status != "draft" {
		t.Fatalf("expected status draft, got %q", adminWrite.createTranslationReq.Status)
	}
	if adminWrite.createTranslationReq.Path != "/bonjour" {
		t.Fatalf("expected path /bonjour, got %q", adminWrite.createTranslationReq.Path)
	}
	if adminWrite.createTranslationReq.RouteKey != "posts/bonjour" {
		t.Fatalf("expected route key posts/bonjour, got %q", adminWrite.createTranslationReq.RouteKey)
	}
	if adminWrite.createTranslationReq.ActorID != actorID {
		t.Fatalf("expected actor id %s, got %s", actorID, adminWrite.createTranslationReq.ActorID)
	}
	if adminWrite.createTranslationReq.FamilyID == nil || *adminWrite.createTranslationReq.FamilyID != familyID {
		t.Fatalf("expected family id %s, got %+v", familyID, adminWrite.createTranslationReq.FamilyID)
	}
	if adminWrite.createTranslationReq.Metadata["source"] != "translation-ui" {
		t.Fatalf("expected metadata forwarded, got %+v", adminWrite.createTranslationReq.Metadata)
	}
	if created == nil || created.FamilyID != familyID.String() {
		t.Fatalf("expected created family id %s, got %#v", familyID.String(), created)
	}
}

func TestGoCMSContentAdapterCreateTranslationKeepsAdminWritePathForLocalizedPath(t *testing.T) {
	ctx := context.Background()
	sourceID := uuid.New()
	familyID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{
		createTranslationResp: &cms.AdminContentRecord{
			ID:              uuid.New(),
			FamilyID:        &familyID,
			Title:           "Bonjour",
			Slug:            "bonjour",
			Locale:          "fr",
			ContentType:     "posts",
			ContentTypeSlug: "posts",
			Status:          "draft",
			Data:            map[string]any{"body": "bonjour", "path": "/bonjour"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: sourceID.String(),
		Locale:   "fr",
		Path:     "/bonjour",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if adminWrite.createTranslationCnt != 1 {
		t.Fatalf("expected admin write path used once, got %d calls", adminWrite.createTranslationCnt)
	}
	if adminWrite.createTranslationReq.Path != "/bonjour" {
		t.Fatalf("expected localized path forwarded to admin write request, got %q", adminWrite.createTranslationReq.Path)
	}
	if contentSvc.createTranslationCnt != 0 {
		t.Fatalf("expected reflective path to stay unused, got %d", contentSvc.createTranslationCnt)
	}
}

func TestGoCMSContentAdapterCreateTranslationKeepsAdminWritePathForRouteKeyOnly(t *testing.T) {
	ctx := context.Background()
	sourceID := uuid.New()
	familyID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{
		createTranslationResp: &cms.AdminContentRecord{
			ID:              uuid.New(),
			FamilyID:        &familyID,
			Title:           "Bonjour",
			Slug:            "bonjour",
			Locale:          "fr",
			ContentType:     "posts",
			ContentTypeSlug: "posts",
			Status:          "draft",
			Data:            map[string]any{"body": "bonjour", "route_key": "posts/about"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: sourceID.String(),
		Locale:   "fr",
		RouteKey: "posts/about",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if adminWrite.createTranslationCnt != 1 {
		t.Fatalf("expected admin write path used for route_key-only translation, got %d calls", adminWrite.createTranslationCnt)
	}
	if contentSvc.createTranslationCnt != 0 {
		t.Fatalf("expected reflective path to stay unused, got %d calls", contentSvc.createTranslationCnt)
	}
}

func TestGoCMSContentAdapterCreateTranslationUsesAdminWritePathForTranslationFamilyMetadata(t *testing.T) {
	ctx := context.Background()
	sourceID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{
		createTranslationResp: &cms.AdminContentRecord{
			ID:              uuid.New(),
			Title:           "Bonjour",
			Slug:            "bonjour",
			Locale:          "fr",
			ContentType:     "news",
			ContentTypeSlug: "news",
			Status:          "draft",
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := mustGoCMSContentAdapter(t, svc)

	_, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID:     sourceID.String(),
		Locale:       "fr",
		ContentType:  "news",
		PolicyEntity: "news",
		Metadata: map[string]any{
			"translation_create_locale": map[string]any{"idempotency_key": "family-fr"},
		},
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if adminWrite.createTranslationCnt != 1 {
		t.Fatalf("expected admin write path used for family metadata, got %d calls", adminWrite.createTranslationCnt)
	}
	if contentSvc.createTranslationCnt != 0 {
		t.Fatalf("expected reflective path to stay unused, got %d calls", contentSvc.createTranslationCnt)
	}
	metadata := adminWrite.createTranslationReq.Metadata
	replay := extractMap(metadata["translation_create_locale"])
	if got := toString(replay["idempotency_key"]); got != "family-fr" {
		t.Fatalf("expected translation metadata forwarded to admin write request, got %+v", metadata)
	}
}
