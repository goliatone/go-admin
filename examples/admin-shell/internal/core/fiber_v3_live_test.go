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
			listener, err := net.Listen("tcp4", "127.0.0.1:0")
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
					_, _, err := ws.ReadMessage()
					return err
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
				if err := host.Shutdown(ctx); err != nil {
					t.Errorf("cleanup: %v", err)
				}
			})
			client := &http.Client{Timeout: 4 * time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
			defer client.CloseIdleConnections()
			readyDeadline := time.Now().Add(5 * time.Second)
			for {
				resp, err := client.Get("http://" + address + "/readyz")
				if err == nil {
					_, _ = io.Copy(io.Discard, resp.Body)
					_ = resp.Body.Close()
					if resp.StatusCode == 200 {
						break
					}
				}
				select {
				case err := <-served:
					t.Fatalf("early exit: %v", err)
				default:
				}
				if time.Now().After(readyDeadline) {
					t.Fatal("readiness timeout")
				}
				time.Sleep(10 * time.Millisecond)
			}
			ws, responseUpgrade, err := websocket.DefaultDialer.Dial("ws://"+address+"/adoption/owned/ws", nil)
			if responseUpgrade != nil {
				_ = responseUpgrade.Body.Close()
			}
			if err != nil {
				t.Fatal(err)
			}
			defer ws.Close()
			select {
			case <-socketEntered:
			case <-time.After(3 * time.Second):
				t.Fatal("socket worker did not start")
			}
			response := make(chan error, 1)
			go func() {
				resp, err := client.Get("http://" + address + "/adoption-drain")
				if err == nil {
					var body []byte
					body, err = io.ReadAll(resp.Body)
					err = errors.Join(err, resp.Body.Close())
					if resp.StatusCode != 200 || string(body) != "drained" {
						err = errors.Join(err, errors.New("request did not drain"))
					}
				}
				response <- err
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
				case err := <-served:
					t.Fatalf("returned before request drained: %v", err)
				case <-time.After(50 * time.Millisecond):
				}
			}
			select {
			case <-socketLeft:
			case <-time.After(3 * time.Second):
				t.Fatal("owned socket reader did not leave")
			}
			if err := ws.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
				t.Fatal(err)
			}
			if _, _, err := ws.ReadMessage(); err == nil {
				t.Fatal("owned socket stayed open")
			}
			release()
			select {
			case err := <-response:
				if err != nil {
					t.Fatal(err)
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
