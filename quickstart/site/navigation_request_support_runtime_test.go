package site

import (
	"testing"

	router "github.com/goliatone/go-router"
)

func TestNavigationQueryBoolValueParsesTruthyFalsyAndFallback(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["include_contributions"] = " yes "
	if !queryBoolValue(ctx, "include_contributions", false) {
		t.Fatalf("expected truthy query value to parse true")
	}

	ctx.QueriesM["include_contributions"] = " off "
	if queryBoolValue(ctx, "include_contributions", true) {
		t.Fatalf("expected falsy query value to parse false")
	}

	ctx.QueriesM["include_contributions"] = "maybe"
	if !queryBoolValue(ctx, "include_contributions", true) {
		t.Fatalf("expected invalid query value to preserve fallback")
	}

	if queryBoolValue(nil, "include_contributions", false) {
		t.Fatalf("expected nil context to preserve fallback false")
	}
}

func TestNavigationQueryValueTrimsAndNilContextFallsBackEmpty(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["view_profile"] = " compact "
	if got := queryValue(ctx, "view_profile"); got != "compact" {
		t.Fatalf("expected trimmed query value, got %q", got)
	}
	if got := queryValue(nil, "view_profile"); got != "" {
		t.Fatalf("expected nil context to return empty string, got %q", got)
	}
}

func TestNavigationDebugEnabledRecognizesBothQueryFlags(t *testing.T) {
	ctx := router.NewMockContext()
	ctx.QueriesM["nav_debug"] = "1"
	if !navigationDebugEnabled(ctx) {
		t.Fatalf("expected nav_debug flag to enable debug mode")
	}

	ctx = router.NewMockContext()
	ctx.QueriesM["debug_navigation"] = "true"
	if !navigationDebugEnabled(ctx) {
		t.Fatalf("expected debug_navigation flag to enable debug mode")
	}

	if navigationDebugEnabled(router.NewMockContext()) {
		t.Fatalf("expected empty query context to keep debug mode disabled")
	}
}

func TestNavigationEmptyResolvedMenuNormalizesContract(t *testing.T) {
	menu := emptyResolvedMenu(" site.main ", " fallback_code ", "/es/about")
	if got := stringsTrimSpace(anyString(menu["location"])); got != "site.main" {
		t.Fatalf("expected trimmed location, got %q", got)
	}
	if got := stringsTrimSpace(anyString(menu["code"])); got != "fallback_code" {
		t.Fatalf("expected trimmed code, got %q", got)
	}
	if got := stringsTrimSpace(anyString(menu["source"])); got != "empty" {
		t.Fatalf("expected empty source, got %q", got)
	}
	if got := stringsTrimSpace(anyString(menu["active_path"])); got != "/es/about" {
		t.Fatalf("expected normalized active path, got %q", got)
	}
	items := menu["items"].([]map[string]any)
	if len(items) != 0 {
		t.Fatalf("expected empty items slice, got %+v", items)
	}
	if targetBool(menu, "include_drafts") || targetBool(menu, "include_preview") || targetBool(menu, "include_debug") || targetBool(menu, "include_fallback") {
		t.Fatalf("expected all include flags to default false, got %+v", menu)
	}
}

func TestNavigationToMenuItemsContractReturnsTypedSliceOrEmpty(t *testing.T) {
	expected := []map[string]any{
		{"id": "home"},
		{"id": "about"},
	}
	got := toMenuItemsContract(expected)
	if len(got) != 2 || anyString(got[0]["id"]) != "home" || anyString(got[1]["id"]) != "about" {
		t.Fatalf("expected typed slice passthrough, got %+v", got)
	}

	if empty := toMenuItemsContract(nil); len(empty) != 0 {
		t.Fatalf("expected nil raw value to return empty slice, got %+v", empty)
	}
	if empty := toMenuItemsContract([]any{map[string]any{"id": "wrong-type"}}); len(empty) != 0 {
		t.Fatalf("expected non-typed slice to return empty slice, got %+v", empty)
	}
}
