// Package commandruntest provides transport-neutral contract tests for
// go-admin command-run transport implementations.
package commandruntest

import (
	"context"
	"fmt"
	"testing"
	"time"

	admin "github.com/goliatone/go-admin/admin"
)

// TransportFactory creates a fresh transport for one contract subtest.
type TransportFactory func(testing.TB) admin.CommandRunTransport

// RunTransportContract exercises provider-neutral fanout, cloning, scope,
// readiness, cancellation, and subscription ownership semantics.
func RunTransportContract(t *testing.T, factory TransportFactory) {
	t.Helper()
	t.Run("capabilities", func(t *testing.T) {
		transport := requireTransport(t, factory)
		if err := transport.Capabilities().Validate(); err != nil {
			t.Fatalf("capabilities: %v", err)
		}
	})
	t.Run("publish and clone", func(t *testing.T) {
		transport := requireTransport(t, factory)
		received := make(chan admin.CommandRunUpdate, 1)
		sub := subscribe(t, transport, admin.CommandRunSelector{Global: true}, func(_ context.Context, update admin.CommandRunUpdate) error {
			update.Metadata["nested"].(map[string]any)["value"] = "handler"
			received <- update
			return nil
		})
		defer closeSubscription(t, sub)

		update := ValidUpdate("run-clone", 1)
		update.Metadata = map[string]any{"nested": map[string]any{"value": "source"}}
		if err := transport.PublishCommandRun(context.Background(), update); err != nil {
			t.Fatalf("publish: %v", err)
		}
		awaitUpdate(t, received)
		if update.Metadata["nested"].(map[string]any)["value"] != "source" {
			t.Fatal("handler mutated publisher-owned update")
		}
	})
	t.Run("fanout", func(t *testing.T) {
		transport := requireTransport(t, factory)
		first, second := make(chan admin.CommandRunUpdate, 1), make(chan admin.CommandRunUpdate, 1)
		sub1 := subscribe(t, transport, admin.CommandRunSelector{Global: true}, channelHandler(first))
		defer closeSubscription(t, sub1)
		sub2 := subscribe(t, transport, admin.CommandRunSelector{Global: true}, channelHandler(second))
		defer closeSubscription(t, sub2)
		if err := transport.PublishCommandRun(context.Background(), ValidUpdate("run-fanout", 1)); err != nil {
			t.Fatalf("publish: %v", err)
		}
		awaitUpdate(t, first)
		awaitUpdate(t, second)
	})
	t.Run("scope", func(t *testing.T) {
		transport := requireTransport(t, factory)
		received := make(chan admin.CommandRunUpdate, 2)
		sub := subscribe(t, transport, admin.CommandRunSelector{Scope: admin.CommandRunScope{
			ApplicationID: "app", EnvironmentID: "test", TenantID: "tenant-a",
		}}, channelHandler(received))
		defer closeSubscription(t, sub)

		allowed := ValidUpdate("run-allowed", 1)
		allowed.Scope.TenantID = "tenant-a"
		denied := ValidUpdate("run-denied", 1)
		denied.Scope.TenantID = "tenant-b"
		if err := transport.PublishCommandRun(context.Background(), allowed); err != nil {
			t.Fatalf("publish allowed: %v", err)
		}
		if err := transport.PublishCommandRun(context.Background(), denied); err != nil {
			t.Fatalf("publish denied: %v", err)
		}
		if got := awaitUpdate(t, received); got.RunID != allowed.RunID {
			t.Fatalf("received run %q, want %q", got.RunID, allowed.RunID)
		}
		select {
		case got := <-received:
			t.Fatalf("received unauthorized run %q", got.RunID)
		case <-time.After(50 * time.Millisecond):
		}
	})
	t.Run("close", func(t *testing.T) {
		transport := requireTransport(t, factory)
		received := make(chan admin.CommandRunUpdate, 1)
		sub := subscribe(t, transport, admin.CommandRunSelector{Global: true}, channelHandler(received))
		closeSubscription(t, sub)
		if err := sub.Close(context.Background()); err != nil {
			t.Fatalf("second close: %v", err)
		}
		if err := transport.PublishCommandRun(context.Background(), ValidUpdate("run-closed", 1)); err != nil {
			t.Fatalf("publish after subscription close: %v", err)
		}
		select {
		case got := <-received:
			t.Fatalf("closed subscription received %q", got.RunID)
		case <-time.After(50 * time.Millisecond):
		}
	})
	t.Run("canceled publish", func(t *testing.T) {
		transport := requireTransport(t, factory)
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		if err := transport.PublishCommandRun(ctx, ValidUpdate("run-canceled", 1)); err == nil {
			t.Fatal("canceled publish should fail")
		}
	})
}

// ValidUpdate returns one valid isolated fixture for adapter tests.
func ValidUpdate(runID string, revision uint64) admin.CommandRunUpdate {
	return admin.CommandRunUpdate{
		SchemaVersion: admin.CommandRunSchemaVersion,
		EventID:       fmt.Sprintf("event-%s-%d", runID, revision),
		RunID:         runID,
		Revision:      revision,
		CommandID:     "test.command",
		Phase:         admin.CommandRunPhaseSubmitted,
		OccurredAt:    time.Now().UTC(),
		Scope:         admin.CommandRunScope{ApplicationID: "app", EnvironmentID: "test"},
	}
}

func requireTransport(t testing.TB, factory TransportFactory) admin.CommandRunTransport {
	t.Helper()
	transport := factory(t)
	if transport == nil {
		t.Fatal("transport factory returned nil")
	}
	return transport
}

func subscribe(t testing.TB, transport admin.CommandRunTransport, selector admin.CommandRunSelector, handler admin.CommandRunHandler) admin.CommandRunSubscription {
	t.Helper()
	sub, err := transport.SubscribeCommandRuns(context.Background(), selector, handler)
	if err != nil {
		t.Fatalf("subscribe: %v", err)
	}
	if sub == nil {
		t.Fatal("subscribe returned nil subscription")
	}
	select {
	case <-sub.Ready():
	case err := <-sub.Errors():
		t.Fatalf("subscription failed before ready: %v", err)
	case <-time.After(time.Second):
		t.Fatal("subscription did not become ready")
	}
	return sub
}

func closeSubscription(t testing.TB, sub admin.CommandRunSubscription) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := sub.Close(ctx); err != nil {
		t.Fatalf("close subscription: %v", err)
	}
}

func channelHandler(target chan<- admin.CommandRunUpdate) admin.CommandRunHandler {
	return func(_ context.Context, update admin.CommandRunUpdate) error {
		target <- update
		return nil
	}
}

func awaitUpdate(t testing.TB, source <-chan admin.CommandRunUpdate) admin.CommandRunUpdate {
	t.Helper()
	select {
	case update := <-source:
		return update
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for update")
		return admin.CommandRunUpdate{}
	}
}
