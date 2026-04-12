package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
)

// goCMSAdminPageReadAdapter bridges go-cms admin read services into go-admin contracts.
type goCMSAdminPageReadAdapter struct {
	service cms.AdminPageReadService
	content CMSContentService
}

// NewGoCMSAdminPageReadAdapter wraps a go-cms admin read service.
func NewGoCMSAdminPageReadAdapter(service cms.AdminPageReadService) AdminPageReadService {
	return NewGoCMSAdminPageReadAdapterWithContent(service, nil)
}

// NewGoCMSAdminPageReadAdapterWithContent wraps a go-cms admin read service and optional
// CMS content service. When sibling-expanded translation families are requested, the
// content service is used to emit one page record per locale sibling.
func NewGoCMSAdminPageReadAdapterWithContent(service cms.AdminPageReadService, content CMSContentService) AdminPageReadService {
	if service == nil {
		return nil
	}
	return goCMSAdminPageReadAdapter{service: service, content: content}
}

func (a goCMSAdminPageReadAdapter) List(ctx context.Context, opts AdminPageListOptions) ([]AdminPageRecord, int, error) {
	if opts.ExpandTranslationFamilies && a.content != nil {
		return a.listExpandedTranslationFamilies(ctx, opts)
	}
	if a.service == nil {
		return nil, 0, ErrNotFound
	}
	cmsOpts := cms.AdminPageListOptions{
		Locale:                   opts.Locale,
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: true,
		IncludeContent:           opts.IncludeContent,
		IncludeBlocks:            opts.IncludeBlocks,
		IncludeData:              opts.IncludeData,
		EnvironmentKey:           opts.EnvironmentKey,
		Page:                     opts.Page,
		PerPage:                  opts.PerPage,
		SortBy:                   opts.SortBy,
		SortDesc:                 opts.SortDesc,
		Search:                   opts.Search,
		Filters:                  primitives.CloneAnyMap(opts.Filters),
	}
	if !cmsOpts.AllowMissingTranslations {
		cmsOpts.AllowMissingTranslations = true
	}
	forceData := !cmsOpts.IncludeData
	if forceData {
		cmsOpts.IncludeData = true
	}
	records, total, err := a.service.List(ctx, cmsOpts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]AdminPageRecord, 0, len(records))
	for _, record := range records {
		mapped := mapCMSAdminPageRecord(record)
		if forceData {
			mapped.Data = nil
		}
		out = append(out, mapped)
	}
	return out, total, nil
}

func (a goCMSAdminPageReadAdapter) listExpandedTranslationFamilies(ctx context.Context, opts AdminPageListOptions) ([]AdminPageRecord, int, error) {
	repo := NewCMSPageRepository(a.content)
	listOpts := ListOptions{
		Page:     opts.Page,
		PerPage:  opts.PerPage,
		SortBy:   opts.SortBy,
		SortDesc: opts.SortDesc,
		Search:   opts.Search,
		Filters:  primitives.CloneAnyMap(opts.Filters),
	}
	if listOpts.Filters == nil {
		listOpts.Filters = map[string]any{}
	}
	if strings.TrimSpace(opts.Locale) != "" {
		listOpts.Filters["locale"] = opts.Locale
	}
	rows, total, err := repo.List(ctx, listOpts)
	if err != nil {
		return nil, 0, err
	}
	out := make([]AdminPageRecord, 0, len(rows))
	for _, row := range rows {
		out = append(out, adminPageRecordFromMap(row, opts.IncludeData))
	}
	return out, total, nil
}

func (a goCMSAdminPageReadAdapter) Get(ctx context.Context, id string, opts AdminPageGetOptions) (*AdminPageRecord, error) {
	if a.service == nil {
		return nil, ErrNotFound
	}
	cmsOpts := cms.AdminPageGetOptions{
		Locale:                   opts.Locale,
		FallbackLocale:           opts.FallbackLocale,
		AllowMissingTranslations: true,
		IncludeContent:           opts.IncludeContent,
		IncludeBlocks:            opts.IncludeBlocks,
		IncludeData:              opts.IncludeData,
		EnvironmentKey:           opts.EnvironmentKey,
	}
	if !cmsOpts.AllowMissingTranslations {
		cmsOpts.AllowMissingTranslations = true
	}
	forceData := !cmsOpts.IncludeData
	if forceData {
		cmsOpts.IncludeData = true
	}
	record, err := a.service.Get(ctx, strings.TrimSpace(id), cmsOpts)
	if err != nil {
		return nil, err
	}
	if record == nil {
		return nil, ErrNotFound
	}
	mapped := mapCMSAdminPageRecord(*record)
	if forceData {
		mapped.Data = nil
	}
	return &mapped, nil
}

func adminPageRecordFromMap(record map[string]any, includeData bool) AdminPageRecord {
	page := mapToCMSPage(record)
	page = normalizeCMSPageLocaleState(page, toString(record["requested_locale"]))
	data := primitives.CloneAnyMap(page.Data)
	if !includeData {
		data = nil
	}
	path := resolveCMSPagePath(page)
	meta := TranslationMeta{
		RequestedLocale:        page.RequestedLocale,
		ResolvedLocale:         page.ResolvedLocale,
		AvailableLocales:       append([]string{}, page.AvailableLocales...),
		MissingRequestedLocale: page.MissingRequestedLocale,
		FallbackUsed:           page.RequestedLocale != "" && !isTranslationLocaleWildcard(page.RequestedLocale) && !strings.EqualFold(page.RequestedLocale, page.ResolvedLocale),
		PrimaryLocale:          strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["primary_locale"]), firstNonEmptyString(page.AvailableLocales...))),
	}
	pageTranslation := PageTranslation{
		Locale:  page.Locale,
		Title:   page.Title,
		Path:    path,
		Summary: stringPtr(toString(record["summary"])),
		Fields: map[string]any{
			"meta_title":       toString(record["meta_title"]),
			"meta_description": toString(record["meta_description"]),
		},
	}
	contentTranslation := ContentTranslation{
		Locale:  page.Locale,
		Title:   page.Title,
		Summary: stringPtr(toString(record["summary"])),
		Fields:  primitives.CloneAnyMap(page.Data),
	}
	out := AdminPageRecord{
		ID:              page.ID,
		ContentID:       strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["content_id"]), page.ID)),
		FamilyID:        page.FamilyID,
		RouteKey:        page.RouteKey,
		TemplateID:      page.TemplateID,
		Title:           page.Title,
		Slug:            page.Slug,
		Path:            path,
		RequestedLocale: page.RequestedLocale,
		ResolvedLocale:  page.ResolvedLocale,
		Translation: TranslationBundle[PageTranslation]{
			Meta:     meta,
			Resolved: &pageTranslation,
		},
		ContentTranslation: TranslationBundle[ContentTranslation]{
			Meta:     meta,
			Resolved: &contentTranslation,
		},
		Status:          strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["status"]), page.Status)),
		ParentID:        page.ParentID,
		MetaTitle:       toString(record["meta_title"]),
		MetaDescription: toString(record["meta_description"]),
		Summary:         stringPtr(toString(record["summary"])),
		SchemaVersion:   strings.TrimSpace(primitives.FirstNonEmptyRaw(toString(record["schema_version"]), page.SchemaVersion)),
		Data:            data,
		PreviewURL:      toString(record["preview_url"]),
	}
	if out.PreviewURL == "" {
		out.PreviewURL = path
	}
	return out
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func stringPtr(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
