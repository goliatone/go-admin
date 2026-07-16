package lifecycle

import (
	"context"
	"errors"
	"fmt"
	"runtime/debug"
	"strings"
	"time"
	"unicode/utf8"
)

// Phase identifies a lifecycle execution phase.
type Phase string

const (
	// PhasePreBind runs required startup work before listeners are opened.
	PhasePreBind Phase = "pre_bind"
	// PhaseBind is a host-owned boundary for listener startup.
	PhaseBind Phase = "bind"
	// PhasePostBind runs after the host has proven listeners accept traffic.
	PhasePostBind Phase = "post_bind"
	// PhaseReady runs readiness checks and hooks.
	PhaseReady Phase = "ready"
	// PhaseBackground supervises long-running workers until shutdown.
	PhaseBackground Phase = "background"
	// PhaseShutdown runs teardown hooks after background workers are stopped.
	PhaseShutdown Phase = "shutdown"
)

// ErrorPolicy controls how task failures affect phase execution.
type ErrorPolicy string

const (
	// ErrorPolicyFatal stops ordinary phases and returns an error. Shutdown is
	// best-effort: remaining shutdown tasks still run and the failure is joined.
	ErrorPolicyFatal ErrorPolicy = "fatal"
	// ErrorPolicyDegraded records the failure and allows execution to continue.
	ErrorPolicyDegraded ErrorPolicy = "degraded"
	// ErrorPolicyRetryable retries the task before recording a degraded failure.
	ErrorPolicyRetryable ErrorPolicy = "retryable"
	// ErrorPolicyIgnored records the failure as ignored and continues.
	ErrorPolicyIgnored ErrorPolicy = "ignored"
)

// TaskFunc is a unit of lifecycle work.
type TaskFunc func(context.Context) error

const maxPanicDiagnosticBytes = 1024

// PanicError reports a panic recovered while executing a lifecycle task.
// Error returns a bounded diagnostic suitable for snapshots. Recovered and
// StackTrace retain the original value and stack for internal diagnostics.
type PanicError struct {
	taskName  string
	recovered any
	stack     []byte
}

func newPanicError(taskName string, recovered any) *PanicError {
	return &PanicError{
		taskName:  taskName,
		recovered: recovered,
		stack:     debug.Stack(),
	}
}

// Error implements error without exposing the recovered stack in serialized
// lifecycle snapshots.
func (e *PanicError) Error() string {
	if e == nil {
		return "lifecycle task panicked"
	}
	return boundedDiagnostic(fmt.Sprintf("lifecycle task %q panicked: %v", e.taskName, e.recovered), maxPanicDiagnosticBytes)
}

// Unwrap preserves an error used as the panic value for errors.Is/errors.As.
func (e *PanicError) Unwrap() error {
	if e == nil {
		return nil
	}
	err, _ := e.recovered.(error)
	return err
}

// TaskName returns the task that panicked.
func (e *PanicError) TaskName() string {
	if e == nil {
		return ""
	}
	return e.taskName
}

// Recovered returns the original panic value.
func (e *PanicError) Recovered() any {
	if e == nil {
		return nil
	}
	return e.recovered
}

// StackTrace returns a defensive copy of the recovered panic stack.
func (e *PanicError) StackTrace() []byte {
	if e == nil || len(e.stack) == 0 {
		return nil
	}
	return append([]byte(nil), e.stack...)
}

func boundedDiagnostic(value string, limit int) string {
	value = strings.ToValidUTF8(value, "�")
	if limit <= 0 || len(value) <= limit {
		return value
	}
	limit -= len("…")
	for limit > 0 && !utf8.ValidString(value[:limit]) {
		limit--
	}
	return value[:limit] + "…"
}

// TaskFailure preserves a raw failed lifecycle attempt outside the JSON-safe
// snapshot. Cause may carry a PanicError and its stack trace.
type TaskFailure struct {
	TaskName   string      `json:"task_name"`
	Phase      Phase       `json:"phase"`
	Policy     ErrorPolicy `json:"policy"`
	State      State       `json:"state"`
	Attempt    int         `json:"attempt"`
	Terminal   bool        `json:"terminal"`
	OccurredAt time.Time   `json:"occurred_at"`
	Cause      error       `json:"-"`
}

// ShutdownStage identifies the unfinished part of a retryable shutdown.
type ShutdownStage string

const (
	// ShutdownStageBackground means background tasks have not all exited.
	ShutdownStageBackground ShutdownStage = "background"
	// ShutdownStageTasks means shutdown tasks have not all completed.
	ShutdownStageTasks ShutdownStage = "shutdown_tasks"
)

// ShutdownIncompleteError reports that the caller's context expired before a
// shutdown stage completed. Callers must not close shared resources until a
// later Shutdown call completes without this error.
type ShutdownIncompleteError struct {
	Cause error
	Stage ShutdownStage
}

// Error implements error.
func (e *ShutdownIncompleteError) Error() string {
	stage := ShutdownStageBackground
	if e != nil && e.Stage != "" {
		stage = e.Stage
	}
	message := "lifecycle: shutdown incomplete; background tasks are still running"
	if stage == ShutdownStageTasks {
		message = "lifecycle: shutdown incomplete; shutdown tasks have not completed"
	}
	if e == nil || e.Cause == nil {
		return message
	}
	return fmt.Sprintf("%s: %v", message, e.Cause)
}

// Unwrap exposes the context error that interrupted shutdown.
func (e *ShutdownIncompleteError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

// Error implements error while retaining the underlying cause for errors.Is
// and errors.As.
func (f *TaskFailure) Error() string {
	if f == nil {
		return "lifecycle task failed"
	}
	if f.Cause == nil {
		return fmt.Sprintf("lifecycle task %q attempt %d failed", f.TaskName, f.Attempt)
	}
	return fmt.Sprintf("lifecycle task %q attempt %d failed: %v", f.TaskName, f.Attempt, f.Cause)
}

// Unwrap returns the raw task failure.
func (f *TaskFailure) Unwrap() error {
	if f == nil {
		return nil
	}
	return f.Cause
}

// Task describes a registered lifecycle task.
type Task struct {
	Name        string
	Phase       Phase
	Priority    int
	Policy      ErrorPolicy
	Run         TaskFunc
	Timeout     time.Duration
	MaxAttempts int
}

func (t Task) normalize() (Task, error) {
	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" {
		return Task{}, errors.New("lifecycle: task name is required")
	}
	if t.Run == nil {
		return Task{}, fmt.Errorf("lifecycle: task %q run function is required", t.Name)
	}
	if t.Phase == "" {
		t.Phase = PhasePreBind
	}
	if !validPhase(t.Phase) {
		return Task{}, fmt.Errorf("lifecycle: task %q has invalid phase %q", t.Name, t.Phase)
	}
	if t.Policy == "" {
		t.Policy = ErrorPolicyFatal
	}
	if !validPolicy(t.Policy) {
		return Task{}, fmt.Errorf("lifecycle: task %q has invalid error policy %q", t.Name, t.Policy)
	}
	if t.MaxAttempts <= 0 {
		t.MaxAttempts = 1
	}
	return t, nil
}

func validPhase(phase Phase) bool {
	switch phase {
	case PhasePreBind, PhaseBind, PhasePostBind, PhaseReady, PhaseBackground, PhaseShutdown:
		return true
	default:
		return false
	}
}

func validPolicy(policy ErrorPolicy) bool {
	switch policy {
	case ErrorPolicyFatal, ErrorPolicyDegraded, ErrorPolicyRetryable, ErrorPolicyIgnored:
		return true
	default:
		return false
	}
}

// State identifies the current state of a task or runner.
type State string

const (
	StatePending   State = "pending"
	StateRunning   State = "running"
	StateSucceeded State = "succeeded"
	StateFailed    State = "failed"
	StateDegraded  State = "degraded"
	StateIgnored   State = "ignored"
	StateCancelled State = "cancelled"
)

// Snapshot is a point-in-time view of runner status.
type Snapshot struct {
	Serving   bool           `json:"serving"`
	Ready     bool           `json:"ready"`
	StartedAt time.Time      `json:"started_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	Tasks     []TaskSnapshot `json:"tasks"`
}

// TaskSnapshot is a point-in-time view of task status.
type TaskSnapshot struct {
	Name        string        `json:"name"`
	Phase       Phase         `json:"phase"`
	Priority    int           `json:"priority"`
	Policy      ErrorPolicy   `json:"policy"`
	State       State         `json:"state"`
	Attempts    int           `json:"attempts"`
	StartedAt   time.Time     `json:"started_at"`
	CompletedAt time.Time     `json:"completed_at"`
	Duration    time.Duration `json:"duration"`
	Error       string        `json:"error,omitempty"`
}
