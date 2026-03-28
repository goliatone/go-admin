package admin

import (
	"testing"
	"time"

	cms "github.com/goliatone/go-cms"
	"github.com/google/uuid"
)

func TestMapCMSAdminPageRecordClonesCoreReadFields(t *testing.T) {
	familyID := uuid.New()
	parentID := uuid.New()
	now := time.Now().UTC()
	record := cms.AdminPageRecord{
		ID:              uuid.New(),
		ContentID:       uuid.New(),
		TemplateID:      uuid.New(),
		Title:           " Home ",
		Slug:            " home ",
		Path:            " /home ",
		RequestedLocale: " es ",
		ResolvedLocale:  " en ",
		Status:          " draft ",
		MetaTitle:       " Meta ",
		MetaDescription: " Description ",
		Tags:            []string{"one", "two"},
		SchemaVersion:   " page/v1 ",
		Data:            map[string]any{"path": "/home"},
		PreviewURL:      " /preview ",
		PublishedAt:     &now,
		CreatedAt:       &now,
		UpdatedAt:       &now,
		FamilyID:        &familyID,
		ParentID:        &parentID,
	}

	mapped := mapCMSAdminPageRecord(record)
	if mapped.Title != "Home" || mapped.Slug != "home" || mapped.Path != "/home" {
		t.Fatalf("expected trimmed core fields, got %+v", mapped)
	}
	if mapped.RequestedLocale != "es" || mapped.ResolvedLocale != "en" {
		t.Fatalf("expected trimmed locales, got %+v", mapped)
	}
	if mapped.Status != "draft" || mapped.MetaTitle != "Meta" || mapped.MetaDescription != "Description" {
		t.Fatalf("expected trimmed status/meta, got %+v", mapped)
	}
	if mapped.FamilyID != familyID.String() || mapped.ParentID != parentID.String() {
		t.Fatalf("expected family/parent ids propagated, got %+v", mapped)
	}
	if mapped.PreviewURL != "/preview" {
		t.Fatalf("expected trimmed preview url, got %q", mapped.PreviewURL)
	}
	record.Data["path"] = "/mutated"
	if got := toString(mapped.Data["path"]); got != "/home" {
		t.Fatalf("expected data cloned, got %q", got)
	}
}
