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
	ID            string     `json:"id"`
	TenantID      string     `json:"tenant_id"`
	OrgID         string     `json:"org_id"`
	Topic         string     `json:"topic"`
	MessageKey    string     `json:"message_key"`
	PayloadJSON   string     `json:"payload_json"`
	HeadersJSON   string     `json:"headers_json"`
	CorrelationID string     `json:"correlation_id"`
	Status        string     `json:"status"`
	AttemptCount  int        `json:"attempt_count"`
	MaxAttempts   int        `json:"max_attempts"`
	LastError     string     `json:"last_error"`
	AvailableAt   time.Time  `json:"available_at"`
	LockedAt      *time.Time `json:"locked_at"`
	LockedBy      string     `json:"locked_by"`
	PublishedAt   *time.Time `json:"published_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ClaimInput controls batched outbox claiming.
type ClaimInput struct {
	Consumer  string     `json:"consumer"`
	Now       time.Time  `json:"now"`
	Limit     int        `json:"limit"`
	Topic     string     `json:"topic"`
	LockUntil *time.Time `json:"lock_until"`
}

// Query controls outbox listing filters.
type Query struct {
	Topic    string `json:"topic"`
	Status   string `json:"status"`
	Limit    int    `json:"limit"`
	Offset   int    `json:"offset"`
	SortDesc bool   `json:"sort_desc"`
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
	Consumer    string        `json:"consumer"`
	Topic       string        `json:"topic"`
	Limit       int           `json:"limit"`
	Now         time.Time     `json:"now"`
	RetryDelay  time.Duration `json:"retry_delay"`
	ClaimLockTo *time.Time    `json:"claim_lock_to"`
}

// DispatchResult captures batch dispatch outcomes.
type DispatchResult struct {
	Claimed   int `json:"claimed"`
	Published int `json:"published"`
	Retrying  int `json:"retrying"`
	Failed    int `json:"failed"`
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
