package admin

import (
	"context"
	"testing"
)

func TestInMemoryMenuServiceAddMenuItemIdempotent(t *testing.T) {
	menuSvc := NewInMemoryMenuService()
	ctx := context.Background()
	_, _ = menuSvc.CreateMenu(ctx, "admin.main")

	item := MenuItem{ID: "unique", Label: "Once"}
	if err := menuSvc.AddMenuItem(ctx, "admin.main", item); err != nil {
		t.Fatalf("add first: %v", err)
	}
	if err := menuSvc.AddMenuItem(ctx, "admin.main", item); err != nil {
		t.Fatalf("add duplicate: %v", err)
	}

	menu, err := menuSvc.Menu(ctx, "admin.main", "")
	if err != nil {
		t.Fatalf("menu fetch: %v", err)
	}
	if got := len(menu.Items); got != 1 {
		t.Fatalf("expected 1 item after duplicate add, got %d", got)
	}
	if menu.Items[0].Position != 1 {
		t.Fatalf("expected position to remain 1, got %d", menu.Items[0].Position)
	}
}
