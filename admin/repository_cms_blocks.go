package admin

import (
	"context"
	"strings"
)

// CMSBlockDefinitionRepository manages block definitions through CMSContentService.
type CMSBlockDefinitionRepository struct {
	content CMSContentService
	types   CMSContentTypeService
	read    AdminBlockReadService
	write   AdminBlockWriteService
}

// NewCMSBlockDefinitionRepository builds a block definition repository.
func NewCMSBlockDefinitionRepository(content CMSContentService, types CMSContentTypeService) *CMSBlockDefinitionRepository {
	return &CMSBlockDefinitionRepository{
		content: content,
		types:   types,
		read:    newAdminBlockReadService(content, types),
		write:   newAdminBlockWriteService(content),
	}
}

// List returns block definitions.
func (r *CMSBlockDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	return r.readService().ListDefinitions(ctx, opts)
}

// Get returns a single block definition.
func (r *CMSBlockDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	return r.readService().GetDefinition(ctx, id)
}

// Create adds a block definition.
func (r *CMSBlockDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.writeService().CreateDefinition(ctx, record)
}

// Update modifies a block definition.
func (r *CMSBlockDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	return r.writeService().UpdateDefinition(ctx, id, record)
}

// Delete removes a block definition.
func (r *CMSBlockDefinitionRepository) Delete(ctx context.Context, id string) error {
	return r.writeService().DeleteDefinition(ctx, id)
}

func (r *CMSBlockDefinitionRepository) readService() AdminBlockReadService {
	if r == nil {
		return nil
	}
	if r.read != nil {
		return r.read
	}
	return newAdminBlockReadService(r.content, r.types)
}

func (r *CMSBlockDefinitionRepository) writeService() AdminBlockWriteService {
	if r == nil {
		return nil
	}
	if r.write != nil {
		return r.write
	}
	return newAdminBlockWriteService(r.content)
}

func blockDefinitionMatchesAllowedTypes(def CMSBlockDefinition, allowed map[string]struct{}) bool {
	if len(allowed) == 0 {
		return false
	}
	candidates := []string{
		strings.TrimSpace(blockDefinitionType(def)),
		strings.TrimSpace(def.Slug),
		strings.TrimSpace(def.Type),
		strings.TrimSpace(def.ID),
		strings.TrimSpace(def.Name),
		strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema)),
	}
	for _, value := range candidates {
		if value == "" {
			continue
		}
		for _, alias := range blockTypeAliasCandidates(strings.ToLower(strings.TrimSpace(value))) {
			key := strings.ToLower(strings.TrimSpace(alias))
			if key == "" {
				continue
			}
			if _, ok := allowed[key]; ok {
				return true
			}
		}
	}
	return false
}

// CMSBlockRepository manages blocks assigned to content/pages.
type CMSBlockRepository struct {
	content CMSContentService
	read    AdminBlockReadService
	write   AdminBlockWriteService
}

// NewCMSBlockRepository builds a block repository.
func NewCMSBlockRepository(content CMSContentService) *CMSBlockRepository {
	return &CMSBlockRepository{
		content: content,
		read:    newAdminBlockReadService(content),
		write:   newAdminBlockWriteService(content),
	}
}

func (r *CMSBlockRepository) readService() AdminBlockReadService {
	if r == nil {
		return nil
	}
	if r.read != nil {
		return r.read
	}
	return newAdminBlockReadService(r.content)
}

func (r *CMSBlockRepository) writeService() AdminBlockWriteService {
	if r == nil {
		return nil
	}
	if r.write != nil {
		return r.write
	}
	return newAdminBlockWriteService(r.content)
}

// List returns blocks for a content ID (or all when unspecified).
func (r *CMSBlockRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	return r.readService().ListBlocks(ctx, opts)
}

// Get returns a block by id.
func (r *CMSBlockRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	return r.readService().GetBlock(ctx, id)
}

// Create saves a new block.
func (r *CMSBlockRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.writeService().CreateBlock(ctx, record)
}

// Update modifies an existing block.
func (r *CMSBlockRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	return r.writeService().UpdateBlock(ctx, id, record)
}

// Delete removes a block.
func (r *CMSBlockRepository) Delete(ctx context.Context, id string) error {
	return r.writeService().DeleteBlock(ctx, id)
}
