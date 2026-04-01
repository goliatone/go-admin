package cmsadapter

import (
	"testing"
	"time"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func TestAdminBlockRecordToCMSBlockPreservesFields(t *testing.T) {
	record := cms.AdminBlockRecord{
		ID:             uuid.New(),
		DefinitionID:   uuid.New(),
		ContentID:      uuid.New(),
		Region:         "main",
		Locale:         "fr",
		Status:         "draft",
		Data:           map[string]any{"headline": "Bonjour"},
		Position:       2,
		BlockType:      "hero",
		BlockSchemaKey: "hero/v1",
	}

	block := AdminBlockRecordToCMSBlock(record)
	if block.ID != record.ID.String() {
		t.Fatalf("expected id %s, got %s", record.ID, block.ID)
	}
	if block.DefinitionID != record.DefinitionID.String() {
		t.Fatalf("expected definition id %s, got %s", record.DefinitionID, block.DefinitionID)
	}
	if block.ContentID != record.ContentID.String() {
		t.Fatalf("expected content id %s, got %s", record.ContentID, block.ContentID)
	}
	if block.Data["headline"] != "Bonjour" {
		t.Fatalf("expected cloned data, got %v", block.Data)
	}
	record.Data["headline"] = "Changed"
	if block.Data["headline"] != "Bonjour" {
		t.Fatalf("expected data clone to stay isolated, got %v", block.Data["headline"])
	}
}

func TestAdminBlockDefinitionMappingsPreserveFields(t *testing.T) {
	now := time.Now().UTC().Truncate(time.Second)
	description := "Reusable hero"
	icon := "hero"
	definition := cms.AdminBlockDefinitionRecord{
		ID:              uuid.New(),
		Name:            "Hero",
		Slug:            "hero",
		Type:            "hero",
		Description:     &description,
		Icon:            &icon,
		Category:        "marketing",
		Status:          "active",
		Channel:         "preview",
		Schema:          map[string]any{"metadata": map[string]any{"schema_version": "hero/v2"}},
		UISchema:        map[string]any{"ui:order": []string{"headline"}},
		SchemaVersion:   "hero/v2",
		MigrationStatus: "current",
		Locale:          "en",
	}
	version := cms.AdminBlockDefinitionVersionRecord{
		ID:              uuid.New(),
		DefinitionID:    definition.ID,
		SchemaVersion:   "hero/v2",
		Schema:          map[string]any{"type": "object"},
		Defaults:        map[string]any{"headline": "Default"},
		MigrationStatus: "current",
		CreatedAt:       &now,
		UpdatedAt:       &now,
	}

	convertedDefinition := AdminBlockDefinitionRecordToCMSBlockDefinition(definition)
	if convertedDefinition.ID != definition.ID.String() {
		t.Fatalf("expected definition id %s, got %s", definition.ID, convertedDefinition.ID)
	}
	if BlockDefinitionChannel(convertedDefinition) != "preview" {
		t.Fatalf("expected preview channel, got %q", BlockDefinitionChannel(convertedDefinition))
	}
	if !convertedDefinition.DescriptionSet || convertedDefinition.Description != description {
		t.Fatalf("expected description to be preserved, got %+v", convertedDefinition)
	}
	if !convertedDefinition.IconSet || convertedDefinition.Icon != icon {
		t.Fatalf("expected icon to be preserved, got %+v", convertedDefinition)
	}

	convertedVersion := AdminBlockDefinitionVersionRecordToCMSBlockDefinitionVersion(version)
	if convertedVersion.DefinitionID != definition.ID.String() {
		t.Fatalf("expected version definition id %s, got %s", definition.ID, convertedVersion.DefinitionID)
	}
	if convertedVersion.CreatedAt != now || convertedVersion.UpdatedAt != now {
		t.Fatalf("expected timestamps to be preserved, got %+v", convertedVersion)
	}
}

func TestCMSBlockMappingsPreserveWriteFields(t *testing.T) {
	definitionID := uuid.New()
	contentID := uuid.New()
	createdBy := uuid.New()
	updatedBy := uuid.New()
	definition := cmsboot.CMSBlockDefinition{
		Name:           "Hero",
		Slug:           "hero",
		Type:           "hero",
		Description:    "Reusable hero",
		DescriptionSet: true,
		Icon:           "hero",
		IconSet:        true,
		Category:       "",
		CategorySet:    true,
		Status:         "active",
		Channel:        "preview",
		Schema:         map[string]any{"type": "object"},
		UISchema:       map[string]any{"ui:order": []string{"headline"}},
	}
	block := cmsboot.CMSBlock{
		ID:             uuid.New().String(),
		DefinitionID:   definitionID.String(),
		ContentID:      contentID.String(),
		Region:         "main",
		Locale:         "en",
		Status:         "draft",
		Data:           map[string]any{"headline": "Hero"},
		Position:       4,
		BlockType:      "hero",
		BlockSchemaKey: "hero/v1",
	}

	createReq := CMSBlockDefinitionToAdminBlockDefinitionCreateRequest(definition, "preview")
	if createReq.Category == nil || *createReq.Category != "" {
		t.Fatalf("expected explicit empty category to be preserved, got %+v", createReq.Category)
	}
	updateReq := CMSBlockDefinitionToAdminBlockDefinitionUpdateRequest(definition, definitionID, "preview")
	if updateReq.Description == nil || *updateReq.Description != "Reusable hero" {
		t.Fatalf("expected description pointer, got %+v", updateReq.Description)
	}
	saveReq := CMSBlockToAdminBlockSaveRequest(block, definitionID, contentID, createdBy, updatedBy)
	if saveReq.DefinitionID != definitionID || saveReq.ContentID != contentID {
		t.Fatalf("expected ids to be preserved, got %+v", saveReq)
	}
	if saveReq.CreatedBy != createdBy || saveReq.UpdatedBy != updatedBy {
		t.Fatalf("expected actor ids to be preserved, got %+v", saveReq)
	}
	if saveReq.Data["headline"] != "Hero" {
		t.Fatalf("expected block data to be cloned, got %+v", saveReq.Data)
	}
	block.Data["headline"] = "Changed"
	if saveReq.Data["headline"] != "Hero" {
		t.Fatalf("expected cloned save data to stay isolated, got %v", saveReq.Data["headline"])
	}
}
