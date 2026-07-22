package admin

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

func TestMemoryCommandRunStoreProjectsCompleteRows(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	start := time.Now().UTC().Add(-time.Second)
	initial := validCommandRunUpdate()
	initial.StartedAt = &start
	initial.DispatchID = "dispatch-1"
	initial.CorrelationID = "correlation-1"
	initial.Mode = "queued"
	initial.Metadata = map[string]any{"source": "dispatcher"}
	record, changed, err := store.Apply(context.Background(), initial)
	if err != nil || !changed {
		t.Fatalf("initial apply = changed %v, err %v", changed, err)
	}

	current, total := int64(4), int64(10)
	progress := validCommandRunUpdate()
	progress.EventID, progress.Revision = "event-2", 2
	progress.Phase = CommandRunPhaseProgress
	progress.Current, progress.Total = &current, &total
	progress.Message = "working"
	progress.Metadata = map[string]any{"worker": "one"}
	record, changed, err = store.Apply(context.Background(), progress)
	if err != nil || !changed {
		t.Fatalf("progress apply = changed %v, err %v", changed, err)
	}
	if record.DispatchID != "dispatch-1" || record.CorrelationID != "correlation-1" || record.Mode != "queued" {
		t.Fatalf("complete row lost lineage: %+v", record)
	}
	if record.Current == nil || *record.Current != current || record.Metadata["source"] != "dispatcher" || record.Metadata["worker"] != "one" {
		t.Fatalf("complete row lost progress/metadata: %+v", record)
	}

	record.Metadata["source"] = "mutated"
	rows, err := store.List(context.Background(), CommandRunSelector{Global: true})
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if rows[0].Metadata["source"] != "dispatcher" {
		t.Fatal("returned record mutated store state")
	}
}

func TestMemoryCommandRunStoreDedupesAndOrdersRevisions(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	first := validCommandRunUpdate()
	record, changed, err := store.Apply(context.Background(), first)
	if err != nil || !changed {
		t.Fatalf("first apply = %+v, %v, %v", record, changed, err)
	}
	if _, changed, err = store.Apply(context.Background(), first.Clone()); err != nil || changed {
		t.Fatalf("duplicate apply = changed %v, err %v", changed, err)
	}

	equal := first.Clone()
	equal.EventID = "event-equal"
	equal.Message = "must not replace"
	if record, changed, err = store.Apply(context.Background(), equal); err != nil || changed || record.Message != "" {
		t.Fatalf("equal revision apply = %+v, changed %v, err %v", record, changed, err)
	}

	older := first.Clone()
	older.EventID, older.Revision = "event-older", 0
	if _, _, err := store.Apply(context.Background(), older); !errors.Is(err, ErrInvalidCommandRunUpdate) {
		t.Fatalf("zero revision error = %v", err)
	}

	newer := first.Clone()
	newer.EventID, newer.Revision, newer.Message = "event-newer", 2, "new"
	if record, changed, err = store.Apply(context.Background(), newer); err != nil || !changed || record.Message != "new" {
		t.Fatalf("newer apply = %+v, changed %v, err %v", record, changed, err)
	}
	stale := first.Clone()
	stale.EventID, stale.Message = "event-stale", "old"
	if record, changed, err = store.Apply(context.Background(), stale); err != nil || changed || record.Message != "new" {
		t.Fatalf("stale apply = %+v, changed %v, err %v", record, changed, err)
	}
}

func TestMemoryCommandRunStorePreventsTerminalRegression(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	terminal := validCommandRunUpdate()
	terminal.Phase = CommandRunPhaseFailed
	terminal.Failure = &CommandRunFailure{Category: "execution", Code: "failed"}
	if _, changed, err := store.Apply(context.Background(), terminal); err != nil || !changed {
		t.Fatalf("terminal apply = changed %v, err %v", changed, err)
	}
	started := validCommandRunUpdate()
	started.EventID, started.Revision, started.Phase = "event-2", 2, CommandRunPhaseStarted
	record, changed, err := store.Apply(context.Background(), started)
	if err != nil || changed || record.Phase != CommandRunPhaseFailed {
		t.Fatalf("terminal regression = %+v, changed %v, err %v", record, changed, err)
	}
}

func TestMemoryCommandRunStoreRetryAttemptAndSuccess(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	first := validCommandRunUpdate()
	first.Attempt, first.MaxAttempts = 1, 3
	if _, _, err := store.Apply(context.Background(), first); err != nil {
		t.Fatalf("first attempt: %v", err)
	}
	retry := first.Clone()
	retry.EventID, retry.Revision, retry.Attempt, retry.Phase = "event-2", 2, 2, CommandRunPhaseProgress
	record, changed, err := store.Apply(context.Background(), retry)
	if err != nil || !changed || record.Attempt != 2 {
		t.Fatalf("retry = %+v, changed %v, err %v", record, changed, err)
	}
	success := retry.Clone()
	success.EventID, success.Revision, success.Phase = "event-3", 3, CommandRunPhaseSucceeded
	record, changed, err = store.Apply(context.Background(), success)
	if err != nil || !changed || record.Phase != CommandRunPhaseSucceeded {
		t.Fatalf("success = %+v, changed %v, err %v", record, changed, err)
	}
}

func TestMemoryCommandRunStoreRetentionAndIndependentDedupe(t *testing.T) {
	store := newTestCommandRunStore(t, 2, 4)
	for i := 1; i <= 3; i++ {
		update := validCommandRunUpdate()
		update.EventID = fmt.Sprintf("event-%d", i)
		update.RunID = fmt.Sprintf("run-%d", i)
		update.OccurredAt = update.OccurredAt.Add(time.Duration(i) * time.Second)
		if _, _, err := store.Apply(context.Background(), update); err != nil {
			t.Fatalf("apply %d: %v", i, err)
		}
	}
	rows, err := store.List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 2 || rows[0].RunID != "run-3" || rows[1].RunID != "run-2" {
		t.Fatalf("retained rows = %+v, err %v", rows, err)
	}

	evictedDuplicate := validCommandRunUpdate()
	evictedDuplicate.EventID, evictedDuplicate.RunID = "event-1", "run-1"
	if record, changed, err := store.Apply(context.Background(), evictedDuplicate); err != nil || changed || record.RunID != "" {
		t.Fatalf("evicted duplicate = %+v, changed %v, err %v", record, changed, err)
	}
}

func TestMemoryCommandRunStoreScopedListAndClear(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	for _, tenant := range []string{"tenant-a", "tenant-b"} {
		update := validCommandRunUpdate()
		update.EventID, update.RunID = "event-"+tenant, "run-"+tenant
		update.Scope.TenantID = tenant
		if _, _, err := store.Apply(context.Background(), update); err != nil {
			t.Fatalf("apply %s: %v", tenant, err)
		}
	}
	selector := CommandRunSelector{Scope: CommandRunScope{ApplicationID: "app", EnvironmentID: "test", TenantID: "tenant-a"}}
	rows, err := store.List(context.Background(), selector)
	if err != nil || len(rows) != 1 || rows[0].Scope.TenantID != "tenant-a" {
		t.Fatalf("tenant list = %+v, err %v", rows, err)
	}
	if err := store.Clear(context.Background(), selector); err != nil {
		t.Fatalf("clear tenant: %v", err)
	}
	rows, _ = store.List(context.Background(), CommandRunSelector{Global: true})
	if len(rows) != 1 || rows[0].Scope.TenantID != "tenant-b" {
		t.Fatalf("rows after scoped clear = %+v", rows)
	}
	if err := store.Clear(context.Background(), CommandRunSelector{Global: true}); err != nil || store.Count() != 0 {
		t.Fatalf("global clear count=%d err=%v", store.Count(), err)
	}
}

func TestMemoryCommandRunStoreConcurrentApplyListClear(t *testing.T) {
	store := newTestCommandRunStore(t, 100, 500)
	ctx := context.Background()
	var wg sync.WaitGroup
	for worker := 0; worker < 8; worker++ {
		worker := worker
		wg.Add(1)
		go func() {
			defer wg.Done()
			for revision := 1; revision <= 50; revision++ {
				update := validCommandRunUpdate()
				update.RunID = fmt.Sprintf("run-%d", worker)
				update.EventID = fmt.Sprintf("event-%d-%d", worker, revision)
				update.Revision = uint64(revision)
				_, _, _ = store.Apply(ctx, update)
				_, _ = store.List(ctx, CommandRunSelector{Global: true})
			}
		}()
	}
	wg.Wait()
	rows, err := store.List(ctx, CommandRunSelector{Global: true})
	if err != nil || len(rows) != 8 {
		t.Fatalf("concurrent rows=%d err=%v", len(rows), err)
	}
	for _, row := range rows {
		if row.Revision != 50 {
			t.Fatalf("run %s revision=%d, want 50", row.RunID, row.Revision)
		}
	}
}

func TestCommandRunProjectorValidationAndStoreDelegation(t *testing.T) {
	store := newTestCommandRunStore(t, 10, 20)
	projector, err := NewCommandRunProjector(store, CommandRunContractLimits{})
	if err != nil {
		t.Fatalf("new projector: %v", err)
	}
	if _, changed, err := projector.ProjectCommandRun(context.Background(), validCommandRunUpdate()); err != nil || !changed {
		t.Fatalf("project = changed %v, err %v", changed, err)
	}
	invalid := validCommandRunUpdate()
	invalid.EventID = ""
	if _, _, err := projector.ProjectCommandRun(context.Background(), invalid); !errors.Is(err, ErrInvalidCommandRunUpdate) {
		t.Fatalf("invalid project error = %v", err)
	}
}

func newTestCommandRunStore(t testing.TB, retention, dedupe int) *MemoryCommandRunStore {
	t.Helper()
	store, err := NewMemoryCommandRunStore(CommandRunMemoryStoreConfig{Retention: retention, DedupeLimit: dedupe})
	if err != nil {
		t.Fatalf("new store: %v", err)
	}
	return store
}
