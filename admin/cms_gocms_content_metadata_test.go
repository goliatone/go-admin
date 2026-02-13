package admin

import (
	"context"
	"testing"

	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type stubGoCMSContentService struct {
	listResp             []*cmscontent.Content
	listWithTranslations []*cmscontent.Content
	listWithDerived      []*cmscontent.Content
	listOptions          []cmscontent.ContentListOption
	getResp              *cmscontent.Content
	getWithDerived       *cmscontent.Content
	getOptions           []cmscontent.ContentGetOption
	createReq            cmscontent.CreateContentRequest
	updateReq            cmscontent.UpdateContentRequest
	updateResp           *cmscontent.Content
	createTranslationReq stubCreateTranslationRequest
	createTranslationRes *cmscontent.Content
	createTranslationErr error
	createTranslationCnt int
}

type stubGoCMSContentServiceNoTranslation struct {
	base *stubGoCMSContentService
}

func (s *stubGoCMSContentServiceNoTranslation) List(ctx context.Context, opts ...cmscontent.ContentListOption) ([]*cmscontent.Content, error) {
	return s.base.List(ctx, opts...)
}

func (s *stubGoCMSContentServiceNoTranslation) Get(ctx context.Context, id uuid.UUID, opts ...cmscontent.ContentGetOption) (*cmscontent.Content, error) {
	return s.base.Get(ctx, id, opts...)
}

func (s *stubGoCMSContentServiceNoTranslation) Create(ctx context.Context, req cmscontent.CreateContentRequest) (*cmscontent.Content, error) {
	return s.base.Create(ctx, req)
}

func (s *stubGoCMSContentServiceNoTranslation) Update(ctx context.Context, req cmscontent.UpdateContentRequest) (*cmscontent.Content, error) {
	return s.base.Update(ctx, req)
}

func (s *stubGoCMSContentServiceNoTranslation) Delete(ctx context.Context, req cmscontent.DeleteContentRequest) error {
	return s.base.Delete(ctx, req)
}

type stubGoCMSContentTranslationService struct {
	createTranslationReq stubCreateTranslationRequest
	createTranslationRes *cmscontent.Content
	createTranslationErr error
	createTranslationCnt int
}

func (s *stubGoCMSContentTranslationService) CreateTranslation(_ context.Context, req stubCreateTranslationRequest) (*cmscontent.Content, error) {
	s.createTranslationCnt++
	s.createTranslationReq = req
	if s.createTranslationErr != nil {
		return nil, s.createTranslationErr
	}
	if s.createTranslationRes != nil {
		return s.createTranslationRes, nil
	}
	return nil, ErrNotFound
}

type stubCreateTranslationRequest struct {
	ContentID       uuid.UUID
	SourceID        uuid.UUID
	ID              uuid.UUID
	Locale          string
	TargetLocale    string
	EnvironmentKey  string
	ContentType     string
	ContentTypeSlug string
	Status          string
	CreatedBy       uuid.UUID
	UpdatedBy       uuid.UUID
}

func (s *stubGoCMSContentService) List(_ context.Context, opts ...cmscontent.ContentListOption) ([]*cmscontent.Content, error) {
	s.listOptions = append([]cmscontent.ContentListOption{}, opts...)
	if hasTranslationListOption(opts) && hasDerivedProjectionListOption(opts) && s.listWithDerived != nil {
		return s.listWithDerived, nil
	}
	if hasTranslationListOption(opts) && s.listWithTranslations != nil {
		return s.listWithTranslations, nil
	}
	return s.listResp, nil
}

func (s *stubGoCMSContentService) Get(_ context.Context, _ uuid.UUID, opts ...cmscontent.ContentGetOption) (*cmscontent.Content, error) {
	s.getOptions = append([]cmscontent.ContentGetOption{}, opts...)
	if hasDerivedProjectionGetOption(opts) && s.getWithDerived != nil {
		return s.getWithDerived, nil
	}
	if s.getResp == nil {
		return nil, ErrNotFound
	}
	return s.getResp, nil
}

func (s *stubGoCMSContentService) Create(_ context.Context, req cmscontent.CreateContentRequest) (*cmscontent.Content, error) {
	s.createReq = req
	if s.getResp != nil {
		return s.getResp, nil
	}
	return &cmscontent.Content{ID: uuid.New(), Slug: req.Slug, Status: req.Status}, nil
}

func (s *stubGoCMSContentService) Update(_ context.Context, req cmscontent.UpdateContentRequest) (*cmscontent.Content, error) {
	s.updateReq = req
	if s.updateResp != nil {
		return s.updateResp, nil
	}
	if s.getResp != nil {
		return s.getResp, nil
	}
	return &cmscontent.Content{ID: req.ID, Status: req.Status}, nil
}

func (s *stubGoCMSContentService) CreateTranslation(_ context.Context, req stubCreateTranslationRequest) (*cmscontent.Content, error) {
	s.createTranslationCnt++
	s.createTranslationReq = req
	if s.createTranslationErr != nil {
		return nil, s.createTranslationErr
	}
	if s.createTranslationRes != nil {
		return s.createTranslationRes, nil
	}
	return nil, ErrNotFound
}

func (s *stubGoCMSContentService) Delete(context.Context, cmscontent.DeleteContentRequest) error {
	return nil
}

func hasTranslationListOption(opts []cmscontent.ContentListOption) bool {
	for _, opt := range opts {
		if opt == cmscontent.WithTranslations() {
			return true
		}
	}
	return false
}

func hasDerivedProjectionListOption(opts []cmscontent.ContentListOption) bool {
	for _, opt := range opts {
		if opt == cmscontent.WithDerivedFields() {
			return true
		}
	}
	return false
}

func hasDerivedProjectionGetOption(opts []cmscontent.ContentGetOption) bool {
	for _, opt := range opts {
		if opt == cmscontent.WithDerivedFields() {
			return true
		}
	}
	return false
}

type stubContentTypeService struct {
	typesBySlug map[string]CMSContentType
	typesByID   map[string]CMSContentType
}

func newStubContentTypeService(types ...CMSContentType) *stubContentTypeService {
	svc := &stubContentTypeService{
		typesBySlug: map[string]CMSContentType{},
		typesByID:   map[string]CMSContentType{},
	}
	for _, ct := range types {
		if ct.Slug != "" {
			svc.typesBySlug[ct.Slug] = ct
		}
		if ct.ID != "" {
			svc.typesByID[ct.ID] = ct
		}
	}
	return svc
}

func (s *stubContentTypeService) ContentTypes(context.Context) ([]CMSContentType, error) {
	out := make([]CMSContentType, 0, len(s.typesBySlug))
	for _, ct := range s.typesBySlug {
		out = append(out, ct)
	}
	return out, nil
}

func (s *stubContentTypeService) ContentType(_ context.Context, id string) (*CMSContentType, error) {
	if ct, ok := s.typesByID[id]; ok {
		copy := ct
		return &copy, nil
	}
	return nil, ErrNotFound
}

func (s *stubContentTypeService) ContentTypeBySlug(_ context.Context, slug string) (*CMSContentType, error) {
	if ct, ok := s.typesBySlug[slug]; ok {
		copy := ct
		return &copy, nil
	}
	return nil, ErrNotFound
}

func (s *stubContentTypeService) CreateContentType(context.Context, CMSContentType) (*CMSContentType, error) {
	return nil, ErrNotFound
}

func (s *stubContentTypeService) UpdateContentType(context.Context, CMSContentType) (*CMSContentType, error) {
	return nil, ErrNotFound
}

func (s *stubContentTypeService) DeleteContentType(context.Context, string) error {
	return ErrNotFound
}

func TestGoCMSContentAdapterCreatePageMetadataMapping(t *testing.T) {
	ctx := context.Background()
	typeID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           typeID.String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	contentSvc := &stubGoCMSContentService{
		getResp: &cmscontent.Content{
			ID:   uuid.New(),
			Slug: "home",
			Type: &cmscontent.ContentType{Slug: "page"},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)

	_, err := adapter.CreateContent(ctx, CMSContent{
		Title:           "Home",
		Slug:            "home",
		Locale:          "en",
		Status:          "draft",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Data: map[string]any{
			"path":        "/home",
			"parent_id":   "parent-1",
			"template_id": "tmpl-1",
			"order":       4,
			"body":        "hello",
		},
		Metadata: map[string]any{
			"custom": "keep",
		},
	})
	if err != nil {
		t.Fatalf("create content: %v", err)
	}
	req := contentSvc.createReq
	if req.ContentTypeID != typeID {
		t.Fatalf("expected content type id %s, got %s", typeID.String(), req.ContentTypeID.String())
	}
	if req.Metadata == nil {
		t.Fatalf("expected metadata on create request")
	}
	if req.Metadata["path"] != "/home" {
		t.Fatalf("expected path in metadata, got %v", req.Metadata["path"])
	}
	if req.Metadata["parent_id"] != "parent-1" {
		t.Fatalf("expected parent_id in metadata, got %v", req.Metadata["parent_id"])
	}
	if req.Metadata["template_id"] != "tmpl-1" {
		t.Fatalf("expected template_id in metadata, got %v", req.Metadata["template_id"])
	}
	if req.Metadata["sort_order"] != 4 {
		t.Fatalf("expected sort_order in metadata, got %v", req.Metadata["sort_order"])
	}
	if _, ok := req.Metadata["order"]; ok {
		t.Fatalf("expected order normalized away in metadata")
	}
	if req.Metadata["custom"] != "keep" {
		t.Fatalf("expected custom metadata preserved, got %v", req.Metadata["custom"])
	}
	if len(req.Translations) != 1 {
		t.Fatalf("expected one translation, got %d", len(req.Translations))
	}
	content := req.Translations[0].Content
	if _, ok := content["path"]; ok {
		t.Fatalf("expected path removed from translation content")
	}
	if _, ok := content["parent_id"]; ok {
		t.Fatalf("expected parent_id removed from translation content")
	}
	if _, ok := content["template_id"]; ok {
		t.Fatalf("expected template_id removed from translation content")
	}
	if _, ok := content["order"]; ok {
		t.Fatalf("expected order removed from translation content")
	}
	if content["body"] != "hello" {
		t.Fatalf("expected body preserved in translation content, got %v", content["body"])
	}
}

func TestGoCMSContentAdapterUpdatePageMetadataMapping(t *testing.T) {
	ctx := context.Background()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	existingID := uuid.New()
	contentSvc := &stubGoCMSContentService{
		getResp: &cmscontent.Content{
			ID:   existingID,
			Slug: "home",
			Type: &cmscontent.ContentType{Slug: "page"},
			Metadata: map[string]any{
				"path":        "/old",
				"parent_id":   "parent-1",
				"template_id": "tmpl-1",
				"sort_order":  2,
				"custom":      "keep",
				"legacy":      "stay",
			},
			Translations: []*cmscontent.ContentTranslation{
				{Locale: &cmscontent.Locale{Code: "en"}, Title: "Home", Content: map[string]any{"body": "old"}},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)

	_, err := adapter.UpdateContent(ctx, CMSContent{
		ID:              existingID.String(),
		Locale:          "en",
		ContentType:     "page",
		ContentTypeSlug: "page",
		Status:          "draft",
		Data: map[string]any{
			"path":      "/new",
			"parent_id": nil,
			"order":     9,
			"body":      "updated",
		},
		Metadata: map[string]any{
			"custom": nil,
		},
	})
	if err != nil {
		t.Fatalf("update content: %v", err)
	}
	req := contentSvc.updateReq
	if req.Metadata == nil {
		t.Fatalf("expected metadata on update request")
	}
	if req.Metadata["path"] != "/new" {
		t.Fatalf("expected path updated in metadata, got %v", req.Metadata["path"])
	}
	if _, ok := req.Metadata["parent_id"]; ok {
		t.Fatalf("expected parent_id removed from metadata")
	}
	if req.Metadata["template_id"] != "tmpl-1" {
		t.Fatalf("expected template_id preserved in metadata, got %v", req.Metadata["template_id"])
	}
	if req.Metadata["sort_order"] != 9 {
		t.Fatalf("expected sort_order updated in metadata, got %v", req.Metadata["sort_order"])
	}
	if _, ok := req.Metadata["custom"]; ok {
		t.Fatalf("expected custom removed from metadata")
	}
	if req.Metadata["legacy"] != "stay" {
		t.Fatalf("expected legacy preserved in metadata, got %v", req.Metadata["legacy"])
	}
	if len(req.Translations) != 1 {
		t.Fatalf("expected one translation, got %d", len(req.Translations))
	}
	content := req.Translations[0].Content
	if _, ok := content["path"]; ok {
		t.Fatalf("expected path removed from translation content")
	}
	if _, ok := content["parent_id"]; ok {
		t.Fatalf("expected parent_id removed from translation content")
	}
	if _, ok := content["order"]; ok {
		t.Fatalf("expected order removed from translation content")
	}
	if content["body"] != "updated" {
		t.Fatalf("expected body preserved in translation content, got %v", content["body"])
	}
}

func TestGoCMSContentAdapterCreateTranslationUsesOptionalCommand(t *testing.T) {
	ctx := context.Background()
	typeID := uuid.New()
	sourceID := uuid.New()
	groupID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:   typeID.String(),
		Slug: "posts",
	})
	contentSvc := &stubGoCMSContentService{
		createTranslationRes: &cmscontent.Content{
			ID:     uuid.New(),
			Slug:   "hello-fr",
			Status: "draft",
			Type:   &cmscontent.ContentType{Slug: "posts"},
			Translations: []*cmscontent.ContentTranslation{
				{
					Locale:             &cmscontent.Locale{Code: "fr"},
					Title:              "Bonjour",
					TranslationGroupID: &groupID,
					Content:            map[string]any{"body": "bonjour"},
				},
			},
		},
	}
	svc := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)
	adapter, ok := svc.(*GoCMSContentAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected GoCMSContentAdapter, got %T", svc)
	}

	created, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID:    sourceID.String(),
		Locale:      "fr",
		Environment: "staging",
		ContentType: "posts",
		Status:      "draft",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if contentSvc.createTranslationCnt != 1 {
		t.Fatalf("expected one create translation call, got %d", contentSvc.createTranslationCnt)
	}
	if contentSvc.createTranslationReq.ContentID != sourceID {
		t.Fatalf("expected content id %s, got %s", sourceID.String(), contentSvc.createTranslationReq.ContentID.String())
	}
	if contentSvc.createTranslationReq.Locale != "fr" {
		t.Fatalf("expected locale fr, got %q", contentSvc.createTranslationReq.Locale)
	}
	if contentSvc.createTranslationReq.EnvironmentKey != "staging" {
		t.Fatalf("expected environment staging, got %q", contentSvc.createTranslationReq.EnvironmentKey)
	}
	if created == nil {
		t.Fatalf("expected created content")
	}
	if created.Locale != "fr" {
		t.Fatalf("expected created locale fr, got %q", created.Locale)
	}
	if created.TranslationGroupID != groupID.String() {
		t.Fatalf("expected group id %s, got %s", groupID.String(), created.TranslationGroupID)
	}
}

func TestGoCMSContentAdapterCreateTranslationUsesDedicatedTranslationCapability(t *testing.T) {
	ctx := context.Background()
	typeID := uuid.New()
	sourceID := uuid.New()
	groupID := uuid.New()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:   typeID.String(),
		Slug: "posts",
	})
	contentSvc := &stubGoCMSContentServiceNoTranslation{
		base: &stubGoCMSContentService{},
	}
	translationSvc := &stubGoCMSContentTranslationService{
		createTranslationRes: &cmscontent.Content{
			ID:     uuid.New(),
			Slug:   "hello-fr",
			Status: "draft",
			Type:   &cmscontent.ContentType{Slug: "posts"},
			Translations: []*cmscontent.ContentTranslation{
				{
					Locale:             &cmscontent.Locale{Code: "fr"},
					Title:              "Bonjour",
					TranslationGroupID: &groupID,
					Content:            map[string]any{"body": "bonjour"},
				},
			},
		},
	}
	svc := newGoCMSContentAdapter(contentSvc, translationSvc, nil, typeSvc, nil)
	adapter, ok := svc.(*GoCMSContentAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected GoCMSContentAdapter, got %T", svc)
	}

	created, err := adapter.CreateTranslation(ctx, TranslationCreateInput{
		SourceID:    sourceID.String(),
		Locale:      "fr",
		Environment: "staging",
		ContentType: "posts",
		Status:      "draft",
	})
	if err != nil {
		t.Fatalf("create translation failed: %v", err)
	}
	if translationSvc.createTranslationCnt != 1 {
		t.Fatalf("expected one translation capability call, got %d", translationSvc.createTranslationCnt)
	}
	if translationSvc.createTranslationReq.SourceID != sourceID {
		t.Fatalf("expected source id %s, got %s", sourceID.String(), translationSvc.createTranslationReq.SourceID.String())
	}
	if translationSvc.createTranslationReq.TargetLocale != "fr" {
		t.Fatalf("expected target locale fr, got %q", translationSvc.createTranslationReq.TargetLocale)
	}
	if created == nil {
		t.Fatalf("expected created content")
	}
	if created.Locale != "fr" {
		t.Fatalf("expected created locale fr, got %q", created.Locale)
	}
	if created.TranslationGroupID != groupID.String() {
		t.Fatalf("expected group id %s, got %s", groupID.String(), created.TranslationGroupID)
	}
}

func TestGoCMSContentAdapterListInjectsMetadata(t *testing.T) {
	ctx := context.Background()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	contentSvc := &stubGoCMSContentService{
		listResp: []*cmscontent.Content{
			{
				ID:   uuid.New(),
				Slug: "home",
				Type: &cmscontent.ContentType{Slug: "page"},
				Metadata: map[string]any{
					"path":        "/home",
					"parent_id":   "parent-1",
					"template_id": "tmpl-1",
					"sort_order":  3,
				},
				Translations: []*cmscontent.ContentTranslation{
					{Locale: &cmscontent.Locale{Code: "en"}, Title: "Home", Content: map[string]any{"body": "hello"}},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)

	items, err := adapter.Contents(ctx, "en")
	if err != nil {
		t.Fatalf("list content: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	item := items[0]
	if item.Metadata == nil || item.Metadata["path"] != "/home" {
		t.Fatalf("expected metadata path injected, got %v", item.Metadata)
	}
	if item.Data["path"] != "/home" {
		t.Fatalf("expected path injected into data, got %v", item.Data["path"])
	}
	if item.Data["sort_order"] != 3 {
		t.Fatalf("expected sort_order injected into data, got %v", item.Data["sort_order"])
	}
}

func TestGoCMSContentAdapterLegacyMetadataFallback(t *testing.T) {
	ctx := context.Background()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	contentID := uuid.New()
	contentSvc := &stubGoCMSContentService{
		getResp: &cmscontent.Content{
			ID:   contentID,
			Slug: "legacy",
			Type: &cmscontent.ContentType{Slug: "page"},
			Translations: []*cmscontent.ContentTranslation{
				{
					Locale: &cmscontent.Locale{Code: "en"},
					Title:  "Legacy",
					Content: map[string]any{
						"path":        "/legacy",
						"parent_id":   "parent-9",
						"template_id": "tmpl-9",
						"order":       7,
					},
				},
			},
		},
	}
	adapter := NewGoCMSContentAdapter(contentSvc, nil, typeSvc)

	item, err := adapter.Content(ctx, contentID.String(), "en")
	if err != nil {
		t.Fatalf("get content: %v", err)
	}
	if item.Metadata == nil {
		t.Fatalf("expected metadata derived from legacy data")
	}
	if item.Metadata["path"] != "/legacy" {
		t.Fatalf("expected path derived in metadata, got %v", item.Metadata["path"])
	}
	if item.Metadata["parent_id"] != "parent-9" {
		t.Fatalf("expected parent_id derived in metadata, got %v", item.Metadata["parent_id"])
	}
	if item.Metadata["template_id"] != "tmpl-9" {
		t.Fatalf("expected template_id derived in metadata, got %v", item.Metadata["template_id"])
	}
	if item.Metadata["sort_order"] != 7 {
		t.Fatalf("expected sort_order derived in metadata, got %v", item.Metadata["sort_order"])
	}
	if _, ok := item.Metadata["order"]; ok {
		t.Fatalf("expected order normalized away in metadata")
	}
	if item.Data["sort_order"] != 7 {
		t.Fatalf("expected sort_order injected into data, got %v", item.Data["sort_order"])
	}
	if item.Data["path"] != "/legacy" {
		t.Fatalf("expected path preserved in data, got %v", item.Data["path"])
	}
}
