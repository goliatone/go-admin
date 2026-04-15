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
	locale := normalizeCMSRequestedListLocale(resolveListRequestedLocale(ctx, opts, ""))
	pages, err := r.listPages(ctx, locale, opts)
	if err != nil {
		return nil, 0, err
	}
	records := make([]map[string]any, 0, len(pages))
	for _, page := range pages {
		normalized := normalizeCMSPageLocaleState(page, locale)
		records = append(records, cmsPageRecord(normalized, cmsPageRecordOptions{
			includeTemplateID: true,
		}))
	}
	listOpts := opts
	if strings.TrimSpace(listOpts.SortBy) == "" {
		listOpts.SortBy = "id"
	}
	listOpts = normalizeListOptionsForTranslationWildcard(listOpts)
	list, total := applyListOptionsToRecordMaps(records, listOpts, listRecordOptions{
		PredicateMatcher: cmsContentRecordPredicateMatcher,
		SearchMatcher:    cmsPageRecordSearchMatcher,
	})
	return list, total, nil
}

func (r *CMSPageRepository) listPages(ctx context.Context, locale string, opts ListOptions) ([]CMSPage, error) {
	if r == nil || r.content == nil {
		return nil, ErrNotFound
	}
	if svc, ok := resolveCMSPageListOptionsService(r.content); ok && svc != nil {
		listOpts := []CMSContentListOption{WithTranslations(), WithDerivedFields()}
		if shouldExpandTranslationFamilyRowsForContext(ctx, opts) {
			listOpts = append(listOpts, WithLocaleVariants())
		}
		return svc.PagesWithOptions(ctx, locale, listOpts...)
	}
	return r.content.Pages(ctx, locale)
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
	if page == nil {
		return nil, ErrNotFound
	}
	requested := strings.TrimSpace(primitives.FirstNonEmptyRaw(localeFromContext(ctx), page.RequestedLocale))
	normalized := normalizeCMSPageLocaleState(*page, requested)
	if requested != "" && normalized.MissingRequestedLocale && !localeFallbackAllowed(ctx) {
		return nil, translationMissingNotFoundError(requested, normalized.AvailableLocales, map[string]any{
			"entity":     "page",
			"id":         normalized.ID,
			"slug":       normalized.Slug,
			"path":       resolveCMSPagePath(normalized),
			"locale":     normalized.Locale,
			"content_id": normalized.ID,
		})
	}
	return cmsPageRecord(normalized, cmsPageRecordOptions{
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
	if err := r.ensureUniqueLocalizedPath(ctx, page, ""); err != nil {
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
	page.Locale = r.resolveUpdatePageLocale(ctx, id, page.Locale)
	existing := r.resolveExistingPageForUpdate(ctx, id, &page)
	if existing != nil {
		page = mergeCMSPageUpdate(*existing, page, record)
	}
	if err := r.ensureUniqueSlug(ctx, page.Slug, id, page.Locale); err != nil {
		return nil, err
	}
	if err := r.ensureUniqueLocalizedPath(ctx, page, id); err != nil {
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

func (r *CMSPageRepository) resolveUpdatePageLocale(ctx context.Context, id, locale string) string {
	locale = strings.TrimSpace(locale)
	if locale != "" {
		return locale
	}
	if resolved := localeFromContext(ctx); resolved != "" {
		locale = resolved
	}
	if resolved := r.resolvePageLocale(ctx, id); resolved != "" {
		locale = resolved
	}
	return locale
}

func (r *CMSPageRepository) resolveExistingPageForUpdate(ctx context.Context, id string, page *CMSPage) *CMSPage {
	if r == nil || r.content == nil || page == nil {
		return nil
	}
	if current := r.lookupPageForUpdate(ctx, id, page.Locale); current != nil {
		return current
	}
	fallbackLocale := r.resolvePageLocale(ctx, id)
	if fallbackLocale == "" || strings.EqualFold(fallbackLocale, page.Locale) {
		return nil
	}
	page.Locale = fallbackLocale
	return r.lookupPageForUpdate(ctx, id, fallbackLocale)
}

func (r *CMSPageRepository) lookupPageForUpdate(ctx context.Context, id, locale string) *CMSPage {
	if strings.TrimSpace(locale) == "" {
		return nil
	}
	current, err := r.content.Page(ctx, id, locale)
	if err != nil {
		return nil
	}
	return current
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

func (r *CMSPageRepository) ensureUniqueLocalizedPath(ctx context.Context, page CMSPage, skipID string) error {
	if r == nil || r.content == nil {
		return ErrNotFound
	}
	path := normalizeCMSLocalizedPath(resolveCMSPagePath(page))
	if path == "" {
		return nil
	}
	pages, err := r.content.Pages(ctx, page.Locale)
	if err != nil {
		return err
	}
	for _, candidate := range pages {
		if strings.TrimSpace(candidate.ID) == strings.TrimSpace(skipID) {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(candidate.Locale), strings.TrimSpace(page.Locale)) {
			continue
		}
		candidatePath := normalizeCMSLocalizedPath(resolveCMSPagePath(candidate))
		if candidatePath == "" || candidatePath != path {
			continue
		}
		return pathConflictDomainError(map[string]any{
			"path":      path,
			"skip_id":   skipID,
			"candidate": candidate.ID,
			"locale":    page.Locale,
			"scope":     "page",
		})
	}
	return nil
}

type cmsPageRecordOptions struct {
	includeTemplateID bool
}

func cmsPageRecord(page CMSPage, opts cmsPageRecordOptions) map[string]any {
	page = normalizeCMSPageLocaleState(page, page.RequestedLocale)
	path := resolveCMSPagePath(page)
	schema := strings.TrimSpace(primitives.FirstNonEmptyRaw(page.SchemaVersion, toString(page.Data["_schema"])))
	navigation := page.Navigation
	if len(navigation) == 0 {
		navigation = normalizeNavigationVisibilityMap(page.Data["_navigation"])
	}
	effectiveLocations := page.EffectiveMenuLocations
	if len(effectiveLocations) == 0 {
		effectiveLocations = normalizeEffectiveMenuLocations(page.Data["effective_menu_locations"])
	}
	effectiveVisibility := normalizeNavigationVisibilityBoolMap(page.Data["effective_navigation_visibility"])
	if len(effectiveVisibility) == 0 {
		effectiveVisibility = inferEffectiveNavigationVisibility(navigation, effectiveLocations)
	}
	record := map[string]any{
		"id":                              page.ID,
		"title":                           page.Title,
		"slug":                            page.Slug,
		"path":                            path,
		"route_key":                       strings.TrimSpace(page.RouteKey),
		"locale":                          page.Locale,
		"family_id":                       page.FamilyID,
		"requested_locale":                page.RequestedLocale,
		"resolved_locale":                 page.ResolvedLocale,
		"available_locales":               append([]string{}, page.AvailableLocales...),
		"missing_requested_locale":        page.MissingRequestedLocale,
		"parent_id":                       page.ParentID,
		"blocks":                          blocksPayloadFromPage(page),
		"seo":                             primitives.CloneAnyMap(page.SEO),
		"status":                          page.Status,
		"data":                            primitives.CloneAnyMap(page.Data),
		"metadata":                        primitives.CloneAnyMap(page.Metadata),
		"preview_url":                     page.PreviewURL,
		"_navigation":                     navigationVisibilityMapAny(navigation),
		"effective_menu_locations":        append([]string{}, effectiveLocations...),
		"effective_navigation_visibility": navigationVisibilityBoolMapAny(effectiveVisibility),
	}
	if opts.includeTemplateID {
		record["template_id"] = page.TemplateID
	}
	if schema != "" {
		record["_schema"] = schema
	}
	return record
}

func normalizeCMSPageLocaleState(page CMSPage, requested string) CMSPage {
	state := normalizeCMSLocaleState(localeState{
		requested: page.RequestedLocale,
		resolved:  page.ResolvedLocale,
		locale:    page.Locale,
		available: page.AvailableLocales,
		missing:   page.MissingRequestedLocale,
	}, requested)
	page.RequestedLocale = state.requested
	page.ResolvedLocale = state.resolved
	page.AvailableLocales = state.available
	page.MissingRequestedLocale = state.missing
	return page
}

type localeState struct {
	requested string
	resolved  string
	locale    string
	available []string
	missing   bool
}

func normalizeCMSLocaleState(state localeState, requested string) localeState {
	state.requested = strings.TrimSpace(primitives.FirstNonEmptyRaw(requested, state.requested, state.locale))
	state.resolved = strings.TrimSpace(primitives.FirstNonEmptyRaw(state.resolved, state.locale))
	if state.resolved == "" {
		state.resolved = state.requested
	}
	state.available = append([]string{}, state.available...)
	if len(state.available) == 0 && strings.TrimSpace(state.locale) != "" {
		state.available = []string{state.locale}
	}
	state.available = dedupeStrings(state.available)
	if state.requested != "" && !isTranslationLocaleWildcard(state.requested) && len(state.available) > 0 && !containsStringInsensitive(state.available, state.requested) {
		state.missing = true
	}
	return state
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
		return r.pageTranslationMissingFromLookupError(ctx, id, err)
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

func (r *CMSPageRepository) pageTranslationMissingFromLookupError(ctx context.Context, id string, err error) (bool, error) {
	if IsTranslationMissing(err) {
		return true, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return false, err
	}
	existing, lookupErr := r.content.Page(ctx, id, "")
	if lookupErr == nil && existing != nil {
		return true, nil
	}
	if lookupErr != nil && !errors.Is(lookupErr, ErrNotFound) {
		return false, lookupErr
	}
	return false, ErrNotFound
}
