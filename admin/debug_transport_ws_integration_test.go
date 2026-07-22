package admin

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"testing"
	"time"

	auth "github.com/goliatone/go-auth"
	router "github.com/goliatone/go-router"
	"github.com/gorilla/websocket"
)

func TestDebugWebSocketReaderLifecycleSurvivesFiberHijackTeardown(t *testing.T) {
	server := router.NewFiberAdapter().(*router.FiberAdapter) //nolint:errcheck // test requires the concrete Fiber adapter.
	config := router.DefaultWebSocketConfig()
	handlerDone := make(chan struct{}, 4)
	server.Router().WebSocket("/debug-reader-lifecycle", config, func(c router.WebSocketContext) error {
		defer func() { handlerDone <- struct{}{} }()
		defer closeDebugWebSocket(c)
		reader := startDebugWebSocketJSONReader[debugCommand](c, 0, false)
		defer reader.Stop(c)

		select {
		case <-reader.messages:
			return nil
		case err := <-reader.errors:
			return err
		case <-time.After(time.Second):
			return errors.New("timed out waiting for debug command")
		}
	})

	address, shutdown := startAdminFiberServer(t, server)
	defer shutdown()

	for attempt := range 4 {
		conn, resp, err := websocket.DefaultDialer.Dial("ws://"+address+"/debug-reader-lifecycle", nil)
		if err != nil {
			if resp != nil {
				_ = resp.Body.Close()
			}
			t.Fatalf("attempt %d: websocket dial failed: %v", attempt+1, err)
		}
		if resp != nil {
			_ = resp.Body.Close()
		}

		if err := conn.WriteJSON(map[string]string{"type": "subscribe"}); err != nil {
			_ = conn.Close()
			t.Fatalf("attempt %d: write command: %v", attempt+1, err)
		}

		select {
		case <-handlerDone:
		case <-time.After(time.Second):
			_ = conn.Close()
			t.Fatalf("attempt %d: handler did not quiesce reader and return", attempt+1)
		}

		_ = conn.SetReadDeadline(time.Now().Add(time.Second))
		if _, _, err := conn.ReadMessage(); err == nil {
			_ = conn.Close()
			t.Fatalf("attempt %d: expected server to close websocket", attempt+1)
		}
		_ = conn.Close()
	}
}

func TestDebugWebSocketUnauthenticatedUpgradeFailsWithoutRedirectHeaders(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			Permission: debugDefaultPermission,
			Panels:     []string{DebugPanelRequests, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})

	authCfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: cfg}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, authCfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	adm.WithAuth(NewGoAuthAuthenticator(routeAuth, authCfg, WithAuthErrorHandler(func(c router.Context, err error) error {
		return c.Redirect("/login", http.StatusFound)
	})), &AuthConfig{LoginPath: "/login", RedirectPath: "/admin"})
	adm.WithAuthorizer(allowAuthorizer{})

	server := router.NewFiberAdapter().(*router.FiberAdapter) //nolint:errcheck // legacy test setup intentionally ignores this helper result after scenario assertions.
	if initErr := adm.Initialize(server.Router()); initErr != nil {
		t.Fatalf("initialize: %v", initErr)
	}
	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugWebSocket(adm)

	address, shutdown := startAdminFiberServer(t, server)
	defer shutdown()

	wsURL := "ws://" + address + "/admin/debug/ws"
	headers := http.Header{}
	headers.Set("Origin", "http://"+address)

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, headers)
	if err == nil {
		_ = conn.Close() //nolint:errcheck // test cleanup failure cannot change the already-asserted behavior.
		t.Fatal("expected unauthenticated websocket dial to fail")
	}
	if resp == nil {
		t.Fatalf("expected handshake response, got nil error=%v", err)
	}
	defer resp.Body.Close() //nolint:errcheck // test cleanup failure cannot change the already-asserted behavior.
	if resp.StatusCode == http.StatusSwitchingProtocols {
		t.Fatalf("expected unauthenticated websocket dial to avoid 101, got %d", resp.StatusCode)
	}
	if got := strings.TrimSpace(resp.Header.Get("Location")); got != "" {
		t.Fatalf("expected unauthenticated websocket rejection without redirect header, got %q", got)
	}
}

func TestDebugWebSocketAuthenticatedUpgradeSucceedsWithCookieAuth(t *testing.T) {
	cfg := Config{
		BasePath:      "/admin",
		DefaultLocale: "en",
		Debug: DebugConfig{
			Enabled:    true,
			Permission: debugDefaultPermission,
			Panels:     []string{DebugPanelRequests, DebugPanelSQL},
		},
	}
	adm := mustNewAdmin(t, cfg, Dependencies{FeatureGate: featureGateFromFlags(map[string]bool{"debug": true})})

	authCfg := cookieTestAuthConfig{signingKey: "test-secret", adminCfg: cfg}
	provider := &stubIdentityProvider{identity: testIdentity{
		id:       "user-123",
		username: "user@example.com",
		email:    "user@example.com",
		role:     string(auth.RoleAdmin),
	}}
	auther := auth.NewAuthenticator(provider, authCfg)
	routeAuth, err := auth.NewHTTPAuthenticator(auther, authCfg)
	if err != nil {
		t.Fatalf("http authenticator: %v", err)
	}
	goAuth := NewGoAuthAuthenticator(routeAuth, authCfg, WithAuthErrorHandler(func(c router.Context, err error) error {
		return c.Redirect("/login", http.StatusFound)
	}))
	adm.WithAuth(goAuth, &AuthConfig{LoginPath: "/login", RedirectPath: "/admin"})
	adm.WithAuthorizer(allowAuthorizer{})

	server := router.NewFiberAdapter().(*router.FiberAdapter) //nolint:errcheck // legacy test setup intentionally ignores this helper result after scenario assertions.
	if initErr := adm.Initialize(server.Router()); initErr != nil {
		t.Fatalf("initialize: %v", initErr)
	}
	mod := NewDebugModule(cfg.Debug)
	mod.collector = NewDebugCollector(cfg.Debug)
	mod.registerDebugWebSocket(adm)

	address, shutdown := startAdminFiberServer(t, server)
	defer shutdown()

	token, err := auther.TokenService().Generate(provider.identity, nil)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	wsURL := "ws://" + address + "/admin/debug/ws"
	headers := http.Header{}
	headers.Set("Origin", "http://"+address)
	headers.Add("Cookie", (&http.Cookie{Name: authCfg.GetContextKey(), Value: token}).String())

	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, headers)
	if err != nil {
		if resp != nil {
			t.Fatalf("expected authenticated websocket dial to succeed, got %v status=%d", err, resp.StatusCode)
		}
		t.Fatalf("expected authenticated websocket dial to succeed, got %v", err)
	}
	defer mustClose(t, "conn", conn)

	if resp == nil || resp.StatusCode != http.StatusSwitchingProtocols {
		if resp == nil {
			t.Fatal("expected handshake response for authenticated websocket dial")
		}
		t.Fatalf("expected authenticated websocket dial to upgrade, got %d", resp.StatusCode)
	}
	defer resp.Body.Close() //nolint:errcheck // test cleanup failure cannot change the already-asserted behavior.
	if got := strings.TrimSpace(resp.Header.Get("Location")); got != "" {
		t.Fatalf("expected successful websocket upgrade without redirect header, got %q", got)
	}
}

func startAdminFiberServer(t *testing.T, app *router.FiberAdapter) (string, func()) {
	t.Helper()

	listener, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to allocate listener: %v", err)
	}

	fiberApp := app.WrappedRouter()
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- fiberApp.Listener(listener)
	}()

	time.Sleep(50 * time.Millisecond)

	shutdown := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_ = app.Shutdown(ctx) //nolint:errcheck // test cleanup failure cannot change the already-asserted behavior.
		select {
		case <-serverErr:
		case <-time.After(500 * time.Millisecond):
		}
	}

	return listener.Addr().String(), shutdown
}
