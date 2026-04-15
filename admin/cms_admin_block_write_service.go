package admin

import (
	"context"
	"strings"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
)

// AdminBlockWriteService provides admin-shaped write operations for CMS blocks and block definitions.
type AdminBlockWriteService interface {
	CreateDefinition(ctx context.Context, record map[string]any) (map[string]any, error)
	UpdateDefinition(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	DeleteDefinition(ctx context.Context, id string) error
	CreateBlock(ctx context.Context, record map[string]any) (map[string]any, error)
	UpdateBlock(ctx context.Context, id string, record map[string]any) (map[string]any, error)
	DeleteBlock(ctx context.Context, id string) error
}

type goCMSAdminBlockWriteService struct {
	content CMSContentService
}

// NewAdminBlockWriteService builds the local admin block write-service boundary.
func NewAdminBlockWriteService(content CMSContentService) AdminBlockWriteService {
	return newAdminBlockWriteService(content)
}

func newAdminBlockWriteService(content CMSContentService) goCMSAdminBlockWriteService {
	return goCMSAdminBlockWriteService{content: content}
}

func (s goCMSAdminBlockWriteService) CreateDefinition(ctx context.Context, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	if cmsadapter.BlockDefinitionChannel(def) == "" {
		cmsadapter.SetBlockDefinitionChannel(&def, cmsContentChannelFromContext(ctx, ""))
	}
	applyBlockDefinitionDefaults(&def)
	created, err := s.content.CreateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	return adminBlockDefinitionMutationRecord(*created), nil
}

func (s goCMSAdminBlockWriteService) UpdateDefinition(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	if cmsadapter.BlockDefinitionChannel(def) == "" {
		cmsadapter.SetBlockDefinitionChannel(&def, cmsContentChannelFromContext(ctx, ""))
	}
	def.ID = id
	if existing, err := s.findBlockDefinition(ctx, id, cmsadapter.BlockDefinitionChannel(def)); err == nil && existing != nil {
		mergeBlockDefinitionUpdate(&def, existing)
	}
	applyBlockDefinitionDefaults(&def)
	updated, err := s.content.UpdateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	return adminBlockDefinitionMutationRecord(*updated), nil
}

func mergeBlockDefinitionUpdate(target *CMSBlockDefinition, existing *CMSBlockDefinition) {
	if target == nil || existing == nil {
		return
	}
	if strings.TrimSpace(target.Name) == "" {
		target.Name = existing.Name
	}
	if strings.TrimSpace(target.Slug) == "" {
		target.Slug = existing.Slug
	}
	if strings.TrimSpace(target.Type) == "" {
		target.Type = existing.Type
	}
	if strings.TrimSpace(target.Status) == "" {
		target.Status = existing.Status
	}
	if !target.DescriptionSet {
		target.Description = existing.Description
	}
	if !target.IconSet {
		target.Icon = existing.Icon
	}
	if !target.CategorySet {
		target.Category = existing.Category
	}
	if target.Schema == nil {
		target.Schema = existing.Schema
	}
	if target.UISchema == nil {
		target.UISchema = existing.UISchema
	}
}

func (s goCMSAdminBlockWriteService) DeleteDefinition(ctx context.Context, id string) error {
	if s.content == nil {
		return ErrNotFound
	}
	return s.content.DeleteBlockDefinition(ctx, id)
}

func (s goCMSAdminBlockWriteService) CreateBlock(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSContentService(s.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	created, err := s.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*created), nil
}

func (s goCMSAdminBlockWriteService) UpdateBlock(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSContentService(s.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	block.ID = id
	updated, err := s.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*updated), nil
}

func (s goCMSAdminBlockWriteService) DeleteBlock(ctx context.Context, id string) error {
	if err := ensureCMSContentService(s.content); err != nil {
		return err
	}
	return s.content.DeleteBlock(ctx, id)
}

func (s goCMSAdminBlockWriteService) findBlockDefinition(ctx context.Context, id, channel string) (*CMSBlockDefinition, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := s.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	channel = strings.TrimSpace(channel)
	hasChannelFilter := channel != ""
	for _, def := range defs {
		if hasChannelFilter && !cmsadapter.ChannelsMatch(cmsadapter.BlockDefinitionChannel(def), channel) {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(def.ID), target) ||
			strings.EqualFold(strings.TrimSpace(def.Slug), target) ||
			strings.EqualFold(strings.TrimSpace(def.Type), target) {
			copy := def
			return &copy, nil
		}
	}
	return nil, ErrNotFound
}

func adminBlockDefinitionMutationRecord(def CMSBlockDefinition) map[string]any {
	record := adminBlockDefinitionRecord(def)
	record["description"] = def.Description
	record["icon"] = def.Icon
	record["category"] = def.Category
	return record
}
