package admin

import (
	"context"
	"reflect"
	"strings"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func resolveContentPageID(contentID string) uuid.UUID {
	return cmsadapter.UUIDFromString(contentID)
}

func (r goCMSContentReadBoundary) blockDefinitionName(id uuid.UUID) string {
	a := r.adapter
	if a == nil {
		return ""
	}
	return a.blockDefinitionCache.Name(id)
}

func (r goCMSContentWriteBoundary) refreshBlockDefinitions(ctx context.Context) {
	a := r.adapter
	if a == nil {
		return
	}
	envKey := cmsContentChannelFromContext(ctx, "")
	usedAdminBlocks := false
	if a.adminBlocks != nil {
		definitions, _, err := a.adminBlocks.ListDefinitions(ctx, cms.AdminBlockDefinitionListOptions{
			EnvironmentKey: envKey,
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
					envKey,
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
			if definition == nil || definition.ID == uuid.Nil {
				continue
			}
			a.blockDefinitionCache.PublishDefinition(
				cmsadapter.ConvertBlockDefinition(reflect.ValueOf(definition)),
				definition.ID,
				envKey,
				true,
			)
		}
	}
}

func (r goCMSContentWriteBoundary) lookupBlockDefinitionID(ctx context.Context, id string) (uuid.UUID, bool) {
	a := r.adapter
	if a == nil {
		return uuid.Nil, false
	}
	return a.blockDefinitionCache.LookupName(cmsContentChannelFromContext(ctx, ""), id)
}

func (r goCMSContentWriteBoundary) contentTypeForMetadata(ctx context.Context, content CMSContent) *CMSContentType {
	a := r.adapter
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
