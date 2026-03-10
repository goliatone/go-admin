package admin

import (
	"context"
	"strings"
	"sync"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/registry"
	"github.com/goliatone/go-command/runner"
)

// MessageFactory builds typed command messages from request data.
type MessageFactory func(payload map[string]any, ids []string) (command.Message, error)

// DispatchFactory executes a typed dispatch using the provided payload.
type DispatchFactory func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, error)

// CommandBus registers command/query handlers and dispatches by name.
type CommandBus struct {
	enabled         bool
	mu              sync.Mutex
	subs            []dispatcher.Subscription
	factories       map[string]MessageFactory
	dispatchers     map[string]DispatchFactory
	executionPolicy CommandExecutionPolicy
}

// NewCommandBus constructs a command bus that can be toggled off.
func NewCommandBus(enabled bool) *CommandBus {
	return &CommandBus{
		enabled:         enabled,
		factories:       map[string]MessageFactory{},
		dispatchers:     map[string]DispatchFactory{},
		executionPolicy: CommandExecutionPolicy{DefaultMode: command.ExecutionModeInline, PerCommand: map[string]command.ExecutionMode{}},
	}
}

// Enable toggles the command bus on/off.
func (b *CommandBus) Enable(enabled bool) {
	if b == nil {
		return
	}
	b.enabled = enabled
}

// RegisterCommand wires a command handler into the go-command registry and dispatcher.
func RegisterCommand[T any](bus *CommandBus, cmd command.Commander[T], runnerOpts ...runner.Option) (dispatcher.Subscription, error) {
	if bus == nil || !bus.enabled {
		return nil, nil
	}
	sub, err := registry.RegisterCommand(cmd, runnerOpts...)
	if err != nil {
		if sub != nil {
			sub.Unsubscribe()
		}
		return nil, err
	}
	bus.track(sub)
	return sub, nil
}

// RegisterQuery wires a query handler into the go-command registry and dispatcher.
func RegisterQuery[T any, R any](bus *CommandBus, qry command.Querier[T, R], runnerOpts ...runner.Option) (dispatcher.Subscription, error) {
	if bus == nil || !bus.enabled {
		return nil, nil
	}
	sub, err := registry.RegisterQuery(qry, runnerOpts...)
	if err != nil {
		if sub != nil {
			sub.Unsubscribe()
		}
		return nil, err
	}
	bus.track(sub)
	return sub, nil
}

// RegisterFactory stores a message factory for name-based dispatch.
func (b *CommandBus) RegisterFactory(name string, factory MessageFactory) error {
	if b == nil || !b.enabled {
		return nil
	}
	if name == "" {
		return validationDomainError("command name required", map[string]any{
			"field": "command_name",
		})
	}
	if factory == nil {
		return validationDomainError("command factory required", map[string]any{
			"field": "command_factory",
		})
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	if b.factories == nil {
		b.factories = map[string]MessageFactory{}
	}
	if _, exists := b.factories[name]; exists {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	b.factories[name] = factory
	return nil
}

// RegisterMessageFactory registers both a factory and a typed dispatcher for name-based routing.
func RegisterMessageFactory[T any](bus *CommandBus, name string, build func(payload map[string]any, ids []string) (T, error)) error {
	if bus == nil || !bus.enabled {
		return nil
	}
	if name == "" {
		return validationDomainError("command name required", map[string]any{
			"field": "command_name",
		})
	}
	if build == nil {
		return validationDomainError("command factory required", map[string]any{
			"field": "command_factory",
		})
	}

	bus.mu.Lock()
	defer bus.mu.Unlock()
	if bus.factories == nil {
		bus.factories = map[string]MessageFactory{}
	}
	if bus.dispatchers == nil {
		bus.dispatchers = map[string]DispatchFactory{}
	}
	if _, exists := bus.factories[name]; exists || bus.dispatchers[name] != nil {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}

	bus.factories[name] = func(payload map[string]any, ids []string) (command.Message, error) {
		msg, err := build(payload, ids)
		if err != nil {
			return nil, err
		}
		typed, ok := any(msg).(command.Message)
		if !ok {
			return nil, validationDomainError("message does not implement command.Message", map[string]any{
				"command_name": name,
			})
		}
		return typed, nil
	}
	bus.dispatchers[name] = func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
		msg, err := build(payload, ids)
		if err != nil {
			return command.DispatchReceipt{}, err
		}
		return dispatcher.DispatchWith(ctx, msg, opts)
	}
	return nil
}

// DispatchByName routes a named command through the dispatcher.
func (b *CommandBus) DispatchByName(ctx context.Context, name string, payload map[string]any, ids []string) error {
	_, err := b.DispatchByNameWithOptions(ctx, name, payload, ids, command.DispatchOptions{
		Mode: command.ExecutionModeInline,
	})
	return err
}

// DispatchByNameWithOptions routes a named command through the dispatcher using explicit dispatch options.
func (b *CommandBus) DispatchByNameWithOptions(ctx context.Context, name string, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
	if b == nil || !b.enabled {
		return command.DispatchReceipt{}, FeatureDisabledError{Feature: string(FeatureCommands)}
	}
	if name == "" {
		return command.DispatchReceipt{}, ErrNotFound
	}

	b.mu.Lock()
	dispatch := b.dispatchers[name]
	factory := b.factories[name]
	policy := b.executionPolicy
	b.mu.Unlock()

	resolvedMode, err := resolveDispatchModeForCommand(name, opts.Mode, policy)
	if err != nil {
		return command.DispatchReceipt{}, err
	}
	opts.Mode = resolvedMode

	if dispatch != nil {
		return dispatch(ctx, payload, ids, opts)
	}
	if factory == nil {
		return command.DispatchReceipt{}, ErrNotFound
	}
	if _, err := factory(payload, ids); err != nil {
		return command.DispatchReceipt{}, err
	}
	return command.DispatchReceipt{}, serviceUnavailableDomainError("command dispatcher not registered", map[string]any{
		"command_name": name,
	})
}

// SetExecutionPolicy replaces command dispatch policy for name-based dispatch.
func (b *CommandBus) SetExecutionPolicy(policy CommandExecutionPolicy) error {
	if b == nil {
		return nil
	}
	normalized, err := normalizeCommandExecutionPolicy(policy)
	if err != nil {
		return err
	}
	b.mu.Lock()
	b.executionPolicy = normalized
	b.mu.Unlock()
	return nil
}

// ExecutionPolicy returns the current command execution policy snapshot.
func (b *CommandBus) ExecutionPolicy() CommandExecutionPolicy {
	if b == nil {
		return CommandExecutionPolicy{
			DefaultMode: command.ExecutionModeInline,
			PerCommand:  map[string]command.ExecutionMode{},
		}
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.executionPolicy.Clone()
}

func resolveDispatchModeForCommand(commandName string, explicit command.ExecutionMode, policy CommandExecutionPolicy) (command.ExecutionMode, error) {
	explicit = command.NormalizeExecutionMode(explicit)
	if explicit != "" {
		if err := command.ValidateExecutionMode(explicit); err != nil {
			return "", err
		}
		return explicit, nil
	}
	if mode, ok := policy.Resolve(commandName); ok {
		if err := command.ValidateExecutionMode(mode); err != nil {
			return "", err
		}
		return mode, nil
	}
	mode := command.NormalizeExecutionMode(policy.DefaultMode)
	if mode == "" {
		mode = command.ExecutionModeInline
	}
	if err := command.ValidateExecutionMode(mode); err != nil {
		return "", err
	}
	return mode, nil
}

// Reset unsubscribes registered handlers and clears factories.
func (b *CommandBus) Reset() {
	if b == nil {
		return
	}
	b.mu.Lock()
	subs := b.subs
	b.subs = nil
	b.factories = map[string]MessageFactory{}
	b.dispatchers = map[string]DispatchFactory{}
	b.mu.Unlock()

	for _, sub := range subs {
		if sub != nil {
			sub.Unsubscribe()
		}
	}
}

// Close is an alias for Reset.
func (b *CommandBus) Close() {
	b.Reset()
}

func (b *CommandBus) track(sub dispatcher.Subscription) {
	if b == nil || sub == nil {
		return
	}
	b.mu.Lock()
	b.subs = append(b.subs, sub)
	b.mu.Unlock()
}

// HasFactory reports whether a named message factory is registered.
func (b *CommandBus) HasFactory(name string) bool {
	if b == nil || !b.enabled {
		return false
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return false
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.factories == nil {
		return false
	}
	_, ok := b.factories[name]
	return ok
}
