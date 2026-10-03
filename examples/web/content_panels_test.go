package main

import (
	"context"
	"errors"
	"maps"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-admin/examples/web/commands"
	"github.com/goliatone/go-admin/examples/web/stores"
	"github.com/goliatone/go-admin/pkg/admin"
	commandregistry "github.com/goliatone/go-command/registry"
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

func TestEnsureCoreContentPanelsDoesNotWriteNavigationMenuItems(t *testing.T) {
	adm := mustNewWebTestAdmin(t)

	if err := ensureCoreContentPanels(adm, &stubPageRepository{}, &stubPostRepository{}); err != nil {
		t.Fatalf("ensure core content panels: %v", err)
	}

	menu, err := adm.MenuService().Menu(context.Background(), adm.NavMenuCode(), adm.DefaultLocale())
	if err != nil {
		t.Fatalf("resolve menu: %v", err)
	}
	if menu == nil {
		t.Fatalf("expected menu")
	}

	if item := findMenuItemByTargetKey(menu.Items, "pages"); item != nil {
		t.Fatalf("expected pages fallback menu write to be absent, got %#v", item)
	}
	if item := findMenuItemByTargetKey(menu.Items, "posts"); item != nil {
		t.Fatalf("expected posts fallback menu write to be absent, got %#v", item)
	}
}

func mustNewWebTestAdmin(t *testing.T) *admin.Admin {
	t.Helper()

	adm, err := admin.New(admin.Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Title:         "Web Test Admin",
		AuthConfig:    &admin.AuthConfig{AllowUnauthenticatedRoutes: true},
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
	maps.Copy(out, record)
	return out, nil
}

func (s *stubPageRepository) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	out := map[string]any{"id": id}
	maps.Copy(out, record)
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
	maps.Copy(out, record)
	return out, nil
}

func (s *stubPostRepository) Update(_ context.Context, id string, record map[string]any) (map[string]any, error) {
	out := map[string]any{"id": id}
	maps.Copy(out, record)
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

func findMenuItemByTargetKey(items []admin.MenuItem, key string) *admin.MenuItem {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	for i := range items {
		item := &items[i]
		if item.Target != nil {
			if raw, ok := item.Target["key"].(string); ok && strings.EqualFold(strings.TrimSpace(raw), key) {
				return item
			}
		}
		if len(item.Children) > 0 {
			if found := findMenuItemByTargetKey(item.Children, key); found != nil {
				return found
			}
		}
	}
	return nil
}

type countingPageRepository struct {
	stubPageRepository
	calls int
}

func (r *countingPageRepository) Publish(ctx context.Context, ids []string) ([]map[string]any, error) {
	r.calls++
	return r.stubPageRepository.Publish(ctx, ids)
}

func TestCoreContentCommandWiringCompletesPartialRegistrationAndIsIdempotent(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		adm := mustNewWebTestAdmin(t)
		adm.Commands().Enable(true)
		defer adm.Commands().Close()
		pages := &countingPageRepository{}
		// Simulate a prior setup attempt that only registered the first factory.
		if err := admin.RegisterMessageFactory(adm.Commands(), "pages.publish", func(_ map[string]any, ids []string) (commands.PagePublishMsg, error) {
			return commands.PagePublishMsg{IDs: ids}, nil
		}); err != nil {
			t.Fatal(err)
		}
		for range 2 {
			if err := ensureCoreContentPanelCommandWiring(adm, pages, &stubPostRepository{}); err != nil {
				t.Fatalf("repeat setup: %v", err)
			}
		}
		for _, name := range []string{"pages.publish", "pages.bulk_publish", "pages.bulk_unpublish", "posts.bulk_publish", "posts.bulk_unpublish", "posts.bulk_schedule", "posts.bulk_archive"} {
			if !adm.Commands().CommandRegistration(name).CanDispatch() {
				t.Errorf("command %s was left incomplete", name)
			}
		}
		if err := adm.Commands().DispatchByName(context.Background(), "pages.publish", nil, []string{"page"}); err != nil {
			t.Fatal(err)
		}
		if pages.calls != 1 {
			t.Fatalf("repeat setup registered %d handlers, want 1", pages.calls)
		}
	})
}

func TestCoreContentCommandWiringPropagatesRegistrationFailures(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		adm := mustNewWebTestAdmin(t)
		adm.Commands().Enable(true)
		defer adm.Commands().Close()
		if err := commandregistry.Start(context.Background()); err != nil {
			t.Fatal(err)
		}
		err := ensureCoreContentPanelCommandWiring(adm, &stubPageRepository{}, &stubPostRepository{})
		if err == nil || errors.Is(err, admin.ErrCommandAlreadyRegistered) {
			t.Fatalf("registry lifecycle error was ignored: %v", err)
		}
	})
}
