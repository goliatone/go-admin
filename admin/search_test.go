package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"

	router "github.com/goliatone/go-router"
)

func TestSearchEngineRespectsPermission(t *testing.T) {
	engine := NewSearchEngine(denyAll{})
	engine.Register("dummy", &repoSearchAdapter{
		repo:       NewMemoryRepository(),
		resource:   "dummy",
		permission: "search.dummy",
	})

	ctx := AdminContext{Context: context.Background()}
	results, err := engine.Query(ctx, "x", 5)
	if err != nil {
		t.Fatalf("query error: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected zero results due to permission, got %d", len(results))
	}
}

func TestSearchEngineDisabledByFeatureGate(t *testing.T) {
	engine := NewSearchEngine(allowAll{})
	engine.Enable(false)

	_, err := engine.Query(AdminContext{Context: context.Background()}, "anything", 5)
	if !errors.Is(err, ErrFeatureDisabled) {
		t.Fatalf("expected feature disabled error, got %v", err)
	}
}

type stubSearchAdapter struct {
	name       string
	permission string
	results    []SearchResult
}

func (s *stubSearchAdapter) Search(ctx context.Context, query string, limit int) ([]SearchResult, error) {
	_ = ctx
	out := []SearchResult{}
	for _, r := range s.results {
		if len(out) >= limit {
			break
		}
		if query == "" || query == r.Title || query == r.Description {
			out = append(out, r)
		}
	}
	return out, nil
}

func (s *stubSearchAdapter) Permission() string {
	return s.permission
}

func TestSearchAggregatesAdapters(t *testing.T) {
	engine := NewSearchEngine(allowAll{})
	engine.Register("users", &stubSearchAdapter{
		results: []SearchResult{{ID: "1", Title: "Alice", Description: "admin"}},
	})
	engine.Register("orders", &stubSearchAdapter{
		results: []SearchResult{{ID: "2", Title: "Order #2"}},
	})

	ctx := AdminContext{Context: context.Background()}
	results, err := engine.Query(ctx, "Order #2", 10)
	if err != nil {
		t.Fatalf("query error: %v", err)
	}
	if len(results) != 1 || results[0].Type != "orders" || results[0].ID != "2" {
		t.Fatalf("unexpected results: %+v", results)
	}
}

type searchAuthorizer struct {
	allowed map[string]bool
}

func (s searchAuthorizer) Can(ctx context.Context, action string, resource string) bool {
	_ = ctx
	_ = resource
	return s.allowed[action]
}

func TestSearchRouteAggregatesAndFiltersByPermission(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Features:      Features{Search: true},
	}
	adm := New(cfg)
	adm.WithAuthorizer(searchAuthorizer{allowed: map[string]bool{"search.users": true}})

	adm.SearchService().Register("users", &stubSearchAdapter{
		permission: "search.users",
		results:    []SearchResult{{ID: "1", Title: "Alice"}},
	})
	adm.SearchService().Register("orders", &stubSearchAdapter{
		permission: "search.orders",
		results:    []SearchResult{{ID: "2", Title: "Order #2"}},
	})

	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	reqDenied := httptest.NewRequest("GET", "/admin/api/search?query=Order%20%232", nil)
	rrDenied := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rrDenied, reqDenied)
	if rrDenied.Code != 200 {
		t.Fatalf("expected 200, got %d", rrDenied.Code)
	}
	var deniedBody map[string]any
	if err := json.Unmarshal(rrDenied.Body.Bytes(), &deniedBody); err != nil {
		t.Fatalf("unmarshal denied response: %v", err)
	}
	deniedResults, ok := deniedBody["results"].([]any)
	if !ok {
		t.Fatalf("expected results array, got %v", deniedBody)
	}
	if len(deniedResults) != 0 {
		t.Fatalf("expected denied adapter to be filtered, got %+v", deniedResults)
	}

	reqAllowed := httptest.NewRequest("GET", "/admin/api/search/typeahead?query=Alice", nil)
	rrAllowed := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rrAllowed, reqAllowed)
	if rrAllowed.Code != 200 {
		t.Fatalf("expected 200, got %d", rrAllowed.Code)
	}
	var allowedBody map[string]any
	if err := json.Unmarshal(rrAllowed.Body.Bytes(), &allowedBody); err != nil {
		t.Fatalf("unmarshal allowed response: %v", err)
	}
	rawResults, ok := allowedBody["results"].([]any)
	if !ok {
		t.Fatalf("expected results array, got %v", allowedBody)
	}
	if len(rawResults) != 1 {
		t.Fatalf("expected one result, got %+v", rawResults)
	}
	first, ok := rawResults[0].(map[string]any)
	if !ok {
		t.Fatalf("expected map result, got %T", rawResults[0])
	}
	if first["id"] != "1" || first["type"] != "users" {
		t.Fatalf("unexpected result payload: %+v", first)
	}
}

func TestSearchRouteFeatureGateDisabled(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
	}
	adm := New(cfg)
	server := router.NewHTTPServer()
	if err := adm.Initialize(server.Router()); err != nil {
		t.Fatalf("initialize: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/api/search?query=anything", nil)
	rr := httptest.NewRecorder()
	server.WrappedRouter().ServeHTTP(rr, req)
	if rr.Code != 404 {
		t.Fatalf("expected 404 when search disabled, got %d", rr.Code)
	}
	var body map[string]any
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	errPayload, ok := body["error"].(map[string]any)
	if !ok || errPayload["text_code"] != "FEATURE_DISABLED" {
		t.Fatalf("expected FEATURE_DISABLED text_code, got %v", body)
	}
}
