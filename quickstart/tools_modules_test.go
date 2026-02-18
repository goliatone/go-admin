package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestNewActivityModuleDefaultsMenuParentToTools(t *testing.T) {
	module := NewActivityModule()
	items := module.MenuItems("en")
	if len(items) != 1 {
		t.Fatalf("expected one menu item, got %d", len(items))
	}
	if items[0].ParentID != NavigationGroupToolsID {
		t.Fatalf("expected parent %q, got %q", NavigationGroupToolsID, items[0].ParentID)
	}
}

func TestNewFeatureFlagsModuleDefaultsMenuParentToTools(t *testing.T) {
	module := NewFeatureFlagsModule()
	items := module.MenuItems("en")
	if len(items) != 1 {
		t.Fatalf("expected one menu item, got %d", len(items))
	}
	if items[0].ParentID != NavigationGroupToolsID {
		t.Fatalf("expected parent %q, got %q", NavigationGroupToolsID, items[0].ParentID)
	}
}

func TestNewDebugModuleDefaultsMenuParentToTools(t *testing.T) {
	module := NewDebugModule(admin.DebugConfig{
		Enabled: true,
		Panels:  []string{admin.DebugPanelSession},
	})
	items := module.MenuItems("en")
	if len(items) != 1 {
		t.Fatalf("expected one menu item, got %d", len(items))
	}
	if items[0].ParentID != NavigationGroupToolsID {
		t.Fatalf("expected parent %q, got %q", NavigationGroupToolsID, items[0].ParentID)
	}
}
