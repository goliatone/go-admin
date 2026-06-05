package admin

import (
	"strings"
	"testing"
)

func TestTranslationSSRPayloadSectionsNormalizeListPayloads(t *testing.T) {
	data, meta := translationSSRPayloadSections(map[string]any{
		"data": []any{
			map[string]any{"assignment_id": "asg-1"},
			map[string]any{"assignment_id": "asg-2"},
		},
		"meta": map[string]any{"total": 2, "channel": "staging"},
	})

	rows := translationSSRList(data, "rows")
	if len(rows) != 2 {
		t.Fatalf("expected two normalized rows, got %+v", data)
	}
	if got := toString(meta["channel"]); got != "staging" {
		t.Fatalf("expected channel metadata, got %q", got)
	}
}

func TestTranslationSSRPayloadSectionsPreserveRootDashboardPayloads(t *testing.T) {
	data, meta := translationSSRPayloadSections(map[string]any{
		"cards": []map[string]any{{"id": "my_tasks", "count": 2}},
		"tables": map[string]any{
			"top_overdue_assignments": map[string]any{"total": 1},
		},
		"meta": map[string]any{"channel": "staging"},
	})

	if len(translationSSRList(data, "cards")) != 1 {
		t.Fatalf("expected root-level cards to be preserved, got %+v", data)
	}
	if _, ok := data["tables"].(map[string]any); !ok {
		t.Fatalf("expected root-level tables to be preserved, got %+v", data)
	}
	if _, ok := data["meta"]; ok {
		t.Fatalf("expected root-level meta to stay out of data, got %+v", data)
	}
	if got := toString(meta["channel"]); got != "staging" {
		t.Fatalf("expected root-level meta to be preserved, got %+v", meta)
	}
}

func TestTranslationSSRQueueResultNormalizesQueuePayloadRows(t *testing.T) {
	result := translationSSRQueueResult(TranslationSSRPresenterInput{
		QueuePath:      "/admin/translations/queue",
		EditorBasePath: "/admin/translations/assignments",
	}, map[string]any{
		"items":    []map[string]any{{"assignment_id": "asg-1"}},
		"total":    1,
		"page":     2,
		"per_page": 25,
		"channel":  "staging",
	})

	rows := translationSSRList(result.Data, "rows")
	if len(rows) != 1 {
		t.Fatalf("expected queue rows to be normalized, got %+v", result.Data)
	}
	if got := toInt(result.Meta["total"]); got != 1 {
		t.Fatalf("expected queue total metadata, got %d", got)
	}
	if got := toString(result.Meta["channel"]); got != "staging" {
		t.Fatalf("expected queue channel metadata, got %q", got)
	}
	if got := toInt(result.DataGrid["count"]); got != 1 {
		t.Fatalf("expected queue datagrid count, got %d", got)
	}
	if presets := translationSSRList(map[string]any{"items": result.DataGrid["saved_filter_presets"]}, "items"); len(presets) == 0 {
		t.Fatalf("expected default queue preset metadata, got %+v", result.DataGrid["saved_filter_presets"])
	}
}

func TestTranslationSSRFamilyListDataGridContract(t *testing.T) {
	data := map[string]any{
		"families": []map[string]any{{"family_id": "family-1"}},
	}
	meta := map[string]any{"page": 2, "per_page": 25, "total": 51}
	grid := translationSSRFamilyListDataGrid(TranslationSSRPresenterInput{
		FamilyBasePath: "/admin/translations/families",
		Channel:        "staging",
		Query: map[string]string{
			"family_id":       "family-1",
			"readiness_state": "blocked",
		},
	}, data, meta)

	if got := toString(grid["resource"]); got != "translation_families" {
		t.Fatalf("expected family resource, got %q", got)
	}
	if got := toInt(grid["count"]); got != 1 {
		t.Fatalf("expected one row, got %d", got)
	}
	pagination := extractMap(grid["pagination"])
	if got := toInt(pagination["total"]); got != 51 {
		t.Fatalf("expected pagination total 51, got %d", got)
	}
	urlState := extractMap(grid["url_state"])
	if got := toString(urlState["channel"]); got != "staging" {
		t.Fatalf("expected channel-preserving URL state, got %+v", urlState)
	}
	filters, ok := grid["filters"].([]map[string]any)
	if !ok || len(filters) == 0 {
		t.Fatalf("expected filter contracts, got %+v", grid["filters"])
	}
	filterValues := map[string]string{}
	for _, filter := range filters {
		filterValues[toString(filter["key"])] = toString(filter["value"])
	}
	if got := filterValues["family_id"]; got != "family-1" {
		t.Fatalf("expected active family filter value, got %q", got)
	}
	if got := filterValues["readiness_state"]; got != "blocked" {
		t.Fatalf("expected active readiness filter value, got %q", got)
	}
}

func TestTranslationSSRFamilyListLinksPreserveChannel(t *testing.T) {
	links := translationSSRFamilyListLinks(TranslationSSRPresenterInput{
		FamilyListPath: "/admin/translations/families",
		FamilyBasePath: "/admin/translations/families",
		MatrixPath:     "/admin/translations/matrix",
		QueuePath:      "/admin/translations/queue?review_state=needs_review",
		Channel:        "staging",
	})

	if got := toString(links["matrix"]); got != "/admin/translations/matrix?channel=staging" {
		t.Fatalf("expected matrix link to preserve channel, got %q", got)
	}
	if got := toString(links["queue"]); got != "/admin/translations/queue?channel=staging&review_state=needs_review" {
		t.Fatalf("expected queue link to preserve channel and existing query, got %q", got)
	}
}

func TestTranslationSSRQueueDataGridContract(t *testing.T) {
	data := map[string]any{
		"rows": []map[string]any{{"assignment_id": "asg-1"}},
	}
	meta := map[string]any{
		"page":                             1,
		"per_page":                         50,
		"total":                            1,
		"supported_filter_keys":            []string{"status", "assignee_id"},
		"supported_sort_keys":              []string{"due_date"},
		"default_sort":                     map[string]any{"sort": "due_date", "order": "asc"},
		"saved_filter_presets":             []map[string]any{{"id": "open"}},
		"saved_review_filter_presets":      []map[string]any{{"id": "review_inbox"}},
		"server_family_grouping_supported": true,
		"bulk_selection":                   map[string]any{"mode": "current_page"},
		"grouping":                         map[string]any{"mode": "family_id"},
	}
	grid := translationSSRQueueDataGrid(TranslationSSRPresenterInput{
		EditorBasePath: "/admin/translations/assignments",
		QueuePath:      "/admin/translations/queue",
		Channel:        "staging",
	}, data, meta)

	if got := toString(grid["resource"]); got != "translation_assignments" {
		t.Fatalf("expected assignment resource, got %q", got)
	}
	if got := toInt(grid["count"]); got != 1 {
		t.Fatalf("expected one row, got %d", got)
	}
	if supported := toBool(grid["server_family_supported"]); !supported {
		t.Fatalf("expected server-family grouping support metadata")
	}
	if actions, ok := grid["row_actions"].([]map[string]any); !ok || len(actions) == 0 {
		t.Fatalf("expected row actions, got %+v", grid["row_actions"])
	}
	presets, ok := grid["saved_filter_presets"].([]map[string]any)
	if !ok || len(presets) != 1 {
		t.Fatalf("expected enriched saved filter presets, got %+v", grid["saved_filter_presets"])
	}
	href := toString(presets[0]["href"])
	for _, expected := range []string{
		"/admin/translations/queue?",
		"channel=staging",
		"preset=open",
	} {
		if !strings.Contains(href, expected) {
			t.Fatalf("expected preset href %q to contain %q", href, expected)
		}
	}
}

func TestTranslationSSRFamilyAssigneeContractUsesSelectedLabelsFallback(t *testing.T) {
	contract := translationSSRFamilyAssigneeContract(map[string]any{
		"active_assignments": []map[string]any{
			{"assignee_id": "user-1", "assignee_label": "Maya Chen", "target_locale": "es"},
		},
	})

	if got := toString(contract["mode"]); got != "selected-labels-with-enhancement" {
		t.Fatalf("expected selected label fallback mode, got %q", got)
	}
	selected, ok := contract["selected"].([]map[string]any)
	if !ok || len(selected) != 1 {
		t.Fatalf("expected selected assignee label, got %+v", contract["selected"])
	}
	if got := toString(selected[0]["label"]); got != "Maya Chen" {
		t.Fatalf("expected selected assignee label, got %q", got)
	}
}
