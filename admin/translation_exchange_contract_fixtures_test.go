package admin

import (
	"encoding/json"
	"os"
	"testing"
)

func TestTranslationExchangeContractFixtures(t *testing.T) {
	data, err := os.ReadFile("testdata/translation_exchange_contract_fixtures.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}

	fixture := map[string]any{}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	exportCompleted := extractMap(fixture["export_completed"])
	if got := toInt(exportCompleted["row_count"]); got != 2 {
		t.Fatalf("expected export row_count=2, got %d", got)
	}
	job := extractMap(exportCompleted["job"])
	if got := toString(job["kind"]); got != translationExchangeJobKindExport {
		t.Fatalf("expected export job kind %q, got %q", translationExchangeJobKindExport, got)
	}
	if got := toString(job["status"]); got != translationExchangeAsyncJobStatusCompleted {
		t.Fatalf("expected export job status completed, got %q", got)
	}
	progress := extractMap(job["progress"])
	if got := toInt(progress["processed"]); got != 2 {
		t.Fatalf("expected processed progress=2, got %d", got)
	}

	validateStates := extractMap(fixture["validate_states"])
	for _, stateKey := range []string{"missing_linkage", "duplicate_row", "stale_source_hash", "partial_success"} {
		state := extractMap(validateStates[stateKey])
		if len(state) == 0 {
			t.Fatalf("expected state %q", stateKey)
		}
		summary := extractMap(state["summary"])
		results := extractListMaps(state["results"])
		if len(results) == 0 {
			t.Fatalf("expected results for %q", stateKey)
		}
		if got := toInt(summary["processed"]); got != len(results) {
			t.Fatalf("expected summary.processed=%d for %q, got %d", len(results), stateKey, got)
		}
	}

	duplicate := extractMap(validateStates["duplicate_row"])
	duplicateResults := extractListMaps(duplicate["results"])
	dupMetadata := extractMap(duplicateResults[1]["metadata"])
	if got := toString(dupMetadata["error_code"]); got != TextCodeTranslationExchangeDuplicateRow {
		t.Fatalf("expected duplicate row error code %q, got %q", TextCodeTranslationExchangeDuplicateRow, got)
	}

	stale := extractMap(validateStates["stale_source_hash"])
	staleResults := extractListMaps(stale["results"])
	staleConflict := extractMap(staleResults[0]["conflict"])
	if got := toString(staleConflict["type"]); got != translationExchangeConflictTypeStaleSource {
		t.Fatalf("expected stale conflict type %q, got %q", translationExchangeConflictTypeStaleSource, got)
	}

	partial := extractMap(validateStates["partial_success"])
	partialSummary := extractMap(partial["summary"])
	if partialSummary["partial_success"] != true {
		t.Fatalf("expected partial_success=true, got %+v", partialSummary)
	}
	if got := toInt(partialSummary["skipped"]); got != 1 {
		t.Fatalf("expected skipped=1, got %d", got)
	}

	historyFixture := extractMap(fixture["history"])
	history := extractMap(historyFixture["history"])
	meta := extractMap(historyFixture["meta"])
	if got := toInt(history["total"]); got != 3 {
		t.Fatalf("expected history total=3, got %d", got)
	}
	if meta["include_examples"] != true {
		t.Fatalf("expected include_examples=true, got %+v", meta)
	}
	if fields := toStringSlice(meta["retention_fields"]); len(fields) == 0 {
		t.Fatalf("expected retention_fields metadata, got %+v", meta)
	}
	items := extractListMaps(history["items"])
	if len(items) != 3 {
		t.Fatalf("expected three history items, got %+v", items)
	}
	for idx, item := range items {
		if item["fixture"] != true {
			t.Fatalf("expected history item %d to be fixture-backed, got %+v", idx, item)
		}
	}
	if got := toString(items[0]["request_hash"]); got != "fixture_apply_request_hash" {
		t.Fatalf("expected apply fixture request hash, got %+v", items[0])
	}
	firstRetention := extractMap(items[0]["retention"])
	if firstRetention["hard_delete_supported"] != true {
		t.Fatalf("expected hard delete retention metadata, got %+v", firstRetention)
	}
	firstDownloads := extractMap(items[0]["downloads"])
	if got := toString(extractMap(firstDownloads["report"])["kind"]); got != translationExchangeDownloadKindReport {
		t.Fatalf("expected first report download kind %q, got %q", translationExchangeDownloadKindReport, got)
	}
}
