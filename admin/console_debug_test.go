package admin

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	debugregistry "github.com/goliatone/go-admin/debug"
	auth "github.com/goliatone/go-auth"
)

func TestDebugConsoleCloseDeniesUpgradeAndPreservesLegacyRegistry(t *testing.T) {
	cfg := DebugConfig{Enabled: true, AllowedIPs: []string{"127.0.0.1"}, Panels: []string{DebugPanelRequests}}
	adm := mustNewAdmin(t, Config{BasePath: "/admin", Debug: cfg}, Dependencies{})
	rt := &stubWebSocketRouter{}
	adm.router = rt
	m := NewDebugModule(cfg)
	m.collector = NewDebugCollector(cfg)
	m.registerDebugWebSocket(adm)
	if m.consoleHost().config.Registry != debugregistry.DefaultRegistry() {
		t.Fatal("Debug lost default registration compatibility")
	}
	if err := m.Close(); err != nil {
		t.Fatal(err)
	}
	if err := m.Close(); err != nil {
		t.Fatal(err)
	}
	route := rt.routeForPath(debugRoutePath(adm, cfg, "admin.debug", "ws"))
	if _, err := route.config.OnPreUpgrade(newDebugSessionMockContext(t)); !errors.Is(err, ErrForbidden) {
		t.Fatal("closed Debug host upgraded", err)
	}
	if _, err := m.consoleHost().bindSocket(newStubWebSocketContext()); !errors.Is(err, ErrForbidden) {
		t.Fatal("closed Debug delivery bound")
	}
	if _, ok := debugregistry.Panel(DebugPanelRequests); !ok {
		t.Fatal("Close removed shared legacy registration")
	}
}

func TestDebugIdleLiveRevalidationUsesCurrentContext(t *testing.T) {
	var revoked atomic.Bool
	m := NewDebugModule(DebugConfig{Enabled: true, LiveRevalidateInterval: 5 * time.Millisecond, ResolveCurrentContext: func(ctx context.Context) (context.Context, error) {
		if revoked.Load() {
			return nil, ErrForbidden
		}
		return ctx, nil
	}})
	m.collector = NewDebugCollector(m.config)
	sub := newDebugSubscription()
	sub.lifecycleContext = context.Background()
	ws := newStubWebSocketContext()
	policySocket := &consolePolicyCloseSocket{stubWebSocketContext: ws}
	done := make(chan error, 1)
	go func() {
		done <- m.runDebugWebSocketLoop(policySocket, sub, make(chan debugCommand), make(chan error), make(chan struct{}), make(chan DebugEvent))
	}()
	revoked.Store(true)
	select {
	case err := <-done:
		if !errors.Is(err, ErrForbidden) {
			t.Fatal(err)
		}
		if policySocket.code != 1008 {
			t.Fatal("idle revocation did not signal policy closure", policySocket.code)
		}
	case <-time.After(time.Second):
		t.Fatal("Debug idle revocation did not close stream")
	}
}

type consolePolicyCloseSocket struct {
	*stubWebSocketContext
	code int
}

func (c *consolePolicyCloseSocket) CloseWithStatus(code int, _ string) error {
	c.code = code
	return nil
}

func TestDebugCurrentContextRejectsExpiryAndIdentityChange(t *testing.T) {
	claims := &auth.JWTClaims{UID: "alice", RegisteredClaims: jwt.RegisteredClaims{Subject: "alice", ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Second))}}
	ctx := auth.WithClaimsContext(context.Background(), claims)
	if _, err := debugCurrentContext(nil, DebugConfig{}, ctx, ""); !errors.Is(err, ErrForbidden) {
		t.Fatal("expired identity accepted")
	}
	ctx = auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", TenantID: "one"})
	cfg := DebugConfig{ResolveCurrentContext: func(ctx context.Context) (context.Context, error) {
		return auth.WithActorContext(ctx, &auth.ActorContext{ActorID: "alice", TenantID: "two"}), nil
	}}
	if _, err := debugCurrentContext(nil, cfg, ctx, ""); !errors.Is(err, ErrForbidden) {
		t.Fatal("scope changed in a retained stream")
	}
}

func TestDebugPreferenceScopeDoesNotAdoptAmbiguousLegacyState(t *testing.T) {
	m := NewDebugModule(DebugConfig{AppID: "app", Environment: "dev"})
	a := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", TenantID: "one"})
	b := auth.WithActorContext(context.Background(), &auth.ActorContext{ActorID: "alice", TenantID: "two"})
	key := debugPanelOrderStorageKey(m, a, "alice")
	if key == debugPanelOrderPreferenceKey || key == debugPanelOrderStorageKey(m, b, "alice") || key == debugPanelOrderStorageKey(m, a, "bob") {
		t.Fatal("Debug preferences crossed known identity scope")
	}
}
