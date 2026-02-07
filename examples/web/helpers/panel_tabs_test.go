package helpers

import (
	"testing"

	"github.com/goliatone/go-admin/pkg/admin"
)

func TestBuildPanelTabViewsInjectsDetailsTabWhenMissing(t *testing.T) {
	tabs := []admin.PanelTab{
		{
			ID:     "profile",
			Label:  "Profile",
			Scope:  admin.PanelTabScopeDetail,
			Target: admin.PanelTabTarget{Type: "panel", Panel: "user-profiles"},
		},
		{
			ID:     "activity",
			Label:  "Activity",
			Scope:  admin.PanelTabScopeDetail,
			Target: admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
		},
	}

	views := BuildPanelTabViews(tabs, PanelTabViewOptions{
		PanelName:  "users",
		BasePath:   "/admin",
		DetailPath: "/admin/users/123",
		Record:     map[string]any{"id": "123"},
	})

	if len(views) != 3 {
		t.Fatalf("expected injected details tab + 2 existing tabs, got %d", len(views))
	}
	if got := views[0]["id"]; got != "details" {
		t.Fatalf("expected first tab to be details, got %v", got)
	}
}

func TestBuildPanelTabViewsDoesNotDuplicateDetailsTab(t *testing.T) {
	tabs := []admin.PanelTab{
		{
			ID:     "details",
			Label:  "Details",
			Scope:  admin.PanelTabScopeDetail,
			Target: admin.PanelTabTarget{Type: "panel", Panel: "users"},
		},
		{
			ID:     "activity",
			Label:  "Activity",
			Scope:  admin.PanelTabScopeDetail,
			Target: admin.PanelTabTarget{Type: "path", Path: "/admin/activity"},
		},
	}

	views := BuildPanelTabViews(tabs, PanelTabViewOptions{
		PanelName:  "users",
		BasePath:   "/admin",
		DetailPath: "/admin/users/123",
		Record:     map[string]any{"id": "123"},
	})

	if len(views) != 2 {
		t.Fatalf("expected no duplicate details tab, got %d tabs", len(views))
	}
}
