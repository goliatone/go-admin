package admin

import (
	"context"
	"sync"
	"time"

	router "github.com/goliatone/go-router"
)

// REPL keeps its own role/read/exec policy while sharing Debug's trusted current
// identity resolution. Resolve against the original identity on every check.
func debugREPLCurrentContext(admin *Admin, cfg DebugConfig, ctx context.Context, requireExec bool) (context.Context, error) {
	if admin == nil {
		return ctx, ErrForbidden
	}
	ctx, err := debugResolveCurrentContext(admin, cfg, ctx)
	if err != nil {
		return ctx, ErrForbidden
	}
	repl := normalizeDebugREPLConfig(cfg.Repl)
	if !debugREPLRoleAllowed(ctx, repl.AllowedRoles) || requirePermissionWithAuthorizer(admin.authorizer, ctx, repl.Permission, debugReplResource) != nil {
		return ctx, ErrForbidden
	}
	if requireExec && (repl.ReadOnlyEnabled() || requirePermissionWithAuthorizer(admin.authorizer, ctx, repl.ExecPermission, debugReplResource) != nil) {
		return ctx, ErrForbidden
	}
	return ctx, nil
}

// The context exposed to interpreter helpers reads refreshed values, but its
// lifetime is the socket's lifetime. The monitor is independent of evaluation
// and output so idle and busy sessions have the same revocation bound.
type debugREPLAccess struct {
	context.Context
	admin     *Admin
	cfg       DebugConfig
	c         router.WebSocketContext
	cancel    context.CancelFunc
	stop      func() bool
	done      chan struct{}
	mu        sync.RWMutex
	current   context.Context
	policyErr error
	executing bool
}

func newDebugREPLAccess(admin *Admin, cfg DebugConfig, c router.WebSocketContext, ctx context.Context, requireExec bool) (*debugREPLAccess, error) {
	if ctx == nil {
		ctx = c.Context()
	}
	lifetime, cancel := context.WithCancel(context.WithoutCancel(ctx))
	a := &debugREPLAccess{Context: lifetime, admin: admin, cfg: cfg, c: c, cancel: cancel, done: make(chan struct{}), current: lifetime}
	a.stop = context.AfterFunc(c.Context(), cancel)
	if err := a.Check(requireExec); err != nil {
		a.stop()
		cancel()
		return nil, err
	}
	go func() {
		defer close(a.done)
		ticker := time.NewTicker(debugDeliveryInterval(cfg))
		defer ticker.Stop()
		for {
			select {
			case <-lifetime.Done():
				return
			case <-ticker.C:
				if a.Check(requireExec) != nil {
					return
				}
			}
		}
	}()
	return a, nil
}

func (a *debugREPLAccess) Value(key any) any {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.current.Value(key)
}

func (a *debugREPLAccess) Check(requireExec bool) error {
	a.mu.Lock()
	if a.policyErr != nil {
		err := a.policyErr
		a.mu.Unlock()
		return err
	}
	if a.Err() != nil {
		a.mu.Unlock()
		return a.Err()
	}
	current, err := debugREPLCurrentContext(a.admin, a.cfg, a.Context, requireExec || a.executing)
	if err == nil {
		a.current = current
	} else {
		a.policyErr = ErrForbidden
	}
	a.mu.Unlock()
	if err != nil {
		a.cancel()
		return preserveDebugWebSocketPrimaryError(ErrForbidden, a.c.CloseWithStatus(1008, "console access changed"))
	}
	return nil
}

func (a *debugREPLAccess) Result() error {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.policyErr
}

// App sessions retain read access when idle, but an executing mutation must
// retain its exec grant until evaluation and result delivery finish.
func (a *debugREPLAccess) BeginExec() func() {
	a.mu.Lock()
	a.executing = true
	a.mu.Unlock()
	return func() {
		a.mu.Lock()
		a.executing = false
		a.mu.Unlock()
	}
}

func (a *debugREPLAccess) Close() {
	a.cancel()
	a.stop()
	<-a.done
}
