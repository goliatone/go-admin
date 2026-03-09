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

type testTxCommitErrorManager struct {
	tx      int
	runErr  error
	postErr error
	calls   int
}

func (m *testTxCommitErrorManager) WithTx(_ context.Context, fn func(tx int) error) error {
	m.calls++
	if m.runErr != nil {
		return m.runErr
	}
	if fn != nil {
		if err := fn(m.tx); err != nil {
			return err
		}
	}
	if m.postErr != nil {
		return m.postErr
	}
	return nil
}

func TestWithTxHooksNestedWithoutManagerDefersToOutermostCommit(t *testing.T) {
	ctx := context.Background()
	manager := &testTxManager{tx: 42}
	order := make([]string, 0, 2)
	ranInnerBeforeCommit := false

	if err := WithTxHooksContext[int](ctx, manager, func(txCtx context.Context, tx int, hooks *Hooks) error {
		if tx != 42 {
			t.Fatalf("expected outer tx=42, got %d", tx)
		}
		hooks.AfterCommit(func() error {
			order = append(order, "outer")
			return nil
		})
		if err := WithTxHooks[int](txCtx, nil, func(innerTx int, innerHooks *Hooks) error {
			if innerTx != 0 {
				t.Fatalf("expected zero inner tx when manager nil, got %d", innerTx)
			}
			if innerHooks != hooks {
				t.Fatal("expected nested call to reuse outer hooks collector")
			}
			innerHooks.AfterCommit(func() error {
				order = append(order, "inner")
				return nil
			})
			ranInnerBeforeCommit = len(order) > 0
			return nil
		}); err != nil {
			return err
		}
		if len(order) != 0 {
			t.Fatal("expected no hooks to run before outer commit")
		}
		return nil
	}); err != nil {
		t.Fatalf("WithTxHooks nested: %v", err)
	}
	if ranInnerBeforeCommit {
		t.Fatal("expected nested hook to be deferred until outer commit")
	}
	if len(order) != 2 || order[0] != "outer" || order[1] != "inner" {
		t.Fatalf("expected ordered hooks [outer inner], got %v", order)
	}
}

func TestWithTxHooksNestedWithoutManagerSkipsHooksOnOutermostCommitError(t *testing.T) {
	ctx := context.Background()
	sentinel := errors.New("outer commit failed")
	manager := &testTxCommitErrorManager{tx: 9, postErr: sentinel}
	ranHook := false

	err := WithTxHooksContext[int](ctx, manager, func(txCtx context.Context, tx int, hooks *Hooks) error {
		if tx != 9 {
			t.Fatalf("expected tx=9, got %d", tx)
		}
		return WithTxHooks[int](txCtx, nil, func(_ int, innerHooks *Hooks) error {
			innerHooks.AfterCommit(func() error {
				ranHook = true
				return nil
			})
			return nil
		})
	})
	if !errors.Is(err, sentinel) {
		t.Fatalf("expected outer commit error, got %v", err)
	}
	if ranHook {
		t.Fatal("expected nested after-commit hook not to run when outer commit fails")
	}
}
