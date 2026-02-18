package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
	"reflect"
	"strings"
)

// CMSContentRepository adapts CMSContentService for structured content entities.
type CMSContentRepository struct {
	content CMSContentService
}

// NewCMSContentRepository builds a content repository.
func NewCMSContentRepository(content CMSContentService) *CMSContentRepository {
	return &CMSContentRepository{content: content}
}

// List returns content filtered by locale and search query.
func (r *CMSContentRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contents, err := r.content.Contents(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSContent{}
	for _, item := range contents {
		contentType := primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)
		if search != "" && !strings.Contains(strings.ToLower(item.Title), search) &&
			!strings.Contains(strings.ToLower(item.Slug), search) &&
			!strings.Contains(strings.ToLower(contentType), search) {
			continue
		}
		if contentRecordRequiresCanonicalTopLevelFields(item) {
			if err := ensureCanonicalTopLevelFields(item); err != nil {
				return nil, 0, err
			}
		}
		filtered = append(filtered, item)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, item := range sliced {
		out = append(out, cmsContentRecord(item, cmsContentRecordOptions{
			includeBlocks:   true,
			includeData:     true,
			includeMetadata: true,
		}))
	}
	return out, total, nil
}

// Get retrieves content by id.
func (r *CMSContentRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	item, err := r.content.Content(ctx, id, localeFromContext(ctx))
	if err != nil && errors.Is(err, ErrNotFound) {
		if locale := r.resolveContentLocale(ctx, id); locale != "" {
			item, err = r.content.Content(ctx, id, locale)
		}
	}
	if err != nil {
		return nil, err
	}
	if item != nil && contentRecordRequiresCanonicalTopLevelFields(*item) {
		if err := ensureCanonicalTopLevelFields(*item); err != nil {
			return nil, err
		}
	}
	return cmsContentRecord(*item, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

// Create inserts new content.
func (r *CMSContentRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	content := mapToCMSContent(record)
	created, err := r.content.CreateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	return cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

// CreateTranslation creates a locale variant through a first-class translation command.
func (r *CMSContentRepository) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	creator, ok := r.content.(CMSContentTranslationCreator)
	if !ok || creator == nil {
		return nil, ErrTranslationCreateUnsupported
	}
	created, err := creator.CreateTranslation(ctx, input)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	return cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

// Update modifies content.
func (r *CMSContentRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	if err := r.ensureContentTranslationIntent(ctx, id, record); err != nil {
		return nil, err
	}
	content := mapToCMSContent(record)
	content.ID = id
	if strings.TrimSpace(content.Locale) == "" {
		if locale := localeFromContext(ctx); locale != "" {
			content.Locale = locale
		}
		if locale := r.resolveContentLocale(ctx, id); locale != "" {
			content.Locale = locale
		}
	}
	var existing *CMSContent
	if content.Locale != "" {
		if current, err := r.content.Content(ctx, id, content.Locale); err == nil {
			existing = current
		}
	}
	if existing == nil {
		if locale := r.resolveContentLocale(ctx, id); locale != "" {
			content.Locale = locale
			if current, err := r.content.Content(ctx, id, locale); err == nil {
				existing = current
			}
		}
	}
	if existing != nil {
		content = mergeCMSContentUpdate(*existing, content, record)
	}
	updated, err := r.content.UpdateContent(ctx, content)
	if err != nil {
		return nil, err
	}
	return cmsContentRecord(*updated, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

// Delete removes a content item.
func (r *CMSContentRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteContent(ctx, id)
}

// CMSContentTypeEntryRepository scopes content CRUD to a specific content type.
type CMSContentTypeEntryRepository struct {
	content     CMSContentService
	contentType CMSContentType
}

type cmsContentListOptionsService interface {
	ContentsWithOptions(ctx context.Context, locale string, opts ...CMSContentListOption) ([]CMSContent, error)
}

// NewCMSContentTypeEntryRepository builds a content repository scoped to the supplied content type.
func NewCMSContentTypeEntryRepository(content CMSContentService, contentType CMSContentType) *CMSContentTypeEntryRepository {
	return &CMSContentTypeEntryRepository{content: content, contentType: contentType}
}

// List returns content filtered by the bound content type.
func (r *CMSContentTypeEntryRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	contents, err := r.listContents(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	typeKey := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(r.contentType.Slug, r.contentType.Name, r.contentType.ID)))
	translationEnabled := contentTypeWantsTranslations(r.contentType)
	records := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		contentType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)))
		if typeKey != "" && contentType != typeKey {
			continue
		}
		if translationEnabled {
			if strings.TrimSpace(item.TranslationGroupID) == "" {
				item.TranslationGroupID = strings.TrimSpace(primitives.FirstNonEmptyRaw(canonicalTranslationGroupIDForContent(item), item.ID))
			}
			if err := ensureCanonicalTopLevelFields(item); err != nil {
				return nil, 0, err
			}
		}
		records = append(records, cmsContentRecord(item, cmsContentRecordOptions{
			includeBlocks:   true,
			includeData:     true,
			includeMetadata: true,
		}))
	}
	list, total := applyListOptionsToRecordMaps(records, opts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsContentRecordSearchMatcher,
	})
	return list, total, nil
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
	contentType := primitives.FirstNonEmptyRaw(item.ContentTypeSlug, item.ContentType)
	schema := strings.TrimSpace(primitives.FirstNonEmptyRaw(item.SchemaVersion, toString(item.Data["_schema"])))
	record := map[string]any{
		"id":                       item.ID,
		"title":                    item.Title,
		"slug":                     item.Slug,
		"locale":                   item.Locale,
		"translation_group_id":     canonicalTranslationGroupIDForContent(item),
		"requested_locale":         item.RequestedLocale,
		"resolved_locale":          item.ResolvedLocale,
		"available_locales":        append([]string{}, item.AvailableLocales...),
		"missing_requested_locale": item.MissingRequestedLocale,
		"content_type":             contentType,
		"status":                   item.Status,
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
	for _, schema := range []map[string]any{contentType.Schema, contentType.UISchema} {
		if schemaHasTranslationHints(schema) {
			return true
		}
	}
	return false
}

func schemaHasTranslationHints(schema map[string]any) bool {
	if len(schema) == 0 {
		return false
	}
	translationKeys := map[string]struct{}{
		"translation_group_id":     {},
		"available_locales":        {},
		"requested_locale":         {},
		"resolved_locale":          {},
		"missing_requested_locale": {},
		"translation":              {},
		"content_translation":      {},
		"translation_context":      {},
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
			for _, nested := range typed {
				if walk(nested) {
					return true
				}
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

func canonicalTranslationGroupIDForContent(item CMSContent) string {
	if groupID := strings.TrimSpace(item.TranslationGroupID); groupID != "" {
		return groupID
	}
	if len(item.Data) > 0 {
		if groupID := strings.TrimSpace(toString(item.Data["translation_group_id"])); groupID != "" {
			return groupID
		}
		for _, path := range [][]string{
			{"translation", "meta", "translation_group_id"},
			{"content_translation", "meta", "translation_group_id"},
			{"translation_context", "translation_group_id"},
			{"translation_readiness", "translation_group_id"},
		} {
			if groupID := strings.TrimSpace(toString(translationReadinessNestedValue(item.Data, path...))); groupID != "" {
				return groupID
			}
		}
	}
	if contentRecordLikelyTranslationEnabled(item) {
		return strings.TrimSpace(item.ID)
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
	if strings.TrimSpace(item.TranslationGroupID) != "" {
		return true
	}
	if len(item.AvailableLocales) > 0 || strings.TrimSpace(item.RequestedLocale) != "" || strings.TrimSpace(item.ResolvedLocale) != "" || item.MissingRequestedLocale {
		return true
	}
	if len(item.Data) == 0 {
		return false
	}
	for _, path := range [][]string{
		{"translation_group_id"},
		{"translation", "meta", "translation_group_id"},
		{"content_translation", "meta", "translation_group_id"},
		{"translation_context", "translation_group_id"},
		{"translation_readiness", "translation_group_id"},
		{"translation", "meta", "requested_locale"},
		{"translation", "meta", "resolved_locale"},
		{"translation", "meta", "missing_requested_locale"},
		{"translation", "meta", "fallback_used"},
		{"content_translation", "meta", "requested_locale"},
		{"content_translation", "meta", "resolved_locale"},
		{"content_translation", "meta", "missing_requested_locale"},
		{"content_translation", "meta", "fallback_used"},
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
	if r.content == nil {
		return nil, ErrNotFound
	}
	base := NewCMSContentRepository(r.content)
	record, err := base.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	typeKey := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(r.contentType.Slug, r.contentType.Name, r.contentType.ID)))
	if typeKey == "" {
		return record, nil
	}
	recordType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["content_type_slug"]), toString(record["content_type"]))))
	if recordType != typeKey {
		return nil, ErrNotFound
	}
	if contentTypeWantsTranslations(r.contentType) {
		if strings.TrimSpace(toString(record["translation_group_id"])) == "" {
			record = primitives.CloneAnyMap(record)
			record["translation_group_id"] = strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["id"]), id))
		}
	}
	return record, nil
}

// Create inserts new content with the bound content type.
func (r *CMSContentTypeEntryRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	base := NewCMSContentRepository(r.content)
	if record == nil {
		record = map[string]any{}
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
	if typeKey != "" {
		record["content_type"] = typeKey
		record["content_type_slug"] = typeKey
	}
	return base.Create(ctx, record)
}

// CreateTranslation creates a locale variant through a first-class translation command.
func (r *CMSContentTypeEntryRepository) CreateTranslation(ctx context.Context, input TranslationCreateInput) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	input = normalizeTranslationCreateInput(input)
	if input.SourceID == "" {
		return nil, validationDomainError("translation requires a single id", map[string]any{
			"field": "id",
		})
	}
	if input.Locale == "" {
		return nil, validationDomainError("translation locale required", map[string]any{
			"field": "locale",
		})
	}
	creator, ok := r.content.(CMSContentTranslationCreator)
	if !ok || creator == nil {
		return nil, ErrTranslationCreateUnsupported
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
	if typeKey != "" && input.ContentType == "" {
		input.ContentType = typeKey
	}
	created, err := creator.CreateTranslation(ctx, input)
	if err != nil {
		return nil, err
	}
	if created == nil {
		return nil, ErrNotFound
	}
	normalizedTypeKey := strings.ToLower(strings.TrimSpace(typeKey))
	createdType := strings.ToLower(strings.TrimSpace(primitives.FirstNonEmptyRaw(created.ContentTypeSlug, created.ContentType)))
	if normalizedTypeKey != "" && createdType != "" && createdType != normalizedTypeKey {
		return nil, ErrNotFound
	}
	return cmsContentRecord(*created, cmsContentRecordOptions{
		includeBlocks:   true,
		includeData:     true,
		includeMetadata: true,
	}), nil
}

// Update modifies content with the bound content type.
func (r *CMSContentTypeEntryRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	base := NewCMSContentRepository(r.content)
	if record == nil {
		record = map[string]any{}
	}
	typeKey := strings.TrimSpace(primitives.FirstNonEmptyRaw(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
	if typeKey != "" {
		record["content_type"] = typeKey
		record["content_type_slug"] = typeKey
	}
	updated, err := base.Update(ctx, id, record)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

// Delete removes a content item after validating its type.
func (r *CMSContentTypeEntryRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	record, err := r.Get(ctx, id)
	if err != nil {
		return err
	}
	if toString(record["id"]) == "" {
		return ErrNotFound
	}
	return r.content.DeleteContent(ctx, id)
}

func (r *CMSContentRepository) resolveContentLocale(ctx context.Context, id string) string {
	if r == nil || r.content == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	items, err := r.content.Contents(ctx, "")
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

func (r *CMSContentRepository) ensureContentTranslationIntent(ctx context.Context, id string, record map[string]any) error {
	if r == nil || r.content == nil {
		return ErrNotFound
	}
	if record == nil {
		return nil
	}
	requested := requestedLocaleFromPayload(record, localeFromContext(ctx))
	if requested == "" {
		return nil
	}
	missing, err := r.contentTranslationMissing(ctx, id, requested)
	if err != nil {
		return err
	}
	if missing {
		if !createTranslationRequested(record) {
			return translationCreateRequiredError(requested)
		}
		record["locale"] = requested
	}
	return nil
}

func (r *CMSContentRepository) contentTranslationMissing(ctx context.Context, id, requested string) (bool, error) {
	if strings.TrimSpace(requested) == "" {
		return false, nil
	}
	content, err := r.content.Content(ctx, id, requested)
	if err != nil {
		if IsTranslationMissing(err) {
			return true, nil
		}
		if errors.Is(err, ErrNotFound) {
			existing, err := r.content.Content(ctx, id, "")
			if err == nil && existing != nil {
				return true, nil
			}
			if err != nil && !errors.Is(err, ErrNotFound) {
				return false, err
			}
			return false, ErrNotFound
		}
		return false, err
	}
	if content == nil {
		return false, ErrNotFound
	}
	if content.MissingRequestedLocale {
		return true, nil
	}
	if len(content.AvailableLocales) > 0 {
		found := false
		for _, loc := range content.AvailableLocales {
			if strings.EqualFold(loc, requested) {
				found = true
				break
			}
		}
		if !found {
			return true, nil
		}
	}
	return false, nil
}
