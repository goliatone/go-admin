package admin

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

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
