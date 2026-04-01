package admin

import (
	"context"

	"github.com/goliatone/go-admin/admin/cms/gocmsutil"
	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	"reflect"
	"strings"

	cms "github.com/goliatone/go-cms"
	cmsblocks "github.com/goliatone/go-cms/blocks"
	cmscontent "github.com/goliatone/go-cms/content"
	"github.com/google/uuid"
)

type goCMSContentService interface {
	List(ctx context.Context, opts ...cmscontent.ContentListOption) ([]*cmscontent.Content, error)
	Get(ctx context.Context, id uuid.UUID, opts ...cmscontent.ContentGetOption) (*cmscontent.Content, error)
	Create(ctx context.Context, req cmscontent.CreateContentRequest) (*cmscontent.Content, error)
	Update(ctx context.Context, req cmscontent.UpdateContentRequest) (*cmscontent.Content, error)
	Delete(ctx context.Context, req cmscontent.DeleteContentRequest) error
}

type goCMSBlockService interface {
	ListDefinitions(ctx context.Context, env ...string) ([]*cmsblocks.Definition, error)
	RegisterDefinition(ctx context.Context, input cmsblocks.RegisterDefinitionInput) (*cmsblocks.Definition, error)
	UpdateDefinition(ctx context.Context, input cmsblocks.UpdateDefinitionInput) (*cmsblocks.Definition, error)
	DeleteDefinition(ctx context.Context, req cmsblocks.DeleteDefinitionRequest) error
	ListDefinitionVersions(ctx context.Context, definitionID uuid.UUID) ([]*cmsblocks.DefinitionVersion, error)
	ListPageInstances(ctx context.Context, pageID uuid.UUID) ([]*cmsblocks.Instance, error)
	CreateInstance(ctx context.Context, input cmsblocks.CreateInstanceInput) (*cmsblocks.Instance, error)
	UpdateInstance(ctx context.Context, input cmsblocks.UpdateInstanceInput) (*cmsblocks.Instance, error)
	DeleteInstance(ctx context.Context, req cmsblocks.DeleteInstanceRequest) error
	UpdateTranslation(ctx context.Context, input cmsblocks.UpdateTranslationInput) (*cmsblocks.Translation, error)
	AddTranslation(ctx context.Context, input cmsblocks.AddTranslationInput) (*cmsblocks.Translation, error)
}

// GoCMSContentAdapter maps go-cms content/block services into CMSContentService.
// It uses the typed public go-cms contracts.
type GoCMSContentAdapter struct {
	content      goCMSContentService
	translations any
	blocks       goCMSBlockService
	contentTypes CMSContentTypeService
	locales      *gocmsutil.LocaleIDCache
	adminRead    cms.AdminContentReadService
	adminWrite   cms.AdminContentWriteService
	adminBlocks  cms.AdminBlockReadService
	adminBlockW  cms.AdminBlockWriteService

	blockDefinitionCache *cmsadapter.BlockDefinitionCache
}

// NewGoCMSContentAdapter wraps go-cms services into the admin CMSContentService contract.
func NewGoCMSContentAdapter(contentSvc any, blockSvc any, contentTypeSvc CMSContentTypeService) CMSContentService {
	return newGoCMSContentAdapter(contentSvc, nil, blockSvc, contentTypeSvc, nil, nil, nil, nil, nil)
}

func newGoCMSContentAdapter(contentSvc any, translationSvc any, blockSvc any, contentTypeSvc CMSContentTypeService, localeResolver gocmsutil.LocaleResolver, adminRead cms.AdminContentReadService, adminWrite cms.AdminContentWriteService, adminBlocks cms.AdminBlockReadService, adminBlockWrite cms.AdminBlockWriteService) CMSContentService {
	if contentSvc == nil {
		return nil
	}
	if svc, ok := contentSvc.(CMSContentService); ok && svc != nil {
		return svc
	}
	typedContent, hasTypedContent := contentSvc.(goCMSContentService)
	if !hasTypedContent || typedContent == nil {
		return nil
	}
	typedBlocks, _ := blockSvc.(goCMSBlockService)
	return &GoCMSContentAdapter{
		content:              typedContent,
		translations:         translationSvc,
		blocks:               typedBlocks,
		contentTypes:         contentTypeSvc,
		locales:              gocmsutil.NewLocaleIDCache(localeResolver),
		adminRead:            adminRead,
		adminWrite:           adminWrite,
		adminBlocks:          adminBlocks,
		adminBlockW:          adminBlockWrite,
		blockDefinitionCache: cmsadapter.NewBlockDefinitionCache(),
	}
}

func (a *GoCMSContentAdapter) resolveLocaleID(ctx context.Context, localeCode string) (uuid.UUID, bool) {
	if a == nil || a.locales == nil {
		return uuid.Nil, false
	}
	return a.locales.Resolve(ctx, localeCode)
}

func (a *GoCMSContentAdapter) CreatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().CreatePage(ctx, page)
}

func (a *GoCMSContentAdapter) UpdatePage(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().UpdatePage(ctx, page)
}

func (a *GoCMSContentAdapter) DeletePage(ctx context.Context, id string) error {
	return a.contentWriter().DeletePage(ctx, id)
}

func (a *GoCMSContentAdapter) CreateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	return a.contentWriter().CreateContent(ctx, content)
}

func (a *GoCMSContentAdapter) UpdateContent(ctx context.Context, content CMSContent) (*CMSContent, error) {
	return a.contentWriter().UpdateContent(ctx, content)
}

func (a *GoCMSContentAdapter) DeleteContent(ctx context.Context, id string) error {
	return a.contentWriter().DeleteContent(ctx, id)
}

func (a *GoCMSContentAdapter) BlockDefinitions(ctx context.Context) ([]CMSBlockDefinition, error) {
	return a.contentWriter().BlockDefinitions(ctx)
}

func (a *GoCMSContentAdapter) CreateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return a.contentWriter().CreateBlockDefinition(ctx, def)
}

func (a *GoCMSContentAdapter) UpdateBlockDefinition(ctx context.Context, def CMSBlockDefinition) (*CMSBlockDefinition, error) {
	return a.contentWriter().UpdateBlockDefinition(ctx, def)
}

func (a *GoCMSContentAdapter) DeleteBlockDefinition(ctx context.Context, id string) error {
	return a.contentWriter().DeleteBlockDefinition(ctx, id)
}

// BlockDefinitionVersions returns the schema version history for a block definition.
func (a *GoCMSContentAdapter) BlockDefinitionVersions(ctx context.Context, id string) ([]CMSBlockDefinitionVersion, error) {
	return a.contentWriter().BlockDefinitionVersions(ctx, id)
}

func (a *GoCMSContentAdapter) SaveBlock(ctx context.Context, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().SaveBlock(ctx, block)
}

func (a *GoCMSContentAdapter) DeleteBlock(ctx context.Context, id string) error {
	return a.contentWriter().DeleteBlock(ctx, id)
}

func (a *GoCMSContentAdapter) createBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().createBlockInstance(ctx, defID, pageID, block)
}

func (a *GoCMSContentAdapter) updateBlockInstance(ctx context.Context, defID, pageID uuid.UUID, block CMSBlock) (*CMSBlock, error) {
	return a.contentWriter().updateBlockInstance(ctx, defID, pageID, block)
}

func (a *GoCMSContentAdapter) upsertBlockTranslation(ctx context.Context, instanceID uuid.UUID, block CMSBlock, allowCreate bool) error {
	return a.contentWriter().upsertBlockTranslation(ctx, instanceID, block, allowCreate)
}

func (a *GoCMSContentAdapter) resolveContentTypeID(ctx context.Context, content CMSContent) (uuid.UUID, error) {
	return a.contentWriter().resolveContentTypeID(ctx, content)
}

func (a *GoCMSContentAdapter) resolveBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, error) {
	return a.contentWriter().resolveBlockDefinitionID(ctx, id)
}

func (a *GoCMSContentAdapter) blockDefinitionName(id uuid.UUID) string {
	if a == nil {
		return ""
	}
	return a.blockDefinitionCache.Name(id)
}

func (a *GoCMSContentAdapter) refreshBlockDefinitions(ctx context.Context) {
	if a == nil {
		return
	}
	usedAdminBlocks := false
	if a.adminBlocks != nil {
		definitions, _, err := a.adminBlocks.ListDefinitions(ctx, cms.AdminBlockDefinitionListOptions{
			EnvironmentKey: cmsContentChannelFromContext(ctx, ""),
		})
		if err == nil {
			usedAdminBlocks = true
			for _, definition := range definitions {
				if definition.ID == uuid.Nil {
					continue
				}
				a.blockDefinitionCache.PublishDefinition(
					cmsadapter.AdminBlockDefinitionRecordToCMSBlockDefinition(definition),
					definition.ID,
					cmsContentChannelFromContext(ctx, ""),
					true,
				)
			}
		}
	}
	if !usedAdminBlocks && a.blocks != nil {
		definitions, err := a.blocks.ListDefinitions(ctx)
		if err != nil {
			return
		}
		for _, definition := range definitions {
			if definition == nil {
				continue
			}
			id := definition.ID
			if id == uuid.Nil {
				continue
			}
			a.blockDefinitionCache.PublishDefinition(
				cmsadapter.ConvertBlockDefinition(reflect.ValueOf(definition)),
				id,
				cmsContentChannelFromContext(ctx, ""),
				true,
			)
		}
	}
}

func (a *GoCMSContentAdapter) lookupBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, bool) {
	if a == nil {
		return uuid.Nil, false
	}
	return a.blockDefinitionCache.LookupName(cmsContentChannelFromContext(ctx, ""), id)
}

func (a *GoCMSContentAdapter) resolvePageID(ctx context.Context, contentID string) uuid.UUID {
	parsed := cmsadapter.UUIDFromString(contentID)
	if parsed == uuid.Nil {
		return uuid.Nil
	}
	return parsed
}

func (a *GoCMSContentAdapter) prepareContentMetadata(ctx context.Context, content CMSContent, existing *CMSContent) (map[string]any, map[string]any, bool) {
	return a.contentWriter().prepareContentMetadata(ctx, content, existing)
}

func (a *GoCMSContentAdapter) shouldApplyStructuralMetadata(ctx context.Context, content CMSContent, existing *CMSContent) bool {
	return a.contentWriter().shouldApplyStructuralMetadata(ctx, content, existing)
}

func (a *GoCMSContentAdapter) contentTypeForMetadata(ctx context.Context, content CMSContent) *CMSContentType {
	if a == nil || a.contentTypes == nil {
		return nil
	}
	for _, slug := range []string{content.ContentTypeSlug, content.ContentType} {
		if key := strings.TrimSpace(slug); key != "" {
			if ct, err := a.contentTypes.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
				return ct
			}
		}
	}
	for _, key := range []string{content.ContentType, content.ContentTypeSlug} {
		if id := cmsadapter.UUIDFromString(key); id != uuid.Nil {
			if ct, err := a.contentTypes.ContentType(ctx, id.String()); err == nil && ct != nil {
				return ct
			}
		}
	}
	if key := strings.TrimSpace(content.ContentType); key != "" {
		if ct, err := a.contentTypes.ContentType(ctx, key); err == nil && ct != nil {
			return ct
		}
	}
	return nil
}

func (a *GoCMSContentAdapter) createPageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().createPageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) updatePageFromContent(ctx context.Context, page CMSPage) (*CMSPage, error) {
	return a.contentWriter().updatePageFromContent(ctx, page)
}

func (a *GoCMSContentAdapter) deletePageFromContent(ctx context.Context, id string) error {
	return a.contentWriter().deletePageFromContent(ctx, id)
}
