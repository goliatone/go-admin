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
	mu               sync.Mutex
	tasks            []registeredTask
	status           map[string]*taskStatus
	failures         []TaskFailure
	serving          bool
	ready            bool
	startedAt        time.Time
	updatedAt        time.Time
	background       context.Context
	cancelBG         context.CancelFunc
	bgStarted        bool
	bgDone           chan struct{}
	bgComplete       bool
	bgFailures       chan *TaskFailure
	bgFailuresOnce   sync.Once
	backgroundFatal  []TaskFailure
	shuttingDown     bool
	shutdownStarted  bool
	shutdownDone     chan struct{}
	shutdownComplete bool
	shutdownErr      error
}

const maxTaskFailureHistory = 256

type taskRunResult struct {
	phaseErr        error
	terminalFailure *TaskFailure
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
	backgroundTasks := 0
	for _, rt := range tasks {
		status[rt.task.Name] = &taskStatus{task: rt.task, state: StatePending}
		if rt.task.Phase == PhaseBackground {
			backgroundTasks++
		}
	}
	now := time.Now().UTC()
	return &Runner{
		tasks:      tasks,
		status:     status,
		startedAt:  now,
		updatedAt:  now,
		bgFailures: make(chan *TaskFailure, backgroundTasks),
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
		result := r.runTask(ctx, rt.task)
		if result.phaseErr == nil {
			continue
		}
		errs = append(errs, result.phaseErr)
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
	if r.shuttingDown {
		r.mu.Unlock()
		return fmt.Errorf("lifecycle: background tasks cannot start after shutdown begins")
	}
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
			result := r.runTask(bgCtx, task)
			if result.terminalFailure != nil {
				r.publishBackgroundFailure(*result.terminalFailure)
			}
		}()
	}
	go func() {
		wg.Wait()
		r.closeBackgroundFailures()
		r.mu.Lock()
		r.bgComplete = true
		r.mu.Unlock()
		close(r.bgDone)
	}()
	return nil
}

// Shutdown cancels background tasks, waits for them to finish, and runs every
// shutdown task. Fatal, degraded, and exhausted retryable shutdown failures are
// returned together; ignored failures remain available through diagnostics.
func (r *Runner) Shutdown(ctx context.Context) error {
	if r == nil {
		return fmt.Errorf("lifecycle: runner is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	r.mu.Lock()
	if r.shutdownComplete {
		err := r.shutdownErr
		r.mu.Unlock()
		return err
	}
	r.shuttingDown = true
	cancel := r.cancelBG
	done := r.bgDone
	started := r.bgStarted
	if !started {
		r.bgComplete = true
	}
	r.mu.Unlock()
	if !started {
		r.closeBackgroundFailures()
	}
	if cancel != nil {
		cancel()
	}
	if err := r.waitForBackground(ctx, done); err != nil {
		return errors.Join(r.backgroundFatalError(), err)
	}
	return r.finishShutdown(ctx)
}

// BackgroundFailures publishes one terminal failure for each failed
// background task. The channel closes after all background tasks exit.
func (r *Runner) BackgroundFailures() <-chan *TaskFailure {
	if r == nil {
		return nil
	}
	return r.bgFailures
}

// Failures returns a defensive copy of bounded raw failed-attempt history.
// Unlike Snapshot, entries retain typed errors and recovered panic stacks.
func (r *Runner) Failures() []*TaskFailure {
	if r == nil {
		return nil
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	out := make([]*TaskFailure, 0, len(r.failures))
	for i := range r.failures {
		failure := r.failures[i]
		out = append(out, &failure)
	}
	return out
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

func (r *Runner) runTask(ctx context.Context, task Task) taskRunResult {
	r.markRunning(task)
	var lastErr error
	var terminalFailure *TaskFailure
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
		parentStopped := ctx.Err() != nil
		if cancel != nil {
			cancel()
		}
		r.markAttempt(task, attempt)
		if err == nil {
			r.markComplete(task, StateSucceeded, nil)
			return taskRunResult{}
		}
		if task.Phase == PhaseBackground && parentStopped && errors.Is(err, context.Canceled) {
			r.markComplete(task, StateCancelled, err)
			return taskRunResult{}
		}
		lastErr = err
		terminal := task.Policy != ErrorPolicyRetryable || attempt == attempts
		state := StateRunning
		if terminal {
			state = failureState(task.Policy)
		}
		failure := TaskFailure{
			TaskName:   task.Name,
			Phase:      task.Phase,
			Policy:     task.Policy,
			State:      state,
			Attempt:    attempt,
			Terminal:   terminal,
			OccurredAt: time.Now().UTC(),
			Cause:      err,
		}
		r.recordFailure(failure)
		if terminal {
			terminalFailure = &failure
		}
		if terminal {
			break
		}
	}

	state := failureState(task.Policy)
	r.markComplete(task, state, lastErr)
	if task.Policy == ErrorPolicyFatal {
		return taskRunResult{
			phaseErr:        fmt.Errorf("lifecycle task %q failed: %w", task.Name, lastErr),
			terminalFailure: terminalFailure,
		}
	}
	return taskRunResult{terminalFailure: terminalFailure}
}

func failureState(policy ErrorPolicy) State {
	switch policy {
	case ErrorPolicyDegraded, ErrorPolicyRetryable:
		return StateDegraded
	case ErrorPolicyIgnored:
		return StateIgnored
	default:
		return StateFailed
	}
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

func (r *Runner) recordFailure(failure TaskFailure) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.failures) == maxTaskFailureHistory {
		copy(r.failures, r.failures[1:])
		r.failures[len(r.failures)-1] = failure
		return
	}
	r.failures = append(r.failures, failure)
}

func (r *Runner) publishBackgroundFailure(failure TaskFailure) {
	r.mu.Lock()
	if failure.Policy == ErrorPolicyFatal {
		r.backgroundFatal = append(r.backgroundFatal, failure)
	}
	channel := r.bgFailures
	r.mu.Unlock()
	channel <- &failure
}

func (r *Runner) closeBackgroundFailures() {
	r.bgFailuresOnce.Do(func() {
		close(r.bgFailures)
	})
}

func (r *Runner) waitForBackground(ctx context.Context, done <-chan struct{}) error {
	if r.backgroundComplete() {
		return nil
	}
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		if r.backgroundComplete() {
			return nil
		}
		return &ShutdownIncompleteError{
			Cause: ctx.Err(),
			Stage: ShutdownStageBackground,
		}
	}
}

func (r *Runner) backgroundComplete() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.bgComplete
}

func (r *Runner) finishShutdown(ctx context.Context) error {
	r.mu.Lock()
	if r.shutdownComplete {
		err := r.shutdownErr
		r.mu.Unlock()
		return err
	}
	if r.shutdownStarted {
		done := r.shutdownDone
		r.mu.Unlock()
		select {
		case <-done:
			return r.completedShutdownError()
		case <-ctx.Done():
			if err, complete := r.completedShutdownResult(); complete {
				return err
			}
			return errors.Join(
				r.backgroundFatalError(),
				&ShutdownIncompleteError{Cause: ctx.Err(), Stage: ShutdownStageTasks},
			)
		}
	}
	if err := ctx.Err(); err != nil {
		r.mu.Unlock()
		return errors.Join(
			r.backgroundFatalError(),
			&ShutdownIncompleteError{Cause: err, Stage: ShutdownStageTasks},
		)
	}
	r.shutdownStarted = true
	r.shutdownDone = make(chan struct{})
	done := r.shutdownDone
	r.mu.Unlock()

	shutdownErr := r.executeShutdownTasks(ctx)
	finalErr := errors.Join(r.backgroundFatalError(), shutdownErr)

	r.mu.Lock()
	r.shutdownErr = finalErr
	r.shutdownComplete = true
	close(done)
	r.mu.Unlock()
	return finalErr
}

func (r *Runner) executeShutdownTasks(ctx context.Context) error {
	var errs []error
	for _, rt := range r.phaseTasks(PhaseShutdown) {
		result := r.runTask(ctx, rt.task)
		if result.terminalFailure == nil || rt.task.Policy == ErrorPolicyIgnored {
			continue
		}
		errs = append(errs, result.terminalFailure)
	}
	return errors.Join(errs...)
}

func (r *Runner) completedShutdownError() error {
	err, _ := r.completedShutdownResult()
	return err
}

func (r *Runner) completedShutdownResult() (error, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.shutdownErr, r.shutdownComplete
}

func (r *Runner) backgroundFatalError() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.backgroundFatal) == 0 {
		return nil
	}
	errs := make([]error, 0, len(r.backgroundFatal))
	for i := range r.backgroundFatal {
		failure := r.backgroundFatal[i]
		errs = append(errs, &failure)
	}
	return errors.Join(errs...)
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
