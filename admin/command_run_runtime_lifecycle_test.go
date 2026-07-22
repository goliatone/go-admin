package admin

import (
	"context"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/goliatone/go-command/dispatcher"
)

func TestCommandRunRuntimeLocalMonolithProjectsAfterStartupContextEnds(t *testing.T) {
	projected := make(chan CommandRunRecord, 1)
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true,
		OnProjected: func(_ context.Context, record CommandRunRecord) error {
			projected <- record
			return nil
		},
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	startupCtx, cancelStartup := context.WithCancel(context.Background())
	if err := runtime.Start(startupCtx); err != nil {
		t.Fatalf("start: %v", err)
	}
	cancelStartup()
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("idempotent start: %v", err)
	}
	if err := runtime.Publisher().PublishCommandRun(context.Background(), localTransportTestUpdate("runtime-local", 1)); err != nil {
		t.Fatalf("publish: %v", err)
	}
	select {
	case record := <-projected:
		if record.RunID != "runtime-local" || record.Revision != 1 {
			t.Fatalf("projected record = %+v", record)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for projection")
	}
	rows, err := runtime.Store().List(context.Background(), CommandRunSelector{Global: true})
	if err != nil || len(rows) != 1 {
		t.Fatalf("store rows=%+v err=%v", rows, err)
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("second close: %v", err)
	}
}

func TestCommandRunRuntimePublisherRoleRegistersAndUnregistersObserver(t *testing.T) {
	baseline := len(dispatcher.CommandRunObservers())
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRolePublisher, Publisher: &commandRunPublisherRecorder{},
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start: %v", err)
	}
	if len(dispatcher.CommandRunObservers()) != baseline+1 {
		t.Fatalf("observer count=%d, want %d", len(dispatcher.CommandRunObservers()), baseline+1)
	}
	if runtime.Store() != nil || runtime.Subscriber() != nil {
		t.Fatal("publisher-only runtime should not create gateway dependencies")
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatalf("observer count after close=%d, want %d", len(dispatcher.CommandRunObservers()), baseline)
	}
}

func TestCommandRunRuntimeGatewayRoleDoesNotRegisterObserver(t *testing.T) {
	transport := newRuntimeTransportStub(true)
	baseline := len(dispatcher.CommandRunObservers())
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleGateway, Subscriber: transport,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start: %v", err)
	}
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatal("gateway-only runtime registered observer")
	}
	if transport.subscribeCalls.Load() != 1 {
		t.Fatalf("subscribe calls=%d, want 1", transport.subscribeCalls.Load())
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
}

func TestCommandRunRuntimeDoesNotCloseHostOwnedTransport(t *testing.T) {
	transport := newRuntimeTransportStub(true)
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleMonolith, Transport: transport,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start: %v", err)
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
	if transport.closeCalls.Load() != 0 {
		t.Fatalf("host-owned transport close calls=%d", transport.closeCalls.Load())
	}
	if transport.subscription.closeCalls.Load() != 1 {
		t.Fatalf("runtime-owned subscription close calls=%d", transport.subscription.closeCalls.Load())
	}
}

func TestCommandRunRuntimePartialStartRollback(t *testing.T) {
	transport := newRuntimeTransportStub(false)
	transport.subscription.errors <- errors.New("subscriber unavailable")
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleMonolith, Transport: transport,
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	baseline := len(dispatcher.CommandRunObservers())
	if err := runtime.Start(context.Background()); err == nil {
		t.Fatal("start should fail before readiness")
	}
	if len(dispatcher.CommandRunObservers()) != baseline {
		t.Fatal("partial start leaked observer")
	}
	if transport.subscription.closeCalls.Load() != 1 {
		t.Fatalf("subscription close calls=%d, want 1", transport.subscription.closeCalls.Load())
	}
}

func TestCommandRunRuntimeMonitorsSubscriptionErrors(t *testing.T) {
	transport := newRuntimeTransportStub(true)
	reported := make(chan error, 1)
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{
		Enabled: true, Role: CommandRunRoleGateway, Subscriber: transport,
		OnError: func(err error) { reported <- err },
	})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("start: %v", err)
	}
	transport.subscription.errors <- errors.New("subscription interrupted")
	select {
	case err := <-reported:
		if !errors.Is(err, ErrCommandRunSubscriptionFailed) || strings.Contains(err.Error(), "interrupted") {
			t.Fatalf("reported error=%v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for subscription error")
	}
	if err := runtime.Close(context.Background()); err != nil {
		t.Fatalf("close: %v", err)
	}
}

func TestCommandRunRuntimeConcurrentStartAndBoundedClose(t *testing.T) {
	runtime, err := NewCommandRunRuntime(CommandRunRuntimeConfig{Enabled: true, CloseTimeout: time.Second})
	if err != nil {
		t.Fatalf("new runtime: %v", err)
	}
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := runtime.Start(context.Background()); err != nil {
				t.Errorf("start: %v", err)
			}
		}()
	}
	wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := runtime.Close(ctx); err != nil {
		t.Fatalf("close: %v", err)
	}
	if err := runtime.Start(context.Background()); !errors.Is(err, ErrCommandRunRuntimeClosed) {
		t.Fatalf("start after close error=%v", err)
	}
}

type runtimeTransportStub struct {
	subscription   *runtimeSubscriptionStub
	subscribeCalls atomic.Int64
	closeCalls     atomic.Int64
	mu             sync.Mutex
	handler        CommandRunHandler
}

func newRuntimeTransportStub(ready bool) *runtimeTransportStub {
	readyCh := make(chan struct{})
	if ready {
		close(readyCh)
	}
	return &runtimeTransportStub{subscription: &runtimeSubscriptionStub{
		ready: readyCh, errors: make(chan error, 4), stopped: make(chan struct{}),
	}}
}

func (t *runtimeTransportStub) PublishCommandRun(ctx context.Context, update CommandRunUpdate) error {
	t.mu.Lock()
	handler := t.handler
	t.mu.Unlock()
	if handler == nil {
		return nil
	}
	return handler(ctx, update.Clone())
}

func (t *runtimeTransportStub) SubscribeCommandRuns(_ context.Context, _ CommandRunSelector, handler CommandRunHandler) (CommandRunSubscription, error) {
	t.subscribeCalls.Add(1)
	t.mu.Lock()
	t.handler = handler
	t.mu.Unlock()
	return t.subscription, nil
}

func (*runtimeTransportStub) Capabilities() CommandRunTransportCapabilities {
	return CommandRunTransportCapabilities{Name: "runtime-stub", Fanout: true, Durability: CommandRunTransportDurabilityEphemeral}
}

func (t *runtimeTransportStub) Close(context.Context) error {
	t.closeCalls.Add(1)
	return nil
}

type runtimeSubscriptionStub struct {
	ready      chan struct{}
	errors     chan error
	stopped    chan struct{}
	closeOnce  sync.Once
	closeCalls atomic.Int64
}

func (s *runtimeSubscriptionStub) Ready() <-chan struct{} { return s.ready }
func (s *runtimeSubscriptionStub) Errors() <-chan error   { return s.errors }
func (s *runtimeSubscriptionStub) Close(context.Context) error {
	s.closeCalls.Add(1)
	s.closeOnce.Do(func() {
		close(s.stopped)
		close(s.errors)
	})
	return nil
}
