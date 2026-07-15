package lifecycle

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// Runner executes registered lifecycle tasks and captures status.
type Runner struct {
	mu         sync.Mutex
	tasks      []registeredTask
	status     map[string]*taskStatus
	serving    bool
	ready      bool
	startedAt  time.Time
	updatedAt  time.Time
	background context.Context
	cancelBG   context.CancelFunc
	bgStarted  bool
	bgDone     chan struct{}
}

type taskStatus struct {
	task        Task
	state       State
	attempts    int
	startedAt   time.Time
	completedAt time.Time
	duration    time.Duration
	err         error
}

// NewRunner builds a runner from the current registry contents.
func NewRunner(registry *Registry) (*Runner, error) {
	if registry == nil {
		registry = NewRegistry()
	}
	tasks := registry.registeredTasks()
	status := make(map[string]*taskStatus, len(tasks))
	for _, rt := range tasks {
		status[rt.task.Name] = &taskStatus{task: rt.task, state: StatePending}
	}
	now := time.Now().UTC()
	return &Runner{
		tasks:     tasks,
		status:    status,
		startedAt: now,
		updatedAt: now,
	}, nil
}

// MustNewRunner builds a runner and panics on error.
func MustNewRunner(registry *Registry) *Runner {
	runner, err := NewRunner(registry)
	if err != nil {
		panic(err)
	}
	return runner
}

// RunPreBind runs all pre-bind tasks.
func (r *Runner) RunPreBind(ctx context.Context) error {
	return r.RunPhase(ctx, PhasePreBind)
}

// RunPostBind runs all post-bind tasks.
func (r *Runner) RunPostBind(ctx context.Context) error {
	return r.RunPhase(ctx, PhasePostBind)
}

// RunReady runs all ready tasks and marks the runner ready on success.
func (r *Runner) RunReady(ctx context.Context) error {
	if err := r.RunPhase(ctx, PhaseReady); err != nil {
		return err
	}
	r.MarkReady()
	return nil
}

// RunPhase executes all tasks for a phase in deterministic order.
func (r *Runner) RunPhase(ctx context.Context, phase Phase) error {
	if r == nil {
		return fmt.Errorf("lifecycle: runner is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	var errs []error
	for _, rt := range r.phaseTasks(phase) {
		err := r.runTask(ctx, rt.task)
		if err == nil {
			continue
		}
		errs = append(errs, err)
		if rt.task.Policy == ErrorPolicyFatal {
			return errors.Join(errs...)
		}
	}
	return errors.Join(errs...)
}

// StartBackground starts all background tasks and returns immediately.
func (r *Runner) StartBackground(ctx context.Context) error {
	if r == nil {
		return fmt.Errorf("lifecycle: runner is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	r.mu.Lock()
	if r.bgStarted {
		r.mu.Unlock()
		return fmt.Errorf("lifecycle: background tasks already started")
	}
	bgCtx, cancel := context.WithCancel(ctx)
	r.background = bgCtx
	r.cancelBG = cancel
	r.bgStarted = true
	r.bgDone = make(chan struct{})
	tasks := r.phaseTasksLocked(PhaseBackground)
	r.mu.Unlock()

	var wg sync.WaitGroup
	wg.Add(len(tasks))
	for _, rt := range tasks {
		task := rt.task
		go func() {
			defer wg.Done()
			if err := r.runTask(bgCtx, task); err != nil {
				return
			}
		}()
	}
	go func() {
		wg.Wait()
		close(r.bgDone)
	}()
	return nil
}

// Shutdown cancels background tasks, waits for them to finish, and runs
// shutdown tasks.
func (r *Runner) Shutdown(ctx context.Context) error {
	if r == nil {
		return fmt.Errorf("lifecycle: runner is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	r.mu.Lock()
	cancel := r.cancelBG
	done := r.bgDone
	r.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	if done != nil {
		select {
		case <-done:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return r.RunPhase(ctx, PhaseShutdown)
}

// MarkServing records that the host has proven listener availability.
func (r *Runner) MarkServing() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.serving = true
	r.touchLocked()
}

// MarkReady records that the host has completed readiness work.
func (r *Runner) MarkReady() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.ready = true
	r.touchLocked()
}

// Snapshot returns a serializable point-in-time runner state.
func (r *Runner) Snapshot() Snapshot {
	if r == nil {
		return Snapshot{}
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := Snapshot{
		Serving:   r.serving,
		Ready:     r.ready,
		StartedAt: r.startedAt,
		UpdatedAt: r.updatedAt,
		Tasks:     make([]TaskSnapshot, 0, len(r.tasks)),
	}
	for _, rt := range r.tasks {
		status := r.status[rt.task.Name]
		if status == nil {
			continue
		}
		out.Tasks = append(out.Tasks, snapshotTask(status))
	}
	return out
}

func (r *Runner) phaseTasks(phase Phase) []registeredTask {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.phaseTasksLocked(phase)
}

func (r *Runner) phaseTasksLocked(phase Phase) []registeredTask {
	out := []registeredTask{}
	for _, rt := range r.tasks {
		if rt.task.Phase == phase {
			out = append(out, rt)
		}
	}
	return out
}

func (r *Runner) runTask(ctx context.Context, task Task) error {
	r.markRunning(task)
	var lastErr error
	attempts := task.MaxAttempts
	if task.Policy != ErrorPolicyRetryable {
		attempts = 1
	}
	for attempt := 1; attempt <= attempts; attempt++ {
		runCtx := ctx
		var cancel context.CancelFunc
		if task.Timeout > 0 {
			runCtx, cancel = context.WithTimeout(ctx, task.Timeout)
		}
		err := runTaskAttempt(runCtx, task)
		if cancel != nil {
			cancel()
		}
		r.markAttempt(task, attempt)
		if err == nil {
			r.markComplete(task, StateSucceeded, nil)
			return nil
		}
		if task.Phase == PhaseBackground && errors.Is(err, context.Canceled) {
			r.markComplete(task, StateCancelled, err)
			return nil
		}
		lastErr = err
		if task.Policy != ErrorPolicyRetryable {
			break
		}
	}

	state := StateFailed
	switch task.Policy {
	case ErrorPolicyDegraded, ErrorPolicyRetryable:
		state = StateDegraded
	case ErrorPolicyIgnored:
		state = StateIgnored
	}
	r.markComplete(task, state, lastErr)
	if task.Policy == ErrorPolicyFatal {
		return fmt.Errorf("lifecycle task %q failed: %w", task.Name, lastErr)
	}
	return nil
}

func runTaskAttempt(ctx context.Context, task Task) (err error) {
	defer func() {
		if recovered := recover(); recovered != nil {
			err = newPanicError(task.Name, recovered)
		}
	}()
	return task.Run(ctx)
}

func (r *Runner) markRunning(task Task) {
	r.mu.Lock()
	defer r.mu.Unlock()
	status := r.status[task.Name]
	if status == nil {
		return
	}
	now := time.Now().UTC()
	status.state = StateRunning
	status.startedAt = now
	status.completedAt = time.Time{}
	status.duration = 0
	status.err = nil
	r.touchLocked()
}

func (r *Runner) markAttempt(task Task, attempt int) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if status := r.status[task.Name]; status != nil {
		status.attempts = attempt
		r.touchLocked()
	}
}

func (r *Runner) markComplete(task Task, state State, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	status := r.status[task.Name]
	if status == nil {
		return
	}
	now := time.Now().UTC()
	status.state = state
	status.completedAt = now
	status.duration = now.Sub(status.startedAt)
	status.err = err
	r.touchLocked()
}

func (r *Runner) touchLocked() {
	r.updatedAt = time.Now().UTC()
}

func snapshotTask(status *taskStatus) TaskSnapshot {
	var errText string
	if status.err != nil {
		errText = status.err.Error()
	}
	return TaskSnapshot{
		Name:        status.task.Name,
		Phase:       status.task.Phase,
		Priority:    status.task.Priority,
		Policy:      status.task.Policy,
		State:       status.state,
		Attempts:    status.attempts,
		StartedAt:   status.startedAt,
		CompletedAt: status.completedAt,
		Duration:    status.duration,
		Error:       errText,
	}
}
