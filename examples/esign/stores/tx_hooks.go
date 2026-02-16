package stores

import (
	"context"

	"github.com/goliatone/go-admin/admin/txoutbox"
)

// PostCommitHook defines work executed only after a successful transaction commit.
type PostCommitHook = txoutbox.PostCommitHook

// TxHooks tracks post-commit hooks collected during a transaction callback.
type TxHooks = txoutbox.Hooks

// WithTxHooks executes fn in a write transaction and runs queued post-commit hooks
// only when commit succeeds.
func WithTxHooks(ctx context.Context, txManager TransactionManager, fn func(tx TxStore, hooks *TxHooks) error) error {
	return txoutbox.WithTxHooks[TxStore](ctx, txManager, fn)
}
