package modules

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	coreadmin "github.com/goliatone/go-admin/admin"
	"github.com/goliatone/go-admin/examples/esign/commands"
	appcfg "github.com/goliatone/go-admin/examples/esign/config"
	"github.com/goliatone/go-admin/examples/esign/handlers"
	esignpersistence "github.com/goliatone/go-admin/examples/esign/internal/persistence"
	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
	goerrors "github.com/goliatone/go-errors"
	jobqueue "github.com/goliatone/go-job/queue"
)

type remediationCommandServiceStub struct {
	calls int
}

func (s *remediationCommandServiceStub) Remediate(_ context.Context, _ stores.Scope, _ services.PDFRemediationRequest) (services.PDFRemediationResult, error) {
	s.calls++
	return services.PDFRemediationResult{
		Document: stores.DocumentRecord{
			ID:                   "doc-1",
			PDFCompatibilityTier: string(services.PDFCompatibilityTierFull),
			RemediationStatus:    services.PDFRemediationStatusSucceeded,
		},
	}, nil
}

type queueDispatchStatusStub struct {
	status jobqueue.DispatchStatus
	err    error
}

func (s queueDispatchStatusStub) GetDispatchStatus(context.Context, string) (jobqueue.DispatchStatus, error) {
	if s.err != nil {
		return jobqueue.DispatchStatus{}, s.err
	}
	return s.status, nil
}

func TestRemediationCommandTriggerDeduplicatesByIdempotencyKey(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	bus := coreadmin.NewCommandBus(true)
	remediationSvc := &remediationCommandServiceStub{}
	if err := commands.Register(
		bus,
		nil,
		nil,
		nil,
		nil,
		"",
		scope,
		nil,
		commands.WithPDFRemediationService(remediationSvc),
	); err != nil {
		t.Fatalf("register commands: %v", err)
	}
	store := stores.NewInMemoryStore()
	trigger := newRemediationCommandTrigger(bus, scope, store)
	if trigger == nil {
		t.Fatal("expected remediation trigger to be configured")
	}

	receiptOne, err := trigger.TriggerRemediation(context.Background(), handlers.RemediationTriggerInput{
		Scope:          scope,
		DocumentID:     "doc-1",
		IdempotencyKey: "remediate-idempotency-1",
		CorrelationID:  "corr-1",
	})
	if err != nil {
		t.Fatalf("trigger remediation one: %v", err)
	}
	receiptTwo, err := trigger.TriggerRemediation(context.Background(), handlers.RemediationTriggerInput{
		Scope:          scope,
		DocumentID:     "doc-1",
		IdempotencyKey: "remediate-idempotency-1",
		CorrelationID:  "corr-2",
	})
	if err != nil {
		t.Fatalf("trigger remediation two: %v", err)
	}
	if remediationSvc.calls != 1 {
		t.Fatalf("expected one remediation execution for idempotent retries, got %d", remediationSvc.calls)
	}
	if receiptOne.Mode != receiptTwo.Mode || receiptOne.DispatchID != receiptTwo.DispatchID {
		t.Fatalf("expected idempotent retry to return same receipt, one=%+v two=%+v", receiptOne, receiptTwo)
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationDuplicateSuppressedTotal != 1 {
		t.Fatalf("expected remediation duplicate suppression metric, got %+v", snapshot)
	}
	if snapshot.CommandDispatchAcceptedTotal < 2 {
		t.Fatalf("expected dispatch acceptance metrics for original+duplicate replay, got %+v", snapshot)
	}
}

func TestRemediationDispatchStatusLookupMergesDocumentLifecycle(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	requestedAt := time.Date(2026, 3, 8, 11, 0, 0, 0, time.UTC)
	startedAt := requestedAt.Add(1 * time.Second)
	completedAt := requestedAt.Add(3 * time.Second)
	updatedAt := requestedAt.Add(4 * time.Second)
	if _, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                     "doc-status-1",
		Title:                  "Doc Status",
		SourceObjectKey:        "tenant/tenant-1/org/org-1/docs/doc-status-1/original.pdf",
		SourceOriginalName:     "status.pdf",
		SourceSHA256:           strings.Repeat("a", 64),
		SourceType:             stores.SourceTypeUpload,
		RemediationStatus:      services.PDFRemediationStatusFailed,
		RemediationDispatchID:  "dispatch-status-1",
		RemediationFailure:     "normalization failed",
		RemediationRequestedAt: &requestedAt,
		RemediationStartedAt:   &startedAt,
		RemediationCompletedAt: &completedAt,
		UpdatedAt:              updatedAt,
		CreatedAt:              requestedAt,
	}); err != nil {
		t.Fatalf("create document: %v", err)
	}
	if _, err := store.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
		DispatchID:     "dispatch-status-1",
		DocumentID:     "doc-status-1",
		IdempotencyKey: remediationIdempotencyKey(scope, "doc-status-1", "idem-1", "queued"),
		Mode:           "queued",
		CommandID:      commands.CommandPDFRemediate,
		CorrelationID:  "corr-status-1",
		Accepted:       true,
		EnqueuedAt:     &requestedAt,
		UpdatedAt:      requestedAt,
	}); err != nil {
		t.Fatalf("save remediation dispatch: %v", err)
	}
	lookup := newRemediationDispatchStatusLookup(store, store, nil)
	if lookup == nil {
		t.Fatal("expected remediation dispatch status lookup")
	}
	status, err := lookup.LookupRemediationDispatchStatus(ctx, "dispatch-status-1")
	if err != nil {
		t.Fatalf("lookup remediation dispatch status: %v", err)
	}
	if status.Status != "failed" {
		t.Fatalf("expected failed status from document lifecycle, got %q", status.Status)
	}
	if status.TerminalReason != "normalization failed" {
		t.Fatalf("expected terminal reason from remediation failure, got %q", status.TerminalReason)
	}
	if status.StartedAt == nil || status.CompletedAt == nil {
		t.Fatalf("expected started/completed timestamps in status payload, got %+v", status)
	}
}

func TestRemediationDispatchStatusLookupPrefersQueueRetrying(t *testing.T) {
	observability.ResetDefaultMetrics()
	t.Cleanup(observability.ResetDefaultMetrics)

	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := stores.NewInMemoryStore()
	now := time.Date(2026, 3, 8, 12, 0, 0, 0, time.UTC)
	nextRun := now.Add(30 * time.Second)
	if _, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                    "doc-status-2",
		Title:                 "Doc Retry",
		SourceObjectKey:       "tenant/tenant-1/org/org-1/docs/doc-status-2/original.pdf",
		SourceOriginalName:    "retry.pdf",
		SourceSHA256:          strings.Repeat("b", 64),
		SourceType:            stores.SourceTypeUpload,
		RemediationStatus:     services.PDFRemediationStatusStarted,
		RemediationDispatchID: "dispatch-status-2",
		CreatedAt:             now,
		UpdatedAt:             now,
	}); err != nil {
		t.Fatalf("create document: %v", err)
	}
	if _, err := store.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
		DispatchID:     "dispatch-status-2",
		DocumentID:     "doc-status-2",
		IdempotencyKey: remediationIdempotencyKey(scope, "doc-status-2", "idem-2", "queued"),
		Mode:           "queued",
		CommandID:      commands.CommandPDFRemediate,
		CorrelationID:  "corr-status-2",
		Accepted:       true,
		EnqueuedAt:     &now,
		UpdatedAt:      now,
	}); err != nil {
		t.Fatalf("save remediation dispatch: %v", err)
	}
	lookup := newRemediationDispatchStatusLookup(store, store, queueDispatchStatusStub{
		status: jobqueue.DispatchStatus{
			DispatchID:     "dispatch-status-2",
			State:          jobqueue.DispatchStateRetrying,
			Attempt:        2,
			NextRunAt:      &nextRun,
			TerminalReason: "",
			UpdatedAt:      &now,
		},
	})
	status, err := lookup.LookupRemediationDispatchStatus(ctx, "dispatch-status-2")
	if err != nil {
		t.Fatalf("lookup remediation dispatch status: %v", err)
	}
	if status.Status != "retrying" {
		t.Fatalf("expected retrying status from queue reader, got %q", status.Status)
	}
	if status.Attempt != 2 {
		t.Fatalf("expected attempt=2 from queue reader, got %d", status.Attempt)
	}
	if status.MaxAttempts != 2 {
		t.Fatalf("expected max_attempts=2 to track queue attempts, got %d", status.MaxAttempts)
	}
	if status.NextRunAt == nil || !status.NextRunAt.Equal(nextRun.UTC()) {
		t.Fatalf("expected next_run_at from queue reader, got %+v", status.NextRunAt)
	}
	snapshot := observability.Snapshot()
	if snapshot.RemediationRetryingTotal != 1 {
		t.Fatalf("expected retrying transition metric, got %+v", snapshot)
	}
}

func TestRemediationDispatchStatusLookupPersistsAcrossRelationalReopen(t *testing.T) {
	ctx := context.Background()
	scope := stores.Scope{TenantID: "tenant-1", OrgID: "org-1"}
	dsn := "file:" + filepath.Join(t.TempDir(), "remediation-dispatch.db") + "?cache=shared&_fk=1&_busy_timeout=5000"
	cfg := appcfg.Defaults()
	cfg.Runtime.RepositoryDialect = appcfg.RepositoryDialectSQLite
	cfg.Persistence.Migrations.LocalOnly = true
	cfg.Persistence.SQLite.DSN = dsn
	cfg.Persistence.Postgres.DSN = ""

	store, cleanup, err := esignpersistence.OpenStore(ctx, cfg)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	now := time.Date(2026, 3, 10, 9, 0, 0, 0, time.UTC)
	if _, err := store.Create(ctx, scope, stores.DocumentRecord{
		ID:                    "doc-status-3",
		Title:                 "Doc Persisted Dispatch",
		SourceObjectKey:       "tenant/tenant-1/org/org-1/docs/doc-status-3/original.pdf",
		SourceOriginalName:    "persisted.pdf",
		SourceSHA256:          strings.Repeat("c", 64),
		SourceType:            stores.SourceTypeUpload,
		RemediationStatus:     services.PDFRemediationStatusStarted,
		RemediationDispatchID: "dispatch-status-3",
		CreatedAt:             now,
		UpdatedAt:             now,
	}); err != nil {
		t.Fatalf("create document: %v", err)
	}
	if _, err := store.SaveRemediationDispatch(ctx, scope, stores.RemediationDispatchRecord{
		DispatchID:     "dispatch-status-3",
		DocumentID:     "doc-status-3",
		IdempotencyKey: remediationIdempotencyKey(scope, "doc-status-3", "idem-3", "queued"),
		Mode:           "queued",
		CommandID:      commands.CommandPDFRemediate,
		CorrelationID:  "corr-status-3",
		Accepted:       true,
		EnqueuedAt:     &now,
		UpdatedAt:      now,
	}); err != nil {
		t.Fatalf("save remediation dispatch: %v", err)
	}
	if cleanup != nil {
		if err := cleanup(); err != nil {
			t.Fatalf("close relational store: %v", err)
		}
	}

	reopened, reopenedCleanup, err := esignpersistence.OpenStore(ctx, cfg)
	if err != nil {
		t.Fatalf("reopen relational store: %v", err)
	}
	t.Cleanup(func() {
		if reopenedCleanup != nil {
			_ = reopenedCleanup()
		}
	})

	lookup := newRemediationDispatchStatusLookup(reopened, reopened, nil)
	status, err := lookup.LookupRemediationDispatchStatus(ctx, "dispatch-status-3")
	if err != nil {
		t.Fatalf("lookup remediation dispatch status after reopen: %v", err)
	}
	if status.DispatchID != "dispatch-status-3" {
		t.Fatalf("expected persisted dispatch id, got %+v", status)
	}
	if status.TenantID != scope.TenantID || status.OrgID != scope.OrgID {
		t.Fatalf("expected persisted scope tenant/org, got %+v", status)
	}
}

func TestClassifyRemediationDispatchErrorDetectsDedupStoreMiss(t *testing.T) {
	err := goerrors.New("dedup store required", goerrors.CategoryConflict).WithTextCode("QUEUE_DEDUP_STORE_REQUIRED")
	if got := classifyRemediationDispatchError(err); got != "dedup_store_missing" {
		t.Fatalf("expected dedup_store_missing, got %q", got)
	}
}
