package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/stores"
)

type DurableOutboxDrainTrigger struct {
	runtime       *DurableJobRuntime
	jobName       string
	sweepInterval time.Duration
	now           func() time.Time

	closed    chan struct{}
	closeOnce sync.Once
	workers   sync.WaitGroup

	mu     sync.RWMutex
	scopes map[string]stores.Scope
}

func NewDurableOutboxDrainTrigger(runtime *DurableJobRuntime, jobName string, sweepInterval time.Duration) (*DurableOutboxDrainTrigger, error) {
	if runtime == nil {
		return nil, fmt.Errorf("durable outbox drain trigger runtime is required")
	}
	jobName = strings.TrimSpace(jobName)
	if jobName == "" {
		return nil, fmt.Errorf("durable outbox drain trigger job name is required")
	}
	if sweepInterval <= 0 {
		sweepInterval = 30 * time.Second
	}
	trigger := &DurableOutboxDrainTrigger{
		runtime:       runtime,
		jobName:       jobName,
		sweepInterval: sweepInterval,
		now:           func() time.Time { return time.Now().UTC() },
		closed:        make(chan struct{}),
		scopes:        map[string]stores.Scope{},
	}
	trigger.workers.Add(1)
	go trigger.worker()
	return trigger, nil
}

func (t *DurableOutboxDrainTrigger) NotifyScope(scope stores.Scope) {
	if t == nil {
		return
	}
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	t.mu.Lock()
	t.scopes[scopeKey(scope)] = scope
	t.mu.Unlock()
	if err := t.enqueueScope(context.Background(), scope); err != nil {
		log.Printf("durable outbox drain enqueue failed: job=%s tenant=%s org=%s err=%v", t.jobName, scope.TenantID, scope.OrgID, err)
	}
}

func (t *DurableOutboxDrainTrigger) Close() {
	if t == nil {
		return
	}
	t.closeOnce.Do(func() {
		close(t.closed)
	})
	t.workers.Wait()
}

func (t *DurableOutboxDrainTrigger) worker() {
	defer t.workers.Done()
	ticker := time.NewTicker(t.sweepInterval)
	defer ticker.Stop()
	for {
		select {
		case <-t.closed:
			return
		case <-ticker.C:
			for _, scope := range t.snapshotScopes() {
				if err := t.enqueueScope(context.Background(), scope); err != nil {
					log.Printf("durable outbox drain sweep enqueue failed: job=%s tenant=%s org=%s err=%v", t.jobName, scope.TenantID, scope.OrgID, err)
				}
			}
		}
	}
}

func (t *DurableOutboxDrainTrigger) snapshotScopes() []stores.Scope {
	t.mu.RLock()
	defer t.mu.RUnlock()
	out := make([]stores.Scope, 0, len(t.scopes))
	for _, scope := range t.scopes {
		out = append(out, scope)
	}
	return out
}

func (t *DurableOutboxDrainTrigger) enqueueScope(ctx context.Context, scope stores.Scope) error {
	if t == nil || t.runtime == nil {
		return fmt.Errorf("durable outbox drain trigger is not configured")
	}
	payload, err := json.Marshal(map[string]string{
		"scope_key": scopeKey(scope),
	})
	if err != nil {
		return err
	}
	now := t.now().UTC()
	_, _, err = t.runtime.Enqueue(ctx, scope, stores.JobRunEnqueueInput{
		JobName:         t.jobName,
		DedupeKey:       scopeKey(scope),
		PayloadJSON:     string(payload),
		AvailableAt:     &now,
		ResourceKind:    "scope",
		ResourceID:      scopeKey(scope),
		ReplaceTerminal: true,
		RequestedAt:     now,
	})
	return err
}
