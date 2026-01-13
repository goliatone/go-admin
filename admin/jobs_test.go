package admin

import (
	"context"
	"errors"
	"testing"

	"github.com/goliatone/go-command"
	gocron "github.com/goliatone/go-command/cron"
	"github.com/goliatone/go-command/registry"
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

type stubGoJobScheduler struct {
	added   []command.HandlerConfig
	started bool
}

func (s *stubGoJobScheduler) AddHandler(cfg command.HandlerConfig, handler any) (gocron.Subscription, error) {
	s.added = append(s.added, cfg)
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
