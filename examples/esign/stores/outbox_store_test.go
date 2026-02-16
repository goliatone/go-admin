package stores

import (
	"context"
	"testing"
	"time"
)

func TestInMemoryOutboxStoreClaimRetryAndSuccess(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-1", OrgID: "org-1"}
	store := NewInMemoryStore()
	base := time.Date(2026, 2, 16, 12, 0, 0, 0, time.UTC)

	message, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		Topic:       "email.send",
		MessageKey:  "agreement.sent.signer-1",
		PayloadJSON: `{"agreement_id":"agr-1"}`,
		MaxAttempts: 2,
		CreatedAt:   base,
	})
	if err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}
	if message.Status != OutboxMessageStatusPending {
		t.Fatalf("expected pending message status, got %q", message.Status)
	}

	claimed, err := store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{
		Consumer: "worker-a",
		Now:      base.Add(1 * time.Second),
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages first: %v", err)
	}
	if len(claimed) != 1 || claimed[0].AttemptCount != 1 || claimed[0].Status != OutboxMessageStatusProcessing {
		t.Fatalf("expected first claim processing attempt, got %+v", claimed)
	}

	nextAttempt := base.Add(1 * time.Minute)
	failed, err := store.MarkOutboxMessageFailed(ctx, scope, message.ID, "provider timeout", &nextAttempt, base.Add(2*time.Second))
	if err != nil {
		t.Fatalf("MarkOutboxMessageFailed retry: %v", err)
	}
	if failed.Status != OutboxMessageStatusRetrying || failed.AvailableAt != nextAttempt {
		t.Fatalf("expected retrying with next attempt, got %+v", failed)
	}

	claimed, err = store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{
		Consumer: "worker-a",
		Now:      base.Add(30 * time.Second),
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages before retry: %v", err)
	}
	if len(claimed) != 0 {
		t.Fatalf("expected no claims before retry window, got %+v", claimed)
	}

	claimed, err = store.ClaimOutboxMessages(ctx, scope, OutboxClaimInput{
		Consumer: "worker-a",
		Now:      base.Add(2 * time.Minute),
		Limit:    10,
	})
	if err != nil {
		t.Fatalf("ClaimOutboxMessages second: %v", err)
	}
	if len(claimed) != 1 || claimed[0].AttemptCount != 2 {
		t.Fatalf("expected second claim attempt, got %+v", claimed)
	}

	succeeded, err := store.MarkOutboxMessageSucceeded(ctx, scope, message.ID, base.Add(3*time.Minute))
	if err != nil {
		t.Fatalf("MarkOutboxMessageSucceeded: %v", err)
	}
	if succeeded.Status != OutboxMessageStatusSucceeded || succeeded.PublishedAt == nil {
		t.Fatalf("expected succeeded outbox message, got %+v", succeeded)
	}
}

func TestSQLiteStoreOutboxMessagePersistenceAcrossReload(t *testing.T) {
	ctx := context.Background()
	scope := Scope{TenantID: "tenant-batch", OrgID: "org-batch"}
	store, dsn := newSQLiteStoreBatchTestStore(t)
	defer func() { _ = store.Close() }()

	if _, err := store.EnqueueOutboxMessage(ctx, scope, OutboxMessageRecord{
		Topic:       "email.send",
		MessageKey:  "agreement.sent.signer-1",
		PayloadJSON: `{"agreement_id":"agr-1"}`,
		CreatedAt:   time.Date(2026, 2, 16, 13, 0, 0, 0, time.UTC),
	}); err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}

	reloaded, err := NewSQLiteStore(dsn)
	if err != nil {
		t.Fatalf("reload NewSQLiteStore: %v", err)
	}
	defer func() { _ = reloaded.Close() }()

	messages, err := reloaded.ListOutboxMessages(ctx, scope, OutboxQuery{})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(messages) != 1 {
		t.Fatalf("expected one persisted outbox message, got %d", len(messages))
	}
}
