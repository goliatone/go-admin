package admin

import (
	"context"
	"testing"
)

func TestMenuSlugDeterminismAndUniqueness(t *testing.T) {
	svc := NewInMemoryMenuService()
	ctx := context.Background()

	menu, err := svc.CreateMenu(ctx, "Admin Main")
	if err != nil {
		t.Fatalf("create menu error: %v", err)
	}
	expectedSlug := NormalizeMenuSlug("Admin Main")
	if menu.Slug != expectedSlug {
		t.Fatalf("expected slug %s, got %s", expectedSlug, menu.Slug)
	}
	expectedID := MenuUUIDFromSlug(expectedSlug)
	if menu.ID != expectedID {
		t.Fatalf("expected menu id %s, got %s", expectedID, menu.ID)
	}

	dup, err := svc.CreateMenu(ctx, "admin main")
	if err != nil {
		t.Fatalf("expected duplicate create to be idempotent, got %v", err)
	}
	if dup.ID != expectedID {
		t.Fatalf("expected duplicate menu to reuse id %s, got %s", expectedID, dup.ID)
	}

	fetched, err := svc.Menu(ctx, "ADMIN MAIN", "")
	if err != nil {
		t.Fatalf("fetch menu failed: %v", err)
	}
	if fetched.ID != expectedID {
		t.Fatalf("expected fetched menu id %s, got %s", expectedID, fetched.ID)
	}
	if fetched.Slug != expectedSlug {
		t.Fatalf("expected fetched slug %s, got %s", expectedSlug, fetched.Slug)
	}
}
