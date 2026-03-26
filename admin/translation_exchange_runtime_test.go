package admin

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

type contextAwareTranslationExchangeRuntimeStore struct {
	*MemoryTranslationExchangeRuntimeStore

	mu                 sync.Mutex
	listRecoverableCtx context.Context
}

func newContextAwareTranslationExchangeRuntimeStore(nowFn func() time.Time) *contextAwareTranslationExchangeRuntimeStore {
	return &contextAwareTranslationExchangeRuntimeStore{
		MemoryTranslationExchangeRuntimeStore: NewMemoryTranslationExchangeRuntimeStore(nowFn),
	}
}

func (s *contextAwareTranslationExchangeRuntimeStore) recordListRecoverableCtx(ctx context.Context) {
	if s == nil {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.listRecoverableCtx = ctx
}

func (s *contextAwareTranslationExchangeRuntimeStore) lastListRecoverableCtx() context.Context {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.listRecoverableCtx
}

func (s *contextAwareTranslationExchangeRuntimeStore) ClaimJob(ctx context.Context, jobID, workerID string, now, leaseUntil time.Time) (translationExchangeAsyncJob, bool, error) {
	if err := contextErr(ctx); err != nil {
		return translationExchangeAsyncJob{}, false, err
	}
	return s.MemoryTranslationExchangeRuntimeStore.ClaimJob(ctx, jobID, workerID, now, leaseUntil)
}

func (s *contextAwareTranslationExchangeRuntimeStore) HeartbeatJob(ctx context.Context, jobID, workerID string, progress map[string]any, now, leaseUntil time.Time) error {
	if err := contextErr(ctx); err != nil {
		return err
	}
	return s.MemoryTranslationExchangeRuntimeStore.HeartbeatJob(ctx, jobID, workerID, progress, now, leaseUntil)
}

func (s *contextAwareTranslationExchangeRuntimeStore) CompleteJob(ctx context.Context, jobID, workerID string, progress, result, retention map[string]any, now time.Time) (translationExchangeAsyncJob, error) {
	if err := contextErr(ctx); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.MemoryTranslationExchangeRuntimeStore.CompleteJob(ctx, jobID, workerID, progress, result, retention, now)
}

func (s *contextAwareTranslationExchangeRuntimeStore) FailJob(ctx context.Context, jobID, workerID string, progress map[string]any, failure error, now time.Time) (translationExchangeAsyncJob, error) {
	if err := contextErr(ctx); err != nil {
		return translationExchangeAsyncJob{}, err
	}
	return s.MemoryTranslationExchangeRuntimeStore.FailJob(ctx, jobID, workerID, progress, failure, now)
}

func (s *contextAwareTranslationExchangeRuntimeStore) ListRecoverableJobs(ctx context.Context, now time.Time, limit int) ([]translationExchangeAsyncJob, error) {
	s.recordListRecoverableCtx(ctx)
	if err := contextErr(ctx); err != nil {
		return nil, err
	}
	return s.MemoryTranslationExchangeRuntimeStore.ListRecoverableJobs(ctx, now, limit)
}

type blockingTranslationExchangeExporter struct {
	started       chan context.Context
	release       chan struct{}
	ignoreContext bool
}

func (e *blockingTranslationExchangeExporter) Export(ctx context.Context, _ TranslationExportInput) (TranslationExportResult, error) {
	if e != nil && e.started != nil {
		select {
		case e.started <- ctx:
		default:
		}
	}
	if e != nil && e.ignoreContext {
		<-e.release
		return TranslationExportResult{RowCount: 1}, nil
	}
	select {
	case <-ctx.Done():
		return TranslationExportResult{}, ctx.Err()
	case <-e.release:
		return TranslationExportResult{RowCount: 1}, nil
	}
}

func TestTranslationExchangeRuntimeNilReceiverExecuteJobsDoNotPanic(t *testing.T) {
	var runtime *TranslationExchangeRuntime
	progressMu := sync.Mutex{}
	progress := map[string]any{}

	runtime.executeExportJob(context.Background(), translationExchangeAsyncJob{
		ID:   "job-export",
		Kind: translationExchangeJobKindExport,
	}, &progressMu, &progress)

	runtime.executeApplyJob(context.Background(), translationExchangeAsyncJob{
		ID:   "job-apply",
		Kind: translationExchangeJobKindImportApply,
	}, &progressMu, &progress)

	runtime.executeApplyJobWithExecutor(context.Background(), translationExchangeAsyncJob{
		ID:   "job-apply-executor",
		Kind: translationExchangeJobKindImportApply,
	}, nil, nil, &progressMu, &progress)
}

func TestTranslationExchangeRuntimeExecuteExportJobFailsJobWhenExporterMissing(t *testing.T) {
	store := NewMemoryTranslationExchangeRuntimeStore(func() time.Time {
		return time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)
	})
	runtime := NewTranslationExchangeRuntime(store, nil, nil)
	job, err := store.CreateJob(context.Background(), translationExchangeAsyncJob{
		ID:        "job-export",
		Kind:      translationExchangeJobKindExport,
		Status:    translationExchangeAsyncJobStatusRunning,
		CreatedBy: "actor-1",
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}

	progressMu := sync.Mutex{}
	progress := map[string]any{}
	runtime.executeExportJob(context.Background(), job, &progressMu, &progress)

	got, ok, err := store.GetJob(context.Background(), translationTransportIdentity{ActorID: "actor-1"}, job.ID)
	if err != nil {
		t.Fatalf("get job: %v", err)
	}
	if !ok {
		t.Fatalf("expected failed export job to remain available")
	}
	if got.Status != translationExchangeAsyncJobStatusFailed {
		t.Fatalf("expected failed status, got %q", got.Status)
	}
	if !strings.Contains(got.Error, "exporter not configured") {
		t.Fatalf("expected exporter not configured error, got %q", got.Error)
	}
	if failed := progressInt(got.Progress["failed"]); failed != 1 {
		t.Fatalf("expected failed progress=1, got %+v", got.Progress)
	}
}

func TestTranslationExchangeRuntimeExecuteApplyJobFailsJobWhenApplyHandlerMissing(t *testing.T) {
	store := NewMemoryTranslationExchangeRuntimeStore(func() time.Time {
		return time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)
	})
	runtime := NewTranslationExchangeRuntime(store, nil, nil)
	job, err := store.CreateJob(context.Background(), translationExchangeAsyncJob{
		ID:        "job-apply",
		Kind:      translationExchangeJobKindImportApply,
		Status:    translationExchangeAsyncJobStatusRunning,
		CreatedBy: "actor-1",
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}

	progressMu := sync.Mutex{}
	progress := map[string]any{}
	runtime.executeApplyJob(context.Background(), job, &progressMu, &progress)

	got, ok, err := store.GetJob(context.Background(), translationTransportIdentity{ActorID: "actor-1"}, job.ID)
	if err != nil {
		t.Fatalf("get job: %v", err)
	}
	if !ok {
		t.Fatalf("expected failed apply job to remain available")
	}
	if got.Status != translationExchangeAsyncJobStatusFailed {
		t.Fatalf("expected failed status, got %q", got.Status)
	}
	if !strings.Contains(got.Error, "apply service not configured") {
		t.Fatalf("expected apply service not configured error, got %q", got.Error)
	}
	if failed := progressInt(got.Progress["failed"]); failed != 1 {
		t.Fatalf("expected failed progress=1, got %+v", got.Progress)
	}
}

func TestTranslationExchangeRuntimeQueueExportUsesStartedContext(t *testing.T) {
	store := newContextAwareTranslationExchangeRuntimeStore(func() time.Time {
		return time.Date(2026, 3, 26, 12, 0, 0, 0, time.UTC)
	})
	exporter := &blockingTranslationExchangeExporter{
		started: make(chan context.Context, 1),
		release: make(chan struct{}),
	}
	runtime := NewTranslationExchangeRuntime(store, exporter, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := runtime.Start(ctx); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	job, err := runtime.QueueExport(context.Background(), translationExchangeAsyncJob{
		ID:        "job-managed-context",
		Kind:      translationExchangeJobKindExport,
		Status:    translationExchangeAsyncJobStatusRunning,
		CreatedBy: "actor-1",
	})
	if err != nil {
		t.Fatalf("queue export: %v", err)
	}
	startedCtx := waitForRuntimeExporterStart(t, exporter.started)
	cancel()
	waitForContextDone(t, startedCtx)
	waitForRuntimeWorkerDrain(t, runtime)

	got, ok, err := store.GetJob(context.Background(), translationTransportIdentity{ActorID: "actor-1"}, job.ID)
	if err != nil {
		t.Fatalf("get job: %v", err)
	}
	if !ok {
		t.Fatalf("expected queued job to remain available after cancellation")
	}
	if got.Status != translationExchangeAsyncJobStatusRunning {
		t.Fatalf("expected canceled job to remain recoverable, got %q", got.Status)
	}
}

func TestTranslationExchangeRuntimeHeartbeatStopsAfterManagedContextCancel(t *testing.T) {
	store := newContextAwareTranslationExchangeRuntimeStore(func() time.Time {
		return time.Now().UTC()
	})
	exporter := &blockingTranslationExchangeExporter{
		started:       make(chan context.Context, 1),
		release:       make(chan struct{}),
		ignoreContext: true,
	}
	runtime := NewTranslationExchangeRuntime(store, exporter, nil)
	runtime.heartbeatInterval = 10 * time.Millisecond
	runtime.leaseDuration = 40 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := runtime.Start(ctx); err != nil {
		t.Fatalf("start runtime: %v", err)
	}
	job, err := runtime.QueueExport(context.Background(), translationExchangeAsyncJob{
		ID:        "job-heartbeat-stop",
		Kind:      translationExchangeJobKindExport,
		Status:    translationExchangeAsyncJobStatusRunning,
		CreatedBy: "actor-1",
	})
	if err != nil {
		t.Fatalf("queue export: %v", err)
	}
	_ = waitForRuntimeExporterStart(t, exporter.started)
	waitForJobHeartbeatAdvance(t, store, job.ID)

	cancel()
	time.Sleep(30 * time.Millisecond)
	snapshot1 := mustGetTranslationExchangeJob(t, store, job.ID)
	time.Sleep(30 * time.Millisecond)
	snapshot2 := mustGetTranslationExchangeJob(t, store, job.ID)
	if !snapshot1.HeartbeatAt.Equal(snapshot2.HeartbeatAt) {
		t.Fatalf("expected heartbeat to stop after cancellation, got %v then %v", snapshot1.HeartbeatAt, snapshot2.HeartbeatAt)
	}
	if !snapshot1.LeaseUntil.Equal(snapshot2.LeaseUntil) {
		t.Fatalf("expected lease to stop extending after cancellation, got %v then %v", snapshot1.LeaseUntil, snapshot2.LeaseUntil)
	}

	close(exporter.release)
	waitForRuntimeWorkerDrain(t, runtime)
}

func contextErr(ctx context.Context) error {
	if ctx == nil {
		return nil
	}
	return ctx.Err()
}

func waitForRuntimeExporterStart(t *testing.T, started <-chan context.Context) context.Context {
	t.Helper()
	select {
	case ctx := <-started:
		return ctx
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for exporter to start")
		return nil
	}
}

func waitForContextDone(t *testing.T, ctx context.Context) {
	t.Helper()
	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for context cancellation")
	}
}

func waitForRuntimeWorkerDrain(t *testing.T, runtime *TranslationExchangeRuntime) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		runtime.mu.Lock()
		running := len(runtime.running)
		runtime.mu.Unlock()
		if running == 0 {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("timed out waiting for runtime workers to stop")
}

func waitForJobHeartbeatAdvance(t *testing.T, store TranslationExchangeRuntimeStore, jobID string) {
	t.Helper()
	initial := mustGetTranslationExchangeJob(t, store, jobID)
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		current := mustGetTranslationExchangeJob(t, store, jobID)
		if current.HeartbeatAt.After(initial.HeartbeatAt) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("timed out waiting for heartbeat to advance")
}

func mustGetTranslationExchangeJob(t *testing.T, store TranslationExchangeRuntimeStore, jobID string) translationExchangeAsyncJob {
	t.Helper()
	job, ok, err := store.GetJob(context.Background(), translationTransportIdentity{ActorID: "actor-1"}, jobID)
	if err != nil {
		t.Fatalf("get job %s: %v", jobID, err)
	}
	if !ok {
		t.Fatalf("expected job %s to exist", jobID)
	}
	return job
}

func progressInt(raw any) int {
	switch typed := raw.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	default:
		return 0
	}
}
