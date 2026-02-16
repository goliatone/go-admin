package txoutbox

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"testing"
	"time"
)

type testScope struct {
	TenantID string
	OrgID    string
}

type testOutboxStore struct {
	messages map[string]Message
}

func newTestOutboxStore() *testOutboxStore {
	return &testOutboxStore{messages: map[string]Message{}}
}

func (s *testOutboxStore) EnqueueOutboxMessage(_ context.Context, scope testScope, record Message) (Message, error) {
	id := strings.TrimSpace(record.ID)
	if id == "" {
		id = fmt.Sprintf("msg-%d", len(s.messages)+1)
	}
	now := record.CreatedAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	if record.AvailableAt.IsZero() {
		record.AvailableAt = now
	}
	if strings.TrimSpace(record.Status) == "" {
		record.Status = OutboxStatusPending
	}
	if record.MaxAttempts <= 0 {
		record.MaxAttempts = 3
	}
	record.ID = id
	record.TenantID = scope.TenantID
	record.OrgID = scope.OrgID
	record.CreatedAt = now
	record.UpdatedAt = now
	s.messages[id] = record
	return record, nil
}

func (s *testOutboxStore) ClaimOutboxMessages(_ context.Context, scope testScope, input ClaimInput) ([]Message, error) {
	now := input.Now
	if now.IsZero() {
		now = time.Now().UTC()
	}
	limit := input.Limit
	if limit <= 0 {
		limit = 50
	}
	ids := make([]string, 0, len(s.messages))
	for id := range s.messages {
		ids = append(ids, id)
	}
	sort.Strings(ids)

	claimed := make([]Message, 0, limit)
	for _, id := range ids {
		if len(claimed) >= limit {
			break
		}
		record := s.messages[id]
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if topic := strings.TrimSpace(input.Topic); topic != "" && record.Topic != topic {
			continue
		}
		if record.Status != OutboxStatusPending && record.Status != OutboxStatusRetrying {
			continue
		}
		if !record.AvailableAt.IsZero() && record.AvailableAt.After(now) {
			continue
		}
		record.Status = OutboxStatusProcessing
		record.AttemptCount++
		record.LockedBy = strings.TrimSpace(input.Consumer)
		record.UpdatedAt = now
		s.messages[id] = record
		claimed = append(claimed, record)
	}
	return claimed, nil
}

func (s *testOutboxStore) MarkOutboxMessageSucceeded(_ context.Context, scope testScope, id string, publishedAt time.Time) (Message, error) {
	record, ok := s.messages[id]
	if !ok {
		return Message{}, errors.New("missing message")
	}
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return Message{}, errors.New("scope mismatch")
	}
	ts := publishedAt
	if ts.IsZero() {
		ts = time.Now().UTC()
	}
	record.Status = OutboxStatusSucceeded
	record.PublishedAt = &ts
	record.LastError = ""
	record.LockedBy = ""
	record.UpdatedAt = ts
	s.messages[id] = record
	return record, nil
}

func (s *testOutboxStore) MarkOutboxMessageFailed(_ context.Context, scope testScope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (Message, error) {
	record, ok := s.messages[id]
	if !ok {
		return Message{}, errors.New("missing message")
	}
	if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
		return Message{}, errors.New("scope mismatch")
	}
	now := failedAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	record.LastError = strings.TrimSpace(failureReason)
	record.LockedBy = ""
	record.UpdatedAt = now
	if record.MaxAttempts > 0 && record.AttemptCount >= record.MaxAttempts {
		record.Status = OutboxStatusFailed
	} else {
		record.Status = OutboxStatusRetrying
		if nextAttemptAt != nil {
			record.AvailableAt = nextAttemptAt.UTC()
		} else {
			record.AvailableAt = now
		}
	}
	s.messages[id] = record
	return record, nil
}

func (s *testOutboxStore) ListOutboxMessages(_ context.Context, scope testScope, query Query) ([]Message, error) {
	out := make([]Message, 0, len(s.messages))
	for _, record := range s.messages {
		if record.TenantID != scope.TenantID || record.OrgID != scope.OrgID {
			continue
		}
		if topic := strings.TrimSpace(query.Topic); topic != "" && record.Topic != topic {
			continue
		}
		if status := strings.TrimSpace(query.Status); status != "" && record.Status != status {
			continue
		}
		out = append(out, record)
	}
	sort.Slice(out, func(i, j int) bool {
		if query.SortDesc {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

type testOutboxPublisher struct {
	published []string
	failures  map[string]error
}

func (p *testOutboxPublisher) PublishOutboxMessage(_ context.Context, message Message) error {
	if p.failures != nil {
		if err, ok := p.failures[message.MessageKey]; ok && err != nil {
			return err
		}
	}
	p.published = append(p.published, message.ID)
	return nil
}

func TestDispatchBatchPublishesClaimedMessages(t *testing.T) {
	ctx := context.Background()
	scope := testScope{TenantID: "tenant-1", OrgID: "org-1"}
	store := newTestOutboxStore()
	now := time.Date(2026, 2, 16, 10, 0, 0, 0, time.UTC)
	for i := 1; i <= 2; i++ {
		if _, err := store.EnqueueOutboxMessage(ctx, scope, Message{
			Topic:       "email.send",
			MessageKey:  fmt.Sprintf("msg-%d", i),
			PayloadJSON: fmt.Sprintf(`{"id":"%d"}`, i),
			CreatedAt:   now.Add(time.Duration(i) * time.Second),
		}); err != nil {
			t.Fatalf("EnqueueOutboxMessage(%d): %v", i, err)
		}
	}
	publisher := &testOutboxPublisher{}
	result, err := DispatchBatch[testScope](ctx, store, scope, publisher, DispatchInput{
		Consumer: "worker-1",
		Limit:    10,
		Now:      now.Add(5 * time.Second),
	})
	if err != nil {
		t.Fatalf("DispatchBatch: %v", err)
	}
	if result.Claimed != 2 || result.Published != 2 || result.Retrying != 0 || result.Failed != 0 {
		t.Fatalf("unexpected dispatch result: %+v", result)
	}
	messages, err := store.ListOutboxMessages(ctx, scope, Query{Status: OutboxStatusSucceeded})
	if err != nil {
		t.Fatalf("ListOutboxMessages: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("expected 2 succeeded messages, got %d", len(messages))
	}
}

func TestDispatchBatchRetriesThenFailsWhenMaxAttemptsReached(t *testing.T) {
	ctx := context.Background()
	scope := testScope{TenantID: "tenant-1", OrgID: "org-1"}
	store := newTestOutboxStore()
	base := time.Date(2026, 2, 16, 11, 0, 0, 0, time.UTC)
	message, err := store.EnqueueOutboxMessage(ctx, scope, Message{
		Topic:       "email.send",
		MessageKey:  "fail-msg",
		PayloadJSON: `{"fail":true}`,
		MaxAttempts: 2,
		CreatedAt:   base,
	})
	if err != nil {
		t.Fatalf("EnqueueOutboxMessage: %v", err)
	}
	publisher := &testOutboxPublisher{failures: map[string]error{"fail-msg": errors.New("smtp timeout")}}

	first, err := DispatchBatch[testScope](ctx, store, scope, publisher, DispatchInput{
		Consumer:   "worker-1",
		Limit:      5,
		Now:        base.Add(1 * time.Second),
		RetryDelay: 1 * time.Minute,
	})
	if err != nil {
		t.Fatalf("first DispatchBatch: %v", err)
	}
	if first.Claimed != 1 || first.Retrying != 1 || first.Failed != 0 {
		t.Fatalf("unexpected first dispatch result: %+v", first)
	}

	beforeRetry, err := DispatchBatch[testScope](ctx, store, scope, publisher, DispatchInput{
		Consumer: "worker-1",
		Limit:    5,
		Now:      base.Add(30 * time.Second),
	})
	if err != nil {
		t.Fatalf("before-retry DispatchBatch: %v", err)
	}
	if beforeRetry.Claimed != 0 {
		t.Fatalf("expected no claims before retry window, got %+v", beforeRetry)
	}

	second, err := DispatchBatch[testScope](ctx, store, scope, publisher, DispatchInput{
		Consumer:   "worker-1",
		Limit:      5,
		Now:        base.Add(2 * time.Minute),
		RetryDelay: 1 * time.Minute,
	})
	if err != nil {
		t.Fatalf("second DispatchBatch: %v", err)
	}
	if second.Claimed != 1 || second.Retrying != 0 || second.Failed != 1 {
		t.Fatalf("unexpected second dispatch result: %+v", second)
	}

	failedMessages, err := store.ListOutboxMessages(ctx, scope, Query{Status: OutboxStatusFailed})
	if err != nil {
		t.Fatalf("ListOutboxMessages failed: %v", err)
	}
	if len(failedMessages) != 1 || failedMessages[0].ID != message.ID {
		t.Fatalf("expected failed message %q, got %+v", message.ID, failedMessages)
	}
}
