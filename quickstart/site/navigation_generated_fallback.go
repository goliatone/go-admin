package site

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/admin"
)

type generatedFallbackContentType struct {
	id   string
	slug string
}

func (r *navigationRuntime) generatedFallbackMenu(ctx context.Context, state RequestState, location string) *admin.Menu {
	if r == nil || !r.siteCfg.Navigation.EnableGeneratedFallback || r.contentSvc == nil {
		return nil
	}
	records, pageKinds, err := r.generatedFallbackRecords(ctx, state)
	if err != nil || len(records) == 0 {
		return nil
	}

	byIdentity := generatedFallbackGroups(records, pageKinds, state)
	if len(byIdentity) == 0 {
		return nil
	}

	menuCode := strings.TrimSpace(r.siteCfg.Navigation.FallbackMenuCode)
	items := generatedFallbackItems(menuCode, location, byIdentity, state)
	if len(items) == 0 {
		return nil
	}
	return &admin.Menu{
		Code:     menuCode,
		Location: strings.TrimSpace(location),
		Items:    items,
	}
}

func (r *navigationRuntime) generatedFallbackRecords(ctx context.Context, state RequestState) ([]admin.CMSContent, map[string]bool, error) {
	pageTypes, pageKinds := r.generatedFallbackPageContentTypes(ctx)
	if len(pageTypes) == 0 {
		return nil, pageKinds, nil
	}

	cache, _ := ctx.Value(navigationGeneratedFallbackCacheKey{}).(*siteContentCache)
	records := make([]admin.CMSContent, 0)
	for _, contentType := range pageTypes {
		items, err := listGeneratedFallbackRecordsForType(ctx, cache, r.contentSvc, state.Locale, contentType)
		if err != nil {
			return nil, pageKinds, err
		}
		records = append(records, items...)
	}
	return records, pageKinds, nil
}

func listGeneratedFallbackRecordsForType(ctx context.Context, cache *siteContentCache, contentSvc admin.CMSContentService, locale string, contentType generatedFallbackContentType) ([]admin.CMSContent, error) {
	items, err := listGeneratedFallbackRecordsForScope(ctx, cache, contentSvc, locale, contentType.id, contentType.slug)
	if err != nil || len(items) > 0 {
		return items, err
	}
	slug := strings.TrimSpace(contentType.slug)
	if slug == "" || strings.EqualFold(slug, strings.TrimSpace(contentType.id)) {
		return items, nil
	}
	return listGeneratedFallbackRecordsForScope(ctx, cache, contentSvc, locale, slug, contentType.slug)
}

func listGeneratedFallbackRecordsForScope(ctx context.Context, cache *siteContentCache, contentSvc admin.CMSContentService, locale, scope, slug string) ([]admin.CMSContent, error) {
	if cache != nil {
		return cache.ListForContentType(ctx, contentSvc, locale, scope, slug)
	}
	items, err := listSiteContentsForType(ctx, contentSvc, locale, scope)
	if err != nil {
		return nil, err
	}
	return cloneContentRecords(items), nil
}

func (r *navigationRuntime) generatedFallbackPageContentTypes(ctx context.Context) ([]generatedFallbackContentType, map[string]bool) {
	if r == nil || r.contentType == nil {
		return nil, nil
	}
	types, err := r.contentType.ContentTypes(ctx)
	if err != nil || len(types) == 0 {
		return nil, nil
	}
	pageKinds := generatedFallbackPageKinds(types)
	if len(pageKinds) == 0 {
		return nil, nil
	}
	out := make([]generatedFallbackContentType, 0, len(types))
	for _, contentType := range types {
		capability, ok := capabilityFromContentType(contentType)
		if !ok || capability.normalizedKind() != "page" {
			continue
		}
		slug := strings.TrimSpace(capability.TypeSlug)
		if slug == "" {
			slug = strings.TrimSpace(contentType.Slug)
		}
		id := strings.TrimSpace(contentType.ID)
		if id == "" {
			continue
		}
		out = append(out, generatedFallbackContentType{
			id:   id,
			slug: slug,
		})
	}
	return out, pageKinds
}

func (r *navigationRuntime) pageKindByContentType(ctx context.Context) map[string]bool {
	if r == nil || r.contentType == nil {
		return nil
	}
	types, err := r.contentType.ContentTypes(ctx)
	if err != nil || len(types) == 0 {
		return nil
	}
	return generatedFallbackPageKinds(types)
}
