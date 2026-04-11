package site

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNavigationProjectMenuItemsIsDeterministic(t *testing.T) {
	runtime := &navigationRuntime{}
	items := []admin.MenuItem{
		{
			ID:       "c",
			Label:    "C",
			Position: new(3),
			Target:   map[string]any{"url": "/c"},
		},
		{
			ID:       "a",
			Label:    "A",
			Position: new(1),
			Target:   map[string]any{"url": "/a"},
		},
		{
			ID:       "b",
			Label:    "B",
			Position: new(2),
			Target:   map[string]any{"url": "/b"},
		},
	}

	first := projectNavigationMenuItems(runtime, items, "/a", "en", menuDedupByURL, false)
	second := projectNavigationMenuItems(runtime, items, "/a", "en", menuDedupByURL, false)
	if len(first) != len(second) || len(first) != 3 {
		t.Fatalf("expected deterministic list length, got first=%d second=%d", len(first), len(second))
	}
	for i := range first {
		if anyString(first[i]["id"]) != anyString(second[i]["id"]) {
			t.Fatalf("expected deterministic ordering, got first=%+v second=%+v", first, second)
		}
	}
	if anyString(first[0]["label"]) != "A" || anyString(first[1]["label"]) != "B" || anyString(first[2]["label"]) != "C" {
		t.Fatalf("expected position-based order A/B/C, got %+v", first)
	}
}

func TestNavigationProjectMenuItemsDedupesByURL(t *testing.T) {
	runtime := &navigationRuntime{}
	items := []admin.MenuItem{
		{ID: "home-primary", Label: "Home", Position: new(1), Target: map[string]any{"url": "/home"}},
		{ID: "home-secondary", Label: "Home Copy", Position: new(2), Target: map[string]any{"url": "/home"}},
		{ID: "about", Label: "About", Position: new(3), Target: map[string]any{"url": "/about"}},
	}

	projected := projectNavigationMenuItems(runtime, items, "/home", "en", menuDedupByURL, false)
	if len(projected) != 2 {
		t.Fatalf("expected URL dedupe to keep two items, got %+v", projected)
	}
	if got := stringsTrimSpace(anyString(projected[0]["id"])); got != "home-primary" {
		t.Fatalf("expected first deduped item home-primary, got %q", got)
	}
	if got := stringsTrimSpace(anyString(projected[1]["id"])); got != "about" {
		t.Fatalf("expected second deduped item about, got %q", got)
	}
}

func TestNavigationProjectMenuItemDebugPreservesContributionOrigin(t *testing.T) {
	runtime := &navigationRuntime{}
	projected := projectNavigationMenuItem(runtime, admin.MenuItem{
		ID:    "contribution",
		Label: "Contributed",
		Target: map[string]any{
			"url":                 "/contributed",
			"contribution":        true,
			"contribution_origin": "override",
		},
	}, "/elsewhere", "en", menuDedupByURL, true)

	if !targetBool(projected, "contribution") {
		t.Fatalf("expected projected contribution flag, got %+v", projected)
	}
	if got := stringsTrimSpace(anyString(projected["contribution_origin"])); got != "override" {
		t.Fatalf("expected contribution origin override, got %q", got)
	}
	debug := nestedMapFromAny(projected["debug"])
	if got := stringsTrimSpace(anyString(debug["contribution_origin"])); got != "override" {
		t.Fatalf("expected debug contribution origin override, got %+v", debug)
	}
}

func TestNavigationFilterMenuItemsDropsUnauthorizedEmptyGroupsAndSeparators(t *testing.T) {
	runtime := &navigationRuntime{
		authorizer: siteAuthorizerStub{
			allowed: map[string]bool{
				"nav.secret": false,
			},
		},
	}
	items := []admin.MenuItem{
		{ID: "sep-leading", Type: "separator"},
		{ID: "group-empty", Type: "group", Label: "Empty", Children: []admin.MenuItem{}},
		{ID: "collapse-empty", Label: "Collapsed", Collapsible: true},
		{ID: "public", Label: "Public", Target: map[string]any{"url": "/public"}},
		{ID: "sep-middle", Type: "separator"},
		{ID: "secret", Label: "Secret", Permissions: []string{"nav.secret"}, Target: map[string]any{"url": "/secret"}},
		{ID: "sep-trailing", Type: "separator"},
	}

	filtered := filterNavigationMenuItems(runtime, context.Background(), items)
	if len(filtered) != 1 {
		t.Fatalf("expected only one visible item after filtering, got %+v", filtered)
	}
	if filtered[0].ID != "public" {
		t.Fatalf("expected public item to remain, got %+v", filtered[0])
	}
}
