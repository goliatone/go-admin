package admin

import (
	"context"
	"testing"

	cms "github.com/goliatone/go-cms"
	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type stubGoCMSAdminContentReadService struct {
	listResp []cms.AdminContentRecord
	getResp  *cms.AdminContentRecord
	listOpts cms.AdminContentListOptions
	getOpts  cms.AdminContentGetOptions
	listErr  error
	getErr   error
	listCnt  int
	getCnt   int
}

func (s *stubGoCMSAdminContentReadService) List(_ context.Context, opts cms.AdminContentListOptions) ([]cms.AdminContentRecord, int, error) {
	s.listCnt++
	s.listOpts = opts
	if s.listErr != nil {
		return nil, 0, s.listErr
	}
	return append([]cms.AdminContentRecord{}, s.listResp...), len(s.listResp), nil
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
	createTranslationResp *cms.AdminContentRecord
	createReq             cms.AdminContentCreateRequest
	updateReq             cms.AdminContentUpdateRequest
	deleteReq             cms.AdminContentDeleteRequest
	createTranslationReq  cms.AdminContentCreateTranslationRequest
	createErr             error
	updateErr             error
	deleteErr             error
	createTranslationErr  error
	createCnt             int
	updateCnt             int
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
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, typeSvc, nil, adminRead, nil, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)

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
	svc := newGoCMSContentAdapter(contentSvc, nil, blockSvc, nil, nil, adminRead, nil, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)
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
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, typeSvc, nil, nil, adminWrite, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)

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

func TestGoCMSContentAdapterDeleteContentUsesAdminContentWriteService(t *testing.T) {
	ctx := context.Background()
	adminWrite := &stubGoCMSAdminContentWriteService{}
	svc := newGoCMSContentAdapter(&stubGoCMSContentService{}, nil, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)
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
			Data:            map[string]any{"body": "bonjour"},
		},
	}
	contentSvc := &stubGoCMSContentService{}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)

	created, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID:    sourceID.String(),
		Locale:      "fr",
		Environment: "staging",
		Status:      "draft",
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
	if created == nil || created.FamilyID != familyID.String() {
		t.Fatalf("expected created family id %s, got %#v", familyID.String(), created)
	}
}

func TestGoCMSContentAdapterCreateTranslationFallsBackForLocalOnlyFields(t *testing.T) {
	ctx := context.Background()
	sourceID := uuid.New()
	adminWrite := &stubGoCMSAdminContentWriteService{}
	contentSvc := &stubGoCMSContentService{
		createTranslationRes: &cmscontent.Content{
			ID:     uuid.New(),
			Slug:   "bonjour",
			Status: "draft",
			Type:   &cmscontent.ContentType{Slug: "posts"},
			Translations: []*cmscontent.ContentTranslation{{
				Locale:  &cmscontent.Locale{Code: "fr"},
				Title:   "Bonjour",
				Content: map[string]any{"body": "bonjour"},
			}},
		},
	}
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)

	_, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID: sourceID.String(),
		Locale:   "fr",
		Path:     "/bonjour",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if adminWrite.createTranslationCnt != 0 {
		t.Fatalf("expected admin write path skipped, got %d calls", adminWrite.createTranslationCnt)
	}
	if contentSvc.createTranslationCnt != 1 {
		t.Fatalf("expected reflective path used once, got %d", contentSvc.createTranslationCnt)
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
	svc := newGoCMSContentAdapter(contentSvc, nil, nil, nil, nil, nil, adminWrite, nil, nil)
	adapter := svc.(*GoCMSContentAdapter)

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
