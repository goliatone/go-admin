package admin

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"sync"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	"github.com/goliatone/go-command/runner"
)

const (
	registrationSetBuilding = "building"
	registrationSetStaging  = "staging"
	registrationSetDone     = "committed"
	registrationSetFailed   = "failed"
)

// CommandRegistrationHandle owns one committed registration generation.
type CommandRegistrationHandle interface {
	Owner() string
	Close() error
}

// CommandRegistrationSet stages one owner's handlers and factories before
// publishing them atomically to a CommandBus.
type CommandRegistrationSet struct {
	mu        sync.Mutex
	bus       *CommandBus
	owner     string
	state     string
	commands  []ownedCommandDeclaration
	factories []ownedFactoryDeclaration
}

type ownedCommandDeclaration struct {
	handler       any
	registrations []command.MessageRegistration
	subscribe     func(*dispatcher.Runtime, []runner.Option) (dispatcher.Subscription, error)
}

type ownedFactoryDeclaration struct {
	name        string
	requestType reflect.Type
	factory     ContextMessageFactory
	dispatch    func(context.Context, map[string]any, []string, command.DispatchOptions, *dispatcher.Runtime) (DispatchOutcome, error)
	result      bool
}

type ownedFactoryEntry struct {
	generation  *ownedCommandGeneration
	declaration ownedFactoryDeclaration
}

type ownedCommandGeneration struct {
	owner         string
	token         uint64
	runtime       *dispatcher.Runtime
	registry      *command.Registry
	subscriptions []dispatcher.Subscription
	factories     map[string]ownedFactoryDeclaration
	registrations []command.MessageRegistration
	descriptors   []command.CommandDescriptor
	cleanupOnce   sync.Once
}

func (g *ownedCommandGeneration) cleanup() {
	if g == nil {
		return
	}
	g.cleanupOnce.Do(func() {
		for _, subscription := range g.subscriptions {
			if subscription != nil {
				subscription.Unsubscribe()
			}
		}
		if g.runtime != nil {
			g.runtime.Reset()
		}
	})
}

type ownedCommandRegistrationHandle struct {
	owner      string
	bus        *CommandBus
	generation *ownedCommandGeneration
	once       sync.Once
	err        error
}

func (h *ownedCommandRegistrationHandle) Owner() string {
	if h == nil {
		return ""
	}
	return h.owner
}

func (h *ownedCommandRegistrationHandle) Close() error {
	if h == nil {
		return nil
	}
	h.once.Do(func() {
		if h.bus != nil && h.generation != nil {
			h.err = h.bus.closeOwnedGeneration(h.generation)
		}
	})
	return h.err
}

// NewRegistrationSet creates a single-use owner-scoped registration builder.
func (b *CommandBus) NewRegistrationSet(owner string) (*CommandRegistrationSet, error) {
	owner = strings.TrimSpace(owner)
	if owner == "" {
		return nil, validationDomainError("command registration owner required", map[string]any{"field": "owner"})
	}
	return &CommandRegistrationSet{
		bus:   b,
		owner: owner,
		state: registrationSetBuilding,
	}, nil
}

// RegisterSetCommand stages a typed command handler and its runner options.
func RegisterSetCommand[T any](set *CommandRegistrationSet, handler command.Commander[T], opts ...runner.Option) error {
	if set == nil {
		return validationDomainError("command registration set required", map[string]any{"field": "registration_set"})
	}
	if isNilRegistrationValue(handler) {
		return validationDomainError("command handler required", map[string]any{"field": "command_handler"})
	}
	registrations, err := command.MessageRegistrationsForCommand(handler)
	if err != nil {
		return err
	}
	options := append([]runner.Option(nil), opts...)
	return set.addCommand(ownedCommandDeclaration{
		handler:       handler,
		registrations: registrations,
		subscribe: func(runtime *dispatcher.Runtime, defaults []runner.Option) (dispatcher.Subscription, error) {
			combined := append(append([]runner.Option(nil), defaults...), options...)
			return dispatcher.CommandSubscriptionHook[T](runtime)(handler, combined...)
		},
	})
}

// RegisterSetMessageFactory stages a context-free named factory.
func RegisterSetMessageFactory[T any](set *CommandRegistrationSet, name string, build messageBuilder[T]) error {
	if build == nil {
		return validateMessageRegistration(name, build)
	}
	return RegisterSetContextMessageFactory(set, name, func(_ context.Context, payload map[string]any, ids []string) (T, error) {
		return build(payload, ids)
	})
}

// RegisterSetMessageResultFactory stages a context-free named result factory.
func RegisterSetMessageResultFactory[T any, R any](set *CommandRegistrationSet, name string, build messageBuilder[T]) error {
	if build == nil {
		return validateMessageRegistration(name, build)
	}
	return RegisterSetContextMessageResultFactory[T, R](set, name, func(_ context.Context, payload map[string]any, ids []string) (T, error) {
		return build(payload, ids)
	})
}

// RegisterSetContextMessageFactory stages a context-aware named factory.
func RegisterSetContextMessageFactory[T any](set *CommandRegistrationSet, name string, build contextMessageBuilder[T]) error {
	if set == nil {
		return validationDomainError("command registration set required", map[string]any{"field": "registration_set"})
	}
	if err := validateMessageRegistration(name, build); err != nil {
		return err
	}
	name = strings.TrimSpace(name)
	factory := messageFactory(name, build)
	return set.addFactory(ownedFactoryDeclaration{
		name:        name,
		requestType: reflect.TypeFor[T](),
		factory:     factory,
		dispatch: func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions, runtime *dispatcher.Runtime) (DispatchOutcome, error) {
			message, err := build(ctx, payload, ids)
			if err != nil {
				return DispatchOutcome{}, err
			}
			outcome, err := runtime.Dispatch(ctx, command.HandlerKindCommand, message, opts)
			return DispatchOutcome{Receipt: outcome.Receipt, Result: outcome.Result}, err
		},
	})
}

// RegisterSetContextMessageResultFactory stages a context-aware named factory
// that can retrieve an inline typed result.
func RegisterSetContextMessageResultFactory[T any, R any](set *CommandRegistrationSet, name string, build contextMessageBuilder[T]) error {
	if set == nil {
		return validationDomainError("command registration set required", map[string]any{"field": "registration_set"})
	}
	if err := validateMessageRegistration(name, build); err != nil {
		return err
	}
	name = strings.TrimSpace(name)
	factory := messageFactory(name, build)
	return set.addFactory(ownedFactoryDeclaration{
		name:        name,
		requestType: reflect.TypeFor[T](),
		factory:     factory,
		result:      true,
		dispatch: func(ctx context.Context, payload map[string]any, ids []string, opts command.DispatchOptions, runtime *dispatcher.Runtime) (DispatchOutcome, error) {
			message, err := build(ctx, payload, ids)
			if err != nil {
				return DispatchOutcome{}, err
			}
			if opts.Mode != command.ExecutionModeInline {
				outcome, dispatchErr := runtime.Dispatch(ctx, command.HandlerKindCommand, message, opts)
				return DispatchOutcome{Receipt: outcome.Receipt}, dispatchErr
			}
			result := command.NewResult[R]()
			resultCtx := command.ContextWithResult(ctx, result)
			outcome, dispatchErr := runtime.Dispatch(resultCtx, command.HandlerKindCommand, message, opts)
			if dispatchErr != nil {
				return DispatchOutcome{Receipt: outcome.Receipt}, dispatchErr
			}
			if outcome.ResultPresent {
				if err := result.StoreDynamic(outcome.Result); err != nil {
					return DispatchOutcome{Receipt: outcome.Receipt}, err
				}
			}
			value, stored := result.Load()
			if !stored {
				return DispatchOutcome{Receipt: outcome.Receipt}, serviceUnavailableDomainError("command result was not stored", map[string]any{"command_name": name})
			}
			if resultErr := result.Error(); resultErr != nil {
				return DispatchOutcome{Receipt: outcome.Receipt}, resultErr
			}
			return DispatchOutcome{Receipt: outcome.Receipt, Result: value}, nil
		},
	})
}

func (s *CommandRegistrationSet) addCommand(declaration ownedCommandDeclaration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state != registrationSetBuilding {
		return registrationSetLifecycleError(s.owner, s.state)
	}
	s.commands = append(s.commands, declaration)
	return nil
}

func (s *CommandRegistrationSet) addFactory(declaration ownedFactoryDeclaration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.state != registrationSetBuilding {
		return registrationSetLifecycleError(s.owner, s.state)
	}
	for _, existing := range s.factories {
		if existing.name == declaration.name {
			return conflictDomainError("command factory already declared in registration set", map[string]any{
				"owner":        s.owner,
				"command_name": declaration.name,
			})
		}
	}
	s.factories = append(s.factories, declaration)
	return nil
}

// Commit validates and publishes the complete owner generation.
func (s *CommandRegistrationSet) Commit() (CommandRegistrationHandle, error) {
	if s == nil {
		return nil, validationDomainError("command registration set required", map[string]any{"field": "registration_set"})
	}
	s.mu.Lock()
	if s.state != registrationSetBuilding {
		state := s.state
		s.mu.Unlock()
		return nil, registrationSetLifecycleError(s.owner, state)
	}
	s.state = registrationSetStaging
	commands := append([]ownedCommandDeclaration(nil), s.commands...)
	factories := append([]ownedFactoryDeclaration(nil), s.factories...)
	s.mu.Unlock()

	registrations, err := validateOwnedDeclarations(s.owner, commands, factories)
	if err != nil {
		s.finishCommit(false)
		return nil, err
	}
	if s.bus == nil {
		s.finishCommit(true)
		return &ownedCommandRegistrationHandle{owner: s.owner}, nil
	}

	epoch, enabled, runtimeConfig, executionPolicy := s.bus.lifecycleSnapshot()
	if !enabled {
		s.finishCommit(true)
		return &ownedCommandRegistrationHandle{owner: s.owner}, nil
	}

	generation, err := stageOwnedGeneration(s.owner, commands, factories, registrations, runtimeConfig, executionPolicy)
	if err != nil {
		s.finishCommit(false)
		return nil, err
	}
	if err := s.bus.publishOwnedGeneration(epoch, generation); err != nil {
		generation.cleanup()
		s.finishCommit(false)
		return nil, err
	}
	s.finishCommit(true)
	return &ownedCommandRegistrationHandle{owner: s.owner, bus: s.bus, generation: generation}, nil
}

func (s *CommandRegistrationSet) finishCommit(committed bool) {
	s.mu.Lock()
	if committed {
		s.state = registrationSetDone
	} else {
		s.state = registrationSetFailed
	}
	s.mu.Unlock()
}

func validateOwnedDeclarations(owner string, commands []ownedCommandDeclaration, factories []ownedFactoryDeclaration) ([]command.MessageRegistration, error) {
	if len(commands) == 0 {
		return nil, validationDomainError("registration set requires at least one command handler", map[string]any{"owner": owner})
	}
	registrations := make([]command.MessageRegistration, 0, len(commands))
	ids := map[string]struct{}{}
	messageTypes := map[string]struct{}{}
	for _, declaration := range commands {
		if isNilRegistrationValue(declaration.handler) {
			return nil, validationDomainError("command handler required", map[string]any{"owner": owner})
		}
		for _, registration := range declaration.registrations {
			if registration == nil || registration.Kind() != command.HandlerKindCommand {
				continue
			}
			id := strings.TrimSpace(registration.ID())
			messageType := strings.TrimSpace(registration.MessageType())
			if _, exists := ids[id]; exists {
				return nil, conflictDomainError("duplicate command handler stable id", map[string]any{"owner": owner, "registration_id": id})
			}
			if _, exists := messageTypes[messageType]; exists {
				return nil, conflictDomainError("duplicate command handler message type", map[string]any{"owner": owner, "message_type": messageType})
			}
			ids[id] = struct{}{}
			messageTypes[messageType] = struct{}{}
			registrations = append(registrations, registration)
		}
	}
	if _, err := command.NewMessageRegistrationIndex(registrations...); err != nil {
		return nil, err
	}
	for _, factory := range factories {
		matches := 0
		for _, registration := range registrations {
			if factory.requestType.AssignableTo(registration.RequestType()) {
				matches++
			}
		}
		if matches != 1 {
			return nil, validationDomainError("named command must resolve to exactly one compatible handler", map[string]any{
				"owner":        owner,
				"command_name": factory.name,
				"request_type": factory.requestType.String(),
				"matches":      matches,
			})
		}
	}
	return registrations, nil
}

func stageOwnedGeneration(owner string, commands []ownedCommandDeclaration, factories []ownedFactoryDeclaration, registrations []command.MessageRegistration, config OwnedCommandRuntimeConfig, executionPolicy CommandExecutionPolicy) (*ownedCommandGeneration, error) {
	runtime := dispatcher.NewRuntime()
	localRegistry := command.NewRegistry()
	localRegistry.SetCronRegister(command.NilCronRegister)
	localRegistry.SetRPCRegister(func(command.RPCConfig, any, command.CommandMeta) error { return nil })
	generation := &ownedCommandGeneration{
		owner:         owner,
		runtime:       runtime,
		registry:      localRegistry,
		factories:     make(map[string]ownedFactoryDeclaration, len(factories)),
		registrations: append([]command.MessageRegistration(nil), registrations...),
	}
	for _, declaration := range commands {
		subscription, err := declaration.subscribe(runtime, config.RunnerDefaults)
		if err != nil {
			generation.cleanup()
			return nil, err
		}
		if subscription != nil {
			generation.subscriptions = append(generation.subscriptions, subscription)
		}
		if err := localRegistry.RegisterCommand(declaration.handler); err != nil {
			generation.cleanup()
			return nil, err
		}
	}
	if err := localRegistry.Initialize(); err != nil {
		generation.cleanup()
		return nil, err
	}
	descriptors := localRegistry.CatalogDescriptors()
	if err := validateOwnedExecutionCapabilities(owner, factories, descriptors, config, executionPolicy); err != nil {
		generation.cleanup()
		return nil, err
	}
	if err := runtime.AttachRegistrationProvider(localRegistry); err != nil {
		generation.cleanup()
		return nil, err
	}
	generation.descriptors = descriptors
	for mode, executor := range config.Executors {
		if err := runtime.RegisterExecutor(mode, dispatcher.ObserveExecutor(executor)); err != nil {
			generation.cleanup()
			return nil, err
		}
	}
	if config.Placement != nil {
		if err := runtime.ConfigurePlacementResolver(config.Placement); err != nil {
			generation.cleanup()
			return nil, err
		}
	}
	if config.Remote != nil {
		if err := runtime.ConfigureRemoteDispatcher(config.Remote); err != nil {
			generation.cleanup()
			return nil, err
		}
	}
	if err := runtime.RoutedReady(); err != nil {
		generation.cleanup()
		return nil, err
	}
	for _, factory := range factories {
		generation.factories[factory.name] = factory
	}
	return generation, nil
}

func validateOwnedExecutionCapabilities(owner string, factories []ownedFactoryDeclaration, descriptors []command.CommandDescriptor, config OwnedCommandRuntimeConfig, policy CommandExecutionPolicy) error {
	requireMode := func(mode command.ExecutionMode, source string) error {
		mode = command.NormalizeExecutionMode(mode)
		if mode == "" || mode == command.ExecutionModeInline {
			return nil
		}
		if isNilRegistrationValue(config.Executors[mode]) {
			return conflictDomainError("owned runtime executor not configured", map[string]any{
				"owner":  owner,
				"mode":   mode,
				"source": source,
			})
		}
		return nil
	}
	for _, factory := range factories {
		mode, err := resolveDispatchModeForCommand(factory.name, "", policy)
		if err != nil {
			return err
		}
		if err := requireMode(mode, "execution_policy"); err != nil {
			return err
		}
	}
	for _, descriptor := range descriptors {
		if err := requireMode(descriptor.ExecutionMode, "command_descriptor"); err != nil {
			return err
		}
	}
	return nil
}

func registrationSetLifecycleError(owner, state string) error {
	return conflictDomainError("command registration set is single-use", map[string]any{
		"owner": owner,
		"state": state,
	})
}

func isNilRegistrationValue(value any) bool {
	if value == nil {
		return true
	}
	reflected := reflect.ValueOf(value)
	switch reflected.Kind() {
	case reflect.Chan, reflect.Func, reflect.Interface, reflect.Map, reflect.Pointer, reflect.Slice:
		return reflected.IsNil()
	default:
		return false
	}
}

func ownedRegistrationKey(kind command.HandlerKind, value string) string {
	return fmt.Sprintf("%s:%s", kind, strings.TrimSpace(value))
}
