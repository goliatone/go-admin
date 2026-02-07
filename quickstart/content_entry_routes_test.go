package quickstart

import (
	"testing"

	"github.com/goliatone/go-admin/admin"
)

func TestContentEntryColumnsMarksFilterableFields(t *testing.T) {
	panel := mustBuildContentEntryTestPanel(t)

	filters := contentEntryFilters(panel)
	columns := contentEntryColumns(panel, filters)
	if len(columns) != 3 {
		t.Fatalf("expected 3 columns, got %d", len(columns))
	}

	byField := map[string]map[string]any{}
	for _, column := range columns {
		byField[column["field"].(string)] = column
	}

	if filterable, _ := byField["title"]["filterable"].(bool); !filterable {
		t.Fatalf("expected title column to be filterable, got %+v", byField["title"])
	}
	if filterable, _ := byField["status"]["filterable"].(bool); !filterable {
		t.Fatalf("expected status column to be filterable, got %+v", byField["status"])
	}
	if filterable, _ := byField["slug"]["filterable"].(bool); filterable {
		t.Fatalf("expected slug column to be non-filterable, got %+v", byField["slug"])
	}
}

func TestContentEntryFiltersUsesSchemaAndFormFieldOptions(t *testing.T) {
	panel := mustBuildContentEntryTestPanel(t)

	filters := contentEntryFilters(panel)
	if len(filters) != 2 {
		t.Fatalf("expected 2 filters, got %d", len(filters))
	}

	byName := map[string]map[string]any{}
	for _, filter := range filters {
		byName[filter["name"].(string)] = filter
	}

	statusFilter := byName["status"]
	if statusFilter["label"] != "Status" {
		t.Fatalf("expected status label fallback, got %+v", statusFilter["label"])
	}
	if statusFilter["type"] != "select" {
		t.Fatalf("expected status type select, got %+v", statusFilter["type"])
	}
	options, ok := statusFilter["options"].([]map[string]any)
	if !ok || len(options) != 2 {
		t.Fatalf("expected status options from form field, got %+v", statusFilter["options"])
	}
	if options[0]["value"] != "draft" || options[1]["value"] != "published" {
		t.Fatalf("unexpected status options %+v", options)
	}

	titleFilter := byName["title"]
	if titleFilter["label"] != "Title contains" {
		t.Fatalf("expected explicit title label, got %+v", titleFilter["label"])
	}
	if titleFilter["type"] != "text" {
		t.Fatalf("expected title type text, got %+v", titleFilter["type"])
	}
	if _, ok := titleFilter["options"]; ok {
		t.Fatalf("expected title filter without options, got %+v", titleFilter["options"])
	}
}

func TestContentEntryFiltersFallsBackToColumns(t *testing.T) {
	panel, err := (&admin.PanelBuilder{}).
		WithRepository(admin.NewMemoryRepository()).
		ListFields(
			admin.Field{Name: "title", Label: "Title"},
			admin.Field{Name: "status", Label: "Status"},
		).
		FormFields(
			admin.Field{Name: "title", Type: "text"},
			admin.Field{
				Name: "status",
				Type: "select",
				Options: []admin.Option{
					{Value: "draft", Label: "Draft"},
					{Value: "published", Label: "Published"},
				},
			},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}

	filters := contentEntryFilters(panel)
	if len(filters) != 2 {
		t.Fatalf("expected 2 fallback filters, got %d", len(filters))
	}

	byName := map[string]map[string]any{}
	for _, filter := range filters {
		byName[filter["name"].(string)] = filter
	}
	if byName["title"]["type"] != "text" {
		t.Fatalf("expected title fallback type text, got %+v", byName["title"]["type"])
	}
	if byName["status"]["type"] != "select" {
		t.Fatalf("expected status fallback type select, got %+v", byName["status"]["type"])
	}
	options, ok := byName["status"]["options"].([]map[string]any)
	if !ok || len(options) != 2 {
		t.Fatalf("expected status options from form field, got %+v", byName["status"]["options"])
	}
}

func mustBuildContentEntryTestPanel(t *testing.T) *admin.Panel {
	t.Helper()
	panel, err := (&admin.PanelBuilder{}).
		WithRepository(admin.NewMemoryRepository()).
		ListFields(
			admin.Field{Name: "title", Label: "Title"},
			admin.Field{Name: "status", Label: "Status"},
			admin.Field{Name: "slug", Label: "Slug"},
		).
		FormFields(
			admin.Field{Name: "title", Type: "text"},
			admin.Field{
				Name: "status",
				Type: "select",
				Options: []admin.Option{
					{Value: "draft", Label: "Draft"},
					{Value: "published", Label: "Published"},
				},
			},
		).
		Filters(
			admin.Filter{Name: "status", Type: "select"},
			admin.Filter{Name: "title", Type: "text", Label: "Title contains"},
		).
		Build()
	if err != nil {
		t.Fatalf("build panel: %v", err)
	}
	return panel
}
