package txoutbox

import (
	"context"
	"errors"
)

// PostCommitHook defines work executed only after a successful transaction commit.
type PostCommitHook func() error

// Hooks tracks post-commit hooks collected during a transaction callback.
type Hooks struct {
	afterCommit []PostCommitHook
}

// AfterCommit registers a hook to run after transaction commit.
func (h *Hooks) AfterCommit(hook PostCommitHook) {
	if h == nil || hook == nil {
		return
	}
	h.afterCommit = append(h.afterCommit, hook)
}

func (h *Hooks) runAfterCommit() error {
	if h == nil || len(h.afterCommit) == 0 {
		return nil
	}
	var runErr error
	for _, hook := range h.afterCommit {
		if hook == nil {
			continue
		}
		if err := hook(); err != nil {
			runErr = errors.Join(runErr, err)
		}
	}
	return runErr
}

// TxManager provides transaction lifecycle coordination for a typed tx surface.
type TxManager[Tx any] interface {
	WithTx(ctx context.Context, fn func(tx Tx) error) error
}

// WithTxHooks executes fn in a write transaction and runs queued post-commit hooks
// only when commit succeeds.
func WithTxHooks[Tx any](ctx context.Context, txManager TxManager[Tx], fn func(tx Tx, hooks *Hooks) error) error {
	if fn == nil {
		return nil
	}
	hooks := &Hooks{afterCommit: make([]PostCommitHook, 0)}
	if txManager == nil {
		var zero Tx
		if err := fn(zero, hooks); err != nil {
			return err
		}
		return hooks.runAfterCommit()
	}
	if err := txManager.WithTx(ctx, func(tx Tx) error {
		return fn(tx, hooks)
	}); err != nil {
		return err
	}
	return hooks.runAfterCommit()
}
