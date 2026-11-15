package quickstart

import (
	"context"
	"errors"
	"github.com/gofiber/fiber/v2"
	router "github.com/goliatone/go-router"
	"testing"
	"time"
)

func checkHostingSetupFailure[T any](t *testing.T, adapter router.Server[T]) {
	t.Helper()
	sentinel := errors.New("native setup failed")
	calls := 0
	server := newFiberRouteMissServer(adapter, func() error { calls++; return sentinel })
	check := func(err error) {
		t.Helper()
		var startup *router.StartupValidationError
		if !errors.Is(err, sentinel) || !errors.As(err, &startup) {
			t.Fatalf("setup identity lost: %v", err)
		}
	}
	for range 2 {
		check(server.Initialize())
	}
	check(server.Serve("127.0.0.1:0"))
	check(server.ValidateBoundedIngress(router.BoundedIngressOptions{}))
	check(server.ConfigureBoundedIngress(router.BoundedIngressOptions{}))
	options := router.ManagedOptions{Address: "127.0.0.1:0", DrainTimeout: time.Second}
	run, err := server.StartManaged(context.Background(), options)
	check(err)
	if run != nil {
		t.Fatal("started after setup failure")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	run, err = server.StartManaged(ctx, options)
	if run != nil || !errors.Is(err, context.Canceled) {
		t.Fatalf("pre-canceled setup failure: %v", err)
	}
	if adapter.Router().(router.RegistrationInspector).RegistrationSnapshot().State != router.RegistrationCollecting {
		t.Fatal("setup failure initialized adapter")
	}
	for _, f := range []func(){server.Init, func() { server.WrappedRouter() }} {
		func() {
			defer func() {
				v := recover()
				err, ok := v.(error)
				if !ok {
					t.Fatalf("expected startup panic, got %v", v)
				}
				check(err)
			}()
			f()
		}()
	}
	if calls != 1 {
		t.Fatalf("setup replayed %d times", calls)
	}
}

func TestFiberHostingSetupFailure(t *testing.T) {
	t.Run("v2", func(t *testing.T) { checkHostingSetupFailure(t, router.NewFiberAdapter()) })
	t.Run("v3", func(t *testing.T) { checkHostingSetupFailure(t, router.NewFiberV3Adapter()) })
}

// Embedding only the required interface simulates a provider lacking optional APIs.
type requiredOnlyServer[T any] struct{ router.Server[T] }

func TestFiberHostingMissingCapabilities(t *testing.T) {
	adapter := router.NewFiberAdapter()
	server := newFiberRouteMissServer(requiredOnlyServer[*fiber.App]{adapter}, func() error { t.Fatal("setup called without capabilities"); return nil })
	if err := server.Initialize(); !errors.Is(err, router.ErrManagedUnsupported) {
		t.Fatal(err)
	}
	run, err := server.StartManaged(context.Background(), router.ManagedOptions{})
	if run != nil || !errors.Is(err, router.ErrManagedUnsupported) {
		t.Fatalf("run=%v err=%v", run, err)
	}
}
