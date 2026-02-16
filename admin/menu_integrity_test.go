package admin

import (
	"context"
	"strings"
	"testing"
)

func TestInMemoryMenuServiceRejectsSelfParentUpdate(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryMenuService()
	menuCode := "admin.main"

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:       "root",
		Label:    "Root",
		Locale:   "en",
		Target:   map[string]any{"type": "url", "path": "/admin/root", "key": "root"},
		Menu:     menuCode,
		Position: intPtr(1),
	}); err != nil {
		t.Fatalf("add root: %v", err)
	}

	err := svc.UpdateMenuItem(ctx, menuCode, MenuItem{
		ID:       "root",
		Label:    "Root",
		Locale:   "en",
		ParentID: "root",
		Target:   map[string]any{"type": "url", "path": "/admin/root", "key": "root"},
		Menu:     menuCode,
	})
	if err == nil {
		t.Fatalf("expected self-parent update to fail")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "parent cannot reference itself") {
		t.Fatalf("expected self-parent validation error, got %v", err)
	}
}

func TestInMemoryMenuServiceRejectsCycleUpdate(t *testing.T) {
	ctx := context.Background()
	svc := NewInMemoryMenuService()
	menuCode := "admin.main"

	if _, err := svc.CreateMenu(ctx, menuCode); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:       "root",
		Label:    "Root",
		Locale:   "en",
		Target:   map[string]any{"type": "url", "path": "/admin/root", "key": "root"},
		Menu:     menuCode,
		Position: intPtr(1),
	}); err != nil {
		t.Fatalf("add root: %v", err)
	}
	if err := svc.AddMenuItem(ctx, menuCode, MenuItem{
		ID:       "child",
		Label:    "Child",
		Locale:   "en",
		ParentID: "root",
		Target:   map[string]any{"type": "url", "path": "/admin/child", "key": "child"},
		Menu:     menuCode,
		Position: intPtr(2),
	}); err != nil {
		t.Fatalf("add child: %v", err)
	}

	err := svc.UpdateMenuItem(ctx, menuCode, MenuItem{
		ID:       "root",
		Label:    "Root",
		Locale:   "en",
		ParentID: "child",
		Target:   map[string]any{"type": "url", "path": "/admin/root", "key": "root"},
		Menu:     menuCode,
	})
	if err == nil {
		t.Fatalf("expected cycle update to fail")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "cycle") {
		t.Fatalf("expected cycle validation error, got %v", err)
	}
}

func TestGoCMSMenuAdapterRejectsSelfParentUpsert(t *testing.T) {
	ctx := context.Background()
	adapter := NewGoCMSMenuAdapterFromAny(newStubCMSMenuService())

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	err := adapter.AddMenuItem(ctx, "admin.main", MenuItem{
		ID:       "root",
		Label:    "Root",
		Locale:   "en",
		ParentID: "root",
		Target:   map[string]any{"slug": "root"},
	})
	if err == nil {
		t.Fatalf("expected self-parent upsert to fail")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "parent cannot reference itself") {
		t.Fatalf("expected self-parent validation error, got %v", err)
	}
}

func TestGoCMSMenuAdapterRejectsCycleUpdate(t *testing.T) {
	ctx := context.Background()
	adapter := NewGoCMSMenuAdapterFromAny(newStubCMSMenuService())

	if _, err := adapter.CreateMenu(ctx, "admin.main"); err != nil {
		t.Fatalf("create menu: %v", err)
	}
	if err := adapter.AddMenuItem(ctx, "admin.main", MenuItem{
		ID:     "root",
		Label:  "Root",
		Locale: "en",
		Target: map[string]any{"slug": "root"},
	}); err != nil {
		t.Fatalf("add root: %v", err)
	}
	if err := adapter.AddMenuItem(ctx, "admin.main", MenuItem{
		ID:       "child",
		Label:    "Child",
		Locale:   "en",
		ParentID: "root",
		Target:   map[string]any{"slug": "child"},
	}); err != nil {
		t.Fatalf("add child: %v", err)
	}

	menu, err := adapter.Menu(ctx, "admin.main", "en")
	if err != nil {
		t.Fatalf("menu: %v", err)
	}
	root, ok := menuItemByID(menu.Items, "admin_main.root")
	if !ok {
		t.Fatalf("missing root item in menu: %+v", menu.Items)
	}
	child, ok := menuItemByID(menu.Items, "admin_main.root.child")
	if !ok {
		t.Fatalf("missing child item in menu: %+v", menu.Items)
	}

	err = adapter.UpdateMenuItem(ctx, "admin.main", MenuItem{
		ID:       root.ID,
		ParentID: child.ID,
	})
	if err == nil {
		t.Fatalf("expected cycle update to fail")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "cycle") {
		t.Fatalf("expected cycle validation error, got %v", err)
	}
}
