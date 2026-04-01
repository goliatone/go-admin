package cmsadapter

import (
	"strings"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	"github.com/goliatone/go-admin/internal/primitives"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

// AdminBlockRecordToCMSBlock maps the upstream admin block DTO onto the local CMSBlock contract.
func AdminBlockRecordToCMSBlock(record cms.AdminBlockRecord) cmsboot.CMSBlock {
	return cmsboot.CMSBlock{
		ID:             nonNilUUIDString(record.ID),
		DefinitionID:   nonNilUUIDString(record.DefinitionID),
		ContentID:      nonNilUUIDString(record.ContentID),
		Region:         strings.TrimSpace(record.Region),
		Locale:         strings.TrimSpace(record.Locale),
		Status:         strings.TrimSpace(record.Status),
		Data:           primitives.CloneAnyMap(record.Data),
		Position:       record.Position,
		BlockType:      strings.TrimSpace(record.BlockType),
		BlockSchemaKey: strings.TrimSpace(record.BlockSchemaKey),
	}
}

// AdminBlockDefinitionRecordToCMSBlockDefinition maps the upstream admin definition DTO
// onto the local CMSBlockDefinition contract.
func AdminBlockDefinitionRecordToCMSBlockDefinition(record cms.AdminBlockDefinitionRecord) cmsboot.CMSBlockDefinition {
	out := cmsboot.CMSBlockDefinition{
		ID:              strings.TrimSpace(primitives.FirstNonEmptyRaw(nonNilUUIDString(record.ID), record.Slug, record.Type, record.Name)),
		Name:            strings.TrimSpace(record.Name),
		Slug:            strings.TrimSpace(record.Slug),
		Type:            strings.TrimSpace(record.Type),
		Category:        strings.TrimSpace(record.Category),
		Status:          strings.TrimSpace(record.Status),
		Schema:          primitives.CloneAnyMap(record.Schema),
		UISchema:        primitives.CloneAnyMap(record.UISchema),
		SchemaVersion:   strings.TrimSpace(record.SchemaVersion),
		MigrationStatus: strings.TrimSpace(record.MigrationStatus),
		Locale:          strings.TrimSpace(record.Locale),
	}
	if record.Description != nil {
		out.Description = strings.TrimSpace(*record.Description)
		out.DescriptionSet = true
	}
	if record.Icon != nil {
		out.Icon = strings.TrimSpace(*record.Icon)
		out.IconSet = true
	}
	if strings.TrimSpace(record.Category) != "" {
		out.CategorySet = true
	}
	SetBlockDefinitionChannel(&out, strings.TrimSpace(record.Channel))
	if out.Type == "" {
		out.Type = strings.TrimSpace(primitives.FirstNonEmptyRaw(out.Slug, out.Name, out.ID))
	}
	if out.SchemaVersion == "" {
		out.SchemaVersion = schemaVersionFromSchema(out.Schema)
	}
	if out.MigrationStatus == "" {
		out.MigrationStatus = schemaMigrationStatusFromSchema(out.Schema)
	}
	return out
}

// AdminBlockDefinitionVersionRecordToCMSBlockDefinitionVersion maps the upstream admin
// definition-version DTO onto the local CMSBlockDefinitionVersion contract.
func AdminBlockDefinitionVersionRecordToCMSBlockDefinitionVersion(record cms.AdminBlockDefinitionVersionRecord) cmsboot.CMSBlockDefinitionVersion {
	return cmsboot.CMSBlockDefinitionVersion{
		ID:              nonNilUUIDString(record.ID),
		DefinitionID:    nonNilUUIDString(record.DefinitionID),
		SchemaVersion:   strings.TrimSpace(record.SchemaVersion),
		Schema:          primitives.CloneAnyMap(record.Schema),
		Defaults:        primitives.CloneAnyMap(record.Defaults),
		MigrationStatus: strings.TrimSpace(record.MigrationStatus),
		CreatedAt:       cloneTimeValue(record.CreatedAt),
		UpdatedAt:       cloneTimeValue(record.UpdatedAt),
	}
}

// CMSBlockDefinitionToAdminBlockDefinitionCreateRequest maps the local block definition
// onto the upstream admin write-service create request.
func CMSBlockDefinitionToAdminBlockDefinitionCreateRequest(def cmsboot.CMSBlockDefinition, envKey string) cms.AdminBlockDefinitionCreateRequest {
	req := cms.AdminBlockDefinitionCreateRequest{
		Name:           strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Name, def.ID)),
		Slug:           strings.TrimSpace(def.Slug),
		Type:           strings.TrimSpace(def.Type),
		Category:       optionalAdminBlockString(def.Category, def.CategorySet),
		Status:         strings.TrimSpace(def.Status),
		Schema:         primitives.CloneAnyMap(def.Schema),
		UISchema:       primitives.CloneAnyMap(def.UISchema),
		EnvironmentKey: strings.TrimSpace(envKey),
	}
	if req.Slug == "" {
		req.Slug = strings.TrimSpace(primitives.FirstNonEmptyRaw(def.Type, def.Name))
	}
	req.Description = optionalAdminBlockString(def.Description, def.DescriptionSet)
	req.Icon = optionalAdminBlockString(def.Icon, def.IconSet)
	return req
}

// CMSBlockDefinitionToAdminBlockDefinitionUpdateRequest maps the local block definition
// onto the upstream admin write-service update request.
func CMSBlockDefinitionToAdminBlockDefinitionUpdateRequest(def cmsboot.CMSBlockDefinition, id uuid.UUID, envKey string) cms.AdminBlockDefinitionUpdateRequest {
	req := cms.AdminBlockDefinitionUpdateRequest{
		ID:             id,
		Schema:         primitives.CloneAnyMap(def.Schema),
		UISchema:       primitives.CloneAnyMap(def.UISchema),
		EnvironmentKey: strings.TrimSpace(envKey),
	}
	if name := strings.TrimSpace(def.Name); name != "" {
		req.Name = &name
	}
	if slug := strings.TrimSpace(def.Slug); slug != "" {
		req.Slug = &slug
	}
	if typ := strings.TrimSpace(def.Type); typ != "" {
		req.Type = &typ
	}
	req.Description = optionalAdminBlockString(def.Description, def.DescriptionSet)
	req.Icon = optionalAdminBlockString(def.Icon, def.IconSet)
	req.Category = optionalAdminBlockString(def.Category, def.CategorySet)
	if status := strings.TrimSpace(def.Status); status != "" {
		req.Status = &status
	}
	return req
}

// CMSBlockToAdminBlockSaveRequest maps the local CMSBlock contract onto the upstream
// admin block write-service save request.
func CMSBlockToAdminBlockSaveRequest(block cmsboot.CMSBlock, definitionID, contentID, createdBy, updatedBy uuid.UUID) cms.AdminBlockSaveRequest {
	return cms.AdminBlockSaveRequest{
		ID:             UUIDFromString(block.ID),
		DefinitionID:   definitionID,
		ContentID:      contentID,
		Region:         strings.TrimSpace(block.Region),
		Locale:         strings.TrimSpace(block.Locale),
		Status:         strings.TrimSpace(block.Status),
		Data:           primitives.CloneAnyMap(block.Data),
		Position:       block.Position,
		BlockType:      strings.TrimSpace(block.BlockType),
		BlockSchemaKey: strings.TrimSpace(block.BlockSchemaKey),
		CreatedBy:      createdBy,
		UpdatedBy:      updatedBy,
	}
}

func optionalAdminBlockString(value string, wasSet bool) *string {
	if wasSet {
		copy := strings.TrimSpace(value)
		return &copy
	}
	if trimmed := strings.TrimSpace(value); trimmed != "" {
		return &trimmed
	}
	return nil
}
