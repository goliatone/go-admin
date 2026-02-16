package stores

import (
	"context"

	"github.com/goliatone/go-admin/admin/txoutbox"
)

// OutboxPublisher publishes outbox messages to external systems.
type OutboxPublisher = txoutbox.Publisher

// OutboxDispatchInput controls outbox dispatch behavior.
type OutboxDispatchInput = txoutbox.DispatchInput

// OutboxDispatchResult captures batch dispatch outcomes.
type OutboxDispatchResult = txoutbox.DispatchResult

// DispatchOutboxBatch claims pending outbox messages and publishes them.
func DispatchOutboxBatch(ctx context.Context, store OutboxStore, scope Scope, publisher OutboxPublisher, input OutboxDispatchInput) (OutboxDispatchResult, error) {
	return txoutbox.DispatchBatch[Scope](ctx, store, scope, publisher, input)
}
