package stores

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"
)

type stubOutboxPublisher struct {
	published []string
	failures  map[string]error
}

func (p *stubOutboxPublisher) PublishOutboxMessage(_ context.Context, message OutboxMessageRecord) error {
	if p.failures != nil {
		if err, ok := p.failures[message.MessageKey]; ok && err != nil {
			return err
		}
	}
	p.published = append(p.published, strings.TrimSpace(message.ID))
	return nil
}

func TestDispatchOutboxBatchPublishesClaimedMessages(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	now := time.Date(2026, 2, 16, 10, 0, 0, 0, time.UTC)
	for i := 1; i <= 2; i++ {
		if _, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
			Topic:       "email.send",
			MessageKey:  fmt.Sprintf("msg-%d", i),
			PayloadJSON: fmt.Sprintf(`{"id":"%d"}`, i),
			CreatedAt:   now.Add(time.Duration(i) * time.Second),
		}); err != nil {
			t.Fatalf("EnqueueOutboxMessage(%d): %v", i, err)
		}
	}
	publisher := &stubOutboxPublisher{}
	result, err := DispatchOutboxBatch(ctx, store, scope, publisher, OutboxDispatchInput{
		Consumer: "worker-1",
		Limit:    10,
		Now:      now.Add(5 * time.Second),
	})
	if err != nil {
		t.Fatalf("DispatchOutboxBatch: %v", err)
	}
	if result.Claimed != 2 || result.Published != 2 || result.Retrying != 0 || result.Failed != 0 {
		t.Fatalf("unexpected dispatch result: %+v", result)
	}
	messages, err := store.ListOutboxMessages(ctx, scope, OutboxQuery{Status: OutboxMessageStatusSucceeded})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("expected 2 succeeded messages, got %d", len(messages))
	}
}

func TestDispatchOutboxBatchRetriesThenFailsWhenMaxAttemptsReached(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	base := time.Date(2026, 2, 16, 11, 0, 0, 0, time.UTC)
	message, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		Topic:       "email.send",
		MessageKey:  "fail-msg",
		PayloadJSON: `{"fail":true}`,
		MaxAttempts: 2,
		CreatedAt:   base,
	})
	if err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}
	publisher := &stubOutboxPublisher{
		failures: map[string]error{"fail-msg": errors.New("smtp timeout")},
	}

	first, err := DispatchOutboxBatch(ctx, store, scope, publisher, OutboxDispatchInput{
		Consumer:   "worker-1",
		Limit:      5,
		Now:        base.Add(1 * time.Second),
		RetryDelay: 1 * time.Minute,
	})
	if err != nil {
		t.Fatalf("first DispatchOutboxBatch: %v", err)
	}
	if first.Claimed != 1 || first.Retrying != 1 || first.Failed != 0 {
		t.Fatalf("unexpected first dispatch result: %+v", first)
	}

	beforeRetry, err := DispatchOutboxBatch(ctx, store, scope, publisher, OutboxDispatchInput{
		Consumer: "worker-1",
		Limit:    5,
		Now:      base.Add(30 * time.Second),
	})
	if err != nil {
		t.Fatalf("before-retry DispatchOutboxBatch: %v", err)
	}
	if beforeRetry.Claimed != 0 {
		t.Fatalf("expected no claims before retry window, got %+v", beforeRetry)
	}

	second, err := DispatchOutboxBatch(ctx, store, scope, publisher, OutboxDispatchInput{
		Consumer:   "worker-1",
		Limit:      5,
		Now:        base.Add(2 * time.Minute),
		RetryDelay: 1 * time.Minute,
	})
	if err != nil {
		t.Fatalf("second DispatchOutboxBatch: %v", err)
	}
	if second.Claimed != 1 || second.Retrying != 0 || second.Failed != 1 {
		t.Fatalf("unexpected second dispatch result: %+v", second)
	}

	failedMessages, err := store.ListOutboxMessages(ctx, scope, OutboxQuery{Status: OutboxMessageStatusFailed})
	if err != nil {
		t.Fatalf("ListOutboxMessages failed: %v", err)
	}
	if len(failedMessages) != 1 || failedMessages[0].ID != message.ID {
		t.Fatalf("expected failed message %q, got %+v", message.ID, failedMessages)
	}
}
