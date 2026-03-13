package observability

import (
	"context"
	"testing"
	"time"
)

func TestSyncKernelObserverCapturesConflictRetryAndReplay(t *testing.T) {
	ResetSyncMetrics()

	observer := NewSyncKernelObserver()
	ctx := context.Background()

	observer.ObserveRead(ctx, 12*time.Millisecond, true, map[string]string{
		"kind": "agreement_draft",
	})
	observer.ObserveMutation(ctx, 25*time.Millisecond, true, map[string]string{
		"kind":      "agreement_draft",
		"operation": "autosave",
	})
	observer.IncrementConflict(ctx, map[string]string{
		"kind":      "agreement_draft",
		"operation": "autosave",
		"code":      "STALE_REVISION",
	})
	observer.IncrementRetry(ctx, map[string]string{
		"kind":      "agreement_draft",
		"operation": "send",
		"code":      "TEMPORARY_FAILURE",
	})
	observer.IncrementReplay(ctx, map[string]string{
		"kind":      "agreement_draft",
		"operation": "send",
	})

	snapshot := SyncSnapshot()
	if snapshot.ReadSampleTotal != 1 || snapshot.ReadSuccessTotal != 1 {
		t.Fatalf("expected one successful sync read sample, got %+v", snapshot)
	}
	if snapshot.MutationSampleTotal != 1 || snapshot.MutationSuccessTotal != 1 {
		t.Fatalf("expected one successful sync mutation sample, got %+v", snapshot)
	}
	if snapshot.ConflictTotal != 1 || snapshot.ConflictByOperation["autosave"] != 1 {
		t.Fatalf("expected autosave conflict counters, got %+v", snapshot)
	}
	if snapshot.RetryTotal != 1 || snapshot.RetryByOperation["send"] != 1 {
		t.Fatalf("expected send retry counters, got %+v", snapshot)
	}
	if snapshot.RetryByCode["temporary_failure"] != 1 {
		t.Fatalf("expected temporary_failure retry code counter, got %+v", snapshot.RetryByCode)
	}
	if snapshot.ReplayTotal != 1 || snapshot.ReplayByOperation["send"] != 1 {
		t.Fatalf("expected send replay counters, got %+v", snapshot)
	}
	if snapshot.ReadByKind["agreement_draft"] != 1 {
		t.Fatalf("expected agreement_draft read counter, got %+v", snapshot.ReadByKind)
	}
	if snapshot.MutationByOperation["autosave"] != 1 {
		t.Fatalf("expected autosave mutation counter, got %+v", snapshot.MutationByOperation)
	}
}
