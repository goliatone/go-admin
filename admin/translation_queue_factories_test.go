package admin

import (
	"context"
	"testing"
	"time"

	"github.com/goliatone/go-command/registry"
)

func TestRegisterTranslationQueueCommandFactoriesDispatchesClaimByName(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		cmd := &capturingTranslationQueueClaimMessageCommand{}
		if _, err := RegisterCommand(bus, cmd); err != nil {
			t.Fatalf("register claim command: %v", err)
		}
		if err := RegisterTranslationQueueCommandFactories(bus); err != nil {
			t.Fatalf("register queue factories: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := bus.DispatchByName(context.Background(), translationQueueClaimCommandName, map[string]any{
			"assignment_id":    "tqa_1",
			"claimer_id":       "user_1",
			"expected_version": 2,
		}, nil)
		if err != nil {
			t.Fatalf("dispatch by name: %v", err)
		}
		if cmd.calls != 1 {
			t.Fatalf("expected claim command call, got %d", cmd.calls)
		}
		if cmd.last.AssignmentID != "tqa_1" || cmd.last.ClaimerID != "user_1" || cmd.last.ExpectedVersion != 2 {
			t.Fatalf("unexpected claim payload: %+v", cmd.last)
		}
	})
}

func TestRegisterTranslationQueueCommandFactoriesClaimSupportsActorAndVersionFallbacks(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		cmd := &capturingTranslationQueueClaimMessageCommand{}
		if _, err := RegisterCommand(bus, cmd); err != nil {
			t.Fatalf("register claim command: %v", err)
		}
		if err := RegisterTranslationQueueCommandFactories(bus); err != nil {
			t.Fatalf("register queue factories: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := bus.DispatchByName(context.Background(), translationQueueClaimCommandName, map[string]any{
			"assignment_id": "tqa_2",
			"actor_id":      "user_2",
			"version":       3,
		}, nil)
		if err != nil {
			t.Fatalf("dispatch by name: %v", err)
		}
		if cmd.calls != 1 {
			t.Fatalf("expected claim command call, got %d", cmd.calls)
		}
		if cmd.last.AssignmentID != "tqa_2" || cmd.last.ClaimerID != "user_2" || cmd.last.ExpectedVersion != 3 {
			t.Fatalf("unexpected claim payload: %+v", cmd.last)
		}
	})
}

func TestRegisterTranslationQueueCommandFactoriesDispatchesBulkAssignByName(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		cmd := &capturingTranslationQueueBulkAssignMessageCommand{}
		if _, err := RegisterCommand(bus, cmd); err != nil {
			t.Fatalf("register bulk assign command: %v", err)
		}
		if err := RegisterTranslationQueueCommandFactories(bus); err != nil {
			t.Fatalf("register queue factories: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := bus.DispatchByName(context.Background(), translationQueueBulkAssignCommandName, map[string]any{
			"assignment_ids": []any{"tqa_1", "tqa_2"},
			"assignee_id":    "translator_1",
			"assigner_id":    "manager_1",
			"priority":       "high",
		}, nil)
		if err != nil {
			t.Fatalf("dispatch by name: %v", err)
		}
		if cmd.calls != 1 {
			t.Fatalf("expected bulk assign command call, got %d", cmd.calls)
		}
		if len(cmd.last.AssignmentIDs) != 2 || cmd.last.AssigneeID != "translator_1" || cmd.last.Priority != PriorityHigh {
			t.Fatalf("unexpected bulk assign payload: %+v", cmd.last)
		}
	})
}

type capturingTranslationQueueClaimMessageCommand struct {
	calls int
	last  TranslationQueueClaimInput
}

func (c *capturingTranslationQueueClaimMessageCommand) Execute(_ context.Context, msg TranslationQueueClaimInput) error {
	c.calls++
	c.last = msg
	return nil
}

type capturingTranslationQueueBulkAssignMessageCommand struct {
	calls int
	last  TranslationQueueBulkAssignInput
}

func (c *capturingTranslationQueueBulkAssignMessageCommand) Execute(_ context.Context, msg TranslationQueueBulkAssignInput) error {
	c.calls++
	c.last = msg
	return nil
}

func TestQueueDueDateParsesDateOnlyValue(t *testing.T) {
	due := queueDueDate(map[string]any{
		"due_date": "2026-03-04",
	})
	if due == nil {
		t.Fatalf("expected due date")
	}
	if due.UTC().Format("2006-01-02") != "2026-03-04" {
		t.Fatalf("expected due date 2026-03-04, got %s", due.UTC().Format("2006-01-02"))
	}
	if due.Location() != time.UTC {
		t.Fatalf("expected UTC location, got %v", due.Location())
	}
}
