package lifecycle

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
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
	// ErrorPolicyFatal stops the phase and returns an error.
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
	StartedAt time.Time      `json:"started_at,omitempty"`
	UpdatedAt time.Time      `json:"updated_at,omitempty"`
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
	StartedAt   time.Time     `json:"started_at,omitempty"`
	CompletedAt time.Time     `json:"completed_at,omitempty"`
	Duration    time.Duration `json:"duration"`
	Error       string        `json:"error,omitempty"`
}
