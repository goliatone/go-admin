package core

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/goliatone/go-admin/examples/admin-shell/config"
	golifecycle "github.com/goliatone/go-admin/pkg/go-lifecycle"
	"github.com/goliatone/go-router"
)

func TestCoordinateShutdownDefersAdminForCanceledLifecycleAndRetries(t *testing.T) {
	var shutdownRuns atomic.Int32
	registry := golifecycle.NewRegistry()
	if err := registry.Register(golifecycle.Task{
		Name:   "shutdown-hook",
		Phase:  golifecycle.PhaseShutdown,
		Policy: golifecycle.ErrorPolicyFatal,
		Run: func(context.Context) error {
			shutdownRuns.Add(1)
			return nil
		},
	}); err != nil {
		t.Fatalf("register shutdown task: %v", err)
	}
	runner, err := golifecycle.NewRunner(registry)
	if err != nil {
		t.Fatalf("new lifecycle runner: %v", err)
	}
	var adminRuns atomic.Int32
	adminShutdown := func(context.Context) error {
		adminRuns.Add(1)
		return nil
	}

	canceledCtx, cancel := context.WithCancel(context.Background())
	cancel()
	err = coordinateShutdown(canceledCtx, nil, runner.Shutdown, adminShutdown)
	var incomplete *golifecycle.ShutdownIncompleteError
	if !errors.As(err, &incomplete) {
		t.Fatalf("shutdown error = %v, want ShutdownIncompleteError", err)
	}
	if got := shutdownRuns.Load(); got != 0 {
		t.Fatalf("lifecycle shutdown task ran with canceled context: %d", got)
	}
	if got := adminRuns.Load(); got != 0 {
		t.Fatalf("admin shutdown ran before lifecycle completion: %d", got)
	}

	if err := coordinateShutdown(
		context.Background(),
		nil,
		runner.Shutdown,
		adminShutdown,
	); err != nil {
		t.Fatalf("retry shutdown: %v", err)
	}
	if got := shutdownRuns.Load(); got != 1 {
		t.Fatalf("lifecycle shutdown task runs after retry = %d, want 1", got)
	}
	if got := adminRuns.Load(); got != 1 {
		t.Fatalf("admin shutdown runs after retry = %d, want 1", got)
	}
}

func TestCoordinateShutdownBoundsContextIgnoringLifecycleTask(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	released := false
	defer func() {
		if !released {
			close(release)
		}
	}()
	registry := golifecycle.NewRegistry()
	if err := registry.Register(golifecycle.Task{
		Name:   "blocking-shutdown",
		Phase:  golifecycle.PhaseShutdown,
		Policy: golifecycle.ErrorPolicyFatal,
		Run: func(context.Context) error {
			close(started)
			<-release
			return nil
		},
	}); err != nil {
		t.Fatalf("register shutdown task: %v", err)
	}
	runner, err := golifecycle.NewRunner(registry)
	if err != nil {
		t.Fatalf("new lifecycle runner: %v", err)
	}
	var adminRuns atomic.Int32
	adminShutdown := func(context.Context) error {
		adminRuns.Add(1)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	startedAt := time.Now()
	err = coordinateShutdown(ctx, nil, runner.Shutdown, adminShutdown)
	if elapsed := time.Since(startedAt); elapsed > 200*time.Millisecond {
		t.Fatalf("shutdown exceeded host deadline: %s", elapsed)
	}
	<-started
	var incomplete *golifecycle.ShutdownIncompleteError
	if !errors.As(err, &incomplete) {
		t.Fatalf("shutdown error = %v, want ShutdownIncompleteError", err)
	}
	if got := adminRuns.Load(); got != 0 {
		t.Fatalf("admin shutdown ran while lifecycle task was active: %d", got)
	}

	close(release)
	released = true
	retryCtx, retryCancel := context.WithTimeout(context.Background(), time.Second)
	defer retryCancel()
	if err := coordinateShutdown(
		retryCtx,
		nil,
		runner.Shutdown,
		adminShutdown,
	); err != nil {
		t.Fatalf("retry shutdown: %v", err)
	}
	if got := adminRuns.Load(); got != 1 {
		t.Fatalf("admin shutdown runs after lifecycle completion = %d, want 1", got)
	}
}

type failingServer struct {
	serveErr            error
	shutdownHasDeadline atomic.Bool
}

func (*failingServer) Init() {}

func (*failingServer) Router() router.Router[*fiber.App] {
	return nil
}

func (*failingServer) WrapHandler(router.HandlerFunc) any {
	return nil
}

func (*failingServer) WrappedRouter() *fiber.App {
	return nil
}

func (s *failingServer) Serve(string) error {
	return s.serveErr
}

func (s *failingServer) Shutdown(ctx context.Context) error {
	_, hasDeadline := ctx.Deadline()
	s.shutdownHasDeadline.Store(hasDeadline)
	return nil
}

func TestRunBoundsCleanupAfterEarlyServerError(t *testing.T) {
	serveErr := errors.New("listener failed")
	server := &failingServer{serveErr: serveErr}
	cfg := config.Defaults()
	appCore := &Core{
		Config: &cfg,
		Server: server,
	}

	err := appCore.Run(context.Background())
	if !errors.Is(err, serveErr) {
		t.Fatalf("Run() error = %v, want listener failure", err)
	}
	if !server.shutdownHasDeadline.Load() {
		t.Fatal("early server failure cleanup did not receive a bounded context")
	}
}
