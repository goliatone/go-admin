package quickstart

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-admin/admin"
	router "github.com/goliatone/go-router"
	"github.com/goliatone/go-router/eventstream"
	"github.com/goliatone/go-router/ssefiber"
	"github.com/gorilla/websocket"
)

func TestFiberHostingOwnedStreams(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		for _, bounded := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/bounded=%t", major, bounded), func(t *testing.T) {
				if major == "v2" {
					s, r := NewFiberServer(nil, admin.Config{BasePath: "/admin"}, nil, false, WithFiberLogger(false))
					qualifyQuickstartStreams(t, s, r, bounded)
				} else {
					s, r := NewFiberV3Server(nil, admin.Config{BasePath: "/admin"}, nil, false, WithFiberV3Logger(false))
					qualifyQuickstartStreams(t, s, r, bounded)
				}
			})
		}
	}
}

// The application owns upgraded sockets and event subscriptions. OnShutdown
// closes them explicitly; managed completion must join their teardown.
func qualifyQuickstartStreams[T any](t *testing.T, s router.Server[T], r router.Router[T], bounded bool) {
	t.Helper()
	if bounded {
		if err := s.(router.BoundedIngressServer).ConfigureBoundedIngress(router.BoundedIngressOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	stream := eventstream.New()
	cancels := make(chan context.CancelFunc, 1)
	err := ssefiber.Mount(r, ssefiber.WithStream(stream), ssefiber.WithScopeResolver(func(router.Context) (eventstream.Scope, error) { return eventstream.Scope{"tenant": "test"}, nil }), ssefiber.WithHeartbeatInterval(10*time.Millisecond), ssefiber.WithHeartbeatBounds(time.Millisecond, time.Second), ssefiber.WithMiddlewares(func(next router.HandlerFunc) router.HandlerFunc {
		return func(c router.Context) error {
			ctx, cancel := context.WithCancel(c.Context())
			cancels <- cancel
			c.SetContext(ctx)
			return next(c)
		}
	}))
	if err != nil {
		t.Fatal(err)
	}
	ready, joined := make(chan struct{}), make(chan struct{})
	var mu sync.Mutex
	var socket router.WebSocketContext
	wsConfig := router.DefaultWebSocketConfig()
	wsConfig.DisableReadDeadline = true
	r.WebSocket("/ws", wsConfig, func(c router.WebSocketContext) error {
		defer close(joined)
		mu.Lock()
		socket = c
		mu.Unlock()
		close(ready)
		_, _, _ = c.ReadMessage()
		return nil
	})
	stopStreams := func() {
		select {
		case cancel := <-cancels:
			cancel()
		default:
		}
		mu.Lock()
		ws := socket
		mu.Unlock()
		if ws != nil {
			_ = ws.Close()
		}
	}
	var hooks atomic.Int32
	run, err := s.(router.ManagedServer).StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: 2 * time.Second, OnShutdown: func(ctx context.Context) error {
		hooks.Add(1)
		stopStreams()
		select {
		case <-joined:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		stopStreams()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = run.Stop(ctx)
		_ = run.Wait(ctx)
	})
	hostingWait(t, run.Serving(), "stream host Serving")
	ws, response, err := (&websocket.Dialer{HandshakeTimeout: time.Second}).Dial("ws://"+run.Address()+"/ws", nil)
	if response != nil && response.Body != nil {
		_ = response.Body.Close()
	}
	if err != nil {
		t.Fatal(err)
	}
	defer ws.Close()
	hostingWait(t, ready, "websocket upgrade")
	conn, err := net.DialTimeout("tcp", run.Address(), time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if err := conn.SetDeadline(time.Now().Add(4 * time.Second)); err != nil {
		t.Fatal(err)
	}
	if _, err := io.WriteString(conn, "GET /events HTTP/1.1\r\nHost: test\r\n\r\n"); err != nil {
		t.Fatal(err)
	}
	res, err := http.ReadResponse(bufio.NewReader(conn), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("SSE status: %d", res.StatusCode)
	}
	reader := bufio.NewReader(res.Body)
	heartbeat := false
	for range 20 {
		line, err := reader.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasPrefix(line, "event: heartbeat") {
			heartbeat = true
		}
		if heartbeat && line == "\n" {
			break
		}
	}
	if !heartbeat || stream.SnapshotStats().ActiveSubscribers != 1 {
		t.Fatal("SSE lifetime ended at handler return")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := run.Stop(ctx); err != nil {
		t.Fatal(err)
	}
	if err := run.Wait(ctx); err != nil {
		t.Fatal(err)
	}
	hostingWait(t, joined, "websocket reader joined")
	if stream.SnapshotStats().ActiveSubscribers != 0 {
		t.Fatal("SSE subscription leaked")
	}
	if err := run.Stop(ctx); err != nil {
		t.Fatal(err)
	}
	if hooks.Load() != 1 {
		t.Fatalf("shutdown callbacks: %d", hooks.Load())
	}
	if err := ws.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	if _, _, err := ws.ReadMessage(); err == nil {
		t.Fatal("host-owned socket remains open")
	}
	if _, err := io.Copy(io.Discard, reader); err != nil {
		t.Fatalf("SSE did not end cleanly: %v", err)
	}
}

func TestFiberHostingBindAndCancellation(t *testing.T) {
	for _, major := range []string{"v2", "v3"} {
		t.Run(major+"/occupied-address", func(t *testing.T) {
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer listener.Close()
			p := hostingProbeFor(t, major, false)
			run, err := p.host.StartManaged(context.Background(), router.ManagedOptions{Address: listener.Addr().String(), DrainTimeout: time.Second})
			if err != nil {
				t.Fatal(err)
			}
			hostingWait(t, run.Done(), "bind failure")
			var op *net.OpError
			if err := run.Wait(context.Background()); !errors.As(err, &op) {
				t.Fatalf("lost bind error: %v", err)
			}
			select {
			case <-run.Bound():
				t.Fatal("bound occupied address")
			default:
			}
			select {
			case <-run.Serving():
				t.Fatal("served occupied address")
			default:
			}
		})
		t.Run(major+"/cancel-serving-and-retry-stop", func(t *testing.T) {
			p := hostingProbeFor(t, major, false)
			var hooks atomic.Int32
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			run, err := p.host.StartManaged(ctx, router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second, OnShutdown: func(context.Context) error { hooks.Add(1); return nil }})
			if err != nil {
				t.Fatal(err)
			}
			hostingWait(t, run.Serving(), "Serving before parent cancellation")
			cancel()
			hostingWait(t, run.Done(), "parent cancellation")
			stopCtx, stop := context.WithTimeout(context.Background(), time.Second)
			defer stop()
			for range 2 {
				if err := run.Stop(stopCtx); !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
				if err := run.Wait(stopCtx); !errors.Is(err, context.Canceled) {
					t.Fatal(err)
				}
			}
			if hooks.Load() != 1 {
				t.Fatalf("shutdown callbacks: %d", hooks.Load())
			}
			if _, err := p.host.StartManaged(context.Background(), router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second}); !errors.Is(err, router.ErrManagedAlreadyStarted) {
				t.Fatalf("restarted single-use server: %v", err)
			}
		})
	}
}
