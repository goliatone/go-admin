package admin

import (
	"context"
	"errors"
	"github.com/goliatone/go-admin/internal/primitives"
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
	records := make([]map[string]any, 0, len(pages))
	for _, page := range pages {
		records = append(records, cmsPageRecord(page, cmsPageRecordOptions{
			includeTemplateID: true,
		}))
	}
	listOpts := opts
	if strings.TrimSpace(listOpts.SortBy) == "" {
		listOpts.SortBy = "id"
	}
	list, total := applyListOptionsToRecordMaps(records, listOpts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsPageRecordSearchMatcher,
	})
	return list, total, nil
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
	schema := strings.TrimSpace(primitives.FirstNonEmptyRaw(page.SchemaVersion, toString(page.Data["_schema"])))
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
		"seo":                      primitives.CloneAnyMap(page.SEO),
		"status":                   page.Status,
		"data":                     primitives.CloneAnyMap(page.Data),
		"metadata":                 primitives.CloneAnyMap(page.Metadata),
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
