package quickstart

import (
	"context"
	"maps"
	"net/http"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/stretchr/testify/mock"
)

type mutationPanelRepo struct {
	records    map[string]map[string]any
	created    map[string]any
	updatedID  string
	updated    map[string]any
	updateResp map[string]any
}

func (r *mutationPanelRepo) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (r *mutationPanelRepo) Get(_ context.Context, id string) (map[string]any, error) {
	if record, ok := r.records[id]; ok {
		return cloneMutationRecord(record), nil
	}
	return nil, admin.ErrNotFound
}

func (r *mutationPanelRepo) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	r.created = cloneMutationRecord(record)
	return cloneMutationRecord(record), nil
}

func (r *mutationPanelRepo) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	r.updatedID = id
	r.updated = cloneMutationRecord(record)
	if r.updateResp != nil {
		return cloneMutationRecord(r.updateResp), nil
	}
	out := cloneMutationRecord(record)
	out["id"] = id
	return out, nil
}

func (r *mutationPanelRepo) Delete(context.Context, string) error { return nil }

type mutationRuntimeContentServiceStub struct {
	blockVersions []admin.CMSBlockDefinitionVersion
	blockErr      error
}

func (s *mutationRuntimeContentServiceStub) Pages(context.Context, string) ([]admin.CMSPage, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) Page(context.Context, string, string) (*admin.CMSPage, error) {
	return nil, admin.ErrNotFound
}

func (s *mutationRuntimeContentServiceStub) CreatePage(context.Context, admin.CMSPage) (*admin.CMSPage, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) UpdatePage(context.Context, admin.CMSPage) (*admin.CMSPage, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) DeletePage(context.Context, string) error { return nil }

func (s *mutationRuntimeContentServiceStub) Contents(context.Context, string) ([]admin.CMSContent, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) Content(context.Context, string, string) (*admin.CMSContent, error) {
	return nil, admin.ErrNotFound
}

func (s *mutationRuntimeContentServiceStub) CreateContent(context.Context, admin.CMSContent) (*admin.CMSContent, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) UpdateContent(context.Context, admin.CMSContent) (*admin.CMSContent, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) DeleteContent(context.Context, string) error { return nil }

func (s *mutationRuntimeContentServiceStub) BlockDefinitions(context.Context) ([]admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) CreateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) UpdateBlockDefinition(context.Context, admin.CMSBlockDefinition) (*admin.CMSBlockDefinition, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) DeleteBlockDefinition(context.Context, string) error {
	return nil
}

func (s *mutationRuntimeContentServiceStub) BlockDefinitionVersions(context.Context, string) ([]admin.CMSBlockDefinitionVersion, error) {
	return s.blockVersions, s.blockErr
}

func (s *mutationRuntimeContentServiceStub) BlocksForContent(context.Context, string, string) ([]admin.CMSBlock, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) SaveBlock(context.Context, admin.CMSBlock) (*admin.CMSBlock, error) {
	return nil, nil
}

func (s *mutationRuntimeContentServiceStub) DeleteBlock(context.Context, string) error { return nil }

func cloneMutationRecord(record map[string]any) map[string]any {
	if record == nil {
		return nil
	}
	out := make(map[string]any, len(record))
	maps.Copy(out, record)
	return out
}

func newMutationRuntimeMockContext(t *testing.T, body string) *router.MockContext {
	t.Helper()
	claims := &auth.JWTClaims{UserRole: string(auth.RoleAdmin)}
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithClaimsContext(context.Background(), claims))
	ctx.On("Body").Return([]byte(body))
	return ctx
}

func TestCloneContentTypeUsesExtractedMutationRuntime(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	repo := &mutationPanelRepo{
		records: map[string]map[string]any{
			"type-1": {
				"id":              "type-1",
				"content_type_id": "type-1",
				"slug":            "post",
				"name":            "Post",
				"schema_version":  "7",
				"created_at":      "earlier",
				"updated_at":      "later",
			},
		},
	}
	adm, err := admin.New(cfg, admin.Dependencies{Registry: admin.NewRegistry()})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}
	if _, err := adm.RegisterPanel("content_types", adm.Panel("content_types").WithRepository(repo)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	ctx := newMutationRuntimeMockContext(t, `{"slug":"post-copy"}`)
	ctx.ParamsM["id"] = "type-1"
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.CloneContentType(ctx); err != nil {
		t.Fatalf("clone content type: %v", err)
	}
	if repo.created == nil {
		t.Fatalf("expected create payload to be captured")
	}
	if _, ok := repo.created["id"]; ok {
		t.Fatalf("expected cloned payload to omit id, got %+v", repo.created)
	}
	if _, ok := repo.created["content_type_id"]; ok {
		t.Fatalf("expected cloned payload to omit content_type_id, got %+v", repo.created)
	}
	if _, ok := repo.created["schema_version"]; ok {
		t.Fatalf("expected cloned payload to omit schema_version, got %+v", repo.created)
	}
	if got := repo.created["slug"]; got != "post-copy" {
		t.Fatalf("expected cloned slug to be replaced, got %v", got)
	}
	if got := repo.created["name"]; got != "Post Copy" {
		t.Fatalf("expected default copy name, got %v", got)
	}
	if got := repo.created["status"]; got != "draft" {
		t.Fatalf("expected cloned status draft, got %v", got)
	}
}

func TestContentTypeVersionsSeedsStoreFromRecord(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	repo := &mutationPanelRepo{
		records: map[string]map[string]any{
			"type-1": {
				"id":             "type-1",
				"slug":           "post",
				"schema_version": "3",
				"updated_at":     "2026-04-01T00:00:00Z",
				"schema": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"title": map[string]any{"type": "string"},
					},
				},
			},
		},
	}
	adm, err := admin.New(cfg, admin.Dependencies{Registry: admin.NewRegistry()})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}
	if _, err := adm.RegisterPanel("content_types", adm.Panel("content_types").WithRepository(repo)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	ctx := newMutationRuntimeMockContext(t, "")
	ctx.ParamsM["id"] = "type-1"

	var payload map[string]any
	ctx.On("JSON", http.StatusOK, mock.Anything).Run(func(args mock.Arguments) {
		payload = args.Get(1).(map[string]any)
	}).Return(nil)

	if err := handlers.ContentTypeVersions(ctx); err != nil {
		t.Fatalf("content type versions: %v", err)
	}
	versions, ok := payload["versions"].([]contentTypeSchemaVersion)
	if !ok || len(versions) != 1 {
		t.Fatalf("expected one content-type schema version, got %#v", payload["versions"])
	}
	if versions[0].Version != "3" {
		t.Fatalf("expected schema version 3, got %+v", versions[0])
	}
	if versions[0].Schema == nil || versions[0].Schema["type"] != "object" {
		t.Fatalf("expected schema payload to be preserved, got %+v", versions[0])
	}
}

func TestPublishBlockDefinitionSetsTransition(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	repo := &mutationPanelRepo{
		records: map[string]map[string]any{
			"block-1": {"id": "block-1", "type": "hero"},
		},
		updateResp: map[string]any{"id": "block-1", "status": "active"},
	}
	adm, err := admin.New(cfg, admin.Dependencies{Registry: admin.NewRegistry()})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}
	if _, err := adm.RegisterPanel("block_definitions", adm.Panel("block_definitions").WithRepository(repo)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	ctx := newMutationRuntimeMockContext(t, "")
	ctx.ParamsM["id"] = "block-1"
	ctx.On("JSON", http.StatusOK, mock.Anything).Return(nil)

	if err := handlers.PublishBlockDefinition(ctx); err != nil {
		t.Fatalf("publish block definition: %v", err)
	}
	if repo.updatedID != "block-1" {
		t.Fatalf("expected block id update target, got %q", repo.updatedID)
	}
	if got := repo.updated["transition"]; got != "publish" {
		t.Fatalf("expected publish transition payload, got %+v", repo.updated)
	}
	if got := repo.updated["status"]; got != "active" {
		t.Fatalf("expected active status payload, got %+v", repo.updated)
	}
}

func TestBlockDefinitionVersionsFallsBackToRecordWhenServiceReturnsEmpty(t *testing.T) {
	cfg := NewAdminConfig("/admin", "Admin", "en")
	repo := &mutationPanelRepo{
		records: map[string]map[string]any{
			"block-1": {
				"id":               "block-1",
				"schema_version":   "2",
				"migration_status": "needs_review",
				"updated_at":       "2026-04-01T01:02:03Z",
				"schema": map[string]any{
					"type": "object",
				},
			},
		},
	}
	content := &mutationRuntimeContentServiceStub{}
	adm, err := admin.New(cfg, admin.Dependencies{
		Registry:     admin.NewRegistry(),
		CMSContainer: stubCMSContainer{content: content},
	})
	if err != nil {
		t.Fatalf("admin setup: %v", err)
	}
	if _, err := adm.RegisterPanel("block_definitions", adm.Panel("block_definitions").WithRepository(repo)); err != nil {
		t.Fatalf("register panel: %v", err)
	}

	handlers := newContentTypeBuilderHandlers(adm, cfg, nil, "", "")
	ctx := newMutationRuntimeMockContext(t, "")
	ctx.ParamsM["id"] = "block-1"

	var payload map[string]any
	ctx.On("JSON", http.StatusOK, mock.Anything).Run(func(args mock.Arguments) {
		payload = args.Get(1).(map[string]any)
	}).Return(nil)

	if err := handlers.BlockDefinitionVersions(ctx); err != nil {
		t.Fatalf("block definition versions: %v", err)
	}
	versions, ok := payload["versions"].([]blockSchemaVersion)
	if !ok || len(versions) != 1 {
		t.Fatalf("expected one block schema version, got %#v", payload["versions"])
	}
	if versions[0].Version != "2" || versions[0].MigrationStatus != "needs_review" {
		t.Fatalf("expected fallback block version payload, got %+v", versions[0])
	}
}
