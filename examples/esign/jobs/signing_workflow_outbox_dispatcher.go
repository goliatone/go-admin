package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-admin/examples/esign/services"
	"github.com/goliatone/go-admin/examples/esign/stores"
)

const (
	defaultSigningWorkflowOutboxQueueCapacity = 64
	defaultSigningWorkflowOutboxSweepInterval = 30 * time.Second
	defaultSigningWorkflowOutboxBatchLimit    = 25
	signingWorkflowOutboxConsumerID           = "esign-signing-workflow-outbox"
)

// SigningWorkflowOutboxPublisher converts durable signer submit workflow messages into async executions.
type SigningWorkflowOutboxPublisher struct {
	handlers       Handlers
	completionFlow services.SigningCompletionWorkflow
	stageFlow      services.SigningStageWorkflow
}

// NewSigningWorkflowOutboxPublisher builds an outbox publisher backed by signer workflow handlers.
func NewSigningWorkflowOutboxPublisher(
	handlers Handlers,
	completionFlow services.SigningCompletionWorkflow,
	stageFlow services.SigningStageWorkflow,
) SigningWorkflowOutboxPublisher {
	return SigningWorkflowOutboxPublisher{
		handlers:       handlers,
		completionFlow: completionFlow,
		stageFlow:      stageFlow,
	}
}

// PublishOutboxMessage dispatches one signer workflow outbox message.
func (p SigningWorkflowOutboxPublisher) PublishOutboxMessage(ctx context.Context, message stores.OutboxMessageRecord) error {
	var payload services.SigningWorkflowOutboxPayload
	if err := json.Unmarshal([]byte(message.PayloadJSON), &payload); err != nil {
		return fmt.Errorf("decode signing workflow outbox payload: %w", err)
	}
	scope := stores.Scope{
		TenantID: strings.TrimSpace(message.TenantID),
		OrgID:    strings.TrimSpace(message.OrgID),
	}
	agreementID := strings.TrimSpace(payload.AgreementID)
	correlationID := strings.TrimSpace(payload.CorrelationID)
	switch strings.TrimSpace(message.Topic) {
	case services.SigningWorkflowOutboxTopicCompletion:
		if p.completionFlow == nil {
			return nil
		}
		if err := p.completionFlow.RunCompletionWorkflow(ctx, scope, agreementID, correlationID); err != nil {
			p.appendFailureAudit(ctx, scope, agreementID, payload, err)
			return err
		}
		return nil
	case services.SigningWorkflowOutboxTopicStageActivation:
		if p.stageFlow == nil {
			return nil
		}
		if err := p.stageFlow.RunStageActivationWorkflow(ctx, scope, agreementID, append([]string{}, payload.RecipientIDs...), correlationID); err != nil {
			p.appendFailureAudit(ctx, scope, agreementID, payload, err)
			return err
		}
		return nil
	default:
		return fmt.Errorf("unsupported signing workflow outbox topic %q", strings.TrimSpace(message.Topic))
	}
}

func (p SigningWorkflowOutboxPublisher) appendFailureAudit(
	ctx context.Context,
	scope stores.Scope,
	agreementID string,
	payload services.SigningWorkflowOutboxPayload,
	cause error,
) {
	failureAuditEvent := strings.TrimSpace(payload.FailureAuditEvent)
	if failureAuditEvent == "" || p.handlers.audits == nil {
		return
	}
	metadata := map[string]any{
		"correlation_id": strings.TrimSpace(payload.CorrelationID),
		"recipient_id":   strings.TrimSpace(payload.RecipientID),
		"recipient_ids":  append([]string{}, payload.RecipientIDs...),
		"error":          strings.TrimSpace(cause.Error()),
	}
	if err := p.handlers.appendJobAudit(ctx, scope, agreementID, failureAuditEvent, metadata); err != nil {
		log.Printf("signing workflow failure audit append failed: agreement_id=%s event=%s err=%v audit_err=%v", agreementID, failureAuditEvent, cause, err)
	}
}

// SigningWorkflowOutboxDispatcher drains durable signer workflow outbox messages asynchronously.
type SigningWorkflowOutboxDispatcher struct {
	store         stores.OutboxStore
	publisher     stores.OutboxPublisher
	sweepInterval time.Duration
	batchLimit    int
	now           func() time.Time
	queue         chan stores.Scope
	closed        chan struct{}
	closeOnce     sync.Once
	workers       sync.WaitGroup
	mu            sync.RWMutex
	scopes        map[string]stores.Scope
}

// NewSigningWorkflowOutboxDispatcher starts the async dispatcher worker.
func NewSigningWorkflowOutboxDispatcher(store stores.OutboxStore, publisher stores.OutboxPublisher) (*SigningWorkflowOutboxDispatcher, error) {
	if store == nil {
		return nil, fmt.Errorf("signing workflow outbox dispatcher store is required")
	}
	if publisher == nil {
		return nil, fmt.Errorf("signing workflow outbox dispatcher publisher is required")
	}
	d := &SigningWorkflowOutboxDispatcher{
		store:         store,
		publisher:     publisher,
		sweepInterval: defaultSigningWorkflowOutboxSweepInterval,
		batchLimit:    defaultSigningWorkflowOutboxBatchLimit,
		now:           func() time.Time { return time.Now().UTC() },
		queue:         make(chan stores.Scope, defaultSigningWorkflowOutboxQueueCapacity),
		closed:        make(chan struct{}),
		scopes:        map[string]stores.Scope{},
	}
	d.workers.Add(1)
	go d.worker()
	return d, nil
}

// NotifyScope registers scope activity and schedules an async dispatch.
func (d *SigningWorkflowOutboxDispatcher) NotifyScope(scope stores.Scope) {
	if d == nil {
		return
	}
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	d.registerScope(scope)
	services.LogSendDebug("signing_workflow_outbox_dispatcher", "notify_scope", services.SendDebugFields(scope, "", map[string]any{
		"batch_limit": d.batchLimit,
	}))
	d.enqueueScope(scope)
}

// Close stops the background dispatcher.
func (d *SigningWorkflowOutboxDispatcher) Close() {
	if d == nil {
		return
	}
	d.closeOnce.Do(func() {
		close(d.closed)
	})
	d.workers.Wait()
}

func (d *SigningWorkflowOutboxDispatcher) worker() {
	defer d.workers.Done()
	ticker := time.NewTicker(d.sweepInterval)
	defer ticker.Stop()
	for {
		select {
		case <-d.closed:
			return
		case scope := <-d.queue:
			services.LogSendDebug("signing_workflow_outbox_dispatcher", "worker_received_scope", services.SendDebugFields(scope, "", nil))
			d.dispatchScope(context.Background(), scope)
		case <-ticker.C:
			for _, scope := range d.snapshotScopes() {
				services.LogSendDebug("signing_workflow_outbox_dispatcher", "worker_sweep_scope", services.SendDebugFields(scope, "", nil))
				d.dispatchScope(context.Background(), scope)
			}
		}
	}
}

func (d *SigningWorkflowOutboxDispatcher) dispatchScope(ctx context.Context, scope stores.Scope) {
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	dispatchStartedAt := time.Now()
	services.LogSendDebug("signing_workflow_outbox_dispatcher", "dispatch_scope_start", services.SendDebugFields(scope, "", map[string]any{
		"batch_limit": d.batchLimit,
	}))
	for _, topic := range []string{
		services.SigningWorkflowOutboxTopicStageActivation,
		services.SigningWorkflowOutboxTopicCompletion,
	} {
		topicStartedAt := time.Now()
		for {
			batchStartedAt := time.Now()
			result, err := stores.DispatchOutboxBatch(ctx, d.store, scope, d.publisher, stores.OutboxDispatchInput{
				Consumer:   signingWorkflowOutboxConsumerID,
				Topic:      topic,
				Limit:      d.batchLimit,
				Now:        d.now(),
				RetryDelay: DefaultRetryPolicy().BaseDelay,
			})
			if err != nil {
				services.LogSendPhaseDuration("signing_workflow_outbox_dispatcher", "dispatch_scope_failed", batchStartedAt, services.SendDebugFields(scope, "", map[string]any{
					"topic":              topic,
					"error":              strings.TrimSpace(err.Error()),
					"sqlite_lock":        sqliteDispatchLockReason(err) != "",
					"sqlite_lock_reason": sqliteDispatchLockReason(err),
				}))
				log.Printf("signing workflow outbox dispatch failed: tenant=%s org=%s topic=%s err=%v", scope.TenantID, scope.OrgID, topic, err)
				break
			}
			services.LogSendPhaseDuration("signing_workflow_outbox_dispatcher", "dispatch_scope_batch", batchStartedAt, services.SendDebugFields(scope, "", map[string]any{
				"topic":     topic,
				"claimed":   result.Claimed,
				"published": result.Published,
				"retrying":  result.Retrying,
				"failed":    result.Failed,
			}))
			if result.Claimed == 0 {
				services.LogSendPhaseDuration("signing_workflow_outbox_dispatcher", "dispatch_topic_complete", topicStartedAt, services.SendDebugFields(scope, "", map[string]any{
					"topic": topic,
				}))
				break
			}
		}
	}
	services.LogSendPhaseDuration("signing_workflow_outbox_dispatcher", "dispatch_scope_complete", dispatchStartedAt, services.SendDebugFields(scope, "", nil))
}

func sqliteDispatchLockReason(err error) string {
	if err == nil {
		return ""
	}
	message := strings.ToLower(strings.TrimSpace(err.Error()))
	switch {
	case strings.Contains(message, "database is locked"):
		return "database_is_locked"
	case strings.Contains(message, "database table is locked"):
		return "database_table_is_locked"
	case strings.Contains(message, "database is busy"):
		return "database_is_busy"
	default:
		return ""
	}
}

func (d *SigningWorkflowOutboxDispatcher) enqueueScope(scope stores.Scope) {
	if d == nil {
		return
	}
	select {
	case <-d.closed:
		return
	default:
	}
	select {
	case <-d.closed:
	case d.queue <- scope:
	default:
	}
}

func (d *SigningWorkflowOutboxDispatcher) registerScope(scope stores.Scope) {
	key := scopeKey(scope)
	d.mu.Lock()
	defer d.mu.Unlock()
	d.scopes[key] = scope
}

func (d *SigningWorkflowOutboxDispatcher) snapshotScopes() []stores.Scope {
	d.mu.RLock()
	defer d.mu.RUnlock()
	out := make([]stores.Scope, 0, len(d.scopes))
	for _, scope := range d.scopes {
		out = append(out, scope)
	}
	return out
}
