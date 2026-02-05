package admin

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

type stubContentTranslationInput struct {
	Locale  string
	Title   string
	Summary *string
	Content map[string]any
}

type stubCreateContentRequest struct {
	ContentTypeID            uuid.UUID
	Slug                     string
	Status                   string
	CreatedBy                uuid.UUID
	UpdatedBy                uuid.UUID
	Metadata                 map[string]any
	Translations             []stubContentTranslationInput
	AllowMissingTranslations bool
}

type stubUpdateContentRequest struct {
	ID                       uuid.UUID
	Status                   string
	UpdatedBy                uuid.UUID
	Metadata                 map[string]any
	Translations             []stubContentTranslationInput
	AllowMissingTranslations bool
}

type stubDeleteContentRequest struct {
	ID         uuid.UUID
	DeletedBy  uuid.UUID
	HardDelete bool
}

type stubContentTypeRecord struct {
	ID   uuid.UUID
	Slug string
	Name string
}

type stubContentTranslationRecord struct {
	Locale             string
	Title              string
	Summary            *string
	Content            map[string]any
	TranslationGroupID *uuid.UUID
	ResolvedLocale     string
}

type stubContentRecord struct {
	ID                     uuid.UUID
	Slug                   string
	Status                 string
	ContentTypeID          uuid.UUID
	Type                   *stubContentTypeRecord
	Metadata               map[string]any
	Translations           []*stubContentTranslationRecord
	AvailableLocales       []string
	RequestedLocale        string
	ResolvedLocale         string
	MissingRequestedLocale bool
}

type stubGoCMSContentService struct {
	listResp   []*stubContentRecord
	getResp    *stubContentRecord
	createReq  stubCreateContentRequest
	updateReq  stubUpdateContentRequest
	updateResp *stubContentRecord
}

func (s *stubGoCMSContentService) List(context.Context) ([]*stubContentRecord, error) {
	return s.listResp, nil
}

func (s *stubGoCMSContentService) Get(_ context.Context, _ uuid.UUID) (*stubContentRecord, error) {
	if s.getResp == nil {
		return nil, ErrNotFound
	}
	return s.getResp, nil
}

func (s *stubGoCMSContentService) Create(_ context.Context, req stubCreateContentRequest) (*stubContentRecord, error) {
	s.createReq = req
	if s.getResp != nil {
		return s.getResp, nil
	}
	return &stubContentRecord{ID: uuid.New(), Slug: req.Slug, Status: req.Status}, nil
}

func (s *stubGoCMSContentService) Update(_ context.Context, req stubUpdateContentRequest) (*stubContentRecord, error) {
	s.updateReq = req
	if s.updateResp != nil {
		return s.updateResp, nil
	}
	if s.getResp != nil {
		return s.getResp, nil
	}
	return &stubContentRecord{ID: req.ID, Status: req.Status}, nil
}

func (s *stubGoCMSContentService) Delete(context.Context, stubDeleteContentRequest) error {
	return nil
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
		getResp: &stubContentRecord{
			ID:   uuid.New(),
			Slug: "home",
			Type: &stubContentTypeRecord{Slug: "page"},
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
		getResp: &stubContentRecord{
			ID:   existingID,
			Slug: "home",
			Type: &stubContentTypeRecord{Slug: "page"},
			Metadata: map[string]any{
				"path":        "/old",
				"parent_id":   "parent-1",
				"template_id": "tmpl-1",
				"sort_order":  2,
				"custom":      "keep",
				"legacy":      "stay",
			},
			Translations: []*stubContentTranslationRecord{
				{Locale: "en", Title: "Home", Content: map[string]any{"body": "old"}},
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

func TestGoCMSContentAdapterListInjectsMetadata(t *testing.T) {
	ctx := context.Background()
	typeSvc := newStubContentTypeService(CMSContentType{
		ID:           uuid.New().String(),
		Slug:         "page",
		Capabilities: map[string]any{"structural_fields": true, "panel_slug": "pages"},
	})
	contentSvc := &stubGoCMSContentService{
		listResp: []*stubContentRecord{
			{
				ID:   uuid.New(),
				Slug: "home",
				Type: &stubContentTypeRecord{Slug: "page"},
				Metadata: map[string]any{
					"path":        "/home",
					"parent_id":   "parent-1",
					"template_id": "tmpl-1",
					"sort_order":  3,
				},
				Translations: []*stubContentTranslationRecord{
					{Locale: "en", Title: "Home", Content: map[string]any{"body": "hello"}},
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
		getResp: &stubContentRecord{
			ID:   contentID,
			Slug: "legacy",
			Type: &stubContentTypeRecord{Slug: "page"},
			Translations: []*stubContentTranslationRecord{
				{
					Locale: "en",
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
