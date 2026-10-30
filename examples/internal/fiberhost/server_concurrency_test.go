package fiberhost

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
	"github.com/goliatone/go-router"
)

func TestShutdownConcurrentNativeRetriesHonorDeadlines(t *testing.T) {
	listener, err := (&net.ListenConfig{}).Listen(t.Context(), "tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	observed := &shutdownTestListener{Listener: listener, closed: make(chan struct{})}
	native := router.NewFiberV3Adapter()
	server := New(native)
	entered, released := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	release := func() { releaseOnce.Do(func() { close(released) }) }
	server.Router().Get("/hold", func(c router.Context) error {
		close(entered)
		<-released
		return c.SendString("drained")
	})
	served := make(chan error, 1)
	go func() {
		served <- native.WrappedRouter().Listener(observed, fiber.ListenConfig{DisableStartupMessage: true})
	}()
	t.Cleanup(func() {
		release()
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if cleanupErr := server.Shutdown(ctx); cleanupErr != nil {
			t.Errorf("cleanup shutdown: %v", cleanupErr)
		}
		if serveErr := waitShutdownResult(t, served); serveErr != nil {
			t.Errorf("serve: %v", serveErr)
		}
	})
	client := &http.Client{Timeout: 5 * time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
	t.Cleanup(client.CloseIdleConnections)
	request, err := http.NewRequestWithContext(t.Context(), http.MethodGet, "http://"+listener.Addr().String()+"/hold", nil)
	if err != nil {
		t.Fatal(err)
	}
	requested := make(chan error, 1)
	go func() {
		response, requestErr := client.Do(request)
		if requestErr == nil {
			_, readErr := io.Copy(io.Discard, response.Body)
			requestErr = errors.Join(readErr, response.Body.Close())
		}
		requested <- requestErr
	}()
	t.Cleanup(func() {
		release()
		if requestErr := waitShutdownResult(t, requested); requestErr != nil {
			t.Errorf("HTTP request: %v", requestErr)
		}
	})
	waitSocketDone(t, entered)
	first := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(t.Context(), 3*time.Second)
		defer cancel()
		first <- server.Shutdown(ctx)
	}()
	t.Cleanup(func() {
		release()
		if firstErr := waitShutdownResult(t, first); firstErr != nil {
			t.Errorf("initial shutdown: %v", firstErr)
		}
	})
	// The native server closes listeners while holding its shutdown mutex.
	// Keep its HTTP handler blocked so the first call continues to hold it.
	waitSocketDone(t, observed.closed)
	for range 5 {
		result := make(chan error, 1)
		go func() {
			ctx, cancel := context.WithTimeout(t.Context(), 5*time.Millisecond)
			defer cancel()
			result <- server.Shutdown(ctx)
		}()
		select {
		case retryErr := <-result:
			if !errors.Is(retryErr, context.DeadlineExceeded) {
				t.Fatalf("queued retry = %v, want deadline exceeded", retryErr)
			}
		case <-time.After(500 * time.Millisecond):
			release()
			if retryErr := waitShutdownResult(t, result); !errors.Is(retryErr, context.DeadlineExceeded) {
				t.Errorf("late retry = %v, want deadline exceeded", retryErr)
			}
			t.Fatal("queued retry ignored its deadline while native shutdown was draining")
		}
	}
	release()
	ctx, cancel := context.WithTimeout(t.Context(), time.Second)
	defer cancel()
	if retryErr := server.Shutdown(ctx); retryErr != nil {
		t.Fatalf("retry after HTTP drain: %v", retryErr)
	}
}

func TestShutdownRacingWorkerAdmission(t *testing.T) {
	for _, admitted := range []bool{false, true} {
		name := "before-admission"
		if admitted {
			name = "after-admission-before-context-install"
		}
		t.Run(name, func(t *testing.T) {
			server, _ := newShutdownTestServer()
			reached, released := make(chan struct{}), make(chan struct{})
			var releaseOnce sync.Once
			release := func() { releaseOnce.Do(func() { close(released) }) }
			socket := &admissionTestSocket{
				shutdownTestSocket: &shutdownTestSocket{ctx: t.Context()},
				afterAdmission:     admitted, reached: reached, released: released,
			}
			done := make(chan struct{})
			var handlerCalled bool
			var handlerContextErr, workerErr error
			go func() {
				defer close(done)
				workerErr = server.handleWebSocket(socket, func(ws router.WebSocketContext) error {
					handlerCalled = true
					handlerContextErr = ws.Context().Err()
					return nil
				})
			}()
			t.Cleanup(func() { release(); waitSocketDone(t, done) })
			waitSocketDone(t, reached)
			ctx, cancel := context.WithTimeout(t.Context(), 5*time.Millisecond)
			err := server.Shutdown(ctx)
			cancel()
			if admitted && !errors.Is(err, context.DeadlineExceeded) {
				t.Fatalf("shutdown lost admitted worker: %v", err)
			}
			if !admitted && err != nil {
				t.Fatalf("shutdown counted worker before admission: %v", err)
			}
			release()
			waitSocketDone(t, done)
			if workerErr != nil || !socket.closed.Load() {
				t.Fatalf("worker cleanup: err=%v closed=%v", workerErr, socket.closed.Load())
			}
			if handlerCalled != admitted {
				t.Fatalf("handler called=%v, admitted=%v", handlerCalled, admitted)
			}
			if admitted && !errors.Is(handlerContextErr, context.Canceled) {
				t.Fatalf("late context installation lost shutdown cancellation: %v", handlerContextErr)
			}
			if err := server.Shutdown(t.Context()); err != nil {
				t.Fatalf("retry after cleanup: %v", err)
			}
		})
	}
}

type shutdownTestListener struct {
	net.Listener
	once   sync.Once
	closed chan struct{}
}

func (l *shutdownTestListener) Close() error {
	err := l.Listener.Close()
	l.once.Do(func() { close(l.closed) })
	return err
}

type admissionTestSocket struct {
	*shutdownTestSocket
	afterAdmission bool
	once           sync.Once
	reached        chan struct{}
	released       <-chan struct{}
}

func (s *admissionTestSocket) pause() {
	s.once.Do(func() { close(s.reached); <-s.released })
}

func (s *admissionTestSocket) Context() context.Context {
	if !s.afterAdmission {
		s.pause()
	}
	return s.shutdownTestSocket.Context()
}

func (s *admissionTestSocket) SetContext(ctx context.Context) {
	if s.afterAdmission {
		s.pause()
	}
	s.shutdownTestSocket.SetContext(ctx)
}
