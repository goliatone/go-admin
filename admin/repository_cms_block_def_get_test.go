package admin

import (
	"context"
	"testing"
)

func TestCMSBlockDefinitionRepositoryGetBySlug(t *testing.T) {
	content := NewInMemoryContentService()
	ctx := context.Background()
	_, _ = content.CreateBlockDefinition(ctx, CMSBlockDefinition{
		ID:   "hero",
		Name: "Hero",
		Slug: "hero-section",
		Type: "hero",
	})

	repo := NewCMSBlockDefinitionRepository(content, content)
	record, err := repo.Get(ctx, "hero-section")
	if err != nil {
		t.Fatalf("get by slug failed: %v", err)
	}
	if toString(record["id"]) != "hero" {
		t.Fatalf("expected hero id, got %+v", record)
	}
}

func TestCMSBlockDefinitionRepositoryGetBySlugRespectsEnvironment(t *testing.T) {
	content := NewInMemoryContentService()
	ctxDev := WithEnvironment(context.Background(), "dev")
	ctxProd := WithEnvironment(context.Background(), "prod")

	_, _ = content.CreateBlockDefinition(ctxDev, CMSBlockDefinition{
		ID:   "hero-dev",
		Name: "Hero Dev",
		Slug: "hero",
		Type: "hero",
	})
	_, _ = content.CreateBlockDefinition(ctxProd, CMSBlockDefinition{
		ID:   "hero-prod",
		Name: "Hero Prod",
		Slug: "hero",
		Type: "hero",
	})

	repo := NewCMSBlockDefinitionRepository(content, content)
	record, err := repo.Get(ctxProd, "hero")
	if err != nil {
		t.Fatalf("get by slug failed: %v", err)
	}
	if toString(record["id"]) != "hero-prod" {
		t.Fatalf("expected prod id, got %+v", record)
	}
}
