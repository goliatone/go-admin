package admin

import (
	"context"
	"errors"
	"testing"
)

type recordingAdminBlockWriteService struct {
	createDefinitionFn func(context.Context, map[string]any) (map[string]any, error)
	updateDefinitionFn func(context.Context, string, map[string]any) (map[string]any, error)
	deleteDefinitionFn func(context.Context, string) error
	createBlockFn      func(context.Context, map[string]any) (map[string]any, error)
	updateBlockFn      func(context.Context, string, map[string]any) (map[string]any, error)
	deleteBlockFn      func(context.Context, string) error
}

func (s recordingAdminBlockWriteService) CreateDefinition(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s.createDefinitionFn == nil {
		return nil, ErrNotFound
	}
	return s.createDefinitionFn(ctx, record)
}

func (s recordingAdminBlockWriteService) UpdateDefinition(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s.updateDefinitionFn == nil {
		return nil, ErrNotFound
	}
	return s.updateDefinitionFn(ctx, id, record)
}

func (s recordingAdminBlockWriteService) DeleteDefinition(ctx context.Context, id string) error {
	if s.deleteDefinitionFn == nil {
		return ErrNotFound
	}
	return s.deleteDefinitionFn(ctx, id)
}

func (s recordingAdminBlockWriteService) CreateBlock(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s.createBlockFn == nil {
		return nil, ErrNotFound
	}
	return s.createBlockFn(ctx, record)
}

func (s recordingAdminBlockWriteService) UpdateBlock(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s.updateBlockFn == nil {
		return nil, ErrNotFound
	}
	return s.updateBlockFn(ctx, id, record)
}

func (s recordingAdminBlockWriteService) DeleteBlock(ctx context.Context, id string) error {
	if s.deleteBlockFn == nil {
		return ErrNotFound
	}
	return s.deleteBlockFn(ctx, id)
}

func TestAdminBlockWriteServiceDefinitionAndBlockPreserveRepositoryContract(t *testing.T) {
	ctx := context.Background()
	content := NewInMemoryContentService()
	service := newAdminBlockWriteService(content)

	createdDef, err := service.CreateDefinition(ctx, map[string]any{
		"name":        "Hero",
		"slug":        "hero",
		"type":        "hero",
		"description": "Original",
		"status":      "published",
		"schema": map[string]any{
			"slug": "hero",
		},
	})
	if err != nil {
		t.Fatalf("create definition failed: %v", err)
	}
	if got := toString(createdDef["slug"]); got != "hero" {
		t.Fatalf("expected hero slug, got %q", got)
	}

	updatedDef, err := service.UpdateDefinition(ctx, toString(createdDef["id"]), map[string]any{
		"description": "",
	})
	if err != nil {
		t.Fatalf("update definition failed: %v", err)
	}
	if got := toString(updatedDef["name"]); got != "Hero" {
		t.Fatalf("expected name preserved, got %q", got)
	}
	if got := updatedDef["description"]; got != "" {
		t.Fatalf("expected explicit empty description to persist, got %#v", got)
	}

	createdBlock, err := service.CreateBlock(ctx, map[string]any{
		"definition_id": toString(createdDef["id"]),
		"content_id":    "content-1",
		"region":        "main",
		"block_type":    "hero",
		"data": map[string]any{
			"title": "Welcome",
		},
	})
	if err != nil {
		t.Fatalf("create block failed: %v", err)
	}
	if got := toString(createdBlock["definition_id"]); got != toString(createdDef["id"]) {
		t.Fatalf("expected definition_id passthrough, got %q", got)
	}

	updatedBlock, err := service.UpdateBlock(ctx, toString(createdBlock["id"]), map[string]any{
		"definition_id": toString(createdDef["id"]),
		"content_id":    "content-1",
		"region":        "main",
		"data": map[string]any{
			"title": "Updated",
		},
	})
	if err != nil {
		t.Fatalf("update block failed: %v", err)
	}
	if got := extractMap(updatedBlock["data"])["title"]; got != "Updated" {
		t.Fatalf("expected block data updated, got %#v", updatedBlock["data"])
	}
}

func TestCMSBlockRepositoriesDelegateWritePathToAdminBlockWriteService(t *testing.T) {
	ctx := context.Background()
	write := recordingAdminBlockWriteService{
		createDefinitionFn: func(callCtx context.Context, record map[string]any) (map[string]any, error) {
			if callCtx != ctx || toString(record["name"]) != "Hero" {
				t.Fatalf("expected definition create passthrough, got ctx=%v record=%#v", callCtx, record)
			}
			return map[string]any{"id": "hero"}, nil
		},
		updateDefinitionFn: func(callCtx context.Context, id string, record map[string]any) (map[string]any, error) {
			if callCtx != ctx || id != "hero" {
				t.Fatalf("expected definition update passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return map[string]any{"id": id}, nil
		},
		deleteDefinitionFn: func(callCtx context.Context, id string) error {
			if callCtx != ctx || id != "hero" {
				t.Fatalf("expected definition delete passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return nil
		},
		createBlockFn: func(callCtx context.Context, record map[string]any) (map[string]any, error) {
			if callCtx != ctx || toString(record["content_id"]) != "content-1" {
				t.Fatalf("expected block create passthrough, got ctx=%v record=%#v", callCtx, record)
			}
			return map[string]any{"id": "block-1"}, nil
		},
		updateBlockFn: func(callCtx context.Context, id string, record map[string]any) (map[string]any, error) {
			if callCtx != ctx || id != "block-1" {
				t.Fatalf("expected block update passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return map[string]any{"id": id}, nil
		},
		deleteBlockFn: func(callCtx context.Context, id string) error {
			if callCtx != ctx || id != "block-1" {
				t.Fatalf("expected block delete passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return nil
		},
	}
	defRepo := &CMSBlockDefinitionRepository{write: write}
	blockRepo := &CMSBlockRepository{write: write}

	def, err := defRepo.Create(ctx, map[string]any{"name": "Hero"})
	if err != nil {
		t.Fatalf("definition create failed: %v", err)
	}
	if def["id"] != "hero" {
		t.Fatalf("expected delegated definition create, got %#v", def)
	}

	def, err = defRepo.Update(ctx, "hero", map[string]any{"name": "Hero"})
	if err != nil {
		t.Fatalf("definition update failed: %v", err)
	}
	if def["id"] != "hero" {
		t.Fatalf("expected delegated definition update, got %#v", def)
	}

	if err := defRepo.Delete(ctx, "hero"); err != nil {
		t.Fatalf("definition delete failed: %v", err)
	}

	block, err := blockRepo.Create(ctx, map[string]any{"content_id": "content-1"})
	if err != nil {
		t.Fatalf("block create failed: %v", err)
	}
	if block["id"] != "block-1" {
		t.Fatalf("expected delegated block create, got %#v", block)
	}

	block, err = blockRepo.Update(ctx, "block-1", map[string]any{"content_id": "content-1"})
	if err != nil {
		t.Fatalf("block update failed: %v", err)
	}
	if block["id"] != "block-1" {
		t.Fatalf("expected delegated block update, got %#v", block)
	}

	if err := blockRepo.Delete(ctx, "block-1"); err != nil {
		t.Fatalf("block delete failed: %v", err)
	}
}

func TestAdminBlockWriteServiceReturnsNotFoundWithoutContentService(t *testing.T) {
	service := newAdminBlockWriteService(nil)

	if _, err := service.CreateDefinition(context.Background(), nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from CreateDefinition, got %v", err)
	}
	if _, err := service.UpdateDefinition(context.Background(), "hero", nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from UpdateDefinition, got %v", err)
	}
	if err := service.DeleteDefinition(context.Background(), "hero"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from DeleteDefinition, got %v", err)
	}
	if _, err := service.CreateBlock(context.Background(), nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from CreateBlock, got %v", err)
	}
	if _, err := service.UpdateBlock(context.Background(), "block-1", nil); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from UpdateBlock, got %v", err)
	}
	if err := service.DeleteBlock(context.Background(), "block-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from DeleteBlock, got %v", err)
	}
}
