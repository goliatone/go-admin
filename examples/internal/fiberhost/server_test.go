package fiberhost

import (
	"context"
	"errors"
	"runtime"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/goliatone/go-router"
)

func TestShutdownStuckWorkerRepeatedTimeoutsAndRetry(t *testing.T) {
	server, native := newShutdownTestServer()
	socket := &shutdownTestSocket{ctx: t.Context()}
	release, done := startBlockedSocket(t, server, socket)
	baseline := runtime.NumGoroutine()
	const attempts = 20
	for range attempts {
		ctx, cancel := context.WithTimeout(t.Context(), 5*time.Millisecond)
		started := time.Now()
		err := server.Shutdown(ctx)
		cancel()
		if !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("shutdown error = %v, want deadline exceeded", err)
		}
		if time.Since(started) > time.Second {
			t.Fatal("shutdown exceeded its deadline bound")
		}
	}
	// The worker intentionally ignores cancellation and InterruptRead. Timeout
	// attempts must not accumulate goroutines waiting for it to finish.
	runtime.Gosched()
	if growth := runtime.NumGoroutine() - baseline; growth > 3 {
		t.Errorf("%d timeouts added %d goroutines with one stuck worker", attempts, growth)
	}
	if socket.Context().Err() == nil || socket.interrupts.Load() != attempts {
		t.Fatal("shutdown did not cancel and interrupt the admitted worker")
	}
	if socket.closed.Load() {
		t.Fatal("stuck worker was marked closed before its cleanup")
	}
	for _, ctx := range native.contexts() {
		if !errors.Is(ctx.Err(), context.DeadlineExceeded) {
			t.Fatal("underlying shutdown did not receive the caller's expired context")
		}
	}
	rejected := &shutdownTestSocket{ctx: t.Context()}
	called := false
	if err := server.handleWebSocket(rejected, func(router.WebSocketContext) error {
		called = true
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if called || !rejected.closed.Load() {
		t.Fatal("shutdown admitted a new WebSocket worker")
	}

	release()
	waitSocketDone(t, done)
	for range 2 {
		ctx, cancel := context.WithTimeout(t.Context(), time.Second)
		err := server.Shutdown(ctx)
		cancel()
		if err != nil {
			t.Fatalf("retry after worker exit: %v", err)
		}
	}
	if got := len(native.contexts()); got != attempts+2 {
		t.Fatalf("underlying shutdown called %d times, want %d", got, attempts+2)
	}
}

func TestShutdownConcurrentRetriesWaitForEveryWorker(t *testing.T) {
	server, _ := newShutdownTestServer()
	releaseFirst, firstDone := startBlockedSocket(t, server, &shutdownTestSocket{ctx: t.Context()})
	releaseLast, lastDone := startBlockedSocket(t, server, &shutdownTestSocket{ctx: t.Context()})
	const callers = 8
	results := make(chan error, callers)
	for range callers {
		go func() {
			ctx, cancel := context.WithTimeout(t.Context(), 10*time.Millisecond)
			defer cancel()
			results <- server.Shutdown(ctx)
		}()
	}
	for range callers {
		if err := waitShutdownResult(t, results); !errors.Is(err, context.DeadlineExceeded) {
			t.Fatalf("concurrent shutdown error = %v, want deadline exceeded", err)
		}
	}
	releaseFirst()
	waitSocketDone(t, firstDone)
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Millisecond)
	err := server.Shutdown(ctx)
	cancel()
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("shutdown with one remaining worker = %v, want deadline exceeded", err)
	}
	for range callers {
		go func() {
			ctx, cancel := context.WithTimeout(t.Context(), time.Second)
			defer cancel()
			results <- server.Shutdown(ctx)
		}()
	}
	releaseLast()
	waitSocketDone(t, lastDone)
	for range callers {
		if err := waitShutdownResult(t, results); err != nil {
			t.Fatalf("concurrent retry after worker exit: %v", err)
		}
	}
}

func TestShutdownWaitsForSocketCleanupAndPreservesErrors(t *testing.T) {
	server, native := newShutdownTestServer()
	interruptErr := errors.New("interrupt failed")
	hostErr := errors.New("host shutdown failed")
	native.err = hostErr
	closing, allowClose := make(chan struct{}), make(chan struct{})
	socket := &shutdownTestSocket{ctx: t.Context(), interruptErr: interruptErr, closing: closing, allowClose: allowClose}
	release, done := startBlockedSocket(t, server, socket)
	var closeOnce sync.Once
	unblockClose := func() { closeOnce.Do(func() { close(allowClose) }) }
	t.Cleanup(unblockClose)
	release()
	waitSocketDone(t, closing)
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Millisecond)
	err := server.Shutdown(ctx)
	cancel()
	for _, want := range []error{context.DeadlineExceeded, interruptErr, hostErr} {
		if !errors.Is(err, want) {
			t.Errorf("shutdown error = %v, missing %v", err, want)
		}
	}
	unblockClose()
	waitSocketDone(t, done)
	if err := server.Shutdown(t.Context()); !errors.Is(err, hostErr) || errors.Is(err, interruptErr) {
		t.Fatalf("retry after cleanup = %v, want only host error", err)
	}
}

func TestShutdownWithoutWorkersIsRepeatable(t *testing.T) {
	server, native := newShutdownTestServer()
	for range 3 {
		ctx, cancel := context.WithTimeout(t.Context(), time.Second)
		err := server.Shutdown(ctx)
		cancel()
		if err != nil {
			t.Fatal(err)
		}
	}
	if len(native.contexts()) != 3 {
		t.Fatal("empty shutdown did not forward each attempt to the underlying server")
	}
}

type shutdownTestServer struct {
	router.Server[*fiber.App]
	mu    sync.Mutex
	calls []context.Context
	err   error
}

func newShutdownTestServer() (*Server, *shutdownTestServer) {
	native := &shutdownTestServer{Server: router.NewFiberV3Adapter()}
	return New(native), native
}

func (s *shutdownTestServer) Shutdown(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls = append(s.calls, ctx)
	return s.err
}

func (s *shutdownTestServer) contexts() []context.Context {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]context.Context(nil), s.calls...)
}

type shutdownTestSocket struct {
	router.WebSocketContext
	mu           sync.Mutex
	ctx          context.Context
	interrupts   atomic.Int32
	closed       atomic.Bool
	interruptErr error
	closing      chan struct{}
	allowClose   <-chan struct{}
}

func (s *shutdownTestSocket) Context() context.Context {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.ctx
}

func (s *shutdownTestSocket) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

func (s *shutdownTestSocket) IsWebSocket() bool { return true }

func (s *shutdownTestSocket) InterruptRead() error {
	s.interrupts.Add(1)
	return s.interruptErr
}

func (s *shutdownTestSocket) Close() error {
	if s.closing != nil {
		close(s.closing)
		<-s.allowClose
	}
	s.closed.Store(true)
	return nil
}

func startBlockedSocket(t *testing.T, server *Server, socket *shutdownTestSocket) (func(), <-chan struct{}) {
	t.Helper()
	entered, released, done := make(chan struct{}), make(chan struct{}), make(chan struct{})
	var result error
	go func() {
		defer close(done)
		result = server.handleWebSocket(socket, func(router.WebSocketContext) error {
			close(entered)
			<-released
			return nil
		})
	}()
	var once sync.Once
	release := func() { once.Do(func() { close(released) }) }
	t.Cleanup(func() {
		release()
		waitSocketDone(t, done)
		if result != nil {
			t.Errorf("worker cleanup: %v", result)
		}
	})
	waitSocketDone(t, entered)
	return release, done
}

func waitSocketDone(t *testing.T, done <-chan struct{}) {
	t.Helper()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("socket worker did not reach the expected lifecycle point")
	}
}

func waitShutdownResult(t *testing.T, results <-chan error) error {
	t.Helper()
	select {
	case err := <-results:
		return err
	case <-time.After(3 * time.Second):
		t.Fatal("shutdown did not return")
		return nil
	}
}
