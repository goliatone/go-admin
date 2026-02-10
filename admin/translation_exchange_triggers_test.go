package admin

import (
	"context"
	"testing"

	"github.com/goliatone/go-command/registry"
)

func TestTranslationImportRunTriggerInputTypeStable(t *testing.T) {
	if got := (TranslationImportRunTriggerInput{}).Type(); got != translationImportRunTriggerCommandName {
		t.Fatalf("expected %q, got %q", translationImportRunTriggerCommandName, got)
	}
}

func TestTranslationImportRunTriggerCommandExposesCronSchedule(t *testing.T) {
	cmd := &TranslationImportRunTriggerCommand{
		Schedule: " @daily ",
	}
	if got := cmd.CronOptions().Expression; got != "@daily" {
		t.Fatalf("expected @daily cron expression, got %q", got)
	}
}

func TestTranslationImportRunTriggerCommandDispatchesTypedRunMessage(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		runCommand := &capturingTranslationImportRunCommand{}
		if _, err := RegisterCommand(bus, runCommand); err != nil {
			t.Fatalf("register run command: %v", err)
		}

		trigger := &TranslationImportRunTriggerCommand{
			BuildInput: func(context.Context, TranslationImportRunTriggerInput) (TranslationImportRunInput, error) {
				rows := []TranslationExchangeRow{
					{
						Resource:           "pages",
						EntityID:           "page-1",
						TranslationGroupID: "tg-1",
						TargetLocale:       "es",
						FieldPath:          "title",
						TranslatedText:     "Hola",
					},
				}
				return TranslationImportRunInput{
					ValidateInput: TranslationImportValidateInput{Rows: rows},
					ApplyInput:    TranslationImportApplyInput{Rows: rows},
				}, nil
			},
		}

		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		if err := trigger.Execute(context.Background(), TranslationImportRunTriggerInput{}); err != nil {
			t.Fatalf("execute trigger: %v", err)
		}
		if runCommand.calls != 1 {
			t.Fatalf("expected one run dispatch, got %d", runCommand.calls)
		}
		if len(runCommand.last.ApplyInput.Rows) != 1 {
			t.Fatalf("expected one apply row, got %d", len(runCommand.last.ApplyInput.Rows))
		}
		if got := runCommand.last.ApplyInput.Rows[0].TranslatedText; got != "Hola" {
			t.Fatalf("expected translated text to be forwarded, got %q", got)
		}
	})
}

func TestTranslationImportRunTriggerCommandRequiresRunInputWhenBuilderMissing(t *testing.T) {
	cmd := &TranslationImportRunTriggerCommand{}
	err := cmd.Execute(context.Background(), TranslationImportRunTriggerInput{})
	if err == nil {
		t.Fatalf("expected missing run input error")
	}
}

type capturingTranslationImportRunCommand struct {
	calls int
	last  TranslationImportRunInput
}

func (c *capturingTranslationImportRunCommand) Execute(_ context.Context, msg TranslationImportRunInput) error {
	c.calls++
	c.last = msg
	return nil
}
