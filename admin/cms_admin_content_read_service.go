package admin

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"strings"
	"time"

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
	} else if typed := resolveCMSContentTypeCapability(content); typed != nil {
		service.contentTypes = typed
	}
	return service
}

func (s goCMSAdminContentReadService) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if s.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := resolveListRequestedLocale(ctx, opts, "")
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
			includeBlocks:          true,
			includeData:            true,
			includeMetadata:        true,
			includeContentTypeSlug: true,
			summarizeBlocksForList: true,
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
	overallStarted := time.Now()
	locale := resolveListRequestedLocale(ctx, opts, "")
	typeSlug := strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name, contentType.ID))
	grouped := shouldExpandContentEntryTranslationFamilyRowsForContext(ctx, opts)
	contentReadStarted := time.Now()
	contents, err := s.listContentsForContentType(ctx, contentType, locale, opts)
	logCMSContentListTiming(ctx, "content_read", contentReadStarted,
		"content_type", typeSlug,
		"locale", locale,
		"grouped", grouped,
		"records", len(contents),
	)
	if err != nil {
		return nil, 0, err
	}
	typeKey := strings.ToLower(typeSlug)
	navigationPolicy := contentEntryNavigationPolicyFromContentType(contentType)
	translationEnabled := contentTypeWantsTranslations(contentType)
	recordBuildStarted := time.Now()
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
			includeBlocks:          true,
			includeData:            true,
			includeMetadata:        true,
			includeContentTypeSlug: true,
			summarizeBlocksForList: true,
		})
		record = applyContentEntryNavigationReadContract(record, navigationPolicy)
		records = append(records, record)
	}
	logCMSContentListTiming(ctx, "record_build", recordBuildStarted,
		"content_type", typeSlug,
		"locale", locale,
		"grouped", grouped,
		"records", len(records),
	)
	filterStarted := time.Now()
	listOpts := normalizeCMSContentListOptionsForFiltering(opts)
	list, total := applyListOptionsToRecordMaps(records, listOpts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsContentRecordSearchMatcher,
	})
	logCMSContentListTiming(ctx, "filter_page", filterStarted,
		"content_type", typeSlug,
		"locale", locale,
		"grouped", grouped,
		"records", len(list),
		"total", total,
	)
	logCMSContentListTiming(ctx, "total", overallStarted,
		"content_type", typeSlug,
		"locale", locale,
		"grouped", grouped,
		"records", len(list),
		"total", total,
	)
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

func (s goCMSAdminContentReadService) listContentsForContentType(ctx context.Context, contentType CMSContentType, locale string, opts ListOptions) ([]CMSContent, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(contentType) {
		if svc, ok := resolveCMSContentListOptionsService(s.content); ok && svc != nil {
			listOpts := []CMSContentListOption{WithTranslations(), WithDerivedFields()}
			if shouldExpandContentEntryTranslationFamilyRowsForContext(ctx, opts) {
				listOpts = append(listOpts, WithLocaleVariants())
			}
			return svc.ContentsWithOptions(ctx, locale, listOpts...)
		}
	}
	return s.content.Contents(ctx, locale)
}

func cmsContentListTimingEnabled() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("GO_ADMIN_CONTENT_LIST_TIMING"))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func logCMSContentListTiming(ctx context.Context, stage string, started time.Time, attrs ...any) {
	if !cmsContentListTimingEnabled() {
		return
	}
	base := []any{
		"stage", stage,
		"duration_ms", time.Since(started).Milliseconds(),
	}
	base = append(base, attrs...)
	slog.InfoContext(ctx, "cms content list timing", base...)
}

func normalizeCMSContentListOptionsForFiltering(opts ListOptions) ListOptions {
	normalized := normalizeListOptionsForTranslationWildcard(opts)
	normalized.Filters = pruneGroupByFilters(normalized.Filters)
	normalized.Predicates = pruneGroupByPredicates(normalized.Predicates)
	return normalized
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
