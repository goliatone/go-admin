package txoutbox

import (
	"context"
	"errors"
)

type hooksContextKey struct{}

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

// ContextWithHooks injects hook collectors into a context for nested tx-hook
// aware operations.
func ContextWithHooks(ctx context.Context, hooks *Hooks) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	if hooks == nil {
		return ctx
	}
	return context.WithValue(ctx, hooksContextKey{}, hooks)
}

// HooksFromContext returns the active hook collector from context when present.
func HooksFromContext(ctx context.Context) *Hooks {
	if ctx == nil {
		return nil
	}
	hooks, _ := ctx.Value(hooksContextKey{}).(*Hooks)
	return hooks
}

// WithTxHooksContext is the context-aware variant of WithTxHooks.
// It passes a context carrying the active hook collector to fn so nested calls
// can defer side effects until the outermost commit boundary.
func WithTxHooksContext[Tx any](ctx context.Context, txManager TxManager[Tx], fn func(ctx context.Context, tx Tx, hooks *Hooks) error) error {
	if fn == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if inherited := HooksFromContext(ctx); inherited != nil {
		ctx = ContextWithHooks(ctx, inherited)
		if txManager == nil {
			var zero Tx
			return fn(ctx, zero, inherited)
		}
		return txManager.WithTx(ctx, func(tx Tx) error {
			return fn(ctx, tx, inherited)
		})
	}
	hooks := &Hooks{afterCommit: make([]PostCommitHook, 0)}
	ctx = ContextWithHooks(ctx, hooks)
	if txManager == nil {
		var zero Tx
		if err := fn(ctx, zero, hooks); err != nil {
			return err
		}
		return hooks.runAfterCommit()
	}
	if err := txManager.WithTx(ctx, func(tx Tx) error {
		return fn(ctx, tx, hooks)
	}); err != nil {
		return err
	}
	return hooks.runAfterCommit()
}

// WithTxHooks executes fn in a write transaction and runs queued post-commit hooks
// only when commit succeeds.
func WithTxHooks[Tx any](ctx context.Context, txManager TxManager[Tx], fn func(tx Tx, hooks *Hooks) error) error {
	return WithTxHooksContext(ctx, txManager, func(_ context.Context, tx Tx, hooks *Hooks) error {
		return fn(tx, hooks)
	})
}
