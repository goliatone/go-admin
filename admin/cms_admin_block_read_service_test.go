package admin

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

type recordingAdminBlockReadService struct {
	listDefinitionsFn func(context.Context, ListOptions) ([]map[string]any, int, error)
	getDefinitionFn   func(context.Context, string) (map[string]any, error)
	listBlocksFn      func(context.Context, ListOptions) ([]map[string]any, int, error)
	getBlockFn        func(context.Context, string) (map[string]any, error)
}

func (s recordingAdminBlockReadService) ListDefinitions(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.listDefinitionsFn == nil {
		return nil, 0, ErrNotFound
	}
	return s.listDefinitionsFn(ctx, opts)
}

func (s recordingAdminBlockReadService) GetDefinition(ctx context.Context, id string) (map[string]any, error) {
	if s.getDefinitionFn == nil {
		return nil, ErrNotFound
	}
	return s.getDefinitionFn(ctx, id)
}

func (s recordingAdminBlockReadService) ListBlocks(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.listBlocksFn == nil {
		return nil, 0, ErrNotFound
	}
	return s.listBlocksFn(ctx, opts)
}

func (s recordingAdminBlockReadService) GetBlock(ctx context.Context, id string) (map[string]any, error) {
	if s.getBlockFn == nil {
		return nil, ErrNotFound
	}
	return s.getBlockFn(ctx, id)
}

type adminBlockReadContentStub struct {
	CMSContentService
	defs   []CMSBlockDefinition
	items  []CMSContent
	pages  []CMSPage
	blocks map[string][]CMSBlock
}

func (s *adminBlockReadContentStub) BlockDefinitions(_ context.Context) ([]CMSBlockDefinition, error) {
	out := make([]CMSBlockDefinition, 0, len(s.defs))
	out = append(out, s.defs...)
	return out, nil
}

func (s *adminBlockReadContentStub) Contents(_ context.Context, _ string) ([]CMSContent, error) {
	out := make([]CMSContent, 0, len(s.items))
	out = append(out, s.items...)
	return out, nil
}

func (s *adminBlockReadContentStub) Pages(_ context.Context, _ string) ([]CMSPage, error) {
	out := make([]CMSPage, 0, len(s.pages))
	out = append(out, s.pages...)
	return out, nil
}

func (s *adminBlockReadContentStub) BlocksForContent(_ context.Context, contentID, _ string) ([]CMSBlock, error) {
	out := make([]CMSBlock, 0, len(s.blocks[contentID]))
	out = append(out, s.blocks[contentID]...)
	return out, nil
}

func TestAdminBlockReadServiceGetBlockScansAllBlocksWithoutPaginationCap(t *testing.T) {
	ctx := context.Background()
	stub := &adminBlockReadContentStub{
		blocks: map[string][]CMSBlock{},
	}
	for idx := range 1001 {
		contentID := fmt.Sprintf("content-%d", idx)
		blockID := fmt.Sprintf("block-%d", idx)
		stub.items = append(stub.items, CMSContent{ID: contentID})
		stub.blocks[contentID] = []CMSBlock{{
			ID:           blockID,
			DefinitionID: "hero",
			ContentID:    contentID,
			BlockType:    "hero",
		}}
	}

	service := newAdminBlockReadService(stub)
	record, err := service.GetBlock(ctx, "block-1000")
	if err != nil {
		t.Fatalf("get block failed: %v", err)
	}
	if got := toString(record["id"]); got != "block-1000" {
		t.Fatalf("expected block-1000, got %q", got)
	}
}

func TestCMSBlockRepositoriesDelegateReadPathToAdminBlockReadService(t *testing.T) {
	ctx := context.Background()
	read := recordingAdminBlockReadService{
		listDefinitionsFn: func(callCtx context.Context, opts ListOptions) ([]map[string]any, int, error) {
			if callCtx != ctx || opts.PerPage != 5 {
				t.Fatalf("expected definition list passthrough, got ctx=%v opts=%#v", callCtx, opts)
			}
			return []map[string]any{{"id": "hero"}}, 1, nil
		},
		getDefinitionFn: func(callCtx context.Context, id string) (map[string]any, error) {
			if callCtx != ctx || id != "hero" {
				t.Fatalf("expected definition get passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return map[string]any{"id": "hero"}, nil
		},
		listBlocksFn: func(callCtx context.Context, opts ListOptions) ([]map[string]any, int, error) {
			if callCtx != ctx || toString(opts.Filters["content_id"]) != "content-1" {
				t.Fatalf("expected block list passthrough, got ctx=%v opts=%#v", callCtx, opts)
			}
			return []map[string]any{{"id": "block-1"}}, 1, nil
		},
		getBlockFn: func(callCtx context.Context, id string) (map[string]any, error) {
			if callCtx != ctx || id != "block-1" {
				t.Fatalf("expected block get passthrough, got ctx=%v id=%q", callCtx, id)
			}
			return map[string]any{"id": "block-1"}, nil
		},
	}
	defRepo := &CMSBlockDefinitionRepository{read: read}
	blockRepo := &CMSBlockRepository{read: read}

	defs, total, err := defRepo.List(ctx, ListOptions{PerPage: 5})
	if err != nil {
		t.Fatalf("definition list failed: %v", err)
	}
	if total != 1 || len(defs) != 1 || defs[0]["id"] != "hero" {
		t.Fatalf("expected delegated definition list, got total=%d defs=%#v", total, defs)
	}

	def, err := defRepo.Get(ctx, "hero")
	if err != nil {
		t.Fatalf("definition get failed: %v", err)
	}
	if def["id"] != "hero" {
		t.Fatalf("expected delegated definition get, got %#v", def)
	}

	blocks, total, err := blockRepo.List(ctx, ListOptions{Filters: map[string]any{"content_id": "content-1"}})
	if err != nil {
		t.Fatalf("block list failed: %v", err)
	}
	if total != 1 || len(blocks) != 1 || blocks[0]["id"] != "block-1" {
		t.Fatalf("expected delegated block list, got total=%d blocks=%#v", total, blocks)
	}

	block, err := blockRepo.Get(ctx, "block-1")
	if err != nil {
		t.Fatalf("block get failed: %v", err)
	}
	if block["id"] != "block-1" {
		t.Fatalf("expected delegated block get, got %#v", block)
	}
}

func TestAdminBlockReadServiceReturnsNotFoundWithoutContentService(t *testing.T) {
	service := newAdminBlockReadService(nil)

	if _, _, err := service.ListDefinitions(context.Background(), ListOptions{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from ListDefinitions, got %v", err)
	}
	if _, err := service.GetDefinition(context.Background(), "hero"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from GetDefinition, got %v", err)
	}
	if _, _, err := service.ListBlocks(context.Background(), ListOptions{}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from ListBlocks, got %v", err)
	}
	if _, err := service.GetBlock(context.Background(), "block-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound from GetBlock, got %v", err)
	}
}
