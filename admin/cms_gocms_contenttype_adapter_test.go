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
}

func (s *goCMSContentTypeServiceStub) Create(context.Context, cmscontent.CreateContentTypeRequest) (*cmscontent.ContentType, error) {
	return nil, ErrNotFound
}

func (s *goCMSContentTypeServiceStub) Update(context.Context, cmscontent.UpdateContentTypeRequest) (*cmscontent.ContentType, error) {
	return nil, ErrNotFound
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
