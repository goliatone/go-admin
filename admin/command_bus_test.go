package admin

import (
	"context"
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
