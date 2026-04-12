package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"reflect"
	"slices"
	"strings"
)

// CMSContentRepository adapts CMSContentService for structured content entities.
type CMSContentRepository struct {
	content      CMSContentService
	contentTypes CMSContentTypeService
	read         AdminContentReadService
	write        AdminContentWriteService
}

// NewCMSContentRepository builds a content repository.
func NewCMSContentRepository(content CMSContentService) *CMSContentRepository {
	repository := &CMSContentRepository{content: content}
	if typed, ok := content.(CMSContentTypeService); ok {
		repository.contentTypes = typed
	}
	repository.read = newAdminContentReadService(content, repository.contentTypes)
	repository.write = newAdminContentWriteService(content, repository.contentTypes)
	return repository
}

// List returns content filtered by locale and search query.
func (r *CMSContentRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	return r.readService().List(ctx, opts)
}

// Get retrieves content by id.
func (r *CMSContentRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	return r.readService().Get(ctx, id)
}

// Create inserts new content.
func (r *CMSContentRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.writeService().Create(ctx, record)
}

// CreateTranslation creates a locale variant through a first-class translation command.
func (r *CMSContentRepository) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	return r.writeService().CreateTranslation(ctx, input)
}

// Update modifies content.
func (r *CMSContentRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	return r.writeService().Update(ctx, id, record)
}

// Delete removes a content item.
func (r *CMSContentRepository) Delete(ctx context.Context, id string) error {
	return r.writeService().Delete(ctx, id)
}

// CMSContentTypeEntryRepository scopes content CRUD to a specific content type.
type CMSContentTypeEntryRepository struct {
	content     CMSContentService
	contentType CMSContentType
	read        AdminContentReadService
	write       AdminContentWriteService
}

type cmsContentListOptionsService interface {
	ContentsWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error)
}

// NewCMSContentTypeEntryRepository builds a content repository scoped to the supplied content type.
func NewCMSContentTypeEntryRepository(content CMSContentService, contentType CMSContentType) *CMSContentTypeEntryRepository {
	return &CMSContentTypeEntryRepository{
		content:     content,
		contentType: contentType,
		read:        newAdminContentReadService(content),
		write:       newAdminContentWriteService(content),
	}
}

// List returns content filtered by the bound content type.
func (r *CMSContentTypeEntryRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	return r.readService().ListForContentType(ctx, r.contentType, opts)
}

func (r *CMSContentTypeEntryRepository) listContents(ctx context.Context, locale string) ([]CMSContent, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(r.contentType) {
		if svc, ok := r.content.(cmsContentListOptionsService); ok && svc != nil {
			return svc.ContentsWithOptions(ctx, locale, WithTranslations(), WithDerivedFields())
		}
	}
	return r.content.Contents(ctx, locale)
}

func cmsContentRecordSearchMatcher(record map[string]any, search string) bool {
	if strings.TrimSpace(search) == "" {
		return true
	}
	return strings.Contains(strings.ToLower(toString(record["title"])), search) ||
		strings.Contains(strings.ToLower(toString(record["slug"])), search) ||
		strings.Contains(strings.ToLower(toString(record["content_type"])), search)
}

func cmsPageRecordSearchMatcher(record map[string]any, search string) bool {
	if strings.TrimSpace(search) == "" {
		return true
	}
	return strings.Contains(strings.ToLower(toString(record["title"])), search) ||
		strings.Contains(strings.ToLower(toString(record["slug"])), search)
}

func cmsContentRecordPredicateMatcher(record map[string]any, predicate ListPredicate) (bool, bool) {
	field := strings.TrimSpace(predicate.Field)
	if field == "" || field == "_search" || field == "environment" {
		return true, true
	}
	operator := strings.ToLower(strings.TrimSpace(predicate.Operator))
	if !isSupportedCMSFilterOperator(operator) {
		// Keep existing behavior: unsupported operators are ignored.
		return true, true
	}
	return recordHasCMSFilterMatch(record, field, operator, predicate.Values), true
}

type cmsContentRecordOptions struct {
	includeBlocks          bool
	includeData            bool
	includeMetadata        bool
	includeContentTypeSlug bool
}

func cmsContentRecord(item CMSContent, opts cmsContentRecordOptions) map[string]any {
	item = normalizeCMSContentLocaleState(item, item.RequestedLocale)
	contentType := primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)
	schema := strings.TrimSpace(primitives.FirstNonEmptyRaw(item.SchemaVersion, toString(item.Data["_schema"])))
	navigation := item.Navigation
	if len(navigation) == 0 {
		navigation = normalizeNavigationVisibilityMap(item.Data["_navigation"])
	}
	effectiveLocations := item.EffectiveMenuLocations
	if len(effectiveLocations) == 0 {
		effectiveLocations = normalizeEffectiveMenuLocations(item.Data["effective_menu_locations"])
	}
	effectiveVisibility := normalizeNavigationVisibilityBoolMap(item.Data["effective_navigation_visibility"])
	if len(effectiveVisibility) == 0 {
		effectiveVisibility = inferEffectiveNavigationVisibility(navigation, effectiveLocations)
	}
	record := map[string]any{
		"id":                              item.ID,
		"title":                           item.Title,
		"slug":                            item.Slug,
		"route_key":                       strings.TrimSpace(item.RouteKey),
		"locale":                          item.Locale,
		"family_id":                       canonicalFamilyIDForContent(item),
		"requested_locale":                item.RequestedLocale,
		"resolved_locale":                 item.ResolvedLocale,
		"available_locales":               append([]string{}, item.AvailableLocales...),
		"missing_requested_locale":        item.MissingRequestedLocale,
		"content_type":                    contentType,
		"status":                          item.Status,
		"_navigation":                     navigationVisibilityMapAny(navigation),
		"effective_menu_locations":        append([]string{}, effectiveLocations...),
		"effective_navigation_visibility": navigationVisibilityBoolMapAny(effectiveVisibility),
	}
	if opts.includeContentTypeSlug {
		record["content_type_slug"] = contentType
	}
	if opts.includeBlocks {
		record["blocks"] = blocksPayloadFromContent(item)
	}
	if opts.includeData {
		record["data"] = primitives.CloneAnyMap(item.Data)
	}
	if opts.includeMetadata {
		record["metadata"] = primitives.CloneAnyMap(item.Metadata)
	}
	if schema != "" {
		record["_schema"] = schema
	}
	mergeCMSRecordData(record, item.Data, cmsContentReservedKeys)
	return record
}

func normalizeCMSContentLocaleState(item CMSContent, requested string) CMSContent {
	requested = strings.TrimSpace(primitives.FirstNonEmptyRaw(requested, item.RequestedLocale, item.Locale))
	resolved := strings.TrimSpace(primitives.FirstNonEmptyRaw(item.ResolvedLocale, item.Locale))
	if resolved == "" {
		resolved = requested
	}
	available := append([]string{}, item.AvailableLocales...)
	if len(available) == 0 && strings.TrimSpace(item.Locale) != "" {
		available = []string{item.Locale}
	}
	available = dedupeStrings(available)
	missing := item.MissingRequestedLocale
	if requested != "" && len(available) > 0 && !containsStringInsensitive(available, requested) {
		missing = true
	}
	item.RequestedLocale = requested
	item.ResolvedLocale = resolved
	item.AvailableLocales = available
	item.MissingRequestedLocale = missing
	return item
}

func isSupportedCMSFilterOperator(operator string) bool {
	switch strings.ToLower(strings.TrimSpace(operator)) {
	case "eq", "in", "ilike":
		return true
	default:
		return false
	}
}

func recordHasCMSFilterMatch(record map[string]any, field, operator string, filterValues []string) bool {
	value, exists := record[field]
	if !exists {
		return false
	}
	candidates := cmsFilterCandidateValues(value)
	if len(candidates) == 0 {
		return false
	}
	switch operator {
	case "in":
		if len(filterValues) == 0 {
			return true
		}
		return cmsAnyCandidateEquals(candidates, filterValues)
	case "ilike":
		if len(filterValues) == 0 {
			return true
		}
		return cmsAnyCandidateContains(candidates, filterValues)
	case "eq":
		fallthrough
	default:
		return cmsAnyCandidateEquals(candidates, filterValues)
	}
}

func cmsFilterCandidateValues(value any) []string {
	switch typed := value.(type) {
	case []string:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if normalized := strings.TrimSpace(item); normalized != "" {
				out = append(out, normalized)
			}
		}
		return out
	case []any:
		out := make([]string, 0, len(typed))
		for _, item := range typed {
			if normalized := strings.TrimSpace(toString(item)); normalized != "" {
				out = append(out, normalized)
			}
		}
		return out
	default:
		if normalized := strings.TrimSpace(toString(value)); normalized != "" {
			return []string{normalized}
		}
	}
	return []string{}
}

func cmsAnyCandidateEquals(candidates []string, accepted []string) bool {
	for _, candidate := range candidates {
		for _, value := range accepted {
			if strings.EqualFold(strings.TrimSpace(candidate), strings.TrimSpace(value)) {
				return true
			}
		}
	}
	return false
}

func cmsAnyCandidateContains(candidates []string, needles []string) bool {
	for _, candidate := range candidates {
		normalizedCandidate := strings.ToLower(strings.TrimSpace(candidate))
		for _, needle := range needles {
			normalizedNeedle := strings.ToLower(strings.TrimSpace(needle))
			if normalizedNeedle == "" {
				continue
			}
			if strings.Contains(normalizedCandidate, normalizedNeedle) {
				return true
			}
		}
	}
	return false
}

func contentTypeWantsTranslations(contentType CMSContentType) bool {
	if hasTranslationsCapability(contentType.Capabilities) {
		return true
	}
	return slices.ContainsFunc([]map[string]any{contentType.Schema, contentType.UISchema}, schemaHasTranslationHints)
}

func schemaHasTranslationHints(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	translationKeys := map[string]struct{}{
		"family_id":                {},
		"available_locales":        {},
		"requested_locale":         {},
		"resolved_locale":          {},
		"fallback_used":            {},
		"missing_requested_locale": {},
		"translation_readiness":    {},
	}
	var walk func(any) bool
	walk = func(value any) bool {
		switch typed := value.(type) {
		case map[string]any:
			for key, nested := range typed {
				normalized := strings.ToLower(strings.TrimSpace(key))
				if _, ok := translationKeys[normalized]; ok {
					return true
				}
				if walk(nested) {
					return true
				}
			}
		case []any:
			if slices.ContainsFunc(typed, walk) {
				return true
			}
		}
		return false
	}
	return walk(schema)
}

func contentRecordRequiresCanonicalTopLevelFields(item CMSContent) bool {
	if len(item.Data) == 0 {
		return false
	}
	if contentRecordLikelyTranslationEnabled(item) {
		return len(missingCanonicalTopLevelFields(item.Data)) > 0
	}
	if !markdownCarriesCanonicalProjectionHints(item.Data) {
		return false
	}
	return len(missingCanonicalTopLevelFields(item.Data)) > 0
}

func canonicalFamilyIDForContent(item CMSContent) string {
	if groupID := strings.TrimSpace(item.FamilyID); groupID != "" {
		return groupID
	}
	if len(item.Data) > 0 {
		if groupID := strings.TrimSpace(toString(item.Data["family_id"])); groupID != "" {
			return groupID
		}
	}
	return ""
}

func markdownCarriesCanonicalProjectionHints(data map[string]any) bool {
	if len(canonicalMapValue(data["markdown"])) == 0 {
		return false
	}
	for _, field := range []string{
		"path",
		"published_at",
		"featured_image",
		"meta",
		"tags",
		"meta_title",
		"meta_description",
		"seo",
	} {
		if isNonEmptyCanonicalValue(canonicalMarkdownSourceFieldValue(data, field)) {
			return true
		}
	}
	return false
}

func contentRecordLikelyTranslationEnabled(item CMSContent) bool {
	if strings.TrimSpace(item.FamilyID) != "" {
		return true
	}
	if len(item.AvailableLocales) > 0 || strings.TrimSpace(item.RequestedLocale) != "" || strings.TrimSpace(item.ResolvedLocale) != "" || item.MissingRequestedLocale {
		return true
	}
	if len(item.Data) == 0 {
		return false
	}
	for _, path := range [][]string{
		{"family_id"},
		{"requested_locale"},
		{"resolved_locale"},
		{"missing_requested_locale"},
		{"fallback_used"},
	} {
		value := translationReadinessNestedValue(item.Data, path...)
		last := path[len(path)-1]
		if last == "missing_requested_locale" || last == "fallback_used" {
			if toBool(value) {
				return true
			}
			continue
		}
		if strings.TrimSpace(toString(value)) != "" {
			return true
		}
	}
	return false
}

func canonicalMarkdownSourceFieldValue(payload map[string]any, field string) any {
	if strings.TrimSpace(field) == "" {
		return nil
	}
	for _, path := range [][]string{
		{"markdown", "custom", field},
		{"markdown", "frontmatter", field},
		{"markdown", "custom", "markdown", "frontmatter", field},
	} {
		value := canonicalNestedLookup(payload, path...)
		if isNonEmptyCanonicalValue(value) {
			return value
		}
	}
	return nil
}

func canonicalNestedLookup(payload map[string]any, path ...string) any {
	if payload == nil || len(path) == 0 {
		return nil
	}
	var current any = payload
	for _, part := range path {
		record := canonicalMapValue(current)
		if len(record) == 0 {
			return nil
		}
		value, ok := record[part]
		if !ok {
			return nil
		}
		current = value
	}
	return current
}

func canonicalMapValue(value any) map[string]any {
	record, ok := value.(map[string]any)
	if !ok || len(record) == 0 {
		return nil
	}
	return record
}

func canonicalSEOFieldValue(value any, key string) any {
	if strings.TrimSpace(key) == "" {
		return nil
	}
	switch typed := value.(type) {
	case map[string]any:
		return typed[key]
	case map[string]string:
		return typed[key]
	default:
		return nil
	}
}

func canonicalFirstNonEmpty(values ...any) any {
	for _, value := range values {
		if isNonEmptyCanonicalValue(value) {
			return value
		}
	}
	return nil
}

func isNonEmptyCanonicalValue(value any) bool {
	if value == nil {
		return false
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed) != ""
	case map[string]any:
		return len(typed) > 0
	case []string:
		return len(typed) > 0
	case []any:
		return len(typed) > 0
	}
	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Interface, reflect.Pointer:
		if rv.IsNil() {
			return false
		}
		return isNonEmptyCanonicalValue(rv.Elem().Interface())
	case reflect.Map, reflect.Slice, reflect.Array:
		return rv.Len() > 0
	default:
		return true
	}
}

func ensureCanonicalTopLevelFields(item CMSContent) error {
	missing := missingCanonicalTopLevelFields(item.Data)
	if len(missing) == 0 {
		return nil
	}
	ensureLogger(nil).Warn(
		"cms content payload missing canonical top-level derived fields",
		"content_id", item.ID,
		"content_type", primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType),
		"missing_fields", missing,
	)
	return validationDomainError("cms content payload missing canonical top-level derived fields", map[string]any{
		"component":    "cms_content_repository",
		"content_id":   item.ID,
		"content_type": primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType),
		"locale":       item.Locale,
		"missing":      missing,
	})
}

func missingCanonicalTopLevelFields(data map[string]any) []string {
	markdown := canonicalMapValue(data["markdown"])
	if len(markdown) == 0 {
		return nil
	}
	out := []string{}
	if isNonEmptyCanonicalValue(canonicalNestedLookup(data, "markdown", "body")) && !isNonEmptyCanonicalValue(data["content"]) {
		out = append(out, "content")
	}
	if (isNonEmptyCanonicalValue(canonicalMarkdownSourceFieldValue(data, "summary")) ||
		isNonEmptyCanonicalValue(canonicalMarkdownSourceFieldValue(data, "excerpt"))) &&
		!isNonEmptyCanonicalValue(data["summary"]) &&
		!isNonEmptyCanonicalValue(data["excerpt"]) {
		out = append(out, "summary/excerpt")
	}
	for _, field := range []string{"path", "published_at", "featured_image", "meta", "tags"} {
		if isNonEmptyCanonicalValue(canonicalMarkdownSourceFieldValue(data, field)) && !isNonEmptyCanonicalValue(data[field]) {
			out = append(out, field)
		}
	}
	if isNonEmptyCanonicalValue(
		canonicalFirstNonEmpty(
			canonicalMarkdownSourceFieldValue(data, "meta_title"),
			canonicalSEOFieldValue(canonicalFirstNonEmpty(data["seo"], canonicalMarkdownSourceFieldValue(data, "seo")), "title"),
		),
	) && !isNonEmptyCanonicalValue(data["meta_title"]) {
		out = append(out, "meta_title")
	}
	if isNonEmptyCanonicalValue(
		canonicalFirstNonEmpty(
			canonicalMarkdownSourceFieldValue(data, "meta_description"),
			canonicalSEOFieldValue(canonicalFirstNonEmpty(data["seo"], canonicalMarkdownSourceFieldValue(data, "seo")), "description"),
		),
	) && !isNonEmptyCanonicalValue(data["meta_description"]) {
		out = append(out, "meta_description")
	}
	return out
}

// Get retrieves content by id, enforcing content type membership.
func (r *CMSContentTypeEntryRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	return r.readService().GetForContentType(ctx, r.contentType, id)
}

// Create inserts new content with the bound content type.
func (r *CMSContentTypeEntryRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	return r.writeService().CreateForContentType(ctx, r.contentType, record)
}

// CreateTranslation creates a locale variant through a first-class translation command.
func (r *CMSContentTypeEntryRepository) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	return r.writeService().CreateTranslationForContentType(ctx, r.contentType, input)
}

// Update modifies content with the bound content type.
func (r *CMSContentTypeEntryRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	return r.writeService().UpdateForContentType(ctx, r.contentType, id, record)
}

// Delete removes a content item after validating its type.
func (r *CMSContentTypeEntryRepository) Delete(ctx context.Context, id string) error {
	return r.writeService().DeleteForContentType(ctx, r.contentType, id)
}

func (r *CMSContentRepository) readService() AdminContentReadService {
	if r == nil {
		return nil
	}
	if r.read != nil {
		return r.read
	}
	return newAdminContentReadService(r.content, r.contentTypes)
}

func (r *CMSContentRepository) writeService() AdminContentWriteService {
	if r == nil {
		return nil
	}
	if r.write != nil {
		return r.write
	}
	return newAdminContentWriteService(r.content, r.contentTypes)
}

func (r *CMSContentTypeEntryRepository) readService() AdminContentReadService {
	if r == nil {
		return nil
	}
	if r.read != nil {
		return r.read
	}
	return newAdminContentReadService(r.content)
}

func (r *CMSContentTypeEntryRepository) writeService() AdminContentWriteService {
	if r == nil {
		return nil
	}
	if r.write != nil {
		return r.write
	}
	return newAdminContentWriteService(r.content)
}

func resolveContentLocaleFromService(ctx context.Context, content CMSContentService, id string) string {
	if content == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	items, err := content.Contents(ctx, "")
	if err != nil {
		return ""
	}
	for _, item := range items {
		if item.ID == id {
			return item.Locale
		}
	}
	return ""
}

func contentTypeServiceFromServices(content CMSContentService, contentTypes CMSContentTypeService) CMSContentTypeService {
	if contentTypes != nil {
		return contentTypes
	}
	if typed, ok := content.(CMSContentTypeService); ok {
		return typed
	}
	return nil
}
