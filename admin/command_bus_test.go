package admin

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
	commandregistry "github.com/goliatone/go-command/registry"
)

const queuedDispatchTestCommandName = "command_bus.test.queued_dispatch"

type queuedDispatchTestMessage struct {
	Value string
}

func (queuedDispatchTestMessage) Type() string { return queuedDispatchTestCommandName }

type queuedDispatchInlineCommand struct {
	calls int
	last  queuedDispatchTestMessage
}

func (c *queuedDispatchInlineCommand) Execute(_ context.Context, msg queuedDispatchTestMessage) error {
	c.calls++
	c.last = msg
	return nil
}

type queuedDispatchExecutor struct {
	calls     int
	lastMsg   any
	lastID    string
	lastOpts  command.DispatchOptions
	lastCtx   context.Context
	receipt   command.DispatchReceipt
	execError error
}

func (e *queuedDispatchExecutor) Execute(ctx context.Context, msg any, commandID string, opts command.DispatchOptions) (command.DispatchReceipt, error) {
	e.calls++
	e.lastCtx = ctx
	e.lastMsg = msg
	e.lastID = commandID
	e.lastOpts = opts
	if e.execError != nil {
		return command.DispatchReceipt{}, e.execError
	}
	if e.receipt.Mode == "" {
		enqueuedAt := time.Now().UTC()
		e.receipt = command.DispatchReceipt{
			Accepted:      true,
			Mode:          command.ExecutionModeQueued,
			CommandID:     commandID,
			DispatchID:    "dispatch-queued-command",
			EnqueuedAt:    &enqueuedAt,
			CorrelationID: opts.CorrelationID,
		}
	}
	return e.receipt, nil
}

type resultDispatchTestMessage struct {
	Value string
}

func (resultDispatchTestMessage) Type() string { return "command_bus.test.result_dispatch" }

type resultDispatchTestResult struct {
	Value   string
	Failure error
}

func (r resultDispatchTestResult) CommandResultFailure() error {
	return r.Failure
}

type contextDispatchTestKey struct{}

type contextDispatchTestCommand struct {
	run command.DispatchRunContext
}

func (c *contextDispatchTestCommand) Execute(ctx context.Context, _ queuedDispatchTestMessage) error {
	c.run, _ = command.DispatchRunFromContext(ctx)
	return nil
}

func TestCommandBusContextFactoryReceivesEffectiveDispatchContext(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		handler := &contextDispatchTestCommand{}
		if _, err := RegisterCommand(bus, handler); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}

		payload := map[string]any{"value": "context"}
		ids := []string{"first"}
		var factoryOptions command.DispatchOptions
		var factoryValue any
		var factoryDeadline time.Time
		var factoryCanceled error
		if err := RegisterContextMessageFactory(bus, queuedDispatchTestCommandName, func(ctx context.Context, gotPayload map[string]any, gotIDs []string) (queuedDispatchTestMessage, error) {
			factoryOptions, _ = command.DispatchOptionsFromContext(ctx)
			factoryValue = ctx.Value(contextDispatchTestKey{})
			factoryDeadline, _ = ctx.Deadline()
			factoryCanceled = ctx.Err()
			gotPayload["factory_mutation"] = true
			gotIDs[0] = "factory-mutated"
			return queuedDispatchTestMessage{Value: toString(gotPayload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterContextMessageFactory: %v", err)
		}

		deadline := time.Now().Add(time.Minute).Round(time.Millisecond)
		ctx, cancel := context.WithDeadline(context.WithValue(context.Background(), contextDispatchTestKey{}, "trusted"), deadline)
		defer cancel()
		ctx = command.ContextWithDispatchOptions(ctx, command.DispatchOptions{
			CorrelationID:  "context-correlation",
			IdempotencyKey: "context-idempotency",
			Metadata:       map[string]any{"base": "context", "override": "context"},
		})
		receipt, err := bus.DispatchByNameWithOptions(ctx, queuedDispatchTestCommandName, payload, ids, command.DispatchOptions{
			Mode:           command.ExecutionModeInline,
			CorrelationID:  " explicit-correlation ",
			IdempotencyKey: " explicit-idempotency ",
			Metadata:       map[string]any{"override": "explicit", "extra": "value"},
		})
		if err != nil {
			t.Fatalf("DispatchByNameWithOptions: %v", err)
		}
		if factoryValue != "trusted" || factoryCanceled != nil {
			t.Fatalf("factory context value/cancellation = %v/%v", factoryValue, factoryCanceled)
		}
		if !factoryDeadline.Equal(deadline) {
			t.Fatalf("factory deadline = %v, want %v", factoryDeadline, deadline)
		}
		if payload["factory_mutation"] != true || ids[0] != "factory-mutated" {
			t.Fatalf("factory did not receive original payload/ids: payload=%v ids=%v", payload, ids)
		}
		if factoryOptions.Mode != command.ExecutionModeInline ||
			factoryOptions.CorrelationID != "explicit-correlation" ||
			factoryOptions.IdempotencyKey != "explicit-idempotency" {
			t.Fatalf("unexpected factory options: %+v", factoryOptions)
		}
		if factoryOptions.Metadata["base"] != "context" ||
			factoryOptions.Metadata["override"] != "explicit" ||
			factoryOptions.Metadata["extra"] != "value" {
			t.Fatalf("unexpected factory metadata: %+v", factoryOptions.Metadata)
		}
		if handler.run.ExecutionMode != factoryOptions.Mode ||
			handler.run.CorrelationID != factoryOptions.CorrelationID ||
			handler.run.IdempotencyKey != factoryOptions.IdempotencyKey {
			t.Fatalf("factory/handler option mismatch: factory=%+v run=%+v", factoryOptions, handler.run)
		}
		if receipt.CorrelationID != factoryOptions.CorrelationID {
			t.Fatalf("receipt/factory correlation mismatch: receipt=%+v factory=%+v", receipt, factoryOptions)
		}
	})
}

func TestRegisterContextMessageResultFactoryReceivesEffectiveContext(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		if _, err := RegisterCommand(bus, command.CommandFunc[resultDispatchTestMessage](func(ctx context.Context, msg resultDispatchTestMessage) error {
			command.ResultFromContext[resultDispatchTestResult](ctx).Store(resultDispatchTestResult{Value: msg.Value})
			return nil
		})); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		var gotCorrelation string
		if err := RegisterContextMessageResultFactory[resultDispatchTestMessage, resultDispatchTestResult](bus, "result.dispatch", func(ctx context.Context, payload map[string]any, _ []string) (resultDispatchTestMessage, error) {
			opts, _ := command.DispatchOptionsFromContext(ctx)
			gotCorrelation = opts.CorrelationID
			return resultDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterContextMessageResultFactory: %v", err)
		}
		outcome, err := bus.DispatchByNameWithOutcome(context.Background(), "result.dispatch", map[string]any{"value": "ok"}, nil, command.DispatchOptions{
			Mode:          command.ExecutionModeInline,
			CorrelationID: "result-correlation",
		})
		if err != nil {
			t.Fatalf("DispatchByNameWithOutcome: %v", err)
		}
		if gotCorrelation != "result-correlation" {
			t.Fatalf("factory correlation = %q", gotCorrelation)
		}
		if result, ok := outcome.Result.(resultDispatchTestResult); !ok || result.Value != "ok" {
			t.Fatalf("unexpected result: %#v", outcome.Result)
		}
	})
}

func TestRegisterMessageFactoryStillRejectsNilBuilder(t *testing.T) {
	var build messageBuilder[queuedDispatchTestMessage]
	if err := RegisterMessageFactory(NewCommandBus(true), queuedDispatchTestCommandName, build); err == nil {
		t.Fatal("expected nil legacy builder validation error")
	}
}

func TestCommandBusDispatchByNameStaysInlineWhenPolicyQueued(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		if err := bus.SetExecutionPolicy(CommandExecutionPolicy{
			DefaultMode: command.ExecutionModeQueued,
		}); err != nil {
			t.Fatalf("SetExecutionPolicy: %v", err)
		}
		inline := &queuedDispatchInlineCommand{}
		if _, err := RegisterCommand(bus, inline); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageFactory(bus, queuedDispatchTestCommandName, func(payload map[string]any, _ []string) (queuedDispatchTestMessage, error) {
			return queuedDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageFactory: %v", err)
		}

		if err := bus.DispatchByName(context.Background(), queuedDispatchTestCommandName, map[string]any{"value": "legacy-inline"}, nil); err != nil {
			t.Fatalf("DispatchByName: %v", err)
		}
		if inline.calls != 1 {
			t.Fatalf("expected inline command execution, got %d calls", inline.calls)
		}
		if inline.last.Value != "legacy-inline" {
			t.Fatalf("expected payload value legacy-inline, got %q", inline.last.Value)
		}
	})
}

func TestCommandBusDispatchByNameWithOutcomeReturnsInlineResult(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		if _, err := RegisterCommand(bus, command.CommandFunc[resultDispatchTestMessage](func(ctx context.Context, msg resultDispatchTestMessage) error {
			if result := command.ResultFromContext[resultDispatchTestResult](ctx); result != nil {
				result.Store(resultDispatchTestResult{Value: msg.Value + "-result"})
			}
			return nil
		})); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageResultFactory[resultDispatchTestMessage, resultDispatchTestResult](bus, "result.dispatch", func(payload map[string]any, _ []string) (resultDispatchTestMessage, error) {
			return resultDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageResultFactory: %v", err)
		}

		outcome, err := bus.DispatchByNameWithOutcome(context.Background(), "result.dispatch", map[string]any{"value": "ok"}, nil, command.DispatchOptions{
			Mode: command.ExecutionModeInline,
		})
		if err != nil {
			t.Fatalf("DispatchByNameWithOutcome: %v", err)
		}
		if !outcome.Receipt.Accepted || outcome.Receipt.Mode != command.ExecutionModeInline {
			t.Fatalf("expected accepted inline receipt, got %+v", outcome.Receipt)
		}
		result, ok := outcome.Result.(resultDispatchTestResult)
		if !ok {
			t.Fatalf("expected typed result, got %T", outcome.Result)
		}
		if result.Value != "ok-result" {
			t.Fatalf("expected ok-result, got %q", result.Value)
		}
	})
}

func TestCommandBusStrictDispatchReturnsInlineResultFailure(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		expected := errors.New("search verification failed")
		if _, err := RegisterCommand(bus, command.CommandFunc[resultDispatchTestMessage](func(ctx context.Context, msg resultDispatchTestMessage) error {
			if result := command.ResultFromContext[resultDispatchTestResult](ctx); result != nil {
				result.Store(resultDispatchTestResult{Value: msg.Value + "-result", Failure: expected})
			}
			return nil
		})); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageResultFactory[resultDispatchTestMessage, resultDispatchTestResult](bus, "result.dispatch", func(payload map[string]any, _ []string) (resultDispatchTestMessage, error) {
			return resultDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageResultFactory: %v", err)
		}

		outcome, err := bus.DispatchByNameWithOutcome(context.Background(), "result.dispatch", map[string]any{"value": "diagnostic"}, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
		if err != nil {
			t.Fatalf("outcome-aware dispatch should retain failed result: %v", err)
		}
		result, ok := outcome.Result.(resultDispatchTestResult)
		if !ok || result.Value != "diagnostic-result" || !errors.Is(result.Failure, expected) {
			t.Fatalf("unexpected diagnostic outcome: %#v", outcome.Result)
		}

		receipt, err := bus.DispatchByNameWithOptions(context.Background(), "result.dispatch", map[string]any{"value": "strict"}, nil, command.DispatchOptions{Mode: command.ExecutionModeInline})
		if !errors.Is(err, expected) {
			t.Fatalf("receipt-only dispatch error = %v, want %v", err, expected)
		}
		if !receipt.Accepted || receipt.Mode != command.ExecutionModeInline {
			t.Fatalf("strict dispatch should preserve completed receipt, got %+v", receipt)
		}

		if err := bus.DispatchByName(context.Background(), "result.dispatch", map[string]any{"value": "plain"}, nil); !errors.Is(err, expected) {
			t.Fatalf("plain dispatch error = %v, want %v", err, expected)
		}
	})
}

func TestCommandBusDispatchByNameWithOptionsUsesPolicyQueuedMode(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		queuedExec := &queuedDispatchExecutor{}
		if err := dispatcher.RegisterExecutor(command.ExecutionModeQueued, queuedExec); err != nil {
			t.Fatalf("RegisterExecutor: %v", err)
		}
		t.Cleanup(func() { dispatcher.UnregisterExecutor(command.ExecutionModeQueued) })

		bus := NewCommandBus(true)
		if err := bus.SetExecutionPolicy(CommandExecutionPolicy{
			DefaultMode: command.ExecutionModeQueued,
		}); err != nil {
			t.Fatalf("SetExecutionPolicy: %v", err)
		}
		inline := &queuedDispatchInlineCommand{}
		if _, err := RegisterCommand(bus, inline); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageFactory(bus, queuedDispatchTestCommandName, func(payload map[string]any, _ []string) (queuedDispatchTestMessage, error) {
			return queuedDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageFactory: %v", err)
		}

		receipt, err := bus.DispatchByNameWithOptions(context.Background(), queuedDispatchTestCommandName, map[string]any{
			"value": "queued-policy",
		}, nil, command.DispatchOptions{
			CorrelationID: "corr-queued-dispatch",
		})
		if err != nil {
			t.Fatalf("DispatchByNameWithOptions: %v", err)
		}
		if receipt.Mode != command.ExecutionModeQueued {
			t.Fatalf("expected queued receipt mode, got %q", receipt.Mode)
		}
		if receipt.DispatchID == "" || receipt.EnqueuedAt == nil {
			t.Fatalf("expected queued receipt metadata, got %+v", receipt)
		}
		if inline.calls != 0 {
			t.Fatalf("expected no inline execution in queued mode, got %d calls", inline.calls)
		}
		if queuedExec.calls != 1 {
			t.Fatalf("expected queued executor to run once, got %d", queuedExec.calls)
		}
		if queuedExec.lastID != queuedDispatchTestCommandName {
			t.Fatalf("expected command id %q, got %q", queuedDispatchTestCommandName, queuedExec.lastID)
		}
		if queuedExec.lastOpts.Mode != command.ExecutionModeQueued {
			t.Fatalf("expected queued opts mode, got %q", queuedExec.lastOpts.Mode)
		}
		if queuedExec.lastOpts.CorrelationID != "corr-queued-dispatch" {
			t.Fatalf("expected correlation id corr-queued-dispatch, got %q", queuedExec.lastOpts.CorrelationID)
		}
	})
}

func TestCommandBusDispatchByNameWithOptionsUsesPerCommandOverride(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		queuedExec := &queuedDispatchExecutor{}
		if err := dispatcher.RegisterExecutor(command.ExecutionModeQueued, queuedExec); err != nil {
			t.Fatalf("RegisterExecutor: %v", err)
		}
		t.Cleanup(func() { dispatcher.UnregisterExecutor(command.ExecutionModeQueued) })

		bus := NewCommandBus(true)
		if err := bus.SetExecutionPolicy(CommandExecutionPolicy{
			DefaultMode: command.ExecutionModeInline,
			PerCommand: map[string]command.ExecutionMode{
				queuedDispatchTestCommandName: command.ExecutionModeQueued,
			},
		}); err != nil {
			t.Fatalf("SetExecutionPolicy: %v", err)
		}
		inline := &queuedDispatchInlineCommand{}
		if _, err := RegisterCommand(bus, inline); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageFactory(bus, queuedDispatchTestCommandName, func(payload map[string]any, _ []string) (queuedDispatchTestMessage, error) {
			return queuedDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageFactory: %v", err)
		}

		receipt, err := bus.DispatchByNameWithOptions(context.Background(), queuedDispatchTestCommandName, map[string]any{
			"value": "queued-per-command",
		}, nil, command.DispatchOptions{})
		if err != nil {
			t.Fatalf("DispatchByNameWithOptions: %v", err)
		}
		if receipt.Mode != command.ExecutionModeQueued {
			t.Fatalf("expected queued receipt mode, got %q", receipt.Mode)
		}
		if queuedExec.calls != 1 {
			t.Fatalf("expected queued executor call, got %d", queuedExec.calls)
		}
		if inline.calls != 0 {
			t.Fatalf("expected no inline execution for per-command queued override, got %d calls", inline.calls)
		}
	})
}

func TestCommandBusDispatchByNameWithOptionsInlineOverrideWinsPolicy(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		if err := bus.SetExecutionPolicy(CommandExecutionPolicy{
			DefaultMode: command.ExecutionModeQueued,
		}); err != nil {
			t.Fatalf("SetExecutionPolicy: %v", err)
		}
		inline := &queuedDispatchInlineCommand{}
		if _, err := RegisterCommand(bus, inline); err != nil {
			t.Fatalf("RegisterCommand: %v", err)
		}
		if err := RegisterMessageFactory(bus, queuedDispatchTestCommandName, func(payload map[string]any, _ []string) (queuedDispatchTestMessage, error) {
			return queuedDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageFactory: %v", err)
		}

		receipt, err := bus.DispatchByNameWithOptions(context.Background(), queuedDispatchTestCommandName, map[string]any{
			"value": "explicit-inline",
		}, nil, command.DispatchOptions{
			Mode: command.ExecutionModeInline,
		})
		if err != nil {
			t.Fatalf("DispatchByNameWithOptions: %v", err)
		}
		if receipt.Mode != command.ExecutionModeInline {
			t.Fatalf("expected inline receipt mode, got %q", receipt.Mode)
		}
		if inline.calls != 1 {
			t.Fatalf("expected inline execution, got %d calls", inline.calls)
		}
	})
}

func TestCommandBusDispatchByNameWithOptionsRejectsInvalidMode(t *testing.T) {
	commandregistry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		if err := RegisterMessageFactory(bus, queuedDispatchTestCommandName, func(payload map[string]any, _ []string) (queuedDispatchTestMessage, error) {
			return queuedDispatchTestMessage{Value: toString(payload["value"])}, nil
		}); err != nil {
			t.Fatalf("RegisterMessageFactory: %v", err)
		}

		_, err := bus.DispatchByNameWithOptions(context.Background(), queuedDispatchTestCommandName, map[string]any{"value": "x"}, nil, command.DispatchOptions{
			Mode: command.ExecutionMode("bad-mode"),
		})
		if err == nil {
			t.Fatalf("expected invalid mode error")
		}
	})
}
