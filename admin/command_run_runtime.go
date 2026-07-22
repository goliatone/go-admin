package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

const (
	defaultCommandRunRetention      = 500
	defaultCommandRunDedupeLimit    = 2000
	defaultCommandRunBufferSize     = 64
	defaultCommandRunPublishTimeout = 250 * time.Millisecond
	defaultCommandRunCloseTimeout   = 5 * time.Second
)

var (
	ErrInvalidCommandRunRuntimeConfig = errors.New("invalid command-run runtime configuration")
	ErrCommandRunRuntimeClosed        = errors.New("command-run runtime is closed")
)

// CommandRunProcessRole is a bitmask so publisher and gateway responsibilities
// can be assembled independently.
type CommandRunProcessRole uint8

const (
	CommandRunRolePublisher CommandRunProcessRole = 1 << iota
	CommandRunRoleGateway
	CommandRunRoleMonolith = CommandRunRolePublisher | CommandRunRoleGateway
)

// Has reports whether the role includes every requested responsibility.
func (r CommandRunProcessRole) Has(role CommandRunProcessRole) bool {
	return role != 0 && r&role == role
}

// Valid reports whether the bitmask contains one or both known responsibilities.
func (r CommandRunProcessRole) Valid() bool {
	return r != 0 && r & ^CommandRunRoleMonolith == 0
}

func (r CommandRunProcessRole) String() string {
	switch r {
	case CommandRunRolePublisher:
		return "publisher"
	case CommandRunRoleGateway:
		return "gateway"
	case CommandRunRoleMonolith:
		return "monolith"
	default:
		return "invalid"
	}
}

// CommandRunRuntimeConfig configures the go-admin-owned observer,
// subscriptions, projection, and local defaults. Injected publishers,
// subscribers, transports, and stores remain host-owned; the runtime closes
// only observer registrations and subscriptions it creates.
type CommandRunRuntimeConfig struct {
	Enabled bool                  `json:"enabled"`
	Role    CommandRunProcessRole `json:"role"`

	Transport  CommandRunTransport  `json:"-"`
	Publisher  CommandRunPublisher  `json:"-"`
	Subscriber CommandRunSubscriber `json:"-"`
	Store      CommandRunStore      `json:"-"`
	Projection CommandRunProjection `json:"-"`

	ApplicationID string `json:"application_id,omitempty"`
	EnvironmentID string `json:"environment_id,omitempty"`
	InstanceID    string `json:"instance_id,omitempty"`

	Retention   int `json:"retention,omitempty"`
	DedupeLimit int `json:"dedupe_limit,omitempty"`
	BufferSize  int `json:"buffer_size,omitempty"`

	PublishTimeout time.Duration            `json:"publish_timeout,omitempty"`
	CloseTimeout   time.Duration            `json:"close_timeout,omitempty"`
	ContractLimits CommandRunContractLimits `json:"contract_limits"`

	ScopeResolver   CommandRunScopeResolver   `json:"-"`
	ScopeAuthorizer CommandRunScopeAuthorizer `json:"-"`
	OnProjected     CommandRunRecordHandler   `json:"-"`
	OnError         func(error)               `json:"-"`

	RequireFanout     bool `json:"require_fanout,omitempty"`
	RequireDurability bool `json:"require_durability,omitempty"`
	RequireReplay     bool `json:"require_replay,omitempty"`
}

// CommandRunRecordHandler receives a complete accepted projection row.
type CommandRunRecordHandler func(context.Context, CommandRunRecord) error

// DefaultCommandRunRuntimeConfig returns a zero-service monolith configuration.
func DefaultCommandRunRuntimeConfig() CommandRunRuntimeConfig {
	return CommandRunRuntimeConfig{
		Enabled:        true,
		Role:           CommandRunRoleMonolith,
		Retention:      defaultCommandRunRetention,
		DedupeLimit:    defaultCommandRunDedupeLimit,
		BufferSize:     defaultCommandRunBufferSize,
		PublishTimeout: defaultCommandRunPublishTimeout,
		CloseTimeout:   defaultCommandRunCloseTimeout,
		ContractLimits: DefaultCommandRunContractLimits(),
	}
}

// NormalizeCommandRunRuntimeConfig applies local-safe defaults and validates
// role, ownership, and requested delivery semantics. Missing transport/store
// dependencies intentionally select runtime-owned local implementations later.
func NormalizeCommandRunRuntimeConfig(config CommandRunRuntimeConfig) (CommandRunRuntimeConfig, error) {
	if !config.Enabled {
		return CommandRunRuntimeConfig{Enabled: false}, nil
	}
	defaults := DefaultCommandRunRuntimeConfig()
	if config.Role == 0 {
		config.Role = defaults.Role
	}
	if config.Retention <= 0 {
		config.Retention = defaults.Retention
	}
	if config.DedupeLimit <= 0 {
		config.DedupeLimit = max(defaults.DedupeLimit, config.Retention)
	}
	if config.BufferSize <= 0 {
		config.BufferSize = defaults.BufferSize
	}
	if config.PublishTimeout <= 0 {
		config.PublishTimeout = defaults.PublishTimeout
	}
	if config.CloseTimeout <= 0 {
		config.CloseTimeout = defaults.CloseTimeout
	}
	config.ContractLimits = config.ContractLimits.normalized()
	config.ApplicationID = strings.TrimSpace(config.ApplicationID)
	config.EnvironmentID = strings.TrimSpace(config.EnvironmentID)
	config.InstanceID = strings.TrimSpace(config.InstanceID)

	if err := ValidateCommandRunRuntimeConfig(config); err != nil {
		return CommandRunRuntimeConfig{}, err
	}
	return config, nil
}

// ValidateCommandRunRuntimeConfig checks an already normalized configuration.
func ValidateCommandRunRuntimeConfig(config CommandRunRuntimeConfig) error {
	if !config.Enabled {
		return nil
	}
	if !config.Role.Valid() {
		return commandRunRuntimeConfigError("role %d is invalid", config.Role)
	}
	if config.Transport != nil && (config.Publisher != nil || config.Subscriber != nil) {
		return commandRunRuntimeConfigError("transport cannot be combined with separate publisher or subscriber")
	}
	if config.Transport == nil && config.Role == CommandRunRoleMonolith && (config.Publisher == nil) != (config.Subscriber == nil) {
		return commandRunRuntimeConfigError("monolith split transport requires both publisher and subscriber")
	}
	if config.Role.Has(CommandRunRoleGateway) && config.Projection != nil && config.Store == nil {
		return commandRunRuntimeConfigError("custom gateway projection requires an explicit snapshot store")
	}
	if config.Retention <= 0 || config.DedupeLimit < config.Retention {
		return commandRunRuntimeConfigError("dedupe limit must be at least the positive retention limit")
	}
	if config.BufferSize <= 0 || config.PublishTimeout <= 0 || config.CloseTimeout <= 0 {
		return commandRunRuntimeConfigError("buffer size and timeouts must be positive")
	}

	capabilities, unknownCapabilities := commandRunConfiguredCapabilities(config)
	for _, capabilities := range capabilities {
		if err := capabilities.Validate(); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidCommandRunRuntimeConfig, err)
		}
		if config.RequireFanout && !capabilities.Fanout {
			return commandRunRuntimeConfigError("transport %q does not provide required fanout", capabilities.Name)
		}
		if config.RequireDurability && capabilities.Durability != CommandRunTransportDurabilityDurable {
			return commandRunRuntimeConfigError("transport %q does not provide required durability", capabilities.Name)
		}
		if config.RequireReplay && !capabilities.Replay {
			return commandRunRuntimeConfigError("transport %q does not provide required replay", capabilities.Name)
		}
	}
	if unknownCapabilities && (config.RequireFanout || config.RequireDurability || config.RequireReplay) {
		return commandRunRuntimeConfigError("delivery requirements need an injected transport with capabilities")
	}
	return nil
}

func commandRunConfiguredCapabilities(config CommandRunRuntimeConfig) ([]CommandRunTransportCapabilities, bool) {
	if config.Transport != nil {
		return []CommandRunTransportCapabilities{config.Transport.Capabilities()}, false
	}
	if config.Publisher == nil && config.Subscriber == nil {
		return []CommandRunTransportCapabilities{DefaultLocalCommandRunTransportCapabilities()}, false
	}
	capabilities := make([]CommandRunTransportCapabilities, 0, 2)
	unknown := false
	if transport, ok := config.Publisher.(interface {
		Capabilities() CommandRunTransportCapabilities
	}); ok {
		capabilities = append(capabilities, transport.Capabilities())
	} else if config.Publisher != nil {
		unknown = true
	}
	if transport, ok := config.Subscriber.(interface {
		Capabilities() CommandRunTransportCapabilities
	}); ok {
		capabilities = append(capabilities, transport.Capabilities())
	} else if config.Subscriber != nil {
		unknown = true
	}
	return capabilities, unknown
}

func commandRunRuntimeConfigError(format string, args ...any) error {
	return fmt.Errorf("%w: %s", ErrInvalidCommandRunRuntimeConfig, fmt.Sprintf(format, args...))
}

// CommandRunRuntime composes observation, transport subscription, projection,
// and lifecycle ownership for one process role.
type CommandRunRuntime struct {
	mu sync.Mutex

	config                CommandRunRuntimeConfig
	publisher             CommandRunPublisher
	subscriber            CommandRunSubscriber
	store                 CommandRunStore
	projection            CommandRunProjection
	observer              *CommandRunObserverBridge
	subscription          CommandRunSubscription
	localTransport        *LocalCommandRunTransport
	monitorCancel         context.CancelFunc
	monitorDone           chan struct{}
	ready                 chan struct{}
	readyOnce             sync.Once
	diagnostics           *commandRunDiagnosticState
	launcherCompatibility bool
	started               bool
	closed                bool
}

// NewCommandRunRuntime resolves local defaults without starting injected drivers.
func NewCommandRunRuntime(config CommandRunRuntimeConfig) (*CommandRunRuntime, error) {
	normalized, err := NormalizeCommandRunRuntimeConfig(config)
	if err != nil {
		return nil, err
	}
	runtime := &CommandRunRuntime{config: normalized, ready: make(chan struct{})}
	if !normalized.Enabled {
		runtime.diagnostics = newCommandRunDiagnosticState(normalized, CommandRunTransportCapabilities{}, false)
		runtime.readyOnce.Do(func() { close(runtime.ready) })
		return runtime, nil
	}
	if err := runtime.resolveDependencies(); err != nil {
		return nil, err
	}
	runtime.diagnostics = newCommandRunDiagnosticState(normalized, runtime.Capabilities(), runtime.localTransport != nil)
	return runtime, nil
}

func (r *CommandRunRuntime) resolveDependencies() error {
	config := r.config
	if config.Transport != nil {
		r.publisher = config.Transport
		r.subscriber = config.Transport
	} else {
		r.publisher = config.Publisher
		r.subscriber = config.Subscriber
	}
	if r.publisher == nil && r.subscriber == nil {
		local := NewLocalCommandRunTransport(LocalCommandRunTransportConfig{
			BufferSize: config.BufferSize, PublishTimeout: config.PublishTimeout, ContractLimits: config.ContractLimits,
		})
		r.localTransport = local
		r.publisher, r.subscriber = local, local
	}
	if config.Role.Has(CommandRunRolePublisher) && r.publisher == nil {
		return commandRunRuntimeConfigError("publisher role has no publisher")
	}
	if config.Role.Has(CommandRunRoleGateway) && r.subscriber == nil {
		return commandRunRuntimeConfigError("gateway role has no subscriber")
	}

	r.store = config.Store
	r.projection = config.Projection
	if config.Role.Has(CommandRunRoleGateway) {
		if r.store == nil && r.projection == nil {
			store, err := NewMemoryCommandRunStore(CommandRunMemoryStoreConfig{
				Retention: config.Retention, DedupeLimit: config.DedupeLimit, ContractLimits: config.ContractLimits,
			})
			if err != nil {
				return err
			}
			r.store = store
		}
		if r.projection == nil {
			projector, err := NewCommandRunProjector(r.store, config.ContractLimits)
			if err != nil {
				return err
			}
			r.projection = projector
		}
	}
	if config.Role.Has(CommandRunRolePublisher) {
		observer, err := NewCommandRunObserverBridge(CommandRunObserverConfig{
			Publisher: r.publisher, PublishTimeout: config.PublishTimeout,
			RevisionLimit: config.DedupeLimit, ContractLimits: config.ContractLimits,
			ApplicationID: config.ApplicationID, EnvironmentID: config.EnvironmentID,
			ScopeResolver: config.ScopeResolver, OnError: r.reportError,
		})
		if err != nil {
			return err
		}
		r.observer = observer
	}
	return nil
}

// Start creates runtime-owned subscriptions and observer registrations. It is
// concurrency-safe and idempotent; external transports must already be ready.
func (r *CommandRunRuntime) Start(ctx context.Context) error {
	if r == nil {
		return errors.New("command-run runtime is nil")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return ErrCommandRunRuntimeClosed
	}
	if r.started || !r.config.Enabled {
		return nil
	}
	if err := ctx.Err(); err != nil {
		return err
	}

	var subscription CommandRunSubscription
	var monitorCtx context.Context
	if r.config.Role.Has(CommandRunRoleGateway) {
		runtimeCtx, runtimeCancel := context.WithCancel(context.WithoutCancel(ctx))
		monitorCtx = runtimeCtx
		var err error
		subscription, err = r.subscriber.SubscribeCommandRuns(runtimeCtx, CommandRunSelector{Global: true}, r.handleUpdate)
		if err != nil {
			r.diagnostics.record(ErrCommandRunSubscriptionFailed)
			runtimeCancel()
			return err
		}
		if subscription == nil {
			runtimeCancel()
			return errors.New("command-run subscriber returned a nil subscription")
		}
		if err := waitCommandRunSubscriptionReady(ctx, subscription); err != nil {
			r.diagnostics.record(ErrCommandRunSubscriptionFailed)
			closeCtx, closeCancel := context.WithTimeout(context.WithoutCancel(ctx), r.config.CloseTimeout)
			_ = subscription.Close(closeCtx)
			closeCancel()
			runtimeCancel()
			return err
		}
		r.subscription = subscription
		r.monitorCancel = runtimeCancel
	}
	if r.observer != nil {
		if err := r.observer.Start(r.config.Role); err != nil {
			r.diagnostics.record(err)
			r.rollbackStartLocked(ctx)
			return err
		}
	}
	if subscription != nil {
		r.monitorDone = make(chan struct{})
		go r.monitorSubscription(monitorCtx, subscription, r.monitorDone)
	}
	r.started = true
	r.readyOnce.Do(func() { close(r.ready) })
	r.diagnostics.lifecycle(true, true, false)
	return nil
}

// Close stops observation before subscriptions, waits within the configured
// bound, and closes only the runtime-owned local transport.
func (r *CommandRunRuntime) Close(ctx context.Context) error {
	if r == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		return nil
	}
	r.closed = true
	if r.diagnostics != nil {
		r.diagnostics.lifecycle(r.started, false, true)
	}
	closeCtx, cancel := context.WithTimeout(ctx, r.config.CloseTimeout)
	defer cancel()
	if r.observer != nil {
		r.observer.Close()
	}
	var errs []error
	if r.monitorCancel != nil {
		r.monitorCancel()
	}
	if r.subscription != nil {
		if err := r.subscription.Close(closeCtx); err != nil {
			errs = append(errs, err)
		}
	}
	monitorDone := r.monitorDone
	if r.localTransport != nil {
		if err := r.localTransport.Close(closeCtx); err != nil {
			errs = append(errs, err)
		}
	}
	r.mu.Unlock()
	if monitorDone != nil {
		select {
		case <-monitorDone:
		case <-closeCtx.Done():
			errs = append(errs, closeCtx.Err())
		}
	}
	return errors.Join(errs...)
}

// Ready closes after successful startup (or immediately when disabled).
func (r *CommandRunRuntime) Ready() <-chan struct{} {
	if r == nil {
		return nil
	}
	return r.ready
}

func (r *CommandRunRuntime) Store() CommandRunStore {
	if r == nil {
		return nil
	}
	return r.store
}

func (r *CommandRunRuntime) Publisher() CommandRunPublisher {
	if r == nil {
		return nil
	}
	return r.publisher
}

func (r *CommandRunRuntime) Subscriber() CommandRunSubscriber {
	if r == nil {
		return nil
	}
	return r.subscriber
}

func (r *CommandRunRuntime) Capabilities() CommandRunTransportCapabilities {
	if r == nil {
		return CommandRunTransportCapabilities{}
	}
	if transport, ok := r.publisher.(interface {
		Capabilities() CommandRunTransportCapabilities
	}); ok {
		return transport.Capabilities()
	}
	if transport, ok := r.subscriber.(interface {
		Capabilities() CommandRunTransportCapabilities
	}); ok {
		return transport.Capabilities()
	}
	return CommandRunTransportCapabilities{Name: "custom", Durability: CommandRunTransportDurabilityEphemeral}
}

func (r *CommandRunRuntime) handleUpdate(ctx context.Context, update CommandRunUpdate) error {
	record, changed, err := r.projection.ProjectCommandRun(ctx, update)
	if err != nil {
		r.reportProjectionError(err)
		return err
	}
	if !changed {
		return nil
	}
	r.diagnostics.projected(time.Now().UTC())
	if r.config.OnProjected == nil {
		return nil
	}
	if err := r.config.OnProjected(ctx, record.Clone()); err != nil {
		r.reportProjectionError(err)
		return err
	}
	return nil
}

func (r *CommandRunRuntime) monitorSubscription(ctx context.Context, subscription CommandRunSubscription, done chan<- struct{}) {
	defer close(done)
	errorsCh := subscription.Errors()
	for {
		select {
		case <-ctx.Done():
			return
		case err, ok := <-errorsCh:
			if !ok {
				if ctx.Err() == nil {
					r.diagnostics.lifecycle(true, false, false)
					r.reportSubscriptionError(ErrCommandRunSubscriptionFailed)
				}
				return
			}
			r.reportSubscriptionError(err)
		}
	}
}

func (r *CommandRunRuntime) rollbackStartLocked(ctx context.Context) {
	if r.observer != nil {
		r.observer.Close()
	}
	if r.monitorCancel != nil {
		r.monitorCancel()
		r.monitorCancel = nil
	}
	if r.subscription != nil {
		closeCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), r.config.CloseTimeout)
		_ = r.subscription.Close(closeCtx)
		cancel()
		r.subscription = nil
	}
}

func (r *CommandRunRuntime) reportError(err error) {
	if err == nil || r == nil {
		return
	}
	if r.diagnostics != nil {
		r.diagnostics.record(err)
	}
	if r.config.OnError != nil {
		r.config.OnError(err)
	}
}

// recordBrowserDeliveryDrop updates operator diagnostics without invoking the
// user OnError callback. Browser fan-out is downstream of the durable
// projection and must never let a slow diagnostic hook stall command handling.
func (r *CommandRunRuntime) recordBrowserDeliveryDrop() {
	if r == nil || r.diagnostics == nil {
		return
	}
	r.diagnostics.record(ErrCommandRunDeliveryDropped)
}

func (r *CommandRunRuntime) reportProjectionError(err error) {
	if err == nil || r == nil {
		return
	}
	if r.diagnostics != nil {
		r.diagnostics.projectionFailed()
	}
	if r.config.OnError != nil {
		r.config.OnError(err)
	}
}

func (r *CommandRunRuntime) reportSubscriptionError(err error) {
	if err == nil || r == nil {
		return
	}
	if errors.Is(err, ErrCommandRunHandlerFailed) {
		// The runtime handler records projection/callback failure before returning;
		// transports may echo that rejection on their subscription error channel.
		return
	}
	diagnosticErr := err
	if !isCommandRunMessageDiagnostic(err) {
		diagnosticErr = ErrCommandRunSubscriptionFailed
	}
	if r.diagnostics != nil {
		r.diagnostics.record(diagnosticErr)
	}
	if r.config.OnError != nil {
		r.config.OnError(diagnosticErr)
	}
}

func isCommandRunMessageDiagnostic(err error) bool {
	for _, category := range []error{
		ErrCommandRunEnvelopeRejected,
		ErrCommandRunScopeRejected,
		ErrCommandRunDeliveryDropped,
		ErrCommandRunTransportBackpressure,
		ErrInvalidCommandRunUpdate,
		ErrInvalidCommandRunSelector,
	} {
		if errors.Is(err, category) {
			return true
		}
	}
	return false
}

func waitCommandRunSubscriptionReady(ctx context.Context, subscription CommandRunSubscription) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err, ok := <-subscription.Errors():
		if !ok {
			return fmt.Errorf("%w: closed before ready", ErrCommandRunSubscriptionFailed)
		}
		if err == nil {
			return fmt.Errorf("%w: failed before ready", ErrCommandRunSubscriptionFailed)
		}
		return err
	case <-subscription.Ready():
		return nil
	}
}
