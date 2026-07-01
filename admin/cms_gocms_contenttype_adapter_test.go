package admin

import (
	"context"
	"testing"
	"time"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type goCMSContentTypeServiceStub struct {
	listItems []*cmscontent.ContentType
	createReq *cmscontent.CreateContentTypeRequest
	updateReq *cmscontent.UpdateContentTypeRequest
}

func (s *goCMSContentTypeServiceStub) Create(_ context.Context, req cmscontent.CreateContentTypeRequest) (*cmscontent.ContentType, error) {
	s.createReq = &req
	return &cmscontent.ContentType{
		ID:           uuid.New(),
		Name:         req.Name,
		Slug:         req.Slug,
		Schema:       req.Schema,
		UISchema:     req.UISchema,
		Capabilities: req.Capabilities,
		Status:       req.Status,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}, nil
}

func (s *goCMSContentTypeServiceStub) Update(_ context.Context, req cmscontent.UpdateContentTypeRequest) (*cmscontent.ContentType, error) {
	s.updateReq = &req
	name := "Article"
	if req.Name != nil {
		name = *req.Name
	}
	slug := "article"
	if req.Slug != nil {
		slug = *req.Slug
	}
	status := "active"
	if req.Status != nil {
		status = *req.Status
	}
	return &cmscontent.ContentType{
		ID:           req.ID,
		Name:         name,
		Slug:         slug,
		Schema:       req.Schema,
		UISchema:     req.UISchema,
		Capabilities: req.Capabilities,
		Status:       status,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}, nil
}

func (s *goCMSContentTypeServiceStub) Delete(context.Context, cmscontent.DeleteContentTypeRequest) error {
	return ErrNotFound
}

func (s *goCMSContentTypeServiceStub) Get(context.Context, uuid.UUID) (*cmscontent.ContentType, error) {
	return nil, ErrNotFound
}

func (s *goCMSContentTypeServiceStub) GetBySlug(context.Context, string, ...string) (*cmscontent.ContentType, error) {
	return nil, ErrNotFound
}

func (s *goCMSContentTypeServiceStub) List(context.Context, ...string) ([]*cmscontent.ContentType, error) {
	return append([]*cmscontent.ContentType{}, s.listItems...), nil
}

func (s *goCMSContentTypeServiceStub) Find(context.Context, string, ...string) ([]*cmscontent.ContentType, error) {
	return nil, ErrNotFound
}

func TestGoCMSContentTypeAdapterContentTypesUsesEnvironmentFallback(t *testing.T) {
	svc := &goCMSContentTypeServiceStub{
		listItems: []*cmscontent.ContentType{{
			ID:        uuid.New(),
			Name:      "Article",
			Slug:      "article",
			Schema:    map[string]any{"type": "object"},
			UISchema:  map[string]any{},
			Status:    "active",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}},
	}

	adapter, ok := NewGoCMSContentTypeAdapter(svc).(*GoCMSContentTypeAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected concrete GoCMS content type adapter")
	}

	types, err := adapter.ContentTypes(WithEnvironment(context.Background(), "preview"))
	if err != nil {
		t.Fatalf("ContentTypes failed: %v", err)
	}
	if len(types) != 1 {
		t.Fatalf("expected one content type, got %d", len(types))
	}
	if got := cmsadapter.ContentTypeChannel(types[0]); got != "preview" {
		t.Fatalf("expected preview channel fallback, got %q", got)
	}
}

func TestGoCMSContentTypeAdapterCreatePreservesExplicitEmptyNavigationLocations(t *testing.T) {
	svc := &goCMSContentTypeServiceStub{}
	adapter, ok := NewGoCMSContentTypeAdapter(svc).(*GoCMSContentTypeAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected concrete GoCMS content type adapter")
	}

	created, err := adapter.CreateContentType(context.Background(), CMSContentType{
		Name:   "Article",
		Slug:   "article",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{
			"navigation": map[string]any{
				"enabled":           true,
				"eligibleLocations": []string{},
			},
		},
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if svc.createReq == nil {
		t.Fatalf("expected create request to be recorded")
	}
	assertExplicitEmptyNavigationLocations(t, svc.createReq.Capabilities)
	assertExplicitEmptyNavigationLocations(t, created.Capabilities)
}

func TestGoCMSContentTypeAdapterUpdatePreservesExplicitEmptyNavigationLocations(t *testing.T) {
	svc := &goCMSContentTypeServiceStub{}
	adapter, ok := NewGoCMSContentTypeAdapter(svc).(*GoCMSContentTypeAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected concrete GoCMS content type adapter")
	}

	updated, err := adapter.UpdateContentType(context.Background(), CMSContentType{
		ID:     uuid.NewString(),
		Name:   "Article",
		Slug:   "article",
		Schema: map[string]any{"fields": []map[string]any{{"name": "title", "type": "string"}}},
		Capabilities: map[string]any{
			"navigation_enabled":            true,
			"navigation_eligible_locations": []any{},
		},
	})
	if err != nil {
		t.Fatalf("update failed: %v", err)
	}
	if svc.updateReq == nil {
		t.Fatalf("expected update request to be recorded")
	}
	assertExplicitEmptyNavigationLocations(t, svc.updateReq.Capabilities)
	assertExplicitEmptyNavigationLocations(t, updated.Capabilities)
}
