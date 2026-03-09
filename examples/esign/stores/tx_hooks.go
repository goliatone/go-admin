package stores

import (
	"context"

	"github.com/goliatone/go-admin/admin/txoutbox"
)

// PostCommitHook defines work executed only after a successful transaction commit.
type PostCommitHook = txoutbox.PostCommitHook

// TxHooks tracks post-commit hooks collected during a transaction callback.
type TxHooks = txoutbox.Hooks

// ContextWithTxHooks injects hook collectors into context for nested hook-aware writes.
func ContextWithTxHooks(ctx context.Context, hooks *TxHooks) context.Context {
	return txoutbox.ContextWithHooks(ctx, hooks)
}

// TxHooksFromContext resolves an active hook collector from context.
func TxHooksFromContext(ctx context.Context) *TxHooks {
	return txoutbox.HooksFromContext(ctx)
}

// WithTxHooksContext executes fn in a write transaction and passes a context
// carrying the active hook collector.
func WithTxHooksContext(ctx context.Context, txManager TransactionManager, fn func(ctx context.Context, tx TxStore, hooks *TxHooks) error) error {
	return txoutbox.WithTxHooksContext[TxStore](ctx, txManager, fn)
}

// WithTxHooks executes fn in a write transaction and runs queued post-commit hooks
// only when commit succeeds.
func WithTxHooks(ctx context.Context, txManager TransactionManager, fn func(tx TxStore, hooks *TxHooks) error) error {
	return txoutbox.WithTxHooks[TxStore](ctx, txManager, fn)
}
