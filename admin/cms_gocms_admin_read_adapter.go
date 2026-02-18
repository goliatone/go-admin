package admin

import (
	"context"
	"github.com/goliatone/go-admin/internal/primitives"
	"strings"

	cms "github.com/goliatone/go-cms"
)

// goCMSAdminPageReadAdapter bridges go-cms admin read services into go-admin contracts.
type goCMSAdminPageReadAdapter struct {
	service cms.AdminPageReadService
}

// NewGoCMSAdminPageReadAdapter wraps a go-cms admin read service.
func NewGoCMSAdminPageReadAdapter(service cms.AdminPageReadService) AdminPageReadService {
	if service == nil {
		return nil
	}
	return goCMSAdminPageReadAdapter{service: service}
}

func (a goCMSAdminPageReadAdapter) List(ctx context.Context, opts AdminPageListOptions) ([]AdminPageRecord, int, error) {
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

func mapCMSAdminPageRecord(record cms.AdminPageRecord) AdminPageRecord {
	out := AdminPageRecord{
		ID:                 uuidString(record.ID),
		ContentID:          uuidString(record.ContentID),
		TemplateID:         uuidString(record.TemplateID),
		Title:              strings.TrimSpace(record.Title),
		Slug:               strings.TrimSpace(record.Slug),
		Path:               strings.TrimSpace(record.Path),
		RequestedLocale:    strings.TrimSpace(record.RequestedLocale),
		ResolvedLocale:     strings.TrimSpace(record.ResolvedLocale),
		Translation:        record.Translation,
		ContentTranslation: record.ContentTranslation,
		Status:             strings.TrimSpace(record.Status),
		MetaTitle:          strings.TrimSpace(record.MetaTitle),
		MetaDescription:    strings.TrimSpace(record.MetaDescription),
		Summary:            record.Summary,
		Tags:               append([]string{}, record.Tags...),
		SchemaVersion:      strings.TrimSpace(record.SchemaVersion),
		Data:               primitives.CloneAnyMap(record.Data),
		Content:            record.Content,
		Blocks:             record.Blocks,
		PreviewURL:         strings.TrimSpace(record.PreviewURL),
		PublishedAt:        record.PublishedAt,
		CreatedAt:          record.CreatedAt,
		UpdatedAt:          record.UpdatedAt,
	}

	if record.TranslationGroupID != nil {
		out.TranslationGroupID = record.TranslationGroupID.String()
	}
	if record.ParentID != nil {
		out.ParentID = record.ParentID.String()
	}
	return out
}
