package cmsadapter

import (
	"testing"

	dashinternal "github.com/goliatone/go-admin/admin/internal/dashboard"
	cmswidgets "github.com/goliatone/go-cms/widgets"
	"github.com/google/uuid"
)

func TestWidgetPlacementMetadataOmitsEmptyFields(t *testing.T) {
	meta := WidgetPlacementMetadata(dashinternal.WidgetInstance{})
	if meta != nil {
		t.Fatalf("expected nil metadata for empty placement, got %+v", meta)
	}

	meta = WidgetPlacementMetadata(dashinternal.WidgetInstance{PageID: "page-1", Locale: "es"})
	if meta["page_id"] != "page-1" || meta["locale"] != "es" {
		t.Fatalf("expected page_id and locale metadata, got %+v", meta)
	}
}

func TestConvertGoCMSResolvedWidgetBackfillsPlacementMetadata(t *testing.T) {
	area := "admin.dashboard.main"
	entry := &cmswidgets.ResolvedWidget{
		Instance: &cmswidgets.Instance{
			ID:            uuid.New(),
			DefinitionID:  uuid.New(),
			Configuration: map[string]any{"ok": true},
		},
		Placement: &cmswidgets.AreaPlacement{
			AreaCode: area,
			Position: 2,
			Metadata: map[string]any{
				"page_id": "page-42",
				"locale":  "fr",
			},
		},
	}

	inst := ConvertGoCMSResolvedWidget(entry)
	if inst.Area != area {
		t.Fatalf("expected area %q, got %q", area, inst.Area)
	}
	if inst.Position != 2 {
		t.Fatalf("expected position 2, got %d", inst.Position)
	}
	if inst.PageID != "page-42" || inst.Locale != "fr" {
		t.Fatalf("expected placement metadata to backfill page/locale, got %+v", inst)
	}
}

func TestConvertGoCMSResolvedWidgetPrefersResolvedConfig(t *testing.T) {
	entry := &cmswidgets.ResolvedWidget{
		Instance: &cmswidgets.Instance{
			ID:            uuid.New(),
			DefinitionID:  uuid.New(),
			Configuration: map[string]any{"headline": "Base"},
		},
		Config: map[string]any{"headline": "Localized"},
	}

	inst := ConvertGoCMSResolvedWidget(entry)
	if got := inst.Config["headline"]; got != "Localized" {
		t.Fatalf("expected resolved config to win, got %#v", got)
	}

	inst.Config["headline"] = "Mutated"
	if got := entry.Config["headline"]; got != "Localized" {
		t.Fatalf("expected mapped config clone, got %#v", got)
	}
}

func TestFilterWidgetInstancesTreatsEmptyInstanceLocaleAsWildcard(t *testing.T) {
	instances := []dashinternal.WidgetInstance{
		{ID: "1", PageID: "page-1", Locale: ""},
		{ID: "2", PageID: "page-1", Locale: "es"},
		{ID: "3", PageID: "page-2", Locale: "es"},
	}

	filtered := FilterWidgetInstances(instances, dashinternal.WidgetInstanceFilter{
		PageID: "page-1",
		Locale: "fr",
	})
	if len(filtered) != 1 || filtered[0].ID != "1" {
		t.Fatalf("expected wildcard locale instance only, got %+v", filtered)
	}
}
