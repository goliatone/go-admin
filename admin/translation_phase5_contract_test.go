package admin

import (
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"
)

func TestTranslationPhase5ContractSnapshot(t *testing.T) {
	payload := TranslationSharedContractsPayload()
	assertTranslationPhase5ContractSnapshot(t, payload, "testdata/translation_phase5_contract_snapshot.json")
}

func TestTranslationPhase5ContractStatusNormalization(t *testing.T) {
	record := map[string]any{}
	applyTranslationReadinessFields(record, map[string]any{
		"readiness_state": "unexpected",
	})
	if got := strings.TrimSpace(toString(record["readiness_state"])); got != translationReadinessStateReady {
		t.Fatalf("expected readiness_state normalized to %q, got %q", translationReadinessStateReady, got)
	}
	readiness := extractMap(record["translation_readiness"])
	if got := strings.TrimSpace(toString(readiness["readiness_state"])); got != translationReadinessStateReady {
		t.Fatalf("expected translation_readiness.readiness_state normalized to %q, got %q", translationReadinessStateReady, got)
	}

	now := time.Date(2026, 2, 17, 12, 0, 0, 0, time.UTC)
	queueRow := translationQueueAssignmentContractRow(TranslationAssignment{
		Status: AssignmentStatus("unknown"),
	}, now)
	if got := strings.TrimSpace(toString(queueRow["queue_state"])); got != string(AssignmentStatusPending) {
		t.Fatalf("expected queue_state normalized to %q, got %q", AssignmentStatusPending, got)
	}
	if got := strings.TrimSpace(toString(queueRow["content_state"])); got != translationQueueContentStateDraft {
		t.Fatalf("expected content_state normalized to %q, got %q", translationQueueContentStateDraft, got)
	}
	if got := strings.TrimSpace(toString(queueRow["due_state"])); got != translationQueueDueStateNone {
		t.Fatalf("expected due_state normalized to %q, got %q", translationQueueDueStateNone, got)
	}

	result := TranslationExchangeResult{}
	result.Add(TranslationExchangeRowResult{Status: "unknown"})
	if len(result.Results) != 1 {
		t.Fatalf("expected one result row, got %d", len(result.Results))
	}
	if got := strings.TrimSpace(result.Results[0].Status); got != translationExchangeRowStatusError {
		t.Fatalf("expected exchange row status normalized to %q, got %q", translationExchangeRowStatusError, got)
	}
	if result.Summary.Failed != 1 {
		t.Fatalf("expected summary failed=1 after normalized error status, got %+v", result.Summary)
	}

	jobPayload := translationExchangeAsyncJobPayload(translationExchangeAsyncJob{
		ID:     "txex_job_1",
		Kind:   "import.apply",
		Status: "unknown",
	})
	if got := strings.TrimSpace(toString(jobPayload["status"])); got != translationExchangeAsyncJobStatusFailed {
		t.Fatalf("expected job status normalized to %q, got %q", translationExchangeAsyncJobStatusFailed, got)
	}
}

func TestTranslationPhase5ContractDisabledReasonCodesAcrossActionPayloads(t *testing.T) {
	allowed := map[string]struct{}{}
	for _, code := range ActionDisabledReasonCodes() {
		allowed[code] = struct{}{}
	}

	moduleDisabled := translationCapabilityActionState(false, true, PermAdminTranslationsView)
	assertAllowedDisabledReasonCode(t, allowed, moduleDisabled, ActionDisabledReasonCodeFeatureDisabled)

	missingPermission := translationCapabilityActionState(true, false, PermAdminTranslationsView)
	assertAllowedDisabledReasonCode(t, allowed, missingPermission, ActionDisabledReasonCodePermissionDenied)

	queueBinding := &translationQueueBinding{}
	statusBlocked := queueBinding.queueActionState(context.Background(), false, PermAdminTranslationsEdit, "assignment must be in progress")
	assertAllowedDisabledReasonCode(t, allowed, statusBlocked, ActionDisabledReasonCodeInvalidStatus)
}

func assertAllowedDisabledReasonCode(t *testing.T, allowed map[string]struct{}, payload map[string]any, expected string) {
	t.Helper()
	code := strings.TrimSpace(toString(payload["reason_code"]))
	if code != expected {
		t.Fatalf("expected reason_code %q, got %q in payload %+v", expected, code, payload)
	}
	if _, ok := allowed[code]; !ok {
		t.Fatalf("reason_code %q missing from registry %+v", code, ActionDisabledReasonCodes())
	}
}

func assertTranslationPhase5ContractSnapshot(t *testing.T, payload map[string]any, snapshotPath string) {
	t.Helper()
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal phase 5 contract payload: %v", err)
	}
	want, err := os.ReadFile(snapshotPath)
	if err != nil {
		t.Fatalf("read snapshot %q: %v", snapshotPath, err)
	}
	got := strings.TrimSpace(string(data))
	expected := strings.TrimSpace(string(want))
	if got != expected {
		t.Fatalf("phase 5 contract snapshot mismatch\nexpected:\n%s\n\ngot:\n%s", expected, got)
	}
}
