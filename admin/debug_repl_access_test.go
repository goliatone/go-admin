package admin

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	auth "github.com/goliatone/go-auth"
	"github.com/traefik/yaegi/interp"
)

type replPolicySocket struct {
	*stubWebSocketContext
	status chan int
}

type replPolicyReaderSocket struct {
	*blockingDebugWebSocketContext
	status atomic.Int32
}

func (s *replPolicyReaderSocket) CloseWithStatus(code int, _ string) error {
	s.status.Store(int32(code))
	return s.InterruptRead()
}

func (s *replPolicySocket) CloseWithStatus(code int, _ string) error {
	select {
	case s.status <- code:
	default:
	}
	return nil
}

func replPolicyConfig() DebugConfig {
	return DebugConfig{Enabled: true, Panels: []string{DebugPanelConsole, DebugPanelShell}, LiveRevalidateInterval: 5 * time.Millisecond, Repl: DebugREPLConfig{Enabled: true, AppEnabled: true, ShellEnabled: true, ReadOnly: new(false)}}
}

func TestDebugREPLUpgradeRejectsRevokedCurrentSession(t *testing.T) {
	for _, kind := range []string{DebugREPLKindApp, DebugREPLKindShell} {
		t.Run(kind, func(t *testing.T) {
			cfg := replPolicyConfig()
			var calls atomic.Int32
			cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) { calls.Add(1); return ctx, ErrForbidden }
			admin := mustNewAdmin(t, Config{BasePath: "/admin", DefaultLocale: "en", Debug: cfg}, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})
			admin.WithAuthorizer(allowAuthorizer{})
			routes := &stubWebSocketRouter{}
			admin.router = routes
			module := NewDebugModule(cfg)
			suffix := debugREPLAppPathSuffix
			if kind == DebugREPLKindShell {
				module.registerDebugREPLShellWebSocket(admin)
				suffix = debugREPLShellPathSuffix
			} else {
				module.registerDebugREPLAppWebSocket(admin)
			}
			_, err := routes.routeForSuffix(suffix).config.OnPreUpgrade(newDebugREPLMockContext(t, context.Background(), "127.0.0.1"))
			if !errors.Is(err, ErrForbidden) || calls.Load() == 0 {
				t.Fatalf("revoked upgrade: %v, resolver calls=%d", err, calls.Load())
			}
		})
	}
}

func TestDebugREPLIdleRevocationStopsBothLoops(t *testing.T) {
	for _, shell := range []bool{false, true} {
		t.Run(map[bool]string{false: "app", true: "shell"}[shell], func(t *testing.T) {
			var revoked atomic.Bool
			cfg := replPolicyConfig()
			cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) {
				if revoked.Load() {
					return ctx, ErrForbidden
				}
				return ctx, nil
			}
			admin := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
			socket := &replPolicySocket{stubWebSocketContext: newStubWebSocketContext(), status: make(chan int, 1)}
			access, err := newDebugREPLAccess(admin, cfg, socket, context.Background(), shell)
			if err != nil {
				t.Fatal(err)
			}
			defer access.Close()
			result := make(chan error, 1)
			go func() {
				reason := ""
				if shell {
					result <- runDebugREPLShellLoop(admin, access, cfg.Repl, DebugREPLSession{}, nil, socket, nil, nil, nil, nil, nil, nil, &reason)
				} else {
					result <- runDebugREPLAppLoop(admin, AdminContext{Context: access}, access, cfg.Repl, DebugREPLSession{}, nil, socket, nil, nil, nil, &reason)
				}
			}()
			revoked.Store(true)
			select {
			case err := <-result:
				if !errors.Is(err, ErrForbidden) {
					t.Fatal(err)
				}
			case <-time.After(time.Second):
				t.Fatal("idle revoked REPL stayed active")
			}
			select {
			case status := <-socket.status:
				if status != 1008 {
					t.Fatal(status)
				}
			case <-time.After(time.Second):
				t.Fatal("missing policy close")
			}
		})
	}
}

func TestDebugREPLPolicyClosePreservesDenialAndQuiescesReader(t *testing.T) {
	for _, shell := range []bool{false, true} {
		t.Run(map[bool]string{false: "app", true: "shell"}[shell], func(t *testing.T) {
			var revoked atomic.Bool
			cfg := replPolicyConfig()
			cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) {
				if revoked.Load() {
					return ctx, ErrForbidden
				}
				return ctx, nil
			}
			admin := mustNewAdmin(t, Config{DefaultLocale: "en", Debug: cfg}, Dependencies{Authorizer: allowAuthorizer{}})
			socket := &replPolicyReaderSocket{blockingDebugWebSocketContext: newBlockingDebugWebSocketContext(context.Background(), nil)}
			result := make(chan error, 1)
			go func() {
				if shell {
					result <- handleDebugREPLShellWebSocket(admin, cfg, socket)
				} else {
					result <- handleDebugREPLAppWebSocket(admin, cfg, socket)
				}
			}()
			waitForDebugWebSocketSignal(t, socket.readStarted, "REPL reader start")
			revoked.Store(true)
			select {
			case err := <-result:
				if !errors.Is(err, ErrForbidden) {
					t.Fatal("reader termination masked policy denial", err)
				}
			case <-time.After(time.Second):
				t.Fatal("revoked handler did not stop")
			}
			if socket.status.Load() != 1008 || socket.closeBeforeRead.Load() {
				t.Fatal("policy status or reader teardown ordering", socket.status.Load())
			}
			select {
			case <-socket.readReturned:
			default:
				t.Fatal("reader remained active")
			}
		})
	}
}

func TestDebugREPLCurrentPolicyRejectsExpiredChangedActorAndRoles(t *testing.T) {
	admin := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
	cfg := replPolicyConfig()
	expired := auth.WithClaimsContext(context.Background(), &auth.JWTClaims{UID: "alice", RegisteredClaims: jwt.RegisteredClaims{Subject: "alice", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Second))}})
	if _, err := debugREPLCurrentContext(admin, cfg, expired, false); !errors.Is(err, ErrForbidden) {
		t.Fatal("expired claims accepted", err)
	}
	actor := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", Role: "admin", TenantID: "a"})
	for _, updated := range []*auth.ActorContext{{ActorID: "bob", Role: "admin", TenantID: "a"}, {ActorID: "alice", Role: "admin", TenantID: "b"}, {ActorID: "alice", Role: "viewer", TenantID: "a"}} {
		cfg.Repl.AllowedRoles = []string{"admin"}
		cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) { return auth.WithActorContext(ctx, updated), nil }
		if _, err := debugREPLCurrentContext(admin, cfg, actor, false); !errors.Is(err, ErrForbidden) {
			t.Fatal("changed policy accepted", updated, err)
		}
	}
}

type replCurrentAuthorizer struct{ exec atomic.Bool }

func (a *replCurrentAuthorizer) Can(ctx context.Context, permission, _ string) bool {
	return permission != debugReplDefaultExecPermission || a.exec.Load()
}

func TestDebugREPLRefreshesHelpersAndExecGrants(t *testing.T) {
	authorizer := &replCurrentAuthorizer{}
	authorizer.exec.Store(true)
	admin := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: authorizer})
	cfg := replPolicyConfig()
	cfg.LiveRevalidateInterval = time.Second
	var version atomic.Int32
	type key struct{}
	cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) {
		return context.WithValue(ctx, key{}, version.Load()), nil
	}
	socket := &replPolicySocket{stubWebSocketContext: newStubWebSocketContext(), status: make(chan int, 1)}
	access, err := newDebugREPLAccess(admin, cfg, socket, context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer access.Close()
	cache := access.Value(resolvedPermissionsCacheContextKey{})
	version.Store(2)
	if err := access.Check(false); err != nil {
		t.Fatal(err)
	}
	if access.Value(key{}) != int32(2) || access.Value(resolvedPermissionsCacheContextKey{}) == cache {
		t.Fatal("helper context/grant cache remained stale")
	}
	authorizer.exec.Store(false)
	if err := access.Check(true); !errors.Is(err, ErrForbidden) {
		t.Fatal("revoked exec accepted", err)
	}
}

func TestDebugREPLRevocationCancelsBusyEvaluation(t *testing.T) {
	admin := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: allowAuthorizer{}})
	cfg := replPolicyConfig()
	var revoked atomic.Bool
	cfg.ResolveCurrentContext = func(ctx context.Context) (context.Context, error) {
		if revoked.Load() {
			return ctx, ErrForbidden
		}
		return ctx, nil
	}
	socket := &replPolicySocket{stubWebSocketContext: newStubWebSocketContext(), status: make(chan int, 1)}
	access, err := newDebugREPLAccess(admin, cfg, socket, context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer access.Close()
	i := interp.New(interp.Options{})
	result := make(chan error, 1)
	go func() { _, err, _ := debugREPLAppEval(access, i, "for {}", time.Minute); result <- err }()
	revoked.Store(true)
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("busy revoked evaluation stayed active")
	}
}

func TestDebugREPLExecRevocationCancelsRunningMutation(t *testing.T) {
	authorizer := &replCurrentAuthorizer{}
	authorizer.exec.Store(true)
	admin := mustNewAdmin(t, Config{DefaultLocale: "en"}, Dependencies{Authorizer: authorizer})
	socket := &replPolicySocket{stubWebSocketContext: newStubWebSocketContext(), status: make(chan int, 1)}
	access, err := newDebugREPLAccess(admin, replPolicyConfig(), socket, context.Background(), false)
	if err != nil {
		t.Fatal(err)
	}
	defer access.Close()
	endExec := access.BeginExec()
	defer endExec()
	authorizer.exec.Store(false)
	select {
	case <-access.Done():
		if !errors.Is(access.Result(), ErrForbidden) {
			t.Fatal(access.Result())
		}
	case <-time.After(time.Second):
		t.Fatal("running mutation retained revoked exec grant")
	}
}
