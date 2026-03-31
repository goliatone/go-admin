package admin

import (
	"context"
	"errors"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
)

// AdminContentReadService provides admin-shaped read operations for CMS content.
type AdminContentReadService interface {
	List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error)
	Get(ctx context.Context, id string) (map[string]any, error)
	ListForContentType(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error)
	GetForContentType(ctx context.Context, contentType CMSContentType, id string) (map[string]any, error)
}

type goCMSAdminContentReadService struct {
	content      CMSContentService
	contentTypes CMSContentTypeService
}

// NewAdminContentReadService builds the local admin content read-service boundary.
func NewAdminContentReadService(content CMSContentService, contentTypes ...CMSContentTypeService) AdminContentReadService {
	return newAdminContentReadService(content, contentTypes...)
}

func newAdminContentReadService(content CMSContentService, contentTypes ...CMSContentTypeService) goCMSAdminContentReadService {
	service := goCMSAdminContentReadService{content: content}
	if len(contentTypes) > 0 && contentTypes[0] != nil {
		service.contentTypes = contentTypes[0]
	} else if typed, ok := content.(CMSContentTypeService); ok && typed != nil {
		service.contentTypes = typed
	}
	return service
}

func (s goCMSAdminContentReadService) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contents, err := s.content.Contents(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	records := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		if contentRecordRequiresCanonicalTopLevelFields(item) {
			if err := ensureCanonicalTopLevelFields(item); err != nil {
				return nil, 0, err
			}
		}
		item = normalizeCMSContentLocaleState(item, locale)
		record := cmsContentRecord(item, cmsContentRecordOptions{
			includeBlocks:   true,
			includeData:     true,
			includeMetadata: true,
		})
		if policy, ok := s.resolveContentNavigationPolicy(ctx, primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)); ok {
			record = applyContentEntryNavigationReadContract(record, policy)
		}
		records = append(records, record)
	}
	listOpts := opts
	if strings.TrimSpace(listOpts.SortBy) == "" {
		listOpts.SortBy = "id"
	}
	list, total := applyListOptionsToRecordMaps(records, listOpts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsContentRecordSearchMatcher,
	})
	return list, total, nil
}

func (s goCMSAdminContentReadService) Get(ctx context.Context, id string) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	item, err := s.content.Content(ctx, id, localeFromContext(ctx))
	if err != nil && errors.Is(err, ErrNotFound) {
		if locale := s.resolveContentLocale(ctx, id); locale != "" {
			item, err = s.content.Content(ctx, id, locale)
		}
	}
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrNotFound
	}
	if contentRecordRequiresCanonicalTopLevelFields(*item) {
		if err := ensureCanonicalTopLevelFields(*item); err != nil {
			return nil, err
		}
	}
	requested := strings.TrimSpace(primitives.FirstNonEmptyRaw(localeFromContext(ctx), item.RequestedLocale))
	normalized := normalizeCMSContentLocaleState(*item, requested)
	if requested != "" && normalized.MissingRequestedLocale && !localeFallbackAllowed(ctx) {
		return nil, translationMissingNotFoundError(requested, normalized.AvailableLocales, map[string]any{
			"entity":       "content",
			"id":           normalized.ID,
			"slug":         normalized.Slug,
			"content_type": primitives.FirstNonEmptyRaw(normalized.ContentTypeSlug, normalized.ContentType),
			"locale":       normalized.Locale,
		})
	}
	item = &normalized
	record := cmsContentRecord(*item, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	})
	if policy, ok := s.resolveContentNavigationPolicy(ctx, primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)); ok {
		record = applyContentEntryNavigationReadContract(record, policy)
	}
	return record, nil
}

func (s goCMSAdminContentReadService) ListForContentType(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error) {
	if s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contents, err := s.listContentsForContentType(ctx, contentType, locale)
	if err != nil {
		return nil, 0, err
	}
	typeKey := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID)))
	navigationPolicy := contentEntryNavigationPolicyFromContentType(contentType)
	translationEnabled := contentTypeWantsTranslations(contentType)
	records := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		recordType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)))
		if typeKey != "" && recordType != typeKey {
			continue
		}
		if translationEnabled {
			item.FamilyID = canonicalFamilyIDForContent(item)
			if strings.TrimSpace(item.FamilyID) == "" {
				return nil, 0, validationDomainError("translation-enabled content missing canonical family_id", map[string]any{
					"content_type": recordType,
					"record_id":    strings.TrimSpace(item.ID),
					"locale":       strings.TrimSpace(item.Locale),
				})
			}
			if err := ensureCanonicalTopLevelFields(item); err != nil {
				return nil, 0, err
			}
		}
		item = normalizeCMSContentLocaleState(item, locale)
		record := cmsContentRecord(item, cmsContentRecordOptions{
			includeBlocks:   true,
			includeData:     true,
			includeMetadata: true,
		})
		record = applyContentEntryNavigationReadContract(record, navigationPolicy)
		records = append(records, record)
	}
	list, total := applyListOptionsToRecordMaps(records, opts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsContentRecordSearchMatcher,
	})
	return list, total, nil
}

func (s goCMSAdminContentReadService) GetForContentType(ctx context.Context, contentType CMSContentType, id string) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	record, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	typeKey := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID)))
	if typeKey == "" {
		return record, nil
	}
	recordType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["content_type_slug"]), toString(record["content_type"]))))
	if recordType != typeKey {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(contentType) {
		familyID := translationFamilyIDFromRecord(record)
		if strings.TrimSpace(familyID) == "" {
			return nil, validationDomainError("translation-enabled content missing canonical family_id", map[string]any{
				"content_type": recordType,
				"record_id":    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["id"]), id)),
				"locale":       strings.TrimSpace(toString(record["locale"])),
			})
		}
		record = primitives.CloneAnyMap(record)
		record["family_id"] = familyID
	}
	return applyContentEntryNavigationReadContract(record, contentEntryNavigationPolicyFromContentType(contentType)), nil
}

func (s goCMSAdminContentReadService) listContentsForContentType(ctx context.Context, contentType CMSContentType, locale string) ([]CMSContent, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(contentType) {
		if svc, ok := s.content.(cmsContentListOptionsService); ok && svc != nil {
			return svc.ContentsWithOptions(ctx, locale, WithTranslations(), WithDerivedFields())
		}
	}
	return s.content.Contents(ctx, locale)
}

func (s goCMSAdminContentReadService) resolveContentLocale(ctx context.Context, id string) string {
	return resolveContentLocaleFromService(ctx, s.content, id)
}

func (s goCMSAdminContentReadService) contentTypeService() CMSContentTypeService {
	return contentTypeServiceFromServices(s.content, s.contentTypes)
}

func (s goCMSAdminContentReadService) resolveContentNavigationPolicy(ctx context.Context, contentTypeKey string) (contentEntryNavigationPolicy, bool) {
	return resolveContentEntryNavigationPolicy(ctx, s.contentTypeService(), contentTypeKey)
}
