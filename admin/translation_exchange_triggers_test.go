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

// Task 16.3: CLI/job trigger tests proving command reuse and no behavior drift

func TestTranslationImportRunTriggerCommandCronHandlerDispatchesTriggerInput(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		var triggered bool
		triggerCommand := &capturingTriggerCommand{onExecute: func() { triggered = true }}
		if _, err := RegisterCommand(bus, triggerCommand); err != nil {
			t.Fatalf("register trigger: %v", err)
		}

		trigger := &TranslationImportRunTriggerCommand{Schedule: "@daily"}

		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		// CronHandler returns a func that dispatches the trigger
		cronFn := trigger.CronHandler()
		if err := cronFn(); err != nil {
			t.Fatalf("cron handler error: %v", err)
		}

		if !triggered {
			t.Fatalf("expected trigger command to be dispatched via cron handler")
		}
	})
}

func TestTranslationImportRunTriggerCommandUsesDirectRunInputWhenProvided(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		runCommand := &capturingTranslationImportRunCommand{}
		if _, err := RegisterCommand(bus, runCommand); err != nil {
			t.Fatalf("register run command: %v", err)
		}

		trigger := &TranslationImportRunTriggerCommand{
			// No BuildInput - uses direct RunInput
		}

		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		rows := []TranslationExchangeRow{
			{Resource: "posts", EntityID: "post-1", TranslationGroupID: "tg-1", TargetLocale: "fr", FieldPath: "title", TranslatedText: "Bonjour"},
		}
		input := TranslationImportRunTriggerInput{
			RunInput: &TranslationImportRunInput{
				ValidateInput: TranslationImportValidateInput{Rows: rows},
				ApplyInput:    TranslationImportApplyInput{Rows: rows},
			},
		}

		if err := trigger.Execute(context.Background(), input); err != nil {
			t.Fatalf("execute trigger: %v", err)
		}
		if runCommand.calls != 1 {
			t.Fatalf("expected one run dispatch, got %d", runCommand.calls)
		}
		if runCommand.last.ApplyInput.Rows[0].TranslatedText != "Bonjour" {
			t.Fatalf("expected direct run input to be used")
		}
	})
}

func TestTranslationImportRunTriggerCommandValidatesRunInputBeforeDispatch(t *testing.T) {
	registry.WithTestRegistry(func() {
		bus := NewCommandBus(true)
		defer bus.Reset()

		runCommand := &capturingTranslationImportRunCommand{}
		if _, err := RegisterCommand(bus, runCommand); err != nil {
			t.Fatalf("register run command: %v", err)
		}

		trigger := &TranslationImportRunTriggerCommand{
			BuildInput: func(context.Context, TranslationImportRunTriggerInput) (TranslationImportRunInput, error) {
				// Return input with empty rows - should fail validation
				return TranslationImportRunInput{
					ValidateInput: TranslationImportValidateInput{Rows: []TranslationExchangeRow{}},
					ApplyInput:    TranslationImportApplyInput{Rows: []TranslationExchangeRow{}},
				}, nil
			},
		}

		if err := registry.Start(context.Background()); err != nil {
			t.Fatalf("registry start: %v", err)
		}

		err := trigger.Execute(context.Background(), TranslationImportRunTriggerInput{})
		if err == nil {
			t.Fatalf("expected validation error for empty rows")
		}
		if runCommand.calls != 0 {
			t.Fatalf("run command should not be called when validation fails")
		}
	})
}

func TestTranslationExportCommandCLIOptionsExposed(t *testing.T) {
	cmd := &TranslationExportCommand{}
	opts := cmd.CLIOptions()

	if len(opts.Path) == 0 {
		t.Fatalf("expected CLI path to be set")
	}
	if opts.Path[0] != "translations" {
		t.Fatalf("expected path to start with 'translations', got %q", opts.Path[0])
	}
	if opts.Description == "" {
		t.Fatalf("expected CLI description")
	}
	if opts.Group != "translations" {
		t.Fatalf("expected group 'translations', got %q", opts.Group)
	}
}

func TestTranslationImportValidateCommandCLIOptionsExposed(t *testing.T) {
	cmd := &TranslationImportValidateCommand{}
	opts := cmd.CLIOptions()

	if len(opts.Path) < 3 {
		t.Fatalf("expected CLI path with validate, got %v", opts.Path)
	}
	if opts.Description == "" {
		t.Fatalf("expected CLI description")
	}
}

func TestTranslationImportApplyCommandCLIOptionsExposed(t *testing.T) {
	cmd := &TranslationImportApplyCommand{}
	opts := cmd.CLIOptions()

	if len(opts.Path) < 3 {
		t.Fatalf("expected CLI path with apply, got %v", opts.Path)
	}
	if opts.Description == "" {
		t.Fatalf("expected CLI description")
	}
}

func TestTranslationImportRunCommandCLIOptionsExposed(t *testing.T) {
	cmd := &TranslationImportRunCommand{}
	opts := cmd.CLIOptions()

	if len(opts.Path) < 3 {
		t.Fatalf("expected CLI path with run, got %v", opts.Path)
	}
	if opts.Description == "" {
		t.Fatalf("expected CLI description")
	}
}

type capturingTriggerCommand struct {
	onExecute func()
}

func (c *capturingTriggerCommand) Execute(_ context.Context, _ TranslationImportRunTriggerInput) error {
	if c.onExecute != nil {
		c.onExecute()
	}
	return nil
}
