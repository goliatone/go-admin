package admin

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"

	router "github.com/goliatone/go-router"
)

func BenchmarkMemoryRepositoryCRUD(b *testing.B) {
	repo := NewMemoryRepository()
	ctx := context.Background()
	for i := 0; i < b.N; i++ {
		rec, err := repo.Create(ctx, map[string]any{"name": fmt.Sprintf("item-%d", i)})
		if err != nil {
			b.Fatalf("create: %v", err)
		}
		id := toString(rec["id"])
		if _, err := repo.Get(ctx, id); err != nil {
			b.Fatalf("get: %v", err)
		}
		if _, _, err := repo.List(ctx, ListOptions{PerPage: 50}); err != nil {
			b.Fatalf("list: %v", err)
		}
		if _, err := repo.Update(ctx, id, map[string]any{"name": "updated"}); err != nil {
			b.Fatalf("update: %v", err)
		}
		if err := repo.Delete(ctx, id); err != nil {
			b.Fatalf("delete: %v", err)
		}
	}
}

func BenchmarkPanelListRoute(b *testing.B) {
	repo := NewMemoryRepository()
	adm, err := New(Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}, Dependencies{})
	if err != nil {
		b.Fatalf("admin.New: %v", err)
	}
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}, Field{Name: "name", Label: "Name", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text"})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		b.Fatalf("register panel: %v", err)
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		b.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/items", nil)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			b.Fatalf("status: %d", rr.Code)
		}
	}
}

func BenchmarkPanelCreateRoute(b *testing.B) {
	adm, err := New(Config{BasePath: "/admin", DefaultLocale: "en"}, Dependencies{})
	if err != nil {
		b.Fatalf("admin.New: %v", err)
	}
	repo := NewMemoryRepository()
	builder := (&PanelBuilder{}).
		WithRepository(repo).
		ListFields(Field{Name: "id", Label: "ID", Type: "text"}, Field{Name: "name", Label: "Name", Type: "text"}).
		FormFields(Field{Name: "name", Label: "Name", Type: "text", Required: true})
	if _, err := adm.RegisterPanel("items", builder); err != nil {
		b.Fatalf("register panel: %v", err)
	}
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		b.Fatalf("initialize: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		body := fmt.Sprintf(`{"name":"Item-%d"}`, i)
		req := httptest.NewRequest("POST", "/admin/api/items", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		server.WrappedRouter().ServeHTTP(rr, req)
		if rr.Code != 200 {
			b.Fatalf("status: %d body=%s", rr.Code, rr.Body.String())
		}
	}
}

type translationActionBenchmarkRepo struct {
	source map[string]any
	nextID int
}

func (s *translationActionBenchmarkRepo) List(context.Context, ListOptions) ([]map[string]any, int, error) {
	return nil, 0, nil
}

func (s *translationActionBenchmarkRepo) Get(_ context.Context, id string) (map[string]any, error) {
	if s.source == nil || strings.TrimSpace(id) != strings.TrimSpace(toString(s.source["id"])) {
		return nil, ErrNotFound
	}
	return cloneAnyMap(s.source), nil
}

func (s *translationActionBenchmarkRepo) Create(_ context.Context, record map[string]any) (map[string]any, error) {
	s.nextID++
	out := cloneAnyMap(record)
	out["id"] = fmt.Sprintf("translation_%d", s.nextID)
	return out, nil
}

func (s *translationActionBenchmarkRepo) Update(context.Context, string, map[string]any) (map[string]any, error) {
	return nil, ErrNotFound
}

func (s *translationActionBenchmarkRepo) Delete(context.Context, string) error {
	return ErrNotFound
}

func BenchmarkPanelActionCreateTranslation(b *testing.B) {
	repo := &translationActionBenchmarkRepo{
		source: map[string]any{
			"id":                   "page_123",
			"locale":               "en",
			"status":               "approval",
			"translation_group_id": "tg_123",
			"available_locales":    []string{"en"},
		},
	}
	panel := &Panel{name: "pages", repo: repo}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	previousLogger := translationObservabilityLogger
	translationObservabilityLogger = slog.New(slog.NewTextHandler(io.Discard, nil))
	b.Cleanup(func() {
		translationObservabilityLogger = previousLogger
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := binding.Action(c, "en", "create_translation", map[string]any{
			"id":          "page_123",
			"locale":      fmt.Sprintf("es-%d", i),
			"environment": "production",
		})
		if err != nil {
			b.Fatalf("create_translation action failed: %v", err)
		}
	}
}

func BenchmarkPanelActionBlockedTransition(b *testing.B) {
	repo := &translationActionBenchmarkRepo{
		source: map[string]any{
			"id":                   "page_123",
			"locale":               "en",
			"status":               "approval",
			"translation_group_id": "tg_123",
			"available_locales":    []string{"en"},
		},
	}
	panel := &Panel{
		name:     "pages",
		repo:     repo,
		workflow: translationWorkflowStub{},
		actions:  []Action{{Name: "publish"}},
		translationPolicy: TranslationPolicyFunc(func(context.Context, TranslationPolicyInput) error {
			return MissingTranslationsError{
				EntityType:      "pages",
				EntityID:        "page_123",
				Transition:      "publish",
				RequestedLocale: "en",
				Environment:     "production",
				MissingLocales:  []string{"es"},
			}
		}),
	}
	binding := &panelBinding{
		admin: &Admin{config: Config{DefaultLocale: "en"}},
		name:  "pages",
		panel: panel,
	}
	c := router.NewMockContext()
	c.On("Context").Return(context.Background())

	previousLogger := translationObservabilityLogger
	translationObservabilityLogger = slog.New(slog.NewTextHandler(io.Discard, nil))
	b.Cleanup(func() {
		translationObservabilityLogger = previousLogger
	})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := binding.Action(c, "en", "publish", map[string]any{
			"id":          "page_123",
			"locale":      "en",
			"environment": "production",
		})
		if err == nil {
			b.Fatal("expected blocked transition error")
		}
	}
}
