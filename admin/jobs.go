package admin

import (
	"context"
)

// Job represents a scheduled or triggerable job.
type Job struct {
	Name string
	Spec string
}

// JobRegistry keeps track of jobs registered via commands with cron metadata.
type JobRegistry struct {
	commands *CommandRegistry
	enabled  bool
}

// NewJobRegistry wraps a command registry.
func NewJobRegistry(commands *CommandRegistry) *JobRegistry {
	return &JobRegistry{commands: commands, enabled: true}
}

// Enable toggles whether jobs are available.
func (j *JobRegistry) Enable(enabled bool) {
	if j == nil {
		return
	}
	j.enabled = enabled
}

// List returns registered cron jobs.
func (j *JobRegistry) List() []Job {
	out := []Job{}
	if j == nil || !j.enabled || j.commands == nil {
		return out
	}
	for _, hook := range j.commands.Cron() {
		out = append(out, Job{Name: hook.Name, Spec: hook.Spec})
	}
	return out
}

// Trigger dispatches a job by name.
func (j *JobRegistry) Trigger(ctx context.Context, name string) error {
	if j == nil || !j.enabled {
		return FeatureDisabledError{Feature: string(FeatureJobs)}
	}
	if j.commands == nil {
		return ErrNotFound
	}
	return j.commands.Dispatch(ctx, name)
}
