package cmsadapter

import (
	"strings"
	"time"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func AdminContentRecordToCMSContent(record cms.AdminContentRecord) cmsboot.CMSContent {
	data := primitives.CloneAnyMap(record.Data)
	if data == nil {
		data = map[string]any{}
	}
	if schema := strings.TrimSpace(record.SchemaVersion); schema != "" {
		data["_schema"] = schema
	}
	if len(record.Navigation) > 0 {
		data["_navigation"] = stringMapAny(record.Navigation)
	}
	if len(record.EffectiveMenuLocations) > 0 {
		data["effective_menu_locations"] = cloneStringSlice(record.EffectiveMenuLocations)
	}
	if len(record.EmbeddedBlocks) > 0 {
		data["blocks"] = cloneAnyMapSlice(record.EmbeddedBlocks)
	} else if len(record.Blocks) > 0 {
		data["blocks"] = cloneStringSlice(record.Blocks)
	}

	out := cmsboot.CMSContent{
		ID:                     nonNilUUIDString(record.ID),
		Title:                  strings.TrimSpace(record.Title),
		Slug:                   strings.TrimSpace(record.Slug),
		Locale:                 strings.TrimSpace(record.Locale),
		RequestedLocale:        strings.TrimSpace(record.RequestedLocale),
		ResolvedLocale:         strings.TrimSpace(record.ResolvedLocale),
		AvailableLocales:       cloneStringSlice(record.AvailableLocales),
		MissingRequestedLocale: record.MissingRequestedLocale,
		Navigation:             cloneStringMap(record.Navigation),
		EffectiveMenuLocations: cloneStringSlice(record.EffectiveMenuLocations),
		ContentType: strings.TrimSpace(primitives.FirstNonEmptyRaw(
			record.ContentType,
			record.ContentTypeSlug,
		)),
		ContentTypeSlug: strings.TrimSpace(record.ContentTypeSlug),
		Status:          strings.TrimSpace(record.Status),
		Blocks:          cloneStringSlice(record.Blocks),
		EmbeddedBlocks:  cloneAnyMapSlice(record.EmbeddedBlocks),
		SchemaVersion:   strings.TrimSpace(record.SchemaVersion),
		Data:            data,
		Metadata:        primitives.CloneAnyMap(record.Metadata),
	}
	if record.FamilyID != nil && *record.FamilyID != uuid.Nil {
		out.FamilyID = record.FamilyID.String()
	}
	return out
}

func CMSContentToAdminContentCreateRequest(content cmsboot.CMSContent, contentTypeID, actor uuid.UUID, allowMissing bool) cms.AdminContentCreateRequest {
	return cms.AdminContentCreateRequest{
		ContentTypeID:            contentTypeID,
		ContentType:              strings.TrimSpace(content.ContentType),
		ContentTypeSlug:          strings.TrimSpace(content.ContentTypeSlug),
		Title:                    strings.TrimSpace(content.Title),
		Slug:                     strings.TrimSpace(content.Slug),
		Locale:                   strings.TrimSpace(content.Locale),
		FamilyID:                 uuidPointer(content.FamilyID),
		Status:                   strings.TrimSpace(content.Status),
		Navigation:               cloneStringMap(content.Navigation),
		EffectiveMenuLocations:   cloneStringSlice(content.EffectiveMenuLocations),
		Blocks:                   cloneStringSlice(content.Blocks),
		EmbeddedBlocks:           cloneAnyMapSlice(content.EmbeddedBlocks),
		SchemaVersion:            strings.TrimSpace(content.SchemaVersion),
		Data:                     primitives.CloneAnyMap(content.Data),
		Metadata:                 primitives.CloneAnyMap(content.Metadata),
		CreatedBy:                actor,
		UpdatedBy:                actor,
		AllowMissingTranslations: allowMissing,
	}
}

func CMSContentToAdminContentUpdateRequest(content cmsboot.CMSContent, contentTypeID, actor uuid.UUID, allowMissing bool) cms.AdminContentUpdateRequest {
	return cms.AdminContentUpdateRequest{
		ID:                       uuidFromString(content.ID),
		ContentTypeID:            contentTypeID,
		ContentType:              strings.TrimSpace(content.ContentType),
		ContentTypeSlug:          strings.TrimSpace(content.ContentTypeSlug),
		Title:                    strings.TrimSpace(content.Title),
		Slug:                     strings.TrimSpace(content.Slug),
		Locale:                   strings.TrimSpace(content.Locale),
		FamilyID:                 uuidPointer(content.FamilyID),
		Status:                   strings.TrimSpace(content.Status),
		Navigation:               cloneStringMap(content.Navigation),
		EffectiveMenuLocations:   cloneStringSlice(content.EffectiveMenuLocations),
		Blocks:                   cloneStringSlice(content.Blocks),
		EmbeddedBlocks:           cloneAnyMapSlice(content.EmbeddedBlocks),
		SchemaVersion:            strings.TrimSpace(content.SchemaVersion),
		Data:                     primitives.CloneAnyMap(content.Data),
		Metadata:                 primitives.CloneAnyMap(content.Metadata),
		UpdatedBy:                actor,
		AllowMissingTranslations: allowMissing,
	}
}

func stringMapAny(value map[string]string) map[string]any {
	if len(value) == 0 {
		return nil
	}
	out := make(map[string]any, len(value))
	for key, item := range value {
		out[key] = item
	}
	return out
}

func cloneStringMap(value map[string]string) map[string]string {
	if len(value) == 0 {
		return nil
	}
	out := make(map[string]string, len(value))
	for key, item := range value {
		out[key] = item
	}
	return out
}

func cloneStringSlice(value []string) []string {
	if len(value) == 0 {
		return nil
	}
	return append([]string{}, value...)
}

func cloneAnyMapSlice(value []map[string]any) []map[string]any {
	if len(value) == 0 {
		return nil
	}
	out := make([]map[string]any, 0, len(value))
	for _, item := range value {
		out = append(out, primitives.CloneAnyMap(item))
	}
	return out
}

func nonNilUUIDString(value uuid.UUID) string {
	if value == uuid.Nil {
		return ""
	}
	return value.String()
}

func uuidPointer(raw string) *uuid.UUID {
	value := uuidFromString(raw)
	if value == uuid.Nil {
		return nil
	}
	copy := value
	return &copy
}

func uuidFromString(value string) uuid.UUID {
	parsed, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return uuid.Nil
	}
	return parsed
}

func cloneTimeValue(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}
