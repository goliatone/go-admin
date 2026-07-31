package admin

import (
	"maps"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/runner"
)

// OwnedCommandRuntimeConfig is the explicit execution-capability snapshot
// inherited by owner-scoped command runtimes.
//
// Queued executors receive an observed context containing the safe
// command.DispatchRunContext that must be persisted with queued work. Workers
// rehydrate that value and invoke dispatcher.RunObservedCommand; arbitrary
// request-context values and raw secrets are not queue payload contracts.
type OwnedCommandRuntimeConfig struct {
	Executors      map[command.ExecutionMode]dispatcher.CommandExecutor
	Placement      command.PlacementResolver
	Remote         command.RemoteDispatcher
	RunnerDefaults []runner.Option
}

// SetOwnedRuntimeConfig replaces the snapshot used by future registration-set
// commits. Existing owner generations are unchanged.
func (b *CommandBus) SetOwnedRuntimeConfig(config OwnedCommandRuntimeConfig) error {
	if b == nil {
		return nil
	}
	normalized, err := normalizeOwnedRuntimeConfig(config)
	if err != nil {
		return err
	}
	b.mu.Lock()
	b.ownedRuntimeConfig = normalized
	b.lifecycleEpoch++
	b.mu.Unlock()
	return nil
}

func normalizeOwnedRuntimeConfig(config OwnedCommandRuntimeConfig) (OwnedCommandRuntimeConfig, error) {
	out := OwnedCommandRuntimeConfig{
		Placement:      config.Placement,
		Remote:         config.Remote,
		RunnerDefaults: append([]runner.Option(nil), config.RunnerDefaults...),
	}
	if isNilRegistrationValue(out.Placement) {
		out.Placement = nil
	}
	if isNilRegistrationValue(out.Remote) {
		out.Remote = nil
	}
	if len(config.Executors) > 0 {
		out.Executors = make(map[command.ExecutionMode]dispatcher.CommandExecutor, len(config.Executors))
	}
	for mode, executor := range config.Executors {
		mode = command.NormalizeExecutionMode(mode)
		if mode == "" {
			return OwnedCommandRuntimeConfig{}, validationDomainError("owned runtime executor mode required", map[string]any{"field": "executors"})
		}
		if err := command.ValidateExecutionMode(mode); err != nil {
			return OwnedCommandRuntimeConfig{}, err
		}
		if mode == command.ExecutionModeInline {
			return OwnedCommandRuntimeConfig{}, conflictDomainError("inline execution is owned by each command runtime", map[string]any{"mode": mode})
		}
		if isNilRegistrationValue(executor) {
			return OwnedCommandRuntimeConfig{}, validationDomainError("owned runtime executor required", map[string]any{"mode": mode})
		}
		if _, exists := out.Executors[mode]; exists {
			return OwnedCommandRuntimeConfig{}, conflictDomainError("duplicate normalized owned runtime executor mode", map[string]any{"mode": mode})
		}
		out.Executors[mode] = executor
	}
	return out, nil
}

func cloneOwnedRuntimeConfig(config OwnedCommandRuntimeConfig) OwnedCommandRuntimeConfig {
	out := OwnedCommandRuntimeConfig{
		Placement:      config.Placement,
		Remote:         config.Remote,
		RunnerDefaults: append([]runner.Option(nil), config.RunnerDefaults...),
	}
	if len(config.Executors) > 0 {
		out.Executors = make(map[command.ExecutionMode]dispatcher.CommandExecutor, len(config.Executors))
		maps.Copy(out.Executors, config.Executors)
	}
	return out
}
