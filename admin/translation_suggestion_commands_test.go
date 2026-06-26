package admin

import (
	"context"
	"testing"

	gocommand "github.com/goliatone/go-command"
	"github.com/goliatone/go-command/registry"
)

type stubTranslationSuggestionService struct {
	calls  int
	inputs []TranslationSuggestionInput
	result TranslationSuggestionResult
	err    error
}

func (s *stubTranslationSuggestionService) SuggestTranslation(_ context.Context, input TranslationSuggestionInput) (TranslationSuggestionResult, error) {
	s.calls++
	s.inputs = append(s.inputs, input)
	if s.err != nil {
		return TranslationSuggestionResult{}, s.err
	}
	return s.result, nil
}

func TestBuildTranslationSuggestionInputValidatesRequiredFields(t *testing.T) {
	if _, err := buildTranslationSuggestionInput(map[string]any{"field_path": "title"}, nil); err == nil {
		t.Fatal("expected missing assignment_id error")
	}
	if _, err := buildTranslationSuggestionInput(map[string]any{"assignment_id": "tqa_1"}, nil); err == nil {
		t.Fatal("expected missing field_path error")
	}

	msg, err := buildTranslationSuggestionInput(map[string]any{
		"assignment_id":   "tqa_1",
		"field_path":      "title",
		"actor_id":        "translator_1",
		"tenant_id":       "tenant_1",
		"org_id":          "org_1",
		"correlation_id":  "corr_1",
		"idempotency_key": "idem_1",
	}, nil)
	if err != nil {
		t.Fatalf("build input: %v", err)
	}
	if msg.AssignmentID != "tqa_1" || msg.FieldPath != "title" || msg.ActorID != "translator_1" {
		t.Fatalf("unexpected message: %+v", msg)
	}
	if msg.TenantID != "tenant_1" || msg.OrgID != "org_1" || msg.CorrelationID != "corr_1" || msg.IdempotencyKey != "idem_1" {
		t.Fatalf("metadata fields were not parsed: %+v", msg)
	}
}

func TestTranslationSuggestionCommandStoresInlineResult(t *testing.T) {
	service := &stubTranslationSuggestionService{
		result: TranslationSuggestionResult{
			AssignmentID:  "tqa_1",
			FieldPath:     "title",
			SuggestedText: "Hola",
		},
	}
	cmd := &TranslationSuggestionGenerateCommand{Service: service}
	result := gocommand.NewResult[TranslationSuggestionResult]()
	ctx := gocommand.ContextWithResult(context.Background(), result)

	var out TranslationSuggestionResult
	err := cmd.Execute(ctx, TranslationSuggestionInput{
		AssignmentID: "tqa_1",
		FieldPath:    "title",
		Result:       &out,
	})
	if err != nil {
		t.Fatalf("execute: %v", err)
	}
	if service.calls != 1 {
		t.Fatalf("expected one service call, got %d", service.calls)
	}
	if out.SuggestedText != "Hola" {
		t.Fatalf("pointer result not populated: %+v", out)
	}
	stored, ok := result.Load()
	if !ok || stored.SuggestedText != "Hola" {
		t.Fatalf("inline result not stored: ok=%v value=%+v", ok, stored)
	}
}

func TestRegisterTranslationSuggestionCommandsDispatchesResult(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()
		service := &stubTranslationSuggestionService{
			result: TranslationSuggestionResult{
				AssignmentID:  "tqa_1",
				FieldPath:     "title",
				SuggestedText: "Hola",
			},
		}
		if err := RegisterTranslationSuggestionCommands(bus, service); err != nil {
			t.Fatalf("register suggestion command: %v", err)
		}
		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		outcome, err := bus.DispatchByNameWithOutcome(context.Background(), TranslationSuggestionGenerateCommandName, map[string]any{
			"assignment_id": "tqa_1",
			"field_path":    "title",
		}, nil, gocommand.DispatchOptions{Mode: gocommand.ExecutionModeInline})
		if err != nil {
			t.Fatalf("dispatch suggestion: %v", err)
		}
		result, ok := outcome.Result.(TranslationSuggestionResult)
		if !ok {
			t.Fatalf("expected typed suggestion result, got %T", outcome.Result)
		}
		if result.SuggestedText != "Hola" {
			t.Fatalf("unexpected suggestion result: %+v", result)
		}
	})
}
