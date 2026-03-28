package admin

import (
	"strings"

	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
)

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

	if record.FamilyID != nil {
		out.FamilyID = record.FamilyID.String()
	}
	if record.ParentID != nil {
		out.ParentID = record.ParentID.String()
	}
	return out
}
