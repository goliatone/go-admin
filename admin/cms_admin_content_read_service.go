package admin

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
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

var (
	errCountCapableContentTypeListUnsupported    = errors.New("count-capable content type list unsupported")
	errOptimizedTranslationFamilyListUnsupported = errors.New("optimized translation family list unsupported")
)

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
	if records, total, handled, err := s.listCountCapableContentTypeRecords(ctx, contentType, opts); handled {
		if err != nil {
			return nil, 0, err
		}
		return records, total, nil
	}
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
	membershipKeys := contentTypeMembershipKeys(contentType)
	navigationPolicy := contentEntryNavigationPolicyFromContentType(contentType)
	translationEnabled := contentTypeWantsTranslations(contentType)
	recordBuildStarted := time.Now()
	records := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		recordType := normalizeContentTypeMembershipKey(primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType))
		if !contentTypeMembershipKeyMatches(recordType, membershipKeys) {
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
		record = canonicalizeContentTypeRecordForPanel(record, contentType)
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

type cmsContentTypeRecordListService interface {
	ListContentTypeRecords(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error)
}

func (s goCMSAdminContentReadService) listCountCapableContentTypeRecords(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, bool, error) {
	lister, ok := resolveCMSContentTypeRecordListService(s.content)
	if !ok || lister == nil {
		return nil, 0, false, nil
	}
	listOpts := normalizeListOptionsForTranslationWildcard(opts)
	records, total, err := lister.ListContentTypeRecords(ctx, contentType, listOpts)
	if errors.Is(err, errCountCapableContentTypeListUnsupported) {
		return nil, 0, false, nil
	}
	if err != nil {
		return nil, 0, true, err
	}
	navigationPolicy := contentEntryNavigationPolicyFromContentType(contentType)
	for idx := range records {
		records[idx] = canonicalizeContentTypeRecordForPanel(records[idx], contentType)
		records[idx] = applyContentEntryNavigationReadContract(records[idx], navigationPolicy)
	}
	return records, total, true, nil
}

func (s goCMSAdminContentReadService) GetForContentType(ctx context.Context, contentType CMSContentType, id string) (map[string]any, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	record, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	membershipKeys := contentTypeMembershipKeys(contentType)
	if len(membershipKeys) == 0 {
		return record, nil
	}
	if !contentTypeRecordMatches(record, membershipKeys) {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(contentType) {
		familyID := translationFamilyIDFromRecord(record)
		if strings.TrimSpace(familyID) == "" {
			return nil, validationDomainError("translation-enabled content missing canonical family_id", map[string]any{
				"content_type": normalizeContentTypeMembershipKey(primitives.FirstNonEmptyRaw(toString(record["content_type_slug"]), toString(record["content_type"]))),
				"record_id":    strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["id"]), id)),
				"locale":       strings.TrimSpace(toString(record["locale"])),
			})
		}
		record = primitives.CloneAnyMap(record)
		record["family_id"] = familyID
	}
	record = canonicalizeContentTypeRecordForPanel(record, contentType)
	return applyContentEntryNavigationReadContract(record, contentEntryNavigationPolicyFromContentType(contentType)), nil
}

func (a *GoCMSContentAdapter) ListContentTypeRecords(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error) {
	if a == nil || a.adminRead == nil {
		return nil, 0, errCountCapableContentTypeListUnsupported
	}
	listOpts := normalizeListOptionsForTranslationWildcard(opts)
	locale := resolveListRequestedLocale(ctx, listOpts, "")
	if isTranslationLocaleWildcard(locale) {
		locale = ""
	}
	records, total, err := a.adminRead.List(ctx, cms.AdminContentListOptions{
		ContentTypeID:            strings.TrimSpace(contentType.ID),
		ContentTypeSlug:          strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name)),
		Locale:                   locale,
		AllowMissingTranslations: true,
		IncludeData:              true,
		IncludeMetadata:          true,
		IncludeBlocks:            true,
		Page:                     listOpts.Page,
		PerPage:                  listOpts.PerPage,
		SortBy:                   listOpts.SortBy,
		SortDesc:                 listOpts.SortDesc,
		Search:                   listOpts.Search,
		Filters:                  optimizedCMSContentReadFilters(listOpts),
	})
	if errors.Is(err, cms.ErrAdminContentFamilyReadUnsupported) {
		return nil, 0, errCountCapableContentTypeListUnsupported
	}
	if err != nil {
		return nil, 0, err
	}
	navigationPolicy := contentEntryNavigationPolicyFromContentType(contentType)
	out := make([]map[string]any, 0, len(records))
	for _, record := range records {
		item := a.convertAdminContentRecord(ctx, record)
		applySchemaVersionToContent(&item)
		applyEmbeddedBlocksToContent(&item)
		item = normalizeCMSContentLocaleState(item, locale)
		row := cmsContentRecord(item, cmsContentRecordOptions{
			includeBlocks:          true,
			includeData:            true,
			includeMetadata:        true,
			includeContentTypeSlug: true,
			summarizeBlocksForList: true,
		})
		row = applyContentEntryNavigationReadContract(row, navigationPolicy)
		row = canonicalizeContentTypeRecordForPanel(row, contentType)
		out = append(out, row)
	}
	if len(listOpts.Fields) > 0 {
		out = projectRecordMapsByFields(out, listOpts.Fields)
	}
	return out, total, nil
}

func (a *GoCMSContentAdapter) ListContentTypeFamilies(ctx context.Context, contentType CMSContentType, opts ListOptions) ([]map[string]any, int, error) {
	if a == nil || a.adminRead == nil {
		return nil, 0, errOptimizedTranslationFamilyListUnsupported
	}
	familyRead, ok := a.adminRead.(cms.AdminContentFamilyReadService)
	if !ok || familyRead == nil {
		return nil, 0, errOptimizedTranslationFamilyListUnsupported
	}
	listOpts := normalizeListOptionsForTranslationWildcard(opts)
	locale := resolveListRequestedLocale(ctx, listOpts, "")
	if isTranslationLocaleWildcard(locale) {
		locale = ""
	}
	result, err := familyRead.ListFamilies(ctx, cms.AdminContentFamilyListOptions{
		ContentTypeID:            strings.TrimSpace(contentType.ID),
		ContentTypeSlug:          strings.TrimSpace(primitives.FirstNonEmptyRaw(contentType.Slug, contentType.Name)),
		Locale:                   locale,
		AllowMissingTranslations: true,
		Page:                     listOpts.Page,
		PerPage:                  listOpts.PerPage,
		SortBy:                   listOpts.SortBy,
		SortDesc:                 listOpts.SortDesc,
		Search:                   listOpts.Search,
		Filters:                  optimizedCMSContentReadFilters(listOpts),
		IncludeData:              true,
		IncludeMetadata:          true,
		IncludeBlocks:            true,
	})
	if errors.Is(err, cms.ErrAdminContentFamilyReadUnsupported) {
		return nil, 0, errOptimizedTranslationFamilyListUnsupported
	}
	if err != nil {
		return nil, 0, err
	}
	rows := a.groupedRowsFromAdminContentFamilies(ctx, contentType, result.Families, locale)
	return rows, result.FamilyTotal, nil
}

func optimizedCMSContentReadFilters(opts ListOptions) map[string]any {
	if len(opts.Predicates) == 0 {
		return primitives.CloneAnyMap(opts.Filters)
	}
	predicates := normalizePredicates(opts.Predicates)
	if len(predicates) == 0 {
		return nil
	}
	filters := make(map[string]any, len(predicates))
	for _, predicate := range predicates {
		field := strings.TrimSpace(predicate.Field)
		if field == "" || strings.HasPrefix(field, "$") || isListGroupByPredicateField(field) {
			continue
		}
		values := normalizePredicateValues(predicate.Values)
		if len(values) == 0 {
			continue
		}
		operator := normalizePredicateOperator(predicate.Operator)
		key := field
		if operator != "" && operator != defaultListPredicateOperator {
			key = field + "__" + operator
		}
		if len(values) == 1 && operator != "in" {
			filters[key] = values[0]
			continue
		}
		filters[key] = append([]string{}, values...)
	}
	if len(filters) == 0 {
		return nil
	}
	return filters
}

func (a *GoCMSContentAdapter) groupedRowsFromAdminContentFamilies(ctx context.Context, contentType CMSContentType, families []cms.AdminContentFamilyRecord, defaultLocale string) []map[string]any {
	if len(families) == 0 {
		return nil
	}
	defaultLocale = strings.TrimSpace(defaultLocale)
	if defaultLocale == "" {
		defaultLocale = "en"
	}
	out := make([]map[string]any, 0, len(families))
	for _, family := range families {
		children := make([]map[string]any, 0, len(family.Variants))
		for _, variant := range family.Variants {
			item := a.convertAdminContentRecord(ctx, variant)
			applySchemaVersionToContent(&item)
			applyEmbeddedBlocksToContent(&item)
			row := cmsContentRecord(item, cmsContentRecordOptions{
				includeBlocks:          true,
				includeData:            true,
				includeMetadata:        true,
				includeContentTypeSlug: true,
				summarizeBlocksForList: true,
			})
			if strings.TrimSpace(toString(row["family_id"])) == "" {
				row["family_id"] = strings.TrimSpace(family.FamilyID)
			}
			row = canonicalizeContentTypeRecordForPanel(row, contentType)
			children = append(children, row)
		}
		grouped := buildTranslationGroupedRows(children, defaultLocale)
		if len(grouped) == 0 {
			continue
		}
		groupedRow := canonicalizeContentTypeRecordForPanel(grouped[0], contentType)
		if canonical := ContentTypeCapabilityString(contentType.Capabilities, ContentTypeCapabilityKeyPanelSlug); canonical != "" {
			groupedRow["content_type"] = canonical
			groupedRow["content_type_slug"] = canonical
		}
		out = append(out, groupedRow)
	}
	return out
}

func contentTypeMembershipKeys(contentType CMSContentType) map[string]struct{} {
	keys := map[string]struct{}{}
	add := func(value string) {
		if key := normalizeContentTypeMembershipKey(value); key != "" {
			keys[key] = struct{}{}
		}
	}
	add(contentType.ID)
	add(contentType.Slug)
	add(contentType.Name)
	add(ContentTypeCapabilityString(contentType.Capabilities, ContentTypeCapabilityKeyPanelSlug))
	add(ContentTypeCapabilityString(contentType.Capabilities, ContentTypeCapabilityKeySearchContent))
	return keys
}

func contentTypeRecordMatches(record map[string]any, keys map[string]struct{}) bool {
	if len(keys) == 0 {
		return true
	}
	for _, value := range []string{
		toString(record["content_type_id"]),
		toString(record["content_type_slug"]),
		toString(record["content_type"]),
	} {
		if contentTypeMembershipKeyMatches(normalizeContentTypeMembershipKey(value), keys) {
			return true
		}
	}
	return false
}

func contentTypeMembershipKeyMatches(key string, keys map[string]struct{}) bool {
	if len(keys) == 0 {
		return true
	}
	if key == "" {
		return false
	}
	_, ok := keys[key]
	return ok
}

func normalizeContentTypeMembershipKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func canonicalizeContentTypeRecordForPanel(record map[string]any, contentType CMSContentType) map[string]any {
	canonical := ContentTypeCapabilityString(contentType.Capabilities, ContentTypeCapabilityKeyPanelSlug)
	if canonical == "" {
		return record
	}
	if record == nil {
		record = map[string]any{}
	}
	if keys := contentTypeMembershipKeys(contentType); len(keys) > 0 && !contentTypeRecordMatches(record, keys) {
		return record
	}
	if strings.TrimSpace(toString(record["content_type"])) != "" {
		record["content_type"] = canonical
	}
	if strings.TrimSpace(toString(record["content_type_slug"])) != "" {
		record["content_type_slug"] = canonical
	}
	for _, key := range []string{"children", "records", "variants", "locale_variants"} {
		if children, ok := record[key].([]map[string]any); ok {
			for idx := range children {
				children[idx] = canonicalizeContentTypeRecordForPanel(children[idx], contentType)
			}
			record[key] = children
		}
	}
	if parent, ok := record["parent"].(map[string]any); ok {
		record["parent"] = canonicalizeContentTypeRecordForPanel(parent, contentType)
	}
	return record
}

func (s goCMSAdminContentReadService) listContentsForContentType(ctx context.Context, contentType CMSContentType, locale string, opts ListOptions) ([]CMSContent, error) {
	if s.content == nil {
		return nil, ErrNotFound
	}
	svc, ok := resolveCMSContentListOptionsService(s.content)
	if !ok || svc == nil {
		return s.content.Contents(ctx, locale)
	}

	listOpts := []CMSContentListOption{}
	if contentTypeWantsTranslations(contentType) {
		listOpts = append(listOpts, WithTranslations(), WithDerivedFields())
	}
	if id := strings.TrimSpace(contentType.ID); id != "" {
		listOpts = append(listOpts, WithContentTypeID(id))
	}
	if shouldExpandContentEntryTranslationFamilyRowsForContext(ctx, opts) {
		if !hasCMSContentListOption(listOpts, WithTranslations()) {
			listOpts = append(listOpts, WithTranslations(), WithDerivedFields())
		}
		listOpts = append(listOpts, WithLocaleVariants())
	}
	if len(listOpts) == 0 {
		return s.content.Contents(ctx, locale)
	}
	return svc.ContentsWithOptions(ctx, locale, listOpts...)
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
