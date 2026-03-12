package admin

import (
	"context"
	"sync"
	"testing"

	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type blockDefinitionCacheContentServiceStub struct{}

func (blockDefinitionCacheContentServiceStub) List(context.Context, ...cmscontent.ContentListOption) ([]*cmscontent.Content, error) {
	return nil, nil
}

func (blockDefinitionCacheContentServiceStub) Get(context.Context, uuid.UUID, ...cmscontent.ContentGetOption) (*cmscontent.Content, error) {
	return nil, nil
}

func (blockDefinitionCacheContentServiceStub) Create(context.Context, cmscontent.CreateContentRequest) (*cmscontent.Content, error) {
	return nil, nil
}

func (blockDefinitionCacheContentServiceStub) Update(context.Context, cmscontent.UpdateContentRequest) (*cmscontent.Content, error) {
	return nil, nil
}

func (blockDefinitionCacheContentServiceStub) Delete(context.Context, cmscontent.DeleteContentRequest) error {
	return nil
}

type blockDefinitionCacheBlockServiceStub struct {
	defs []*cmsblocks.Definition
}

func (s blockDefinitionCacheBlockServiceStub) ListDefinitions(context.Context, ...string) ([]*cmsblocks.Definition, error) {
	return append([]*cmsblocks.Definition{}, s.defs...), nil
}

func (blockDefinitionCacheBlockServiceStub) RegisterDefinition(context.Context, cmsblocks.RegisterDefinitionInput) (*cmsblocks.Definition, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) UpdateDefinition(context.Context, cmsblocks.UpdateDefinitionInput) (*cmsblocks.Definition, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) DeleteDefinition(context.Context, cmsblocks.DeleteDefinitionRequest) error {
	return nil
}

func (blockDefinitionCacheBlockServiceStub) ListDefinitionVersions(context.Context, uuid.UUID) ([]*cmsblocks.DefinitionVersion, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) ListPageInstances(context.Context, uuid.UUID) ([]*cmsblocks.Instance, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) CreateInstance(context.Context, cmsblocks.CreateInstanceInput) (*cmsblocks.Instance, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) UpdateInstance(context.Context, cmsblocks.UpdateInstanceInput) (*cmsblocks.Instance, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) DeleteInstance(context.Context, cmsblocks.DeleteInstanceRequest) error {
	return nil
}

func (blockDefinitionCacheBlockServiceStub) UpdateTranslation(context.Context, cmsblocks.UpdateTranslationInput) (*cmsblocks.Translation, error) {
	return nil, nil
}

func (blockDefinitionCacheBlockServiceStub) AddTranslation(context.Context, cmsblocks.AddTranslationInput) (*cmsblocks.Translation, error) {
	return nil, nil
}

func TestGoCMSContentAdapterBlockDefinitionCacheSupportsConcurrentReads(t *testing.T) {
	blockSvc := blockDefinitionCacheBlockServiceStub{
		defs: []*cmsblocks.Definition{
			{
				ID:     uuid.New(),
				Name:   "hero",
				Slug:   "hero-banner",
				Schema: map[string]any{"x-block-type": "hero"},
			},
			{
				ID:     uuid.New(),
				Name:   "rich_text",
				Slug:   "rich-text",
				Schema: map[string]any{"x-block-type": "rich_text"},
			},
		},
	}

	service := newGoCMSContentAdapter(blockDefinitionCacheContentServiceStub{}, nil, blockSvc, nil, nil)
	adapter, ok := service.(*GoCMSContentAdapter)
	if !ok || adapter == nil {
		t.Fatalf("expected concrete GoCMS adapter")
	}

	ctx := WithContentChannel(context.Background(), "preview")
	var wg sync.WaitGroup
	for i := 0; i < 24; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				defs, err := adapter.BlockDefinitions(ctx)
				if err != nil {
					t.Errorf("BlockDefinitions failed: %v", err)
					return
				}
				if len(defs) != 2 {
					t.Errorf("expected 2 block definitions, got %d", len(defs))
					return
				}
				if got, err := adapter.resolveBlockDefinitionID(ctx, "hero-banner"); err != nil || got != blockSvc.defs[0].ID {
					t.Errorf("expected hero-banner id %s, got %s (err=%v)", blockSvc.defs[0].ID, got, err)
					return
				}
				if got, err := adapter.resolveBlockDefinitionID(ctx, "rich_text"); err != nil || got != blockSvc.defs[1].ID {
					t.Errorf("expected rich_text id %s, got %s (err=%v)", blockSvc.defs[1].ID, got, err)
					return
				}
				if got := adapter.blockDefinitionName(blockSvc.defs[0].ID); got != "hero-banner" {
					t.Errorf("expected hero-banner name, got %q", got)
					return
				}
			}
		}()
	}
	wg.Wait()
}
