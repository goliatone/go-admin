package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
)

func TestSearchNormalizedHitURLPrefersCanonicalCandidates(t *testing.T) {
	got := searchNormalizedHitURL(admin.SearchHit{
		URL: " https://example.com/docs/guide ",
		Fields: map[string]any{
			"path": "/posts/ignored",
		},
	})
	if got != "https://example.com/docs/guide" {
		t.Fatalf("expected absolute canonical url, got %q", got)
	}
}

func TestSearchNormalizedHitURLFallsBackToCanonicalContentPath(t *testing.T) {
	got := searchNormalizedHitURL(admin.SearchHit{
		Type: "post",
		Fields: map[string]any{
			"slug": "hello-world",
		},
	})
	if got != "/post/hello-world" {
		t.Fatalf("expected canonical content path fallback, got %q", got)
	}
}

func TestSearchSortOptionsMarksActiveValue(t *testing.T) {
	options := searchSortOptions("published_at:desc")
	var activeCount int
	for _, option := range options {
		if option["active"] == true {
			activeCount++
			if anyString(option["value"]) != "published_at:desc" {
				t.Fatalf("expected published_at:desc to be active, got %+v", option)
			}
		}
	}
	if activeCount != 1 {
		t.Fatalf("expected exactly one active sort option, got %d", activeCount)
	}
}

func TestSearchRequestPayloadCapturesNormalizedQueryState(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Method").Return("GET")
	ctx.On("Path").Return("/search")
	ctx.On("IP").Return("127.0.0.1")
	ctx.On("Context").Return(context.Background())
	ctx.HeadersM["User-Agent"] = "test-agent"
	ctx.HeadersM["Accept-Language"] = "es"
	ctx.QueriesM = map[string]string{
		"q":   "hola",
		"tag": "go,news",
	}
	ctx.On("QueryValues", "q").Return([]string{"hola"})
	ctx.On("QueryValues", "tag").Return([]string{"go,news"})

	payload := searchRequestPayload(ctx)
	if anyString(payload["method"]) != "GET" || anyString(payload["path"]) != "/search" || anyString(payload["ip"]) != "127.0.0.1" {
		t.Fatalf("unexpected request payload identity fields: %+v", payload)
	}
	if anyString(payload["accept_language"]) != "es" {
		t.Fatalf("expected accept_language=es, got %+v", payload)
	}
	queryValues, ok := payload["query_values"].(map[string][]string)
	if !ok || len(queryValues["tag"]) != 2 || queryValues["tag"][0] != "go" || queryValues["tag"][1] != "news" {
		t.Fatalf("expected normalized query_values, got %+v", payload["query_values"])
	}
}

func TestSearchActorPayloadFallsBackToSubject(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.On("Context").Return(auth.WithActorContext(context.Background(), &auth.ActorContext{
		Subject:        "user-42",
		Role:           "editor",
		TenantID:       "tenant-1",
		OrganizationID: "org-1",
		Metadata:       map[string]any{"scope": "search"},
	}))

	payload := searchActorPayload(ctx)
	if anyString(payload["actor_id"]) != "user-42" {
		t.Fatalf("expected actor_id fallback to subject, got %+v", payload)
	}
	if anyString(payload["role"]) != "editor" {
		t.Fatalf("expected actor role, got %+v", payload)
	}
}

func TestSearchRangeValuesAndPositiveFallbackHelpers(t *testing.T) {
	ranges := searchRangeValues([]admin.SearchRange{
		{Field: "published_year", GTE: 2024},
		{Field: "duration_seconds", LTE: 3600},
	})
	if intFromAny(ranges["published_year"]["gte"]) != 2024 || intFromAny(ranges["duration_seconds"]["lte"]) != 3600 {
		t.Fatalf("expected range values map, got %+v", ranges)
	}
	if got := searchPositiveOrFallback(0, 5); got != 5 {
		t.Fatalf("expected fallback 5, got %d", got)
	}
	if got := searchPositiveOrFallback(0, 0); got != 1 {
		t.Fatalf("expected minimum fallback 1, got %d", got)
	}
}

func TestSearchIntQueryParsesOrFallsBack(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM = map[string]string{"page": "7", "bad": "abc"}
	if got := searchIntQuery(ctx, "page", 1); got != 7 {
		t.Fatalf("expected parsed page=7, got %d", got)
	}
	if got := searchIntQuery(ctx, "bad", 3); got != 3 {
		t.Fatalf("expected fallback for bad query, got %d", got)
	}
}
