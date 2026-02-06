package admin

import (
	"context"
	"testing"

	goerrors "github.com/goliatone/go-errors"
)

func TestCMSPageRepositoryUpdateRequiresCreateTranslation(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSPageRepository(content)

	created, err := repo.Create(ctx, map[string]any{
		"title":  "Home",
		"slug":   "home",
		"locale": "en",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("expected id assigned")
	}

	_, err = repo.Update(ctx, id, map[string]any{
		"title":            "Inicio",
		"requested_locale": "es",
	})
	if err == nil {
		t.Fatalf("expected translation create required error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed validation error, got %T", err)
	}
	if val, ok := typedErr.Metadata["translation_missing"].(bool); !ok || !val {
		t.Fatalf("expected translation_missing metadata, got %+v", typedErr.Metadata)
	}
	if got, ok := typedErr.Metadata["requested_locale"].(string); !ok || got != "es" {
		t.Fatalf("expected requested_locale metadata %q, got %+v", "es", typedErr.Metadata["requested_locale"])
	}

	page, err := content.Page(ctx, id, "en")
	if err != nil || page == nil {
		t.Fatalf("expected page to remain, got err=%v", err)
	}
	if page.Title != "Home" {
		t.Fatalf("expected fallback page unchanged, got %+v", page)
	}
}

func TestCMSContentRepositoryUpdateRequiresCreateTranslation(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	repo := NewCMSContentRepository(content)

	created, err := repo.Create(ctx, map[string]any{
		"title":        "Post",
		"slug":         "post",
		"locale":       "en",
		"content_type": "post",
		"status":       "draft",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	id, _ := created["id"].(string)
	if id == "" {
		t.Fatalf("expected id assigned")
	}

	_, err = repo.Update(ctx, id, map[string]any{
		"title":            "Publicacion",
		"requested_locale": "es",
	})
	if err == nil {
		t.Fatalf("expected translation create required error")
	}
	var typedErr *goerrors.Error
	if !goerrors.As(err, &typedErr) {
		t.Fatalf("expected typed validation error, got %T", err)
	}
	if val, ok := typedErr.Metadata["translation_missing"].(bool); !ok || !val {
		t.Fatalf("expected translation_missing metadata, got %+v", typedErr.Metadata)
	}
	if got, ok := typedErr.Metadata["requested_locale"].(string); !ok || got != "es" {
		t.Fatalf("expected requested_locale metadata %q, got %+v", "es", typedErr.Metadata["requested_locale"])
	}

	item, err := content.Content(ctx, id, "en")
	if err != nil || item == nil {
		t.Fatalf("expected content to remain, got err=%v", err)
	}
	if item.Title != "Post" {
		t.Fatalf("expected fallback content unchanged, got %+v", item)
	}
}
