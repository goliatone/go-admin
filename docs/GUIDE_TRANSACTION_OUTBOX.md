# Transaction Hooks and Outbox Guide

## Purpose

This guide defines the reusable transaction/outbox primitives at go-admin level.

Core package:

- `admin/txoutbox`

## What was promoted

1. Transaction utility: `txoutbox.WithTxHooks`
2. Outbox contract: `txoutbox.Store[Scope]`
3. Outbox models/statuses: `txoutbox.Message`, `txoutbox.ClaimInput`, `txoutbox.Query`
4. Outbox dispatcher utility: `txoutbox.DispatchBatch`

## When to use transaction hooks

Use `WithTxHooks` when:

1. You need commit-before-side-effect ordering.
2. The side effect is best-effort and can run in-process.
3. You do not need durable retry guarantees.

Example:

```go
err := txoutbox.WithTxHooks[TxStore](ctx, txManager, func(tx TxStore, hooks *txoutbox.Hooks) error {
  // write domain state with tx
  hooks.AfterCommit(func() error {
    return notifier.Notify(...)
  })
  return nil
})
```

## When to use outbox

Use outbox when:

1. Side effect is external and business-critical (email/provider/webhook).
2. Delivery must survive process crashes/restarts.
3. You need retry/backoff and operational visibility.

## Outbox flow

### 1) Write outbox message in the same transaction

```go
_, err := tx.EnqueueOutboxMessage(ctx, scope, txoutbox.Message{
  Topic:         "email.send",
  MessageKey:    "publication.ready.subscriber-1",
	PayloadJSON:   `{"publication_id":"...","subscriber_id":"..."}`,
  CorrelationID: corrID,
  MaxAttempts:   5,
})
```

### 2) Worker claims and dispatches

```go
result, err := txoutbox.DispatchBatch(ctx, store, scope, publisher, txoutbox.DispatchInput{
  Consumer:   "worker-1",
  Topic:      "email.send",
  Limit:      100,
  RetryDelay: 30 * time.Second,
})
```

Publisher contract:

```go
type Publisher interface {
  PublishOutboxMessage(ctx context.Context, message txoutbox.Message) error
}
```

## Status lifecycle

1. `pending`
2. `processing`
3. `retrying`
4. `succeeded`
5. `failed`

`ClaimOutboxMessages` increments attempts. Failed publish transitions to `retrying` until max attempts, then `failed`.

## Recommended policy

1. Keep transaction hooks for local post-commit best-effort work.
2. Use outbox for must-deliver external side effects.
3. Keep publishers idempotent.
4. Monitor outbox lag (`pending`/`retrying` count and age).

## Test coverage

1. `admin/txoutbox/tx_hooks_test.go`
2. `admin/txoutbox/outbox_test.go`
