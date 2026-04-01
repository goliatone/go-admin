package cmsadapter

import (
	"testing"

	cmsboot "github.com/goliatone/go-admin/admin/internal/cmsboot"
	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func TestAdminContentRecordToCMSContentPreservesAdminFields(t *testing.T) {
	t.Parallel()

	contentID := uuid.New()
	familyID := uuid.New()
	record := cms.AdminContentRecord{
		ID:                     contentID,
		FamilyID:               &familyID,
		Title:                  "Hello",
		Slug:                   "hello",
		Locale:                 "fr",
		RequestedLocale:        "fr",
		ResolvedLocale:         "fr",
		AvailableLocales:       []string{"en", "fr"},
		MissingRequestedLocale: false,
		Navigation:             map[string]string{"header": "show"},
		EffectiveMenuLocations: []string{"header"},
		ContentType:            "posts",
		ContentTypeSlug:        "posts",
		Status:                 "draft",
		EmbeddedBlocks:         []map[string]any{{"type": "hero"}},
		SchemaVersion:          "post/v1",
		Data:                   map[string]any{"body": "bonjour"},
		Metadata:               map[string]any{"path": "/bonjour"},
	}

	converted := AdminContentRecordToCMSContent(record)
	if converted.ID != contentID.String() {
		t.Fatalf("expected id %s, got %s", contentID.String(), converted.ID)
	}
	if converted.FamilyID != familyID.String() {
		t.Fatalf("expected family id %s, got %s", familyID.String(), converted.FamilyID)
	}
	if converted.Data["_schema"] != "post/v1" {
		t.Fatalf("expected schema version injected into data, got %v", converted.Data["_schema"])
	}
	if converted.Data["_navigation"] == nil {
		t.Fatalf("expected navigation injected into data")
	}
	if converted.Data["effective_menu_locations"] == nil {
		t.Fatalf("expected effective menu locations injected into data")
	}
	if converted.Data["blocks"] == nil {
		t.Fatalf("expected embedded blocks injected into data")
	}
	record.Navigation["header"] = "hide"
	record.Data["body"] = "mutated"
	record.EmbeddedBlocks[0]["type"] = "mutated"
	if converted.Navigation["header"] != "show" {
		t.Fatalf("expected navigation clone, got %q", converted.Navigation["header"])
	}
	if converted.Data["body"] != "bonjour" {
		t.Fatalf("expected data clone, got %v", converted.Data["body"])
	}
	if converted.EmbeddedBlocks[0]["type"] != "hero" {
		t.Fatalf("expected embedded blocks clone, got %v", converted.EmbeddedBlocks[0]["type"])
	}
}

func TestCMSContentToAdminContentRequestsPreserveWriteFields(t *testing.T) {
	t.Parallel()

	typeID := uuid.New()
	actor := uuid.New()
	familyID := uuid.New()
	content := cmsboot.CMSContent{
		ID:                     uuid.New().String(),
		Title:                  "Hello",
		Slug:                   "hello",
		Locale:                 "en",
		FamilyID:               familyID.String(),
		Navigation:             map[string]string{"header": "show"},
		EffectiveMenuLocations: []string{"header"},
		ContentType:            "posts",
		ContentTypeSlug:        "posts",
		Status:                 "draft",
		Blocks:                 []string{"hero"},
		EmbeddedBlocks:         []map[string]any{{"type": "hero"}},
		SchemaVersion:          "post/v1",
		Data:                   map[string]any{"body": "hello"},
		Metadata:               map[string]any{"path": "/hello"},
	}

	createReq := CMSContentToAdminContentCreateRequest(content, typeID, actor, true)
	if createReq.ContentTypeID != typeID {
		t.Fatalf("expected content type id %s, got %s", typeID.String(), createReq.ContentTypeID.String())
	}
	if createReq.CreatedBy != actor || createReq.UpdatedBy != actor {
		t.Fatalf("expected actor on create request")
	}
	if createReq.FamilyID == nil || *createReq.FamilyID != familyID {
		t.Fatalf("expected family id on create request")
	}
	content.Navigation["header"] = "hide"
	content.Data["body"] = "mutated"
	if createReq.Navigation["header"] != "show" {
		t.Fatalf("expected navigation clone, got %q", createReq.Navigation["header"])
	}
	if createReq.Data["body"] != "hello" {
		t.Fatalf("expected data clone, got %v", createReq.Data["body"])
	}

	updateReq := CMSContentToAdminContentUpdateRequest(content, typeID, actor, true)
	if updateReq.ID == uuid.Nil {
		t.Fatalf("expected update id")
	}
	if updateReq.UpdatedBy != actor {
		t.Fatalf("expected actor on update request")
	}
	if updateReq.ContentTypeSlug != "posts" {
		t.Fatalf("expected content type slug posts, got %q", updateReq.ContentTypeSlug)
	}
}
