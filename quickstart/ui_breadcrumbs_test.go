package quickstart

import (
	"context"
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestDeriveBreadcrumbsFromNavEntriesSkipsHiddenGroupsAndUsesOverrides(t *testing.T) {
	entries := []map[string]any{
		{
			"id":                "nav-group-translations",
			"label":             "Translations",
			"breadcrumb_hidden": true,
			"children": []map[string]any{
				{
					"id":               "translation-dashboard",
					"key":              "translation_dashboard",
					"label":            "Translation Dashboard",
					"href":             "/admin/translations/dashboard",
					"breadcrumb_label": "Translations",
					"breadcrumb_href":  "/admin/translations/dashboard",
				},
			},
		},
	}

	got := DeriveBreadcrumbsFromNavEntries(entries, "translation_dashboard")
	if len(got) != 1 {
		t.Fatalf("expected 1 breadcrumb, got %d", len(got))
	}
	if got[0].Label != "Translations" {
		t.Fatalf("expected breadcrumb label Translations, got %+v", got[0])
	}
	if !got[0].Current || got[0].Href != "" {
		t.Fatalf("expected terminal breadcrumb current with empty href, got %+v", got[0])
	}
}

func TestWithResolvedBreadcrumbsAppendsTerminalCrumbFromAnchor(t *testing.T) {
	navItems := []map[string]any{
		{
			"id":               "translation-queue",
			"key":              "translation_queue",
			"label":            "Translation Queue",
			"href":             "/admin/translations/queue",
			"breadcrumb_label": "Queue",
		},
	}

	ctx := WithBreadcrumbAnchor(nil, "translation_queue")
	ctx = WithBreadcrumbAppend(ctx, CurrentBreadcrumb("Assignment abc123"))
	ctx = withResolvedBreadcrumbs(ctx, navItems, "translation_editor")

	got, ok := ctx[ViewKeyBreadcrumbs].([]BreadcrumbItem)
	if !ok {
		t.Fatalf("expected breadcrumbs slice, got %T", ctx[ViewKeyBreadcrumbs])
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 breadcrumbs, got %d", len(got))
	}
	if got[0].Label != "Queue" || got[0].Href != "/admin/translations/queue" || got[0].Current {
		t.Fatalf("expected linked Queue breadcrumb, got %+v", got[0])
	}
	if got[1].Label != "Assignment abc123" || !got[1].Current {
		t.Fatalf("expected terminal assignment breadcrumb, got %+v", got[1])
	}
}

func TestWithResolvedBreadcrumbsOverrideWins(t *testing.T) {
	ctx := WithBreadcrumbOverride(nil,
		Breadcrumb("Admin", "/admin"),
		CurrentBreadcrumb("Custom"),
	)
	ctx = withResolvedBreadcrumbs(ctx, []map[string]any{
		{"key": "settings", "label": "Settings", "href": "/admin/settings"},
	}, "settings")

	got, ok := ctx[ViewKeyBreadcrumbs].([]BreadcrumbItem)
	if !ok {
		t.Fatalf("expected breadcrumbs slice, got %T", ctx[ViewKeyBreadcrumbs])
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 breadcrumbs, got %d", len(got))
	}
	if got[0].Label != "Admin" || got[1].Label != "Custom" || !got[1].Current {
		t.Fatalf("unexpected override breadcrumbs: %+v", got)
	}
}

func TestWithNavPopulatesBreadcrumbsForActiveMenuItem(t *testing.T) {
	cfg := admin.Config{DefaultLocale: "en"}
	adm, err := admin.New(cfg, admin.Dependencies{})
	if err != nil {
		t.Fatalf("admin.New: %v", err)
	}
	adm.Navigation().UseCMS(false)
	adm.Navigation().AddFallback(admin.NavigationItem{
		ID:    "content.pages",
		Label: "Pages",
		Target: map[string]any{
			"path": "/pages",
			"key":  "pages",
		},
	})

	view := WithNav(nil, adm, cfg, "pages", context.Background())
	got, ok := view[ViewKeyBreadcrumbs].([]BreadcrumbItem)
	if !ok {
		t.Fatalf("expected breadcrumbs slice, got %T", view[ViewKeyBreadcrumbs])
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 breadcrumb, got %d", len(got))
	}
	if got[0].Label != "Pages" || !got[0].Current {
		t.Fatalf("unexpected active breadcrumb %+v", got[0])
	}
}
