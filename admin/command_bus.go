package admin

import (
	"context"
	"reflect"
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

// ContextMessageFactory builds typed command messages from request data and
// the effective dispatch context.
type ContextMessageFactory func(ctx context.Context, payload map[string]any, ids []string) (command.Message, error)

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
type contextMessageBuilder[T any] func(context.Context, map[string]any, []string) (T, error)

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
	enabled            bool
	mu                 sync.RWMutex
	lifecycleEpoch     uint64
	nextOwnedToken     uint64
	subs               []dispatcher.Subscription
	factories          map[string]ContextMessageFactory
	dispatchers        map[string]DispatchFactory
	resultDispatchers  map[string]ResultDispatchFactory
	handlerCommands    map[string]bool
	legacyHandlerIDs   map[string]bool
	legacyMessageTypes map[string]bool
	owned              map[string]*ownedCommandGeneration
	ownedFactories     map[string]ownedFactoryEntry
	ownedHandlerIDs    map[string]string
	ownedMessageTypes  map[string]string
	ownedDescriptorIDs map[string]string
	ownedRuntimeConfig OwnedCommandRuntimeConfig
	executionPolicy    CommandExecutionPolicy
}

// NewCommandBus constructs a command bus that can be toggled off.
func NewCommandBus(enabled bool) *CommandBus {
	return &CommandBus{
		enabled:            enabled,
		factories:          map[string]ContextMessageFactory{},
		dispatchers:        map[string]DispatchFactory{},
		resultDispatchers:  map[string]ResultDispatchFactory{},
		handlerCommands:    map[string]bool{},
		legacyHandlerIDs:   map[string]bool{},
		legacyMessageTypes: map[string]bool{},
		owned:              map[string]*ownedCommandGeneration{},
		ownedFactories:     map[string]ownedFactoryEntry{},
		ownedHandlerIDs:    map[string]string{},
		ownedMessageTypes:  map[string]string{},
		ownedDescriptorIDs: map[string]string{},
		executionPolicy:    CommandExecutionPolicy{DefaultMode: command.ExecutionModeInline, PerCommand: map[string]command.ExecutionMode{}},
	}
}

// Enable toggles the command bus on/off.
func (b *CommandBus) Enable(enabled bool) {
	if b == nil {
		return
	}
	b.mu.Lock()
	if b.enabled != enabled {
		b.enabled = enabled
		b.lifecycleEpoch++
	}
	b.mu.Unlock()
}

// RegisterCommand wires a command handler into the go-command registry and dispatcher.
func RegisterCommand[T any](bus *CommandBus, cmd command.Commander[T], runnerOpts ...runner.Option) (dispatcher.Subscription, error) {
	if bus == nil {
		return nil, nil
	}
	bus.mu.Lock()
	defer bus.mu.Unlock()
	if !bus.enabled {
		return nil, nil
	}
	registrations, err := command.MessageRegistrationsForCommand(cmd)
	if err != nil {
		return nil, err
	}
	if err := bus.validateLegacyCommandRegistrationLocked(registrations); err != nil {
		return nil, err
	}
	sub, err := registry.RegisterCommand(cmd, runnerOpts...)
	if err != nil {
		if sub != nil {
			sub.Unsubscribe()
		}
		return nil, err
	}
	if sub != nil {
		bus.subs = append(bus.subs, sub)
	}
	if bus.handlerCommands == nil {
		bus.handlerCommands = map[string]bool{}
	}
	if bus.legacyHandlerIDs == nil {
		bus.legacyHandlerIDs = map[string]bool{}
	}
	if bus.legacyMessageTypes == nil {
		bus.legacyMessageTypes = map[string]bool{}
	}
	for _, registration := range registrations {
		if registration == nil || registration.Kind() != command.HandlerKindCommand {
			continue
		}
		messageType := strings.TrimSpace(registration.MessageType())
		bus.handlerCommands[messageType] = true
		bus.legacyHandlerIDs[ownedRegistrationKey(registration.Kind(), registration.ID())] = true
		bus.legacyMessageTypes[ownedRegistrationKey(registration.Kind(), messageType)] = true
	}
	return sub, nil
}

// RegisterQuery wires a query handler into the go-command registry and dispatcher.
func RegisterQuery[T any, R any](bus *CommandBus, qry command.Querier[T, R], runnerOpts ...runner.Option) (dispatcher.Subscription, error) {
	if bus == nil {
		return nil, nil
	}
	bus.mu.Lock()
	defer bus.mu.Unlock()
	if !bus.enabled {
		return nil, nil
	}
	sub, err := registry.RegisterQuery(qry, runnerOpts...)
	if err != nil {
		if sub != nil {
			sub.Unsubscribe()
		}
		return nil, err
	}
	if sub != nil {
		bus.subs = append(bus.subs, sub)
	}
	return sub, nil
}

func (b *CommandBus) validateLegacyCommandRegistrationLocked(registrations []command.MessageRegistration) error {
	for _, registration := range registrations {
		if registration == nil || registration.Kind() != command.HandlerKindCommand {
			continue
		}
		idKey := ownedRegistrationKey(registration.Kind(), registration.ID())
		typeKey := ownedRegistrationKey(registration.Kind(), registration.MessageType())
		if owner, exists := b.ownedHandlerIDs[idKey]; exists {
			return conflictDomainError("legacy command handler stable id conflicts with owner", map[string]any{
				"registration_id": registration.ID(), "owner": owner,
			})
		}
		if owner, exists := b.ownedMessageTypes[typeKey]; exists {
			return conflictDomainError("legacy command handler message type conflicts with owner", map[string]any{
				"message_type": registration.MessageType(), "owner": owner,
			})
		}
		if entry, exists := b.ownedFactories[strings.TrimSpace(registration.MessageType())]; exists {
			return conflictDomainError("legacy command handler message type conflicts with owned factory", map[string]any{
				"message_type": registration.MessageType(), "owner": entry.generation.owner,
			})
		}
	}
	return nil
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
	if b == nil {
		return
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return
	}
	b.mu.Lock()
	if !b.enabled {
		b.mu.Unlock()
		return
	}
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
		b.factories = map[string]ContextMessageFactory{}
	}
	if _, exists := b.factories[name]; exists || b.dispatchers[name] != nil || b.resultDispatchers[name] != nil {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	if _, exists := b.ownedFactories[name]; exists {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	b.factories[name] = func(_ context.Context, payload map[string]any, ids []string) (command.Message, error) {
		return factory(payload, ids)
	}
	return nil
}

func validateMessageRegistration(name string, build any) error {
	if strings.TrimSpace(name) == "" {
		return validationDomainError("command name required", map[string]any{
			"field": "command_name",
		})
	}
	if build == nil || (reflect.ValueOf(build).Kind() == reflect.Func && reflect.ValueOf(build).IsNil()) {
		return validationDomainError("command factory required", map[string]any{
			"field": "command_factory",
		})
	}
	return nil
}

func (b *CommandBus) prepareMessageRegistrationLocked(name string) error {
	if b.factories == nil {
		b.factories = map[string]ContextMessageFactory{}
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
	if _, exists := b.ownedFactories[name]; exists {
		return validationDomainError("command factory already registered", map[string]any{
			"command_name": name,
		})
	}
	return nil
}

func messageFactory[T any](name string, build contextMessageBuilder[T]) ContextMessageFactory {
	return func(ctx context.Context, payload map[string]any, ids []string) (command.Message, error) {
		msg, err := build(ctx, payload, ids)
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

func dispatchFactory[T any](build contextMessageBuilder[T]) DispatchFactory {
	return func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
		msg, err := build(ctx, payload, ids)
		if err != nil {
			return command.DispatchReceipt{}, err
		}
		return dispatcher.DispatchWith(ctx, msg, opts)
	}
}

func resultDispatchFactory[T any, R any](name string, build contextMessageBuilder[T]) ResultDispatchFactory {
	return func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions) (command.DispatchReceipt, any, error) {
		msg, err := build(ctx, payload, ids)
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
	if build == nil {
		return validateMessageRegistration(name, build)
	}
	return RegisterContextMessageFactory(bus, name, func(_ context.Context, payload map[string]any, ids []string) (T, error) {
		return build(payload, ids)
	})
}

// RegisterContextMessageFactory registers a context-aware factory and typed
// dispatcher for name-based routing.
func RegisterContextMessageFactory[T any](bus *CommandBus, name string, build contextMessageBuilder[T]) error {
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
	if build == nil {
		return validateMessageRegistration(name, build)
	}
	return RegisterContextMessageResultFactory[T, R](bus, name, func(_ context.Context, payload map[string]any, ids []string) (T, error) {
		return build(payload, ids)
	})
}

// RegisterContextMessageResultFactory registers a context-aware name-based
// command dispatcher that can return inline result data.
func RegisterContextMessageResultFactory[T any, R any](bus *CommandBus, name string, build contextMessageBuilder[T]) error {
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
	if b == nil {
		return DispatchOutcome{}, FeatureDisabledError{Feature: string(FeatureCommands)}
	}
	if name == "" {
		return DispatchOutcome{}, ErrNotFound
	}

	b.mu.RLock()
	if !b.enabled {
		b.mu.RUnlock()
		return DispatchOutcome{}, FeatureDisabledError{Feature: string(FeatureCommands)}
	}
	dispatch := b.dispatchers[name]
	resultDispatch := b.resultDispatchers[name]
	factory := b.factories[name]
	ownedFactory := b.ownedFactories[name]
	policy := b.executionPolicy
	b.mu.RUnlock()

	effective, err := normalizeCommandDispatchOptions(ctx, name, opts, policy)
	if err != nil {
		return DispatchOutcome{}, err
	}
	ctx = command.ContextWithDispatchOptions(ctx, effective)

	if ownedFactory.generation != nil {
		return ownedFactory.declaration.dispatch(ctx, payload, ids, effective, ownedFactory.generation.runtime)
	}
	if resultDispatch != nil {
		receipt, result, err := resultDispatch(ctx, payload, ids, effective)
		if err != nil {
			return DispatchOutcome{}, err
		}
		return DispatchOutcome{Receipt: receipt, Result: result}, nil
	}
	if dispatch != nil {
		receipt, err := dispatch(ctx, payload, ids, effective)
		if err != nil {
			return DispatchOutcome{}, err
		}
		return DispatchOutcome{Receipt: receipt}, nil
	}
	if factory == nil {
		return DispatchOutcome{}, ErrNotFound
	}
	if _, err := factory(ctx, payload, ids); err != nil {
		return DispatchOutcome{}, err
	}
	return DispatchOutcome{}, serviceUnavailableDomainError("command dispatcher not registered", map[string]any{
		"command_name": name,
	})
}

func normalizeCommandDispatchOptions(ctx context.Context, commandName string, explicit command.DispatchOptions, policy CommandExecutionPolicy) (command.DispatchOptions, error) {
	contextOptions, _ := command.DispatchOptionsFromContext(ctx)
	effective := cloneCommandDispatchOptions(contextOptions)

	if strings.TrimSpace(string(explicit.Mode)) != "" {
		effective.Mode = explicit.Mode
	}
	if strings.TrimSpace(explicit.IdempotencyKey) != "" {
		effective.IdempotencyKey = explicit.IdempotencyKey
	}
	if strings.TrimSpace(string(explicit.DedupPolicy)) != "" {
		effective.DedupPolicy = explicit.DedupPolicy
	}
	if explicit.Delay != 0 {
		effective.Delay = explicit.Delay
		effective.RunAt = nil
	}
	if explicit.RunAt != nil {
		runAt := *explicit.RunAt
		effective.RunAt = &runAt
		effective.Delay = 0
	}
	if strings.TrimSpace(explicit.CorrelationID) != "" {
		effective.CorrelationID = explicit.CorrelationID
	}
	effective.Metadata = mergeCommandDispatchMetadata(effective.Metadata, explicit.Metadata)

	mode, err := resolveDispatchModeForCommand(commandName, effective.Mode, policy)
	if err != nil {
		return command.DispatchOptions{}, err
	}
	effective.Mode = mode
	effective.IdempotencyKey = strings.TrimSpace(effective.IdempotencyKey)
	effective.DedupPolicy = command.NormalizeDedupPolicy(effective.DedupPolicy)
	effective.CorrelationID = strings.TrimSpace(effective.CorrelationID)
	if err := command.ValidateDispatchOptions(mode, effective); err != nil {
		return command.DispatchOptions{}, err
	}
	return effective, nil
}

func cloneCommandDispatchOptions(opts command.DispatchOptions) command.DispatchOptions {
	out := opts
	if opts.RunAt != nil {
		runAt := *opts.RunAt
		out.RunAt = &runAt
	}
	out.Metadata = mergeCommandDispatchMetadata(nil, opts.Metadata)
	return out
}

func mergeCommandDispatchMetadata(base map[string]any, override map[string]any) map[string]any {
	if len(base) == 0 && len(override) == 0 {
		return nil
	}
	out := make(map[string]any, len(base)+len(override))
	for key, value := range base {
		out[key] = value
	}
	for key, value := range override {
		out[key] = value
	}
	return out
}

// CommandRegistration returns the registration state for name-based dispatch.
func (b *CommandBus) CommandRegistration(name string) CommandRegistrationState {
	if b == nil || strings.TrimSpace(name) == "" {
		return CommandRegistrationState{}
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	if !b.enabled {
		return CommandRegistrationState{}
	}
	if entry, ok := b.ownedFactories[name]; ok {
		return CommandRegistrationState{
			Handler:          true,
			Factory:          true,
			Dispatcher:       true,
			ResultDispatcher: entry.declaration.result,
		}
	}
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
	b.lifecycleEpoch++
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
	b.mu.RLock()
	defer b.mu.RUnlock()
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
	b.lifecycleEpoch++
	subs := b.subs
	owned := make([]*ownedCommandGeneration, 0, len(b.owned))
	for _, generation := range b.owned {
		owned = append(owned, generation)
	}
	b.subs = nil
	b.factories = map[string]ContextMessageFactory{}
	b.dispatchers = map[string]DispatchFactory{}
	b.resultDispatchers = map[string]ResultDispatchFactory{}
	b.handlerCommands = map[string]bool{}
	b.legacyHandlerIDs = map[string]bool{}
	b.legacyMessageTypes = map[string]bool{}
	b.owned = map[string]*ownedCommandGeneration{}
	b.ownedFactories = map[string]ownedFactoryEntry{}
	b.ownedHandlerIDs = map[string]string{}
	b.ownedMessageTypes = map[string]string{}
	b.ownedDescriptorIDs = map[string]string{}
	b.mu.Unlock()

	for _, sub := range subs {
		if sub != nil {
			sub.Unsubscribe()
		}
	}
	for _, generation := range owned {
		generation.cleanup()
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
	b.mu.RLock()
	defer b.mu.RUnlock()
	if b.factories == nil {
		return false
	}
	_, ok := b.factories[name]
	if !ok {
		_, ok = b.ownedFactories[name]
	}
	return ok
}

// Names returns a sorted snapshot of command names known to the bus.
func (b *CommandBus) Names() []string {
	if b == nil {
		return nil
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	if !b.enabled {
		return nil
	}
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
	for name := range b.ownedFactories {
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

func (b *CommandBus) isEnabled() bool {
	if b == nil {
		return false
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.enabled
}

func (b *CommandBus) lifecycleSnapshot() (uint64, bool, OwnedCommandRuntimeConfig, CommandExecutionPolicy) {
	if b == nil {
		return 0, false, OwnedCommandRuntimeConfig{}, CommandExecutionPolicy{}
	}
	b.mu.RLock()
	defer b.mu.RUnlock()
	return b.lifecycleEpoch, b.enabled, cloneOwnedRuntimeConfig(b.ownedRuntimeConfig), b.executionPolicy.Clone()
}

func (b *CommandBus) publishOwnedGeneration(epoch uint64, generation *ownedCommandGeneration) error {
	if b == nil || generation == nil {
		return validationDomainError("owned command generation required", nil)
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.enabled || b.lifecycleEpoch != epoch {
		return conflictDomainError("command bus lifecycle changed during registration commit", map[string]any{
			"owner": generation.owner,
		})
	}
	if b.owned == nil {
		b.owned = map[string]*ownedCommandGeneration{}
	}
	if b.ownedFactories == nil {
		b.ownedFactories = map[string]ownedFactoryEntry{}
	}
	if b.ownedHandlerIDs == nil {
		b.ownedHandlerIDs = map[string]string{}
	}
	if b.ownedMessageTypes == nil {
		b.ownedMessageTypes = map[string]string{}
	}
	if b.ownedDescriptorIDs == nil {
		b.ownedDescriptorIDs = map[string]string{}
	}
	if _, exists := b.owned[generation.owner]; exists {
		return conflictDomainError("command registration owner already committed", map[string]any{"owner": generation.owner})
	}
	for name := range generation.factories {
		if b.factories[name] != nil || b.dispatchers[name] != nil || b.resultDispatchers[name] != nil {
			return conflictDomainError("command factory name conflicts with legacy registration", map[string]any{
				"owner":        generation.owner,
				"command_name": name,
			})
		}
		if existing, exists := b.ownedFactories[name]; exists {
			return conflictDomainError("command factory name already owned", map[string]any{
				"owner":          generation.owner,
				"command_name":   name,
				"existing_owner": existing.generation.owner,
			})
		}
		if b.handlerCommands[name] {
			return conflictDomainError("owned command factory name conflicts with legacy handler", map[string]any{
				"owner": generation.owner, "command_name": name,
			})
		}
	}
	for _, registration := range generation.registrations {
		idKey := ownedRegistrationKey(registration.Kind(), registration.ID())
		typeKey := ownedRegistrationKey(registration.Kind(), registration.MessageType())
		if existingOwner, exists := b.ownedHandlerIDs[idKey]; exists {
			return conflictDomainError("command handler stable id already owned", map[string]any{
				"owner": generation.owner, "registration_id": registration.ID(), "existing_owner": existingOwner,
			})
		}
		if existingOwner, exists := b.ownedMessageTypes[typeKey]; exists {
			return conflictDomainError("command handler message type already owned", map[string]any{
				"owner": generation.owner, "message_type": registration.MessageType(), "existing_owner": existingOwner,
			})
		}
		if b.handlerCommands[registration.MessageType()] {
			return conflictDomainError("owned command conflicts with legacy handler", map[string]any{
				"owner": generation.owner, "message_type": registration.MessageType(),
			})
		}
		if b.legacyHandlerIDs[idKey] {
			return conflictDomainError("owned command stable id conflicts with legacy handler", map[string]any{
				"owner": generation.owner, "registration_id": registration.ID(),
			})
		}
		if b.legacyMessageTypes[typeKey] {
			return conflictDomainError("owned command message type conflicts with legacy handler", map[string]any{
				"owner": generation.owner, "message_type": registration.MessageType(),
			})
		}
		if b.factories[registration.MessageType()] != nil ||
			b.dispatchers[registration.MessageType()] != nil ||
			b.resultDispatchers[registration.MessageType()] != nil {
			return conflictDomainError("owned command message type conflicts with legacy factory", map[string]any{
				"owner": generation.owner, "message_type": registration.MessageType(),
			})
		}
	}
	for _, descriptor := range generation.descriptors {
		if existingOwner, exists := b.ownedDescriptorIDs[descriptor.ID]; exists {
			return conflictDomainError("command descriptor stable id already owned", map[string]any{
				"owner": generation.owner, "descriptor_id": descriptor.ID, "existing_owner": existingOwner,
			})
		}
	}

	b.nextOwnedToken++
	generation.token = b.nextOwnedToken
	b.owned[generation.owner] = generation
	for name, declaration := range generation.factories {
		b.ownedFactories[name] = ownedFactoryEntry{generation: generation, declaration: declaration}
	}
	for _, registration := range generation.registrations {
		b.ownedHandlerIDs[ownedRegistrationKey(registration.Kind(), registration.ID())] = generation.owner
		b.ownedMessageTypes[ownedRegistrationKey(registration.Kind(), registration.MessageType())] = generation.owner
	}
	for _, descriptor := range generation.descriptors {
		b.ownedDescriptorIDs[descriptor.ID] = generation.owner
	}
	return nil
}

func (b *CommandBus) closeOwnedGeneration(generation *ownedCommandGeneration) error {
	if generation == nil {
		return nil
	}
	b.mu.Lock()
	current := b.owned[generation.owner]
	if current != nil && current.token == generation.token {
		delete(b.owned, generation.owner)
		for name, entry := range b.ownedFactories {
			if entry.generation != nil && entry.generation.token == generation.token {
				delete(b.ownedFactories, name)
			}
		}
		for _, registration := range generation.registrations {
			delete(b.ownedHandlerIDs, ownedRegistrationKey(registration.Kind(), registration.ID()))
			delete(b.ownedMessageTypes, ownedRegistrationKey(registration.Kind(), registration.MessageType()))
		}
		for _, descriptor := range generation.descriptors {
			delete(b.ownedDescriptorIDs, descriptor.ID)
		}
	}
	b.mu.Unlock()
	generation.cleanup()
	return nil
}
