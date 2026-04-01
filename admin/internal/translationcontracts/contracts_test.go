package translationcontracts

import "testing"

func TestNormalizeStatusesAndEnums(t *testing.T) {
	if got := NormalizeReadinessState("unexpected"); got != "ready" {
		t.Fatalf("expected readiness fallback ready, got %q", got)
	}
	if got := NormalizeQueueState("weird"); got != "open" {
		t.Fatalf("expected queue fallback open, got %q", got)
	}
	if got := NormalizeQueueDueState("late"); got != QueueDueStateNone {
		t.Fatalf("expected due-state fallback %q, got %q", QueueDueStateNone, got)
	}
	if got := NormalizeExchangeRowStatus("bad"); got != "error" {
		t.Fatalf("expected exchange row fallback error, got %q", got)
	}
	if got := NormalizeExchangeJobStatus("bad"); got != "failed" {
		t.Fatalf("expected exchange job fallback failed, got %q", got)
	}

	payload := StatusEnumContract()
	all, _ := payload["all"].([]string)
	if len(all) == 0 {
		t.Fatalf("expected flattened enum list")
	}
}

func TestApplySourceTargetDriftContractBuildsSummary(t *testing.T) {
	record := map[string]any{
		"source_hash":    "hash_1",
		"source_version": "v12",
		"source_changed_fields": []any{
			"title",
			"summary",
			"title",
		},
	}

	ApplySourceTargetDriftContract(record)

	drift := mapFromAny(record[SourceTargetDriftKey])
	if len(drift) == 0 {
		t.Fatalf("expected source-target drift payload")
	}
	if got := stringFromAny(drift[SourceTargetDriftSourceHashKey]); got != "hash_1" {
		t.Fatalf("expected source hash hash_1, got %q", got)
	}
	summary := mapFromAny(drift[SourceTargetDriftChangedSummaryKey])
	fields := stringSliceFromAny(summary[SourceTargetDriftSummaryFieldsKey])
	if len(fields) != 2 || fields[0] != "summary" || fields[1] != "title" {
		t.Fatalf("unexpected normalized drift fields: %+v", fields)
	}
	if got := intFromAny(summary[SourceTargetDriftSummaryCountKey]); got != 2 {
		t.Fatalf("expected normalized drift count 2, got %d", got)
	}
}
