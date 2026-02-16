package txoutbox

import (
	"context"
	"errors"
	"strings"
	"time"
)

const (
	OutboxStatusPending    = "pending"
	OutboxStatusProcessing = "processing"
	OutboxStatusRetrying   = "retrying"
	OutboxStatusSucceeded  = "succeeded"
	OutboxStatusFailed     = "failed"
)

// Message stores durable side-effect events for post-commit dispatch.
type Message struct {
	ID            string
	TenantID      string
	OrgID         string
	Topic         string
	MessageKey    string
	PayloadJSON   string
	HeadersJSON   string
	CorrelationID string
	Status        string
	AttemptCount  int
	MaxAttempts   int
	LastError     string
	AvailableAt   time.Time
	LockedAt      *time.Time
	LockedBy      string
	PublishedAt   *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// ClaimInput controls batched outbox claiming.
type ClaimInput struct {
	Consumer  string
	Now       time.Time
	Limit     int
	Topic     string
	LockUntil *time.Time
}

// Query controls outbox listing filters.
type Query struct {
	Topic    string
	Status   string
	Limit    int
	Offset   int
	SortDesc bool
}

// Store defines durable post-commit side-effect message persistence.
type Store[Scope any] interface {
	EnqueueOutboxMessage(ctx context.Context, scope Scope, record Message) (Message, error)
	ClaimOutboxMessages(ctx context.Context, scope Scope, input ClaimInput) ([]Message, error)
	MarkOutboxMessageSucceeded(ctx context.Context, scope Scope, id string, publishedAt time.Time) (Message, error)
	MarkOutboxMessageFailed(ctx context.Context, scope Scope, id, failureReason string, nextAttemptAt *time.Time, failedAt time.Time) (Message, error)
	ListOutboxMessages(ctx context.Context, scope Scope, query Query) ([]Message, error)
}

// Publisher publishes outbox messages to external systems.
type Publisher interface {
	PublishOutboxMessage(ctx context.Context, message Message) error
}

// DispatchInput controls outbox dispatch behavior.
type DispatchInput struct {
	Consumer    string
	Topic       string
	Limit       int
	Now         time.Time
	RetryDelay  time.Duration
	ClaimLockTo *time.Time
}

// DispatchResult captures batch dispatch outcomes.
type DispatchResult struct {
	Claimed   int
	Published int
	Retrying  int
	Failed    int
}

var (
	ErrStoreNotConfigured     = errors.New("txoutbox: store not configured")
	ErrPublisherNotConfigured = errors.New("txoutbox: publisher not configured")
)

// DispatchBatch claims pending outbox messages and publishes them.
func DispatchBatch[Scope any](ctx context.Context, store Store[Scope], scope Scope, publisher Publisher, input DispatchInput) (DispatchResult, error) {
	if store == nil {
		return DispatchResult{}, ErrStoreNotConfigured
	}
	if publisher == nil {
		return DispatchResult{}, ErrPublisherNotConfigured
	}
	now := input.Now
	if now.IsZero() {
		now = time.Now().UTC()
	}
	now = now.UTC()
	if input.RetryDelay <= 0 {
		input.RetryDelay = 30 * time.Second
	}
	claimed, err := store.ClaimOutboxMessages(ctx, scope, ClaimInput{
		Consumer:  strings.TrimSpace(input.Consumer),
		Topic:     strings.TrimSpace(input.Topic),
		Now:       now,
		Limit:     input.Limit,
		LockUntil: input.ClaimLockTo,
	})
	if err != nil {
		return DispatchResult{}, err
	}
	result := DispatchResult{Claimed: len(claimed)}
	var dispatchErr error
	for _, message := range claimed {
		if pubErr := publisher.PublishOutboxMessage(ctx, message); pubErr != nil {
			nextAttemptAt := now.Add(input.RetryDelay)
			failedRecord, markErr := store.MarkOutboxMessageFailed(ctx, scope, message.ID, pubErr.Error(), &nextAttemptAt, now)
			if markErr != nil {
				dispatchErr = errors.Join(dispatchErr, markErr)
				continue
			}
			if failedRecord.Status == OutboxStatusRetrying {
				result.Retrying++
			} else {
				result.Failed++
			}
			continue
		}
		if _, markErr := store.MarkOutboxMessageSucceeded(ctx, scope, message.ID, now); markErr != nil {
			dispatchErr = errors.Join(dispatchErr, markErr)
			continue
		}
		result.Published++
	}
	return result, dispatchErr
}
