package admin

import (
	"context"
	"reflect"
	"strings"

	cmsadapter "github.com/goliatone/go-admin/admin/internal/cmsadapter"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

type cmsContentTypeMetadataCacheKey struct{}

type cmsContentTypeMetadataCache map[string]*CMSContentType

func withCMSContentTypeMetadataCache(ctx context.Context) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, ok := ctx.Value(cmsContentTypeMetadataCacheKey{}).(cmsContentTypeMetadataCache); ok {
		return ctx
	}
	return context.WithValue(ctx, cmsContentTypeMetadataCacheKey{}, cmsContentTypeMetadataCache{})
}

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
	cache, _ := ctx.Value(cmsContentTypeMetadataCacheKey{}).(cmsContentTypeMetadataCache)
	if ct := a.contentTypeByMetadataSlug(ctx, cache, content.ContentTypeSlug); ct != nil {
		return ct
	}
	if ct := a.contentTypeByMetadataSlug(ctx, cache, content.ContentType); ct != nil {
		return ct
	}
	if ct := a.contentTypeByMetadataUUID(ctx, cache, content.ContentType); ct != nil {
		return ct
	}
	if ct := a.contentTypeByMetadataUUID(ctx, cache, content.ContentTypeSlug); ct != nil {
		return ct
	}
	return a.contentTypeByMetadataID(ctx, cache, content.ContentType)
}

func (a *GoCMSContentAdapter) contentTypeByMetadataSlug(ctx context.Context, cache cmsContentTypeMetadataCache, slug string) *CMSContentType {
	key := strings.TrimSpace(slug)
	if key == "" {
		return nil
	}
	cacheKey := "slug:" + key
	if cached := cachedCMSContentTypeMetadata(cache, cacheKey); cached != nil {
		return cached
	}
	ct, err := a.contentTypes.ContentTypeBySlug(ctx, key)
	if err != nil || ct == nil {
		return nil
	}
	cacheCMSContentTypeMetadata(cache, cacheKey, ct)
	return ct
}

func (a *GoCMSContentAdapter) contentTypeByMetadataUUID(ctx context.Context, cache cmsContentTypeMetadataCache, key string) *CMSContentType {
	id := cmsadapter.UUIDFromString(key)
	if id == uuid.Nil {
		return nil
	}
	return a.contentTypeByMetadataID(ctx, cache, id.String())
}

func (a *GoCMSContentAdapter) contentTypeByMetadataID(ctx context.Context, cache cmsContentTypeMetadataCache, key string) *CMSContentType {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil
	}
	cacheKey := "id:" + key
	if cached := cachedCMSContentTypeMetadata(cache, cacheKey); cached != nil {
		return cached
	}
	ct, err := a.contentTypes.ContentType(ctx, key)
	if err != nil || ct == nil {
		return nil
	}
	cacheCMSContentTypeMetadata(cache, cacheKey, ct)
	return ct
}

func cachedCMSContentTypeMetadata(cache cmsContentTypeMetadataCache, key string) *CMSContentType {
	if cache == nil {
		return nil
	}
	return cache[key]
}

func cacheCMSContentTypeMetadata(cache cmsContentTypeMetadataCache, key string, ct *CMSContentType) {
	if cache != nil && ct != nil {
		cache[key] = ct
	}
}
