package admin

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"
	"time"

	"github.com/goliatone/go-command"
	gocron "github.com/goliatone/go-command/cron"
	"github.com/goliatone/go-command/registry"
	goerrors "github.com/goliatone/go-errors"
)

func TestJobRegistryRegistersCronWithScheduler(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cmd := &cronCommand{}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}

		jr := NewJobRegistry()
		scheduler := &stubGoJobScheduler{}
		jr.WithGoJob(nil, scheduler)

		if err := jr.Sync(context.Background()); err != nil {
			t.Fatalf("sync: %v", err)
		}

		if !scheduler.started {
			t.Fatalf("expected scheduler to start")
		}
		if len(scheduler.added) != 1 {
			t.Fatalf("expected scheduler registration")
		}
		if scheduler.added[0].Expression != cmd.CronOptions().Expression {
			t.Fatalf("expected cron spec %q, got %q", cmd.CronOptions().Expression, scheduler.added[0].Expression)
		}

		jobs := jr.List()
		if len(jobs) != 1 {
			t.Fatalf("expected one job entry, got %d", len(jobs))
		}
		if jobs[0].Schedule != cmd.CronOptions().Expression {
			t.Fatalf("expected schedule %q, got %q", cmd.CronOptions().Expression, jobs[0].Schedule)
		}
		if jobs[0].NextRun.IsZero() {
			t.Fatalf("expected next run derived from go-job schedule")
		}
	})
}

func TestJobTriggerUsesDispatcherAndUpdatesState(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cmd := &countingCronCommand{}
		other := &failingCommand{}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}
		if _, err := RegisterCommand(cmdReg, other); err != nil {
			t.Fatalf("register command: %v", err)
		}

		jr := NewJobRegistry()
		jr.WithGoJob(nil, &stubGoJobScheduler{})
		if err := jr.Sync(context.Background()); err != nil {
			t.Fatalf("sync: %v", err)
		}

		if err := jr.Trigger(AdminContext{Context: context.Background(), UserID: "tester"}, "jobs.refresh"); err != nil {
			t.Fatalf("trigger: %v", err)
		}
		if cmd.calls == 0 {
			t.Fatalf("expected command executed via dispatcher")
		}

		jobs := jr.List()
		var found *Job
		for i := range jobs {
			if jobs[i].Name == "jobs.refresh" {
				found = &jobs[i]
				break
			}
		}
		if found == nil {
			t.Fatalf("expected jobs.refresh entry in jobs list, got %d items", len(jobs))
		}
		if found.LastRun.IsZero() {
			t.Fatalf("expected last run timestamp after trigger")
		}
		if found.Status != "ok" {
			t.Fatalf("expected job status ok after trigger, got %s", found.Status)
		}

		if other.calls != 0 {
			t.Fatalf("expected only target job executed, got %d calls on other command", other.calls)
		}
	})
}

func TestJobRegistrySyncHandlesSynchronousSchedulerCallbacks(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cmd := &countingCronCommand{}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}

		jr := NewJobRegistry()
		scheduler := &eagerGoJobScheduler{}
		jr.WithGoJob(nil, scheduler)

		done := make(chan error, 1)
		go func() {
			done <- jr.Sync(context.Background())
		}()

		select {
		case err := <-done:
			if err != nil {
				t.Fatalf("sync: %v", err)
			}
		case <-time.After(200 * time.Millisecond):
			t.Fatalf("sync deadlocked when scheduler executed callback synchronously")
		}

		if cmd.calls == 0 {
			t.Fatalf("expected eager scheduler to execute cron handler")
		}
	})
}

type stubGoJobScheduler struct {
	added   []command.HandlerConfig
	started bool
	handler any
}

func (s *stubGoJobScheduler) AddHandler(cfg command.HandlerConfig, handler any) (gocron.Subscription, error) {
	s.added = append(s.added, cfg)
	s.handler = handler
	return stubCronSubscription{}, nil
}

func (s *stubGoJobScheduler) Start(context.Context) error {
	s.started = true
	return nil
}

func (s *stubGoJobScheduler) Stop(context.Context) error {
	s.started = false
	return nil
}

type stubCronSubscription struct{}

func (stubCronSubscription) Unsubscribe() {}

type eagerGoJobScheduler struct {
	stubGoJobScheduler
	handler func() error
}

func (s *eagerGoJobScheduler) AddHandler(cfg command.HandlerConfig, handler any) (gocron.Subscription, error) {
	s.added = append(s.added, cfg)
	if h, ok := handler.(func() error); ok {
		s.handler = h
	}
	return stubCronSubscription{}, nil
}

func (s *eagerGoJobScheduler) Start(context.Context) error {
	s.started = true
	if s.handler != nil {
		return s.handler()
	}
	return nil
}

type countingCronCommand struct {
	calls int
}

type countingCronMsg struct{}

func (countingCronMsg) Type() string { return "jobs.refresh" }

func (c *countingCronCommand) Execute(context.Context, countingCronMsg) error {
	c.calls++
	return nil
}

func (c *countingCronCommand) CronHandler() func() error {
	return func() error {
		c.calls++
		return nil
	}
}

func (c *countingCronCommand) CronOptions() command.HandlerConfig {
	return command.HandlerConfig{Expression: "@daily"}
}

type failingCommand struct {
	calls int
}

type failingCommandMsg struct{}

func (failingCommandMsg) Type() string { return "admin.export" }

func (c *failingCommand) Execute(context.Context, failingCommandMsg) error {
	c.calls++
	return errors.New("resource required")
}

func TestJobRegistryErrorObserverReceivesTypedTerminalFailureOnce(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cause := errors.New("provider unavailable")
		cmd := &failingCronCommand{err: goerrors.Wrap(cause, goerrors.CategoryExternal, "provider sync failed").WithTextCode("PROVIDER_SYNC_FAILED")}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}

		jr := NewJobRegistry()
		scheduler := &stubGoJobScheduler{}
		jr.WithGoJob(nil, scheduler)
		var events []JobErrorEvent
		jr.WithErrorObserver(func(_ context.Context, event JobErrorEvent) {
			events = append(events, event)
		})
		if err := jr.Sync(context.Background()); err != nil {
			t.Fatalf("sync: %v", err)
		}
		handler, ok := scheduler.handler.(func() error)
		if !ok {
			t.Fatalf("scheduled handler type = %T", scheduler.handler)
		}
		if err := handler(); err == nil {
			t.Fatal("expected scheduled handler failure")
		}

		if len(events) != 1 {
			t.Fatalf("observer events = %d, want 1", len(events))
		}
		event := events[0]
		if event.Job != "jobs.failure" || event.Schedule != "@daily" || event.Stage != JobErrorStageTerminal {
			t.Fatalf("observer event = %+v", event)
		}
		if !errors.Is(event.Error, cause) {
			t.Fatal("observer lost original typed cause")
		}
		jobs := jr.List()
		if len(jobs) != 1 || jobs[0].Status != "failed" {
			t.Fatalf("job state = %+v", jobs)
		}
		if strings.Contains(jobs[0].LastError, "provider unavailable") {
			t.Fatalf("durable job state disclosed internal cause: %q", jobs[0].LastError)
		}
	})
}

func TestJobRegistryErrorObserverDistinguishesRetryAndTerminal(t *testing.T) {
	jr := NewJobRegistry()
	var events []JobErrorEvent
	jr.WithErrorObserver(func(_ context.Context, event JobErrorEvent) {
		events = append(events, event)
	})
	base := goerrors.New("scheduled job failed", goerrors.CategoryOperation).
		WithMetadata(map[string]any{"job": "jobs.failure", "schedule": "@daily"})
	retry := goerrors.Wrap(base, goerrors.CategoryOperation, "retry failed").
		WithTextCode("HANDLER_RETRY_ATTEMPT").
		WithMetadata(map[string]any{"attempt": 1, "max_attempts": 3})
	final := goerrors.Wrap(base, goerrors.CategoryOperation, "retries exhausted").
		WithTextCode("HANDLER_MAX_RETRIES_EXCEEDED").
		WithMetadata(map[string]any{"total_attempts": 3})

	jr.observeJobError(context.Background(), retry)
	jr.observeJobError(context.Background(), final)
	if len(events) != 2 {
		t.Fatalf("observer events = %d, want 2", len(events))
	}
	if events[0].Stage != JobErrorStageRetry || events[0].Attempt != 1 || events[0].MaxAttempts != 3 {
		t.Fatalf("retry event = %+v", events[0])
	}
	if events[1].Stage != JobErrorStageTerminal || events[1].Attempt != 3 || events[1].MaxAttempts != 3 {
		t.Fatalf("terminal event = %+v", events[1])
	}
}

func TestJobMetadataIntRejectsOutOfRangeValues(t *testing.T) {
	metadata := map[string]any{
		"max":      uint64(math.MaxInt),
		"overflow": uint64(math.MaxInt) + 1,
	}
	if got := jobMetadataInt(metadata, "max"); got != math.MaxInt {
		t.Fatalf("max metadata = %d, want %d", got, math.MaxInt)
	}
	if got := jobMetadataInt(metadata, "overflow"); got != 0 {
		t.Fatalf("overflow metadata = %d, want 0", got)
	}
}

func TestJobRegistryDefaultSchedulerObservesRetriesAndFinalOnce(t *testing.T) {
	registry.WithTestRegistry(func() {
		cmdReg := NewCommandBus(true)
		defer cmdReg.Reset()
		cause := errors.New("provider unavailable")
		cmd := &failingCronCommand{err: cause, schedule: "@every 1s"}
		if _, err := RegisterCommand(cmdReg, cmd); err != nil {
			t.Fatalf("register command: %v", err)
		}

		jr := NewJobRegistry()
		if _, ok := jr.scheduler.(schedulerErrorHandlerSetter); !ok {
			t.Skip("requires go-command scheduler error-handler injection")
		}
		events := make(chan JobErrorEvent, 4)
		jr.WithErrorObserver(func(_ context.Context, event JobErrorEvent) {
			events <- event
		})
		if err := jr.Sync(context.Background()); err != nil {
			t.Fatalf("sync: %v", err)
		}
		defer jr.scheduler.Stop(context.Background()) //nolint:errcheck // test cleanup

		attempts := 0
		finals := 0
		deadline := time.After(3 * time.Second)
		for finals == 0 {
			select {
			case event := <-events:
				if event.Job != "jobs.failure" || event.Schedule != "@every 1s" || !errors.Is(event.Error, cause) {
					t.Fatalf("observer event = %+v", event)
				}
				switch event.Stage {
				case JobErrorStageRetry:
					attempts++
				case JobErrorStageTerminal:
					finals++
				}
			case <-deadline:
				t.Fatalf("timed out waiting for terminal event; attempts=%d finals=%d", attempts, finals)
			}
		}
		if attempts != 2 || finals != 1 {
			t.Fatalf("observations attempts=%d finals=%d, want 2/1", attempts, finals)
		}
	})
}

type failingCronCommand struct {
	err      error
	schedule string
}

type failingCronMessage struct{}

func (failingCronMessage) Type() string { return "jobs.failure" }

func (c *failingCronCommand) Execute(context.Context, failingCronMessage) error {
	return c.err
}

func (c *failingCronCommand) CronHandler() func() error {
	return func() error { return c.err }
}

func (c *failingCronCommand) CronOptions() command.HandlerConfig {
	schedule := c.schedule
	if schedule == "" {
		schedule = "@daily"
	}
	return command.HandlerConfig{Expression: schedule, MaxRetries: 2}
}
