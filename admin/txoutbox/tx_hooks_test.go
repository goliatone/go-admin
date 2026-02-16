package txoutbox

import (
	"context"
	"errors"
	"testing"
)

type testTxManager struct {
	tx    int
	err   error
	calls int
}

func (m *testTxManager) WithTx(_ context.Context, fn func(tx int) error) error {
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
	manager := &testTxManager{tx: 7}
	ranCallback := false
	ranHook := false

	if err := WithTxHooks[int](context.Background(), manager, func(tx int, hooks *Hooks) error {
		ranCallback = true
		if tx != 7 {
			t.Fatalf("expected tx=7, got %d", tx)
		}
		hooks.AfterCommit(func() error {
			ranHook = true
			return nil
		})
		return nil
	}); err != nil {
		t.Fatalf("WithTxHooks: %v", err)
	}
	if !ranCallback {
		t.Fatal("expected callback to run")
	}
	if !ranHook {
		t.Fatal("expected after-commit hook to run")
	}
	if manager.calls != 1 {
		t.Fatalf("expected manager calls=1, got %d", manager.calls)
	}
}

func TestWithTxHooksSkipsAfterCommitOnTxError(t *testing.T) {
	sentinel := errors.New("tx failed")
	manager := &testTxManager{err: sentinel}
	ranHook := false

	err := WithTxHooks[int](context.Background(), manager, func(_ int, hooks *Hooks) error {
		hooks.AfterCommit(func() error {
			ranHook = true
			return nil
		})
		return nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected sentinel tx error, got %v", err)
	}
	if ranHook {
		t.Fatal("expected hook not to run when tx fails")
	}
}

func TestWithTxHooksReturnsAfterCommitHookError(t *testing.T) {
	sentinel := errors.New("post commit failed")
	manager := &testTxManager{}

	err := WithTxHooks[int](context.Background(), manager, func(_ int, hooks *Hooks) error {
		hooks.AfterCommit(func() error { return sentinel })
		return nil
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected post-commit error, got %v", err)
	}
}

func TestWithTxHooksRunsWithoutTransactionManager(t *testing.T) {
	ranCallback := false
	ranHook := false

	if err := WithTxHooks[int](context.Background(), nil, func(tx int, hooks *Hooks) error {
		ranCallback = true
		if tx != 0 {
			t.Fatalf("expected zero tx when manager nil, got %d", tx)
		}
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
