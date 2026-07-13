package admin

import (
	"context"
	"sort"
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

// DispatchOutcome contains the receipt and optional inline result from a dispatch.
type DispatchOutcome struct {
	Receipt command.DispatchReceipt
	Result  any
}

// CommandResultFailureReporter lets an inline command result report an
// operational failure while remaining available to outcome-aware callers.
// Dispatch APIs that discard inline results return this failure to the caller.
type CommandResultFailureReporter interface {
	CommandResultFailure() error
}

// CommandResultFailure returns an operational failure reported by an inline
// command result. Results that do not implement CommandResultFailureReporter are
// treated as successful transport outcomes.
func CommandResultFailure(result any) error {
	reporter, ok := result.(CommandResultFailureReporter)
	if !ok || reporter == nil {
		return nil
	}
	return reporter.CommandResultFailure()
}

// ResultDispatchFactory executes a typed dispatch and returns an inline result when available.
type ResultDispatchFactory func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, any, error)

type messageBuilder[T any] func(payload map[string]any, ids []string) (T, error)

// CommandRegistrationState describes how a command name can be dispatched.
type CommandRegistrationState struct {
	Handler          bool
	Factory          bool
	Dispatcher       bool
	ResultDispatcher bool
}

// Registered reports whether the command name is known to the command bus.
func (s CommandRegistrationState) Registered() bool {
	return s.Handler || s.Factory || s.Dispatcher || s.ResultDispatcher
}

// CanDispatch reports whether the command can be executed by name.
func (s CommandRegistrationState) CanDispatch() bool {
	return s.Handler && (s.Dispatcher || s.ResultDispatcher)
}

// SupportsInlineResult reports whether the command can return an inline result.
func (s CommandRegistrationState) SupportsInlineResult() bool {
	return s.Handler && s.ResultDispatcher
}

// CommandBus registers command/query handlers and dispatches by name.
type CommandBus struct {
	enabled           bool
	mu                sync.Mutex
	subs              []dispatcher.Subscription
	factories         map[string]MessageFactory
	dispatchers       map[string]DispatchFactory
	resultDispatchers map[string]ResultDispatchFactory
	handlerCommands   map[string]bool
	executionPolicy   CommandExecutionPolicy
}

// NewCommandBus constructs a command bus that can be toggled off.
func NewCommandBus(enabled bool) *CommandBus {
	return &CommandBus{
		enabled:           enabled,
		factories:         map[string]MessageFactory{},
		dispatchers:       map[string]DispatchFactory{},
		resultDispatchers: map[string]ResultDispatchFactory{},
		handlerCommands:   map[string]bool{},
		executionPolicy:   CommandExecutionPolicy{DefaultMode: command.ExecutionModeInline, PerCommand: map[string]command.ExecutionMode{}},
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
	if name := commandMessageType[T](); name != "" {
		bus.MarkCommandHandlerRegistered(name)
	}
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

func commandMessageType[T any]() string {
	var zero T
	if msg, ok := any(zero).(command.Message); ok {
		return strings.TrimSpace(msg.Type())
	}
	return ""
}

// MarkCommandHandlerRegistered records that a typed command handler exists for
// a public command name. This is used by capability checks before advertising
// browser-dispatchable actions.
func (b *CommandBus) MarkCommandHandlerRegistered(name string) {
	if b == nil || !b.enabled {
		return
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	b.mu.Lock()
	if b.handlerCommands == nil {
		b.handlerCommands = map[string]bool{}
	}
	b.handlerCommands[name] = true
	b.mu.Unlock()
}

// RegisterFactory stores a message factory for name-based dispatch.
func (b *CommandBus) RegisterFactory(name string, factory MessageFactory) error {
	if b == nil {
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
	if _, exists := b.factories[name]; exists || b.dispatchers[name] != nil || b.resultDispatchers[name] != nil {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	b.factories[name] = factory
	return nil
}

func validateMessageRegistration[T any](name string, build messageBuilder[T]) error {
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
	return nil
}

func (b *CommandBus) prepareMessageRegistrationLocked(name string) error {
	if b.factories == nil {
		b.factories = map[string]MessageFactory{}
	}
	if b.dispatchers == nil {
		b.dispatchers = map[string]DispatchFactory{}
	}
	if b.resultDispatchers == nil {
		b.resultDispatchers = map[string]ResultDispatchFactory{}
	}
	if _, exists := b.factories[name]; exists || b.dispatchers[name] != nil || b.resultDispatchers[name] != nil {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	return nil
}

func messageFactory[T any](name string, build messageBuilder[T]) MessageFactory {
	return func(payload map[string]any, ids []string) (command.Message, error) {
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
}

func dispatchFactory[T any](build messageBuilder[T]) DispatchFactory {
	return func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
		msg, err := build(payload, ids)
		if err != nil {
			return command.DispatchReceipt{}, err
		}
		return dispatcher.DispatchWith(ctx, msg, opts)
	}
}

func resultDispatchFactory[T any, R any](name string, build messageBuilder[T]) ResultDispatchFactory {
	return func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, any, error) {
		msg, err := build(payload, ids)
		if err != nil {
			return command.DispatchReceipt{}, nil, err
		}
		if opts.Mode != command.ExecutionModeInline {
			receipt, dispatchErr := dispatcher.DispatchWith(ctx, msg, opts)
			return receipt, nil, dispatchErr
		}
		result := command.NewResult[R]()
		ctx = command.ContextWithResult(ctx, result)
		receipt, dispatchErr := dispatcher.DispatchWith(ctx, msg, opts)
		if dispatchErr != nil {
			return command.DispatchReceipt{}, nil, dispatchErr
		}
		value, stored := result.Load()
		if !stored {
			return command.DispatchReceipt{}, nil, serviceUnavailableDomainError("command result was not stored", map[string]any{
				"command_name": name,
			})
		}
		if err := result.Error(); err != nil {
			return command.DispatchReceipt{}, nil, err
		}
		return receipt, value, nil
	}
}

// RegisterMessageFactory registers both a factory and a typed dispatcher for name-based routing.
func RegisterMessageFactory[T any](bus *CommandBus, name string, build messageBuilder[T]) error {
	if bus == nil {
		return nil
	}
	if err := validateMessageRegistration(name, build); err != nil {
		return err
	}

	bus.mu.Lock()
	defer bus.mu.Unlock()
	if err := bus.prepareMessageRegistrationLocked(name); err != nil {
		return err
	}

	bus.factories[name] = messageFactory(name, build)
	bus.dispatchers[name] = dispatchFactory(build)
	return nil
}

// RegisterMessageResultFactory registers a name-based command dispatcher that can return inline result data.
func RegisterMessageResultFactory[T any, R any](bus *CommandBus, name string, build messageBuilder[T]) error {
	if bus == nil {
		return nil
	}
	if err := validateMessageRegistration(name, build); err != nil {
		return err
	}

	bus.mu.Lock()
	defer bus.mu.Unlock()
	if err := bus.prepareMessageRegistrationLocked(name); err != nil {
		return err
	}

	bus.factories[name] = messageFactory(name, build)
	bus.dispatchers[name] = dispatchFactory(build)
	bus.resultDispatchers[name] = resultDispatchFactory[T, R](name, build)
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
	outcome, err := b.DispatchByNameWithOutcome(ctx, name, payload, ids, opts)
	if err != nil {
		return command.DispatchReceipt{}, err
	}
	if resultErr := CommandResultFailure(outcome.Result); resultErr != nil {
		return outcome.Receipt, resultErr
	}
	return outcome.Receipt, nil
}

// DispatchByNameWithOutcome routes a named command and returns an optional inline result.
func (b *CommandBus) DispatchByNameWithOutcome(ctx context.Context, name string, payload map[string]any, ids []string, opts command.DispatchOptions) (DispatchOutcome, error) {
	if b == nil || !b.enabled {
		return DispatchOutcome{}, FeatureDisabledError{Feature: string(FeatureCommands)}
	}
	if name == "" {
		return DispatchOutcome{}, ErrNotFound
	}

	b.mu.Lock()
	dispatch := b.dispatchers[name]
	resultDispatch := b.resultDispatchers[name]
	factory := b.factories[name]
	policy := b.executionPolicy
	b.mu.Unlock()

	resolvedMode, err := resolveDispatchModeForCommand(name, opts.Mode, policy)
	if err != nil {
		return DispatchOutcome{}, err
	}
	opts.Mode = resolvedMode

	if resultDispatch != nil {
		receipt, result, err := resultDispatch(ctx, payload, ids, opts)
		if err != nil {
			return DispatchOutcome{}, err
		}
		return DispatchOutcome{Receipt: receipt, Result: result}, nil
	}
	if dispatch != nil {
		receipt, err := dispatch(ctx, payload, ids, opts)
		if err != nil {
			return DispatchOutcome{}, err
		}
		return DispatchOutcome{Receipt: receipt}, nil
	}
	if factory == nil {
		return DispatchOutcome{}, ErrNotFound
	}
	if _, err := factory(payload, ids); err != nil {
		return DispatchOutcome{}, err
	}
	return DispatchOutcome{}, serviceUnavailableDomainError("command dispatcher not registered", map[string]any{
		"command_name": name,
	})
}

// CommandRegistration returns the registration state for name-based dispatch.
func (b *CommandBus) CommandRegistration(name string) CommandRegistrationState {
	if b == nil || !b.enabled || strings.TrimSpace(name) == "" {
		return CommandRegistrationState{}
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	return CommandRegistrationState{
		Handler:          b.handlerCommands[name],
		Factory:          b.factories[name] != nil,
		Dispatcher:       b.dispatchers[name] != nil,
		ResultDispatcher: b.resultDispatchers[name] != nil,
	}
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
	b.resultDispatchers = map[string]ResultDispatchFactory{}
	b.handlerCommands = map[string]bool{}
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
	if b == nil {
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

// Names returns a sorted snapshot of command names known to the bus.
func (b *CommandBus) Names() []string {
	if b == nil || !b.enabled {
		return nil
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	seen := map[string]struct{}{}
	out := make([]string, 0, len(b.factories)+len(b.dispatchers))
	for name := range b.factories {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	for name := range b.dispatchers {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		if _, ok := seen[name]; ok {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}
