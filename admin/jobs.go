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
	LastRun   time.Time `json:"last_run"`
	NextRun   time.Time `json:"next_run"`
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
	if j == nil {
		return
	}
	j.mu.Lock()
	defer j.mu.Unlock()
	j.activity = sink
}

// Enable toggles whether jobs are available.
func (j *JobRegistry) Enable(enabled bool) {
	if j == nil {
		return
	}
	j.mu.Lock()
	defer j.mu.Unlock()
	j.enabled = enabled
}

// Sync registers cron-capable commands with the go-job dispatcher and scheduler.
func (j *JobRegistry) Sync(ctx context.Context) error {
	if j == nil {
		return nil
	}
	j.mu.Lock()
	enabled := j.enabled
	j.mu.Unlock()
	if !enabled {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if err := j.ensureRegistryInitialized(ctx); err != nil {
		return err
	}

	j.mu.Lock()
	registryInst := j.registry
	registryProvided := j.registryProvided
	scheduler := j.scheduler
	schedulerStarted := j.schedulerStarted
	synced := j.synced
	existingSubs := make([]gocron.Subscription, 0, len(j.cronSubs))
	for _, sub := range j.cronSubs {
		if sub != nil {
			existingSubs = append(existingSubs, sub)
		}
	}
	cronCommands := make(map[string]*jobRegistration, len(j.cronCommands))
	for name, reg := range j.cronCommands {
		cronCommands[name] = reg
	}
	j.mu.Unlock()

	if registryInst == nil || (!registryProvided && synced) {
		registryInst = gojob.NewMemoryRegistry()
	}
	if scheduler == nil {
		scheduler = gocron.NewScheduler()
	}

	for _, sub := range existingSubs {
		sub.Unsubscribe()
	}

	tasks := map[string]gojob.Task{}
	commanders := map[string]*gojob.TaskCommander{}
	states := map[string]*jobState{}
	cronSubs := map[string]gocron.Subscription{}

	for name, reg := range cronCommands {
		task := newJobTask(name, reg)
		if task == nil {
			continue
		}
		_ = registryInst.Add(task)
		tasks[name] = task
		commanders[name] = gojob.NewTaskCommander(task)

		if spec := strings.TrimSpace(reg.handlerConfig.Expression); spec != "" {
			states[name] = &jobState{schedule: spec}
			sub, err := j.registerSchedule(name, reg.handlerConfig, commanders[name], scheduler)
			if err != nil {
				return err
			}
			if sub != nil {
				cronSubs[name] = sub
			}
		}
	}
	ensureJobStateForTasks(states, commanders)

	if scheduler != nil && !schedulerStarted {
		if err := scheduler.Start(ctx); err != nil {
			return err
		}
		schedulerStarted = true
	}

	j.mu.Lock()
	j.registry = registryInst
	j.scheduler = scheduler
	j.cronSubs = cronSubs
	j.states = states
	j.tasks = tasks
	j.commanders = commanders
	j.schedulerStarted = schedulerStarted
	j.synced = true
	j.mu.Unlock()
	return nil
}

// List returns registered cron jobs.
func (j *JobRegistry) List() []Job {
	empty := []Job{}
	if j == nil {
		return empty
	}
	j.mu.Lock()
	enabled := j.enabled
	j.mu.Unlock()
	if !enabled {
		return empty
	}
	_ = j.ensureSynced(context.Background())

	j.mu.Lock()
	defer j.mu.Unlock()
	ensureJobStateForTasks(j.states, j.commanders)

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
	if j == nil {
		return FeatureDisabledError{Feature: string(FeatureJobs)}
	}
	j.mu.Lock()
	enabled := j.enabled
	j.mu.Unlock()
	if !enabled {
		return FeatureDisabledError{Feature: string(FeatureJobs)}
	}
	if err := j.ensureSynced(ctx.Context); err != nil {
		return err
	}

	j.mu.Lock()
	task := j.tasks[name]
	commander := j.commanders[name]
	j.mu.Unlock()
	if task == nil || commander == nil {
		return ErrNotFound
	}

	msg := &gojob.ExecutionMessage{JobID: name, ScriptPath: task.GetPath()}
	err := commander.Execute(ctx.Context, msg)
	j.recordJobRun(ctx, name, err)
	return err
}

func (j *JobRegistry) registerSchedule(name string, opts command.HandlerConfig, commander *gojob.TaskCommander, scheduler goJobScheduler) (gocron.Subscription, error) {
	if j == nil || scheduler == nil || strings.TrimSpace(opts.Expression) == "" {
		return nil, nil
	}

	handler := func() error {
		err := commander.Execute(context.Background(), &gojob.ExecutionMessage{
			JobID:      name,
			ScriptPath: commander.Task.GetPath(),
		})
		j.recordJobRun(AdminContext{Context: context.Background(), UserID: ActivityActorTypeSystem}, name, err)
		return err
	}

	sub, err := scheduler.AddHandler(opts, handler)
	if err != nil {
		return nil, err
	}
	return sub, nil
}

func ensureJobStateForTasks(states map[string]*jobState, commanders map[string]*gojob.TaskCommander) {
	if states == nil {
		return
	}
	for name := range commanders {
		if _, ok := states[name]; !ok {
			states[name] = &jobState{}
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

func (j *JobRegistry) recordJobRun(ctx AdminContext, name string, execErr error) {
	if j == nil {
		return
	}
	j.mu.Lock()
	state := j.stateLocked(name)
	state.lastRun = time.Now()
	if execErr != nil {
		state.lastErr = execErr.Error()
	} else {
		state.lastErr = ""
	}
	schedule := state.schedule
	activity := j.activity
	j.mu.Unlock()
	recordJobActivity(activity, ctx, name, schedule, execErr)
}

func recordJobActivity(activity ActivitySink, ctx AdminContext, name string, schedule string, execErr error) {
	if activity == nil {
		return
	}
	meta := map[string]any{"job": name}
	if schedule != "" {
		meta["schedule"] = schedule
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
	_ = activity.Record(ctx.Context, ActivityEntry{
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
		return serviceNotConfiguredDomainError("job handler", map[string]any{"component": "jobs"})
	}
	return t.handler(ctx)
}
