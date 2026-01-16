package admin

import (
	"context"
	"errors"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/goliatone/go-command"
	gocron "github.com/goliatone/go-command/cron"
	"github.com/goliatone/go-command/registry"
	goerrors "github.com/goliatone/go-errors"
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

	cronCommands map[string]*jobRegistration
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

type jobRegistration struct {
	name          string
	handlerConfig command.HandlerConfig
	handler       func(context.Context) error
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

// NewJobRegistry captures cron-enabled go-command registrations.
func NewJobRegistry() *JobRegistry {
	jobReg := &JobRegistry{
		enabled:      true,
		states:       map[string]*jobState{},
		registry:     gojob.NewMemoryRegistry(),
		scheduler:    gocron.NewScheduler(gocron.WithParser(gocron.StandardParser)),
		cronSubs:     map[string]gocron.Subscription{},
		tasks:        map[string]gojob.Task{},
		commanders:   map[string]*gojob.TaskCommander{},
		cronCommands: map[string]*jobRegistration{},
	}
	registry.SetCronRegister(command.NilCronRegister)
	jobReg.attachResolver()
	return jobReg
}

const jobResolverKey = "admin.jobs"

func (j *JobRegistry) attachResolver() {
	if j == nil {
		return
	}
	if registry.HasResolver(jobResolverKey) {
		return
	}
	_ = registry.AddResolver(jobResolverKey, j.commandResolver())
}

func (j *JobRegistry) commandResolver() command.Resolver {
	return func(cmd any, meta command.CommandMeta, _ *command.Registry) error {
		cronCmd, ok := cmd.(command.CronCommand)
		if !ok {
			return nil
		}
		if meta.MessageType == "" {
			return nil
		}
		handler := cronCmd.CronHandler()
		if handler == nil {
			return nil
		}
		reg := &jobRegistration{
			name:          meta.MessageType,
			handlerConfig: cronCmd.CronOptions(),
			handler:       func(context.Context) error { return handler() },
		}
		j.mu.Lock()
		if j.cronCommands == nil {
			j.cronCommands = map[string]*jobRegistration{}
		}
		j.cronCommands[reg.name] = reg
		j.synced = false
		j.mu.Unlock()
		return nil
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
	if j == nil || !j.enabled {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := j.ensureRegistryInitialized(ctx); err != nil {
		return err
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

	for name, reg := range j.cronCommands {
		task := newJobTask(name, reg)
		if task == nil {
			continue
		}
		_ = j.registry.Add(task)
		j.tasks[name] = task
		j.commanders[name] = gojob.NewTaskCommander(task)

		if spec := strings.TrimSpace(reg.handlerConfig.Expression); spec != "" {
			j.states[name] = &jobState{schedule: spec}
			if err := j.registerScheduleLocked(name, reg.handlerConfig, j.commanders[name]); err != nil {
				return err
			}
		}
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
	if j == nil || !j.enabled {
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

func (j *JobRegistry) registerScheduleLocked(name string, opts command.HandlerConfig, commander *gojob.TaskCommander) error {
	if j == nil || j.scheduler == nil || strings.TrimSpace(opts.Expression) == "" {
		return nil
	}

	handler := func() error {
		err := commander.Execute(context.Background(), &gojob.ExecutionMessage{
			JobID:      name,
			ScriptPath: commander.Task.GetPath(),
		})
		j.recordJobRun(AdminContext{Context: context.Background(), UserID: ActivityActorTypeSystem}, name, j.stateLocked(name), err)
		return err
	}

	sub, err := j.scheduler.AddHandler(opts, handler)
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
	meta = tagActivityActorType(meta, ActivityActorTypeJob)
	actor := ctx.UserID
	if actor == "" {
		actor = actorFromContext(ctx.Context)
		if actor == "" {
			actor = ActivityActorTypeSystem
		}
	}
	_ = j.activity.Record(ctx.Context, ActivityEntry{
		Actor:    actor,
		Action:   "job.trigger",
		Object:   name,
		Metadata: meta,
	})
}

func (j *JobRegistry) ensureRegistryInitialized(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}
	if err := registry.Start(ctx); err != nil {
		var regErr *goerrors.Error
		if errors.As(err, &regErr) && regErr.TextCode == "REGISTRY_ALREADY_INITIALIZED" {
			return nil
		}
		return err
	}
	return nil
}

type jobTask struct {
	name          string
	handlerConfig command.HandlerConfig
	handler       func(context.Context) error
}

var _ gojob.Task = (*jobTask)(nil)

func newJobTask(name string, reg *jobRegistration) *jobTask {
	if reg == nil || name == "" || reg.handler == nil {
		return nil
	}
	return &jobTask{
		name:          name,
		handlerConfig: reg.handlerConfig,
		handler:       reg.handler,
	}
}

func (t *jobTask) GetID() string {
	return t.name
}

func (t *jobTask) GetHandler() func() error {
	return func() error {
		return t.run(context.Background())
	}
}

func (t *jobTask) GetHandlerConfig() gojob.HandlerOptions {
	return gojob.HandlerOptions{HandlerConfig: t.handlerConfig}
}

func (t *jobTask) GetConfig() gojob.Config {
	return gojob.Config{Schedule: strings.TrimSpace(t.handlerConfig.Expression)}
}

func (t *jobTask) GetPath() string {
	return t.name
}

func (t *jobTask) GetEngine() gojob.Engine { return nil }

func (t *jobTask) Execute(ctx context.Context, _ *gojob.ExecutionMessage) error {
	return t.run(ctx)
}

func (t *jobTask) run(ctx context.Context) error {
	if t == nil || t.handler == nil {
		return errors.New("job handler unavailable")
	}
	return t.handler(ctx)
}
