package admin

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestLocalCommandRunTransportReportsHandlerFailure(t *testing.T) {
	transport := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{})
	subscription, err := transport.SubscribeCommandRuns(context.Background(), CommandRunSelector{Global: true}, func(context.Context, CommandRunUpdate) error {
		return errors.New("handler detail")
	})
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	defer subscription.Close(context.Background())
	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-error", 1)); err != nil {
		t.Fatalf("publish: %v", err)
	}
	select {
	case err := <-subscription.Errors():
		if !errors.Is(err, ErrCommandRunHandlerFailed) {
			t.Fatalf("error = %v, want ErrCommandRunHandlerFailed", err)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for handler error")
	}
}

func TestLocalCommandRunTransportBackpressureIsBounded(t *testing.T) {
	transport := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{
		BufferSize: 1, PublishTimeout: 25 * time.Millisecond,
	})
	started := make(chan struct{})
	release := make(chan struct{})
	subscription, err := transport.SubscribeCommandRuns(context.Background(), CommandRunSelector{Global: true}, func(ctx context.Context, _ CommandRunUpdate) error {
		select {
		case <-started:
		default:
			close(started)
		}
		select {
		case <-release:
		case <-ctx.Done():
		}
		return nil
	})
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	defer func() {
		close(release)
		_ = subscription.Close(context.Background())
	}()

	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-1", 1)); err != nil {
		t.Fatalf("first publish: %v", err)
	}
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("handler did not start")
	}
	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-2", 1)); err != nil {
		t.Fatalf("buffered publish: %v", err)
	}
	startedAt := time.Now()
	err = transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-3", 1))
	if !errors.Is(err, ErrCommandRunTransportBackpressure) {
		t.Fatalf("error = %v, want backpressure", err)
	}
	if elapsed := time.Since(startedAt); elapsed > 250*time.Millisecond {
		t.Fatalf("publish blocked too long: %s", elapsed)
	}
}

func TestLocalCommandRunTransportCloseCancelsHandlerAndIsIdempotent(t *testing.T) {
	transport := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{})
	handlerStarted := make(chan struct{})
	handlerDone := make(chan struct{})
	subscription, err := transport.SubscribeCommandRuns(context.Background(), CommandRunSelector{Global: true}, func(ctx context.Context, _ CommandRunUpdate) error {
		close(handlerStarted)
		<-ctx.Done()
		close(handlerDone)
		return ctx.Err()
	})
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-close", 1)); err != nil {
		t.Fatalf("publish: %v", err)
	}
	select {
	case <-handlerStarted:
	case <-time.After(time.Second):
		t.Fatal("handler did not start")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := transport.Close(ctx); err != nil {
		t.Fatalf("close: %v", err)
	}
	if err := transport.Close(ctx); err != nil {
		t.Fatalf("second close: %v", err)
	}
	select {
	case <-handlerDone:
	case <-time.After(time.Second):
		t.Fatal("handler was not canceled")
	}
	if err := subscription.Close(ctx); err != nil {
		t.Fatalf("subscription close after transport: %v", err)
	}
	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-after-close", 1)); !errors.Is(err, ErrCommandRunTransportClosed) {
		t.Fatalf("publish after close error = %v", err)
	}
}

func TestLocalCommandRunTransportConcurrentPublishAndClose(t *testing.T) {
	transport := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{BufferSize: 256})
	var handled atomic.Int64
	const subscribers = 4
	for i := 0; i < subscribers; i++ {
		_, err := transport.SubscribeCommandRuns(context.Background(), CommandRunSelector{Global: true}, func(context.Context, CommandRunUpdate) error {
			handled.Add(1)
			return nil
		})
		if err != nil {
			t.Fatalf("subscribe %d: %v", i, err)
		}
	}
	var wg sync.WaitGroup
	for publisher := 0; publisher < 8; publisher++ {
		publisher := publisher
		wg.Add(1)
		go func() {
			defer wg.Done()
			for revision := 1; revision <= 50; revision++ {
				update := localTransportTestUpdate(fmt.Sprintf("run-%d", publisher), uint64(revision))
				_ = transport.PublishCommandRun(context.Background(), update)
			}
		}()
	}
	wg.Wait()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := transport.Close(ctx); err != nil {
		t.Fatalf("close: %v", err)
	}
	if handled.Load() == 0 {
		t.Fatal("expected at least one handled update")
	}
}

func TestLocalCommandRunTransportSubscriptionContextCancellation(t *testing.T) {
	transport := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{})
	ctx, cancel := context.WithCancel(context.Background())
	subscription, err := transport.SubscribeCommandRuns(ctx, CommandRunSelector{Global: true}, func(context.Context, CommandRunUpdate) error {
		t.Fatal("canceled subscription handler was called")
		return nil
	})
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	cancel()
	closeCtx, closeCancel := context.WithTimeout(context.Background(), time.Second)
	defer closeCancel()
	if err := subscription.Close(closeCtx); err != nil {
		t.Fatalf("close canceled subscription: %v", err)
	}
	if err := transport.PublishCommandRun(context.Background(), localTransportTestUpdate("run-canceled-sub", 1)); err != nil {
		t.Fatalf("publish: %v", err)
	}
}

func localTransportTestUpdate(runID string, revision uint64) CommandRunUpdate {
	return CommandRunUpdate{
		SchemaVersion: CommandRunSchemaVersion,
		EventID:       fmt.Sprintf("event-%s-%d", runID, revision),
		RunID:         runID,
		Revision:      revision,
		CommandID:     "test.command",
		Phase:         CommandRunPhaseSubmitted,
		OccurredAt:    time.Now().UTC(),
		Scope:         CommandRunScope{ApplicationID: "app", EnvironmentID: "test"},
	}
}
