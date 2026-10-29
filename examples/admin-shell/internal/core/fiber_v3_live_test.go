package core_test

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-admin/examples/admin-shell/config"
	"github.com/goliatone/go-admin/examples/admin-shell/internal/core"
	apphttp "github.com/goliatone/go-admin/examples/admin-shell/internal/http"
	"github.com/goliatone/go-router"
	"github.com/gorilla/websocket"
)

func TestStarterFiberV3LiveLifecycle(t *testing.T) {
	for _, deadline := range []bool{false, true} {
		name := "drain"
		if deadline {
			name = "deadline-and-retry"
		}
		t.Run(name, func(t *testing.T) {
			listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp4", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			address := listener.Addr().String()
			if err = listener.Close(); err != nil {
				t.Fatal(err)
			}
			cfg := config.Defaults()
			cfg.Server.Address = address
			cfg.Server.PrintRoutes = false
			host, err := core.New(context.Background(), &cfg, core.WithRouteRegistrar(apphttp.Register))
			if err != nil {
				t.Fatal(err)
			}
			entered, released := make(chan struct{}), make(chan struct{})
			var releaseOnce sync.Once
			release := func() { releaseOnce.Do(func() { close(released) }) }
			host.Server.Router().Get("/adoption-drain", func(c router.Context) error { close(entered); <-released; return c.SendString("drained") })
			socketEntered, socketLeft := make(chan struct{}), make(chan struct{})
			host.Server.Router().Group("/adoption").WithGroup("/owned", func(r router.Router[*fiber.App]) {
				r.WebSocket("/ws", router.DefaultWebSocketConfig(), func(ws router.WebSocketContext) error {
					close(socketEntered)
					defer close(socketLeft)
					_, _, readErr := ws.ReadMessage()
					return readErr
				})
			})
			runCtx, cancel := context.WithCancel(context.Background())
			served := make(chan error, 1)
			go func() { served <- host.Run(runCtx) }()
			t.Cleanup(func() {
				release()
				cancel()
				ctx, stop := context.WithTimeout(context.Background(), 3*time.Second)
				defer stop()
				if shutdownErr := host.Shutdown(ctx); shutdownErr != nil {
					t.Errorf("cleanup: %v", shutdownErr)
				}
			})
			client := &http.Client{Timeout: 4 * time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
			defer client.CloseIdleConnections()
			readyDeadline := time.Now().Add(5 * time.Second)
			for {
				resp, readyErr := lifecycleGet(t.Context(), client, "http://"+address+"/readyz")
				if readyErr == nil {
					_, copyErr := io.Copy(io.Discard, resp.Body)
					if cleanupErr := errors.Join(copyErr, resp.Body.Close()); cleanupErr != nil {
						t.Fatal(cleanupErr)
					}
					if resp.StatusCode == http.StatusOK {
						break
					}
				}
				select {
				case serveErr := <-served:
					t.Fatalf("early exit: %v", serveErr)
				default:
				}
				if time.Now().After(readyDeadline) {
					t.Fatal("readiness timeout")
				}
				time.Sleep(10 * time.Millisecond)
			}
			ws, responseUpgrade, err := websocket.DefaultDialer.Dial("ws://"+address+"/adoption/owned/ws", nil)
			if responseUpgrade != nil {
				if closeErr := responseUpgrade.Body.Close(); closeErr != nil {
					t.Fatal(closeErr)
				}
			}
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if closeErr := ws.Close(); closeErr != nil {
					t.Error(closeErr)
				}
			}()
			select {
			case <-socketEntered:
			case <-time.After(3 * time.Second):
				t.Fatal("socket worker did not start")
			}
			response := make(chan error, 1)
			go func() {
				resp, requestErr := lifecycleGet(t.Context(), client, "http://"+address+"/adoption-drain")
				if requestErr == nil {
					var body []byte
					body, requestErr = io.ReadAll(resp.Body)
					requestErr = errors.Join(requestErr, resp.Body.Close())
					if resp.StatusCode != http.StatusOK || string(body) != "drained" {
						requestErr = errors.Join(requestErr, errors.New("request did not drain"))
					}
				}
				response <- requestErr
			}()
			select {
			case <-entered:
			case <-time.After(5 * time.Second):
				t.Fatal("request did not enter")
			}
			if deadline {
				ctx, stop := context.WithTimeout(context.Background(), 50*time.Millisecond)
				started := time.Now()
				err = host.Shutdown(ctx)
				stop()
				if !errors.Is(err, context.DeadlineExceeded) {
					t.Fatalf("shutdown error=%v, want deadline", err)
				}
				if time.Since(started) > time.Second {
					t.Fatal("shutdown exceeded deadline bound")
				}
			} else {
				cancel()
				select {
				case serveErr := <-served:
					t.Fatalf("returned before request drained: %v", serveErr)
				case <-time.After(50 * time.Millisecond):
				}
			}
			select {
			case <-socketLeft:
			case <-time.After(3 * time.Second):
				t.Fatal("owned socket reader did not leave")
			}
			if deadlineErr := ws.SetReadDeadline(time.Now().Add(time.Second)); deadlineErr != nil {
				t.Fatal(deadlineErr)
			}
			if _, _, readErr := ws.ReadMessage(); readErr == nil {
				t.Fatal("owned socket stayed open")
			}
			release()
			select {
			case responseErr := <-response:
				if responseErr != nil {
					t.Fatal(responseErr)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("response timeout")
			}
			if deadline {
				ctx, stop := context.WithTimeout(context.Background(), 3*time.Second)
				err = host.Shutdown(ctx)
				stop()
				if err != nil {
					t.Fatalf("retry: %v", err)
				}
				cancel()
			}
			select {
			case err := <-served:
				if err != nil {
					t.Fatal(err)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("server did not exit")
			}
		})
	}
}

func lifecycleGet(ctx context.Context, client *http.Client, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return client.Do(req)
}
