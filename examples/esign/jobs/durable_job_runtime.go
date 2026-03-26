package jobs

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/observability"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultDurableJobPollInterval  = 500 * time.Millisecond
	defaultDurableJobLeaseDuration = 30 * time.Second
	defaultDurableJobBatchLimit    = 25
)

type DurableJobHandler func(ctx context.Context, scope stores.Scope, run stores.JobRunRecord) error

type DurableJobRuntime struct {
	store         stores.JobRunStore
	retryPolicy   RetryPolicy
	pollInterval  time.Duration
	leaseDuration time.Duration
	batchLimit    int
	workerID      string
	now           func() time.Time

	closed    chan struct{}
	closeOnce sync.Once
	workers   sync.WaitGroup

	mu       sync.RWMutex
	scopes   map[string]stores.Scope
	handlers map[string]DurableJobHandler
}

type DurableJobRuntimeOption func(*DurableJobRuntime)

func WithDurableJobPollInterval(interval time.Duration) DurableJobRuntimeOption {
	return func(r *DurableJobRuntime) {
		if r == nil || interval <= 0 {
			return
		}
		r.pollInterval = interval
	}
}

func WithDurableJobLeaseDuration(duration time.Duration) DurableJobRuntimeOption {
	return func(r *DurableJobRuntime) {
		if r == nil || duration <= 0 {
			return
		}
		r.leaseDuration = duration
	}
}

func WithDurableJobBatchLimit(limit int) DurableJobRuntimeOption {
	return func(r *DurableJobRuntime) {
		if r == nil || limit <= 0 {
			return
		}
		r.batchLimit = limit
	}
}

func WithDurableJobClock(now func() time.Time) DurableJobRuntimeOption {
	return func(r *DurableJobRuntime) {
		if r == nil || now == nil {
			return
		}
		r.now = now
	}
}

func WithDurableJobWorkerID(workerID string) DurableJobRuntimeOption {
	return func(r *DurableJobRuntime) {
		if r == nil {
			return
		}
		r.workerID = strings.TrimSpace(workerID)
	}
}

func NewDurableJobRuntime(store stores.JobRunStore, retryPolicy RetryPolicy, opts ...DurableJobRuntimeOption) (*DurableJobRuntime, error) {
	if store == nil {
		return nil, fmt.Errorf("durable job runtime store is required")
	}
	if retryPolicy.BaseDelay <= 0 {
		retryPolicy.BaseDelay = DefaultRetryPolicy().BaseDelay
	}
	if retryPolicy.MaxAttempts <= 0 {
		retryPolicy.MaxAttempts = DefaultRetryPolicy().MaxAttempts
	}
	runtime := &DurableJobRuntime{
		store:         store,
		retryPolicy:   retryPolicy,
		pollInterval:  defaultDurableJobPollInterval,
		leaseDuration: defaultDurableJobLeaseDuration,
		batchLimit:    defaultDurableJobBatchLimit,
		workerID:      "esign-durable-jobs",
		now:           func() time.Time { return time.Now().UTC() },
		closed:        make(chan struct{}),
		scopes:        map[string]stores.Scope{},
		handlers:      map[string]DurableJobHandler{},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(runtime)
		}
	}
	runtime.workers.Add(1)
	go runtime.worker()
	return runtime, nil
}

func (r *DurableJobRuntime) RegisterHandler(jobName string, handler DurableJobHandler) {
	if r == nil || handler == nil {
		return
	}
	jobName = strings.TrimSpace(jobName)
	if jobName == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.handlers[jobName] = handler
}

func (r *DurableJobRuntime) RegisterScope(scope stores.Scope) {
	if r == nil {
		return
	}
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.scopes[scopeKey(scope)] = scope
}

func (r *DurableJobRuntime) Enqueue(ctx context.Context, scope stores.Scope, input stores.JobRunEnqueueInput) (stores.JobRunRecord, bool, error) {
	if r == nil {
		return stores.JobRunRecord{}, false, fmt.Errorf("durable job runtime is not configured")
	}
	r.RegisterScope(scope)
	return r.store.EnqueueJob(ctx, scope, input)
}

func (r *DurableJobRuntime) Close() {
	if r == nil {
		return
	}
	r.closeOnce.Do(func() {
		close(r.closed)
	})
	r.workers.Wait()
}

func (r *DurableJobRuntime) worker() {
	defer r.workers.Done()
	ticker := time.NewTicker(r.pollInterval)
	defer ticker.Stop()
	r.processOnce(context.Background())
	for {
		select {
		case <-r.closed:
			return
		case <-ticker.C:
			r.processOnce(context.Background())
		}
	}
}

func (r *DurableJobRuntime) processOnce(ctx context.Context) {
	if r == nil {
		return
	}
	jobNames, handlers := r.snapshotHandlers()
	if len(jobNames) == 0 {
		return
	}
	now := r.now().UTC()
	for _, scope := range r.snapshotScopes() {
		if _, err := r.store.RequeueStaleJobs(ctx, scope, stores.JobRunRequeueInput{
			JobNames: jobNames,
			Now:      now,
			Limit:    r.batchLimit,
		}); err != nil {
			observability.NamedLogger("esign.jobs.runtime").Warn("durable job runtime requeue failed", "tenant_id", scope.TenantID, "org_id", scope.OrgID, "error", err)
		}
		runs, err := r.store.ClaimDueJobs(ctx, scope, stores.JobRunClaimInput{
			JobNames:      jobNames,
			Limit:         r.batchLimit,
			Now:           now,
			LeaseDuration: r.leaseDuration,
			WorkerID:      r.workerID,
		})
		if err != nil {
			observability.NamedLogger("esign.jobs.runtime").Warn("durable job runtime claim failed", "tenant_id", scope.TenantID, "org_id", scope.OrgID, "error", err)
			continue
		}
		for _, run := range runs {
			handler := handlers[run.JobName]
			if handler == nil {
				if _, err := r.store.MarkJobStale(ctx, scope, run.ID, "job handler not registered", now); err != nil {
					observability.NamedLogger("esign.jobs.runtime").Warn("durable job runtime stale mark failed", "job", run.JobName, "id", run.ID, "error", err)
				}
				continue
			}
			err := handler(ctx, scope, run)
			if err == nil {
				if _, markErr := r.store.MarkJobSucceeded(ctx, scope, run.ID, r.now().UTC()); markErr != nil {
					observability.NamedLogger("esign.jobs.runtime").Warn("durable job runtime success mark failed", "job", run.JobName, "id", run.ID, "error", markErr)
				}
				continue
			}
			failedAt := r.now().UTC()
			nextRetry := r.retryPolicy.nextRetry(run.AttemptCount, run.MaxAttempts, failedAt)
			if _, markErr := r.store.MarkJobFailed(ctx, scope, run.ID, stores.JobRunFailureInput{
				FailureReason:   err.Error(),
				NextAvailableAt: nextRetry,
				FailedAt:        failedAt,
			}); markErr != nil {
				observability.NamedLogger("esign.jobs.runtime").Warn("durable job runtime failure mark failed", "job", run.JobName, "id", run.ID, "error", markErr, "cause", err)
			}
		}
	}
}

func (r *DurableJobRuntime) snapshotScopes() []stores.Scope {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]stores.Scope, 0, len(r.scopes))
	for _, scope := range r.scopes {
		out = append(out, scope)
	}
	return out
}

func (r *DurableJobRuntime) snapshotHandlers() ([]string, map[string]DurableJobHandler) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	jobNames := make([]string, 0, len(r.handlers))
	handlers := make(map[string]DurableJobHandler, len(r.handlers))
	for name, handler := range r.handlers {
		jobNames = append(jobNames, name)
		handlers[name] = handler
	}
	return jobNames, handlers
}
