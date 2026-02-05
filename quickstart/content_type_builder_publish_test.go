package quickstart

import (
	"context"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type stubContentTypeService struct {
	ct admin.CMSContentType
}

func (s *stubContentTypeService) ContentTypes(context.Context) ([]admin.CMSContentType, error) {
	return []admin.CMSContentType{s.ct}, nil
}

func (s *stubContentTypeService) ContentType(_ context.Context, id string) (*admin.CMSContentType, error) {
	if id == s.ct.ID {
		return &s.ct, nil
	}
	return nil, admin.ErrNotFound
}

func (s *stubContentTypeService) ContentTypeBySlug(_ context.Context, slug string) (*admin.CMSContentType, error) {
	if slug == s.ct.Slug {
		return &s.ct, nil
	}
	return nil, admin.ErrNotFound
}

func (s *stubContentTypeService) CreateContentType(_ context.Context, ct admin.CMSContentType) (*admin.CMSContentType, error) {
	s.ct = ct
	return &s.ct, nil
}

func (s *stubContentTypeService) UpdateContentType(_ context.Context, ct admin.CMSContentType) (*admin.CMSContentType, error) {
	if ct.ID != s.ct.ID {
		return nil, admin.ErrNotFound
	}
	if ct.Status != "" {
		s.ct.Status = ct.Status
	}
	return &s.ct, nil
}

func (s *stubContentTypeService) DeleteContentType(_ context.Context, id string) error {
	if id != s.ct.ID {
		return admin.ErrNotFound
	}
	return nil
}

type stubCMSContainer struct {
	types admin.CMSContentTypeService
}

func (s stubCMSContainer) WidgetService() admin.CMSWidgetService   { return nil }
func (s stubCMSContainer) MenuService() admin.CMSMenuService       { return nil }
func (s stubCMSContainer) ContentService() admin.CMSContentService { return nil }
func (s stubCMSContainer) ContentTypeService() admin.CMSContentTypeService {
	return s.types
}

type staleContentTypeRepo struct {
	updatedID string
}

func (r *staleContentTypeRepo) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (r *staleContentTypeRepo) Get(context.Context, string) (map[string]any, error) {
	return map[string]any{
		"id":              "stale-id",
		"content_type_id": "stale-id",
		"slug":            "post",
	}, nil
}

func (r *staleContentTypeRepo) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	return record, nil
}

func (r *staleContentTypeRepo) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	r.updatedID = id
	if id != "real-id" {
		return nil, admin.ErrNotFound
	}
	out := map[string]any{
		"id":   id,
		"slug": "post",
	}
	if status, ok := record["status"].(string); ok {
		out["status"] = status
	}
	return out, nil
}

func (r *staleContentTypeRepo) Delete(context.Context, string) error { return nil }

func TestPublishContentTypeResolvesStaleID(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	registry := admin.NewRegistry()
	svc := &stubContentTypeService{
		ct: admin.CMSContentType{ID: "real-id", Slug: "post", Name: "Post"},
	}
	adm, err := admin.New(cfg, admin.Dependencies{
		Registry:     registry,
		CMSContainer: stubCMSContainer{types: svc},
	})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}

	repo := &staleContentTypeRepo{}
	panel := adm.Panel("content_types").WithRepository(repo)
	if _, err := adm.RegisterPanel("content_types", panel); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")

	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.ParamsM["id"] = "post"
	ctx.On("Body").Return([]byte(nil))
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.PublishContentType(ctx); err != nil {
		t.Fatalf("publish content type: %v", err)
	}
	if repo.updatedID != "real-id" {
		t.Fatalf("expected resolved id 'real-id', got %q", repo.updatedID)
	}
}
