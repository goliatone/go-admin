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

func TestCMSBlockDefinitionRepositoryGetBySlugTreatsBlankEnvironmentAsDefault(t *testing.T) {
	content := &blockDefinitionListServiceStub{
		defs: []CMSBlockDefinition{
			{ID: "hero-legacy", Name: "Hero Legacy", Slug: "hero", Type: "hero", Environment: ""},
			{ID: "hero-staging", Name: "Hero Staging", Slug: "hero", Type: "hero", Environment: "staging"},
		},
	}
	repo := NewCMSBlockDefinitionRepository(content, nil)
	ctxDefault := WithEnvironment(context.Background(), "default")

	record, err := repo.Get(ctxDefault, "hero")
	if err != nil {
		t.Fatalf("get by slug failed: %v", err)
	}
	if toString(record["id"]) != "hero-legacy" {
		t.Fatalf("expected blank environment record to match default, got %+v", record)
	}
}
