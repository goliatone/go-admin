package admin

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-command"
	gocron "github.com/goliatone/go-command/cron"
	gojob "github.com/goliatone/go-job"
)

// Job represents a scheduled or triggerable job.
type Job struct {
	Name      string    `json:"name"`
	Schedule  string    `json:"schedule,omitempty"`
	LastRun   time.Time `json:"last_run,omitempty"`
	NextRun   time.Time `json:"next_run,omitempty"`
	Status    string    `json:"status,omitempty"`
	LastError string    `json:"last_error,omitempty"`
}

// JobRegistry keeps track of jobs registered via commands with cron metadata.
type JobRegistry struct {
	commands *CommandRegistry
	enabled  bool
	states   map[string]*jobState
	mu       sync.Mutex
	activity ActivitySink

	registry          gojob.Registry
	scheduler         goJobScheduler
	cronSubs          map[string]gocron.Subscription
	tasks             map[string]gojob.Task
	commanders        map[string]*gojob.TaskCommander
	schedulerStarted  bool
	registryProvided  bool
	schedulerProvided bool
	synced            bool
}

type goJobScheduler interface {
	AddHandler(command.HandlerConfig, any) (gocron.Subscription, error)
	Start(context.Context) error
	Stop(context.Context) error
}

type jobState struct {
	schedule string
	lastRun  time.Time
	lastErr  string
}

func (s *jobState) status() string {
	if s == nil {
		return ""
	}
	if s.lastErr != "" {
		return "failed"
	}
	if s.lastRun.IsZero() {
		return "pending"
	}
	return "ok"
}

// NewJobRegistry wraps a command registry.
func NewJobRegistry(commands *CommandRegistry) *JobRegistry {
	return &JobRegistry{
		commands: commands,
		enabled:  true,
		states:   map[string]*jobState{},
		registry: gojob.NewMemoryRegistry(),
		scheduler: gocron.NewScheduler(
			gocron.WithParser(gocron.StandardParser),
		),
		cronSubs:   map[string]gocron.Subscription{},
		tasks:      map[string]gojob.Task{},
		commanders: map[string]*gojob.TaskCommander{},
	}
}

// WithGoJob allows callers to inject a go-job registry and scheduler.
func (j *JobRegistry) WithGoJob(registry gojob.Registry, scheduler goJobScheduler) {
	j.mu.Lock()
	defer j.mu.Unlock()
	if registry != nil {
		j.registry = registry
		j.registryProvided = true
	}
	if scheduler != nil {
		j.scheduler = scheduler
		j.schedulerProvided = true
	}
}

// WithActivitySink records job triggers to the shared activity sink.
func (j *JobRegistry) WithActivitySink(sink ActivitySink) {
	j.activity = sink
}

// Enable toggles whether jobs are available.
func (j *JobRegistry) Enable(enabled bool) {
	if j == nil {
		return
	}
	j.enabled = enabled
}

// Sync registers cron-capable commands with the go-job dispatcher and scheduler.
func (j *JobRegistry) Sync(ctx context.Context) error {
	if j == nil || !j.enabled || j.commands == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	j.mu.Lock()
	defer j.mu.Unlock()

	if j.registry == nil || (!j.registryProvided && j.synced) {
		j.registry = gojob.NewMemoryRegistry()
	}
	if j.scheduler == nil {
		j.scheduler = gocron.NewScheduler()
	}

	for _, sub := range j.cronSubs {
		if sub != nil {
			sub.Unsubscribe()
		}
	}
	j.cronSubs = map[string]gocron.Subscription{}
	j.states = map[string]*jobState{}
	j.tasks = map[string]gojob.Task{}
	j.commanders = map[string]*gojob.TaskCommander{}

	tasks := []gojob.Task{}
	for _, cmd := range j.commands.Commands() {
		task := newCommandTask(cmd)
		if task == nil {
			continue
		}
		_ = j.registry.Add(task)
		name := task.GetID()
		j.tasks[name] = task
		j.commanders[name] = gojob.NewTaskCommander(task)

		if spec := cronSpec(cmd); spec != "" {
			j.states[name] = &jobState{schedule: spec}
			if err := j.registerScheduleLocked(name, spec, j.commanders[name]); err != nil {
				return err
			}
		}
		tasks = append(tasks, task)
	}
	j.ensureStateForTasksLocked()

	if j.scheduler != nil && !j.schedulerStarted {
		if err := j.scheduler.Start(ctx); err != nil {
			return err
		}
		j.schedulerStarted = true
	}

	j.synced = true
	return nil
}

// List returns registered cron jobs.
func (j *JobRegistry) List() []Job {
	empty := []Job{}
	if j == nil || !j.enabled || j.commands == nil {
		return empty
	}
	_ = j.ensureSynced(context.Background())

	j.mu.Lock()
	defer j.mu.Unlock()
	j.ensureStateForTasksLocked()

	out := []Job{}
	for name, state := range j.states {
		job := Job{
			Name:      name,
			Schedule:  state.schedule,
			LastRun:   state.lastRun,
			Status:    state.status(),
			LastError: state.lastErr,
		}
		if state.schedule != "" {
			if next, err := gojob.NextRun(state.schedule, state.lastRun); err == nil {
				job.NextRun = next
			}
		}
		out = append(out, job)
	}
	sort.Slice(out, func(i, k int) bool { return out[i].Name < out[k].Name })
	return out
}

// Trigger dispatches a job by name through the go-job dispatcher.
func (j *JobRegistry) Trigger(ctx AdminContext, name string) error {
	if j == nil || !j.enabled {
		return FeatureDisabledError{Feature: string(FeatureJobs)}
	}
	if err := j.ensureSynced(ctx.Context); err != nil {
		return err
	}

	j.mu.Lock()
	task := j.tasks[name]
	commander := j.commanders[name]
	state := j.stateLocked(name)
	j.mu.Unlock()
	if task == nil || commander == nil || state == nil {
		return ErrNotFound
	}

	msg := &gojob.ExecutionMessage{JobID: name, ScriptPath: task.GetPath()}
	err := commander.Execute(ctx.Context, msg)
	j.recordJobRun(ctx, name, state, err)
	return err
}

func (j *JobRegistry) registerScheduleLocked(name, spec string, commander *gojob.TaskCommander) error {
	if j == nil || j.scheduler == nil || spec == "" {
		return nil
	}

	handler := func() error {
		err := commander.Execute(context.Background(), &gojob.ExecutionMessage{
			JobID:      name,
			ScriptPath: commander.Task.GetPath(),
		})
		j.recordJobRun(AdminContext{Context: context.Background(), UserID: "system"}, name, j.stateLocked(name), err)
		return err
	}

	sub, err := j.scheduler.AddHandler(command.HandlerConfig{Expression: spec}, handler)
	if err != nil {
		return err
	}
	j.cronSubs[name] = sub
	return nil
}

func (j *JobRegistry) ensureStateForTasksLocked() {
	if j.states == nil {
		j.states = map[string]*jobState{}
	}
	for name := range j.commanders {
		if _, ok := j.states[name]; !ok {
			j.states[name] = &jobState{}
		}
	}
}

func (j *JobRegistry) ensureSynced(ctx context.Context) error {
	j.mu.Lock()
	synced := j.synced
	j.mu.Unlock()
	if synced {
		return nil
	}
	return j.Sync(ctx)
}

func (j *JobRegistry) stateLocked(name string) *jobState {
	if j.states == nil {
		j.states = map[string]*jobState{}
	}
	state, ok := j.states[name]
	if !ok {
		state = &jobState{}
		j.states[name] = state
	}
	return state
}

func (j *JobRegistry) recordJobRun(ctx AdminContext, name string, state *jobState, execErr error) {
	if j == nil || state == nil {
		return
	}
	j.mu.Lock()
	state.lastRun = time.Now()
	if execErr != nil {
		state.lastErr = execErr.Error()
	} else {
		state.lastErr = ""
	}
	j.mu.Unlock()
	j.recordActivity(ctx, name, state, execErr)
}

func (j *JobRegistry) recordActivity(ctx AdminContext, name string, state *jobState, execErr error) {
	if j == nil || j.activity == nil {
		return
	}
	meta := map[string]any{"job": name}
	if state != nil && state.schedule != "" {
		meta["schedule"] = state.schedule
	}
	if execErr != nil {
		meta["error"] = execErr.Error()
		meta["status"] = "failed"
	} else {
		meta["status"] = "ok"
	}
	actor := ctx.UserID
	if actor == "" {
		actor = actorFromContext(ctx.Context)
		if actor == "" {
			actor = "system"
		}
	}
	_ = j.activity.Record(ctx.Context, ActivityEntry{
		Actor:    actor,
		Action:   "job.trigger",
		Object:   name,
		Metadata: meta,
	})
}

func cronSpec(cmd Command) string {
	if withCron, ok := cmd.(CommandWithCron); ok {
		return strings.TrimSpace(withCron.CronSpec())
	}
	return ""
}

type commandTask struct {
	command Command
}

var _ gojob.Task = (*commandTask)(nil)

func newCommandTask(cmd Command) *commandTask {
	if cmd == nil || cmd.Name() == "" {
		return nil
	}
	return &commandTask{command: cmd}
}

func (c *commandTask) GetID() string {
	return c.command.Name()
}

func (c *commandTask) GetHandler() func() error {
	handler := c.command.Execute
	if withCron, ok := c.command.(CommandWithCron); ok {
		if cronHandler := withCron.CronHandler(); cronHandler != nil {
			return cronHandler
		}
	}
	return func() error {
		return handler(context.Background())
	}
}

func (c *commandTask) GetHandlerConfig() gojob.HandlerOptions {
	return gojob.HandlerOptions{
		HandlerConfig: command.HandlerConfig{
			Expression: cronSpec(c.command),
		},
	}
}

func (c *commandTask) GetConfig() gojob.Config {
	return gojob.Config{Schedule: cronSpec(c.command)}
}

func (c *commandTask) GetPath() string {
	return c.command.Name()
}

func (c *commandTask) GetEngine() gojob.Engine { return nil }

func (c *commandTask) Execute(ctx context.Context, _ *gojob.ExecutionMessage) error {
	return c.command.Execute(ctx)
}
