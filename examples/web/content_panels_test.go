package main

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
)

func TestEnsureCoreContentPanelsRegistersMissingPanels(t *testing.T) {
	adm := mustNewWebTestAdmin(t)

	if _, ok := adm.Registry().Panel("pages"); ok {
		t.Fatalf("expected pages panel to be absent before fallback registration")
	}
	if _, ok := adm.Registry().Panel("posts"); ok {
		t.Fatalf("expected posts panel to be absent before fallback registration")
	}

	if err := ensureCoreContentPanels(adm, &stubPageRepository{}, &stubPostRepository{}); err != nil {
		t.Fatalf("ensure core content panels: %v", err)
	}

	if _, ok := adm.Registry().Panel("pages"); !ok {
		t.Fatalf("expected pages panel to be registered")
	}
	if _, ok := adm.Registry().Panel("posts"); !ok {
		t.Fatalf("expected posts panel to be registered")
	}
}

func TestEnsureCoreContentPanelsIsIdempotentWhenPagesExists(t *testing.T) {
	adm := mustNewWebTestAdmin(t)

	existingPages, err := adm.RegisterPanel("pages", minimalPanelBuilder())
	if err != nil {
		t.Fatalf("register existing pages panel: %v", err)
	}

	if err := ensureCoreContentPanels(adm, &stubPageRepository{}, &stubPostRepository{}); err != nil {
		t.Fatalf("ensure core content panels: %v", err)
	}

	pagesAfter, ok := adm.Registry().Panel("pages")
	if !ok || pagesAfter == nil {
		t.Fatalf("expected pages panel to remain registered")
	}
	if pagesAfter != existingPages {
		t.Fatalf("expected existing pages panel to be preserved")
	}
	if _, ok := adm.Registry().Panel("posts"); !ok {
		t.Fatalf("expected posts panel to be registered")
	}
}

func TestEnsureCoreContentPanelsRequiresMissingRepositories(t *testing.T) {
	adm := mustNewWebTestAdmin(t)

	err := ensureCoreContentPanels(adm, nil, &stubPostRepository{})
	if err == nil {
		t.Fatalf("expected missing pages repository to return error")
	}
	if !strings.Contains(err.Error(), "pages store is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func mustNewWebTestAdmin(t *testing.T) *admin.Admin {
	t.Helper()

	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Web Test Admin",
	}, admin.Dependencies{})
	if err != nil {
		t.Fatalf("new admin: %v", err)
	}
	return adm
}

func minimalPanelBuilder() *admin.PanelBuilder {
	return (&admin.PanelBuilder{}).
		WithRepository(admin.NewMemoryRepository()).
		ListFields(admin.Field{Name: "id", Label: "ID", Type: "text"}).
		FormFields(admin.Field{Name: "id", Label: "ID", Type: "text"}).
		DetailFields(admin.Field{Name: "id", Label: "ID", Type: "text"})
}

type stubPageRepository struct{}

var _ stores.PageRepository = (*stubPageRepository)(nil)

func (s *stubPageRepository) Seed() {}

func (s *stubPageRepository) WithActivitySink(admin.ActivitySink) {}

func (s *stubPageRepository) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (s *stubPageRepository) Get(_ context.Context, id string) (map[string]any, error) {
	return map[string]any{"id": id}, nil
}

func (s *stubPageRepository) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	out := map[string]any{}
	for key, value := range record {
		out[key] = value
	}
	return out, nil
}

func (s *stubPageRepository) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	out := map[string]any{"id": id}
	for key, value := range record {
		out[key] = value
	}
	return out, nil
}

func (s *stubPageRepository) Delete(context.Context, string) error {
	return nil
}

func (s *stubPageRepository) Publish(_ context.Context, ids []string) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

func (s *stubPageRepository) Unpublish(_ context.Context, ids []string) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

type stubPostRepository struct{}

var _ stores.PostRepository = (*stubPostRepository)(nil)

func (s *stubPostRepository) Seed() {}

func (s *stubPostRepository) WithActivitySink(admin.ActivitySink) {}

func (s *stubPostRepository) List(context.Context, admin.ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (s *stubPostRepository) Get(_ context.Context, id string) (map[string]any, error) {
	return map[string]any{"id": id}, nil
}

func (s *stubPostRepository) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	out := map[string]any{}
	for key, value := range record {
		out[key] = value
	}
	return out, nil
}

func (s *stubPostRepository) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	out := map[string]any{"id": id}
	for key, value := range record {
		out[key] = value
	}
	return out, nil
}

func (s *stubPostRepository) Delete(context.Context, string) error {
	return nil
}

func (s *stubPostRepository) Publish(_ context.Context, ids []string) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

func (s *stubPostRepository) Unpublish(_ context.Context, ids []string) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

func (s *stubPostRepository) Schedule(_ context.Context, ids []string, _ time.Time) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

func (s *stubPostRepository) Archive(_ context.Context, ids []string) ([]map[string]any, error) {
	return mapIDs(ids), nil
}

func mapIDs(ids []string) []map[string]any {
	out := make([]map[string]any, 0, len(ids))
	for _, id := range ids {
		out = append(out, map[string]any{"id": id})
	}
	return out
}
