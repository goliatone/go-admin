package stores

import (
	"context"
	"errors"
	"testing"
)

type txHooksTestManager struct {
	tx    TxStore
	err   error
	calls int
}

func (m *txHooksTestManager) WithTx(_ context.Context, fn func(tx TxStore) error) error {
	m.calls++
	if m.err != nil {
		return m.err
	}
	if fn == nil {
		return nil
	}
	return fn(m.tx)
}

func TestWithTxHooksRunsAfterCommitOnSuccess(t *testing.T) {
	manager := &txHooksTestManager{tx: NewInMemoryStore()}
	ranCallback := false
	ranHook := false

	if err := WithTxHooks(context.Background(), manager, func(_ TxStore, hooks *TxHooks) error {
		ranCallback = true
		hooks.AfterCommit(func() error {
			ranHook = true
			return nil
		})
		return nil
	}); err != nil {
		t.Fatalf("WithTxHooks: %v", err)
	}
	if !ranCallback {
		t.Fatal("expected transaction callback to run")
	}
	if !ranHook {
		t.Fatal("expected after-commit hook to run")
	}
	if manager.calls != 1 {
		t.Fatalf("expected manager WithTx to be called once, got %d", manager.calls)
	}
}

func TestWithTxHooksSkipsAfterCommitOnTxError(t *testing.T) {
	sentinel := errors.New("tx failed")
	manager := &txHooksTestManager{tx: NewInMemoryStore(), err: sentinel}
	ranHook := false

	err := WithTxHooks(context.Background(), manager, func(_ TxStore, hooks *TxHooks) error {
		hooks.AfterCommit(func() error {
			ranHook = true
			return nil
		})
		return nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected tx sentinel error, got %v", err)
	}
	if ranHook {
		t.Fatal("expected after-commit hook not to run when tx fails")
	}
}

func TestWithTxHooksReturnsAfterCommitHookError(t *testing.T) {
	manager := &txHooksTestManager{tx: NewInMemoryStore()}
	sentinel := errors.New("post-commit failed")

	err := WithTxHooks(context.Background(), manager, func(_ TxStore, hooks *TxHooks) error {
		hooks.AfterCommit(func() error {
			return sentinel
		})
		return nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected post-commit sentinel error, got %v", err)
	}
}

func TestWithTxHooksRunsWithoutTransactionManager(t *testing.T) {
	ranCallback := false
	ranHook := false

	if err := WithTxHooks(context.Background(), nil, func(_ TxStore, hooks *TxHooks) error {
		ranCallback = true
		hooks.AfterCommit(func() error {
			ranHook = true
			return nil
		})
		return nil
	}); err != nil {
		t.Fatalf("WithTxHooks without tx manager: %v", err)
	}
	if !ranCallback || !ranHook {
		t.Fatalf("expected callback+hook to run, got callback=%t hook=%t", ranCallback, ranHook)
	}
}
