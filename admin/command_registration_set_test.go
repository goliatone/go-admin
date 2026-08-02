package admin

import (
	"context"
	"errors"
	"net/http"
	"reflect"
	"sync"
	"testing"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	commandregistry "github.com/goliatone/go-command/registry"
	"github.com/goliatone/go-command/runner"
)

type ownedAlphaMessage struct {
	Value string
}

func (ownedAlphaMessage) Type() string { return "owned.alpha" }

type ownedBetaMessage struct {
	Value string
}

func (ownedBetaMessage) Type() string { return "owned.beta" }

type ownedAlphaCommand struct {
	calls int
	last  ownedAlphaMessage
	run   command.DispatchRunContext
}

func (c *ownedAlphaCommand) Execute(ctx context.Context, message ownedAlphaMessage) error {
	c.calls++
	c.last = message
	c.run, _ = command.DispatchRunFromContext(ctx)
	return nil
}

type ownedBetaCommand struct {
	calls int
	last  ownedBetaMessage
}

func (c *ownedBetaCommand) Execute(_ context.Context, message ownedBetaMessage) error {
	c.calls++
	c.last = message
	return nil
}

type ownedCatalogAlphaMessage struct{}

func (ownedCatalogAlphaMessage) Type() string { return "owned.catalog.alpha" }

type ownedCatalogBetaMessage struct{}

func (ownedCatalogBetaMessage) Type() string { return "owned.catalog.beta" }

type ownedCatalogAlphaCommand struct {
	descriptorID string
}

func (*ownedCatalogAlphaCommand) Execute(context.Context, ownedCatalogAlphaMessage) error {
	return nil
}

func (c *ownedCatalogAlphaCommand) CommandDescriptor() command.CommandDescriptor {
	return ownedCatalogDescriptor(c.descriptorID, "owned.catalog.alpha")
}

type ownedCatalogBetaCommand struct {
	descriptorID string
}

func (*ownedCatalogBetaCommand) Execute(context.Context, ownedCatalogBetaMessage) error {
	return nil
}

func (c *ownedCatalogBetaCommand) CommandDescriptor() command.CommandDescriptor {
	return ownedCatalogDescriptor(c.descriptorID, "owned.catalog.beta")
}

func ownedCatalogDescriptor(id, messageType string) command.CommandDescriptor {
	return command.CommandDescriptor{
		ID:            id,
		MessageType:   messageType,
		ExposeInAdmin: true,
		Permissions:   []string{"commands.run"},
		ExecutionMode: command.ExecutionModeInline,
		Input: command.CommandInputSchema{
			Type: "object",
			Fields: []command.CommandInputField{{
				ID:        "token",
				Path:      "token",
				Sensitive: true,
				OptionSource: &command.CommandOptionSourceRef{
					ID:            "tokens",
					Dynamic:       true,
					RedactionHint: "secret",
				},
			}},
		},
		Result: command.CommandResultDescriptor{
			Inline:         true,
			RedactionHints: []string{"result.secret"},
		},
		Progress: &command.CommandProgressDescriptor{
			Units: "records",
			Total: 2,
		},
		RedactionHints: []string{"token", "idempotency_key"},
	}
}

type ownedResult struct {
	Value string
}

type ownedResultCommand struct{}

func (*ownedResultCommand) Execute(ctx context.Context, message ownedAlphaMessage) error {
	command.ResultFromContext[ownedResult](ctx).Store(ownedResult{Value: message.Value + "-result"})
	return nil
}

func mustRegistrationSet(t *testing.T, bus *CommandBus, owner string) *CommandRegistrationSet {
	t.Helper()
	set, err := bus.NewRegistrationSet(owner)
	if err != nil {
		t.Fatalf("NewRegistrationSet(%q): %v", owner, err)
	}
	return set
}

func closeRegistrationHandle(t *testing.T, handle CommandRegistrationHandle) {
	t.Helper()
	if err := handle.Close(); err != nil {
		t.Errorf("close registration handle: %v", err)
	}
}

func discardExpectedLifecycleError(_ error) {}

func TestOwnedRegistrationSetsCommitDispatchAndCloseIndependently(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		if err := commandregistry.Start(context.Background()); err != nil {
			t.Fatalf("start legacy registry: %v", err)
		}

		bus := NewCommandBus(true)
		alpha := &ownedAlphaCommand{}
		alphaSet := mustRegistrationSet(t, bus, " alpha.owner ")
		if err := RegisterSetCommand(alphaSet, alpha); err != nil {
			t.Fatalf("RegisterSetCommand alpha: %v", err)
		}
		for _, name := range []string{"alpha.run", "alpha.alias"} {
			if err := RegisterSetContextMessageFactory(alphaSet, name, func(ctx context.Context, payload map[string]any, _ []string) (ownedAlphaMessage, error) {
				opts, _ := command.DispatchOptionsFromContext(ctx)
				if opts.CorrelationID == "" {
					t.Fatal("expected effective options in owned factory context")
				}
				return ownedAlphaMessage{Value: toString(payload["value"])}, nil
			}); err != nil {
				t.Fatalf("RegisterSetContextMessageFactory %s: %v", name, err)
			}
		}
		alphaHandle, alphaCommitErr := alphaSet.Commit()
		if alphaCommitErr != nil {
			t.Fatalf("Commit alpha: %v", alphaCommitErr)
		}
		if alphaHandle.Owner() != "alpha.owner" {
			t.Fatalf("normalized owner = %q", alphaHandle.Owner())
		}

		beta := &ownedBetaCommand{}
		betaSet := mustRegistrationSet(t, bus, "beta.owner")
		if err := RegisterSetCommand(betaSet, beta); err != nil {
			t.Fatalf("RegisterSetCommand beta: %v", err)
		}
		if err := RegisterSetMessageFactory(betaSet, "beta.run", func(payload map[string]any, _ []string) (ownedBetaMessage, error) {
			return ownedBetaMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterSetMessageFactory beta: %v", err)
		}
		betaHandle, betaCommitErr := betaSet.Commit()
		if betaCommitErr != nil {
			t.Fatalf("Commit beta: %v", betaCommitErr)
		}

		if _, err := bus.DispatchByNameWithOptions(context.Background(), "alpha.alias", map[string]any{"value": "one"}, nil, command.DispatchOptions{
			Mode:          command.ExecutionModeInline,
			CorrelationID: "owned-correlation",
		}); err != nil {
			t.Fatalf("dispatch alpha: %v", err)
		}
		if alpha.calls != 1 || alpha.last.Value != "one" || alpha.run.CorrelationID != "owned-correlation" {
			t.Fatalf("unexpected alpha execution: calls=%d last=%+v run=%+v", alpha.calls, alpha.last, alpha.run)
		}
		if err := bus.DispatchByName(context.Background(), "beta.run", map[string]any{"value": "two"}, nil); err != nil {
			t.Fatalf("dispatch beta: %v", err)
		}

		if err := alphaHandle.Close(); err != nil {
			t.Fatalf("close alpha: %v", err)
		}
		if err := alphaHandle.Close(); err != nil {
			t.Fatalf("close alpha twice: %v", err)
		}
		if _, err := bus.DispatchByNameWithOptions(context.Background(), "alpha.run", nil, nil, command.DispatchOptions{Mode: command.ExecutionModeInline}); !errors.Is(err, ErrNotFound) {
			t.Fatalf("closed alpha dispatch error = %v, want ErrNotFound", err)
		}
		if err := bus.DispatchByName(context.Background(), "beta.run", map[string]any{"value": "still-live"}, nil); err != nil {
			t.Fatalf("beta after alpha close: %v", err)
		}
		if beta.calls != 2 || beta.last.Value != "still-live" {
			t.Fatalf("beta registration was disturbed: calls=%d last=%+v", beta.calls, beta.last)
		}
		if err := betaHandle.Close(); err != nil {
			t.Fatalf("close beta: %v", err)
		}
	})
}

func TestOwnedRegistrationSetResultFactory(t *testing.T) {
	bus := NewCommandBus(true)
	set := mustRegistrationSet(t, bus, "results")
	if err := RegisterSetCommand(set, &ownedResultCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageResultFactory[ownedAlphaMessage, ownedResult](set, "owned.result", func(payload map[string]any, _ []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageResultFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	outcome, err := bus.DispatchByNameWithOutcome(context.Background(), "owned.result", map[string]any{"value": "ok"}, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
	if err != nil {
		t.Fatalf("DispatchByNameWithOutcome: %v", err)
	}
	if result, ok := outcome.Result.(ownedResult); !ok || result.Value != "ok-result" {
		t.Fatalf("unexpected result: %#v", outcome.Result)
	}
}

func TestOwnedRegistrationSetLifecycleAndConflictValidation(t *testing.T) {
	bus := NewCommandBus(true)
	set := mustRegistrationSet(t, bus, "owner")
	handler := &ownedAlphaCommand{}
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "owned.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	if _, err := set.Commit(); err == nil {
		t.Fatal("expected commit-twice lifecycle error")
	}
	if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err == nil {
		t.Fatal("expected add-after-commit lifecycle error")
	}

	conflict := mustRegistrationSet(t, bus, "other")
	if err := RegisterSetCommand(conflict, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("stage conflicting handler: %v", err)
	}
	if err := RegisterSetMessageFactory(conflict, "other.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("stage conflicting factory: %v", err)
	}
	if _, err := conflict.Commit(); err == nil {
		t.Fatal("expected live handler conflict")
	}
	if bus.HasFactory("other.run") {
		t.Fatal("failed owner factory must not be published")
	}

	mismatch := mustRegistrationSet(t, bus, "mismatch")
	if err := RegisterSetCommand(mismatch, &ownedBetaCommand{}); err != nil {
		t.Fatalf("stage mismatch handler: %v", err)
	}
	if err := RegisterSetMessageFactory(mismatch, "mismatch.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("stage mismatch factory: %v", err)
	}
	if _, err := mismatch.Commit(); err == nil {
		t.Fatal("expected factory/handler mismatch")
	}
	if bus.HasFactory("mismatch.run") {
		t.Fatal("invalid factory must not be published")
	}
}

func TestOwnedRegistrationSetDisabledCommitIsInert(t *testing.T) {
	bus := NewCommandBus(false)
	set := mustRegistrationSet(t, bus, "disabled")
	if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "disabled.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit disabled: %v", err)
	}
	if bus.HasFactory("disabled.run") {
		t.Fatal("disabled commit reserved a factory name")
	}
	bus.Enable(true)
	if bus.HasFactory("disabled.run") {
		t.Fatal("disabled commit activated after enable")
	}
	if err := handle.Close(); err != nil {
		t.Fatalf("close inert handle: %v", err)
	}
}

func TestOwnedRegistrationSetInheritsQueuedExecutorSnapshot(t *testing.T) {
	bus := NewCommandBus(true)
	executor := &queuedDispatchExecutor{}
	executors := map[command.ExecutionMode]dispatcher.CommandExecutor{
		command.ExecutionModeQueued: executor,
	}
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{Executors: executors}); err != nil {
		t.Fatalf("SetOwnedRuntimeConfig: %v", err)
	}
	delete(executors, command.ExecutionModeQueued)

	handler := &ownedAlphaCommand{}
	set := mustRegistrationSet(t, bus, "queued")
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "owned.queued", func(payload map[string]any, _ []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: toString(payload["value"])}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	receipt, err := bus.DispatchByNameWithOptions(context.Background(), "owned.queued", map[string]any{"value": "queued"}, nil, command.DispatchOptions{
		Mode:          command.ExecutionModeQueued,
		CorrelationID: "queued-correlation",
	})
	if err != nil {
		t.Fatalf("DispatchByNameWithOptions: %v", err)
	}
	if receipt.Mode != command.ExecutionModeQueued || executor.calls != 1 || handler.calls != 0 {
		t.Fatalf("unexpected queued execution: receipt=%+v executor=%d handler=%d", receipt, executor.calls, handler.calls)
	}
	run, ok := command.DispatchRunFromContext(executor.lastCtx)
	if !ok || run.RunID == "" || run.CorrelationID != "queued-correlation" || run.Revision != 1 {
		t.Fatalf("queued executor did not preserve observed run context: %+v ok=%v", run, ok)
	}
}

type ownedPlacementResolver struct {
	route command.DispatchRoute
}

func (r ownedPlacementResolver) ResolvePlacement(context.Context, command.MessageRegistration, command.DispatchOptions) (command.DispatchRoute, bool, error) {
	return r.route, true, nil
}

type ownedRemoteDispatcher struct {
	calls         int
	run           command.DispatchRunContext
	result        any
	resultPresent bool
	resultType    reflect.Type
}

func (d *ownedRemoteDispatcher) DispatchRemote(ctx context.Context, route command.DispatchRoute, registration command.MessageRegistration, _ any, opts command.DispatchOptions) (command.DispatchOutcome, error) {
	d.calls++
	d.run, _ = command.DispatchRunFromContext(ctx)
	if sink, ok := command.DynamicResultSinkFromContext(ctx); ok {
		d.resultType = sink.ResultType()
	}
	return command.DispatchOutcome{
		Receipt: command.DispatchReceipt{
			Accepted:      true,
			Mode:          command.NormalizeExecutionMode(opts.Mode),
			CommandID:     registration.ID(),
			CorrelationID: opts.CorrelationID,
		},
		Target:        command.DispatchTargetRemote,
		Route:         route.Name,
		Result:        d.result,
		ResultPresent: d.resultPresent,
	}, nil
}

func TestOwnedRegistrationSetInheritsPlacementAndRemoteDispatch(t *testing.T) {
	bus := NewCommandBus(true)
	remote := &ownedRemoteDispatcher{}
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{
		Placement: ownedPlacementResolver{route: command.DispatchRoute{Target: command.DispatchTargetRemote, Name: "worker-a"}},
		Remote:    remote,
	}); err != nil {
		t.Fatalf("SetOwnedRuntimeConfig: %v", err)
	}
	handler := &ownedAlphaCommand{}
	set := mustRegistrationSet(t, bus, "remote")
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "owned.remote", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	receipt, err := bus.DispatchByNameWithOptions(context.Background(), "owned.remote", nil, nil, command.DispatchOptions{
		Mode:          command.ExecutionModeInline,
		CorrelationID: "remote-correlation",
	})
	if err != nil {
		t.Fatalf("DispatchByNameWithOptions: %v", err)
	}
	if remote.calls != 1 || handler.calls != 0 || remote.run.Route != "worker-a" {
		t.Fatalf("unexpected remote execution: remote=%d handler=%d run=%+v", remote.calls, handler.calls, remote.run)
	}
	if receipt.CorrelationID != "remote-correlation" {
		t.Fatalf("remote receipt = %+v", receipt)
	}
}

func TestOwnedRegistrationSetPreservesRemoteTypedResults(t *testing.T) {
	tests := []struct {
		name          string
		remoteResult  any
		resultPresent bool
		register      func(*CommandRegistrationSet) error
		assert        func(*testing.T, DispatchOutcome, error)
	}{
		{
			name:          "concrete",
			remoteResult:  ownedResult{Value: "remote-result"},
			resultPresent: true,
			register: func(set *CommandRegistrationSet) error {
				return RegisterSetMessageResultFactory[ownedAlphaMessage, ownedResult](set, "owned.remote.result", func(map[string]any, []string) (ownedAlphaMessage, error) {
					return ownedAlphaMessage{}, nil
				})
			},
			assert: func(t *testing.T, outcome DispatchOutcome, err error) {
				t.Helper()
				if err != nil {
					t.Fatalf("dispatch: %v", err)
				}
				if result, ok := outcome.Result.(ownedResult); !ok || result.Value != "remote-result" {
					t.Fatalf("result = %#v", outcome.Result)
				}
			},
		},
		{
			name:          "zero value",
			remoteResult:  ownedResult{},
			resultPresent: true,
			register: func(set *CommandRegistrationSet) error {
				return RegisterSetMessageResultFactory[ownedAlphaMessage, ownedResult](set, "owned.remote.result", func(map[string]any, []string) (ownedAlphaMessage, error) {
					return ownedAlphaMessage{}, nil
				})
			},
			assert: func(t *testing.T, outcome DispatchOutcome, err error) {
				t.Helper()
				if err != nil {
					t.Fatalf("dispatch: %v", err)
				}
				if result, ok := outcome.Result.(ownedResult); !ok || result != (ownedResult{}) {
					t.Fatalf("result = %#v", outcome.Result)
				}
			},
		},
		{
			name:          "nil pointer",
			remoteResult:  nil,
			resultPresent: true,
			register: func(set *CommandRegistrationSet) error {
				return RegisterSetMessageResultFactory[ownedAlphaMessage, *ownedResult](set, "owned.remote.result", func(map[string]any, []string) (ownedAlphaMessage, error) {
					return ownedAlphaMessage{}, nil
				})
			},
			assert: func(t *testing.T, outcome DispatchOutcome, err error) {
				t.Helper()
				if err != nil {
					t.Fatalf("dispatch: %v", err)
				}
				result, ok := outcome.Result.(*ownedResult)
				if !ok || result != nil {
					t.Fatalf("result = %#v", outcome.Result)
				}
			},
		},
		{
			name:          "incompatible",
			remoteResult:  "wrong",
			resultPresent: true,
			register: func(set *CommandRegistrationSet) error {
				return RegisterSetMessageResultFactory[ownedAlphaMessage, ownedResult](set, "owned.remote.result", func(map[string]any, []string) (ownedAlphaMessage, error) {
					return ownedAlphaMessage{}, nil
				})
			},
			assert: func(t *testing.T, outcome DispatchOutcome, err error) {
				t.Helper()
				if err == nil {
					t.Fatal("expected incompatible remote result error")
				}
				if !outcome.Receipt.Accepted {
					t.Fatalf("validated remote receipt was not preserved: %+v", outcome.Receipt)
				}
			},
		},
		{
			name: "absent",
			register: func(set *CommandRegistrationSet) error {
				return RegisterSetMessageResultFactory[ownedAlphaMessage, ownedResult](set, "owned.remote.result", func(map[string]any, []string) (ownedAlphaMessage, error) {
					return ownedAlphaMessage{}, nil
				})
			},
			assert: func(t *testing.T, outcome DispatchOutcome, err error) {
				t.Helper()
				if err == nil {
					t.Fatal("expected absent remote result error")
				}
				if !outcome.Receipt.Accepted {
					t.Fatalf("validated remote receipt was not preserved: %+v", outcome.Receipt)
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			bus := NewCommandBus(true)
			remote := &ownedRemoteDispatcher{result: tc.remoteResult, resultPresent: tc.resultPresent}
			if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{
				Placement: ownedPlacementResolver{route: command.DispatchRoute{Target: command.DispatchTargetRemote, Name: "worker-results"}},
				Remote:    remote,
			}); err != nil {
				t.Fatalf("SetOwnedRuntimeConfig: %v", err)
			}
			set := mustRegistrationSet(t, bus, "remote-results")
			if err := RegisterSetCommand(set, &ownedResultCommand{}); err != nil {
				t.Fatalf("RegisterSetCommand: %v", err)
			}
			if err := tc.register(set); err != nil {
				t.Fatalf("register result factory: %v", err)
			}
			handle, err := set.Commit()
			if err != nil {
				t.Fatalf("Commit: %v", err)
			}
			defer closeRegistrationHandle(t, handle)

			outcome, dispatchErr := bus.DispatchByNameWithOutcome(context.Background(), "owned.remote.result", nil, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
			tc.assert(t, outcome, dispatchErr)
			if remote.resultType == nil {
				t.Fatal("remote dispatcher did not receive the dynamic result contract")
			}
		})
	}
}

func TestOwnedRegistrationSetCombinesDefaultAndHandlerRunnerOptions(t *testing.T) {
	bus := NewCommandBus(true)
	defaultCalls := 0
	alphaCalls := 0
	defaultOptions := []runner.Option{
		runner.WithMiddleware(func(next func(context.Context) error) func(context.Context) error {
			return func(ctx context.Context) error {
				defaultCalls++
				return next(ctx)
			}
		}),
	}
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{RunnerDefaults: defaultOptions}); err != nil {
		t.Fatalf("SetOwnedRuntimeConfig: %v", err)
	}
	defaultOptions[0] = runner.WithMiddleware()

	set := mustRegistrationSet(t, bus, "runner-options")
	if err := RegisterSetCommand(set, &ownedAlphaCommand{}, runner.WithMiddleware(func(next func(context.Context) error) func(context.Context) error {
		return func(ctx context.Context) error {
			alphaCalls++
			return next(ctx)
		}
	})); err != nil {
		t.Fatalf("RegisterSetCommand alpha: %v", err)
	}
	if err := RegisterSetCommand(set, &ownedBetaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand beta: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "runner.alpha", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory alpha: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "runner.beta", func(map[string]any, []string) (ownedBetaMessage, error) {
		return ownedBetaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory beta: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	if err := bus.DispatchByName(context.Background(), "runner.alpha", nil, nil); err != nil {
		t.Fatalf("dispatch alpha: %v", err)
	}
	if err := bus.DispatchByName(context.Background(), "runner.beta", nil, nil); err != nil {
		t.Fatalf("dispatch beta: %v", err)
	}
	if defaultCalls != 2 || alphaCalls != 1 {
		t.Fatalf("runner middleware calls: default=%d alpha=%d", defaultCalls, alphaCalls)
	}
}

func TestOwnedRuntimeConfigRejectsInvalidExecutors(t *testing.T) {
	bus := NewCommandBus(true)
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{
		Executors: map[command.ExecutionMode]dispatcher.CommandExecutor{command.ExecutionModeInline: &queuedDispatchExecutor{}},
	}); err == nil {
		t.Fatal("expected inline executor conflict")
	}
	var nilExecutor *queuedDispatchExecutor
	if err := bus.SetOwnedRuntimeConfig(OwnedCommandRuntimeConfig{
		Executors: map[command.ExecutionMode]dispatcher.CommandExecutor{command.ExecutionModeQueued: nilExecutor},
	}); err == nil {
		t.Fatal("expected nil executor validation error")
	}
}

func TestOwnedRegistrationSetCatalogLifetimeAndMetadata(t *testing.T) {
	bus := NewCommandBus(true)
	alphaSet := mustRegistrationSet(t, bus, "alpha-owner")
	if err := RegisterSetCommand(alphaSet, &ownedCatalogAlphaCommand{descriptorID: "z-command"}); err != nil {
		t.Fatalf("RegisterSetCommand alpha: %v", err)
	}
	alphaHandle, alphaCommitErr := alphaSet.Commit()
	if alphaCommitErr != nil {
		t.Fatalf("Commit alpha: %v", alphaCommitErr)
	}

	betaSet := mustRegistrationSet(t, bus, "beta-owner")
	if err := RegisterSetCommand(betaSet, &ownedCatalogBetaCommand{descriptorID: "a-command"}); err != nil {
		t.Fatalf("RegisterSetCommand beta: %v", err)
	}
	betaHandle, betaCommitErr := betaSet.Commit()
	if betaCommitErr != nil {
		t.Fatalf("Commit beta: %v", betaCommitErr)
	}
	defer closeRegistrationHandle(t, betaHandle)

	descriptors := bus.CommandDescriptors()
	if len(descriptors) != 2 || descriptors[0].ID != "z-command" || descriptors[1].ID != "a-command" {
		t.Fatalf("owner-ordered catalog = %+v", descriptors)
	}
	alpha := descriptors[0]
	if alpha.Permissions[0] != "commands.run" ||
		alpha.Input.Fields[0].OptionSource == nil ||
		alpha.Input.Fields[0].OptionSource.ID != "tokens" ||
		alpha.Progress == nil ||
		alpha.Progress.Units != "records" ||
		len(alpha.RedactionHints) != 2 ||
		len(alpha.Result.RedactionHints) != 1 {
		t.Fatalf("catalog metadata was not preserved: %+v", alpha)
	}

	if err := alphaHandle.Close(); err != nil {
		t.Fatalf("close alpha: %v", err)
	}
	descriptors = bus.CommandDescriptors()
	if len(descriptors) != 1 || descriptors[0].ID != "a-command" {
		t.Fatalf("catalog after alpha close = %+v", descriptors)
	}
	bus.Reset()
	if descriptors := bus.CommandDescriptors(); len(descriptors) != 0 {
		t.Fatalf("catalog after reset = %+v", descriptors)
	}
}

func TestOwnedRegistrationSetRejectsLiveDescriptorIDConflict(t *testing.T) {
	bus := NewCommandBus(true)
	first := mustRegistrationSet(t, bus, "first")
	if err := RegisterSetCommand(first, &ownedCatalogAlphaCommand{descriptorID: "shared-command"}); err != nil {
		t.Fatalf("RegisterSetCommand first: %v", err)
	}
	handle, err := first.Commit()
	if err != nil {
		t.Fatalf("Commit first: %v", err)
	}
	defer closeRegistrationHandle(t, handle)

	second := mustRegistrationSet(t, bus, "second")
	if err := RegisterSetCommand(second, &ownedCatalogBetaCommand{descriptorID: "shared-command"}); err != nil {
		t.Fatalf("RegisterSetCommand second: %v", err)
	}
	if _, err := second.Commit(); err == nil {
		t.Fatal("expected descriptor id conflict")
	}
	if descriptors := bus.CommandDescriptors(); len(descriptors) != 1 || descriptors[0].ID != "shared-command" {
		t.Fatalf("failed descriptor generation leaked: %+v", descriptors)
	}
}

type ownedStaticCatalog []command.CommandDescriptor

func (c ownedStaticCatalog) CommandDescriptors() []command.CommandDescriptor {
	return append([]command.CommandDescriptor(nil), c...)
}

func TestCommandCatalogProvidersPreserveExternalDescriptorsAndAppendOwners(t *testing.T) {
	bus := NewCommandBus(true)
	set := mustRegistrationSet(t, bus, "owner")
	if err := RegisterSetCommand(set, &ownedCatalogAlphaCommand{descriptorID: "owned"}); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	external := ownedStaticCatalog{
		{ID: "duplicate", ExposeInAdmin: true},
		{ID: "duplicate", ExposeInAdmin: true},
	}
	provider := commandCatalogProviders(external, bus)
	descriptors := provider.CommandDescriptors()
	if len(descriptors) != 3 ||
		descriptors[0].ID != "duplicate" ||
		descriptors[1].ID != "duplicate" ||
		descriptors[2].ID != "owned" {
		t.Fatalf("composite descriptors = %+v", descriptors)
	}
}

func TestOwnedRegistrationSetRejectsMissingPolicyExecutorBeforePublication(t *testing.T) {
	bus := NewCommandBus(true)
	if err := bus.SetExecutionPolicy(CommandExecutionPolicy{DefaultMode: command.ExecutionModeQueued}); err != nil {
		t.Fatalf("SetExecutionPolicy: %v", err)
	}
	set := mustRegistrationSet(t, bus, "missing-executor")
	if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "missing-executor.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	if _, err := set.Commit(); err == nil {
		t.Fatal("expected missing queued executor error")
	}
	if bus.HasFactory("missing-executor.run") {
		t.Fatal("failed runtime capability validation published a factory")
	}
}

func TestOwnedRegistrationSetRejectsInvalidOwnerAndDuplicateDeclarations(t *testing.T) {
	bus := NewCommandBus(true)
	if _, err := bus.NewRegistrationSet("   "); err == nil {
		t.Fatal("expected blank owner validation error")
	}
	set := mustRegistrationSet(t, bus, "duplicates")
	handler := &ownedAlphaCommand{}
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("first handler: %v", err)
	}
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("duplicate handler should stage for atomic commit validation: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "same", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("first factory: %v", err)
	}
	if err := RegisterSetMessageFactory(set, " same ", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err == nil {
		t.Fatal("expected duplicate trimmed factory name error")
	}
	if _, err := set.Commit(); err == nil {
		t.Fatal("expected duplicate handler commit error")
	}
}

func TestOwnedAndLegacyRegistrationConflictsAreRejectedInBothOrders(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		t.Run("legacy then owned", func(t *testing.T) {
			bus := NewCommandBus(true)
			if _, err := RegisterCommand(bus, &ownedAlphaCommand{}); err != nil {
				t.Fatalf("RegisterCommand: %v", err)
			}
			set := mustRegistrationSet(t, bus, "owned")
			if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err != nil {
				t.Fatalf("RegisterSetCommand: %v", err)
			}
			if err := RegisterSetMessageFactory(set, "owned.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
				return ownedAlphaMessage{}, nil
			}); err != nil {
				t.Fatalf("RegisterSetMessageFactory: %v", err)
			}
			if _, err := set.Commit(); err == nil {
				t.Fatal("expected legacy-to-owned handler conflict")
			}
			bus.Reset()
		})
	})

	commandregistry.WithTestRegistry(func() {
		t.Run("owned then legacy", func(t *testing.T) {
			bus := NewCommandBus(true)
			set := mustRegistrationSet(t, bus, "owned")
			if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err != nil {
				t.Fatalf("RegisterSetCommand: %v", err)
			}
			if err := RegisterSetMessageFactory(set, "owned.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
				return ownedAlphaMessage{}, nil
			}); err != nil {
				t.Fatalf("RegisterSetMessageFactory: %v", err)
			}
			handle, err := set.Commit()
			if err != nil {
				t.Fatalf("Commit: %v", err)
			}
			if _, err := RegisterCommand(bus, &ownedAlphaCommand{}); err == nil {
				t.Fatal("expected owned-to-legacy handler conflict")
			}
			if err := handle.Close(); err != nil {
				t.Fatalf("Close: %v", err)
			}
			if _, err := RegisterCommand(bus, &ownedAlphaCommand{}); err != nil {
				t.Fatalf("legacy registration after owner close: %v", err)
			}
			bus.Reset()
		})
	})
}

func TestOwnedRegistrationSetLateHandleCannotCloseNewGeneration(t *testing.T) {
	bus := NewCommandBus(true)
	firstSet := mustRegistrationSet(t, bus, "replaceable")
	if err := RegisterSetCommand(firstSet, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand first: %v", err)
	}
	if err := RegisterSetMessageFactory(firstSet, "replaceable.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: "first"}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory first: %v", err)
	}
	firstHandle, firstCommitErr := firstSet.Commit()
	if firstCommitErr != nil {
		t.Fatalf("Commit first: %v", firstCommitErr)
	}
	bus.Reset()

	secondHandler := &ownedAlphaCommand{}
	secondSet := mustRegistrationSet(t, bus, "replaceable")
	if err := RegisterSetCommand(secondSet, secondHandler); err != nil {
		t.Fatalf("RegisterSetCommand second: %v", err)
	}
	if err := RegisterSetMessageFactory(secondSet, "replaceable.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: "second"}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory second: %v", err)
	}
	secondHandle, secondCommitErr := secondSet.Commit()
	if secondCommitErr != nil {
		t.Fatalf("Commit second: %v", secondCommitErr)
	}
	defer closeRegistrationHandle(t, secondHandle)
	if err := firstHandle.Close(); err != nil {
		t.Fatalf("late first close: %v", err)
	}
	if err := bus.DispatchByName(context.Background(), "replaceable.run", nil, nil); err != nil {
		t.Fatalf("dispatch second generation: %v", err)
	}
	if secondHandler.calls != 1 || secondHandler.last.Value != "second" {
		t.Fatalf("late handle disturbed new generation: %+v", secondHandler)
	}
	bus.Reset()
	bus.Reset()
	if err := secondHandle.Close(); err != nil {
		t.Fatalf("close after repeated reset: %v", err)
	}
}

type blockingCatalogCommand struct {
	started chan struct{}
	release chan struct{}
	once    sync.Once
	mu      sync.Mutex
	calls   int
}

func (*blockingCatalogCommand) Execute(context.Context, ownedAlphaMessage) error {
	return nil
}

func (c *blockingCatalogCommand) CommandDescriptor() command.CommandDescriptor {
	c.mu.Lock()
	c.calls++
	call := c.calls
	c.mu.Unlock()
	if call == 1 {
		return ownedCatalogDescriptor("blocking-command", "owned.alpha")
	}
	c.once.Do(func() { close(c.started) })
	<-c.release
	return ownedCatalogDescriptor("blocking-command", "owned.alpha")
}

func TestOwnedRegistrationSetResetDuringStagingPreventsPublication(t *testing.T) {
	bus := NewCommandBus(true)
	handler := &blockingCatalogCommand{
		started: make(chan struct{}),
		release: make(chan struct{}),
	}
	set := mustRegistrationSet(t, bus, "blocking")
	if err := RegisterSetCommand(set, handler); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "blocking.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	result := make(chan error, 1)
	go func() {
		_, err := set.Commit()
		result <- err
	}()
	<-handler.started
	bus.Reset()
	close(handler.release)
	if err := <-result; err == nil {
		t.Fatal("expected reset-during-staging lifecycle error")
	}
	if bus.HasFactory("blocking.run") || len(bus.CommandDescriptors()) != 0 {
		t.Fatal("reset-during-staging published partial generation")
	}
	if _, err := set.Commit(); err == nil {
		t.Fatal("failed staging commit must remain terminal")
	}
}

func TestNilAndDisabledOwnedSetsStillValidateDeclarations(t *testing.T) {
	var nilBus *CommandBus
	nilSet := mustRegistrationSet(t, nilBus, "nil-bus")
	if err := RegisterSetCommand(nilSet, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand nil bus: %v", err)
	}
	if err := RegisterSetMessageFactory(nilSet, "nil.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory nil bus: %v", err)
	}
	handle, err := nilSet.Commit()
	if err != nil {
		t.Fatalf("Commit nil bus: %v", err)
	}
	if handle.Owner() != "nil-bus" || handle.Close() != nil {
		t.Fatalf("unexpected nil-bus handle: owner=%q", handle.Owner())
	}

	disabled := NewCommandBus(false)
	invalid := mustRegistrationSet(t, disabled, "invalid-disabled")
	if err := RegisterSetCommand(invalid, &ownedBetaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand invalid disabled: %v", err)
	}
	if err := RegisterSetMessageFactory(invalid, "invalid.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory invalid disabled: %v", err)
	}
	if _, err := invalid.Commit(); err == nil {
		t.Fatal("disabled bus must still reject invalid declarations")
	}
}

func TestDisabledLegacyRegistrationRetainsNoOpBehavior(t *testing.T) {
	bus := NewCommandBus(false)
	var handler *ownedAlphaCommand
	subscription, err := RegisterCommand[ownedAlphaMessage](bus, handler)
	if err != nil || subscription != nil {
		t.Fatalf("disabled legacy registration = (%v, %v), want no-op", subscription, err)
	}
}

func TestOwnedRegistrationSupportsZeroValueEnabledBus(t *testing.T) {
	bus := &CommandBus{enabled: true}
	set := mustRegistrationSet(t, bus, "zero-value")
	if err := RegisterSetCommand(set, &ownedAlphaCommand{}); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "zero-value.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)
	if err := bus.DispatchByName(context.Background(), "zero-value.run", nil, nil); err != nil {
		t.Fatalf("DispatchByName: %v", err)
	}
}

type blockingOwnedCommand struct {
	entered chan struct{}
	release chan struct{}
	once    sync.Once
	calls   int
}

func (c *blockingOwnedCommand) Execute(context.Context, ownedAlphaMessage) error {
	c.calls++
	c.once.Do(func() { close(c.entered) })
	<-c.release
	return nil
}

func TestOwnedRegistrationSetCloseRacingDispatchCannotReachNewGeneration(t *testing.T) {
	bus := NewCommandBus(true)
	oldHandler := &blockingOwnedCommand{entered: make(chan struct{}), release: make(chan struct{})}
	oldSet := mustRegistrationSet(t, bus, "racing-owner")
	if err := RegisterSetCommand(oldSet, oldHandler); err != nil {
		t.Fatalf("RegisterSetCommand old: %v", err)
	}
	if err := RegisterSetMessageFactory(oldSet, "racing.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: "old"}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory old: %v", err)
	}
	oldHandle, oldCommitErr := oldSet.Commit()
	if oldCommitErr != nil {
		t.Fatalf("Commit old: %v", oldCommitErr)
	}

	dispatchResult := make(chan error, 1)
	go func() {
		dispatchResult <- bus.DispatchByName(context.Background(), "racing.run", nil, nil)
	}()
	<-oldHandler.entered

	closeResults := make(chan error, 8)
	for i := 0; i < cap(closeResults); i++ {
		go func() { closeResults <- oldHandle.Close() }()
	}
	for i := 0; i < cap(closeResults); i++ {
		if closeErr := <-closeResults; closeErr != nil {
			t.Fatalf("concurrent close: %v", closeErr)
		}
	}

	newHandler := &ownedAlphaCommand{}
	newSet := mustRegistrationSet(t, bus, "racing-owner")
	if err := RegisterSetCommand(newSet, newHandler); err != nil {
		t.Fatalf("RegisterSetCommand new: %v", err)
	}
	if err := RegisterSetMessageFactory(newSet, "racing.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{Value: "new"}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory new: %v", err)
	}
	newHandle, newCommitErr := newSet.Commit()
	if newCommitErr != nil {
		t.Fatalf("Commit new: %v", newCommitErr)
	}
	defer closeRegistrationHandle(t, newHandle)

	close(oldHandler.release)
	if err := <-dispatchResult; err != nil && !errors.Is(err, ErrNotFound) {
		t.Fatalf("in-flight old dispatch returned unexpected error: %v", err)
	}
	if oldHandler.calls != 1 || newHandler.calls != 0 {
		t.Fatalf("old dispatch crossed generation: old=%d new=%d", oldHandler.calls, newHandler.calls)
	}
	if err := bus.DispatchByName(context.Background(), "racing.run", nil, nil); err != nil {
		t.Fatalf("dispatch new generation: %v", err)
	}
	if newHandler.calls != 1 || newHandler.last.Value != "new" {
		t.Fatalf("new generation dispatch = %+v", newHandler)
	}
}

type ownedDomainFailureCommand struct {
	calls int
}

func (c *ownedDomainFailureCommand) Execute(context.Context, ownedAlphaMessage) error {
	c.calls++
	return NewDomainError(
		TextCodePreconditionFailed,
		"owned command precondition failed",
		map[string]any{"required_status": "draft"},
	)
}

func TestOwnedRegistrationSetPreservesDomainErrorThroughRunnerWrappers(t *testing.T) {
	bus := NewCommandBus(true)
	handler := &ownedDomainFailureCommand{}
	set := mustRegistrationSet(t, bus, "domain-errors")
	if err := RegisterSetCommand(set, handler, runner.WithMaxRetries(1)); err != nil {
		t.Fatalf("RegisterSetCommand: %v", err)
	}
	if err := RegisterSetMessageFactory(set, "domain-errors.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
		return ownedAlphaMessage{}, nil
	}); err != nil {
		t.Fatalf("RegisterSetMessageFactory: %v", err)
	}
	handle, err := set.Commit()
	if err != nil {
		t.Fatalf("Commit: %v", err)
	}
	defer closeRegistrationHandle(t, handle)

	err = bus.DispatchByName(context.Background(), "domain-errors.run", nil, nil)
	if err == nil {
		t.Fatal("expected owned dispatch to fail")
	}
	mapped, status := DefaultErrorPresenter().Present(err)
	if status != http.StatusConflict || mapped.TextCode != TextCodePreconditionFailed {
		t.Fatalf("mapped owned error = (%+v, %d), want %s/%d", mapped, status, TextCodePreconditionFailed, http.StatusConflict)
	}
	if mapped.Message != "owned command precondition failed" || mapped.Metadata["required_status"] != "draft" {
		t.Fatalf("domain error details were lost through runner wrappers: %+v", mapped)
	}
	if handler.calls != 2 {
		t.Fatalf("handler calls=%d, want one retry", handler.calls)
	}
}

type ownedNoopCommand struct{}

func (*ownedNoopCommand) Execute(context.Context, ownedAlphaMessage) error { return nil }

func TestOwnedRegistrationSetConcurrentLifecycleStress(t *testing.T) {
	const iterations = 20
	for iteration := range iterations {
		bus := NewCommandBus(true)
		set := mustRegistrationSet(t, bus, "stress-owner")
		if err := RegisterSetCommand(set, &ownedNoopCommand{}); err != nil {
			t.Fatalf("iteration %d RegisterSetCommand: %v", iteration, err)
		}
		if err := RegisterSetMessageFactory(set, "stress.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
			return ownedAlphaMessage{}, nil
		}); err != nil {
			t.Fatalf("iteration %d RegisterSetMessageFactory: %v", iteration, err)
		}
		handle, err := set.Commit()
		if err != nil {
			t.Fatalf("iteration %d Commit: %v", iteration, err)
		}

		start := make(chan struct{})
		var wg sync.WaitGroup
		for range 12 {
			wg.Go(func() {
				<-start
				discardExpectedLifecycleError(bus.DispatchByName(context.Background(), "stress.run", nil, nil))
			})
		}
		for range 4 {
			wg.Go(func() {
				<-start
				discardExpectedLifecycleError(handle.Close())
			})
		}
		wg.Go(func() {
			<-start
			bus.Reset()
		})
		wg.Go(func() {
			<-start
			replacement, err := bus.NewRegistrationSet("stress-owner")
			if err != nil {
				return
			}
			if RegisterSetCommand(replacement, &ownedNoopCommand{}) != nil {
				return
			}
			if RegisterSetMessageFactory(replacement, "stress.run", func(map[string]any, []string) (ownedAlphaMessage, error) {
				return ownedAlphaMessage{}, nil
			}) != nil {
				return
			}
			replacementHandle, err := replacement.Commit()
			if err == nil {
				discardExpectedLifecycleError(replacementHandle.Close())
			}
		})
		close(start)
		wg.Wait()
		discardExpectedLifecycleError(handle.Close())
	}
}
