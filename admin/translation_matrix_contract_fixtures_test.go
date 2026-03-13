package admin

import (
	"encoding/json"
	"os"
	"testing"
)

func TestTranslationMatrixContractFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_matrix_contract_fixtures.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	fixture := map[string]any{}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	meta := extractMap(fixture["meta"])
	if got := toInt(meta["schema_version"]); got != translationMatrixContractSchemaVersionCurrent {
		t.Fatalf("expected schema_version=%d, got %d", translationMatrixContractSchemaVersionCurrent, got)
	}
	cellStates := toStringSlice(meta["cell_states"])
	if len(cellStates) != 6 {
		t.Fatalf("expected six cell states, got %+v", cellStates)
	}

	states := extractMap(fixture["states"])
	if len(states) != 3 {
		t.Fatalf("expected three matrix query states, got %d", len(states))
	}

	viewport := extractMap(states["viewport"])
	assertTranslationMatrixViewportFixture(t, viewport)

	missing := extractMap(states["missing_cell"])
	missingRows := extractListMaps(extractMap(extractMap(missing["data"])["rows"]))
	if got := toString(extractMap(extractMap(missingRows[0]["cells"])["it"])["state"]); got != translationMatrixCellStateMissing {
		t.Fatalf("expected missing_cell fixture to expose pages/it missing state, got %q", got)
	}

	filtered := extractMap(states["filtered"])
	filteredData := extractMap(filtered["data"])
	filteredRows := extractListMaps(filteredData["rows"])
	filteredColumns := extractListMaps(filteredData["columns"])
	if len(filteredRows) != 1 || toString(filteredRows[0]["family_id"]) != "tg-page-matrix-1" {
		t.Fatalf("expected filtered state to contain tg-page-matrix-1 only, got %+v", filteredRows)
	}
	if len(filteredColumns) != 2 || toString(filteredColumns[0]["locale"]) != "de" || toString(filteredColumns[1]["locale"]) != "fr" {
		t.Fatalf("expected filtered columns [de fr], got %+v", filteredColumns)
	}

	actions := extractMap(fixture["actions"])
	createMissing := extractMap(actions["create_missing"])
	createData := extractMap(createMissing["data"])
	if got := toString(createData["action"]); got != translationMatrixBulkActionCreateMissing {
		t.Fatalf("expected create_missing action payload, got %q", got)
	}
	createSummary := extractMap(createData["summary"])
	if got := toInt(createSummary["created"]); got != 1 {
		t.Fatalf("expected create_missing summary.created=1, got %d", got)
	}
	createResults := extractListMaps(createData["results"])
	if len(createResults) != 1 || toString(createResults[0]["status"]) != translationMatrixBulkResultStatusCreated {
		t.Fatalf("expected created result payload, got %+v", createResults)
	}

	exportSelected := extractMap(actions["export_selected"])
	exportData := extractMap(exportSelected["data"])
	if got := toString(exportData["action"]); got != translationMatrixBulkActionExportSelected {
		t.Fatalf("expected export_selected action payload, got %q", got)
	}
	exportSummary := extractMap(exportData["summary"])
	if got := toInt(exportSummary["export_ready"]); got != 2 {
		t.Fatalf("expected export summary export_ready=2, got %d", got)
	}
	exportRequest := extractMap(exportData["export_request"])
	if got := toString(exportRequest["endpoint"]); got == "" {
		t.Fatalf("expected export_request endpoint, got empty")
	}
	previewRows := extractListMaps(exportData["preview_rows"])
	if len(previewRows) == 0 {
		t.Fatalf("expected preview rows in export fixture")
	}

	actionErrors := extractMap(fixture["action_errors"])
	permissionDenied := extractMap(actionErrors["permission_denied"])
	errorPayload := extractMap(permissionDenied["error"])
	if got := toInt(errorPayload["code"]); got != 403 {
		t.Fatalf("expected permission_denied code=403, got %d", got)
	}
}

func assertTranslationMatrixViewportFixture(t *testing.T, payload map[string]any) {
	t.Helper()

	data := extractMap(payload["data"])
	meta := extractMap(payload["meta"])
	rows := extractListMaps(data["rows"])
	columns := extractListMaps(data["columns"])
	localePolicy := extractListMaps(meta["locale_policy"])
	if len(localePolicy) != 4 {
		t.Fatalf("expected locale_policy metadata for four columns, got %+v", localePolicy)
	}
	quickActionTargets := extractMap(meta["quick_action_targets"])
	if got := toString(extractMap(quickActionTargets["create_missing"])["endpoint"]); got == "" {
		t.Fatalf("expected create_missing quick action endpoint in fixture metadata")
	}
	if got := toInt(meta["total"]); got != 2 {
		t.Fatalf("expected viewport total=2, got %d", got)
	}
	if got := len(columns); got != 4 {
		t.Fatalf("expected viewport four columns, got %d", got)
	}
	if got := toString(columns[0]["locale"]); got != "en" {
		t.Fatalf("expected source locale first, got %q", got)
	}

	rowByID := map[string]map[string]any{}
	for _, row := range rows {
		rowByID[toString(row["family_id"])] = row
	}
	if len(rowByID) != 2 {
		t.Fatalf("expected two rows, got %+v", rows)
	}

	pageCells := extractMap(rowByID["tg-page-matrix-1"]["cells"])
	if got := toString(extractMap(pageCells["es"])["state"]); got != translationMatrixCellStateInProgress {
		t.Fatalf("expected page/es state in_progress, got %q", got)
	}
	if got := toString(extractMap(pageCells["fr"])["state"]); got != translationMatrixCellStateFallback {
		t.Fatalf("expected page/fr state fallback, got %q", got)
	}
	if enabled, _ := extractMap(extractMap(extractMap(pageCells["fr"])["quick_actions"])["create"])["enabled"].(bool); !enabled {
		t.Fatalf("expected page/fr create quick action enabled")
	}
	if got := toString(extractMap(pageCells["de"])["state"]); got != translationMatrixCellStateNotRequired {
		t.Fatalf("expected page/de state not_required, got %q", got)
	}
	if enabled, _ := extractMap(extractMap(extractMap(pageCells["de"])["quick_actions"])["create"])["enabled"].(bool); enabled {
		t.Fatalf("expected page/de create quick action disabled")
	}

	newsCells := extractMap(rowByID["tg-news-matrix-1"]["cells"])
	if got := toString(extractMap(newsCells["de"])["state"]); got != translationMatrixCellStateReady {
		t.Fatalf("expected news/de state ready, got %q", got)
	}
	if got := toString(extractMap(newsCells["fr"])["state"]); got != translationMatrixCellStateInReview {
		t.Fatalf("expected news/fr state in_review, got %q", got)
	}
	if href := toString(extractMap(extractMap(extractMap(newsCells["fr"])["quick_actions"])["open"])["href"]); href == "" {
		t.Fatalf("expected news/fr open quick action href")
	}

	selection := extractMap(data["selection"])
	actions := extractMap(selection["bulk_actions"])
	if enabled, _ := extractMap(actions[translationMatrixBulkActionCreateMissing])["enabled"].(bool); !enabled {
		t.Fatalf("expected create_missing action enabled")
	}
	if enabled, _ := extractMap(actions[translationMatrixBulkActionExportSelected])["enabled"].(bool); !enabled {
		t.Fatalf("expected export_selected action enabled")
	}
}
