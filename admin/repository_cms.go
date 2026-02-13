package admin

import (
	"context"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
)

// ErrPathConflict signals a page path/slug collision.
var ErrPathConflict = errors.New("path conflict")

// CMSPageRepository adapts a CMSContentService to the admin Repository contract.
// It supports locale-aware listings, basic search, parent/child metadata for tree views,
// and slug uniqueness validation for preview links.
type CMSPageRepository struct {
	content CMSContentService
}

// NewCMSPageRepository builds a repository backed by a CMSContentService.
func NewCMSPageRepository(content CMSContentService) *CMSPageRepository {
	return &CMSPageRepository{content: content}
}

// List returns CMS pages filtered by locale and simple search.
func (r *CMSPageRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	locale := extractLocale(opts, "")
	pages, err := r.content.Pages(ctx, locale)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSPage{}
	for _, page := range pages {
		if search != "" && !strings.Contains(strings.ToLower(page.Title), search) && !strings.Contains(strings.ToLower(page.Slug), search) {
			continue
		}
		filtered = append(filtered, page)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, page := range sliced {
		out = append(out, cmsPageRecord(page, cmsPageRecordOptions{
			includeTemplateID: true,
		}))
	}
	return out, total, nil
}

// Get returns a page by id.
func (r *CMSPageRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page, err := r.content.Page(ctx, id, localeFromContext(ctx))
	if err != nil && errors.Is(err, ErrNotFound) {
		if locale := r.resolvePageLocale(ctx, id); locale != "" {
			page, err = r.content.Page(ctx, id, locale)
		}
	}
	if err != nil {
		return nil, err
	}
	return cmsPageRecord(*page, cmsPageRecordOptions{
		includeTemplateID: true,
	}), nil
}

// Create inserts a page with path collision checks.
func (r *CMSPageRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	page := mapToCMSPage(record)
	if err := r.ensureUniqueSlug(ctx, page.Slug, "", page.Locale); err != nil {
		return nil, err
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	created, err := r.content.CreatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return cmsPageRecord(*created, cmsPageRecordOptions{}), nil
}

// Update modifies a page while preventing slug/path collisions.
func (r *CMSPageRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	if err := r.ensurePageTranslationIntent(ctx, id, record); err != nil {
		return nil, err
	}
	page := mapToCMSPage(record)
	page.ID = id
	if strings.TrimSpace(page.Locale) == "" {
		if locale := localeFromContext(ctx); locale != "" {
			page.Locale = locale
		}
		if locale := r.resolvePageLocale(ctx, id); locale != "" {
			page.Locale = locale
		}
	}
	var existing *CMSPage
	if page.Locale != "" {
		if current, err := r.content.Page(ctx, id, page.Locale); err == nil {
			existing = current
		}
	}
	if existing == nil {
		if locale := r.resolvePageLocale(ctx, id); locale != "" {
			page.Locale = locale
			if current, err := r.content.Page(ctx, id, locale); err == nil {
				existing = current
			}
		}
	}
	if existing != nil {
		page = mergeCMSPageUpdate(*existing, page, record)
	}
	if err := r.ensureUniqueSlug(ctx, page.Slug, id, page.Locale); err != nil {
		return nil, err
	}
	if page.PreviewURL == "" {
		page.PreviewURL = page.Slug
	}
	updated, err := r.content.UpdatePage(ctx, page)
	if err != nil {
		return nil, err
	}
	return cmsPageRecord(*updated, cmsPageRecordOptions{}), nil
}

// Delete removes a page.
func (r *CMSPageRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeletePage(ctx, id)
}

func (r *CMSPageRepository) ensureUniqueSlug(ctx context.Context, slug, skipID, locale string) error {
	if slug == "" {
		return nil
	}
	pages, err := r.content.Pages(ctx, locale)
	if err != nil {
		return err
	}
	for _, page := range pages {
		if page.Slug == slug && page.ID != skipID {
			return pathConflictDomainError(map[string]any{
				"slug":      slug,
				"skip_id":   skipID,
				"candidate": page.ID,
				"locale":    locale,
			})
		}
	}
	return nil
}

type cmsPageRecordOptions struct {
	includeTemplateID bool
}

func cmsPageRecord(page CMSPage, opts cmsPageRecordOptions) map[string]any {
	path := resolveCMSPagePath(page)
	schema := strings.TrimSpace(firstNonEmpty(page.SchemaVersion, toString(page.Data["_schema"])))
	record := map[string]any{
		"id":                       page.ID,
		"title":                    page.Title,
		"slug":                     page.Slug,
		"path":                     path,
		"locale":                   page.Locale,
		"translation_group_id":     page.TranslationGroupID,
		"requested_locale":         page.RequestedLocale,
		"resolved_locale":          page.ResolvedLocale,
		"available_locales":        append([]string{}, page.AvailableLocales...),
		"missing_requested_locale": page.MissingRequestedLocale,
		"parent_id":                page.ParentID,
		"blocks":                   blocksPayloadFromPage(page),
		"seo":                      cloneAnyMap(page.SEO),
		"status":                   page.Status,
		"data":                     cloneAnyMap(page.Data),
		"metadata":                 cloneAnyMap(page.Metadata),
		"preview_url":              page.PreviewURL,
	}
	if opts.includeTemplateID {
		record["template_id"] = page.TemplateID
	}
	if schema != "" {
		record["_schema"] = schema
	}
	return record
}

// CMSContentTypeRepository adapts CMSContentTypeService for content type definitions.
type CMSContentTypeRepository struct {
	types CMSContentTypeService
}

// NewCMSContentTypeRepository builds a repository backed by a CMSContentTypeService.
func NewCMSContentTypeRepository(types CMSContentTypeService) *CMSContentTypeRepository {
	return &CMSContentTypeRepository{types: types}
}

// List returns content types filtered by search query.
func (r *CMSContentTypeRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.types == nil {
		return nil, 0, ErrNotFound
	}
	types, err := r.types.ContentTypes(ctx)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	environment := ""
	if opts.Filters != nil {
		environment = strings.TrimSpace(toString(opts.Filters["environment"]))
	}
	if environment == "" {
		environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	filtered := make([]CMSContentType, 0, len(types))
	for _, ct := range types {
		if environment != "" {
			if !strings.EqualFold(strings.TrimSpace(ct.Environment), environment) {
				continue
			}
		} else if strings.TrimSpace(ct.Environment) != "" {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(ct.Name), search) &&
			!strings.Contains(strings.ToLower(ct.Slug), search) &&
			!strings.Contains(strings.ToLower(ct.Description), search) {
			continue
		}
		filtered = append(filtered, ct)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, ct := range sliced {
		out = append(out, mapFromCMSContentType(ct))
	}
	return out, total, nil
}

// Get returns a single content type by slug (preferred) or id.
func (r *CMSContentTypeRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	ct, err := r.resolveContentType(ctx, id)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*ct), nil
}

// Create inserts a content type.
func (r *CMSContentTypeRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	ct := mapToCMSContentType(record)
	if ct.Environment == "" {
		ct.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if ct.Slug == "" {
		ct.Slug = strings.TrimSpace(ct.ID)
	}
	created, err := r.types.CreateContentType(ctx, ct)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*created), nil
}

// Update modifies a content type (slug preferred, id fallback).
func (r *CMSContentTypeRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	schemaProvided := recordHasKey(record, "schema")
	uiSchemaProvided := recordHasKey(record, "ui_schema") || recordHasKey(record, "uiSchema")
	capsProvided := recordHasKey(record, "capabilities")
	replaceCapabilities := capabilitiesReplaceRequested(record)
	ct := mapToCMSContentType(record)
	if ct.Environment == "" {
		ct.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	if ct.ID == "" {
		ct.ID = id
	}
	existing, err := r.resolveContentType(ctx, id)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if (existing == nil || errors.Is(err, ErrNotFound)) && record != nil {
		slug := strings.TrimSpace(toString(record["slug"]))
		if slug == "" {
			slug = strings.TrimSpace(toString(record["content_type_slug"]))
		}
		if slug != "" && slug != id {
			if resolved, resolveErr := r.resolveContentType(ctx, slug); resolveErr == nil && resolved != nil {
				existing = resolved
			} else if resolveErr != nil && !errors.Is(resolveErr, ErrNotFound) {
				return nil, resolveErr
			}
		}
	}
	if existing != nil {
		if existing.ID != "" {
			ct.ID = existing.ID
		}
		if ct.Slug == "" {
			ct.Slug = existing.Slug
		}
		if ct.Environment == "" {
			ct.Environment = existing.Environment
		}
		if strings.TrimSpace(ct.Name) == "" {
			ct.Name = existing.Name
		}
		if !ct.DescriptionSet {
			ct.Description = existing.Description
		}
		if !ct.IconSet {
			ct.Icon = existing.Icon
		}
		if strings.TrimSpace(ct.Status) == "" {
			ct.Status = existing.Status
		}
		if ct.Schema == nil && schemaProvided {
			ct.Schema = existing.Schema
		}
		if ct.UISchema == nil && uiSchemaProvided {
			ct.UISchema = existing.UISchema
		}
		if !capsProvided {
			ct.Capabilities = existing.Capabilities
		} else if !replaceCapabilities {
			ct.Capabilities = mergeAnyMap(cloneAnyMap(existing.Capabilities), cloneAnyMap(ct.Capabilities))
		}
	}
	if existing != nil && schemaProvided && ct.Schema != nil {
		ct.Schema = mergeCMSContentTypeSchema(existing.Schema, ct.Schema)
	}
	updated, err := r.types.UpdateContentType(ctx, ct)
	if err != nil {
		return nil, err
	}
	return mapFromCMSContentType(*updated), nil
}

// Delete removes a content type.
func (r *CMSContentTypeRepository) Delete(ctx context.Context, id string) error {
	if r.types == nil {
		return ErrNotFound
	}
	if existing, err := r.resolveContentType(ctx, id); err == nil && existing != nil && existing.ID != "" {
		return r.types.DeleteContentType(ctx, existing.ID)
	}
	return r.types.DeleteContentType(ctx, id)
}

func (r *CMSContentTypeRepository) resolveContentType(ctx context.Context, id string) (*CMSContentType, error) {
	if r.types == nil {
		return nil, ErrNotFound
	}
	slug := strings.TrimSpace(id)
	if slug != "" {
		ct, err := r.types.ContentTypeBySlug(ctx, slug)
		if err == nil && ct != nil {
			return ct, nil
		}
		if err != nil && !errors.Is(err, ErrNotFound) {
			return nil, err
		}
	}
	return r.types.ContentType(ctx, id)
}

func mapFromCMSContentType(ct CMSContentType) map[string]any {
	id := strings.TrimSpace(ct.ID)
	if id == "" {
		id = strings.TrimSpace(ct.Slug)
	}
	out := map[string]any{
		"id":           id,
		"name":         ct.Name,
		"slug":         ct.Slug,
		"description":  ct.Description,
		"environment":  ct.Environment,
		"schema":       cloneAnyMap(ct.Schema),
		"ui_schema":    cloneAnyMap(ct.UISchema),
		"capabilities": cloneAnyMap(ct.Capabilities),
		"icon":         ct.Icon,
		"status":       ct.Status,
	}
	if ct.ID != "" {
		out["content_type_id"] = ct.ID
	}
	if !ct.CreatedAt.IsZero() {
		out["created_at"] = ct.CreatedAt
	}
	if !ct.UpdatedAt.IsZero() {
		out["updated_at"] = ct.UpdatedAt
	}
	return out
}

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
		contentType := firstNonEmpty(item.ContentTypeSlug, item.ContentType)
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
	typeKey := strings.ToLower(strings.TrimSpace(firstNonEmpty(r.contentType.Slug, r.contentType.Name, r.contentType.ID)))
	records := make([]map[string]any, 0, len(contents))
	for _, item := range contents {
		contentType := strings.ToLower(strings.TrimSpace(firstNonEmpty(item.ContentTypeSlug, item.ContentType)))
		if typeKey != "" && contentType != typeKey {
			continue
		}
		if contentTypeWantsTranslations(r.contentType) {
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
	contentType := firstNonEmpty(item.ContentTypeSlug, item.ContentType)
	schema := strings.TrimSpace(firstNonEmpty(item.SchemaVersion, toString(item.Data["_schema"])))
	record := map[string]any{
		"id":                       item.ID,
		"title":                    item.Title,
		"slug":                     item.Slug,
		"locale":                   item.Locale,
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
		record["data"] = cloneAnyMap(item.Data)
	}
	if opts.includeMetadata {
		record["metadata"] = cloneAnyMap(item.Metadata)
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
	slug := strings.ToLower(strings.TrimSpace(panelSlugForContentType(&contentType)))
	switch slug {
	case "pages", "page", "posts", "post":
		return true
	default:
		return false
	}
}

func contentRecordRequiresCanonicalTopLevelFields(item CMSContent) bool {
	key := strings.ToLower(strings.TrimSpace(firstNonEmpty(item.ContentTypeSlug, item.ContentType)))
	switch key {
	case "page", "pages", "post", "posts":
		return true
	default:
		return false
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
		"content_type", firstNonEmpty(item.ContentTypeSlug, item.ContentType),
		"missing_fields", missing,
	)
	return validationDomainError("cms content payload missing canonical top-level derived fields", map[string]any{
		"component":    "cms_content_repository",
		"content_id":   item.ID,
		"content_type": firstNonEmpty(item.ContentTypeSlug, item.ContentType),
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
	typeKey := strings.ToLower(strings.TrimSpace(firstNonEmpty(r.contentType.Slug, r.contentType.Name, r.contentType.ID)))
	if typeKey == "" {
		return record, nil
	}
	recordType := strings.ToLower(strings.TrimSpace(firstNonEmpty(toString(record["content_type_slug"]), toString(record["content_type"]))))
	if recordType != typeKey {
		return nil, ErrNotFound
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
	typeKey := strings.TrimSpace(firstNonEmpty(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
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
	typeKey := strings.TrimSpace(firstNonEmpty(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
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
	createdType := strings.ToLower(strings.TrimSpace(firstNonEmpty(created.ContentTypeSlug, created.ContentType)))
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
	typeKey := strings.TrimSpace(firstNonEmpty(r.contentType.Slug, r.contentType.Name, r.contentType.ID))
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

// CMSBlockDefinitionRepository manages block definitions through CMSContentService.
type CMSBlockDefinitionRepository struct {
	content CMSContentService
	types   CMSContentTypeService
}

// NewCMSBlockDefinitionRepository builds a block definition repository.
func NewCMSBlockDefinitionRepository(content CMSContentService, types CMSContentTypeService) *CMSBlockDefinitionRepository {
	return &CMSBlockDefinitionRepository{content: content, types: types}
}

// List returns block definitions.
func (r *CMSBlockDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.content == nil {
		return nil, 0, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	categoryFilter := ""
	statusFilter := ""
	environment := ""
	if opts.Filters != nil {
		categoryFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["category"])))
		statusFilter = strings.ToLower(strings.TrimSpace(toString(opts.Filters["status"])))
		environment = strings.TrimSpace(toString(opts.Filters["environment"]))
	}
	if environment == "" {
		environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	filtered := []CMSBlockDefinition{}
	for _, def := range defs {
		if environment != "" {
			if !strings.EqualFold(strings.TrimSpace(def.Environment), environment) {
				continue
			}
		} else if strings.TrimSpace(def.Environment) != "" {
			continue
		}
		if search != "" &&
			!strings.Contains(strings.ToLower(def.Name), search) &&
			!strings.Contains(strings.ToLower(def.Type), search) &&
			!strings.Contains(strings.ToLower(def.Slug), search) {
			continue
		}
		if categoryFilter != "" && strings.ToLower(strings.TrimSpace(def.Category)) != categoryFilter {
			continue
		}
		if statusFilter != "" && strings.ToLower(strings.TrimSpace(def.Status)) != statusFilter {
			continue
		}
		filtered = append(filtered, def)
	}
	allowedTypes := map[string]struct{}{}
	restricted := false
	if opts.Filters != nil && r.types != nil {
		contentTypeKey := strings.TrimSpace(toString(opts.Filters["content_type"]))
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_slug"]))
		}
		if contentTypeKey == "" {
			contentTypeKey = strings.TrimSpace(toString(opts.Filters["content_type_id"]))
		}
		if contentTypeKey != "" {
			if ct := r.resolveContentType(ctx, contentTypeKey); ct != nil {
				if types, ok := blockTypesFromContentType(*ct); ok {
					restricted = true
					for _, t := range types {
						if trimmed := strings.ToLower(strings.TrimSpace(t)); trimmed != "" {
							allowedTypes[trimmed] = struct{}{}
						}
					}
				}
			}
		}
	}
	if restricted {
		filteredDefs := make([]CMSBlockDefinition, 0, len(filtered))
		for _, def := range filtered {
			if len(allowedTypes) == 0 {
				break
			}
			if defType := strings.ToLower(strings.TrimSpace(blockDefinitionType(def))); defType != "" {
				if _, ok := allowedTypes[defType]; ok {
					filteredDefs = append(filteredDefs, def)
				}
			}
		}
		filtered = filteredDefs
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		slug := strings.TrimSpace(def.Slug)
		if slug == "" {
			slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
		}
		typ := strings.TrimSpace(def.Type)
		if typ == "" {
			typ = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
		}
		if typ == "" {
			typ = strings.TrimSpace(firstNonEmpty(slug, def.ID, def.Name))
		}
		if slug == "" {
			slug = typ
		}
		category := strings.TrimSpace(def.Category)
		if category == "" {
			category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
		}
		if category == "" {
			category = "custom"
		}
		status := strings.TrimSpace(def.Status)
		if status == "" {
			status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
		}
		if status == "" {
			status = "draft"
		}
		schemaVersion := blockDefinitionSchemaVersion(def)
		migrationStatus := blockDefinitionMigrationStatus(def)
		out = append(out, map[string]any{
			"id":               def.ID,
			"name":             def.Name,
			"slug":             slug,
			"type":             typ,
			"description":      def.Description,
			"icon":             def.Icon,
			"category":         category,
			"status":           status,
			"environment":      def.Environment,
			"schema":           cloneAnyMap(def.Schema),
			"ui_schema":        cloneAnyMap(def.UISchema),
			"schema_version":   schemaVersion,
			"migration_status": migrationStatus,
			"locale":           def.Locale,
		})
	}
	return out, total, nil
}

// Get returns a single block definition.
func (r *CMSBlockDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	environment := strings.TrimSpace(environmentFromContext(ctx))
	for _, def := range defs {
		if environment != "" {
			if !strings.EqualFold(strings.TrimSpace(def.Environment), environment) {
				continue
			}
		} else if strings.TrimSpace(def.Environment) != "" {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(def.ID), target) ||
			strings.EqualFold(strings.TrimSpace(def.Slug), target) ||
			strings.EqualFold(strings.TrimSpace(def.Type), target) {
			slug := strings.TrimSpace(def.Slug)
			if slug == "" {
				slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
			}
			typ := strings.TrimSpace(def.Type)
			if typ == "" {
				typ = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
			}
			if typ == "" {
				typ = strings.TrimSpace(firstNonEmpty(slug, def.ID, def.Name))
			}
			if slug == "" {
				slug = typ
			}
			category := strings.TrimSpace(def.Category)
			if category == "" {
				category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
			}
			if category == "" {
				category = "custom"
			}
			status := strings.TrimSpace(def.Status)
			if status == "" {
				status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
			}
			if status == "" {
				status = "draft"
			}
			schemaVersion := blockDefinitionSchemaVersion(def)
			migrationStatus := blockDefinitionMigrationStatus(def)
			return map[string]any{
				"id":               def.ID,
				"name":             def.Name,
				"slug":             slug,
				"type":             typ,
				"description":      def.Description,
				"icon":             def.Icon,
				"category":         category,
				"status":           status,
				"environment":      def.Environment,
				"schema":           cloneAnyMap(def.Schema),
				"ui_schema":        cloneAnyMap(def.UISchema),
				"schema_version":   schemaVersion,
				"migration_status": migrationStatus,
				"locale":           def.Locale,
			}, nil
		}
	}
	return nil, ErrNotFound
}

func (r *CMSBlockDefinitionRepository) findBlockDefinition(ctx context.Context, id, environment string) (*CMSBlockDefinition, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	target := strings.TrimSpace(id)
	if target == "" {
		return nil, ErrNotFound
	}
	defs, err := r.content.BlockDefinitions(ctx)
	if err != nil {
		return nil, err
	}
	env := strings.TrimSpace(environment)
	for _, def := range defs {
		if env != "" {
			if !strings.EqualFold(strings.TrimSpace(def.Environment), env) {
				continue
			}
		} else if strings.TrimSpace(def.Environment) != "" {
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

// Create adds a block definition.
func (r *CMSBlockDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	if def.Environment == "" {
		def.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	applyBlockDefinitionDefaults(&def)
	created, err := r.content.CreateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	schemaVersion := blockDefinitionSchemaVersion(*created)
	migrationStatus := blockDefinitionMigrationStatus(*created)
	return map[string]any{
		"id":               created.ID,
		"name":             created.Name,
		"slug":             created.Slug,
		"type":             created.Type,
		"description":      created.Description,
		"icon":             created.Icon,
		"category":         created.Category,
		"status":           created.Status,
		"environment":      created.Environment,
		"schema":           cloneAnyMap(created.Schema),
		"ui_schema":        cloneAnyMap(created.UISchema),
		"schema_version":   schemaVersion,
		"migration_status": migrationStatus,
		"locale":           created.Locale,
	}, nil
}

// Update modifies a block definition.
func (r *CMSBlockDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.content == nil {
		return nil, ErrNotFound
	}
	def := mapToCMSBlockDefinition(record)
	if def.Environment == "" {
		def.Environment = strings.TrimSpace(environmentFromContext(ctx))
	}
	def.ID = id
	if existing, err := r.findBlockDefinition(ctx, id, def.Environment); err == nil && existing != nil {
		if strings.TrimSpace(def.Name) == "" {
			def.Name = existing.Name
		}
		if strings.TrimSpace(def.Slug) == "" {
			def.Slug = existing.Slug
		}
		if strings.TrimSpace(def.Type) == "" {
			def.Type = existing.Type
		}
		if strings.TrimSpace(def.Status) == "" {
			def.Status = existing.Status
		}
		if !def.DescriptionSet {
			def.Description = existing.Description
		}
		if !def.IconSet {
			def.Icon = existing.Icon
		}
		if !def.CategorySet {
			def.Category = existing.Category
		}
		if def.Schema == nil {
			def.Schema = existing.Schema
		}
		if def.UISchema == nil {
			def.UISchema = existing.UISchema
		}
	}
	applyBlockDefinitionDefaults(&def)
	updated, err := r.content.UpdateBlockDefinition(ctx, def)
	if err != nil {
		return nil, err
	}
	schemaVersion := blockDefinitionSchemaVersion(*updated)
	migrationStatus := blockDefinitionMigrationStatus(*updated)
	return map[string]any{
		"id":               updated.ID,
		"name":             updated.Name,
		"slug":             updated.Slug,
		"type":             updated.Type,
		"description":      updated.Description,
		"icon":             updated.Icon,
		"category":         updated.Category,
		"status":           updated.Status,
		"environment":      updated.Environment,
		"schema":           cloneAnyMap(updated.Schema),
		"ui_schema":        cloneAnyMap(updated.UISchema),
		"schema_version":   schemaVersion,
		"migration_status": migrationStatus,
		"locale":           updated.Locale,
	}, nil
}

// Delete removes a block definition.
func (r *CMSBlockDefinitionRepository) Delete(ctx context.Context, id string) error {
	if r.content == nil {
		return ErrNotFound
	}
	return r.content.DeleteBlockDefinition(ctx, id)
}

func (r *CMSBlockDefinitionRepository) resolveContentType(ctx context.Context, key string) *CMSContentType {
	if r == nil || r.types == nil || strings.TrimSpace(key) == "" {
		return nil
	}
	key = strings.TrimSpace(key)
	if ct, err := r.types.ContentTypeBySlug(ctx, key); err == nil && ct != nil {
		return ct
	}
	if ct, err := r.types.ContentType(ctx, key); err == nil && ct != nil {
		return ct
	}
	types, err := r.types.ContentTypes(ctx)
	if err != nil {
		return nil
	}
	needle := strings.ToLower(key)
	for _, ct := range types {
		if strings.ToLower(ct.Slug) == needle || strings.ToLower(ct.Name) == needle || strings.ToLower(ct.ID) == needle {
			copy := ct
			return &copy
		}
	}
	return nil
}

// CMSBlockRepository manages blocks assigned to content/pages.
type CMSBlockRepository struct {
	content CMSContentService
}

// NewCMSBlockRepository builds a block repository.
func NewCMSBlockRepository(content CMSContentService) *CMSBlockRepository {
	return &CMSBlockRepository{content: content}
}

// List returns blocks for a content ID (or all when unspecified).
func (r *CMSBlockRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, 0, err
	}
	locale := extractLocale(opts, "")
	contentIDs := []string{}
	if opts.Filters != nil {
		if cid, ok := opts.Filters["content_id"].(string); ok && cid != "" {
			contentIDs = append(contentIDs, cid)
		}
	}
	if len(contentIDs) == 0 {
		if contents, err := r.content.Contents(ctx, ""); err == nil {
			for _, c := range contents {
				contentIDs = append(contentIDs, c.ID)
			}
		}
		if pages, err := r.content.Pages(ctx, ""); err == nil {
			for _, p := range pages {
				contentIDs = append(contentIDs, p.ID)
			}
		}
	}
	blocks := []CMSBlock{}
	for _, cid := range contentIDs {
		items, _ := r.content.BlocksForContent(ctx, cid, locale)
		blocks = append(blocks, items...)
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []CMSBlock{}
	for _, blk := range blocks {
		if search != "" && !strings.Contains(strings.ToLower(blk.BlockType), search) && !strings.Contains(strings.ToLower(blk.DefinitionID), search) {
			continue
		}
		filtered = append(filtered, blk)
	}
	sliced, total := paginateCMS(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, blk := range sliced {
		out = append(out, cmsBlockRecord(blk))
	}
	return out, total, nil
}

// Get returns a block by id.
func (r *CMSBlockRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, blk := range list {
		if blk["id"] == id {
			return blk, nil
		}
	}
	return nil, ErrNotFound
}

// Create saves a new block.
func (r *CMSBlockRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	created, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*created), nil
}

// Update modifies an existing block.
func (r *CMSBlockRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSContentService(r.content); err != nil {
		return nil, err
	}
	block := mapToCMSBlock(record)
	block.ID = id
	updated, err := r.content.SaveBlock(ctx, block)
	if err != nil {
		return nil, err
	}
	return cmsBlockRecord(*updated), nil
}

// Delete removes a block.
func (r *CMSBlockRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSContentService(r.content); err != nil {
		return err
	}
	return r.content.DeleteBlock(ctx, id)
}

// CMSMenuRepository manages menu items for CMS-backed navigation.
type CMSMenuRepository struct {
	menu     CMSMenuService
	menuCode string
}

// NewCMSMenuRepository builds a menu repository with a default menu code.
func NewCMSMenuRepository(menu CMSMenuService, defaultCode string) *CMSMenuRepository {
	return &CMSMenuRepository{menu: menu, menuCode: defaultCode}
}

// List returns menu items for a menu code and locale.
func (r *CMSMenuRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if r.menu == nil {
		return nil, 0, ErrNotFound
	}
	code := r.menuCode
	if opts.Filters != nil {
		if c, ok := opts.Filters["menu"].(string); ok && c != "" {
			code = c
		}
	}
	locale := extractLocale(opts, "")
	menu, err := r.menu.Menu(ctx, code, locale)
	if err != nil {
		return nil, 0, err
	}
	flat := flattenMenuItems(menu.Items, "")
	search := strings.ToLower(extractSearch(opts))
	filtered := []MenuItem{}
	for _, item := range flat {
		if search != "" && !strings.Contains(strings.ToLower(item.Label), search) && !strings.Contains(strings.ToLower(item.Icon), search) {
			continue
		}
		filtered = append(filtered, item)
	}
	sliced, total := paginateMenu(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, item := range sliced {
		var position any
		if item.Position != nil {
			position = *item.Position
		}
		out = append(out, map[string]any{
			"id":          item.ID,
			"label":       item.Label,
			"icon":        item.Icon,
			"position":    position,
			"locale":      item.Locale,
			"menu":        code,
			"parent_id":   item.ParentID,
			"target":      item.Target,
			"badge":       cloneAnyMap(item.Badge),
			"permissions": append([]string{}, item.Permissions...),
			"classes":     append([]string{}, item.Classes...),
			"styles":      cloneStringMap(item.Styles),
		})
	}
	return out, total, nil
}

// Get returns a single menu item by id.
func (r *CMSMenuRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	list, _, err := r.List(ctx, ListOptions{PerPage: 1000})
	if err != nil {
		return nil, err
	}
	for _, item := range list {
		if item["id"] == id {
			return item, nil
		}
	}
	return nil, ErrNotFound
}

// Create inserts a menu item.
func (r *CMSMenuRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	if err := r.menu.AddMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	if item.ID == "" {
		menu, _ := r.menu.Menu(ctx, menuCode, "")
		for _, mi := range flattenMenuItems(menu.Items, "") {
			if mi.Label == item.Label && mi.Locale == item.Locale && mi.ParentID == item.ParentID {
				item.ID = mi.ID
				break
			}
		}
	}
	return r.Get(ctx, item.ID)
}

// Update modifies a menu item.
func (r *CMSMenuRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if r.menu == nil {
		return nil, ErrNotFound
	}
	item, menuCode := mapToMenuItem(record, r.menuCode)
	item.ID = id
	if err := r.menu.UpdateMenuItem(ctx, menuCode, item); err != nil {
		return nil, err
	}
	return r.Get(ctx, id)
}

// Delete removes a menu item.
func (r *CMSMenuRepository) Delete(ctx context.Context, id string) error {
	if r.menu == nil {
		return ErrNotFound
	}
	return r.menu.DeleteMenuItem(ctx, r.menuCode, id)
}

// WidgetDefinitionRepository manages widget definitions through CMSWidgetService.
type WidgetDefinitionRepository struct {
	widgets CMSWidgetService
}

// NewWidgetDefinitionRepository builds a widget definition repository.
func NewWidgetDefinitionRepository(widgets CMSWidgetService) *WidgetDefinitionRepository {
	return &WidgetDefinitionRepository{widgets: widgets}
}

// List returns widget definitions.
func (r *WidgetDefinitionRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, 0, err
	}
	defs := r.widgets.Definitions()
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetDefinition{}
	for _, def := range defs {
		if search != "" && !strings.Contains(strings.ToLower(def.Name), search) && !strings.Contains(strings.ToLower(def.Code), search) {
			continue
		}
		filtered = append(filtered, def)
	}
	sliced, total := paginateWidgetDefs(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, def := range sliced {
		out = append(out, widgetDefinitionRecord(def))
	}
	return out, total, nil
}

// Get returns a widget definition by code.
func (r *WidgetDefinitionRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	for _, def := range r.widgets.Definitions() {
		if def.Code == id {
			return widgetDefinitionRecord(def), nil
		}
	}
	return nil, ErrNotFound
}

// Create registers a widget definition.
func (r *WidgetDefinitionRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	def := mapToWidgetDefinition(record)
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return widgetDefinitionRecord(def), nil
}

// Update updates a widget definition (overwrites).
func (r *WidgetDefinitionRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	def := mapToWidgetDefinition(record)
	if def.Code == "" {
		def.Code = id
	}
	if err := r.widgets.RegisterDefinition(ctx, def); err != nil {
		return nil, err
	}
	return widgetDefinitionRecord(def), nil
}

// Delete removes a widget definition.
func (r *WidgetDefinitionRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return err
	}
	return r.widgets.DeleteDefinition(ctx, id)
}

// WidgetInstanceRepository manages widget instances.
type WidgetInstanceRepository struct {
	widgets CMSWidgetService
}

// NewWidgetInstanceRepository builds a widget instance repository.
func NewWidgetInstanceRepository(widgets CMSWidgetService) *WidgetInstanceRepository {
	return &WidgetInstanceRepository{widgets: widgets}
}

// List returns widget instances filtered by area/page/locale.
func (r *WidgetInstanceRepository) List(ctx context.Context, opts ListOptions) ([]map[string]any, int, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, 0, err
	}
	filter := WidgetInstanceFilter{
		Area:   stringFromFilter(opts.Filters, "area"),
		PageID: stringFromFilter(opts.Filters, "page_id"),
		Locale: extractLocale(opts, ""),
	}
	instances, err := r.widgets.ListInstances(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	search := strings.ToLower(extractSearch(opts))
	filtered := []WidgetInstance{}
	for _, inst := range instances {
		if search != "" && !strings.Contains(strings.ToLower(inst.DefinitionCode), search) && !strings.Contains(strings.ToLower(inst.Area), search) {
			continue
		}
		filtered = append(filtered, inst)
	}
	sliced, total := paginateWidgetInstances(filtered, opts)
	out := make([]map[string]any, 0, len(sliced))
	for _, inst := range sliced {
		out = append(out, widgetInstanceRecord(inst))
	}
	return out, total, nil
}

// Get returns a widget instance by id.
func (r *WidgetInstanceRepository) Get(ctx context.Context, id string) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instances, err := r.widgets.ListInstances(ctx, WidgetInstanceFilter{})
	if err != nil {
		return nil, err
	}
	for _, inst := range instances {
		if inst.ID == id {
			return widgetInstanceRecord(inst), nil
		}
	}
	return nil, ErrNotFound
}

// Create saves a widget instance.
func (r *WidgetInstanceRepository) Create(ctx context.Context, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instance := mapToWidgetInstance(record)
	created, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return widgetInstanceRecord(*created), nil
}

// Update modifies a widget instance.
func (r *WidgetInstanceRepository) Update(ctx context.Context, id string, record map[string]any) (map[string]any, error) {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return nil, err
	}
	instance := mapToWidgetInstance(record)
	instance.ID = id
	updated, err := r.widgets.SaveInstance(ctx, instance)
	if err != nil {
		return nil, err
	}
	return widgetInstanceRecord(*updated), nil
}

// Delete removes a widget instance.
func (r *WidgetInstanceRepository) Delete(ctx context.Context, id string) error {
	if err := ensureCMSWidgetService(r.widgets); err != nil {
		return err
	}
	return r.widgets.DeleteInstance(ctx, id)
}

func ensureCMSContentService(content CMSContentService) error {
	if content == nil {
		return ErrNotFound
	}
	return nil
}

func ensureCMSWidgetService(widgets CMSWidgetService) error {
	if widgets == nil {
		return ErrNotFound
	}
	return nil
}

func cmsBlockRecord(block CMSBlock) map[string]any {
	return map[string]any{
		"id":               block.ID,
		"definition_id":    block.DefinitionID,
		"content_id":       block.ContentID,
		"region":           block.Region,
		"locale":           block.Locale,
		"status":           block.Status,
		"position":         block.Position,
		"data":             cloneAnyMap(block.Data),
		"block_type":       block.BlockType,
		"block_schema_key": block.BlockSchemaKey,
	}
}

func widgetDefinitionRecord(def WidgetDefinition) map[string]any {
	return map[string]any{
		"code":   def.Code,
		"name":   def.Name,
		"schema": cloneAnyMap(def.Schema),
	}
}

func widgetInstanceRecord(instance WidgetInstance) map[string]any {
	return map[string]any{
		"id":              instance.ID,
		"definition_code": instance.DefinitionCode,
		"area":            instance.Area,
		"page_id":         instance.PageID,
		"locale":          instance.Locale,
		"config":          cloneAnyMap(instance.Config),
		"position":        instance.Position,
	}
}

type cmsCommonRecordFields struct {
	ID                 string
	TranslationGroupID string
	Title              string
	Slug               string
	Locale             string
	Status             string
}

type cmsMappedDataFields struct {
	Data          map[string]any
	Blocks        []string
	Embedded      []map[string]any
	SchemaVersion string
}

func assignStringIfPresent(record map[string]any, key string, target *string) {
	if record == nil || target == nil {
		return
	}
	if value, ok := record[key].(string); ok {
		*target = value
	}
}

func extractCMSCommonRecordFields(record map[string]any) cmsCommonRecordFields {
	fields := cmsCommonRecordFields{}
	assignStringIfPresent(record, "id", &fields.ID)
	assignStringIfPresent(record, "translation_group_id", &fields.TranslationGroupID)
	assignStringIfPresent(record, "title", &fields.Title)
	assignStringIfPresent(record, "slug", &fields.Slug)
	assignStringIfPresent(record, "locale", &fields.Locale)
	assignStringIfPresent(record, "status", &fields.Status)
	return fields
}

func mapCMSDataFields(record map[string]any) cmsMappedDataFields {
	mapped := cmsMappedDataFields{
		Data: map[string]any{},
	}
	if record == nil {
		return mapped
	}
	if rawBlocks, ok := record["blocks"]; ok {
		legacy, embedded, embeddedPresent := parseBlocksPayload(rawBlocks)
		if embeddedPresent {
			mapped.Embedded = embedded
			mapped.Data["blocks"] = embedded
		} else if len(legacy) > 0 {
			mapped.Blocks = legacy
		}
	}
	if data, ok := record["data"].(map[string]any); ok {
		mapped.Data = cloneAnyMap(data)
	}
	if mapped.Embedded == nil {
		if embedded, present := embeddedBlocksFromData(mapped.Data); present {
			mapped.Embedded = embedded
		}
	}
	if mapped.Embedded != nil {
		if mapped.Data == nil {
			mapped.Data = map[string]any{}
		}
		mapped.Data["blocks"] = cloneEmbeddedBlocks(mapped.Embedded)
	}
	if schema := schemaVersionFromRecord(record, mapped.Data); schema != "" {
		mapped.SchemaVersion = schema
		if mapped.Data == nil {
			mapped.Data = map[string]any{}
		}
		mapped.Data["_schema"] = schema
	}
	return mapped
}

func normalizedLocaleList(raw any) []string {
	if raw == nil {
		return nil
	}
	locales := []string{}
	switch typed := raw.(type) {
	case []string:
		locales = append(locales, typed...)
	case []any:
		for _, item := range typed {
			if val := strings.TrimSpace(toString(item)); val != "" {
				locales = append(locales, val)
			}
		}
	case string:
		for _, item := range strings.Split(typed, ",") {
			if val := strings.TrimSpace(item); val != "" {
				locales = append(locales, val)
			}
		}
	default:
		if val := strings.TrimSpace(toString(raw)); val != "" {
			locales = append(locales, val)
		}
	}
	if len(locales) == 0 {
		return nil
	}
	return locales
}

func preserveStringField(record map[string]any, key string, target *string, fallback string) {
	if target == nil {
		return
	}
	if !recordHasKey(record, key) {
		*target = fallback
	}
}

func mergeCMSBlocksUpdate(record map[string]any, blocks *[]string, embedded *[]map[string]any, existingBlocks []string, existingEmbedded []map[string]any) {
	if blocks == nil || embedded == nil {
		return
	}
	if recordHasKey(record, "blocks") {
		return
	}
	*blocks = append([]string{}, existingBlocks...)
	if *embedded == nil && existingEmbedded != nil {
		*embedded = cloneEmbeddedBlocks(existingEmbedded)
	}
}

func mergeCMSMetadataUpdate(record map[string]any, metadata *map[string]any, existing map[string]any) {
	if metadata == nil {
		return
	}
	if !recordHasKey(record, "metadata") {
		*metadata = cloneAnyMap(existing)
		return
	}
	*metadata = cloneAnyMap(*metadata)
}

func mergeCMSDataUpdate(existingData map[string]any, incomingData map[string]any, shouldMerge bool) map[string]any {
	if shouldMerge {
		return mergeAnyMap(existingData, incomingData)
	}
	return cloneAnyMap(existingData)
}

func finalizeCMSDataSchemaAndBlocks(record map[string]any, data map[string]any, schemaVersion string, existingSchema string, embedded []map[string]any) (map[string]any, string, []map[string]any) {
	if schemaVersion == "" && !recordHasKey(record, "_schema") {
		schemaVersion = existingSchema
	}
	if schemaVersion == "" {
		schemaVersion = strings.TrimSpace(toString(data["_schema"]))
	}
	if schemaVersion != "" {
		if data == nil {
			data = map[string]any{}
		}
		data["_schema"] = schemaVersion
	}
	if embedded == nil && data != nil {
		if next, present := embeddedBlocksFromData(data); present {
			embedded = next
		}
	}
	if embedded != nil {
		if data == nil {
			data = map[string]any{}
		}
		data["blocks"] = cloneEmbeddedBlocks(embedded)
	}
	return data, schemaVersion, embedded
}

func mapToCMSPage(record map[string]any) CMSPage {
	page := CMSPage{
		Data: map[string]any{},
		SEO:  map[string]any{},
	}
	if record == nil {
		return page
	}
	common := extractCMSCommonRecordFields(record)
	page.ID = common.ID
	page.TranslationGroupID = common.TranslationGroupID
	page.Title = common.Title
	page.Slug = common.Slug
	page.Locale = common.Locale
	page.Status = common.Status
	if parentID, ok := record["parent_id"].(string); ok {
		page.ParentID = parentID
	}
	mapped := mapCMSDataFields(record)
	page.Data = mapped.Data
	page.Blocks = mapped.Blocks
	page.EmbeddedBlocks = mapped.Embedded
	page.SchemaVersion = mapped.SchemaVersion
	if seo, ok := record["seo"].(map[string]any); ok {
		page.SEO = cloneAnyMap(seo)
	}
	if path, ok := record["path"].(string); ok && strings.TrimSpace(path) != "" {
		page.Data["path"] = path
		if page.PreviewURL == "" {
			page.PreviewURL = path
		}
		if page.Slug == "" {
			page.Slug = path
		}
	}
	if preview, ok := record["preview_url"].(string); ok {
		page.PreviewURL = preview
	}
	if tpl, ok := record["template_id"].(string); ok {
		page.TemplateID = tpl
	}
	if tpl, ok := record["template"].(string); ok && page.TemplateID == "" {
		page.TemplateID = tpl
	}
	if meta, ok := record["metadata"].(map[string]any); ok {
		page.Metadata = cloneAnyMap(meta)
	}
	return page
}

func mergeCMSPageUpdate(existing CMSPage, page CMSPage, record map[string]any) CMSPage {
	if record == nil {
		return existing
	}
	preserveStringField(record, "title", &page.Title, existing.Title)
	preserveStringField(record, "slug", &page.Slug, existing.Slug)
	preserveStringField(record, "locale", &page.Locale, existing.Locale)
	preserveStringField(record, "translation_group_id", &page.TranslationGroupID, existing.TranslationGroupID)
	preserveStringField(record, "status", &page.Status, existing.Status)
	preserveStringField(record, "parent_id", &page.ParentID, existing.ParentID)
	if !recordHasKey(record, "preview_url") {
		page.PreviewURL = existing.PreviewURL
	}
	mergeCMSBlocksUpdate(record, &page.Blocks, &page.EmbeddedBlocks, existing.Blocks, existing.EmbeddedBlocks)
	if !recordHasKey(record, "template_id") && !recordHasKey(record, "template") {
		page.TemplateID = existing.TemplateID
	}
	mergeCMSMetadataUpdate(record, &page.Metadata, existing.Metadata)
	if recordHasKey(record, "seo") {
		page.SEO = mergeAnyMap(existing.SEO, page.SEO)
	} else {
		page.SEO = cloneAnyMap(existing.SEO)
	}
	page.Data = mergeCMSDataUpdate(existing.Data, page.Data, recordHasKey(record, "data") || recordHasKey(record, "path") || recordHasKey(record, "blocks") || recordHasKey(record, "_schema"))
	page.Data, page.SchemaVersion, page.EmbeddedBlocks = finalizeCMSDataSchemaAndBlocks(record, page.Data, page.SchemaVersion, existing.SchemaVersion, page.EmbeddedBlocks)
	return page
}

var cmsContentReservedKeys = map[string]struct{}{
	"id":                       {},
	"title":                    {},
	"slug":                     {},
	"locale":                   {},
	"status":                   {},
	"content_type":             {},
	"content_type_slug":        {},
	"content_type_id":          {},
	"translation_group_id":     {},
	"requested_locale":         {},
	"resolved_locale":          {},
	"available_locales":        {},
	"missing_requested_locale": {},
	"blocks":                   {},
	"data":                     {},
	"metadata":                 {},
	"schema":                   {},
	"_schema":                  {},
}

func mapToCMSContent(record map[string]any) CMSContent {
	content := CMSContent{
		Data: map[string]any{},
	}
	if record == nil {
		return content
	}
	common := extractCMSCommonRecordFields(record)
	content.ID = common.ID
	content.TranslationGroupID = common.TranslationGroupID
	content.Title = common.Title
	content.Slug = common.Slug
	content.Locale = common.Locale
	content.Status = common.Status
	if requested, ok := record["requested_locale"].(string); ok {
		content.RequestedLocale = strings.TrimSpace(requested)
	} else if requested := strings.TrimSpace(toString(record["requested_locale"])); requested != "" {
		content.RequestedLocale = requested
	}
	if resolved, ok := record["resolved_locale"].(string); ok {
		content.ResolvedLocale = strings.TrimSpace(resolved)
	} else if resolved := strings.TrimSpace(toString(record["resolved_locale"])); resolved != "" {
		content.ResolvedLocale = resolved
	}
	if missing, ok := record["missing_requested_locale"].(bool); ok {
		content.MissingRequestedLocale = missing
	}
	if locales := normalizedLocaleList(record["available_locales"]); len(locales) > 0 {
		content.AvailableLocales = append([]string{}, locales...)
	}
	if ctype, ok := record["content_type"].(string); ok {
		if content.ContentTypeSlug == "" {
			content.ContentTypeSlug = ctype
		}
		if content.ContentType == "" {
			content.ContentType = ctype
		}
	}
	if ctype, ok := record["content_type_slug"].(string); ok {
		content.ContentTypeSlug = ctype
	}
	if ctype, ok := record["content_type_id"].(string); ok && ctype != "" {
		content.ContentType = ctype
	}
	if content.ContentType == "" && content.ContentTypeSlug != "" {
		content.ContentType = content.ContentTypeSlug
	}
	mapped := mapCMSDataFields(record)
	content.Data = mapped.Data
	content.Blocks = mapped.Blocks
	content.EmbeddedBlocks = mapped.Embedded
	content.SchemaVersion = mapped.SchemaVersion
	if meta, ok := record["metadata"].(map[string]any); ok {
		content.Metadata = cloneAnyMap(meta)
	}
	for key, val := range record {
		if _, skip := cmsContentReservedKeys[key]; skip {
			continue
		}
		if strings.HasPrefix(key, "_") {
			continue
		}
		content.Data[key] = val
	}
	return content
}

func mergeCMSContentUpdate(existing CMSContent, content CMSContent, record map[string]any) CMSContent {
	if record == nil {
		return existing
	}
	preserveStringField(record, "title", &content.Title, existing.Title)
	preserveStringField(record, "slug", &content.Slug, existing.Slug)
	preserveStringField(record, "locale", &content.Locale, existing.Locale)
	preserveStringField(record, "translation_group_id", &content.TranslationGroupID, existing.TranslationGroupID)
	preserveStringField(record, "status", &content.Status, existing.Status)
	mergeCMSBlocksUpdate(record, &content.Blocks, &content.EmbeddedBlocks, existing.Blocks, existing.EmbeddedBlocks)
	if !recordHasKey(record, "content_type") && !recordHasKey(record, "content_type_slug") && !recordHasKey(record, "content_type_id") {
		content.ContentType = existing.ContentType
		content.ContentTypeSlug = existing.ContentTypeSlug
	}
	mergeCMSMetadataUpdate(record, &content.Metadata, existing.Metadata)
	content.Data = mergeCMSDataUpdate(existing.Data, content.Data, cmsContentDataUpdated(record))
	content.Data, content.SchemaVersion, content.EmbeddedBlocks = finalizeCMSDataSchemaAndBlocks(record, content.Data, content.SchemaVersion, existing.SchemaVersion, content.EmbeddedBlocks)
	content.Data = pruneNilMapValues(content.Data)
	return content
}

func recordHasKey(record map[string]any, key string) bool {
	if record == nil {
		return false
	}
	_, ok := record[key]
	return ok
}

func cmsContentDataUpdated(record map[string]any) bool {
	if record == nil {
		return false
	}
	if _, ok := record["_schema"]; ok {
		return true
	}
	if _, ok := record["blocks"]; ok {
		return true
	}
	if _, ok := record["data"]; ok {
		return true
	}
	for key := range record {
		if _, skip := cmsContentReservedKeys[key]; skip {
			continue
		}
		if strings.HasPrefix(key, "_") {
			continue
		}
		return true
	}
	return false
}

func mergeAnyMap(base map[string]any, updates map[string]any) map[string]any {
	merged := map[string]any{}
	for key, val := range base {
		merged[key] = val
	}
	for key, val := range updates {
		merged[key] = val
	}
	return merged
}

func pruneNilMapValues(input map[string]any) map[string]any {
	if input == nil {
		return nil
	}
	clean := map[string]any{}
	for key, val := range input {
		if val == nil {
			continue
		}
		clean[key] = val
	}
	return clean
}

func mergeCMSRecordData(record map[string]any, data map[string]any, reserved map[string]struct{}) {
	if record == nil || len(data) == 0 {
		return
	}
	for key, val := range data {
		if _, skip := reserved[key]; skip {
			continue
		}
		if _, exists := record[key]; exists {
			continue
		}
		record[key] = val
	}
}

func schemaVersionFromRecord(record map[string]any, data map[string]any) string {
	if record != nil {
		if schema := strings.TrimSpace(toString(record["_schema"])); schema != "" {
			return schema
		}
	}
	if data != nil {
		if schema := strings.TrimSpace(toString(data["_schema"])); schema != "" {
			return schema
		}
	}
	return ""
}

func blocksPayloadFromContent(content CMSContent) any {
	if content.EmbeddedBlocks != nil {
		return cloneEmbeddedBlocks(content.EmbeddedBlocks)
	}
	if embedded, present := embeddedBlocksFromData(content.Data); present {
		return embedded
	}
	if content.Blocks != nil {
		return append([]string{}, content.Blocks...)
	}
	return nil
}

func blocksPayloadFromPage(page CMSPage) any {
	if page.EmbeddedBlocks != nil {
		return cloneEmbeddedBlocks(page.EmbeddedBlocks)
	}
	if embedded, present := embeddedBlocksFromData(page.Data); present {
		return embedded
	}
	if page.Blocks != nil {
		return append([]string{}, page.Blocks...)
	}
	return nil
}

func resolveCMSPagePath(page CMSPage) string {
	if page.Data != nil {
		if path := strings.TrimSpace(toString(page.Data["path"])); path != "" {
			return path
		}
	}
	if strings.TrimSpace(page.PreviewURL) != "" {
		return page.PreviewURL
	}
	return page.Slug
}

func mapToCMSContentType(record map[string]any) CMSContentType {
	ct := CMSContentType{}
	if record == nil {
		return ct
	}
	if id, ok := record["content_type_id"].(string); ok {
		ct.ID = id
	}
	if id, ok := record["type_id"].(string); ok && ct.ID == "" {
		ct.ID = id
	}
	if id, ok := record["id"].(string); ok && ct.ID == "" {
		ct.ID = id
	}
	if name, ok := record["name"].(string); ok {
		ct.Name = name
	}
	if slug, ok := record["slug"].(string); ok {
		ct.Slug = slug
	} else if slug, ok := record["content_type_slug"].(string); ok && ct.Slug == "" {
		ct.Slug = slug
	}
	if desc, ok := record["description"].(string); ok {
		ct.Description = desc
	}
	if _, ok := record["description"]; ok {
		ct.DescriptionSet = true
	}
	if icon, ok := record["icon"].(string); ok {
		ct.Icon = icon
	}
	if _, ok := record["icon"]; ok {
		ct.IconSet = true
	}
	if status, ok := record["status"].(string); ok {
		ct.Status = status
	}
	if raw, ok := record["allow_breaking_changes"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	} else if raw, ok := record["allow_breaking"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	} else if raw, ok := record["force"]; ok {
		ct.AllowBreakingChanges = toBool(raw)
	}
	if raw, ok := record["replace_capabilities"]; ok {
		ct.ReplaceCapabilities = toBool(raw)
	} else if raw, ok := record["replaceCapabilities"]; ok {
		ct.ReplaceCapabilities = toBool(raw)
	}
	if env, ok := record["environment"].(string); ok {
		ct.Environment = env
	} else if env, ok := record["env"].(string); ok && ct.Environment == "" {
		ct.Environment = env
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		ct.Schema = stripUnsupportedSchemaKeywords(cloneAnyMap(schema))
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.Schema = stripUnsupportedSchemaKeywords(m)
		}
	}
	if uiSchema, ok := record["ui_schema"].(map[string]any); ok {
		ct.UISchema = cloneAnyMap(uiSchema)
	} else if uiSchema, ok := record["uiSchema"].(map[string]any); ok && ct.UISchema == nil {
		ct.UISchema = cloneAnyMap(uiSchema)
	} else if raw, ok := record["ui_schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.UISchema = m
		}
	}
	if caps, ok := record["capabilities"].(map[string]any); ok {
		ct.Capabilities = cloneAnyMap(caps)
	} else if raw, ok := record["capabilities"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			ct.Capabilities = m
		}
	}
	return ct
}

func capabilitiesReplaceRequested(record map[string]any) bool {
	if record == nil {
		return false
	}
	if raw, ok := record["replace_capabilities"]; ok {
		return toBool(raw)
	}
	if raw, ok := record["replaceCapabilities"]; ok {
		return toBool(raw)
	}
	return false
}

func mergeCMSContentTypeSchema(base, incoming map[string]any) map[string]any {
	if incoming == nil {
		return base
	}
	if base == nil {
		return incoming
	}
	merged := cloneAnyMapDeep(incoming)
	mergeSchemaSection(merged, base, "$defs")
	mergeSchemaSection(merged, base, "metadata")
	return merged
}

func mergeSchemaSection(target, base map[string]any, key string) {
	if target == nil || base == nil {
		return
	}
	baseSection, ok := base[key].(map[string]any)
	if !ok || len(baseSection) == 0 {
		return
	}
	section, _ := target[key].(map[string]any)
	if section == nil {
		section = map[string]any{}
	}
	for k, v := range baseSection {
		if _, exists := section[k]; exists {
			continue
		}
		section[k] = cloneAnyValueDeep(v)
	}
	target[key] = section
}

func cloneAnyMapDeep(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = cloneAnyValueDeep(v)
	}
	return out
}

func cloneAnySliceDeep(in []any) []any {
	if in == nil {
		return nil
	}
	out := make([]any, len(in))
	for i, v := range in {
		out[i] = cloneAnyValueDeep(v)
	}
	return out
}

func cloneAnyValueDeep(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		return cloneAnyMapDeep(typed)
	case []any:
		return cloneAnySliceDeep(typed)
	default:
		return typed
	}
}

func mapToCMSBlockDefinition(record map[string]any) CMSBlockDefinition {
	def := CMSBlockDefinition{}
	if record == nil {
		return def
	}
	if id, ok := record["id"].(string); ok {
		def.ID = id
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if slug, ok := record["slug"].(string); ok {
		def.Slug = slug
	}
	if typ, ok := record["type"].(string); ok {
		def.Type = typ
	}
	if desc, ok := record["description"].(string); ok {
		def.Description = desc
	}
	if _, ok := record["description"]; ok {
		def.DescriptionSet = true
	}
	if icon, ok := record["icon"].(string); ok {
		def.Icon = icon
	}
	if _, ok := record["icon"]; ok {
		def.IconSet = true
	}
	if category, ok := record["category"].(string); ok {
		def.Category = category
	}
	if _, ok := record["category"]; ok {
		def.CategorySet = true
	}
	if status, ok := record["status"].(string); ok {
		def.Status = status
	}
	if env, ok := record["environment"].(string); ok {
		def.Environment = env
	} else if env, ok := record["env"].(string); ok && def.Environment == "" {
		def.Environment = env
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = cloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			def.Schema = m
		}
	}
	if uiSchema, ok := record["ui_schema"].(map[string]any); ok {
		def.UISchema = cloneAnyMap(uiSchema)
	} else if uiSchema, ok := record["uiSchema"].(map[string]any); ok && def.UISchema == nil {
		def.UISchema = cloneAnyMap(uiSchema)
	} else if raw, ok := record["ui_schema"].(string); ok && raw != "" {
		var m map[string]any
		if err := json.Unmarshal([]byte(raw), &m); err == nil {
			def.UISchema = m
		}
	}
	if version, ok := record["schema_version"].(string); ok {
		def.SchemaVersion = version
	}
	if status, ok := record["migration_status"].(string); ok {
		def.MigrationStatus = status
	}
	if locale, ok := record["locale"].(string); ok {
		def.Locale = locale
	}
	return def
}

func applyBlockDefinitionDefaults(def *CMSBlockDefinition) {
	if def == nil {
		return
	}
	if def.SchemaVersion == "" {
		def.SchemaVersion = strings.TrimSpace(schemaVersionFromSchema(def.Schema))
	}
	if def.MigrationStatus == "" {
		def.MigrationStatus = strings.TrimSpace(schemaMigrationStatusFromSchema(def.Schema))
	}
	if def.Status == "" {
		def.Status = strings.TrimSpace(schemaStatusFromSchema(def.Schema))
	}
	if def.Status == "" {
		def.Status = "draft"
	}
	if def.Category == "" && !def.CategorySet {
		def.Category = strings.TrimSpace(schemaCategoryFromSchema(def.Schema))
	}
	if def.Slug == "" {
		def.Slug = strings.TrimSpace(schemaSlugFromSchema(def.Schema))
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(schemaBlockTypeFromSchema(def.Schema))
	}
	if def.Slug == "" {
		if name := strings.TrimSpace(def.Name); name != "" {
			def.Slug = normalizeContentTypeSlug(name, def.Slug)
		}
	}
	if def.Slug == "" {
		def.Slug = strings.TrimSpace(firstNonEmpty(def.Type, def.Name, def.ID))
	}
	if def.Type == "" {
		def.Type = strings.TrimSpace(firstNonEmpty(def.Slug, def.Name, def.ID))
	}
}

func mapToCMSBlock(record map[string]any) CMSBlock {
	block := CMSBlock{
		Data: map[string]any{},
	}
	if record == nil {
		return block
	}
	if id, ok := record["id"].(string); ok {
		block.ID = id
	}
	if defID, ok := record["definition_id"].(string); ok {
		block.DefinitionID = defID
	}
	if contentID, ok := record["content_id"].(string); ok {
		block.ContentID = contentID
	}
	if region, ok := record["region"].(string); ok {
		block.Region = region
	}
	if locale, ok := record["locale"].(string); ok {
		block.Locale = locale
	}
	if status, ok := record["status"].(string); ok {
		block.Status = status
	}
	if pos, ok := record["position"].(int); ok {
		block.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		block.Position = int(posf)
	}
	if data, ok := record["data"].(map[string]any); ok {
		block.Data = cloneAnyMap(data)
	} else if raw, ok := record["data"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			block.Data = parsed
		}
	}
	if btype, ok := record["block_type"].(string); ok {
		block.BlockType = btype
	}
	if key, ok := record["block_schema_key"].(string); ok {
		block.BlockSchemaKey = key
	}
	return block
}

func mapToMenuItem(record map[string]any, defaultMenu string) (MenuItem, string) {
	item := MenuItem{}
	menuCode := defaultMenu
	if record == nil {
		return item, menuCode
	}
	if id, ok := record["id"].(string); ok {
		item.ID = id
	}
	if label, ok := record["label"].(string); ok {
		item.Label = label
	}
	if icon, ok := record["icon"].(string); ok {
		item.Icon = icon
	}
	if pos, ok := record["position"].(int); ok {
		item.Position = intPtr(pos)
	} else if posf, ok := record["position"].(float64); ok {
		item.Position = intPtr(int(posf))
	}
	if locale, ok := record["locale"].(string); ok {
		item.Locale = locale
	}
	if parent, ok := record["parent_id"].(string); ok {
		item.ParentID = parent
	}
	if badge, ok := record["badge"].(map[string]any); ok {
		item.Badge = cloneAnyMap(badge)
	}
	if perms, ok := record["permissions"].([]string); ok {
		item.Permissions = append([]string{}, perms...)
	} else if permsAny, ok := record["permissions"].([]any); ok {
		for _, p := range permsAny {
			if ps, ok := p.(string); ok {
				item.Permissions = append(item.Permissions, ps)
			}
		}
	}
	if classes, ok := record["classes"].([]string); ok {
		item.Classes = append([]string{}, classes...)
	} else if classesAny, ok := record["classes"].([]any); ok {
		for _, c := range classesAny {
			if cs, ok := c.(string); ok {
				item.Classes = append(item.Classes, cs)
			}
		}
	}
	if styles, ok := record["styles"].(map[string]string); ok {
		item.Styles = cloneStringMap(styles)
	} else if stylesAny, ok := record["styles"].(map[string]any); ok {
		item.Styles = map[string]string{}
		for k, v := range stylesAny {
			if vs, ok := v.(string); ok {
				item.Styles[k] = vs
			}
		}
	}
	if target, ok := record["target"].(map[string]any); ok {
		item.Target = cloneAnyMap(target)
	}
	if menu, ok := record["menu"].(string); ok && menu != "" {
		menuCode = menu
	}
	item.Menu = menuCode
	return item, menuCode
}

func mapToWidgetDefinition(record map[string]any) WidgetDefinition {
	def := WidgetDefinition{}
	if record == nil {
		return def
	}
	if code, ok := record["code"].(string); ok {
		def.Code = code
	}
	if name, ok := record["name"].(string); ok {
		def.Name = name
	}
	if schema, ok := record["schema"].(map[string]any); ok {
		def.Schema = cloneAnyMap(schema)
	} else if raw, ok := record["schema"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			def.Schema = parsed
		}
	}
	return def
}

func mapToWidgetInstance(record map[string]any) WidgetInstance {
	inst := WidgetInstance{Config: map[string]any{}}
	if record == nil {
		return inst
	}
	if id, ok := record["id"].(string); ok {
		inst.ID = id
	}
	if code, ok := record["definition_code"].(string); ok {
		inst.DefinitionCode = code
	}
	if area, ok := record["area"].(string); ok {
		inst.Area = area
	}
	if pageID, ok := record["page_id"].(string); ok {
		inst.PageID = pageID
	}
	if locale, ok := record["locale"].(string); ok {
		inst.Locale = locale
	}
	if pos, ok := record["position"].(int); ok {
		inst.Position = pos
	} else if posf, ok := record["position"].(float64); ok {
		inst.Position = int(posf)
	}
	if cfg, ok := record["config"].(map[string]any); ok {
		inst.Config = cloneAnyMap(cfg)
	} else if raw, ok := record["config"].(string); ok && raw != "" {
		var parsed map[string]any
		if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
			inst.Config = parsed
		}
	}
	return inst
}

func extractLocale(opts ListOptions, fallback string) string {
	if opts.Filters != nil {
		if loc, ok := opts.Filters["locale"].(string); ok && loc != "" {
			return loc
		}
		if loc, ok := opts.Filters["Locale"].(string); ok && loc != "" {
			return loc
		}
	}
	if fallback != "" {
		return fallback
	}
	return ""
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

func (r *CMSPageRepository) resolvePageLocale(ctx context.Context, id string) string {
	if r == nil || r.content == nil || strings.TrimSpace(id) == "" {
		return ""
	}
	pages, err := r.content.Pages(ctx, "")
	if err != nil {
		return ""
	}
	for _, page := range pages {
		if page.ID == id {
			return page.Locale
		}
	}
	return ""
}

func (r *CMSPageRepository) ensurePageTranslationIntent(ctx context.Context, id string, record map[string]any) error {
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
	missing, err := r.pageTranslationMissing(ctx, id, requested)
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

func (r *CMSPageRepository) pageTranslationMissing(ctx context.Context, id, requested string) (bool, error) {
	if strings.TrimSpace(requested) == "" {
		return false, nil
	}
	page, err := r.content.Page(ctx, id, requested)
	if err != nil {
		if IsTranslationMissing(err) {
			return true, nil
		}
		if errors.Is(err, ErrNotFound) {
			existing, err := r.content.Page(ctx, id, "")
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
	if page == nil {
		return false, ErrNotFound
	}
	if page.MissingRequestedLocale {
		return true, nil
	}
	if len(page.AvailableLocales) > 0 {
		found := false
		for _, loc := range page.AvailableLocales {
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

func extractSearch(opts ListOptions) string {
	if opts.Search != "" {
		return opts.Search
	}
	if opts.Filters != nil {
		if s, ok := opts.Filters["_search"].(string); ok {
			return s
		}
	}
	return ""
}

func paginateCMS[T any](items []T, opts ListOptions) ([]T, int) {
	total := len(items)
	pageNum := opts.Page
	if pageNum < 1 {
		pageNum = 1
	}
	per := opts.PerPage
	if per <= 0 {
		per = 10
	}
	start := (pageNum - 1) * per
	if start > total {
		return []T{}, total
	}
	end := start + per
	if end > total {
		end = total
	}
	return items[start:end], total
}

func paginateMenu(items []MenuItem, opts ListOptions) ([]MenuItem, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetDefs(items []WidgetDefinition, opts ListOptions) ([]WidgetDefinition, int) {
	return paginateCMS(items, opts)
}

func paginateWidgetInstances(items []WidgetInstance, opts ListOptions) ([]WidgetInstance, int) {
	return paginateCMS(items, opts)
}

func flattenMenuItems(items []MenuItem, parent string) []MenuItem {
	out := []MenuItem{}
	for _, item := range items {
		item.ParentID = parent
		out = append(out, item)
		if len(item.Children) > 0 {
			out = append(out, flattenMenuItems(item.Children, item.ID)...)
		}
	}
	return out
}

func stringFromFilter(filters map[string]any, key string) string {
	if filters == nil {
		return ""
	}
	if v, ok := filters[key].(string); ok {
		return v
	}
	return ""
}

func cloneAnyMap(in map[string]any) map[string]any {
	if in == nil {
		return nil
	}
	out := make(map[string]any, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
