package admin

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/goliatone/go-command/flow"
	goerrors "github.com/goliatone/go-errors"
)

// FSMWorkflowEngineOption customizes FSMWorkflowEngine behavior.
type FSMWorkflowEngineOption func(*FSMWorkflowEngine)

// WorkflowGuardFunc evaluates a workflow guard.
type WorkflowGuardFunc = flow.Guard[WorkflowMessage]

// WorkflowDynamicTargetResolver resolves a workflow dynamic target.
type WorkflowDynamicTargetResolver = flow.DynamicTargetResolver[WorkflowMessage]

// WorkflowActionFunc executes a workflow action.
type WorkflowActionFunc func(context.Context, WorkflowMessage) error

// WithFSMWorkflowStateStore sets an explicit state store.
func WithFSMWorkflowStateStore(store flow.StateStore) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil || store == nil {
			return
		}
		engine.store = store
	}
}

// WithFSMWorkflowIdempotencyStore sets an explicit idempotency store.
func WithFSMWorkflowIdempotencyStore(store flow.IdempotencyStore[WorkflowMessage]) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil || store == nil {
			return
		}
		engine.idempotency = store
	}
}

// WithFSMWorkflowExecutionPolicy sets execution policy used by compiled machines.
func WithFSMWorkflowExecutionPolicy(policy flow.ExecutionPolicy) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil {
			return
		}
		engine.policy = policy
	}
}

// WithFSMWorkflowHookFailureMode sets lifecycle hook failure mode.
func WithFSMWorkflowHookFailureMode(mode flow.HookFailureMode) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil {
			return
		}
		engine.hookFailureMode = mode
	}
}

// WithFSMWorkflowLifecycleHooks appends lifecycle hooks.
func WithFSMWorkflowLifecycleHooks(hooks ...flow.TransitionLifecycleHook[WorkflowMessage]) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil || len(hooks) == 0 {
			return
		}
		engine.lifecycleHooks = append(engine.lifecycleHooks, hooks...)
	}
}

// WithFSMWorkflowLogger sets a flow logger used by state machines.
func WithFSMWorkflowLogger(logger flow.Logger) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil || logger == nil {
			return
		}
		engine.logger = logger
	}
}

// WithFSMWorkflowActivitySink projects lifecycle events into admin activity sink.
func WithFSMWorkflowActivitySink(sink ActivitySink) FSMWorkflowEngineOption {
	return func(engine *FSMWorkflowEngine) {
		if engine == nil || sink == nil {
			return
		}
		hook := &flow.LifecycleActivityHook[WorkflowMessage]{
			Sink: NewFSMLifecycleActivitySinkAdapter(sink),
		}
		engine.lifecycleHooks = withoutFSMActivityHooks(engine.lifecycleHooks)
		engine.lifecycleHooks = append(engine.lifecycleHooks, hook)
	}
}

// FSMWorkflowEngine is the canonical go-admin workflow adapter backed by go-command/flow.
type FSMWorkflowEngine struct {
	mu sync.RWMutex

	store       flow.StateStore
	idempotency flow.IdempotencyStore[WorkflowMessage]
	resolvers   *flow.ResolverMap[WorkflowMessage]
	actions     *flow.ActionRegistry[WorkflowMessage]

	definitions     map[string]WorkflowDefinition
	machines        map[string]*flow.StateMachine[WorkflowMessage]
	machineVersions map[string]string

	policy          flow.ExecutionPolicy
	hookFailureMode flow.HookFailureMode
	lifecycleHooks  []flow.TransitionLifecycleHook[WorkflowMessage]
	logger          flow.Logger
}

var _ WorkflowEngine = (*FSMWorkflowEngine)(nil)
var _ WorkflowRegistrar = (*FSMWorkflowEngine)(nil)
var _ WorkflowDefinitionChecker = (*FSMWorkflowEngine)(nil)

// AttachActivitySink wires lifecycle activity projection and refreshes existing machines.
func (e *FSMWorkflowEngine) AttachActivitySink(sink ActivitySink) error {
	if e == nil || sink == nil {
		return nil
	}
	hook := &flow.LifecycleActivityHook[WorkflowMessage]{
		Sink: NewFSMLifecycleActivitySinkAdapter(sink),
	}

	e.mu.Lock()
	e.lifecycleHooks = withoutFSMActivityHooks(e.lifecycleHooks)
	e.lifecycleHooks = append(e.lifecycleHooks, hook)
	definitions := make(map[string]WorkflowDefinition, len(e.definitions))
	for entityType, definition := range e.definitions {
		definitions[entityType] = cloneWorkflowDefinition(definition)
	}
	e.mu.Unlock()

	for entityType, definition := range definitions {
		if err := e.RegisterWorkflow(entityType, definition); err != nil {
			return err
		}
	}
	return nil
}

// NewFSMWorkflowEngine creates a workflow engine backed by go-command/flow state machines.
func NewFSMWorkflowEngine(opts ...FSMWorkflowEngineOption) *FSMWorkflowEngine {
	engine := &FSMWorkflowEngine{
		store:           flow.NewInMemoryStateStore(),
		idempotency:     flow.NewInMemoryIdempotencyStore[WorkflowMessage](),
		resolvers:       flow.NewResolverMap[WorkflowMessage](),
		actions:         flow.NewActionRegistry[WorkflowMessage](),
		definitions:     map[string]WorkflowDefinition{},
		machines:        map[string]*flow.StateMachine[WorkflowMessage]{},
		machineVersions: map[string]string{},
		policy:          flow.ExecutionPolicyLightweight,
		hookFailureMode: flow.HookFailureModeFailOpen,
	}
	for _, opt := range opts {
		if opt != nil {
			opt(engine)
		}
	}
	if engine.store == nil {
		engine.store = flow.NewInMemoryStateStore()
	}
	if engine.idempotency == nil {
		engine.idempotency = flow.NewInMemoryIdempotencyStore[WorkflowMessage]()
	}
	if engine.resolvers == nil {
		engine.resolvers = flow.NewResolverMap[WorkflowMessage]()
	}
	if engine.actions == nil {
		engine.actions = flow.NewActionRegistry[WorkflowMessage]()
	}
	if engine.policy == "" {
		engine.policy = flow.ExecutionPolicyLightweight
	}
	if engine.hookFailureMode == "" {
		engine.hookFailureMode = flow.HookFailureModeFailOpen
	}
	return engine
}

// RegisterGuard registers a named guard resolver.
func (e *FSMWorkflowEngine) RegisterGuard(ref string, guard WorkflowGuardFunc) error {
	if e == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow engine is nil", nil, nil)
	}
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "guard ref is required", nil, map[string]any{"field": "guard_ref"})
	}
	if guard == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "guard resolver is required", nil, map[string]any{"field": "guard"})
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.resolvers.RegisterGuard(ref, guard)
	return nil
}

// RegisterDynamicTarget registers a named dynamic target resolver.
func (e *FSMWorkflowEngine) RegisterDynamicTarget(ref string, resolver WorkflowDynamicTargetResolver) error {
	if e == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow engine is nil", nil, nil)
	}
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "dynamic target ref is required", nil, map[string]any{"field": "dynamic_target_ref"})
	}
	if resolver == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "dynamic target resolver is required", nil, map[string]any{"field": "dynamic_target"})
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.resolvers.RegisterDynamicTarget(ref, resolver)
	return nil
}

// RegisterAction registers a workflow action handler.
func (e *FSMWorkflowEngine) RegisterAction(name string, action WorkflowActionFunc) error {
	if e == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow engine is nil", nil, nil)
	}
	name = strings.TrimSpace(name)
	if name == "" {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "action name is required", nil, map[string]any{"field": "action"})
	}
	if action == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "action handler is required", nil, map[string]any{"field": "action_handler"})
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if err := e.actions.Register(name, action); err != nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "action registration failed", err, map[string]any{"action": name})
	}
	return nil
}

// RegisterWorkflow installs or replaces a workflow definition for an entity type.
func (e *FSMWorkflowEngine) RegisterWorkflow(entityType string, definition WorkflowDefinition) error {
	if e == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow engine is nil", nil, nil)
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow entity type is required", nil, map[string]any{"field": "entity_type"})
	}

	definition.EntityType = entityType
	machineDef, err := compileWorkflowMachineDefinition(definition)
	if err != nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow definition compilation failed", err, map[string]any{
			"machine_id": entityType,
		})
	}

	options := []flow.StateMachineOption[WorkflowMessage]{
		flow.WithExecutionPolicy[WorkflowMessage](e.policy),
		flow.WithHookFailureMode[WorkflowMessage](e.hookFailureMode),
		flow.WithIdempotencyStore[WorkflowMessage](e.idempotency),
	}
	if e.logger != nil {
		options = append(options, flow.WithLogger[WorkflowMessage](e.logger))
	}
	if len(e.lifecycleHooks) > 0 {
		options = append(options, flow.WithLifecycleHooks[WorkflowMessage](e.lifecycleHooks...))
	}
	machine, err := flow.NewStateMachineFromDefinition(
		machineDef,
		e.store,
		flow.TransitionRequest[WorkflowMessage]{
			StateKey: func(msg WorkflowMessage) string {
				return strings.TrimSpace(msg.EntityID)
			},
			Event: func(msg WorkflowMessage) string {
				return strings.TrimSpace(msg.Event)
			},
		},
		e.resolvers,
		e.actions,
		options...,
	)
	if err != nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow state machine initialization failed", err, map[string]any{
			"machine_id": entityType,
		})
	}

	e.mu.Lock()
	defer e.mu.Unlock()
	e.definitions[entityType] = cloneWorkflowDefinition(definition)
	e.machines[entityType] = machine
	e.machineVersions[entityType] = strings.TrimSpace(machineDef.Version)
	return nil
}

// UnregisterWorkflow removes a registered machine definition and state machine.
func (e *FSMWorkflowEngine) UnregisterWorkflow(entityType string) error {
	if e == nil {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow engine is nil", nil, nil)
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return workflowRuntimeError(flow.ErrPreconditionFailed, "workflow entity type is required", nil, map[string]any{
			"field": "entity_type",
		})
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	delete(e.definitions, entityType)
	delete(e.machines, entityType)
	delete(e.machineVersions, entityType)
	return nil
}

// HasWorkflow reports whether a workflow definition exists for an entity type.
func (e *FSMWorkflowEngine) HasWorkflow(entityType string) bool {
	if e == nil {
		return false
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return false
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	_, ok := e.machines[entityType]
	return ok
}

// WorkflowDefinition returns the currently registered workflow definition.
func (e *FSMWorkflowEngine) WorkflowDefinition(entityType string) (WorkflowDefinition, bool) {
	if e == nil {
		return WorkflowDefinition{}, false
	}
	entityType = strings.TrimSpace(entityType)
	if entityType == "" {
		return WorkflowDefinition{}, false
	}
	e.mu.RLock()
	defer e.mu.RUnlock()
	def, ok := e.definitions[entityType]
	if !ok {
		return WorkflowDefinition{}, false
	}
	return cloneWorkflowDefinition(def), true
}

// ApplyEvent applies an event using canonical FSM envelopes.
func (e *FSMWorkflowEngine) ApplyEvent(ctx context.Context, input WorkflowApplyEventRequest) (*WorkflowApplyEventResponse, error) {
	machineID := resolveMachineID(input.MachineID, input.Msg.EntityType)
	if machineID == "" {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "machine id is required", nil, map[string]any{
			"field": "machine_id",
		})
	}
	machine, machineVersion, ok := e.resolveMachine(machineID)
	if !ok {
		return nil, workflowRuntimeError(flow.ErrStateNotFound, "workflow machine not found", nil, map[string]any{
			"machine_id": machineID,
		})
	}

	req := normalizeWorkflowApplyRequest(machineID, input)
	if req.EntityID == "" {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "entity id is required", nil, map[string]any{
			"machine_id": machineID,
			"field":      "entity_id",
		})
	}
	if req.Event == "" {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "event is required", nil, map[string]any{
			"machine_id": machineID,
			"entity_id":  req.EntityID,
			"field":      "event",
		})
	}

	seedState := strings.TrimSpace(req.ExpectedState)
	if seedState == "" {
		seedState = strings.TrimSpace(req.Msg.CurrentState)
	}
	if seedState != "" {
		if err := e.seedStateIfMissing(ctx, machineID, machineVersion, req.EntityID, seedState); err != nil {
			return nil, err
		}
	}

	response, err := machine.ApplyEvent(ctx, req)
	if err != nil {
		if isFlowStateNotFoundError(err) && seedState != "" {
			if seedErr := e.seedStateIfMissing(ctx, machineID, machineVersion, req.EntityID, seedState); seedErr != nil {
				return nil, seedErr
			}
			response, err = machine.ApplyEvent(ctx, req)
		}
		if err != nil {
			return nil, err
		}
	}
	return response, nil
}

// Snapshot returns current state plus transition availability/rejections.
func (e *FSMWorkflowEngine) Snapshot(ctx context.Context, input WorkflowSnapshotRequest) (*WorkflowSnapshot, error) {
	machineID := resolveMachineID(input.MachineID, input.Msg.EntityType)
	if machineID == "" {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "machine id is required", nil, map[string]any{
			"field": "machine_id",
		})
	}
	machine, machineVersion, ok := e.resolveMachine(machineID)
	if !ok {
		return nil, workflowRuntimeError(flow.ErrStateNotFound, "workflow machine not found", nil, map[string]any{
			"machine_id": machineID,
		})
	}
	req := normalizeWorkflowSnapshotRequest(machineID, input)
	if req.EntityID == "" {
		return nil, workflowRuntimeError(flow.ErrPreconditionFailed, "entity id is required", nil, map[string]any{
			"machine_id": machineID,
			"field":      "entity_id",
		})
	}

	seedState := strings.TrimSpace(req.Msg.CurrentState)
	if seedState == "" {
		seedState = strings.TrimSpace(metadataString(req.Msg.Payload, "current_state"))
	}
	if seedState != "" {
		if err := e.seedStateIfMissing(ctx, machineID, machineVersion, req.EntityID, seedState); err != nil {
			return nil, err
		}
	}

	snapshot, err := machine.Snapshot(ctx, req)
	if err != nil {
		if isFlowStateNotFoundError(err) && seedState != "" {
			if seedErr := e.seedStateIfMissing(ctx, machineID, machineVersion, req.EntityID, seedState); seedErr != nil {
				return nil, seedErr
			}
			snapshot, err = machine.Snapshot(ctx, req)
		}
		if err != nil {
			return nil, err
		}
	}
	return snapshot, nil
}

func (e *FSMWorkflowEngine) resolveMachine(machineID string) (*flow.StateMachine[WorkflowMessage], string, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	machine, ok := e.machines[machineID]
	if !ok || machine == nil {
		return nil, "", false
	}
	return machine, e.machineVersions[machineID], true
}

func (e *FSMWorkflowEngine) seedStateIfMissing(ctx context.Context, machineID, machineVersion, entityID, state string) error {
	if e == nil || e.store == nil {
		return nil
	}
	entityID = strings.TrimSpace(entityID)
	state = strings.TrimSpace(state)
	if entityID == "" || state == "" {
		return nil
	}
	_, err := e.store.SaveIfVersion(ctx, &flow.StateRecord{
		EntityID:       entityID,
		State:          strings.ToLower(state),
		MachineID:      machineID,
		MachineVersion: machineVersion,
	}, 0)
	if err == nil {
		return nil
	}
	// SaveIfVersion can fail when record already exists; that means there is
	// state to work with and we should continue.
	if errors.Is(err, flow.ErrStateVersionConflict) {
		return nil
	}
	if isFlowVersionConflictError(err) {
		return nil
	}
	return workflowRuntimeError(flow.ErrPreconditionFailed, "failed to seed workflow state", err, map[string]any{
		"machine_id": machineID,
		"entity_id":  entityID,
		"state":      state,
	})
}

func compileWorkflowMachineDefinition(definition WorkflowDefinition) (*flow.MachineDefinition, error) {
	entityType := strings.TrimSpace(definition.EntityType)
	if entityType == "" {
		return nil, fmt.Errorf("entity type is required")
	}
	initial := strings.TrimSpace(definition.InitialState)
	if initial == "" {
		return nil, fmt.Errorf("initial state is required")
	}
	if len(definition.Transitions) == 0 {
		return nil, fmt.Errorf("at least one transition is required")
	}

	states := map[string]flow.StateDefinition{}
	addState := func(name string, initial bool) {
		name = normalizeWorkflowState(name)
		if name == "" {
			return
		}
		state := states[name]
		state.Name = name
		state.Initial = state.Initial || initial
		states[name] = state
	}

	addState(initial, true)
	transitions := make([]flow.TransitionDefinition, 0, len(definition.Transitions))
	for idx, transition := range definition.Transitions {
		event := normalizeWorkflowEvent(transition.Name)
		from := normalizeWorkflowState(transition.From)
		to := normalizeWorkflowState(transition.To)
		dynamic := strings.TrimSpace(transition.DynamicTo)
		if event == "" {
			return nil, fmt.Errorf("transition[%d]: name is required", idx)
		}
		if from == "" {
			return nil, fmt.Errorf("transition[%d]: from state is required", idx)
		}
		if to == "" && dynamic == "" {
			return nil, fmt.Errorf("transition[%d]: either to or dynamic_to is required", idx)
		}
		if to != "" && dynamic != "" {
			return nil, fmt.Errorf("transition[%d]: use either to or dynamic_to, not both", idx)
		}
		addState(from, false)
		if to != "" {
			addState(to, false)
		}

		metadata := cloneWorkflowTransitionMetadata(transition.Metadata)
		if metadata == nil {
			metadata = map[string]any{}
		}
		if description := strings.TrimSpace(transition.Description); description != "" {
			metadata["description"] = description
		}

		compiled := flow.TransitionDefinition{
			ID:       strings.TrimSpace(transition.Name),
			Event:    event,
			From:     from,
			To:       to,
			Metadata: metadata,
		}
		if guard := strings.TrimSpace(transition.Guard); guard != "" {
			compiled.Guards = []flow.GuardDefinition{{
				Type: "resolver",
				Ref:  guard,
			}}
		}
		if dynamic != "" {
			compiled.DynamicTo = &flow.DynamicTargetDefinition{Resolver: dynamic}
			compiled.To = ""
		}
		transitions = append(transitions, compiled)
	}

	stateDefs := make([]flow.StateDefinition, 0, len(states))
	for _, state := range states {
		stateDefs = append(stateDefs, state)
	}

	// Keep deterministic state ordering for stable tests/diagnostics.
	sortWorkflowStates(stateDefs)

	return &flow.MachineDefinition{
		ID:          entityType,
		Name:        entityType,
		Version:     strings.TrimSpace(firstNonEmpty(definition.MachineVersion, "1")),
		States:      stateDefs,
		Transitions: transitions,
	}, nil
}

func normalizeWorkflowApplyRequest(machineID string, input WorkflowApplyEventRequest) WorkflowApplyEventRequest {
	req := input
	req.MachineID = machineID
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.Event = normalizeWorkflowEvent(req.Event)
	req.ExpectedState = normalizeWorkflowState(req.ExpectedState)
	req.Metadata = cloneWorkflowTransitionMetadata(req.Metadata)
	req.Msg = normalizeWorkflowMessage(req.Msg, req.EntityID, machineID, req.Event, req.ExpectedState, req.Metadata)
	return req
}

func normalizeWorkflowSnapshotRequest(machineID string, input WorkflowSnapshotRequest) WorkflowSnapshotRequest {
	req := input
	req.MachineID = machineID
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.Msg = normalizeWorkflowMessage(req.Msg, req.EntityID, machineID, "", "", nil)
	return req
}

func normalizeWorkflowMessage(
	msg WorkflowMessage,
	entityID string,
	machineID string,
	event string,
	expectedState string,
	metadata map[string]any,
) WorkflowMessage {
	msg.EntityID = strings.TrimSpace(firstNonEmpty(msg.EntityID, entityID))
	msg.EntityType = strings.TrimSpace(firstNonEmpty(msg.EntityType, machineID))
	msg.Event = normalizeWorkflowEvent(firstNonEmpty(msg.Event, event))
	if msg.CurrentState == "" {
		msg.CurrentState = normalizeWorkflowState(expectedState)
	}
	if msg.Payload == nil && len(metadata) > 0 {
		msg.Payload = cloneWorkflowTransitionMetadata(metadata)
	}
	return msg
}

func resolveMachineID(machineID, entityType string) string {
	machineID = strings.TrimSpace(machineID)
	if machineID != "" {
		return machineID
	}
	return strings.TrimSpace(entityType)
}

func workflowRuntimeError(base *goerrors.Error, message string, source error, metadata map[string]any) *goerrors.Error {
	if base == nil {
		base = flow.ErrPreconditionFailed
	}
	err := base.Clone()
	if text := strings.TrimSpace(message); text != "" {
		err.Message = text
	}
	if source != nil {
		err.Source = source
	}
	if len(metadata) > 0 {
		err = err.WithMetadata(metadata)
	}
	return err
}

func isFlowStateNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	var ge *goerrors.Error
	if errors.As(err, &ge) {
		return strings.TrimSpace(ge.TextCode) == flow.ErrCodeStateNotFound
	}
	return false
}

func isFlowVersionConflictError(err error) bool {
	if err == nil {
		return false
	}
	var ge *goerrors.Error
	if errors.As(err, &ge) {
		return strings.TrimSpace(ge.TextCode) == flow.ErrCodeVersionConflict
	}
	return false
}

func normalizeWorkflowEvent(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeWorkflowState(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func cloneWorkflowTransitionMetadata(in map[string]any) map[string]any {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]any, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func metadataString(metadata map[string]any, key string) string {
	if len(metadata) == 0 {
		return ""
	}
	raw, ok := metadata[key]
	if !ok || raw == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(raw))
}

func sortWorkflowStates(states []flow.StateDefinition) {
	if len(states) <= 1 {
		return
	}
	for i := 0; i < len(states)-1; i++ {
		for j := i + 1; j < len(states); j++ {
			left := strings.TrimSpace(states[i].Name)
			right := strings.TrimSpace(states[j].Name)
			if right < left {
				states[i], states[j] = states[j], states[i]
			}
		}
	}
}

func withoutFSMActivityHooks(in []flow.TransitionLifecycleHook[WorkflowMessage]) []flow.TransitionLifecycleHook[WorkflowMessage] {
	if len(in) == 0 {
		return nil
	}
	out := make([]flow.TransitionLifecycleHook[WorkflowMessage], 0, len(in))
	for _, hook := range in {
		if hook == nil {
			continue
		}
		if _, ok := hook.(*flow.LifecycleActivityHook[WorkflowMessage]); ok {
			continue
		}
		out = append(out, hook)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
