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
	defaultEmailOutboxQueueCapacity = 64
	defaultEmailOutboxSweepInterval = 30 * time.Second
	defaultEmailOutboxBatchLimit    = 25
	emailOutboxConsumerID           = "esign-email-outbox"
)

// EmailOutboxPublisher converts durable outbox messages into async email job executions.
type EmailOutboxPublisher struct {
	handlers Handlers
}

// NewEmailOutboxPublisher builds an outbox publisher backed by email job handlers.
func NewEmailOutboxPublisher(handlers Handlers) EmailOutboxPublisher {
	return EmailOutboxPublisher{handlers: handlers}
}

// PublishOutboxMessage dispatches one email notification outbox message.
func (p EmailOutboxPublisher) PublishOutboxMessage(ctx context.Context, message stores.OutboxMessageRecord) error {
	if strings.TrimSpace(message.Topic) != services.NotificationOutboxTopicEmailSendSigningRequest {
		return fmt.Errorf("unsupported outbox topic %q", strings.TrimSpace(message.Topic))
	}
	var payload services.EmailSendSigningRequestOutboxPayload
	if err := json.Unmarshal([]byte(message.PayloadJSON), &payload); err != nil {
		return fmt.Errorf("decode email outbox payload: %w", err)
	}
	scope := stores.Scope{
		TenantID: strings.TrimSpace(message.TenantID),
		OrgID:    strings.TrimSpace(message.OrgID),
	}
	msg := EmailSendSigningRequestMsg{
		Scope:         scope,
		AgreementID:   strings.TrimSpace(payload.AgreementID),
		RecipientID:   strings.TrimSpace(payload.RecipientID),
		Notification:  strings.TrimSpace(payload.Notification),
		SignerToken:   strings.TrimSpace(payload.SignerToken),
		CorrelationID: strings.TrimSpace(payload.CorrelationID),
		DedupeKey:     strings.TrimSpace(payload.DedupeKey),
		MaxAttempts:   payload.MaxAttempts,
	}
	if err := p.handlers.ExecuteEmailSendSigningRequest(ctx, msg); err != nil {
		failureAuditEvent := strings.TrimSpace(payload.FailureAuditEvent)
		if failureAuditEvent != "" {
			_ = p.handlers.appendJobAudit(ctx, scope, msg.AgreementID, failureAuditEvent, map[string]any{
				"correlation_id":  strings.TrimSpace(payload.CorrelationID),
				"dedupe_key":      strings.TrimSpace(payload.DedupeKey),
				"notification":    strings.TrimSpace(payload.Notification),
				"recipient_id":    strings.TrimSpace(payload.RecipientID),
				"idempotency_key": strings.TrimSpace(payload.CorrelationID),
				"error":           strings.TrimSpace(err.Error()),
			})
		}
		return err
	}
	return nil
}

// EmailOutboxDispatcher drains durable email outbox messages asynchronously.
type EmailOutboxDispatcher struct {
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

// NewEmailOutboxDispatcher starts the async dispatcher worker.
func NewEmailOutboxDispatcher(store stores.OutboxStore, publisher stores.OutboxPublisher) (*EmailOutboxDispatcher, error) {
	if store == nil {
		return nil, fmt.Errorf("email outbox dispatcher store is required")
	}
	if publisher == nil {
		return nil, fmt.Errorf("email outbox dispatcher publisher is required")
	}
	d := &EmailOutboxDispatcher{
		store:         store,
		publisher:     publisher,
		sweepInterval: defaultEmailOutboxSweepInterval,
		batchLimit:    defaultEmailOutboxBatchLimit,
		now:           func() time.Time { return time.Now().UTC() },
		queue:         make(chan stores.Scope, defaultEmailOutboxQueueCapacity),
		closed:        make(chan struct{}),
		scopes:        map[string]stores.Scope{},
	}
	d.workers.Add(1)
	go d.worker()
	return d, nil
}

// NotifyScope registers scope activity and schedules an async dispatch.
func (d *EmailOutboxDispatcher) NotifyScope(scope stores.Scope) {
	if d == nil {
		return
	}
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	d.registerScope(scope)
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

// Close stops the background dispatcher.
func (d *EmailOutboxDispatcher) Close() {
	if d == nil {
		return
	}
	d.closeOnce.Do(func() {
		close(d.closed)
	})
	d.workers.Wait()
}

func (d *EmailOutboxDispatcher) worker() {
	defer d.workers.Done()
	ticker := time.NewTicker(d.sweepInterval)
	defer ticker.Stop()
	for {
		select {
		case <-d.closed:
			return
		case scope := <-d.queue:
			d.dispatchScope(context.Background(), scope)
		case <-ticker.C:
			for _, scope := range d.snapshotScopes() {
				d.dispatchScope(context.Background(), scope)
			}
		}
	}
}

func (d *EmailOutboxDispatcher) dispatchScope(ctx context.Context, scope stores.Scope) {
	scope = normalizeDispatchScope(scope)
	if scope.TenantID == "" || scope.OrgID == "" {
		return
	}
	for {
		result, err := stores.DispatchOutboxBatch(ctx, d.store, scope, d.publisher, stores.OutboxDispatchInput{
			Consumer:   emailOutboxConsumerID,
			Topic:      services.NotificationOutboxTopicEmailSendSigningRequest,
			Limit:      d.batchLimit,
			Now:        d.now(),
			RetryDelay: DefaultRetryPolicy().BaseDelay,
		})
		if err != nil {
			log.Printf("email outbox dispatch failed: tenant=%s org=%s err=%v", scope.TenantID, scope.OrgID, err)
			return
		}
		if result.Claimed == 0 {
			return
		}
	}
}

func (d *EmailOutboxDispatcher) registerScope(scope stores.Scope) {
	key := scopeKey(scope)
	d.mu.Lock()
	defer d.mu.Unlock()
	d.scopes[key] = scope
}

func (d *EmailOutboxDispatcher) snapshotScopes() []stores.Scope {
	d.mu.RLock()
	defer d.mu.RUnlock()
	out := make([]stores.Scope, 0, len(d.scopes))
	for _, scope := range d.scopes {
		out = append(out, scope)
	}
	return out
}

func normalizeDispatchScope(scope stores.Scope) stores.Scope {
	return stores.Scope{
		TenantID: strings.TrimSpace(scope.TenantID),
		OrgID:    strings.TrimSpace(scope.OrgID),
	}
}

func scopeKey(scope stores.Scope) string {
	scope = normalizeDispatchScope(scope)
	return scope.TenantID + "|" + scope.OrgID
}
