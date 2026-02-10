package admin

import (
	"context"
	"strings"

	"github.com/goliatone/go-command"
	"github.com/goliatone/go-command/dispatcher"
)

const translationImportRunTriggerCommandName = "jobs.translations.exchange.import.run"

// TranslationImportRunTriggerInput is a typed trigger message for scheduled imports.
type TranslationImportRunTriggerInput struct {
	RunInput *TranslationImportRunInput `json:"run_input,omitempty"`
}

func (TranslationImportRunTriggerInput) Type() string { return translationImportRunTriggerCommandName }

func (m TranslationImportRunTriggerInput) Validate() error {
	if m.RunInput == nil {
		return nil
	}
	return m.RunInput.Validate()
}

// TranslationImportRunTriggerBuilder resolves scheduled/manual trigger input into a typed run input.
type TranslationImportRunTriggerBuilder func(context.Context, TranslationImportRunTriggerInput) (TranslationImportRunInput, error)

// TranslationImportRunTriggerCommand composes run input and dispatches the run command.
type TranslationImportRunTriggerCommand struct {
	Schedule   string
	BuildInput TranslationImportRunTriggerBuilder
}

var _ command.Commander[TranslationImportRunTriggerInput] = (*TranslationImportRunTriggerCommand)(nil)
var _ command.CronCommand = (*TranslationImportRunTriggerCommand)(nil)

func (c *TranslationImportRunTriggerCommand) Execute(ctx context.Context, msg TranslationImportRunTriggerInput) error {
	if c == nil {
		return serviceNotConfiguredDomainError("translation import run trigger command", map[string]any{
			"component": "translation_exchange_triggers",
		})
	}
	runInput, err := c.resolveRunInput(ctx, msg)
	if err != nil {
		return err
	}
	if err := runInput.Validate(); err != nil {
		return err
	}
	return dispatcher.Dispatch(ctx, runInput)
}

func (c *TranslationImportRunTriggerCommand) CronHandler() func() error {
	return func() error {
		return dispatcher.Dispatch(context.Background(), TranslationImportRunTriggerInput{})
	}
}

func (c *TranslationImportRunTriggerCommand) CronOptions() command.HandlerConfig {
	if c == nil {
		return command.HandlerConfig{}
	}
	return command.HandlerConfig{
		Expression: strings.TrimSpace(c.Schedule),
	}
}

func (c *TranslationImportRunTriggerCommand) resolveRunInput(ctx context.Context, msg TranslationImportRunTriggerInput) (TranslationImportRunInput, error) {
	if c != nil && c.BuildInput != nil {
		return c.BuildInput(ctx, msg)
	}
	if msg.RunInput != nil {
		return *msg.RunInput, nil
	}
	return TranslationImportRunInput{}, validationDomainError("translation import run input required", map[string]any{
		"field": "run_input",
	})
}
