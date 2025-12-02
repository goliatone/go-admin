package admin

import (
	"context"
	"fmt"
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
	adm := New(Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	})
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
	adm := New(Config{BasePath: "/admin", DefaultLocale: "en"})
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
